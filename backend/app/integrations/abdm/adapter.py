import uuid
import httpx
import logging
import asyncio
from typing import Dict, Any
from abc import ABC, abstractmethod

from app.core.config import settings
from app.core.redis import redis_client

logger = logging.getLogger(__name__)


class ABDMError(Exception):
    """Base exception for ABDM-related errors."""

    pass


class GatewayAuthError(ABDMError):
    """Raised when authentication with the ABDM Gateway fails."""

    pass


class ABDMProvider(ABC):
    """
    Interface for ABDM/ABHA operations.
    Defines the contract for both real and mock adapters.
    """

    @abstractmethod
    async def search_abha(self, abha_id: str) -> Dict[str, Any]:
        """Searches for an ABHA ID in the NHA ecosystem."""
        pass

    @abstractmethod
    async def init_auth(self, abha_id: str, auth_method: str = "AADHAAR_OTP") -> Dict[str, Any]:
        """Initializes authentication for an ABHA holder."""
        pass

    @abstractmethod
    async def confirm_with_otp(self, txn_id: str, otp: str) -> Dict[str, Any]:
        """Confirms authentication with a 6-digit OTP."""
        pass


class RealABDMAdapter(ABDMProvider):
    """
    Real adapter for the National Health Authority (NHA) ABDM Sandbox.
    Handles networking, authentication, and error detection for production use.
    """

    def __init__(self):
        self.client_id = settings.abdm_client_id
        self.client_secret = settings.abdm_client_secret
        self.gateway_url = settings.abdm_gateway_url
        self.healthid_url = settings.abdm_healthid_url
        self.cm_id = "sbx"
        self.timeout = 10.0  # Seconds

    async def _get_gateway_token(self) -> str:
        """
        Retrieves and caches the ABDM Gateway session token.
        Raises GatewayAuthError if retrieval fails.
        """
        cache_key = "abdm:gateway:token"
        cached_token = await redis_client.get(cache_key)
        if cached_token:
            return cached_token

        if not self.client_id or not self.client_secret:
            raise GatewayAuthError("ABDM credentials missing in settings")

        url = f"{self.gateway_url}/v1/sessions"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    url, json={"clientId": self.client_id, "clientSecret": self.client_secret}
                )
                response.raise_for_status()
                data = response.json()
                token = data.get("accessToken")
                if not token:
                    raise GatewayAuthError("Gateway returned success but no accessToken")

                await redis_client.set(cache_key, token, ex=3500)
                return token
            except Exception as e:
                logger.error(f"Failed to get ABDM Gateway token: {e}")
                raise GatewayAuthError(f"ABDM Gateway connection failed: {str(e)}")

    async def _get_headers(self) -> Dict[str, str]:
        """Constructs mandatory ABDM headers with a valid session token."""
        token = await self._get_gateway_token()
        return {
            "Content-Type": "application/json",
            "X-CM-ID": self.cm_id,
            "X-Request-ID": str(uuid.uuid4()),
            "Authorization": f"Bearer {token}",
        }

    async def search_abha(self, abha_id: str) -> Dict[str, Any]:
        """Searches for an ABHA ID via the NHA HealthID API."""
        url = f"{self.healthid_url}/v1/auth/search"
        headers = await self._get_headers()
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json={"healthId": abha_id}, headers=headers)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.warning(f"ABHA Search HTTP Error: {e.response.text}")
                return {
                    "error": "ABHA not found or API error",
                    "status_code": e.response.status_code,
                }
            except Exception as e:
                logger.error(f"ABDM Search ABHA failed: {e}")
                return {"error": str(e)}

    async def init_auth(self, abha_id: str, auth_method: str = "AADHAAR_OTP") -> Dict[str, Any]:
        """Triggers an OTP for the specified ABHA holder."""
        url = f"{self.healthid_url}/v1/auth/init"
        headers = await self._get_headers()
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    url, json={"authMethod": auth_method, "healthid": abha_id}, headers=headers
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                return {"error": e.response.text, "status_code": e.response.status_code}
            except Exception as e:
                return {"error": str(e)}

    async def confirm_with_otp(self, txn_id: str, otp: str) -> Dict[str, Any]:
        """Finalizes identification by verifying the patient's OTP."""
        url = f"{self.healthid_url}/v1/auth/confirmWithOtp"
        headers = await self._get_headers()
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    url, json={"otp": otp, "txnId": txn_id}, headers=headers
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                return {"error": e.response.text, "status_code": e.response.status_code}
            except Exception as e:
                return {"error": str(e)}


class MockABDMAdapter(ABDMProvider):
    """
    Mock adapter for local development and CI.
    Allows testing the M1 flow without relying on the NHA Sandbox availability.
    """

    async def search_abha(self, abha_id: str) -> Dict[str, Any]:
        """Simulates an ABHA search response."""
        await asyncio.sleep(0.1)
        return {
            "status": "success",
            "authMethods": ["AADHAAR_OTP", "MOBILE_OTP"],
            "healthId": abha_id,
        }

    async def init_auth(self, abha_id: str, auth_method: str = "AADHAAR_OTP") -> Dict[str, Any]:
        """Simulates an OTP trigger."""
        await asyncio.sleep(0.1)
        return {"txnId": str(uuid.uuid4())}

    async def confirm_with_otp(self, txn_id: str, otp: str) -> Dict[str, Any]:
        """Simulates OTP verification with a fixed code '123456'."""
        await asyncio.sleep(0.1)
        if otp == "123456":
            return {
                "status": "success",
                "auth_token": f"mock_token_{uuid.uuid4()}",
                "patient": {
                    "name": "Mock Nabha Patient",
                    "gender": "M",
                    "yearOfBirth": "1990",
                    "abhaNumber": "12-3456-7890-1234",
                },
            }
        return {"error": "Invalid Mock OTP. Use 123456.", "status_code": 401}


def get_abdm_adapter() -> ABDMProvider:
    """Returns the configured ABDM provider based on environment settings."""
    if settings.abdm_provider.lower() == "real":
        return RealABDMAdapter()
    return MockABDMAdapter()


abdm_adapter = get_abdm_adapter()
