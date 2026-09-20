import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))


def _first_env(*names: str) -> str:
    """Return the first non-empty environment variable among ``names``."""
    for name in names:
        value = os.getenv(name)
        if value and value.strip():
            return value.strip()
    return ""


# Values that only ever appear in `.env.example`. A half-filled `.env` must not
# be mistaken for real configuration: a placeholder connection string would make
# SQLAlchemy try to resolve `aws-0-your-region.pooler.supabase.com` at import
# time and crash the server before it can serve a single request.
_PLACEHOLDER_MARKERS = (
    "your-project-ref",
    "your-region",
    "your-password",
    "your_api_key_here",
    "your_publishable_or_anon_key",
    "your_long_random_secret_here",
    "change-me",
    "changeme",
)


def _is_placeholder(value: str) -> bool:
    """True when ``value`` is still an example copied from `.env.example`."""
    lowered = value.lower()
    return any(marker in lowered for marker in _PLACEHOLDER_MARKERS)


def _first_real_env(*names: str) -> str:
    """Like :func:`_first_env`, but skips placeholder values."""
    value = _first_env(*names)
    return "" if _is_placeholder(value) else value


def _normalize_db_url(url: str) -> str:
    """SQLAlchemy needs an explicit driver name.

    Supabase hands out ``postgres://`` / ``postgresql://`` connection strings,
    but SQLAlchemy 2.x requires ``postgresql+psycopg://`` to select psycopg 3.
    """
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


class Settings:
    PROJECT_NAME: str = "Hindi YouTube Comment Sentiment Analysis"
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY")
    # Maximum number of comments to fetch per video
    MAX_COMMENTS: int = int(os.getenv("MAX_COMMENTS", 500))

    # --- Supabase (auth + Postgres) -----------------------------------------
    # Project URL, e.g. https://abcdefghijkl.supabase.co
    SUPABASE_URL: str = _first_real_env("SUPABASE_URL", "VITE_SUPABASE_URL")
    # Public key, safe to ship to the browser (the frontend uses it too).
    SUPABASE_ANON_KEY: str = _first_real_env("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY")
    # Server-only key. Only needed by the data-migration script.
    SUPABASE_SERVICE_ROLE_KEY: str = _first_real_env("SUPABASE_SERVICE_ROLE_KEY")

    # Legacy HS256 JWT secret (Supabase: Project Settings -> API -> JWT Settings).
    # When present, access tokens are verified locally with no network round-trip.
    SUPABASE_JWT_SECRET: str = _first_real_env("SUPABASE_JWT_SECRET")

    # "supabase" once a project is configured, otherwise the local dev fallback.
    AUTH_MODE: str = (
        _first_env("AUTH_MODE")
        or ("supabase" if _first_real_env("SUPABASE_URL", "VITE_SUPABASE_URL") else "local")
    ).lower()

    # Keep the local email/password endpoints available as an offline fallback.
    # Defaults to True only while running without Supabase.
    ALLOW_LOCAL_AUTH: bool = (
        _first_env("ALLOW_LOCAL_AUTH") or str(AUTH_MODE == "local")
    ).lower() in {"1", "true", "yes", "on"}

    # Extra browser origins allowed to call the API (comma separated).
    CORS_ORIGINS: str = _first_env("CORS_ORIGINS")

    # --- Local (offline fallback) auth --------------------------------------
    # Secret used to sign local JWTs. MUST be overridden via env in deployment.
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-insecure-secret-change-me")
    JWT_ALGORITHM: str = "HS256"
    # Token lifetime in minutes (default: 7 days)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))

    # --- Database -----------------------------------------------------------
    # DATABASE_URL wins; SUPABASE_DB_URL is accepted as an alias. Without either
    # (or when the value is still the `.env.example` placeholder) we fall back to
    # the local SQLite file so the app always boots.
    DATABASE_URL: str = _normalize_db_url(
        _first_real_env("DATABASE_URL", "SUPABASE_DB_URL")
        or f"sqlite:///{os.path.join(_BACKEND_DIR, 'app.db')}"
    )

    # Env vars that were set but ignored because they still hold a placeholder.
    # Surfaced on the health endpoint so a half-filled `.env` is obvious.
    IGNORED_PLACEHOLDERS: tuple = tuple(
        name
        for name in (
            "YOUTUBE_API_KEY",
            "VITE_SUPABASE_URL",
            "SUPABASE_URL",
            "VITE_SUPABASE_ANON_KEY",
            "SUPABASE_ANON_KEY",
            "SUPABASE_DB_URL",
            "DATABASE_URL",
        )
        if _is_placeholder(_first_env(name))
    )

    @property
    def using_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")

    @property
    def SUPABASE_JWKS_URL(self) -> str:
        """JWKS endpoint used to verify tokens signed with asymmetric keys."""
        if not self.SUPABASE_URL:
            return ""
        return f"{self.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"

    @property
    def cors_origins(self) -> list[str]:
        defaults = [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
        ]
        if not self.CORS_ORIGINS:
            return defaults
        extra = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        return [*defaults, *extra]


settings = Settings()