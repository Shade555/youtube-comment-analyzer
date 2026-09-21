"""Supabase access-token verification.

Kept out of ``auth.py`` so both the FastAPI dependencies and the API routes can
use it without an import cycle.

Two signing schemes exist depending on when the project was created:
  * legacy symmetric keys -> HS256 with the project's JWT secret
  * new asymmetric keys   -> ES256/RS256 verified against the project's JWKS
Both are supported. Which one is *used* is decided by what the project
actually publishes, never by whatever happens to be in `.env`: a stale or
placeholder `SUPABASE_JWT_SECRET` must not become a way to mint tokens.
"""

from typing import Any, Dict, Optional
import ssl

import jwt

from ..config import settings

_jwks_clients: Dict[str, jwt.PyJWKClient] = {}
_asymmetric_projects: Dict[str, bool] = {}


def _ssl_context() -> Optional[ssl.SSLContext]:
    """CA bundle used for JWKS fetches.

    python.org builds on macOS ship without a usable system trust store, so the
    plain URL fetch fails with "certificate verify failed: unable to get local
    issuer certificate". Preferring certifi's bundle (already present as a
    transitive dependency) keeps JWKS verification working there; if certifi is
    missing we simply fall back to the interpreter default.
    """
    try:
        import certifi
    except ImportError:
        return None
    return ssl.create_default_context(cafile=certifi.where())


def _get_jwks_client(jwks_url: str) -> jwt.PyJWKClient:
    """Cache one JWKS client per project (the client caches the signing keys)."""
    client = _jwks_clients.get(jwks_url)
    if client is None:
        client = jwt.PyJWKClient(
            jwks_url,
            cache_keys=True,
            lifespan=600,
            ssl_context=_ssl_context(),
        )
        _jwks_clients[jwks_url] = client
    return client


def _uses_asymmetric_keys(jwks_url: str) -> bool:
    """True when the project publishes its own signing keys (ES256/RS256).

    A positive answer is cached for the process; a failed lookup is not, so a
    temporary network problem cannot permanently change how tokens are trusted.
    """
    cached = _asymmetric_projects.get(jwks_url)
    if cached is not None:
        return cached
    try:
        keys = _get_jwks_client(jwks_url).fetch_data().get("keys") or []
    except Exception as exc:  # noqa: BLE001 - network/JSON errors -> not asymmetric
        print(f"Supabase JWKS lookup failed ({jwks_url}): {exc}")
        return False
    _asymmetric_projects[jwks_url] = bool(keys)
    return bool(keys)


def verify_supabase_token(token: str) -> Optional[Dict[str, Any]]:
    """Return verified claims from a Supabase access token, or None if untrusted."""
    jwks_url = settings.SUPABASE_JWKS_URL

    # 1) Asymmetric projects: verify against the published public keys only.
    #    Such tokens cannot be forged without Supabase's private key, so the
    #    shared-secret path below is deliberately skipped - otherwise a stale
    #    SUPABASE_JWT_SECRET in `.env` would let anyone who can read it mint a
    #    token for any user id.
    if jwks_url and _uses_asymmetric_keys(jwks_url):
        client = _get_jwks_client(jwks_url)
        try:
            signing_key = client.get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
            )
        except jwt.PyJWTError as exc:
            print(f"Supabase token verification failed: {exc}")
            return None
        except Exception as exc:  # noqa: BLE001 - unknown kid, network, etc.
            print(f"Supabase token verification failed: {exc}")
            return None

    # 2) Legacy symmetric projects (HS256, shared secret).
    if settings.SUPABASE_JWT_SECRET:
        try:
            return jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except jwt.PyJWTError as exc:
            print(f"Supabase token verification failed: {exc}")
    return None


def is_generated_access_token(claims: Dict[str, Any]) -> bool:
    """Detect Supabase's *generated* tokens for end users that no longer exist.

    When a session/user has been deleted but a stale token is still presented,
    Supabase can mint a short-lived token whose issuer is ``<project>/supabase/firebase``
    and whose subject is not a real user id. It verifies cryptographically, so the
    only way to tell is the issuer. Treating it as "not a real user" lets the API
    degrade to guest behaviour instead of leaking a confusing error.
    """
    return "firebase" in str(claims.get("iss", "")).lower()