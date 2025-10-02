from sqlalchemy import text, create_engine
import os

def test_connection():
    """Try a simple DB connection and return status."""
    db_url = os.getenv("DB_URL")
    if not db_url:
        raise RuntimeError("DB_URL environment variable is not set.")

    engine = create_engine(db_url, future=True)

    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar_one()
            return {"ok": True, "result": result}
    except Exception as e:
        return {"ok": False, "error": str(e)}
