import subprocess

from pathlib import Path
from typing import Dict, List, Optional


# =========================================================
# PATHS
# =========================================================

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

GENERATED_DIR = PROJECT_ROOT / "generated"
FINAL_DIR = GENERATED_DIR / "final"
TEMP_DIR = FINAL_DIR / "temp"

FINAL_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)


# =========================================================
# STORYTOON ENDING
# =========================================================

STORYTOON_OUTRO_DURATION = 2.0
STORYTOON_FADE_DURATION = 0.60


# =========================================================
# HELPERS
# =========================================================

def _resolve_path(file_path: str) -> Path:
    path = Path(file_path)

    if not path.is_absolute():
        path = PROJECT_ROOT / path

    return path.resolve()


def _run_command(command: List[str]) -> str:
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print()
        print("========== FFMPEG ERROR ==========")
        print(result.stderr)
        print("==================================")
        print()

        raise RuntimeError(
            "FFmpeg/FFprobe command failed."
        )

    return result.stdout.strip()


def _get_duration(media_path: Path) -> float:
    output = _run_command([
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(media_path),
    ])

    try:
        return float(output)
    except ValueError:
        return 0.0


# =========================================================
# FIND EXACT SHOT AUDIO
# =========================================================

def _find_shot_voices(
    generated_voices: List[Dict],
    scene_number: int,
    shot_number: int,
) -> List[Path]:

    matches = []

    for voice in generated_voices:

        if (
            int(voice.get("scene_number", 0)) == scene_number
            and int(voice.get("shot_number", 0)) == shot_number
        ):

            audio_path = voice.get("audio_path")

            if not audio_path:
                continue

            path = _resolve_path(audio_path)

            if path.exists():

                matches.append(
                    (
                        int(
                            voice.get(
                                "audio_order",
                                voice.get("sequence", 0),
                            )
                        ),
                        len(matches),
                        path,
                    )
                )

    matches.sort(
        key=lambda item: (
            item[0],
            item[1],
        )
    )

    return [
        item[2]
        for item in matches
    ]


def _find_shot_sfx(
    generated_sfx: List[Dict],
    scene_number: int,
    shot_number: int,
) -> List[Path]:

    result = []

    for sfx in generated_sfx:

        if (
            int(sfx.get("scene_number", 0)) == scene_number
            and int(sfx.get("shot_number", 0)) == shot_number
        ):

            audio_path = sfx.get("audio_path")

            if not audio_path:
                continue

            path = _resolve_path(audio_path)

            if path.exists():
                result.append(path)

    return result


# =========================================================
# REQUIRED SHOT DURATION
# =========================================================

def _calculate_required_duration(
    video_path: Path,
    voice_paths: List[Path],
    sfx_paths: List[Path],
):

    video_duration = _get_duration(video_path)

    voice_durations = [
        _get_duration(path)
        for path in voice_paths
    ]

    sfx_durations = [
        _get_duration(path)
        for path in sfx_paths
    ]

    # Multiple voice clips in one shot are played sequentially.
    VOICE_GAP = 0.25

    if voice_durations:

        voice_duration = sum(
            voice_durations
        )

        voice_duration += (
            VOICE_GAP
            * max(
                0,
                len(voice_durations) - 1,
            )
        )

    else:
        voice_duration = 0.0

    sfx_duration = (
        max(sfx_durations)
        if sfx_durations
        else 0.0
    )

    # Voice is most important.
    if voice_duration > 0:

        required_duration = max(
            video_duration,
            voice_duration + 0.30,
            sfx_duration,
        )

    else:

        required_duration = max(
            video_duration,
            sfx_duration,
        )

    return (
        video_duration,
        voice_duration,
        sfx_duration,
        required_duration,
    )


# =========================================================
# CREATE ONE SHOT
# =========================================================

