from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from ..db.session import get_session
from ..db.models import Asset, IntelEvent, RiskItem

router = APIRouter()

@router.get("/stats")
def stats(session: Session = Depends(get_session)):
    a = session.scalar(select(func.count(Asset.id)))
    e = session.scalar(select(func.count(IntelEvent.id)))
    r = session.scalar(select(func.count(RiskItem.id)))
    return {"assets": a, "intel_events": e, "risk_items": r}
