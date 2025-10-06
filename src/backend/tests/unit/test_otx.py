
def test_otx_client_mock(monkeypatch):
    """Tests the OTX client with a mocked API response."""
    from src.backend.services.osint.otx_client import OTXClient
    import requests

    class MockResponse:
        status_code = 200
        def json(self):
            return {"ok": True, "detail": "mocked data"}
        def raise_for_status(self):
            pass

    def fake_get(*args, **kwargs):
        return MockResponse()

    monkeypatch.setattr(requests, "get", fake_get)
    
    client = OTXClient()
    data = client.fetch_sample()
    
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["source"] == "otx"
    assert "raw" in data[0]
