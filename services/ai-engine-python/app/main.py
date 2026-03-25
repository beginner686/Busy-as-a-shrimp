from fastapi import FastAPI
import uvicorn
from app.config import settings
from app.scheduler import setup_jobs


app = FastAPI(title="Lobster AI Engine", version="0.1.0")


@app.on_event("startup")
def startup_event() -> None:
    setup_jobs()


@app.get("/health")
def health() -> dict:
    return {"success": True, "service": settings.app_name, "status": "up"}


@app.get("/tasks/status")
def task_status() -> dict:
    return {
        "success": True,
        "tasks": [
            "heartbeat(5m)",
            "collect_demands(6h)",
            "run_matching(01:00 daily)"
        ]
    }


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8088, reload=True)

