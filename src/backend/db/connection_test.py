from sqlalchemy import text, create_engine
import os

def test_connection():
    """Return a dict; never raise. For health endpoints/CI."""
    db_url = os.getenv("DB_URL")
    if not db_url:
        return {"ok": False, "error": "DB_URL not set"}

    try:
        engine = create_engine(db_url, future=True)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar_one()
        return {"ok": True, "result": result}
    except Exception as e:
        return {"ok": False, "error": str(e)}
