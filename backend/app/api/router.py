from fastapi import APIRouter

from app.api.v1 import auth, patients, practitioners, appointments, encounters

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(practitioners.router, prefix="/practitioners", tags=["practitioners"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(encounters.router, prefix="/encounters", tags=["encounters"])
