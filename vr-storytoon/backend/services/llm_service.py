import os
import re

from dotenv import load_dotenv
from google import genai
from google.genai import types

from models.schemas import StoryPlan


load_dotenv()


# =========================================================
# GEMINI CONFIG
# =========================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError(
        "GEMINI_API_KEY .env file me nahi mili."
    )


client = genai.Client(
    api_key=GEMINI_API_KEY
)

MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-2.0-flash",
)


# =========================================================
# VISUAL STYLE
# =========================================================

STYLE_NAMES = {
    "cartoon": "3D Cartoon",
    "cinematic": "Cinematic",
    "anime": "Anime",
    "storybook": "Storybook",
}


def _normalize_style(value: str) -> str:

    value = (
        value or "cartoon"
    ).strip().lower()

    return STYLE_NAMES.get(
        value,
        "3D Cartoon",
    )


# =========================================================
# STORY PLANNER PROMPT
# =========================================================

def _build_prompt(
    story: str,
    visual_style: str,
) -> str:

    style_name = _normalize_style(
        visual_style
    )

    return f"""
You are the Story Planner for VR StoryToon AI.

Your job is to convert the user's COMPLETE story into a coherent animated
movie.

The movie duration MUST be determined by the actual story content.

There is NO user-selected duration.

=========================================================
USER STORY
=========================================================

{story}


=========================================================
REQUESTED VISUAL STYLE
=========================================================

{style_name}


=========================================================
CORE DURATION RULE
=========================================================

DO NOT target:

- 30 seconds
- 1 minute
- 2 minutes
- 3 minutes
- 4 minutes
- or any other fixed duration.

The user does NOT choose the movie duration.

The AI must decide how much visual content is actually required to tell the
complete story.

The production flow is:

USER STORY
    ->
MEANINGFUL STORY BEATS
    ->
SCENES
    ->
SHOTS
    ->
NARRATION / DIALOGUE
    ->
ACTUAL TTS AUDIO
    ->
ANIMATION
    ->
FINAL VIDEO


IMPORTANT:

The final movie should naturally follow the amount of content in the user's
story.

A short story should remain short.

A longer story should naturally become longer.

NEVER add unrelated content just to make the video longer.

NEVER remove important story content just to make the video shorter.

NEVER create filler scenes only to reach a duration target.


=========================================================
STORY CONTENT
=========================================================

You MUST preserve:

- the original story
- the original characters
- the original setting
- the important actions
- the original story progression
- the ending intent

Do not invent unrelated:

- characters
- locations
- subplots
- events
- conflicts
- endings


Every important event in the user's story must appear in the final ordered
scene/shot structure.


=========================================================
SCENE PLANNING
=========================================================

Break the story into meaningful scenes.

Create a new scene when there is a meaningful change such as:

- location
- time
- major story event
- major action
- important character interaction
- important emotional change
- story transition


Do NOT create scenes simply because a fixed duration requires them.


=========================================================
SHOT PLANNING
=========================================================

Break each scene into meaningful visual shots.

A shot can represent:

- an important action
- a character reaction
- a conversation
- a reveal
- a movement
- an environment moment
- a transition
- an ending beat

Use only the number of shots that the story actually needs.

Do NOT force a fixed shot count.

Do NOT force 5 shots.

Do NOT force 7 shots.

Do NOT force 10 shots.

Do NOT create tiny filler shots.

Do NOT put several completely different visual events into one shot if they
would be clearer as separate meaningful shots.

The shot count must be decided from the story content.


=========================================================
SPOKEN CONTENT
=========================================================

Every important story event should have appropriate spoken coverage whenever
speech/narration naturally belongs there.

Use:

- narration for story description
- dialogue when a character actually speaks

Do NOT duplicate the same sentence in narration and dialogue.

Keep dialogue natural.

Keep narration natural.

Keep each narration/dialogue field reasonably short so that the TTS voice
sounds natural.

If a long narration contains multiple distinct story events, divide it across
meaningful shots instead of creating one huge spoken paragraph.


=========================================================
IMPORTANT AUDIO RULE
=========================================================

The `duration_seconds` field is NOT a user-facing duration selection.

It is only an internal planning hint for the production pipeline.

DO NOT use it to force the complete movie into a fixed duration.

Actual generated TTS audio duration will be measured later by the voice
generation system.

The final video production system must use the actual generated audio duration
when determining how long the corresponding visual content should remain on
screen.

NEVER stretch a short voice unnaturally just to satisfy a fixed movie
duration.


=========================================================
LANGUAGE RULE
=========================================================

Detect the language of the user's story.

Keep narration and dialogue in the same language.

If the user writes Hindi in Devanagari:

- keep Hindi in Devanagari.

If the user writes English:

- keep English.

If the user writes natural Hinglish:

- preserve the natural Hindi/English mix.

Do NOT translate the story into another language unless the user explicitly
asks for translation.


=========================================================
CHARACTER CONSISTENCY
=========================================================

Define recurring characters once in the character list.

For every recurring character, maintain:

- same identity
- same name
- same species
- same age style
- same appearance
- same clothes
- same personality
- same visual identity

Use stable character IDs in every shot.


=========================================================
VISUAL CONSISTENCY
=========================================================

Use the requested visual style:

{style_name}

Every shot must visually connect with the surrounding shots.

Visual prompts should contain useful information about:

- camera
- environment
- action
- character position
- character expression
- emotion
- important objects
- scene atmosphere


=========================================================
SFX RULE
=========================================================

Add only sound effects that belong to the exact scene/shot.

Examples:

- footsteps
- door opening
- birds
- wind
- rain
- thunder
- water
- forest ambience
- object movement

Do NOT put:

- narration
- dialogue
- background music

inside `sound_effects`.


=========================================================
OUTPUT RULE
=========================================================

Return ONLY valid JSON matching the StoryPlan schema.

Do not return:

- markdown
- explanations
- comments
- extra text

Return only the JSON object.
"""


