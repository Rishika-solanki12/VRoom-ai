import os
import re
import hashlib
from typing import Dict

from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs


load_dotenv()

api_key = os.getenv("ELEVENLABS_API_KEY")

if not api_key:
    raise ValueError(
        "ELEVENLABS_API_KEY .env file me nahi mili."
    )

client = ElevenLabs(
    api_key=api_key
)


# ---------------------------------------------------------
# OUTPUT DIRECTORY
# ---------------------------------------------------------

BACKEND_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

PROJECT_ROOT = os.path.dirname(
    BACKEND_DIR
)

OUTPUT_DIR = os.path.join(
    PROJECT_ROOT,
    "generated",
    "sfx",
)


# ---------------------------------------------------------
# FILE / CACHE HELPERS
# ---------------------------------------------------------

def _safe_filename(value: str) -> str:

    value = value.strip().lower()

    value = re.sub(
        r"[^a-zA-Z0-9_-]+",
        "_",
        value,
    )

    return value.strip("_") or "sound"


def _normalize_sound_effect(value: str) -> str:
    """
    Small wording differences ko normalize karta hai so that
    obviously equivalent SFX descriptions can reuse the same file.

    Meaningful modifiers such as 'melodic', 'heavy', 'distant',
    'soft', etc. intentionally preserve kiye jaate hain.
    """

    value = str(value).lower().strip()

    value = re.sub(
        r"[^a-z0-9\s]",
        " ",
        value,
    )

    replacements = {
        "birds": "bird",
        "footsteps": "footstep",
        "leaves": "leaf",
        "tires": "tire",
        "sounds": "sound",
        "flowing water": "water flow",
        "river flowing": "river flow",
    }

    for old, new in replacements.items():
        value = value.replace(
            old,
            new,
        )

    value = re.sub(
        r"\s+",
        " ",
        value,
    ).strip()

    return value or "sound"


def _get_output_path(
    sfx_job: Dict,
) -> str:

    sound_effect = str(
        sfx_job.get(
            "sound_effect",
            "sound",
        )
    ).strip()

    normalized_sound = _normalize_sound_effect(
        sound_effect
    )

    sound_name = _safe_filename(
        normalized_sound
    )[:50]

    # Same normalized description = same reusable audio file
    sound_hash = hashlib.md5(
        normalized_sound.encode("utf-8")
    ).hexdigest()[:8]

    filename = (
        f"{sound_name}_{sound_hash}.mp3"
    )

    os.makedirs(
        OUTPUT_DIR,
        exist_ok=True,
    )

    return os.path.join(
        OUTPUT_DIR,
        filename,
    )


# ---------------------------------------------------------
# SINGLE SFX GENERATION
# ---------------------------------------------------------

def generate_sfx(
    sfx_job: Dict,
    skip_existing: bool = True,
) -> str:

    prompt = str(
        sfx_job.get(
            "prompt",
            "",
        )
    ).strip()

    if not prompt:
        raise ValueError(
            "SFX job me prompt missing hai."
        )

    output_path = _get_output_path(
        sfx_job
    )

    # Same normalized SFX dobara generate karke
    # credits waste nahi karenge.
    if (
        skip_existing
        and os.path.exists(output_path)
        and os.path.getsize(output_path) > 100
    ):
        print(
            "SFX ALREADY EXISTS - SKIPPING:",
            output_path,
        )

        return output_path

    duration = float(
        sfx_job.get(
            "duration_seconds",
            5,
        )
    )

    # ElevenLabs-safe duration range
    duration = max(
        0.5,
        min(duration, 22.0),
    )

    print(
        "Generating SFX:",
        sfx_job.get(
            "sound_effect",
            "sound",
        ),
    )

    audio = client.text_to_sound_effects.convert(
        text=prompt,
        duration_seconds=duration,
        prompt_influence=0.3,
    )

    with open(
        output_path,
        "wb",
    ) as audio_file:

        for chunk in audio:

            if chunk:
                audio_file.write(
                    chunk
                )

    return output_path


# ---------------------------------------------------------
# COMPLETE STORY SFX GENERATION
# ---------------------------------------------------------

def generate_all_sfx(
    sfx_jobs: list[Dict],
) -> list[Dict]:

    generated = []
    failed = []

    total = len(
        sfx_jobs
    )

    print()
    print(
        "======================================"
    )
    print(
        f"TOTAL SFX JOBS: {total}"
    )
    print(
        "======================================"
    )

    for index, sfx_job in enumerate(
        sfx_jobs,
        start=1,
    ):

        sound_name = sfx_job.get(
            "sound_effect",
            "sound",
        )

        print()
        print(
            f"[{index}/{total}] {sound_name}"
        )

        try:

            output_path = generate_sfx(
                sfx_job,
                skip_existing=True,
            )

            generated.append({
                **sfx_job,
                "audio_path": output_path,
                "status": "success",
            })

            print(
                "SFX SUCCESS:",
                output_path,
            )

        except Exception as error:

            failed.append({
                **sfx_job,
                "status": "failed",
                "error": str(error),
            })

            print(
                "SFX FAILED:",
                sound_name,
            )

            print(
                "ERROR:",
                error,
            )

            # Ek SFX fail ho to poori story stop nahi hogi.
            continue

    print()
    print(
        "======================================"
    )
    print(
        "SFX GENERATION COMPLETE"
    )
    print(
        f"Successful: {len(generated)}"
    )
    print(
        f"Failed: {len(failed)}"
    )
    print(
        "======================================"
    )

    if failed:
        print()
        print(
            "Failed SFX ko next run me "
            "dobara generate kiya ja sakta hai."
        )

    return generated