def _create_shot_video(
    video_path: Path,
    voice_paths: List[Path],
    sfx_paths: List[Path],
    scene_number: int,
    shot_number: int,
    is_last_shot: bool = False,
) -> Path:

    output_path = (
        TEMP_DIR
        / (
            f"scene_{scene_number}_"
            f"shot_{shot_number}_mixed.mp4"
        )
    )

    print()
    print(
        f"Mixing Scene {scene_number} "
        f"Shot {shot_number}"
    )

    print(
        "Video:",
        video_path.name,
    )

    for voice in voice_paths:
        print(
            "Voice:",
            voice.name,
        )

    for sfx in sfx_paths:
        print(
            "SFX:",
            sfx.name,
        )

    (
        video_duration,
        voice_duration,
        sfx_duration,
        required_duration,
    ) = _calculate_required_duration(
        video_path,
        voice_paths,
        sfx_paths,
    )

    print(
        "Video duration:",
        round(video_duration, 2),
        "sec",
    )

    print(
        "Voice duration:",
        round(voice_duration, 2),
        "sec",
    )

    print(
        "SFX duration:",
        round(sfx_duration, 2),
        "sec",
    )

    print(
        "Final shot duration:",
        round(required_duration, 2),
        "sec",
    )

    extra_video_time = max(
        0.0,
        required_duration - video_duration,
    )

    if extra_video_time > 0:

        if is_last_shot:

            print(
                "Last shot audio is longer than video by:",
                round(extra_video_time, 2),
                "sec",
            )

            print(
                "Replacing visible freeze with "
                "smooth fade-to-black."
            )

        else:

            print(
                "Holding last video frame for:",
                round(extra_video_time, 2),
                "sec",
            )

    # =====================================================
    # INPUTS
    # =====================================================

    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(video_path),
    ]

    audio_types = []

    for voice in voice_paths:

        command.extend([
            "-i",
            str(voice),
        ])

        audio_types.append("voice")

    for sfx in sfx_paths:

        command.extend([
            "-i",
            str(sfx),
        ])

        audio_types.append("sfx")

    # Real silent track.
    command.extend([
        "-f",
        "lavfi",
        "-t",
        f"{required_duration:.3f}",
        "-i",
        "anullsrc=r=48000:cl=stereo",
    ])

    silent_input_index = (
        1 + len(audio_types)
    )

    filter_parts = []

    # =====================================================
    # VIDEO
    # =====================================================

    if is_last_shot:

        # -------------------------------------------------
        # LAST SHOT
        # -------------------------------------------------
        #
        # The final shot must never visibly freeze.
        #
        # If audio is longer than video, FFmpeg still needs
        # the visual stream to cover the complete duration.
        #
        # We therefore clone the final frame internally,
        # but fade it to black starting at the end of the
        # real video.
        #
        # This makes the extra duration invisible to the user.
        # -------------------------------------------------

        fade_duration = min(
            STORYTOON_FADE_DURATION,
            required_duration,
        )

        if extra_video_time > 0:

            fade_start = max(
                0.0,
                video_duration - fade_duration,
            )

            filter_parts.append(
                f"[0:v]"
                f"tpad="
                f"stop_mode=clone:"
                f"stop_duration={extra_video_time:.3f},"
                f"trim=duration={required_duration:.3f},"
                f"fade=t=out:"
                f"st={fade_start:.3f}:"
                f"d={fade_duration:.3f}:"
                f"color=black,"
                f"setpts=PTS-STARTPTS"
                f"[video_out]"
            )

        else:

            fade_start = max(
                0.0,
                required_duration - fade_duration,
            )

            filter_parts.append(
                f"[0:v]"
                f"trim=duration={required_duration:.3f},"
                f"fade=t=out:"
                f"st={fade_start:.3f}:"
                f"d={fade_duration:.3f}:"
                f"color=black,"
                f"setpts=PTS-STARTPTS"
                f"[video_out]"
            )

    else:

        # -------------------------------------------------
        # NON-FINAL SHOTS
        # -------------------------------------------------
        #
        # Existing behaviour remains unchanged.
        # -------------------------------------------------

        if extra_video_time > 0:

            filter_parts.append(
                f"[0:v]"
                f"tpad="
                f"stop_mode=clone:"
                f"stop_duration={extra_video_time:.3f},"
                f"trim=duration={required_duration:.3f},"
                f"setpts=PTS-STARTPTS"
                f"[video_out]"
            )

        else:

            filter_parts.append(
                f"[0:v]"
                f"trim=duration={required_duration:.3f},"
                f"setpts=PTS-STARTPTS"
                f"[video_out]"
            )

    # =====================================================
    # ORIGINAL AUDIO
    # =====================================================

    audio_labels = []

    # Voice clips belonging to the same shot must NOT
    # start together.

    VOICE_GAP = 0.25

    voice_start_offsets_ms = []
    voice_cursor = 0.0

    for voice_path in voice_paths:

        voice_start_offsets_ms.append(
            int(
                round(
                    voice_cursor * 1000
                )
            )
        )

        voice_cursor += (
            _get_duration(voice_path)
            + VOICE_GAP
        )

    voice_seen = 0

    for input_index, audio_type in enumerate(
        audio_types,
        start=1,
    ):

        label = (
            f"audio_{input_index}"
        )

        if audio_type == "voice":

            volume = "1.0"

            delay_ms = (
                voice_start_offsets_ms[
                    voice_seen
                ]
            )

            voice_seen += 1

            timing_filter = (
                f"adelay={delay_ms}|{delay_ms},"
            )

        else:

            volume = "0.25"
            timing_filter = ""

        filter_parts.append(
            f"[{input_index}:a]"
            f"aresample=48000,"
            f"aformat="
            f"sample_fmts=fltp:"
            f"sample_rates=48000:"
            f"channel_layouts=stereo,"
            f"{timing_filter}"
            f"volume={volume}"
            f"[{label}]"
        )

        audio_labels.append(
            f"[{label}]"
        )

    # =====================================================
    # SILENCE
    # =====================================================

    filter_parts.append(
        f"[{silent_input_index}:a]"
        f"aformat="
        f"sample_fmts=fltp:"
        f"sample_rates=48000:"
        f"channel_layouts=stereo"
        f"[silence]"
    )

    audio_labels.append(
        "[silence]"
    )

    # =====================================================
    # MIX
    # =====================================================

    filter_parts.append(
        "".join(audio_labels)
        +
        f"amix="
        f"inputs={len(audio_labels)}:"
        f"duration=longest:"
        f"dropout_transition=0:"
        f"normalize=0,"
        f"atrim=duration={required_duration:.3f},"
        f"asetpts=PTS-STARTPTS"
        f"[audio_out]"
    )

    filter_complex = ";".join(
        filter_parts
    )

    # =====================================================
    # OUTPUT
    # =====================================================

    command.extend([
        "-filter_complex",
        filter_complex,

        "-map",
        "[video_out]",

        "-map",
        "[audio_out]",

        "-c:v",
        "libx264",

        "-preset",
        "medium",

        "-crf",
        "20",

        "-pix_fmt",
        "yuv420p",

        "-c:a",
        "aac",

        "-ar",
        "48000",

        "-ac",
        "2",

        "-b:a",
        "192k",

        "-t",
        f"{required_duration:.3f}",

        "-movflags",
        "+faststart",

        str(output_path),
    ])

    _run_command(command)

    return output_path


