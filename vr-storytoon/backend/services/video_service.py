import hashlib
import os
import shutil
from pathlib import Path

from dotenv import load_dotenv
from gradio_client import Client, handle_file


# =========================================================
# PATHS
# =========================================================

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

VIDEO_DIR = (
    PROJECT_ROOT
    / "generated"
    / "videos"
)

VIDEO_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv(
    BACKEND_DIR / ".env"
)

HF_TOKEN = os.getenv(
    "HF_TOKEN"
)

if not HF_TOKEN:
    raise ValueError(
        "HF_TOKEN missing in backend/.env"
    )


# =========================================================
# LTX SPACE
# =========================================================

LTX_SPACE = "Upsampler/ltx-video"

_client = None


def get_ltx_client():

    global _client

    if _client is None:

        print(
            "Connecting to LTX Video "
            "with Hugging Face account..."
        )

        _client = Client(
            LTX_SPACE,
            token=HF_TOKEN,
        )

    return _client


# =========================================================
# HELPERS
# =========================================================

def _file_hash(
    file_path: Path,
) -> str:
    """
    Image file ka content hash.

    Agar image genuinely new hai,
    hash bhi new hoga.

    Isse old story ka video accidentally
    reuse nahi hoga.
    """

    sha = hashlib.sha256()

    with open(
        file_path,
        "rb",
    ) as file:

        while True:

            chunk = file.read(
                1024 * 1024
            )

            if not chunk:
                break

            sha.update(chunk)

    return sha.hexdigest()[:12]


def _prompt_hash(
    prompt: str,
) -> str:
    """
    Motion prompt ka stable hash.
    """

    normalized = " ".join(
        str(
            prompt or ""
        ).split()
    ).strip()

    return hashlib.sha256(
        normalized.encode(
            "utf-8"
        )
    ).hexdigest()[:8]


def _build_unique_video_name(
    image: Path,
    prompt: str,
    output_name: str,
) -> str:
    """
    Original scene/shot filename ko preserve karta hai,
    lekin image + motion prompt ka hash add karta hai.

    Example:

    scene_1_shot_1.mp4

    becomes:

    scene_1_shot_1_a91c22e7f341_4b91e2a1.mp4
    """

    image_hash = _file_hash(
        image
    )

    motion_hash = _prompt_hash(
        prompt
    )

    requested = Path(
        output_name
    )

    stem = requested.stem

    suffix = (
        requested.suffix
        or ".mp4"
    )

    return (
        f"{stem}_"
        f"{image_hash}_"
        f"{motion_hash}"
        f"{suffix}"
    )


# =========================================================
# VIDEO GENERATION
# =========================================================

def generate_video(
    image_path: str,
    prompt: str,
    output_name: str = "scene_video.mp4",
    duration: float = 5.4,
):

    # -----------------------------------------------------
    # Validate prompt
    # -----------------------------------------------------

    prompt = str(
        prompt or ""
    ).strip()

    if not prompt:

        raise ValueError(
            "Video motion prompt cannot be empty."
        )


    # -----------------------------------------------------
    # Resolve image path
    # -----------------------------------------------------

    image = Path(
        image_path
    )

    if not image.is_absolute():

        backend_path = (
            BACKEND_DIR / image
        )

        project_path = (
            PROJECT_ROOT / image
        )

        if backend_path.exists():

            image = backend_path

        elif project_path.exists():

            image = project_path

    image = image.resolve()


    # -----------------------------------------------------
    # Validate image
    # -----------------------------------------------------

    if not image.exists():

        raise FileNotFoundError(
            f"Scene image not found: {image}"
        )

    if image.stat().st_size == 0:

        raise RuntimeError(
            f"Scene image is empty: {image}"
        )


    # -----------------------------------------------------
    # STORY-SPECIFIC VIDEO NAME
    # -----------------------------------------------------

    unique_video_name = (
        _build_unique_video_name(
            image=image,
            prompt=prompt,
            output_name=output_name,
        )
    )

    output_path = (
        VIDEO_DIR
        / unique_video_name
    )


    # -----------------------------------------------------
    # SAFE CACHE
    # -----------------------------------------------------
    #
    # Same exact image + same exact motion prompt
    # -> reuse its own video.
    #
    # Different story/image/prompt
    # -> different filename.
    #
    # Old:
    # scene_1_shot_1.mp4
    #
    # will NOT be reused.
    # -----------------------------------------------------

    if output_path.exists():

        print(
            "\nVIDEO ALREADY EXISTS - "
            "USING SAME STORY ASSET:"
        )

        print(
            output_path
        )

        return str(
            output_path
        )


    # =====================================================
    # LTX GENERATION
    # =====================================================

    print(
        "\n======================================"
    )

    print(
        "LTX VIDEO GENERATION"
    )

    print(
        "======================================"
    )

    print(
        "Input image:",
        image,
    )

    print(
        "Original name:",
        output_name,
    )

    print(
        "Unique video:",
        unique_video_name,
    )

    print(
        "Motion prompt:",
        prompt,
    )

    print(
        "Duration:",
        duration,
    )

    print(
        "Image hash:",
        _file_hash(image),
    )

    print(
        "Prompt hash:",
        _prompt_hash(prompt),
    )

    print(
        "--------------------------------------"
    )


    # -----------------------------------------------------
    # CONNECT
    # -----------------------------------------------------

    client = get_ltx_client()


    # -----------------------------------------------------
    # GENERATE
    # -----------------------------------------------------

    try:

        result = client.predict(

            input_image=handle_file(
                str(image)
            ),

            prompt=prompt,

            duration=duration,

            enhance_prompt=False,

            seed=10,

            randomize_seed=True,

            height=512,

            width=512,

            api_name="/generate_video",
        )

    except Exception as error:

        print(
            "\nLTX VIDEO GENERATION FAILED"
        )

        print(
            "Image:",
            image,
        )

        print(
            "Prompt:",
            prompt,
        )

        print(
            "Error:",
            repr(error),
        )

        raise


    # -----------------------------------------------------
    # VALIDATE RESULT
    # -----------------------------------------------------

    if not result:

        raise RuntimeError(
            "LTX returned an empty result."
        )

    if len(result) < 1:

        raise RuntimeError(
            "LTX returned no generated video."
        )


    generated_video = result[0]

    used_seed = (
        result[1]
        if len(result) > 1
        else None
    )


    # -----------------------------------------------------
    # VALIDATE GENERATED VIDEO
    # -----------------------------------------------------

    generated_video = Path(
        generated_video
    )

    if not generated_video.exists():

        raise FileNotFoundError(
            "LTX reported success but "
            f"generated video was not found: "
            f"{generated_video}"
        )

    if generated_video.stat().st_size == 0:

        raise RuntimeError(
            "LTX generated an empty video file."
        )


    # -----------------------------------------------------
    # SAVE
    # -----------------------------------------------------

    shutil.copy2(
        generated_video,
        output_path,
    )


    # -----------------------------------------------------
    # FINAL VALIDATION
    # -----------------------------------------------------

    if not output_path.exists():

        raise RuntimeError(
            "Video copy failed."
        )

    if output_path.stat().st_size == 0:

        raise RuntimeError(
            "Saved video file is empty."
        )


    # =====================================================
    # SUCCESS
    # =====================================================

    print(
        "\nVIDEO GENERATED SUCCESSFULLY"
    )

    print(
        "Seed:",
        used_seed,
    )

    print(
        "Saved:",
        output_path,
    )

    print(
        "Size:",
        output_path.stat().st_size,
        "bytes",
    )

    print(
        "======================================\n"
    )


    return str(
        output_path
    )