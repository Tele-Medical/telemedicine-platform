"""
API router for ABDM (Ayushman Bharat Digital Mission) integration.
Handles ABHA (Ayushman Bharat Health Account) searching and authentication.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any

from app.api import deps
from app.models.auth import User
from app.integrations.abdm.adapter import abdm_adapter

router = APIRouter()

def _raise_if_error(result: Dict[str, Any]):
    """
    Helper to detect error keys in adapter responses and raise an HTTPException.
    Ensures the API returns appropriate status codes instead of generic 200 OK for failures.
    """
    if "error" in result:
        # Map adapter status codes to FastAPI status codes if available
        status_code = result.get("status_code", status.HTTP_502_BAD_GATEWAY)
        raise HTTPException(
            status_code=status_code,
            detail=result["error"]
        )

@router.post("/search")
async def search_abha(
    payload: Dict[str, str],
    current_user: User = Depends(deps.get_current_user)
) -> Dict[str, Any]:
    """
    Searches for an existing ABHA Number or ABHA Address (e.g. name@sbx) in the NHA network.
    Requires an active staff or patient session.
    """
    abha_id = payload.get("abha_id")
    if not abha_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="abha_id is required")
    
    result = await abdm_adapter.search_abha(abha_id)
    _raise_if_error(result)
    return result

@router.post("/init-auth")
async def init_abha_auth(
    payload: Dict[str, str],
    current_user: User = Depends(deps.get_current_user)
) -> Dict[str, Any]:
    """
    Initiates authentication for a verified ABHA ID.
    Triggers a 6-digit OTP to be sent to the patient's registered Aadhaar/Mobile.
    
    Supported methods: AADHAAR_OTP, MOBILE_OTP.
    """
    abha_id = payload.get("abha_id")
    method = payload.get("method", "AADHAAR_OTP")
    
    if method not in ["AADHAAR_OTP", "MOBILE_OTP"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Unsupported auth method. Use AADHAAR_OTP or MOBILE_OTP."
        )
    
    if not abha_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="abha_id is required")
        
    result = await abdm_adapter.init_auth(abha_id, method)
    _raise_if_error(result)
    return result

@router.post("/confirm-auth")
async def confirm_abha_auth(
    payload: Dict[str, str],
    current_user: User = Depends(deps.get_current_user)
) -> Dict[str, Any]:
    """
    Finalizes the ABHA identification by verifying the OTP received by the patient.
    Returns temporary authentication tokens and demographic data if successful.
    """
    txn_id = payload.get("txn_id")
    otp = payload.get("otp")
    
    if not txn_id or not otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="txn_id and otp are required"
        )
        
    result = await abdm_adapter.confirm_with_otp(txn_id, otp)
    _raise_if_error(result)
    
    return result
