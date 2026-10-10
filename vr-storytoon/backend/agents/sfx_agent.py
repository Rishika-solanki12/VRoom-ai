from typing import Dict, List


class SFXAgent:
    """
    Story ke har shot se sound effects identify karke
    SFX generation jobs prepare karta hai.

    Ye actual audio generate nahi karta.
    Actual generation sfx_service.py karega.
    """

    def prepare_sfx_jobs(
        self,
        scenes: List[Dict],
    ) -> List[Dict]:

        sfx_jobs = []

        for scene in scenes:

            scene_number = scene.get(
                "scene_number",
                0,
            )

            for shot in scene.get(
                "shots",
                [],
            ):

                shot_number = shot.get(
                    "shot_number",
                    0,
                )

                sound_effects = shot.get(
                    "sound_effects",
                    [],
                )

                # None aaye to safely empty list
                if not sound_effects:
                    continue

                for index, sound_effect in enumerate(
                    sound_effects,
                    start=1,
                ):

                    # Agar LLM ne galti se empty value di
                    if not sound_effect:
                        continue

                    sound_text = str(
                        sound_effect
                    ).strip()

                    if not sound_text:
                        continue

                    sfx_job = {
                        "type": "sound_effect",
                        "scene_number": scene_number,
                        "shot_number": shot_number,
                        "sfx_number": index,

                        # Original sound description
                        "sound_effect": sound_text,

                        # Audio model ke liye prompt
                        "prompt": self._build_sfx_prompt(
                            sound_effect=sound_text,
                            shot=shot,
                        ),

                        # Shot duration useful rahegi
                        "duration_seconds": shot.get(
                            "duration_seconds",
                            5,
                        ),

                        "emotion": shot.get(
                            "emotion",
                            "neutral",
                        ),

                        "environment": shot.get(
                            "environment",
                            "",
                        ),
                    }

                    sfx_jobs.append(
                        sfx_job
                    )

        return sfx_jobs


    def _build_sfx_prompt(
        self,
        sound_effect: str,
        shot: Dict,
    ) -> str:
        """
        Generic SFX prompt banata hai.

        Kisi fixed sound list par dependent nahi hai.
        Isliye river, birds, car, rain, footsteps,
        thunder, jungle, robot etc. sab aa sakte hain.
        """

        environment = shot.get(
            "environment",
            "",
        )

        emotion = shot.get(
            "emotion",
            "neutral",
        )

        duration = shot.get(
            "duration_seconds",
            5,
        )

        return (
            f"Create a clean cinematic sound effect of "
            f"{sound_effect}. "
            f"Scene environment: {environment}. "
            f"Scene mood: {emotion}. "
            f"Approximate duration: {duration} seconds. "
            f"No speech, no narration, no dialogue, "
            f"no music unless explicitly requested. "
            f"Only the required environmental or action sound. "
            f"Suitable for an animated story scene."
        )