import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Sangati API in %s mode...", settings.ENVIRONMENT)
    # For dev convenience or SQLite testing, ensure tables exist
    try:
        Base.metadata.create_all(bind=engine)
        # For SQLite local development: ensure newly added columns exist
        if "sqlite" in str(engine.url):
            from sqlalchemy import inspect, text
            inspector = inspect(engine)
            if "profiles" in inspector.get_table_names():
                columns = [c["name"] for c in inspector.get_columns("profiles")]
                if "interests" not in columns:
                    with engine.begin() as conn:
                        conn.execute(text("ALTER TABLE profiles ADD COLUMN interests TEXT"))
                    logger.info("Auto-added missing column 'interests' to profiles table.")
        logger.info("Database schema verified.")
    except Exception as e:
        logger.warning("Could not auto-create database tables on startup (migrations may be required): %s", e)
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

# Register custom error response handlers
register_error_handlers(app)

# Register CORS middleware (outermost layer to guarantee CORS headers on all responses)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 API routes
app.include_router(api_router, prefix=settings.API_V1_STR)
