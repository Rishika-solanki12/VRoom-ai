from agents.story_agent import StoryAgent
from services.image_service import generate_image


story = """
Aarav was walking beside a peaceful river in a green forest.
Birds were chirping in the trees.

Suddenly Aarav heard a loud thunder sound.

Aarav said, "Oh! It looks like rain is coming."

Heavy rain started falling and Aarav quickly ran toward a small wooden house.
"""


print("\n========== FULL STORY + IMAGE TEST ==========\n")

agent = StoryAgent()

result = agent.process_story(story)


# ---------------------------------------------------------
# BASIC RESULT
# ---------------------------------------------------------

print("\n========== RESULT ==========\n")

print("TITLE:")
print(result.get("title"))


print("\nCHARACTERS:")

for character_id, character in result.get(
    "character_bible",
    {}
).items():

    print(
        character_id,
        "->",
        character.get("name")
    )


# ---------------------------------------------------------
# VISUAL PROMPTS
# ---------------------------------------------------------

print("\n========== VISUAL SHOTS ==========\n")

scenes = result.get("scenes", [])

for scene_index, scene in enumerate(scenes, start=1):

    print(f"\nSCENE {scene_index}")

    for shot_index, shot in enumerate(
        scene.get("shots", []),
        start=1
    ):

        print(
            f"Scene {scene_index} Shot {shot_index}"
        )

        print(
            shot.get("final_image_prompt", "")
        )


# ---------------------------------------------------------
# GENERATE FIRST REAL STORY IMAGE
# ---------------------------------------------------------

print("\n========== GENERATING FIRST STORY IMAGE ==========\n")

if not scenes:
    raise RuntimeError(
        "No scenes found in StoryAgent result."
    )


first_scene = scenes[0]

shots = first_scene.get("shots", [])

if not shots:
    raise RuntimeError(
        "No shots found in first scene."
    )


first_shot = shots[0]

image_prompt = first_shot.get(
    "final_image_prompt"
)

if not image_prompt:
    raise RuntimeError(
        "final_image_prompt missing from first shot."
    )


print("Using VisualAgent final_image_prompt:\n")
print(image_prompt)


image_path = generate_image(
    prompt=image_prompt,
    filename="scene_1_shot_1.png"
)


print("\n========== IMAGE SUCCESS ==========")

print(
    "Generated image:",
    image_path
)


# ---------------------------------------------------------
# VOICES
# ---------------------------------------------------------

print("\n========== GENERATED VOICES ==========\n")

for job in result.get(
    "generated_voices",
    []
):

    print(
        job.get(
            "character_name",
            "Narrator"
        ),
        "->",
        job.get("audio_path")
    )


# ---------------------------------------------------------
# SFX
# ---------------------------------------------------------

print("\n========== GENERATED SFX ==========\n")

for job in result.get(
    "generated_sfx",
    []
):

    print(
        job.get("sound_effect"),
        "->",
        job.get("audio_path")
    )


print("\n========== FULL TEST DONE ==========\n")