# =========================================================
# DUPLICATE SPOKEN CONTENT CLEANER
# =========================================================

def _clean_duplicate_spoken_content(
    story_plan: StoryPlan,
) -> None:
    """
    Prevent the same line from being spoken as both
    narration and character dialogue.
    """

    for scene in story_plan.scenes:

        for shot in scene.shots:

            if not shot.narration:
                continue

            if not shot.dialogue:
                continue

            narration = shot.narration.strip()

            dialogue = (
                shot.dialogue.text or ""
            ).strip()

            if not dialogue:
                continue

            patterns = [
                re.escape(dialogue),
                re.escape(
                    '"' + dialogue + '"'
                ),
                re.escape(
                    "'" + dialogue + "'"
                ),
                re.escape(
                    "“" + dialogue + "”"
                ),
                re.escape(
                    "‘" + dialogue + "’"
                ),
            ]

            cleaned = narration

            for pattern in patterns:

                cleaned = re.sub(
                    pattern,
                    "",
                    cleaned,
                    flags=re.IGNORECASE,
                )

            cleaned = re.sub(
                r"\s{2,}",
                " ",
                cleaned,
            ).strip(
                " ,;:—-–"
            )

            if cleaned != narration:

                shot.narration = (
                    cleaned
                    if cleaned
                    else None
                )


# =========================================================
# GENERATE STORY PLAN
# =========================================================

def generate_story_plan(
    story: str,
    visual_style: str = "cartoon",
) -> StoryPlan:

    story = (
        story or ""
    ).strip()

    if len(story) < 10:

        raise ValueError(
            "Story must contain at least 10 characters."
        )

    normalized_style = _normalize_style(
        visual_style
    )

    prompt = _build_prompt(
        story=story,
        visual_style=visual_style,
    )

    print()
    print("========== STORY PLANNER ==========")
    print(
        "Visual Style:",
        normalized_style,
    )
    print(
        "Duration Mode:",
        "CONTENT-DRIVEN",
    )
    print(
        "Duration Target:",
        "NONE",
    )
    print(
        "Shot Count:",
        "AI decides from story content",
    )

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            response_mime_type="application/json",
            response_schema=StoryPlan,
        ),
    )

    if not response or not response.text:

        raise RuntimeError(
            "Gemini returned an empty story plan."
        )

    try:

        story_plan = (
            StoryPlan.model_validate_json(
                response.text
            )
        )

    except Exception as exc:

        raise RuntimeError(
            "Gemini returned invalid StoryPlan JSON: "
            f"{exc}"
        ) from exc

    # -----------------------------------------------------
    # Visual style selected by the UI remains authoritative.
    # -----------------------------------------------------

    story_plan.visual_style = (
        normalized_style
    )

    # -----------------------------------------------------
    # Prevent duplicate narration/dialogue.
    # -----------------------------------------------------

    _clean_duplicate_spoken_content(
        story_plan
    )

    # -----------------------------------------------------
    # Logging
    # -----------------------------------------------------

    actual_scenes = len(
        story_plan.scenes
    )

    actual_shots = sum(
        len(scene.shots)
        for scene in story_plan.scenes
    )

    print(
        "Generated scenes:",
        actual_scenes,
    )

    print(
        "Generated shots:",
        actual_shots,
    )

    print(
        "Duration decision:",
        "Based on story content + actual audio later",
    )

    print(
        "===================================="
    )

    return story_plan