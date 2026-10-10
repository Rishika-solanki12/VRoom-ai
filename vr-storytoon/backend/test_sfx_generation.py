from agents.sfx_agent import SFXAgent
from services.sfx_service import generate_sfx


# Sirf ONE test sound
scenes = [
    {
        "scene_number": 1,
        "shots": [
            {
                "shot_number": 1,
                "duration_seconds": 4,
                "environment": "peaceful green forest near a river",
                "emotion": "calm and peaceful",
                "sound_effects": [
                    "gentle river flowing"
                ],
            }
        ],
    }
]


sfx_agent = SFXAgent()

sfx_jobs = sfx_agent.prepare_sfx_jobs(
    scenes=scenes
)

print()
print("========== SFX TEST ==========")

job = sfx_jobs[0]

print("Sound:", job["sound_effect"])
print("Prompt:", job["prompt"])

print()
print("Generating actual audio...")

output_path = generate_sfx(
    job,
    skip_existing=True,
)

print()
print("SFX SUCCESS!")
print("Saved:", output_path)
print()
print("DONE!")