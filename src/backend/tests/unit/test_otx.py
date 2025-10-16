import pytest
from unittest.mock import MagicMock

def test_otx_client_mock_success(monkeypatch):
    """
    Tests the successful fetching and normalization of data from the OTX client
    using a mocked API response.
    """
    # Import the client inside the test to allow mocking its dependencies
    from src.backend.services.osint.otx_client import OTXClient

    # Create a mock response object
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "indicator": "8.8.8.8",
        "pulse_info": {"count": 25}
    }
    
    # Mock the requests.get call
    mock_get = MagicMock(return_value=mock_response)
    monkeypatch.setattr("requests.get", mock_get)

    client = OTXClient()
    data = client.fetch_sample()

    # Assertions
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["source"] == "otx"
    assert data[0]["indicator"] == "8.8.8.8"
    assert data[0]["severity"] == 2
    mock_get.assert_called_once()

def test_otx_client_mock_rate_limit(monkeypatch):
    """
    Tests the OTX client's rate limit handling with exponential backoff.
    """
    from src.backend.services.osint.otx_client import OTXClient

    # Mock responses: first a 429, then a 200
    rate_limit_response = MagicMock()
    rate_limit_response.status_code = 429
    
    success_response = MagicMock()
    success_response.status_code = 200
    success_response.json.return_value = {"ok": True}

    mock_get = MagicMock(side_effect=[rate_limit_response, success_response])
    mock_sleep = MagicMock()

    monkeypatch.setattr("requests.get", mock_get)
    monkeypatch.setattr("time.sleep", mock_sleep)

    client = OTXClient()
    client.fetch_sample()

    # Assertions
    assert mock_get.call_count == 2
    mock_sleep.assert_called_once()
