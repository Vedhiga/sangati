from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from app.core.config import settings

import logging
from urllib.parse import urlparse, urlunparse

logger = logging.getLogger("sangati.db")

db_url = settings.DATABASE_URL
# SQLAlchemy 2.0 requires postgresql:// instead of postgres://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Ensure Supabase pooler connections use Transaction Pooler port (6543) instead of Session Pooler port (5432)
if "supabase" in db_url and ":5432" in db_url:
    db_url = db_url.replace(":5432", ":6543", 1)

# Log connection target host and port (sanitized, no password)
try:
    parsed_url = urlparse(db_url)
    sanitized_netloc = f"{parsed_url.username or ''}:***@{parsed_url.hostname or ''}:{parsed_url.port or ''}"
    sanitized_url = urlunparse((parsed_url.scheme, sanitized_netloc, parsed_url.path, parsed_url.params, parsed_url.query, parsed_url.fragment))
    logger.info("Database initialized with target host: %s, port: %s (Sanitized URL: %s)", parsed_url.hostname, parsed_url.port, sanitized_url)
    print(f"[Database Connection Target] Host: {parsed_url.hostname}, Port: {parsed_url.port}")
except Exception as log_err:
    logger.warning("Could not parse DB URL for logging: %s", log_err)

engine_kwargs = {
    "pool_pre_ping": True,
}

if "sqlite" in db_url:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Use NullPool for PostgreSQL in serverless environments (Vercel)
    # to avoid holding persistent connections and exhausting Supabase Pooler
    engine_kwargs["poolclass"] = NullPool

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a SQLAlchemy session per request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
