import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = PROJECT_ROOT / "backend"

sys.path.insert(0, str(BACKEND_DIR))

from services.video_composer import compose_final_video


# =========================================================
# EXISTING VIDEO
# =========================================================

generated_videos = [
    {
        "scene": 3,
        "shot": 1,
        "video_path": str(
            PROJECT_ROOT
            / "generated"
            / "videos"
            / "scene_3_shot_1.mp4"
        ),
    }
]


# =========================================================
# EXISTING NORMAL VOICE
# =========================================================

generated_voices = [
    {
        "scene_number": 3,
        "shot_number": 1,
        "audio_path": str(
            PROJECT_ROOT
            / "generated"
            / "voices"
            / "scene_3_shot_1_narrator_078f044e.wav"
        ),
    }
]


# =========================================================
# NO SFX FOR FIRST TEST
# =========================================================

generated_sfx = [
    {
        "scene_number": 3,
        "shot_number": 1,
        "audio_path": str(
            PROJECT_ROOT
            / "generated"
            / "sfx"
            / "heavy_rain_pouring_113ce8c1.mp3"
        ),
    }
]


# =========================================================
# COMPOSE
# =========================================================

print()
print("======================================")
print("COMPOSER-ONLY VOICE TEST")
print("======================================")

output = compose_final_video(
    generated_videos=generated_videos,
    generated_voices=generated_voices,
    generated_sfx=generated_sfx,
    output_name="composer_voice_test.mp4",
)

print()
print("TEST COMPLETE")
print("Output:", output)