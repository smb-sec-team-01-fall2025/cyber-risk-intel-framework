import os
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session
from src.backend.db.models import Asset, IntelEvent, RiskItem

DB_URL = os.getenv("DB_URL")
if not DB_URL:
    raise RuntimeError("DB_URL not set")

engine = create_engine(DB_URL, future=True)

with Session(engine) as s:
    # Count helpers
    asset_count = s.scalar(select(func.count()).select_from(Asset))
    intel_count = s.scalar(select(func.count()).select_from(IntelEvent))
    risk_count = s.scalar(select(func.count()).select_from(RiskItem))

    # Seed assets
    if asset_count == 0:
        s.add_all([
            Asset(name="Demo Web Server", type="Service", criticality=3),
            Asset(name="Customer Database", type="Data", criticality=5),
        ])
        s.commit()
        print("Inserted demo assets")

    # Seed intel event
    if intel_count == 0:
        s.add(IntelEvent(
            source="otx",
            indicator="8.8.8.8",
            raw={"note": "example seeded intel"},
            severity=2
        ))
        s.commit()
        print("Inserted demo intel event")

    # Seed risk item
    if risk_count == 0:
        asset_id = s.scalar(select(Asset.id).limit(1))
        s.add(RiskItem(
            asset_id=asset_id,
            title="Outdated software package",
            likelihood=3,
            impact=4
        ))
        s.commit()
        print("Inserted demo risk item")

    # Show final counts
    print("✅ Seed complete")
    print("Assets:", s.scalar(select(func.count()).select_from(Asset)))
    print("Intel Events:", s.scalar(select(func.count()).select_from(IntelEvent)))
    print("Risk Items:", s.scalar(select(func.count()).select_from(RiskItem)))
