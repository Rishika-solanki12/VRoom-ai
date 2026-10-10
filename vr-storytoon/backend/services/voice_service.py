import os
import re
import wave
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

VOICE_MODEL = os.getenv(
    "GEMINI_TTS_MODEL",
    "gemini-3.8-flash-lite-tts"
)


def _safe_name(text: str) -> str:
    text = text.lower().strip()
    return re.sub(r"[^a-z0-9_-]+", "_", text)


def generate_voice(
    text: str,
    filename: str,
    voice_name: str = "Kore",
    voice_identity: str = "",
    emotion: str = "neutral",
) -> str:

    prompt = f"""
You are creating dialogue for an animated cartoon story.

VOICE IDENTITY:
{voice_identity}

EMOTION:
{emotion}

RULES:
- Speak naturally and expressively.
- Keep the same fictional cartoon voice identity.
- Suitable for an animated story.
- Do not imitate any real person.
- Do not read these instructions aloud.
- Speak only the dialogue below.

DIALOGUE:
{text}
"""

    response = client.models.generate_content(
        model=VOICE_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=voice_name
                    )
                )
            ),
        ),
    )

    audio_data = (
        response.candidates[0]
        .content.parts[0]
        .inline_data.data
    )

    output_dir = Path("../generated/voices")
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / filename

    with wave.open(str(output_path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(24000)
        wav_file.writeframes(audio_data)

    return str(output_path)