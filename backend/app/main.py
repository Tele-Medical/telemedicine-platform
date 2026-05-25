import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings

# Configure logging to output INFO level and above to stdout
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run database migrations and seeding on startup in production
    if settings.app_env == "production":
        try:
            print("Production environment detected. Running database migrations...")
            from alembic.config import Config
            from alembic import command

            alembic_cfg = Config("alembic.ini")
            command.upgrade(alembic_cfg, "head")
            print("Database migrations applied successfully!")
        except Exception as e:
            print(f"Failed to run database migrations: {e}")

        try:
            print("Checking and running database seeding...")
            from seed import seed_db

            seed_db()
            print("Database seeding checked/applied successfully!")
        except Exception as e:
            print(f"Failed to run database seeding: {e}")
    yield


app = FastAPI(title="Sanjeevani API", version="0.1.0", lifespan=lifespan)

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
