import os
import time
import requests
import logging

from services.osint.base import OSINTClient

logger = logging.getLogger(__name__)

class OTXClient(OSINTClient):
    source = "otx"

    def __init__(self):
        self.key = os.getenv("OSINT_OTX_API_KEY", "")
        # Using a well-known indicator for a stable sample
        self.base = "https://otx.alienvault.com/api/v1/indicators/IPv4/8.8.8.8/general"

    def fetch_sample(self) -> list[dict]:
        """
        Fetches a sample indicator from AlienVault OTX, with retry and backoff.
        """
        headers = {"X-OTX-API-KEY": self.key} if self.key else {}
        
        for attempt in range(3):
            try:
                r = requests.get(self.base, headers=headers, timeout=15)
                
                if r.status_code == 429:
                    retry_after = int(r.headers.get("Retry-After", 2 ** attempt))
                    logger.warning(f"Rate limited. Retrying in {retry_after} seconds...")
                    time.sleep(retry_after)
                    continue

                r.raise_for_status()
                data = r.json()

                # Normalize the data into our standard format
                return [{
                    "source": self.source,
                    "indicator": "8.8.8.8",
                    "raw": data,
                    "severity": data.get("pulse_info", {}).get("count", 0) // 10 or 1,
                }]
            except requests.exceptions.RequestException as e:
                logger.error(f"OTX client request failed (attempt {attempt + 1}/3): {e}")
                time.sleep(2 ** attempt)  # Exponential backoff

        return []
