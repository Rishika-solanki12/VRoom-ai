from typing import Dict, List


class VisualAgent:

    def prepare_visual_prompts(
        self,
        scenes: List[Dict],
        character_bible: Dict[str, Dict],
        visual_style: str,
    ) -> List[Dict]:

        prepared_scenes = []

        for scene in scenes:
            prepared_scene = scene.copy()
            prepared_shots = []

            for shot in scene["shots"]:
                prepared_shot = shot.copy()

                # Get identities only for characters present in this shot
                identities = []

                for character_id in shot.get("characters", []):
                    character = character_bible.get(character_id)

                    if character:
                        identities.append(
                            character["visual_identity"]
                        )

                character_identity_text = " ".join(identities)

                # Final image-generation prompt
                final_image_prompt = f"""
STYLE:
{visual_style}

CHARACTER CONSISTENCY:
{character_identity_text}

SCENE:
{scene["scene_description"]}

SHOT:
{shot["description"]}

CHARACTER ACTION:
{shot["character_actions"]}

ENVIRONMENT:
{shot["environment"]}

CAMERA:
Shot type: {shot["shot_type"]}.
Camera movement: {shot["camera_movement"]}.

EMOTION:
{shot["emotion"]}

ORIGINAL VISUAL INSTRUCTION:
{shot["image_prompt"]}

IMPORTANT:
Maintain the exact established appearance of every recurring character.
Do not randomly change clothing, colors, species, facial features,
body proportions, or cartoon design.
Create one coherent cinematic cartoon frame.
""".strip()

                # Final image-to-video / animation instruction
                final_motion_prompt = f"""
Animate this shot naturally.

ACTION:
{shot["character_actions"]}

CAMERA MOVEMENT:
{shot["camera_movement"]}

ORIGINAL MOTION INSTRUCTION:
{shot["motion_prompt"]}

Keep all characters visually consistent with the source frame.
Use natural body movement and facial expressions.
Do not morph characters or randomly change their appearance.
""".strip()

                prepared_shot["final_image_prompt"] = final_image_prompt
                prepared_shot["final_motion_prompt"] = final_motion_prompt

                prepared_shots.append(prepared_shot)

            prepared_scene["shots"] = prepared_shots
            prepared_scenes.append(prepared_scene)

        return prepared_scenes