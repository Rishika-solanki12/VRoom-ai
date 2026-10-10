from agents.story_agent import StoryAgent


story = """
Aarav walks beside a peaceful river in a green forest.
Suddenly he hears thunder and looks up at the dark clouds.
"""


print("\n========== STORY VIDEO PIPELINE TEST ==========\n")

agent = StoryAgent()

result = agent.process_story(story)


print("\n========== GENERATED IMAGES ==========")

for item in result.get("generated_images", []):
    print(item["image_path"])


print("\n========== GENERATED VIDEOS ==========")

for item in result.get("generated_videos", []):
    print(item["video_path"])


print("\n========== TEST COMPLETE ==========")