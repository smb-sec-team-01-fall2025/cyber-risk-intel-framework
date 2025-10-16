class OSINTClient:
    """
    Base class for OSINT client implementations.
    """
    source = "base"

    def fetch_sample(self, **kwargs) -> list[dict]:
        """
        Fetches a sample of intelligence data.

        This method should be implemented by subclasses to interact with a specific
        OSINT API, handle pagination, and normalize the data into a common format.
        """
        raise NotImplementedError
