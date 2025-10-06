import os
import time
import requests
from .base import OSINTClient

class OTXClient(OSINTClient):
    """Client for AlienVault OTX."""
    source = "otx"

    def __init__(self):
        self.key = os.getenv("OSINT_OTX_API_KEY", "")
        self.base = "https://otx.alienvault.com/api/v1/indicators/IPv4/8.8.8.8/general"

    def fetch_sample(self):
        headers = {"X-OTX-API-KEY": self.key} if self.key else {}
        for attempt in range(3):
            try:
                r = requests.get(self.base, headers=headers, timeout=15)
                if r.status_code == 429:
                    # Exponential backoff
                    time.sleep(2 ** attempt)
                    continue
                r.raise_for_status()
                data = r.json()
                
                # Normalize data into our IntelEvent format
                return [{
                    "source": self.source,
                    "indicator": "8.8.8.8", # The sample indicator
                    "raw": data,
                    "severity": 2 # Example severity
                }]
            except requests.exceptions.RequestException as e:
                print(f"OTX request failed (attempt {attempt+1}): {e}")
                time.sleep(2 ** attempt)
        
        return []
