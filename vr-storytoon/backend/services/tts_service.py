import asyncio
import hashlib
import os
import re
import shutil
import subprocess
import tempfile
from typing import Dict, Optional

from dotenv import load_dotenv

try:
    import edge_tts
except ImportError as exc:
    raise ImportError(
        "edge-tts installed nahi hai. Run: pip install edge-tts"
    ) from exc


load_dotenv()


# =========================================================
# PATHS
# =========================================================

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

OUTPUT_DIR = os.path.join(
    PROJECT_ROOT,
    "generated",
    "voices",
)

os.makedirs(OUTPUT_DIR, exist_ok=True)


# =========================================================
# EDGE TTS VOICE MAP
# =========================================================
#
# Hindi:
#   Female -> hi-IN-SwaraNeural
#   Male   -> hi-IN-MadhurNeural
#
# English:
#   Female -> en-US-JennyNeural
#   Male   -> en-US-GuyNeural
#
# We keep the existing Gemini-style voice names in the voice jobs,
# but translate them to stable Edge voices here.
# =========================================================

VOICE_MAP = {
    "female_hindi": "hi-IN-SwaraNeural",
    "male_hindi": "hi-IN-MadhurNeural",
    "female_english": "en-US-JennyNeural",
    "male_english": "en-US-GuyNeural",
}


# Existing VoiceAgent/Gemini voice IDs -> gender
# This keeps the existing VoiceAgent unchanged.
GEMINI_VOICE_GENDER = {
    "Aoede": "female",
    "Leda": "female",
    "Kore": "male",
    "Puck": "male",
}


# =========================================================
# FFMPEG
# =========================================================

def _find_ffmpeg() -> str:
    """
    Finds ffmpeg from PATH first.
    Falls back to the WinGet installation used by this project.
    """

    found = shutil.which("ffmpeg")
    if found:
        return found

    fallback = (
        r"C:\Users\Suraj\AppData\Local\Microsoft\WinGet\Packages"
        r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
        r"\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
    )

    if os.path.exists(fallback):
        return fallback

    raise RuntimeError(
        "FFmpeg nahi mila. FFmpeg install/PATH check karo."
    )


FFMPEG = _find_ffmpeg()


# =========================================================
# FILE HELPERS
# =========================================================

def _safe_filename(value: str) -> str:
    value = str(value or "").strip().lower()

    value = re.sub(
        r"[^a-zA-Z0-9_-]+",
        "_",
        value,
    )

    return value.strip("_") or "voice"


def _get_output_path(voice_job: Dict) -> str:
    scene_number = voice_job.get("scene_number", 0)
    shot_number = voice_job.get("shot_number", 0)

    job_type = voice_job.get("type", "voice")

    if job_type == "character":
        identity = voice_job.get(
            "character_name",
            voice_job.get(
                "character_id",
                "character",
            ),
        )
    else:
        identity = "narrator"

    identity = _safe_filename(identity)

    text = str(
        voice_job.get(
            "text",
            "",
        )
    ).strip()

    voice_id = str(
        voice_job.get(
            "voice_id",
            "",
        )
    )

    # Provider + text + voice + identity:
    # prevents wrong audio reuse between different voice settings.
    voice_hash = hashlib.md5(
        f"edge-tts|{text}|{voice_id}|{identity}".encode("utf-8")
    ).hexdigest()[:8]

    filename = (
        f"scene_{scene_number}_"
        f"shot_{shot_number}_"
        f"{identity}_"
        f"{voice_hash}.wav"
    )

    return os.path.join(
        OUTPUT_DIR,
        filename,
    )


# =========================================================
# LANGUAGE DETECTION
# =========================================================

def _contains_devanagari(text: str) -> bool:
    return bool(
        re.search(
            r"[\u0900-\u097F]",
            text or "",
        )
    )


def _looks_like_hinglish(text: str) -> bool:
    """
    Roman-script Hinglish fallback.
    We only use this when there is no Devanagari.
    """

    lowered = (text or "").lower()

    hindi_words = [
        "hai",
        "hain",
        "tha",
        "thi",
        "the",
        "mujhe",
        "tum",
        "aap",
        "kya",
        "kyun",
        "kaise",
        "mera",
        "meri",
        "mere",
        "ghar",
        "baccha",
        "bacha",
        "jungle",
        "dost",
        "chalo",
        "bahut",
        "aur",
        "nahi",
        "nahin",
        "yah",
        "yeh",
        "woh",
        "uska",
        "uski",
    ]

    return any(
        re.search(
            rf"\b{re.escape(word)}\b",
            lowered,
        )
        for word in hindi_words
    )


def _detect_language(text: str) -> str:
    """
    Returns:
        hi -> Hindi / Devanagari / Roman Hinglish
        en -> English
    """

    if _contains_devanagari(text):
        return "hi"

    if _looks_like_hinglish(text):
        return "hi"

    return "en"


