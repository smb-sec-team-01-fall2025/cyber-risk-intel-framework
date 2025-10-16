from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import List, Optional
import json
import csv
from io import StringIO

from db.session import get_session
from db.models import Asset, AssetIntelLink, IntelEvent
from .schemas import AssetCreate, AssetUpdate, AssetResponse
from services.risk.scoring import calculate_asset_risk
from agents.identify_agent import run_agent_full_scan

router = APIRouter()

@router.post("/assets", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(asset: AssetCreate, db: Session = Depends(get_session)):
    new_asset = Asset(**asset.model_dump())
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    return calculate_asset_risk(new_asset, db)

@router.get("/assets", response_model=List[AssetResponse])
def read_assets(
    skip: int = 0,
    limit: int = 100,
    asset_type: Optional[str] = None,
    owner: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_session)
):
    query = select(Asset)
    if asset_type:
        query = query.where(Asset.type == asset_type)
    if owner:
        query = query.where(Asset.owner.ilike(f"%{owner}%"))
    if q:
        query = query.where(Asset.name.ilike(f"%{q}%"))
    
    assets = db.scalars(query.offset(skip).limit(limit)).all()
    return [calculate_asset_risk(asset, db) for asset in assets]


@router.get("/assets/top", response_model=List[AssetResponse])
def get_top_risky_assets(limit: int = 5, db: Session = Depends(get_session)):
    assets = db.scalars(select(Asset)).all()
    scored_assets = [calculate_asset_risk(asset, db) for asset in assets]
    
    sorted_assets = sorted(scored_assets, key=lambda a: a.risk.score, reverse=True)
    
    return sorted_assets[:limit]


@router.get("/assets/{asset_id}", response_model=AssetResponse)
def read_asset(asset_id: int, db: Session = Depends(get_session)):
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return calculate_asset_risk(asset, db)

@router.put("/assets/{asset_id}", response_model=AssetResponse)
def update_asset(asset_id: int, asset_in: AssetUpdate, db: Session = Depends(get_session)):
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    update_data = asset_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(asset, key, value)
    
    db.commit()
    db.refresh(asset)
    return calculate_asset_risk(asset, db)

@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(asset_id: int, db: Session = Depends(get_session)):
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    db.delete(asset)
    db.commit()
    return None

@router.post("/assets/import", status_code=status.HTTP_201_CREATED)
async def import_assets(
    dry_run: bool = Form(False),
    file: UploadFile = File(...),
    db: Session = Depends(get_session)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Only .csv is supported.")

    contents = await file.read()
    file_data = StringIO(contents.decode('utf-8'))
    reader = csv.DictReader(file_data)
    
    assets_to_create = []
    errors = []
    
    for i, row in enumerate(reader):
        try:
            asset_data = AssetCreate(**row)
            assets_to_create.append(asset_data)
        except Exception as e:
            errors.append(f"Row {i+2}: {e}")

    if errors:
        raise HTTPException(status_code=422, detail={"errors": errors})

    if dry_run:
        return {"message": "Dry run successful. Assets are valid.", "asset_count": len(assets_to_create)}

    created_count = 0
    for asset_data in assets_to_create:
        existing_asset = db.scalar(select(Asset).where(Asset.name == asset_data.name))
        if not existing_asset:
            new_asset = Asset(**asset_data.model_dump())
            db.add(new_asset)
            created_count += 1
    
    db.commit()
    
    return {"message": "Import successful.", "assets_created": created_count}


# Placeholder for agent trigger
@router.post("/identify/run")
def run_identify_agent(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_agent_full_scan)
    return {"message": "Identify Agent scan started in the background."}
