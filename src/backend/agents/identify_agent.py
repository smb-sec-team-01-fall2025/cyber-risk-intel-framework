import logging
from sqlalchemy.orm import Session
from sqlalchemy import select
from db.models import Asset, IntelEvent, AssetIntelLink, MatchTypeEnum
from db.session import get_session

logger = logging.getLogger(__name__)

class IdentifyAgent:
    def __init__(self, db_session: Session):
        self.db = db_session

    def classify_and_enrich(self):
        """
        Placeholder for asset classification and enrichment logic.
        In a real system, this would involve:
        - Port scanning (Nmap)
        - Service banner grabbing
        - OS fingerprinting
        - CPE matching for vulnerability lookup
        """
        print("Running asset classification and enrichment...")
        # Simulating enrichment by updating a field
        assets = self.db.scalars(select(Asset)).all()
        for asset in assets:
            if not asset.owner:
                asset.owner = "Unassigned"
        self.db.commit()
        print("Asset classification and enrichment complete.")

    def link_intel_to_assets(self):
        """
        Links intel events to assets based on IP indicators.
        """
        print("Running intel linking...")
        
        # Clear existing IP-based links to avoid duplicates
        self.db.query(AssetIntelLink).filter(AssetIntelLink.match_type == MatchTypeEnum.IP).delete()
        self.db.commit()
        
        intel_events = self.db.scalars(select(IntelEvent)).all()
        assets = self.db.scalars(select(Asset).where(Asset.ip.is_not(None))).all()
        
        # A bit inefficient, but fine for an MVP
        links_created = 0
        for event in intel_events:
            for asset in assets:
                # For now, we only match on IP. A real system would match on domains, hostnames, etc.
                if event.indicator == asset.ip:
                    link = AssetIntelLink(
                        asset_id=asset.id,
                        intel_event_id=event.id,
                        match_type=MatchTypeEnum.IP
                    )
                    self.db.add(link)
                    links_created += 1
        
        self.db.commit()
        print(f"Intel linking complete. Created {links_created} new links.")

    def run_full_scan(self):
        print("Starting Identify Agent full scan...")
        self.classify_and_enrich()
        self.link_intel_to_assets()
        print("Identify Agent full scan complete.")


def run_agent_full_scan():
    """
    Entrypoint for running the agent in a background task.
    Creates its own database session.
    """
    db = next(get_session())
    try:
        agent = IdentifyAgent(db)
        agent.run_full_scan()
    finally:
        db.close()
