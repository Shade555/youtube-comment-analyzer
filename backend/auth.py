import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .lib.supabase_token import is_generated_access_token, verify_supabase_token
from .models import Profile

# ---------------------------------------------------------------------------
# Password hashing (PBKDF2-HMAC-SHA256 via the Python standard library).
# No plain-text passwords are ever stored; each password gets a random salt.
# ---------------------------------------------------------------------------
_PBKDF2_ITERATIONS = 260_000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS
    )
    return f"pbkdf2_sha256${_PBKDF2_ITERATIONS}${salt.hex()}${derived.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt_hex, hash_hex = stored.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        derived = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(iterations),
        )
        return hmac.compare_digest(derived.hex(), hash_hex)
    except (ValueError, AttributeError):
        return False


# ---------------------------------------------------------------------------
# Local (offline fallback) JWT helpers
#
# These only matter when the app runs without a Supabase project configured, or
# when ALLOW_LOCAL_AUTH is explicitly enabled.
# ---------------------------------------------------------------------------
def create_access_token(user_id: str, expires_minutes: Optional[int] = None) -> str:
    if expires_minutes is None:
        expires_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    """Returns the user id encoded in a locally-issued token, or None."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


# ---------------------------------------------------------------------------
# Supabase access-token verification lives in `lib/supabase_token.py` so the
# data layer can reuse the same logic (imported above as verify_supabase_token).
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Profile provisioning
# ---------------------------------------------------------------------------
def _upsert_profile(
    db: Session,
    *,
    user_id: str,
    email: Optional[str],
    full_name: Optional[str] = None,
    avatar_url: Optional[str] = None,
) -> Profile:
    """Fetch the profile for ``user_id``, creating/refreshing it when needed.

    Supabase owns identity (and the password hash); this mirror row is what our
    own tables can point at with a foreign key. It is created lazily on the first
    authenticated request and kept in sync with the token's user metadata.
    """
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    normalised_email = (email or "").strip().lower()

    if profile is None:
        profile = Profile(
            id=user_id,
            # Supabase supplies an email for the flows we use; the fallback
            # keeps the NOT NULL constraint satisfiable for providers that
            # choose not to expose one.
            email=normalised_email or f"{user_id}@users.noreply.supabase.co",
            full_name=full_name,
            avatar_url=avatar_url,
        )
        db.add(profile)
        try:
            db.commit()
        except IntegrityError:
            # A legacy (pre-migration) profile already owns this email.
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail=(
                    "This email is already linked to a legacy profile. Run "
                    "`python -m backend.scripts.migrate_sqlite_to_supabase "
                    "--email <email>` to merge it."
                ),
            )
        db.refresh(profile)
        return profile

    # Keep the mirror in sync when the user changes name/avatar/email.
    changed = False
    if normalised_email and profile.email != normalised_email:
        profile.email = normalised_email
        changed = True
    if full_name and profile.full_name != full_name:
        profile.full_name = full_name
        changed = True
    if avatar_url and profile.avatar_url != avatar_url:
        profile.avatar_url = avatar_url
        changed = True
    if changed:
        db.commit()
        db.refresh(profile)
    return profile


# ---------------------------------------------------------------------------
# FastAPI dependencies: resolve the current user from the bearer token.
#
# The user id is ALWAYS derived from the verified token, never trusted from the
# request body, and every query is additionally scoped by that id.
# ---------------------------------------------------------------------------
_bearer_scheme = HTTPBearer(auto_error=False)


def _resolve_profile(db: Session, token: str) -> Optional[Profile]:
    """Verify ``token`` (Supabase first, local fallback) and return its profile."""
    if settings.SUPABASE_URL or settings.AUTH_MODE == "supabase":
        claims = verify_supabase_token(token)
        if claims:
            # Supabase mints a `.../supabase/firebase` token when the session or
            # user behind a still-valid token has been deleted. It verifies, but
            # its subject is not a real account - never mirror it into profiles.
            if is_generated_access_token(claims):
                return None

            user_id = claims.get("sub")
            if user_id:
                metadata = claims.get("user_metadata") or {}
                return _upsert_profile(
                    db,
                    user_id=str(user_id),
                    email=claims.get("email"),
                    full_name=metadata.get("full_name") or metadata.get("name"),
                    avatar_url=metadata.get("avatar_url") or metadata.get("picture"),
                )

    if settings.ALLOW_LOCAL_AUTH:
        user_id = decode_access_token(token)
        if user_id:
            return db.query(Profile).filter(Profile.id == user_id).first()
    return None


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> Profile:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or not credentials.credentials:
        raise unauthorized

    profile = _resolve_profile(db, credentials.credentials)
    if profile is None:
        raise unauthorized
    return profile


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[Profile]:
    """Like get_current_user but returns None instead of raising.

    Used by endpoints (e.g. analysis) that work for guests but should persist
    data when an authenticated user is present.
    """
    if credentials is None or not credentials.credentials:
        return None
    return _resolve_profile(db, credentials.credentials)
