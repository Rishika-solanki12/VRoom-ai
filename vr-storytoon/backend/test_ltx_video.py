from services.video_service import generate_video


prompt = """
A young cartoon boy walks naturally forward along the riverside path
in a lush green forest.

His legs and arms move naturally while walking.
His hair and clothes move gently in the breeze.

Birds fly naturally in the background.
River water flows softly.
Tree leaves move gently.

Keep exactly the same boy, face, hairstyle, red shirt,
blue shorts and cartoon appearance from the source image.

Stable character.
Smooth natural animation.
No morphing.
No deformation.
Camera follows him gently.
"""


video = generate_video(
    image_path="../generated/scenes/scene_1_shot_1.png",
    prompt=prompt,
    output_name="scene_1_shot_1.mp4",
    duration=5.4,
)

print("\nSUCCESS!")
print(video)