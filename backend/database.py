from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import settings

_engine_kwargs: dict = {}

if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite needs check_same_thread disabled so FastAPI's threadpool can share it.
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Supabase Postgres: survive dropped connections (pooler idle timeouts).
    _engine_kwargs["pool_pre_ping"] = True
    _engine_kwargs["pool_recycle"] = 300
    # Supavisor's transaction pooler (port 6543) cannot keep server-side prepared
    # statements alive between transactions, so disable them.
    if (
        settings.DATABASE_URL.startswith("postgresql+psycopg")
        and ":6543" in settings.DATABASE_URL
    ):
        _engine_kwargs["connect_args"] = {"prepare_threshold": None}

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()