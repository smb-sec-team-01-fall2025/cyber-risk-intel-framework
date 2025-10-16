import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from services.osint.otx_client import OTXClient
from db.session import session_scope
from db.models import IntelEvent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_osint_poll():
    """
    Polls the OTX client for new intelligence data and stores it.
    """
    logger.info("Starting OSINT poll...")
    try:
        client = OTXClient()
        items = client.fetch_sample()
        if not items:
            logger.info("No new items from OSINT poll.")
            return

        with session_scope() as s:
            for it in items:
                s.add(IntelEvent(
                    source=it["source"],
                    indicator=it["indicator"],
                    raw=it["raw"],
                    severity=it["severity"]
                ))
        logger.info(f"Successfully inserted {len(items)} items from OSINT poll.")
    except Exception as e:
        logger.exception(f"An error occurred during the OSINT poll: {e}")

scheduler = AsyncIOScheduler()
scheduler.add_job(run_osint_poll, 'interval', minutes=60)

def start_scheduler():
    logger.info("Starting scheduler...")
    scheduler.start()
