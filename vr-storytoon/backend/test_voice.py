import os
import wave

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

text = """
Speak in Hindi like a warm, friendly cartoon lion named Sheru.
Use a deep but cute animated voice.
Sound cheerful, expressive, and suitable for a children's cartoon story.
Do not imitate any real person.

Say:
Namaste Chintu! Mujhse daro mat. Main tumhara dost hoon.
"""

response = client.models.generate_content(
    model="gemini-3.8-flash-lite-tts",
    contents=text,
    config=types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name="Kore"
                )
            )
        ),
    ),
)

audio_data = response.candidates[0].content.parts[0].inline_data.data

output_path = "../generated/voices/sheru_test.wav"

os.makedirs("../generated/voices", exist_ok=True)

with wave.open(output_path, "wb") as wav_file:
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(24000)
    wav_file.writeframes(audio_data)

print("VOICE SUCCESS!")
print("Saved:", output_path)