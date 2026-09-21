"""Shared pytest fixtures for the backend end-to-end HTTP tests.

The suite drives the real FastAPI application in-process through
``fastapi.testclient.TestClient`` (an HTTP client speaking to the ASGI app),
while swapping the application database for a throwaway in-memory SQLite
database so tests never touch ``backend/app.db``.

The YouTube Data API and the scikit-learn inference are stubbed so the tests
are hermetic: what is under test is the HTTP contract (routing, auth
dependencies, Pydantic validation, SQLAlchemy queries, ownership filtering and
response serialisation), not the ML models or Google's API.
"""

import os
import sys
import time

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Make the project root importable so ``import backend.main`` works no matter
# which directory pytest was invoked from.
PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# --- Test environment ------------------------------------------------------
# Must be configured BEFORE importing the backend, because `backend.config`
# reads the environment at import time.
#   * SUPABASE_JWT_SECRET lets us mint and verify HS256 tokens locally with no
#     network round-trip (the JWKS path is only used when no secret is set).
#   * SUPABASE_URL is deliberately left unset so the suite never calls out.
#   * ALLOW_LOCAL_AUTH keeps the offline fallback endpoints covered as well.
TEST_SUPABASE_JWT_SECRET = "test-supabase-jwt-secret"
TEST_SUPABASE_ISSUER = "https://test.supabase.co/auth/v1"

os.environ.pop("SUPABASE_URL", None)
os.environ.pop("VITE_SUPABASE_URL", None)
# Set to empty rather than deleted so `load_dotenv()` (which does not override
# existing keys) cannot re-add the developer's real project URL afterwards.
os.environ["SUPABASE_URL"] = ""
os.environ["VITE_SUPABASE_URL"] = ""
# The developer's `.env` may point at Supabase Postgres (or, worse, still hold the
# example placeholder). Pin the tests to in-memory SQLite so the suite never
# opens a network connection: `backend.database` builds its engine at import time
# and `backend.main` runs `create_all` against it.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ.pop("SUPABASE_DB_URL", None)
os.environ.update(
    {
        "AUTH_MODE": "supabase",
        "SUPABASE_JWT_SECRET": TEST_SUPABASE_JWT_SECRET,
        "ALLOW_LOCAL_AUTH": "true",
        "SECRET_KEY": "test-local-secret",
    }
)

from backend import main as main_module  # noqa: E402
from backend.config import settings as backend_settings  # noqa: E402
from backend.database import Base, get_db  # noqa: E402

# Belt and braces: whatever `.env` contained, the suite runs offline. Without a
# Supabase URL there is no JWKS endpoint to fetch, so the HS256 tokens minted by
# `make_supabase_token` are verified locally and no request leaves the machine.
backend_settings.SUPABASE_URL = ""


def make_supabase_token(
    user_id: str = "11111111-1111-1111-1111-111111111111",
    email: str = "supabase-user@example.com",
    *,
    full_name: str | None = "Supabase User",
    audience: str = "authenticated",
    issuer: str = TEST_SUPABASE_ISSUER,
    secret: str = TEST_SUPABASE_JWT_SECRET,
    expires_in: int = 3600,
) -> str:
    """Mint a Supabase-shaped access token (HS256, same claims GoTrue sends)."""
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "aud": audience,
        "iss": issuer,
        "iat": now,
        "exp": now + expires_in,
        "role": "authenticated",
        "user_metadata": {"full_name": full_name} if full_name else {},
    }
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture()
def db_engine():
    """A fresh in-memory SQLite database per test.

    ``StaticPool`` keeps every connection on the same in-memory database so the
    test client and the direct-inspection session see identical data.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    try:
        yield engine
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def db_session_factory(db_engine):
    """Session factory bound to the throwaway database."""
    return sessionmaker(autocommit=False, autoflush=False, bind=db_engine)


@pytest.fixture()
def client(db_session_factory):
    """TestClient with the app's ``get_db`` dependency overridden."""

    def override_get_db():
        db = db_session_factory()
        try:
            yield db
        finally:
            db.close()

    main_module.app.dependency_overrides[get_db] = override_get_db
    with TestClient(main_module.app) as test_client:
        yield test_client
    main_module.app.dependency_overrides.clear()


@pytest.fixture()
def supabase_token():
    """Factory for minting Supabase-shaped access tokens."""
    return make_supabase_token


@pytest.fixture()
def fake_youtube(monkeypatch):
    """Deterministic stand-ins for the YouTube API and the ML pipeline."""
    raw_comments = [
        {"text": "great video", "author": "a", "likeCount": 1, "publishedAt": ""},
        {"text": "बहुत अच्छा", "author": "b", "likeCount": 2, "publishedAt": ""},
    ]

    def fake_fetch(video_id, max_comments=None):
        return {
            "video_id": video_id,
            "title": "Fake Video",
            "thumbnail": "http://example.com/thumb.jpg",
            "comments": raw_comments,
        }

    def fake_predict(text):
        is_hindi = any("\u0900" <= ch <= "\u097f" for ch in text)
        return {
            "text": text,
            "processed_text": text.lower(),
            "emotion_model": "Pure Hindi" if is_hindi else "Hinglish",
            "emotions": ["happiness"],
            "sarcasm_label": 0,
            "sarcasm_probability": 0.1,
        }

    monkeypatch.setattr(main_module, "fetch_youtube_comments", fake_fetch)
    monkeypatch.setattr(main_module, "unified_predict", fake_predict)
