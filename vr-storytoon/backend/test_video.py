from services.video_service import generate_video


print("\nGenerating StoryToon video...\n")


video_path = generate_video(
image_path="../generated/scenes/scene_1_shot_1.png",
    filename="aarav_scene_test.mp4",
    duration=5,
    motion="zoom_in",
)


print("\nSUCCESS!")
print("Video:", video_path)