# =========================================================
# GENDER / VOICE SELECTION
# =========================================================

def _normalize_gender(value: Optional[str]) -> Optional[str]:
    value = str(value or "").strip().lower()

    if value in {
        "female",
        "woman",
        "girl",
        "f",
    }:
        return "female"

    if value in {
        "male",
        "man",
        "boy",
        "m",
    }:
        return "male"

    return None


def _detect_gender(voice_job: Dict) -> str:
    """
    Priority:
      1. Explicit narrator/character gender preference
      2. Existing Gemini-style voice_id
      3. Character/voice hints
      4. Female fallback

    The existing VoiceAgent already puts the selected narrator voice
    into voice_id. If a future job also contains narrator_voice,
    that value gets priority here.

    VoiceAgent already assigns the existing voice_id, so this
    keeps the current character voice design working.
    """

    # Explicit narrator selection, when supplied by the job.
    narrator_preference = str(
        voice_job.get("narrator_voice", "")
    ).strip().lower()

    if voice_job.get("type") == "narrator":
        if narrator_preference in {"male", "female"}:
            return narrator_preference

    explicit = _normalize_gender(
        voice_job.get("gender")
    )

    if explicit:
        return explicit

    voice_id = str(
        voice_job.get(
            "voice_id",
            "",
        )
    ).strip()

    mapped = GEMINI_VOICE_GENDER.get(
        voice_id
    )

    if mapped:
        return mapped

    combined = " ".join(
        [
            str(voice_job.get("voice_style", "")),
            str(voice_job.get("voice_identity", "")),
            str(voice_job.get("character_name", "")),
            str(voice_job.get("character_type", "")),
        ]
    ).lower()

    if any(
        word in combined
        for word in [
            "female",
            "woman",
            "girl",
            "mother",
            "lady",
            "soft female",
        ]
    ):
        return "female"

    if any(
        word in combined
        for word in [
            "male",
            "man",
            "boy",
            "father",
            "king",
            "lion",
        ]
    ):
        return "male"

    return "female"


def _choose_edge_voice(voice_job: Dict) -> str:
    text = str(
        voice_job.get(
            "text",
            "",
        )
    ).strip()

    language = _detect_language(text)
    gender = _detect_gender(voice_job)

    if language == "hi":
        if gender == "male":
            return VOICE_MAP["male_hindi"]

        return VOICE_MAP["female_hindi"]

    if gender == "male":
        return VOICE_MAP["male_english"]

    return VOICE_MAP["female_english"]


# =========================================================
# PERFORMANCE
# =========================================================

def _performance_settings(voice_job: Dict):
    """
    Edge TTS does not have Gemini-style emotion controls.
    We use small rate/pitch changes so dialogue still feels
    expressive without making speech unnatural.
    """

    emotion = str(
        voice_job.get(
            "emotion",
            "neutral",
        )
    ).lower()

    if any(
        word in emotion
        for word in [
            "excited",
            "happy",
            "joy",
            "energetic",
            "surprised",
        ]
    ):
        return "+8%", "+2Hz"

    if any(
        word in emotion
        for word in [
            "sad",
            "scared",
            "fear",
            "worried",
            "cry",
        ]
    ):
        return "-5%", "-1Hz"

    if any(
        word in emotion
        for word in [
            "angry",
            "urgent",
            "danger",
        ]
    ):
        return "+5%", "-2Hz"

    return "+0%", "+0Hz"


# =========================================================
# EDGE TTS GENERATION
# =========================================================

def _run_edge_tts(
    text: str,
    voice: str,
    output_mp3: str,
    rate: str,
    pitch: str,
) -> None:
    async def _generate():
        communicator = edge_tts.Communicate(
            text=text,
            voice=voice,
            rate=rate,
            pitch=pitch,
        )

        await communicator.save(
            output_mp3
        )

    asyncio.run(_generate())


# =========================================================
# MP3 -> WAV
# =========================================================

