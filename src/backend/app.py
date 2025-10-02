from fastapi import FastAPI
from .db.connection_test import test_connection
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

@app.get("/health")
def health():
    db_status = test_connection()
    return {"status": "ok", "env": os.getenv("APP_ENV", "dev"), "db": db_status}