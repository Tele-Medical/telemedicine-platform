import uuid
import httpx
import logging
import asyncio
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod

from app.core.config import settings
from app.core.redis import redis_client

logger = logging.getLogger(__name__)

class ABDMProvider(ABC):
    """
    Interface for ABDM/ABHA operations.
    """
    @abstractmethod
    async def search_abha(self, abha_id: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def init_auth(self, abha_id: str, auth_method: str = "AADHAAR_OTP") -> Dict[str, Any]:
        pass

    @abstractmethod
    async def confirm_with_otp(self, txn_id: str, otp: str) -> Dict[str, Any]:
        pass

class RealABDMAdapter(ABDMProvider):
    """
    Real adapter for the National Health Authority (NHA) ABDM Sandbox.
    """
    def __init__(self):
        self.client_id = settings.abdm_client_id
        self.client_secret = settings.abdm_client_secret
        self.gateway_url = settings.abdm_gateway_url
        self.healthid_url = settings.abdm_healthid_url
        self.cm_id = "sbx"

    async def _get_gateway_token(self) -> Optional[str]:
        cache_key = "abdm:gateway:token"
        cached_token = await redis_client.get(cache_key)
        if cached_token:
            return cached_token

        if not self.client_id or not self.client_secret:
            logger.warning("ABDM credentials missing.")
            return None

        url = f"{self.gateway_url}/v1/sessions"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json={"clientId": self.client_id, "clientSecret": self.client_secret})
                response.raise_for_status()
                data = response.json()
                token = data.get("accessToken")
                await redis_client.set(cache_key, token, ex=3500)
                return token
            except Exception as e:
                logger.error(f"Failed to get ABDM token: {e}")
                return None

    async def _get_headers(self) -> Dict[str, str]:
        token = await self._get_gateway_token()
        return {
            "Content-Type": "application/json",
            "X-CM-ID": self.cm_id,
            "X-Request-ID": str(uuid.uuid4()),
            "Authorization": f"Bearer {token}" if token else ""
        }

    async def search_abha(self, abha_id: str) -> Dict[str, Any]:
        url = f"{self.healthid_url}/v1/auth/search"
        headers = await self._get_headers()
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json={"healthId": abha_id}, headers=headers)
                return response.json()
            except Exception as e:
                return {"error": str(e)}

    async def init_auth(self, abha_id: str, auth_method: str = "AADHAAR_OTP") -> Dict[str, Any]:
        url = f"{self.healthid_url}/v1/auth/init"
        headers = await self._get_headers()
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json={"authMethod": auth_method, "healthid": abha_id}, headers=headers)
                return response.json()
            except Exception as e:
                return {"error": str(e)}

    async def confirm_with_otp(self, txn_id: str, otp: str) -> Dict[str, Any]:
        url = f"{self.healthid_url}/v1/auth/confirmWithOtp"
        headers = await self._get_headers()
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json={"otp": otp, "txnId": txn_id}, headers=headers)
                return response.json()
            except Exception as e:
                return {"error": str(e)}

class MockABDMAdapter(ABDMProvider):
    """
    Mock adapter for local demos and development.
    Simulates successful ABDM flows without making any real API calls.
    """
    async def search_abha(self, abha_id: str) -> Dict[str, Any]:
        await asyncio.sleep(0.5)  # Simulate network latency
        return {
            "status": "success",
            "authMethods": ["AADHAAR_OTP", "MOBILE_OTP"],
            "healthId": abha_id,
            "message": "Mock: ABHA found"
        }

    async def init_auth(self, abha_id: str, auth_method: str = "AADHAAR_OTP") -> Dict[str, Any]:
        await asyncio.sleep(0.5)
        return {
            "txnId": str(uuid.uuid4()),
            "message": f"Mock: OTP sent via {auth_method}"
        }

    async def confirm_with_otp(self, txn_id: str, otp: str) -> Dict[str, Any]:
        await asyncio.sleep(0.5)
        if otp == "123456":
            return {
                "status": "success",
                "auth_token": f"mock_auth_token_{uuid.uuid4()}",
                "patient": {
                    "name": "Nabha Patient (Mock)",
                    "gender": "M",
                    "yearOfBirth": "1990",
                    "abhaNumber": "12-3456-7890-1234"
                }
            }
        return {"error": "Invalid Mock OTP. Use 123456."}

def get_abdm_adapter() -> ABDMProvider:
    if settings.abdm_provider.lower() == "real":
        return RealABDMAdapter()
    return MockABDMAdapter()

abdm_adapter = get_abdm_adapter()
