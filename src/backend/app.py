from fastapi import FastAPI, BackgroundTasks
import os
import time

from api import stats, osint, assets
from scheduler import jobs

app = FastAPI(
    title="SMB Sec Platform",
    version="0.3.0",
)

@app.on_event("startup")
def startup_event():
    jobs.start_scheduler()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/version")
def version():
    return {
        "commit": os.getenv("GIT_COMMIT", "unknown"),
        "built_at": os.getenv("BUILD_AT", time.time())
    }

# Include routers
app.include_router(stats.router, prefix="/api", tags=["stats"])
app.include_router(osint.router, prefix="/api", tags=["osint"])
app.include_router(assets.router, prefix="/api", tags=["assets"])
