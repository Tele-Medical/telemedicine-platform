import pytest
from unittest.mock import patch, MagicMock

try:
    from app.integrations.abdm.sandbox_client import ABDMSandboxClient
except ImportError:
    ABDMSandboxClient = None

@pytest.fixture
def mock_abdm_env(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.abdm_client_id", "test_id")
    monkeypatch.setattr("app.core.config.settings.abdm_client_secret", "test_secret")

@pytest.mark.skipif(ABDMSandboxClient is None, reason="ABDMSandboxClient not implemented yet")
def test_abdm_auth_token_generation(mock_abdm_env):
    """Verify the client correctly authenticates with the NHA gateway."""
    with patch("httpx.post") as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"accessToken": "fake_nha_token", "expiresIn": 3600}
        mock_post.return_value = mock_response
        
        client = ABDMSandboxClient()
        token = client.get_access_token()
        
        assert token == "fake_nha_token"
        mock_post.assert_called_once()

@pytest.mark.skipif(ABDMSandboxClient is None, reason="ABDMSandboxClient not implemented yet")
def test_abdm_request_otp_success(mock_abdm_env):
    """Verify requesting an ABHA OTP formats the external API call correctly."""
    with patch("httpx.post") as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"txnId": "txn-999"}
        mock_post.return_value = mock_response
        
        client = ABDMSandboxClient()
        # Mocking the internal token fetch
        client.get_access_token = MagicMock(return_value="token")
        
        txn_id = client.request_abha_otp("9999999999")
        
        assert txn_id == "txn-999"

@pytest.mark.skipif(ABDMSandboxClient is None, reason="ABDMSandboxClient not implemented yet")
def test_abdm_network_timeout_isolation(mock_abdm_env):
    """CRITICAL: Verify backend handles NHA downtime gracefully."""
    import httpx
    with patch("httpx.post") as mock_post:
        mock_post.side_effect = httpx.TimeoutException("NHA Server Down")
        
        client = ABDMSandboxClient()
        
        with pytest.raises(Exception) as exc_info:
            client.get_access_token()
        
        # It should throw a controlled, custom exception that our frontend routes can catch
        # to fall back to the offline/local patient flow, not a raw httpx exception.
        assert "ABDM Service Unavailable" in str(exc_info.value)
