from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any

from app.api import deps
from app.models.auth import User
from app.integrations.abdm.adapter import abdm_adapter

router = APIRouter()

@router.post("/search")
async def search_abha(
    payload: Dict[str, str],
    current_user: User = Depends(deps.get_current_user)
) -> Dict[str, Any]:
    """
    Search for an ABHA ID (Number or Address) in the ABDM network.
    """
    abha_id = payload.get("abha_id")
    if not abha_id:
        raise HTTPException(status_code=400, detail="abha_id is required")
    
    result = await abdm_adapter.search_abha(abha_id)
    return result

@router.post("/init-auth")
async def init_abha_auth(
    payload: Dict[str, str],
    current_user: User = Depends(deps.get_current_user)
) -> Dict[str, Any]:
    """
    Initialize authentication for a verified ABHA ID.
    """
    abha_id = payload.get("abha_id")
    method = payload.get("method", "AADHAAR_OTP")
    
    if not abha_id:
        raise HTTPException(status_code=400, detail="abha_id is required")
        
    result = await abdm_adapter.init_auth(abha_id, method)
    return result

@router.post("/confirm-auth")
async def confirm_abha_auth(
    payload: Dict[str, str],
    current_user: User = Depends(deps.get_current_user)
) -> Dict[str, Any]:
    """
    Confirm ABHA authentication using the OTP.
    In a real scenario, this would then link the verified ABHA to the Patient model.
    """
    txn_id = payload.get("txn_id")
    otp = payload.get("otp")
    
    if not txn_id or not otp:
        raise HTTPException(status_code=400, detail="txn_id and otp are required")
        
    result = await abdm_adapter.confirm_with_otp(txn_id, otp)
    
    # Logic to update PatientIdentifier with the verified ABHA would go here
    
    return result