def _convert_to_wav(
    input_mp3: str,
    output_wav: str,
) -> None:

    command = [
        FFMPEG,
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        input_mp3,
        "-ac",
        "1",
        "-ar",
        "24000",
        "-sample_fmt",
        "s16",
        output_wav,
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(
            "Edge TTS audio ko WAV me convert nahi kar paaya.\n"
            + (result.stderr or "").strip()
        )


# =========================================================
# PROMPT-STYLE METADATA
# =========================================================

def _build_voice_description(
    voice_job: Dict,
    selected_voice: str,
) -> str:

    character_name = voice_job.get(
        "character_name",
        "Narrator",
    )

    emotion = voice_job.get(
        "emotion",
        "neutral",
    )

    voice_style = voice_job.get(
        "voice_style",
        "natural, expressive",
    )

    job_type = voice_job.get(
        "type",
        "character",
    )

    if job_type == "narrator":
        return (
            f"Original fictional cartoon narrator. "
            f"Style: {voice_style}. "
            f"Emotion: {emotion}. "
            f"Edge voice: {selected_voice}."
        )

    return (
        f"Original fictional animated character "
        f"{character_name}. "
        f"Style: {voice_style}. "
        f"Emotion: {emotion}. "
        f"Edge voice: {selected_voice}."
    )


# =========================================================
# SINGLE VOICE
# =========================================================

def generate_voice(
    voice_job: Dict,
    skip_existing: bool = True,
) -> str:

    text = str(
        voice_job.get(
            "text",
            "",
        )
    ).strip()

    if not text:
        raise ValueError(
            "Voice job me text missing hai."
        )

    output_path = _get_output_path(
        voice_job
    )

    # -----------------------------------------------------
    # Resume/cache support
    # -----------------------------------------------------

    if (
        skip_existing
        and os.path.exists(output_path)
        and os.path.getsize(output_path) > 1000
    ):
        print(
            "VOICE ALREADY EXISTS - SKIPPING:",
            output_path,
        )
        return output_path

    selected_voice = _choose_edge_voice(
        voice_job
    )

    rate, pitch = _performance_settings(
        voice_job
    )

    language = _detect_language(text)
    gender = _detect_gender(voice_job)

    print()
    print("VOICE PROVIDER: Edge TTS")
    print("Language:", language)
    print("Gender:", gender)
    print("Voice:", selected_voice)
    print(
        "Description:",
        _build_voice_description(
            voice_job,
            selected_voice,
        ),
    )
    print("Generating Edge voice...")

    # Temporary MP3 lives beside the final WAV.
    temp_dir = tempfile.mkdtemp(
        prefix="storytoon_tts_",
        dir=OUTPUT_DIR,
    )

    temp_mp3 = os.path.join(
        temp_dir,
        "speech.mp3",
    )

    try:
        _run_edge_tts(
            text=text,
            voice=selected_voice,
            output_mp3=temp_mp3,
            rate=rate,
            pitch=pitch,
        )

        if (
            not os.path.exists(temp_mp3)
            or os.path.getsize(temp_mp3) < 1000
        ):
            raise RuntimeError(
                "Edge TTS ne valid audio file nahi banayi."
            )

        _convert_to_wav(
            input_mp3=temp_mp3,
            output_wav=output_path,
        )

        if (
            not os.path.exists(output_path)
            or os.path.getsize(output_path) < 1000
        ):
            raise RuntimeError(
                "Final WAV file create nahi hui."
            )

        print(
            "VOICE SUCCESS:",
            output_path,
        )

        return output_path

    finally:
        shutil.rmtree(
            temp_dir,
            ignore_errors=True,
        )


# =========================================================
# COMPLETE STORY VOICE GENERATION
# =========================================================

def generate_all_voices(
    voice_jobs: list[Dict],
) -> list[Dict]:

    generated = []
    failed = []

    total = len(
        voice_jobs
    )

    print()
    print(
        "======================================"
    )
    print(
        f"TOTAL VOICE JOBS: {total}"
    )
    print(
        "VOICE PROVIDER: EDGE TTS"
    )
    print(
        "======================================"
    )
    print()

    for index, voice_job in enumerate(
        voice_jobs,
        start=1,
    ):

        character_name = voice_job.get(
            "character_name",
            "Narrator",
        )

        print()
        print(
            f"[{index}/{total}] "
            f"{character_name}"
        )

        try:

            output_path = generate_voice(
                voice_job,
                skip_existing=True,
            )

            result = {
                **voice_job,
                "audio_path": output_path,
                "status": "success",
                "tts_provider": "edge-tts",
            }

            generated.append(
                result
            )

        except Exception as error:

            print(
                "VOICE FAILED:",
                character_name,
            )

            print(
                "ERROR:",
                error,
            )

            failed.append(
                {
                    **voice_job,
                    "status": "failed",
                    "error": str(error),
                    "tts_provider": "edge-tts",
                }
            )

            # One failed job must not corrupt the rest.
            continue

    print()
    print(
        "======================================"
    )
    print(
        "VOICE GENERATION COMPLETE"
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
            "VOICE GENERATION FAILED FOR SOME JOBS:"
        )

        for item in failed:
            print(
                "FAILED:",
                item.get("scene_number"),
                item.get("shot_number"),
                item.get("type"),
                item.get("character_name"),
                item.get("text", "")[:120],
            )

        # We intentionally stop final composition when a required
        # voice is missing. This prevents silent sections in the
        # final StoryToon video.
        raise RuntimeError(
            f"{len(failed)} required voice job(s) failed. "
            "Final video composition stopped to prevent "
            "silent story sections."
        )

    return generated