# =========================================================
# STORYTOON OUTRO HELPERS
# =========================================================

def _find_storytoon_font() -> Optional[Path]:

    candidates = [

        Path(
            r"C:\Windows\Fonts\arial.ttf"
        ),

        Path(
            r"C:\Windows\Fonts\segoeui.ttf"
        ),

        Path(
            "/usr/share/fonts/truetype/"
            "dejavu/DejaVuSans.ttf"
        ),

        Path(
            "/usr/share/fonts/truetype/"
            "liberation2/LiberationSans-Regular.ttf"
        ),
    ]

    for font_path in candidates:

        if font_path.exists():
            return font_path

    return None


def _escape_ffmpeg_filter_path(
    path: Path,
) -> str:

    value = str(path)

    value = value.replace(
        "\\",
        "/",
    )

    value = value.replace(
        ":",
        r"\:",
    )

    value = value.replace(
        "'",
        r"\'",
    )

    return value


# =========================================================
# ADD STORYTOON OUTRO
# =========================================================

def _add_storytoon_outro(
    base_video_path: Path,
    output_path: Path,
) -> Path:

    """
    Add a short professional StoryToon ending.

    Flow:

        story
          ↓
        fade to black
          ↓
        StoryToon
        Your story, brought to life.
          ↓
        end
    """

    base_duration = _get_duration(
        base_video_path
    )

    if base_duration <= 0:

        raise RuntimeError(
            "Cannot create StoryToon outro: "
            "invalid base duration."
        )

    outro_duration = (
        STORYTOON_OUTRO_DURATION
    )

    fade_duration = min(
        STORYTOON_FADE_DURATION,
        base_duration,
    )

    font_path = _find_storytoon_font()

    # -----------------------------------------------------
    # FONT
    # -----------------------------------------------------

    if font_path:

        font = _escape_ffmpeg_filter_path(
            font_path
        )

        title_filter = (
            f"drawtext="
            f"fontfile='{font}':"
            f"text='StoryToon':"
            f"fontcolor=white:"
            f"fontsize=56:"
            f"x=(w-text_w)/2:"
            f"y=(h-text_h)/2-20:"
            f"enable='gte(t,{base_duration:.3f})'"
        )

        tagline_filter = (
            f"drawtext="
            f"fontfile='{font}':"
            f"text='Your story, brought to life.':"
            f"fontcolor=white:"
            f"fontsize=24:"
            f"x=(w-text_w)/2:"
            f"y=(h-text_h)/2+55:"
            f"enable='gte(t,{base_duration:.3f})'"
        )

    else:

        title_filter = (
            "drawtext="
            "font='DejaVu Sans':"
            "text='StoryToon':"
            "fontcolor=white:"
            "fontsize=56:"
            "x=(w-text_w)/2:"
            "y=(h-text_h)/2-20:"
            f"enable='gte(t,{base_duration:.3f})'"
        )

        tagline_filter = (
            "drawtext="
            "font='DejaVu Sans':"
            "text='Your story, brought to life.':"
            "fontcolor=white:"
            "fontsize=24:"
            "x=(w-text_w)/2:"
            "y=(h-text_h)/2+55:"
            f"enable='gte(t,{base_duration:.3f})'"
        )

    # -----------------------------------------------------
    # VIDEO
    # -----------------------------------------------------
    #
    # Extend the final black frame internally for the
    # outro. The previous last-shot fade already makes
    # this frame black.
    #
    # -----------------------------------------------------

    video_filter = (
        "[0:v]"
        f"tpad="
        f"stop_mode=clone:"
        f"stop_duration={outro_duration:.3f},"
        f"{title_filter},"
        f"{tagline_filter},"
        "format=yuv420p"
        "[outro_video]"
    )

    # -----------------------------------------------------
    # AUDIO
    # -----------------------------------------------------
    #
    # Story audio fades out at the end.
    # Outro itself stays silent.
    #
    # -----------------------------------------------------

    audio_filter = (
        "[0:a]"
        f"afade="
        f"t=out:"
        f"st={max(0.0, base_duration - fade_duration):.3f}:"
        f"d={fade_duration:.3f},"
        f"apad="
        f"pad_dur={outro_duration:.3f},"
        f"atrim="
        f"duration={base_duration + outro_duration:.3f},"
        "asetpts=PTS-STARTPTS"
        "[outro_audio]"
    )

    filter_complex = (
        video_filter
        + ";"
        + audio_filter
    )

    command = [

        "ffmpeg",
        "-y",

        "-i",
        str(base_video_path),

        "-filter_complex",
        filter_complex,

        "-map",
        "[outro_video]",

        "-map",
        "[outro_audio]",

        "-c:v",
        "libx264",

        "-preset",
        "medium",

        "-crf",
        "20",

        "-pix_fmt",
        "yuv420p",

        "-c:a",
        "aac",

        "-ar",
        "48000",

        "-ac",
        "2",

        "-b:a",
        "192k",

        "-movflags",
        "+faststart",

        str(output_path),
    ]

    print()
    print(
        "Adding StoryToon outro..."
    )

    print(
        "Outro duration:",
        outro_duration,
        "sec",
    )

    _run_command(command)

    return output_path


