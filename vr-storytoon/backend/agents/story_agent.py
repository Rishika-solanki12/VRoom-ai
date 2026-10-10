from services.llm_service import generate_story_plan
from services.sfx_service import generate_all_sfx
from services.tts_service import generate_all_voices
from services.image_service import generate_image
from services.video_service import generate_video
from services.video_composer import compose_final_video

from agents.character_agent import CharacterAgent
from agents.visual_agent import VisualAgent
from agents.voice_agent import VoiceAgent
from agents.sfx_agent import SFXAgent


class StoryAgent:

    def __init__(self):

        self.character_agent = CharacterAgent()
        self.visual_agent = VisualAgent()
        self.voice_agent = VoiceAgent()
        self.sfx_agent = SFXAgent()

    def process_story(
        self,
        story: str,
        visual_style: str = "cartoon",
        narrator_voice: str = "auto",
    ):

        # =================================================
        # 1. STORY PLANNING
        # =================================================

        print()
        print("========== STORY PLANNING ==========")
        print("Duration Mode: CONTENT-DRIVEN")
        print("Visual Style:", visual_style)
        print("Duration Target: NONE")

        story_plan = generate_story_plan(
            story=story,
            visual_style=visual_style,
        )

        plan_data = story_plan.model_dump()

        # Keep request-level settings in production data.
        plan_data["requested_visual_style"] = (
            visual_style
        )

        plan_data["narrator_voice"] = (
            narrator_voice
        )

        # =================================================
        # 2. CHARACTER BIBLE
        # =================================================

        print()
        print("========== CHARACTER BIBLE ==========")

        character_bible = (
            self.character_agent.create_character_bible(
                plan_data["characters"]
            )
        )

        # =================================================
        # 3. VISUAL PROMPTS
        # =================================================

        print()
        print("========== VISUAL PROMPTS ==========")

        prepared_scenes = (
            self.visual_agent.prepare_visual_prompts(
                scenes=plan_data["scenes"],
                character_bible=character_bible,
                visual_style=plan_data["visual_style"],
            )
        )

        # =================================================
        # 4. IMAGE GENERATION
        # =================================================

        print()
        print("========== IMAGE GENERATION ==========")

        generated_images = []

        for scene_index, scene in enumerate(
            prepared_scenes,
            start=1,
        ):

            for shot_index, shot in enumerate(
                scene["shots"],
                start=1,
            ):

                image_filename = (
                    f"scene_{scene_index}_"
                    f"shot_{shot_index}.png"
                )

                print(
                    f"\nGenerating image: "
                    f"{image_filename}"
                )

                image_path = generate_image(
                    prompt=shot["final_image_prompt"],
                    filename=image_filename,
                )

                shot["generated_image_path"] = (
                    image_path
                )

                generated_images.append(
                    {
                        "scene": scene_index,
                        "shot": shot_index,
                        "image_path": image_path,
                    }
                )

        # =================================================
        # 5. VIDEO GENERATION
        # =================================================

        print()
        print("========== LTX VIDEO GENERATION ==========")

        generated_videos = []

        for scene_index, scene in enumerate(
            prepared_scenes,
            start=1,
        ):

            for shot_index, shot in enumerate(
                scene["shots"],
                start=1,
            ):

                image_path = shot.get(
                    "generated_image_path"
                )

                if not image_path:

                    print(
                        f"Skipping scene "
                        f"{scene_index} "
                        f"shot {shot_index}: "
                        f"no image"
                    )

                    continue

                video_filename = (
                    f"scene_{scene_index}_"
                    f"shot_{shot_index}.mp4"
                )

                print(
                    f"\nGenerating video: "
                    f"{video_filename}"
                )

                video_path = generate_video(
                    image_path=image_path,
                    prompt=shot[
                        "final_motion_prompt"
                    ],
                    output_name=video_filename,
                    duration=5.4,
                )

                shot["generated_video_path"] = (
                    video_path
                )

                generated_videos.append(
                    {
                        "scene": scene_index,
                        "shot": shot_index,
                        "video_path": video_path,
                    }
                )

        # =================================================
        # 6. VOICE JOBS
        # =================================================

        print()
        print("========== VOICE JOBS ==========")

        print(
            "Narrator Voice Selection:",
            narrator_voice,
        )

        voice_jobs = (
            self.voice_agent.prepare_voice_jobs(
                scenes=prepared_scenes,
                character_bible=character_bible,
                narrator_voice=narrator_voice,
            )
        )

        # =================================================
        # 7. VOICE GENERATION
        # =================================================

        print()
        print("========== VOICE GENERATION ==========")
        print("Voice Provider: Edge TTS")
        print(
            "Voice Duration Mode:",
            "ACTUAL AUDIO DURATION",
        )

        generated_voices = (
            generate_all_voices(
                voice_jobs
            )
        )

        # =================================================
        # 8. SFX JOBS
        # =================================================

        print()
        print("========== SFX JOBS ==========")

        sfx_jobs = (
            self.sfx_agent.prepare_sfx_jobs(
                scenes=prepared_scenes
            )
        )

        # =================================================
        # 9. SFX GENERATION
        # =================================================

        print()
        print("========== SFX GENERATION ==========")

        generated_sfx = (
            generate_all_sfx(
                sfx_jobs
            )
        )

        # =================================================
        # 10. FINAL VIDEO COMPOSITION
        # =================================================

        print()
        print(
            "========== FINAL VIDEO COMPOSITION =========="
        )

        final_video_path = compose_final_video(
            generated_videos=generated_videos,
            generated_voices=generated_voices,
            generated_sfx=generated_sfx,
            output_name="story_final.mp4",
        )

        # =================================================
        # 11. FINAL PRODUCTION DATA
        # =================================================

        plan_data["scenes"] = prepared_scenes

        plan_data["character_bible"] = (
            character_bible
        )

        plan_data["generated_images"] = (
            generated_images
        )

        plan_data["generated_videos"] = (
            generated_videos
        )

        plan_data["voice_jobs"] = (
            voice_jobs
        )

        plan_data["generated_voices"] = (
            generated_voices
        )

        plan_data["sfx_jobs"] = (
            sfx_jobs
        )

        plan_data["generated_sfx"] = (
            generated_sfx
        )

        plan_data["final_video_path"] = (
            final_video_path
        )

        # =================================================
        # 12. PIPELINE SUMMARY
        # =================================================

        total_scenes = len(
            plan_data["scenes"]
        )

        total_shots = sum(
            len(scene.get("shots", []))
            for scene in plan_data["scenes"]
        )

        print()
        print(
            "========== STORY PIPELINE COMPLETE =========="
        )

        print(
            "Visual Style:",
            plan_data["visual_style"],
        )

        print(
            "Duration Mode:",
            "CONTENT-DRIVEN",
        )

        print(
            "Scenes:",
            total_scenes,
        )

        print(
            "Shots:",
            total_shots,
        )

        print(
            "Narrator Voice:",
            narrator_voice,
        )

        print(
            "Final Video:",
            final_video_path,
        )

        return plan_data