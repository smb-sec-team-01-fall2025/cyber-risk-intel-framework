from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
import os

# Ensure DB_URL is loaded from environment
DB_URL = os.getenv("DB_URL")
if not DB_URL:
    raise RuntimeError("DB_URL environment variable is not set.")

engine = create_engine(DB_URL, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_session():
    """FastAPI dependency to get a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def session_scope():
    """Context manager for DB sessions in background tasks."""
    from contextlib import contextmanager
    
    @contextmanager
    def scope():
        db = SessionLocal()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
    return scope()
