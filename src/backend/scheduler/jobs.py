import asyncio
import logging
from ..services.osint.otx_client import OTXClient
from ..db.session import session_scope
from ..db.models import IntelEvent

logging.basicConfig(level=logging.INFO)

async def run_osint_poll():
    """Periodically polls OSINT sources and saves new intel."""
    while True:
        logging.info("Polling OSINT sources...")
        try:
            client = OTXClient()
            items = client.fetch_sample()
            
            if items:
                with session_scope() as s:
                    for it in items:
                        s.add(IntelEvent(
                            source=it["source"],
                            indicator=it["indicator"],
                            raw=it["raw"],
                            severity=it["severity"]
                        ))
                logging.info(f"Inserted {len(items)} new intel events.")
            
        except Exception as e:
            logging.exception(f"An error occurred during OSINT poll: {e}")
            
        # Wait for an hour before the next poll
        await asyncio.sleep(60 * 60)
