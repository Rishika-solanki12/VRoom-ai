from typing import List, Optional

from pydantic import BaseModel, Field


class StoryRequest(BaseModel):
    story: str = Field(min_length=10)
    visual_style: str = "cartoon"
    narrator_voice: str = "auto"


class Character(BaseModel):
    id: str
    name: str
    role: str
    character_type: str
    species: Optional[str] = None
    gender: Optional[str] = None
    age_style: Optional[str] = None
    personality: str
    appearance: str
    clothes: Optional[str] = None
    visual_prompt: str
    voice_style: str
    voice_identity: Optional[str] = None


class Dialogue(BaseModel):
    character_id: str
    text: str
    emotion: str


class Shot(BaseModel):
    shot_number: int
    duration_seconds: int
    shot_type: str
    camera_movement: str
    description: str
    characters: List[str]
    character_actions: str
    environment: str
    emotion: str
    dialogue: Optional[Dialogue] = None
    narration: Optional[str] = None
    image_prompt: str
    motion_prompt: str
    sound_effects: List[str] = Field(default_factory=list)


class Scene(BaseModel):
    scene_number: int
    title: str
    location: str
    time_of_day: str
    scene_description: str
    shots: List[Shot]


class StoryPlan(BaseModel):
    title: str
    genre: str
    visual_style: str = "3D Cartoon"
    summary: str
    characters: List[Character]
    scenes: List[Scene]
    background_music_style: str
    ending_message: Optional[str] = None