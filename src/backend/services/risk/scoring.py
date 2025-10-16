from db.models import Asset, IntelEvent, AssetIntelLink
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from datetime import datetime, timedelta

from api.schemas import AssetResponse, RiskInfo, DataSensitivityEnum

def calculate_asset_risk(asset: Asset, db: Session) -> AssetResponse:
    """
    Calculates a risk score for an asset based on criticality, data sensitivity,
    and linked intelligence events.
    """
    base_score = 0
    
    # Factor 1: Criticality (1-5) -> maps to 0-40 points
    base_score += (asset.criticality - 1) * 10
    
    # Factor 2: Data Sensitivity (LOW, MODERATE, HIGH) -> maps to 0, 15, 30 points
    if asset.data_sensitivity == DataSensitivityEnum.MODERATE:
        base_score += 15
    elif asset.data_sensitivity == DataSensitivityEnum.HIGH:
        base_score += 30
        
    # Factor 3: Linked Intel Events
    intel_link_count = db.scalar(
        select(func.count(AssetIntelLink.id))
        .where(AssetIntelLink.asset_id == asset.id)
    )
    # Add 5 points for each linked intel event, up to a max of 30
    base_score += min(intel_link_count * 5, 30)
    
    final_score = min(base_score, 100) # Cap score at 100
    
    explanation = (
        f"Base score calculated from: "
        f"Criticality ({asset.criticality}/5), "
        f"Data Sensitivity ({asset.data_sensitivity.value}), "
        f"and {intel_link_count} linked intel events."
    )
    
    # Fetch recent intel for the response model
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_intel_query = (
        select(IntelEvent)
        .join(AssetIntelLink)
        .where(AssetIntelLink.asset_id == asset.id)
        .where(IntelEvent.created_at >= seven_days_ago)
        .order_by(IntelEvent.created_at.desc())
    )
    recent_intel = db.scalars(recent_intel_query).all()

    # The error was here. We must provide all required fields (like `risk`)
    # when creating the model, not after.
    asset_data = asset.__dict__
    asset_data['risk'] = RiskInfo(score=final_score, explanation=explanation)
    asset_data['recent_intel'] = recent_intel
    
    return AssetResponse(**asset_data)
