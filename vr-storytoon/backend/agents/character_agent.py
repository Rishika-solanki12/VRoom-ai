from typing import Dict, List


class CharacterAgent:
    """
    Creates a permanent Character Bible from the Story Agent output.

    The Character Bible is reused by:
    - Image Agent
    - Animation Agent
    - Voice Agent
    - Director Agent
    - Audio Agent
    """

    def create_character_bible(
        self,
        characters: List[Dict]
    ) -> Dict[str, Dict]:

        character_bible = {}

        for character in characters:

            character_id = character["id"]

            visual_identity = self._build_visual_identity(
                character
            )

            voice_identity = self._build_voice_identity(
                character
            )

            character_bible[character_id] = {
                "id": character_id,
                "name": character["name"],
                "role": character["role"],

                # Character classification
                "character_type": character.get(
                    "character_type",
                    "cartoon_character"
                ),

                "species": character.get("species"),

                "gender": character.get("gender"),

                "age_style": character.get("age_style"),

                "personality": character["personality"],

                # Permanent appearance
                "appearance": character["appearance"],

                "clothes": character.get("clothes"),

                # Original Story Planner voice description
                "voice_style": character["voice_style"],

                # Used in every future image/video prompt
                "visual_identity": visual_identity,

                # Used in every future voice generation
                "voice_identity": voice_identity,
            }

        return character_bible


    def _build_visual_identity(
        self,
        character: Dict
    ) -> str:

        parts = [
            character["visual_prompt"],

            f"Character name: {character['name']}.",

            (
                "Character type: "
                f"{character.get('character_type', 'cartoon character')}."
            ),

            (
                "Species: "
                f"{character.get('species') or 'cartoon character'}."
            ),

            f"Appearance: {character['appearance']}.",
        ]

        age_style = character.get("age_style")

        if age_style:
            parts.append(
                f"Age style: {age_style}."
            )

        clothes = character.get("clothes")

        if (
            clothes
            and str(clothes).lower()
            not in ["none", "null", "n/a"]
        ):
            parts.append(
                f"Clothing: {clothes}."
            )

        parts.append(
            "Keep exactly the same character design, facial features, "
            "body proportions, fur or skin colors, clothing and overall "
            "cartoon identity in every scene."
        )

        return " ".join(parts)


    def _build_voice_identity(
        self,
        character: Dict
    ) -> str:

        parts = [
            f"Voice style: {character['voice_style']}.",
            f"Personality: {character['personality']}.",
        ]

        character_type = character.get("character_type")

        if character_type:
            parts.append(
                f"Character type: {character_type}."
            )

        species = character.get("species")

        if species:
            parts.append(
                f"Species: {species}."
            )

        gender = character.get("gender")

        if gender:
            parts.append(
                f"Gender presentation: {gender}."
            )

        age_style = character.get("age_style")

        if age_style:
            parts.append(
                f"Age style: {age_style}."
            )

        parts.append(
            "Use the same original fictional cartoon voice identity "
            "throughout the entire story. "
            "Do not imitate any real person."
        )

        return " ".join(parts)