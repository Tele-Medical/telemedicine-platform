from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings

app = FastAPI(title="Telemedicine API", version="0.1.0")

# Set up CORS for the frontend
# Security Hardening: Never use allow_origins=["*"] with allow_credentials=True
origins = [o.strip() for o in settings.cors_origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/health/live")
async def live():
    return {"status": "ok"}