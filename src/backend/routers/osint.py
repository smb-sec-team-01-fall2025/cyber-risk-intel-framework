from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db.session import get_session
from ..db.models import IntelEvent
from ..services.osint.otx_client import OTXClient

router = APIRouter()

@router.post("/osint/test")
def osint_test(session: Session = Depends(get_session)):
    """Fetches a sample from an OSINT source and writes it to the DB."""
    client = OTXClient()
    items = client.fetch_sample()
    
    for it in items:
        event = IntelEvent(
            source=it["source"],
            indicator=it["indicator"],
            raw=it["raw"],
            severity=it["severity"]
        )
        session.add(event)
    
    session.commit()
    return {"inserted": len(items)}
