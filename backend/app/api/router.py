from fastapi import APIRouter
from app.api.v1 import (
    auth,
    patients,
    practitioners,
    appointments,
    encounters,
    clinical,
    care_loops,
    sync,
    pharmacy,
    consent,
    telemetry,
    abdm,
)

api_router = APIRouter(prefix="/api/v1")


@api_router.get("/health", tags=["health"])
@api_router.head("/health", tags=["health"])
def health_check():
    return {"status": "ok"}


api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(practitioners.router, prefix="/practitioners", tags=["practitioners"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(appointments.router, prefix="/doctor", tags=["doctor"])
api_router.include_router(encounters.router, prefix="/encounters", tags=["encounters"])
api_router.include_router(clinical.router, prefix="/clinical", tags=["clinical"])
api_router.include_router(care_loops.router, prefix="/care-loops", tags=["care-loops"])
api_router.include_router(sync.router, tags=["sync"])
api_router.include_router(pharmacy.router, tags=["pharmacy"])
api_router.include_router(consent.router, prefix="/patients", tags=["consent"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["telemetry"])
api_router.include_router(abdm.router, prefix="/abdm", tags=["abdm"])
