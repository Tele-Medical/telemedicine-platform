from fastapi import FastAPI
from app.api.router import api_router

app = FastAPI(title="Telemedicine API", version="0.1.0")
app.include_router(api_router)

@app.get("/health/live")
async def live():
    return {"status": "ok"}