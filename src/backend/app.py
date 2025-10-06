# src/backend/app.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio
from .routers import stats, osint
from .scheduler.jobs import run_osint_poll
import os
import time

@asynccontextmanager
async def lifespan(app: FastAPI):
    # On startup, run scheduler
    print("Starting background OSINT poller...")
    task = asyncio.create_task(run_osint_poll())
    yield
    # On shutdown, clean up
    print("Stopping background OSINT poller...")
    task.cancel()

app = FastAPI(
    title="SMB Sec Platform",
    version="0.2.0",
    lifespan=lifespan
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/version")
def version():
    """Returns the git commit hash and build timestamp."""
    return {
        "commit": os.getenv("GIT_COMMIT", "unknown"),
        "built_at": os.getenv("BUILD_AT", str(time.time()))
    }

app.include_router(stats.router, prefix="/api")
app.include_router(osint.router, prefix="/api")
