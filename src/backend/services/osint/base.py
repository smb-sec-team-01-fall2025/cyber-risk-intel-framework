class OSINTClient:
    """Base class for OSINT client adapters."""
    source = "base"

    def fetch_sample(self, **kwargs) -> list[dict]:
        """
        Fetch a sample of OSINT data.
        Should be implemented by subclasses.
        """
        raise NotImplementedError
