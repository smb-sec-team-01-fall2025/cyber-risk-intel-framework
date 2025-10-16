from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from db.session import get_session
from db.models import Asset, IntelEvent, RiskItem

router = APIRouter()

@router.get("/stats", tags=["dashboard"])
def get_stats(session: Session = Depends(get_session)):
    """
    Retrieve high-level statistics for the dashboard.
    """
    try:
        asset_count = session.execute(select(func.count(Asset.id))).scalar_one()
        event_count = session.execute(select(func.count(IntelEvent.id))).scalar_one()
        risk_count = session.execute(select(func.count(RiskItem.id))).scalar_one()
        
        return {
            "assets": asset_count,
            "intel_events": event_count,
            "risk_items": risk_count,
        }
    except Exception as e:
        # This can happen if the DB is not ready, return zeros
        return {"assets": 0, "intel_events": 0, "risk_items": 0}
