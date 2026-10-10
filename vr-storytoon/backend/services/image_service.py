import base64
import hashlib
import os
import re
import time
from pathlib import Path

import requests
from dotenv import load_dotenv


# =========================================================
# ENV
# =========================================================

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

load_dotenv(BACKEND_DIR / ".env")
load_dotenv(PROJECT_ROOT / ".env")

ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")

if not ACCOUNT_ID:
    raise ValueError(
        "CLOUDFLARE_ACCOUNT_ID missing in .env"
    )

if not API_TOKEN:
    raise ValueError(
        "CLOUDFLARE_API_TOKEN missing in .env"
    )


# =========================================================
# CLOUDFLARE MODEL
# =========================================================

IMAGE_MODEL = os.getenv(
    "CLOUDFLARE_IMAGE_MODEL",
    "@cf/black-forest-labs/flux-1-schnell",
)


# =========================================================
# PATHS
# =========================================================

OUTPUT_DIR = (
    PROJECT_ROOT
    / "generated"
    / "scenes"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# =========================================================
# SETTINGS
# =========================================================

CONNECT_TIMEOUT = 20
READ_TIMEOUT = 180

MAX_ATTEMPTS = 2
RETRY_DELAY_SECONDS = 3

# Cloudflare prompt limit is 2048.
# Keep a small safety margin.
MAX_PROMPT_LENGTH = 2000


# =========================================================
# HELPERS
# =========================================================

def _safe_filename(value: str) -> str:
    """
    Makes filename Windows-safe.
    """

    value = str(value or "").strip()

    value = re.sub(
        r"[^a-zA-Z0-9_.-]+",
        "_",
        value,
    )

    value = value.strip("._-")

    return value or "scene"


def _fit_cloudflare_prompt(
    prompt: str,
    max_length: int = MAX_PROMPT_LENGTH,
) -> str:
    """
    Cloudflare FLUX prompt limit is 2048 characters.

    We keep the final prompt at 2000 characters so the API
    never receives an over-limit prompt.
    """

    prompt = " ".join(
        str(prompt or "").split()
    ).strip()

    if not prompt:
        return ""

    if len(prompt) <= max_length:
        return prompt

    print()
    print(
        f"WARNING: Image prompt too long: "
        f"{len(prompt)} characters."
    )

    print(
        f"Compressing prompt to {max_length} characters..."
    )

    shortened = prompt[:max_length].rstrip()

    print(
        f"Prompt compressed: "
        f"{len(prompt)} -> {len(shortened)} characters"
    )

    return shortened


def _prompt_hash(prompt: str) -> str:
    """
    Stable hash for the actual prompt sent to Cloudflare.

    Different story / different visual prompt
    = different hash
    = different image asset.
    """

    normalized = " ".join(
        str(prompt or "").split()
    ).strip()

    return hashlib.sha256(
        normalized.encode("utf-8")
    ).hexdigest()[:12]


def _build_output_path(
    prompt: str,
    requested_filename: str,
) -> Path:
    """
    Adds prompt hash to filename so old story assets
    are never accidentally reused.

    Example:

    scene_1_shot_1.png

    becomes:

    scene_1_shot_1_a83c19f4d2ab.png
    """

    safe_name = _safe_filename(
        requested_filename
    )

    path = Path(safe_name)

    stem = _safe_filename(
        path.stem
    )

    suffix = (
        path.suffix
        or ".png"
    )

    prompt_hash = _prompt_hash(
        prompt
    )

    filename = (
        f"{stem}_{prompt_hash}{suffix}"
    )

    return OUTPUT_DIR / filename


def _decode_cloudflare_response(
    response: requests.Response,
    output_path: Path,
) -> None:
    """
    Handles Cloudflare possible response formats:

    1. Direct image bytes
    2. JSON -> result.image -> base64
    """

    content_type = (
        response.headers
        .get(
            "content-type",
            "",
        )
        .lower()
    )

    # -----------------------------------------------------
    # DIRECT IMAGE RESPONSE
    # -----------------------------------------------------

    if content_type.startswith("image/"):

        output_path.write_bytes(
            response.content
        )

        return

    # -----------------------------------------------------
    # JSON RESPONSE
    # -----------------------------------------------------

    try:
        data = response.json()

    except ValueError as exc:
        raise RuntimeError(
            "Cloudflare returned an unexpected "
            "non-image response."
        ) from exc

    result = data.get(
        "result",
        {},
    )

    image_base64 = (
        result.get("image")
        if isinstance(
            result,
            dict,
        )
        else None
    )

    if not image_base64:
        raise RuntimeError(
            "No image found in Cloudflare response: "
            f"{data}"
        )

    try:
        image_bytes = base64.b64decode(
            image_base64
        )

    except Exception as exc:
        raise RuntimeError(
            "Cloudflare returned invalid "
            "base64 image data."
        ) from exc

    output_path.write_bytes(
        image_bytes
    )


# =========================================================
# IMAGE GENERATION
# =========================================================

def generate_image(
    prompt: str,
    filename: str = "test.png",
) -> str:

    prompt = str(
        prompt or ""
    ).strip()

    if not prompt:
        raise ValueError(
            "Image prompt cannot be empty."
        )

    # -----------------------------------------------------
    # CLOUDFLARE PROMPT LIMIT
    # -----------------------------------------------------
    # IMPORTANT:
    # This happens BEFORE the prompt hash and cache path.
    # Therefore the filename represents the exact prompt
    # actually sent to Cloudflare.
    # -----------------------------------------------------

    prompt = _fit_cloudflare_prompt(
        prompt,
        max_length=MAX_PROMPT_LENGTH,
    )

    if not prompt:
        raise ValueError(
            "Image prompt became empty after processing."
        )

    # -----------------------------------------------------
    # STORY-SPECIFIC OUTPUT PATH
    # -----------------------------------------------------

    output_path = _build_output_path(
        prompt=prompt,
        requested_filename=filename,
    )

    # -----------------------------------------------------
    # SAFE CACHE
    # -----------------------------------------------------
    # Same exact prompt:
    #     reuse same image.
    #
    # Different story/prompt:
    #     different hash.
    #     different image.
    #
    # Old fixed scene_1_shot_1.png files are NOT reused.
    # -----------------------------------------------------

    if output_path.exists():

        print()
        print(
            "IMAGE ALREADY EXISTS - "
            "USING SAME PROMPT ASSET:"
        )

        print(
            output_path
        )

        return str(
            output_path
        )

    # -----------------------------------------------------
    # CLOUDFLARE URL
    # -----------------------------------------------------

    url = (
        "https://api.cloudflare.com/"
        "client/v4/accounts/"
        f"{ACCOUNT_ID}/ai/run/"
        f"{IMAGE_MODEL}"
    )

    headers = {
        "Authorization": (
            f"Bearer {API_TOKEN}"
        ),
        "Content-Type": (
            "application/json"
        ),
    }

    payload = {
        "prompt": prompt,
    }

    # -----------------------------------------------------
    # LOG
    # -----------------------------------------------------

    print()
    print(
        "--------------------------------------"
    )

    print(
        "CLOUDFLARE IMAGE GENERATION"
    )

    print(
        "--------------------------------------"
    )

    print(
        "Requested filename:",
        filename,
    )

    print(
        "Final filename:",
        output_path.name,
    )

    print(
        "Model:",
        IMAGE_MODEL,
    )

    print(
        "Prompt hash:",
        _prompt_hash(prompt),
    )

    print(
        "Prompt length:",
        len(prompt),
        "characters",
    )

    print(
        "Prompt limit:",
        MAX_PROMPT_LENGTH,
        "characters",
    )

    # -----------------------------------------------------
    # REQUEST WITH RETRIES
    # -----------------------------------------------------

    last_error = None

    for attempt in range(
        1,
        MAX_ATTEMPTS + 1,
    ):

        print(
            f"Cloudflare attempt "
            f"{attempt}/{MAX_ATTEMPTS}..."
        )

        try:

            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=(
                    CONNECT_TIMEOUT,
                    READ_TIMEOUT,
                ),
            )

            # -------------------------------------------------
            # HTTP ERROR
            # -------------------------------------------------

            if not response.ok:

                error_text = (
                    response.text
                    or "No response body"
                )

                raise RuntimeError(
                    "Cloudflare image generation "
                    "failed: "
                    f"HTTP {response.status_code} - "
                    f"{error_text}"
                )

            # -------------------------------------------------
            # SAVE IMAGE
            # -------------------------------------------------

            _decode_cloudflare_response(
                response=response,
                output_path=output_path,
            )

            # -------------------------------------------------
            # VALIDATE FILE
            # -------------------------------------------------

            if not output_path.exists():

                raise RuntimeError(
                    "Cloudflare returned success "
                    "but image file was not created."
                )

            if output_path.stat().st_size == 0:

                raise RuntimeError(
                    "Cloudflare returned an empty "
                    "image file."
                )

            print()
            print(
                "IMAGE GENERATION SUCCESS:"
            )

            print(
                output_path
            )

            print(
                "Image size:",
                output_path.stat().st_size,
                "bytes",
            )

            print(
                "--------------------------------------"
            )

            return str(
                output_path
            )

        # -----------------------------------------------------
        # TIMEOUT
        # -----------------------------------------------------

        except requests.exceptions.ReadTimeout as exc:

            last_error = exc

            print()
            print(
                "Cloudflare image request "
                "timed out."
            )

            print(
                f"Read timeout: "
                f"{READ_TIMEOUT} seconds"
            )

            if attempt < MAX_ATTEMPTS:

                print(
                    f"Retrying in "
                    f"{RETRY_DELAY_SECONDS} seconds..."
                )

                time.sleep(
                    RETRY_DELAY_SECONDS
                )

        # -----------------------------------------------------
        # CONNECTION ERROR
        # -----------------------------------------------------

        except requests.exceptions.ConnectionError as exc:

            last_error = exc

            print()
            print(
                "Cloudflare connection error:"
            )

            print(
                str(exc)
            )

            if attempt < MAX_ATTEMPTS:

                print(
                    f"Retrying in "
                    f"{RETRY_DELAY_SECONDS} seconds..."
                )

                time.sleep(
                    RETRY_DELAY_SECONDS
                )

        # -----------------------------------------------------
        # OTHER REQUEST ERROR
        # -----------------------------------------------------

        except requests.exceptions.RequestException as exc:

            last_error = exc

            print()
            print(
                "Cloudflare request error:"
            )

            print(
                str(exc)
            )

            if attempt < MAX_ATTEMPTS:

                print(
                    f"Retrying in "
                    f"{RETRY_DELAY_SECONDS} seconds..."
                )

                time.sleep(
                    RETRY_DELAY_SECONDS
                )

        # -----------------------------------------------------
        # OTHER ERROR
        # -----------------------------------------------------

        except Exception as exc:

            last_error = exc

            print()
            print(
                "Image generation error:"
            )

            print(
                repr(exc)
            )

            # API/response errors ko blindly retry nahi karenge.
            break

    # =========================================================
    # FINAL ERROR
    # =========================================================

    if isinstance(
        last_error,
        requests.exceptions.ReadTimeout,
    ):

        raise RuntimeError(
            "Cloudflare image generation "
            f"timed out after "
            f"{MAX_ATTEMPTS} attempts. "
            f"Each attempt waited up to "
            f"{READ_TIMEOUT} seconds. "
            "Cloudflare image API may be "
            "slow or temporarily unavailable."
        ) from last_error

    if last_error is not None:

        raise RuntimeError(
            "Image generation failed: "
            f"{last_error}"
        ) from last_error

    raise RuntimeError(
        "Image generation failed for an unknown reason."
    )