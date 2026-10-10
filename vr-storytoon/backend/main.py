from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routes import router


# =========================================================
# PATHS
# =========================================================

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

GENERATED_DIR = PROJECT_ROOT / "generated"

GENERATED_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# =========================================================
# APP
# =========================================================

app = FastAPI(
    title="VR StoryToon AI",
    description="Agentic AI system that turns stories into cartoon videos",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# GENERATED MEDIA
# =========================================================

app.mount(
    "/generated",
    StaticFiles(
        directory=str(GENERATED_DIR)
    ),
    name="generated",
)


# =========================================================
# API ROUTES
# =========================================================

app.include_router(
    router,
    prefix="/api",
)


# =========================================================
# BASIC ROUTES
# =========================================================

@app.get("/")
def home():
    return {
        "app": "VR StoryToon AI",
        "status": "running",
        "message": "Welcome to VR StoryToon AI",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }