from fastapi import APIRouter, HTTPException, status
import threading
import uuid
from datetime import datetime, timezone

from models.schemas import StoryRequest
from agents.story_agent import StoryAgent


router = APIRouter()
story_agent = StoryAgent()

_jobs = {}
_jobs_lock = threading.Lock()


def _now():
    return datetime.now(timezone.utc).isoformat()


def _run_story_job(job_id, request):
    with _jobs_lock:
        _jobs[job_id]["status"] = "running"
        _jobs[job_id]["message"] = (
            "🎬 AI is creating scenes, animation, voices and sound..."
        )
        _jobs[job_id]["started_at"] = _now()

    try:
        print()
        print("========== BACKGROUND STORY JOB ==========")
        print("Job ID:", job_id)
        print("Story:", request.story)
        print("Visual Style:", request.visual_style)
        print("Duration Mode: CONTENT-DRIVEN")
        print("Narrator Voice:", request.narrator_voice)

        result = story_agent.process_story(
            story=request.story,
            visual_style=request.visual_style,
            narrator_voice=request.narrator_voice,
        )

        with _jobs_lock:
            _jobs[job_id]["status"] = "completed"
            _jobs[job_id]["message"] = (
                "🎉 Your animated story is ready!"
            )
            _jobs[job_id]["result"] = result
            _jobs[job_id]["finished_at"] = _now()

        print("========== STORY JOB COMPLETE ==========")

    except Exception as error:
        error_text = str(error) or error.__class__.__name__

        print()
        print("========== STORY JOB FAILED ==========")
        print("Job ID:", job_id)
        print("ERROR:", repr(error))

        with _jobs_lock:
            _jobs[job_id]["status"] = "failed"
            _jobs[job_id]["message"] = error_text
            _jobs[job_id]["error"] = error_text
            _jobs[job_id]["finished_at"] = _now()


@router.post(
    "/generate-story",
    status_code=status.HTTP_202_ACCEPTED,
)
def generate_story(request: StoryRequest):

    job_id = str(uuid.uuid4())

    with _jobs_lock:
        _jobs[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "message": "📝 Story generation queued...",
            "result": None,
            "error": None,
            "created_at": _now(),
            "started_at": None,
            "finished_at": None,
        }

    thread = threading.Thread(
        target=_run_story_job,
        args=(job_id, request),
        daemon=True,
        name=f"story-job-{job_id[:8]}",
    )

    thread.start()

    return {
        "success": True,
        "job_id": job_id,
        "status": "queued",
        "message": "Story generation started.",
    }


@router.get("/generate-story/{job_id}")
def get_story_job(job_id: str):

    with _jobs_lock:
        job = _jobs.get(job_id)

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="Story generation job not found.",
        )

    return {
        "success": True,
        **job,
    }