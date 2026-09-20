import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.errors import register_error_handlers
from app.api.v1.router import api_router
from app.db.base import Base
from app.db.session import engine
# Ensure all models are imported so Base.metadata knows about them
import app.models  # noqa: F401

# Configure basic logging
logging.basicConfig(
    level=logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sangati.main")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
UPLOAD_DIR = os.path.join(STATIC_DIR, "uploads")
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except Exception as e:
    logger.warning("Read-only filesystem detected on startup: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Sangati API in %s mode...", settings.ENVIRONMENT)
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema verified.")
    except Exception as e:
        logger.warning("Could not auto-create database tables on startup: %s", e)
    yield
    logger.info("Shutting down Sangati API...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Sangati Core Backend API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Mount static files directory safely if it exists on disk
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Register custom error response handlers
register_error_handlers(app)

# Register CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 API routes
app.include_router(api_router, prefix=settings.API_V1_STR)
