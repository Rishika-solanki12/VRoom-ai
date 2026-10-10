import re
from typing import Dict, List


class VoiceAgent:

    def __init__(self):
        # Same character ko poori story me same voice milegi
        self.assigned_voices: Dict[str, Dict] = {}

        # Generic voice profiles.
        # Ye character ke naam par depend nahi karte.
        self.voice_profiles = {
            "adult_male_deep": {
                "voice_id": "Kore",
                "style": "deep, warm, confident",
            },
            "adult_male_soft": {
                "voice_id": "Puck",
                "style": "friendly, soft, expressive",
            },
            "adult_female_warm": {
                "voice_id": "Aoede",
                "style": "warm, clear, expressive",
            },
            "adult_female_bright": {
                "voice_id": "Leda",
                "style": "bright, energetic, friendly",
            },
            "child_playful": {
                "voice_id": "Puck",
                "style": "young, playful, curious",
            },
            "small_animal": {
                "voice_id": "Puck",
                "style": "cute, light, energetic",
            },
            "large_animal": {
                "voice_id": "Kore",
                "style": "deep, powerful, expressive",
            },
            "bird": {
                "voice_id": "Leda",
                "style": "light, cheerful, quick",
            },
            "robot": {
                "voice_id": "Kore",
                "style": "controlled, mechanical, precise",
            },
            "fantasy": {
                "voice_id": "Aoede",
                "style": "magical, expressive, mysterious",
            },
            "neutral": {
                "voice_id": "Puck",
                "style": "natural, friendly, expressive",
            },
        }

    def _get_text(self, character: Dict, *keys) -> str:
        """
        Character bible me fields missing hone par error na aaye.
        """
        values = []

        for key in keys:
            value = character.get(key)

            if value:
                values.append(str(value).lower())

        return " ".join(values)

    def _choose_voice_profile(self, character: Dict) -> Dict:
        """
        Character ki properties dekhkar suitable generic
        voice profile choose karta hai.
        """

        info = self._get_text(
            character,
            "type",
            "species",
            "gender",
            "age",
            "personality",
            "description",
            "voice_identity",
        )

        # -------------------------
        # ROBOT / MACHINE
        # -------------------------
        if any(word in info for word in [
            "robot",
            "android",
            "machine",
            "cyborg",
            "ai assistant",
        ]):
            return self.voice_profiles["robot"]

        # -------------------------
        # BIRDS
        # -------------------------
        if any(word in info for word in [
            "bird",
            "parrot",
            "sparrow",
            "crow",
            "owl",
            "eagle",
            "pigeon",
            "peacock",
            "duck",
            "hen",
        ]):
            return self.voice_profiles["bird"]

        # -------------------------
        # LARGE ANIMALS
        # -------------------------
        if any(word in info for word in [
            "lion",
            "tiger",
            "bear",
            "elephant",
            "gorilla",
            "buffalo",
            "horse",
            "wolf",
        ]):
            return self.voice_profiles["large_animal"]

        # -------------------------
        # SMALL / CUTE ANIMALS
        # -------------------------
        if any(word in info for word in [
            "mouse",
            "rabbit",
            "squirrel",
            "hamster",
            "kitten",
            "puppy",
            "monkey",
        ]):
            return self.voice_profiles["small_animal"]

        # -------------------------
        # CHILD
        # -------------------------
        if any(word in info for word in [
            "child",
            "kid",
            "boy",
            "girl",
            "baby",
            "young child",
        ]):
            return self.voice_profiles["child_playful"]

        # -------------------------
        # FANTASY CHARACTER
        # -------------------------
        if any(word in info for word in [
            "fairy",
            "wizard",
            "witch",
            "elf",
            "magical",
            "spirit",
            "ghost",
        ]):
            return self.voice_profiles["fantasy"]

        # -------------------------
        # ADULT FEMALE
        # -------------------------
        if any(word in info for word in [
            "female",
            "woman",
            "lady",
            "mother",
            "queen",
        ]):
            personality = self._get_text(
                character,
                "personality",
                "voice_identity",
            )

            if any(word in personality for word in [
                "energetic",
                "cheerful",
                "excited",
                "playful",
            ]):
                return self.voice_profiles["adult_female_bright"]

            return self.voice_profiles["adult_female_warm"]

        # -------------------------
        # ADULT MALE
        # -------------------------
        if any(word in info for word in [
            "male",
            "man",
            "father",
            "king",
        ]):
            personality = self._get_text(
                character,
                "personality",
                "voice_identity",
            )

            if any(word in personality for word in [
                "strong",
                "brave",
                "serious",
                "powerful",
                "confident",
            ]):
                return self.voice_profiles["adult_male_deep"]

            return self.voice_profiles["adult_male_soft"]

        # Unknown/new character
        return self.voice_profiles["neutral"]

    def _assign_voice(
        self,
        character_id: str,
        character: Dict,
    ) -> Dict:
        """
        Character ko ek baar voice assign hone ke baad
        poori story me wahi voice reuse hoti hai.
        """

        if character_id in self.assigned_voices:
            return self.assigned_voices[character_id]

        profile = self._choose_voice_profile(character)

        assigned_voice = {
            "voice_id": profile["voice_id"],
            "voice_style": profile["style"],
        }

        self.assigned_voices[character_id] = assigned_voice

        return assigned_voice


    def _split_narration(self, text: str, max_chars: int = 220) -> List[str]:
        """Split long narration into sequential TTS-safe chunks."""
        text = " ".join(str(text or "").split()).strip()
        if not text:
            return []

        sentences = re.split(r"(?<=[.!?।！？])\s+", text)
        sentences = [s.strip() for s in sentences if s.strip()]
        chunks: List[str] = []
        current = ""

        for sentence in sentences:
            if len(sentence) > max_chars:
                parts = re.split(r"(?<=[,;:，；：])\s+", sentence)
                parts = [p.strip() for p in parts if p.strip()]
                for part in parts:
                    if not current:
                        current = part
                    elif len(current) + 1 + len(part) <= max_chars:
                        current = f"{current} {part}"
                    else:
                        chunks.append(current)
                        current = part
            else:
                if not current:
                    current = sentence
                elif len(current) + 1 + len(sentence) <= max_chars:
                    current = f"{current} {sentence}"
                else:
                    chunks.append(current)
                    current = sentence

        if current:
            chunks.append(current)
        return chunks

    def prepare_voice_jobs(
        self,
        scenes: List[Dict],
        character_bible: Dict[str, Dict],
        narrator_voice: str = "auto",
    ) -> List[Dict]:

        # Har new story ke liye fresh assignments
        self.assigned_voices = {}

        voice_jobs = []

        # Narrator can be selected by the user.
        # Character voices remain automatic and consistent.
        narrator_choice = str(narrator_voice or "auto").strip().lower()

        narrator_profiles = {
            "female": {
                "voice_id": "Aoede",
                "voice_style": (
                    "warm cinematic storyteller, clear, natural, expressive; "
                    "speak fluently in the language of the provided text"
                ),
            },
            "male": {
                "voice_id": "Kore",
                "voice_style": (
                    "warm cinematic male storyteller, clear, natural, expressive; "
                    "speak fluently in the language of the provided text"
                ),
            },
            "auto": {
                "voice_id": "Aoede",
                "voice_style": (
                    "natural cinematic storyteller, clear and expressive; "
                    "speak fluently in the language of the provided text"
                ),
            },
        }

        narrator_profile = narrator_profiles.get(
            narrator_choice,
            narrator_profiles["auto"],
        )

        for scene in scenes:

            for shot in scene.get("shots", []):

                # =========================
                # NARRATOR
                # =========================

                narration = shot.get("narration")

                if narration:
                    narration_chunks = self._split_narration(narration)

                    for chunk_index, narration_chunk in enumerate(
                        narration_chunks,
                        start=1,
                    ):
                        voice_jobs.append({
                            "type": "narrator",
                            "scene_number": scene["scene_number"],
                            "shot_number": shot["shot_number"],
                            "sequence": chunk_index,
                            "audio_order": chunk_index,
                            "text": narration_chunk,
                            "voice_id": narrator_profile["voice_id"],
                            "voice_style": (
                                narrator_profile["voice_style"]
                                + "; speak the COMPLETE provided text; "
                                "do not summarize, omit, translate, repeat, "
                                "or stop before the final word"
                            ),
                            "emotion": shot.get(
                                "emotion",
                                "neutral",
                            ),
                        })

                # =========================
                # CHARACTER DIALOGUE
                # =========================

                dialogue = shot.get("dialogue")

                if dialogue:

                    character_id = dialogue.get(
                        "character_id"
                    )

                    if not character_id:
                        continue

                    character = character_bible.get(
                        character_id
                    )

                    if not character:
                        continue

                    assigned_voice = self._assign_voice(
                        character_id,
                        character,
                    )

                    voice_jobs.append({
                        "type": "character",
                        "scene_number": scene["scene_number"],
                        "shot_number": shot["shot_number"],
                        "character_id": character_id,
                        "character_name": character.get(
                            "name",
                            character_id,
                        ),
                        "audio_order": len(narration_chunks) + 1 if narration else 1,
                        "text": dialogue.get(
                            "text",
                            "",
                        ),
                        "emotion": dialogue.get(
                            "emotion",
                            "neutral",
                        ),

                        # Character Bible description
                        "voice_identity": character.get(
                            "voice_identity",
                            "",
                        ),

                        # Actual automatically selected voice
                        "voice_id": assigned_voice[
                            "voice_id"
                        ],

                        "voice_style": (
                            assigned_voice["voice_style"]
                            + "; speak fluently in the language of the provided text"
                        ),
                    })

        return voice_jobs