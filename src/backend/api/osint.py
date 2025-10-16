from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.session import get_session
from db.models import IntelEvent
from services.osint.otx_client import OTXClient # Assumes this will be created

router = APIRouter()

@router.post("/osint/test", tags=["osint"])
def osint_test(session: Session = Depends(get_session)):
    """
    Manually trigger a test run of an OSINT client to fetch sample data
    and insert it into the database.
    """
    try:
        client = OTXClient()
        items = client.fetch_sample()
        
        if not items:
            return {"inserted": 0, "message": "No items returned from client."}
            
        for item in items:
            db_event = IntelEvent(
                source=item["source"],
                indicator=item["indicator"],
                raw=item["raw"],
                severity=item["severity"]
            )
            session.add(db_event)
        
        session.commit()
        return {"inserted": len(items)}
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"An error occurred: {e}"
        )
