from services.video_composer import compose_final_video


videos = [
    "generated/videos/scene_1_shot_1.mp4",
    "generated/videos/scene_1_shot_2.mp4",
    "generated/videos/scene_2_shot_1.mp4",
    "generated/videos/scene_2_shot_2.mp4",
]


final_video = compose_final_video(
    video_paths=videos,
    output_name="story_test_final.mp4",
)


print("\nFINAL VIDEO:")
print(final_video)