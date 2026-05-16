import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class ABDMServiceUnavailable(Exception):
    """Exception raised when the NHA ABDM Gateway is unreachable."""
    pass

class ABDMSandboxClient:
    """
    Client for interacting with the NHA ABDM Sandbox Gateway.
    """
    
    def __init__(self):
        self.client_id = settings.abdm_client_id
        self.client_secret = settings.abdm_client_secret
        self.gateway_url = "https://dev.abdm.gov.in/gateway" # Sandbox URL
        self.auth_url = f"{self.gateway_url}/v0.5/sessions"
        
    def get_access_token(self) -> str:
        """
        Authenticates with the NHA gateway to retrieve an access token.
        """
        if not self.client_id or not self.client_secret:
            logger.warning("ABDM credentials missing. Mocking NHA integration.")
            return "mock_token"
            
        payload = {
            "clientId": self.client_id,
            "clientSecret": self.client_secret
        }
        
        try:
            # We use a short timeout as this is a synchronous backend flow and 
            # we don't want to freeze the app if NHA is down.
            response = httpx.post(self.auth_url, json=payload, timeout=5.0)
            response.raise_for_status()
            data = response.json()
            return data.get("accessToken", "")
        except httpx.TimeoutException as e:
            logger.error(f"ABDM Gateway Timeout: {e}")
            raise ABDMServiceUnavailable("ABDM Service Unavailable: Gateway Timeout") from e
        except Exception as e:
            logger.error(f"ABDM Gateway Authentication Failed: {e}")
            raise ABDMServiceUnavailable(f"ABDM Service Unavailable: {e}") from e

    def request_abha_otp(self, phone: str) -> str:
        """
        Requests an OTP for ABHA creation/linking via mobile number.
        Returns the transaction ID needed to verify the OTP.
        """
        token = self.get_access_token()
        
        headers = {
            "Authorization": f"Bearer {token}",
            "X-CM-ID": "sbx" # Sandbox specific
        }
        
        payload = {
            "mobile": phone
        }
        
        url = f"{self.gateway_url}/v0.5/users/auth/fetch-modes"
        
        try:
            response = httpx.post(url, json=payload, headers=headers, timeout=5.0)
            response.raise_for_status()
            data = response.json()
            return data.get("txnId", "")
        except httpx.TimeoutException as e:
            logger.error(f"ABDM Request OTP Timeout: {e}")
            raise ABDMServiceUnavailable("ABDM Service Unavailable: OTP Gateway Timeout") from e
        except Exception as e:
            logger.error(f"ABDM OTP Request Failed: {e}")
            raise ABDMServiceUnavailable(f"ABDM Service Unavailable: {e}") from e