# =========================================================
# FINAL COMPOSER
# =========================================================

def compose_final_video(
    generated_videos: List[Dict],
    generated_voices: List[Dict],
    generated_sfx: List[Dict],
    output_name: str = "story_final.mp4",
) -> str:

    print()
    print(
        "======================================"
    )

    print(
        "FINAL STORY VIDEO COMPOSER"
    )

    print(
        "======================================"
    )

    if not generated_videos:

        raise ValueError(
            "No generated videos provided."
        )

    # =====================================================
    # SORT SHOTS
    # =====================================================

    sorted_videos = sorted(
        generated_videos,
        key=lambda item: (
            int(item.get("scene", 0)),
            int(item.get("shot", 0)),
        ),
    )

    completed_shots = []

    # =====================================================
    # BUILD EACH SHOT
    # =====================================================

    for video_index, video_data in enumerate(
        sorted_videos
    ):

        is_last_shot = (
            video_index
            == len(sorted_videos) - 1
        )

        scene_number = int(
            video_data.get(
                "scene",
                0,
            )
        )

        shot_number = int(
            video_data.get(
                "shot",
                0,
            )
        )

        raw_video_path = (
            video_data.get(
                "video_path"
            )
        )

        if not raw_video_path:
            continue

        video_path = _resolve_path(
            raw_video_path
        )

        if not video_path.exists():

            raise FileNotFoundError(
                f"Video not found: "
                f"{video_path}"
            )

        voice_paths = (
            _find_shot_voices(
                generated_voices,
                scene_number,
                shot_number,
            )
        )

        sfx_paths = (
            _find_shot_sfx(
                generated_sfx,
                scene_number,
                shot_number,
            )
        )

        completed_shot = (
            _create_shot_video(
                video_path=video_path,
                voice_paths=voice_paths,
                sfx_paths=sfx_paths,
                scene_number=scene_number,
                shot_number=shot_number,
                is_last_shot=is_last_shot,
            )
        )

        completed_shots.append(
            completed_shot
        )

    if not completed_shots:

        raise RuntimeError(
            "No completed shots created."
        )

    # =====================================================
    # FINAL MOVIE
    # =====================================================

    output_path = (
        FINAL_DIR / output_name
    )

    base_output_path = (
        TEMP_DIR
        / f"{Path(output_name).stem}_base.mp4"
    )

    print()
    print(
        "Combining synchronized shots "
        "with smooth transitions..."
    )

    # =====================================================
    # SINGLE SHOT
    # =====================================================

    if len(completed_shots) == 1:

        command = [

            "ffmpeg",
            "-y",

            "-fflags",
            "+genpts",

            "-i",
            str(
                completed_shots[0]
            ),

            "-vf",
            "format=yuv420p",

            "-af",
            "aresample=48000:async=1:first_pts=0",

            "-c:v",
            "libx264",

            "-preset",
            "medium",

            "-crf",
            "20",

            "-pix_fmt",
            "yuv420p",

            "-c:a",
            "aac",

            "-ar",
            "48000",

            "-ac",
            "2",

            "-b:a",
            "192k",

            "-movflags",
            "+faststart",

            str(
                base_output_path
            ),
        ]

        _run_command(
            command
        )

    else:

        # =================================================
        # GET EACH SHOT DURATION
        # =================================================

        shot_durations = []

        for shot_path in completed_shots:

            duration = _get_duration(
                shot_path
            )

            if duration <= 0:

                raise RuntimeError(
                    "Invalid shot duration: "
                    f"{shot_path}"
                )

            shot_durations.append(
                duration
            )

        # =================================================
        # TRANSITION SETTINGS
        # =================================================

        TRANSITION_DURATION = 0.35

        # =================================================
        # VALIDATE TRANSITIONS
        # =================================================

        for duration in shot_durations:

            if duration <= TRANSITION_DURATION:

                raise RuntimeError(
                    "Shot is too short for "
                    f"the {TRANSITION_DURATION}s "
                    "transition: "
                    f"{duration:.2f}s"
                )

        # =================================================
        # INPUTS
        # =================================================

        command = [

            "ffmpeg",
            "-y",

            "-fflags",
            "+genpts",
        ]

        for shot_path in completed_shots:

            command.extend([
                "-i",
                str(shot_path),
            ])

        # =================================================
        # VIDEO CROSSFADE FILTER
        # =================================================

        filter_parts = []

        if len(completed_shots) == 2:

            offset = (
                shot_durations[0]
                - TRANSITION_DURATION
            )

            filter_parts.append(
                "[0:v]"
                "[1:v]"
                f"xfade="
                f"transition=fade:"
                f"duration={TRANSITION_DURATION}:"
                f"offset={offset:.3f}"
                "[video_final]"
            )

        else:

            # ---------------------------------------------
            # FIRST TRANSITION
            # ---------------------------------------------

            cumulative_duration = (
                shot_durations[0]
                - TRANSITION_DURATION
            )

            filter_parts.append(
                "[0:v][1:v]"
                f"xfade="
                f"transition=fade:"
                f"duration={TRANSITION_DURATION}:"
                f"offset={cumulative_duration:.3f}"
                "[v1]"
            )

            # ---------------------------------------------
            # REMAINING TRANSITIONS
            # ---------------------------------------------

            cumulative_duration = (
                shot_durations[0]
                + shot_durations[1]
                - (
                    2
                    * TRANSITION_DURATION
                )
            )

            for index in range(
                2,
                len(completed_shots),
            ):

                previous_label = (
                    f"v{index - 1}"
                )

                current_label = (
                    f"v{index}"
                )

                filter_parts.append(
                    f"[{previous_label}]"
                    f"[{index}:v]"
                    f"xfade="
                    f"transition=fade:"
                    f"duration={TRANSITION_DURATION}:"
                    f"offset={cumulative_duration:.3f}"
                    f"[{current_label}]"
                )

                cumulative_duration += (
                    shot_durations[index]
                    - TRANSITION_DURATION
                )

            filter_parts.append(
                f"[v{len(completed_shots) - 1}]"
                "null"
                "[video_final]"
            )

        # =================================================
        # AUDIO CONCAT
        # =================================================
        #
        # Audio is NOT crossfaded.
        #
        # This keeps:
        #
        # Scene 1 voice -> Scene 1 SFX
        # Scene 2 voice -> Scene 2 SFX
        #
        # exactly separated.
        #
        # =================================================

        audio_input_labels = ""

        for index in range(
            len(completed_shots)
        ):

            audio_input_labels += (
                f"[{index}:a]"
            )

        filter_parts.append(
            audio_input_labels
            + f"concat="
            f"n={len(completed_shots)}:"
            f"v=0:"
            f"a=1"
            "[audio_final]"
        )

        # =================================================
        # FILTER COMPLEX
        # =================================================

        filter_complex = ";".join(
            filter_parts
        )

        # =================================================
        # FINAL BASE OUTPUT
        # =================================================

        command.extend([

            "-filter_complex",
            filter_complex,

            "-map",
            "[video_final]",

            "-map",
            "[audio_final]",

            "-c:v",
            "libx264",

            "-preset",
            "medium",

            "-crf",
            "20",

            "-pix_fmt",
            "yuv420p",

            "-c:a",
            "aac",

            "-ar",
            "48000",

            "-ac",
            "2",

            "-b:a",
            "192k",

            "-movflags",
            "+faststart",

            str(
                base_output_path
            ),
        ])

        _run_command(
            command
        )

    # =====================================================
    # STORYTOON OUTRO
    # =====================================================

    _add_storytoon_outro(
        base_video_path=base_output_path,
        output_path=output_path,
    )

    # =====================================================
    # SUCCESS
    # =====================================================

    print()

    print(
        "======================================"
    )

    print(
        "FINAL VIDEO SUCCESS"
    )

    print(
        "Smooth transitions:",
        "0.35 sec",
    )

    print(
        "Last-shot fade:",
        f"{STORYTOON_FADE_DURATION:.2f} sec",
    )

    print(
        "StoryToon outro:",
        f"{STORYTOON_OUTRO_DURATION:.1f} sec",
    )

    print(
        "Saved:",
        output_path,
    )

    print(
        "======================================"
    )

    print()

    return str(
        output_path
    )