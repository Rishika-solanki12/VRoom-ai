from agents.sfx_agent import SFXAgent


scenes = [
    {
        "scene_number": 1,
        "shots": [
            {
                "shot_number": 1,
                "duration_seconds": 6,
                "environment": "peaceful green forest near a river",
                "emotion": "calm and happy",
                "sound_effects": [
                    "gentle river flowing",
                    "small birds chirping",
                    "leaves rustling in soft wind",
                ],
            },
            {
                "shot_number": 2,
                "duration_seconds": 5,
                "environment": "forest road",
                "emotion": "exciting",
                "sound_effects": [
                    "car accelerating",
                    "tires moving on a dirt road",
                ],
            },
            {
                "shot_number": 3,
                "duration_seconds": 7,
                "environment": "dark forest during a storm",
                "emotion": "scary and dramatic",
                "sound_effects": [
                    "heavy rain",
                    "distant thunder",
                ],
            },
        ],
    }
]


sfx_agent = SFXAgent()

sfx_jobs = sfx_agent.prepare_sfx_jobs(
    scenes=scenes,
)


print()
print("========== SFX JOBS ==========")
print()

for job in sfx_jobs:

    print(
        f"Scene {job['scene_number']} | "
        f"Shot {job['shot_number']} | "
        f"SFX {job['sfx_number']}"
    )

    print(
        "Sound:",
        job["sound_effect"],
    )

    print(
        "Duration:",
        job["duration_seconds"],
        "seconds",
    )

    print(
        "Prompt:",
        job["prompt"],
    )

    print(
        "----------------------------------"
    )


print()
print(
    "TOTAL SFX JOBS:",
    len(sfx_jobs),
)

print()
print("DONE!")