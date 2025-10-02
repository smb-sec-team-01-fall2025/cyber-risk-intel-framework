# src/backend/app.py
from fastapi import FastAPI
from src.backend.db.connection_test import test_connection  # absolute, not relative

app = FastAPI(title="SMB Sec Platform", version="0.2.0")

@app.get("/health")
def health():
    return {"status": "ok", "db": test_connection()}


@app.get("/version")
def version():
    import os, time
    return {
        "commit": os.getenv("GIT_COMMIT", "unknown"),
        "built_at": os.getenv("BUILD_AT", time.time()),
    }
