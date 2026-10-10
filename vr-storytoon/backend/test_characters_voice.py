from agents.character_agent import CharacterAgent
from agents.voice_agent import VoiceAgent
from services.tts_service import generate_all_voices


# =========================================================
# TEST CHARACTERS
# Koi voice manually assign nahi ki gayi hai.
# =========================================================

characters = [
    {
        "id": "sheru",
        "name": "Sheru",
        "role": "main character",

        "character_type": "animal",
        "species": "lion",
        "gender": "male",
        "age_style": "adult",

        "personality": "brave, friendly, protective and playful",

        "appearance": (
            "A friendly golden cartoon lion with a fluffy brown mane "
            "and large expressive eyes."
        ),

        "clothes": None,

        "visual_prompt": (
            "Colorful cinematic 3D cartoon lion, golden fur, "
            "fluffy brown mane, friendly expressive face."
        ),

        "voice_style": (
            "deep, warm, confident, gentle and expressive"
        ),
    },

    {
        "id": "chintu",
        "name": "Chintu",
        "role": "supporting character",

        "character_type": "animal",
        "species": "mouse",
        "gender": "male",
        "age_style": "young",

        "personality": "cute, curious, energetic and slightly nervous",

        "appearance": (
            "A tiny grey cartoon mouse with big round ears "
            "and bright expressive eyes."
        ),

        "clothes": None,

        "visual_prompt": (
            "Cute colorful 3D cartoon mouse, tiny grey body, "
            "large round ears and expressive eyes."
        ),

        "voice_style": (
            "cute, light, energetic and playful"
        ),
    },

    {
        "id": "mithu",
        "name": "Mithu",
        "role": "supporting character",

        "character_type": "bird",
        "species": "parrot",
        "gender": "female",
        "age_style": "young",

        "personality": "cheerful, talkative and energetic",

        "appearance": (
            "A bright green cartoon parrot with colorful wings "
            "and a cheerful expressive face."
        ),

        "clothes": None,

        "visual_prompt": (
            "Colorful cinematic 3D cartoon parrot, bright green "
            "feathers and expressive friendly eyes."
        ),

        "voice_style": (
            "bright, cheerful, light and energetic"
        ),
    },

    {
        "id": "aarav",
        "name": "Aarav",
        "role": "supporting character",

        "character_type": "human",
        "species": "human",
        "gender": "male",
        "age_style": "child",

        "personality": "curious, innocent and playful",

        "appearance": (
            "A cheerful cartoon boy with black hair "
            "and large expressive eyes."
        ),

        "clothes": "blue t-shirt and shorts",

        "visual_prompt": (
            "Colorful cinematic 3D cartoon boy, black hair, "
            "blue t-shirt, shorts and friendly expressive face."
        ),

        "voice_style": (
            "young, playful, curious and expressive"
        ),
    },
]


# =========================================================
# CREATE CHARACTER BIBLE
# =========================================================

character_agent = CharacterAgent()

character_bible = character_agent.create_character_bible(
    characters
)


# =========================================================
# TEST SCENE
# =========================================================

scenes = [
    {
        "scene_number": 1,

        "shots": [

            {
                "shot_number": 1,

                "narration": (
                    "Ek sundar jungle mein Sheru naam ka "
                    "ek pyara sher rehta tha."
                ),

                "emotion": "warm and cheerful",

                "dialogue": None,
            },

            {
                "shot_number": 2,

                "narration": None,

                "dialogue": {
                    "character_id": "sheru",

                    "text": (
                        "Chintu, tum itni jaldi mein "
                        "kahan ja rahe ho?"
                    ),

                    "emotion": "friendly and curious",
                },
            },

            {
                "shot_number": 3,

                "narration": None,

                "dialogue": {
                    "character_id": "chintu",

                    "text": (
                        "Sheru bhaiya, mujhe laga "
                        "aap mujhe kha jaoge!"
                    ),

                    "emotion": "nervous but cute",
                },
            },

            {
                "shot_number": 4,

                "narration": None,

                "dialogue": {
                    "character_id": "mithu",

                    "text": (
                        "Arre Chintu! Sheru se darne "
                        "ki koi zarurat nahi hai!"
                    ),

                    "emotion": "cheerful and playful",
                },
            },

            {
                "shot_number": 5,

                "narration": None,

                "dialogue": {
                    "character_id": "aarav",

                    "text": (
                        "Wow! Yeh jungle kitna "
                        "sundar hai!"
                    ),

                    "emotion": "excited and curious",
                },
            },
        ],
    }
]


# =========================================================
# AUTOMATIC VOICE ASSIGNMENT
# =========================================================

voice_agent = VoiceAgent()

voice_jobs = voice_agent.prepare_voice_jobs(
    scenes=scenes,
    character_bible=character_bible,
)


print("\n========== AUTOMATIC VOICE ASSIGNMENTS ==========\n")

for job in voice_jobs:

    if job["type"] == "narrator":

        print(
            "Narrator",
            "->",
            job["voice_id"],
            "|",
            job["voice_style"],
        )

    else:

        print(
            job["character_name"],
            "->",
            job["voice_id"],
            "|",
            job["voice_style"],
        )


# =========================================================
# GENERATE ACTUAL AUDIO
# =========================================================

print("\n========== GENERATING AUDIO ==========\n")

generated_voices = generate_all_voices(
    voice_jobs
)


print("\n========== GENERATED FILES ==========\n")

for voice in generated_voices:

    print(
        voice["audio_path"]
    )


print("\nDONE!")