"""Supabase Auth integration tests.

These cover the real production auth path: a Supabase-shaped access token is
verified against the project's signing keys (asymmetric ES256/RS256 via JWKS, or
the legacy HS256 shared secret) and the caller's profile is mirrored into our own
database. No network access is involved, and no local password endpoint is used.

Coverage:
* token verification (valid / tampered / expired / wrong audience)
* lazy `profiles` provisioning and re-use
* legacy-email conflict handling
* per-user isolation under Supabase identities
* Supabase's "generated" tokens (deleted user) degrading to guest
* the local fallback being switchable off
"""

import time

import jwt
import pytest

from backend import models
from backend.auth import create_access_token
from backend.config import settings
from backend.lib import supabase_token
from backend.lib.supabase_token import (
    is_generated_access_token,
    verify_supabase_token,
)

USER_A = "aaaaaaaa-1111-1111-1111-111111111111"
USER_B = "bbbbbbbb-2222-2222-2222-222222222222"


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Verification + provisioning
# ---------------------------------------------------------------------------
def test_supabase_token_authorises_and_provisions_profile(client, supabase_token):
    token = supabase_token(
        user_id=USER_A, email="Fresh.User@Example.com", full_name="Fresh User"
    )

    me = client.get("/api/auth/me", headers=bearer(token))
    assert me.status_code == 200, me.text
    body = me.json()
    assert body["id"] == USER_A
    assert body["email"] == "fresh.user@example.com"  # normalised
    assert body["full_name"] == "Fresh User"


def test_profile_is_provisioned_only_once(client, db_session_factory, supabase_token):
    token = supabase_token(user_id=USER_A, email="once@example.com")

    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 200
    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 200

    with db_session_factory() as db:
        rows = db.query(models.Profile).filter(models.Profile.id == USER_A).all()
        assert len(rows) == 1
        assert rows[0].email == "once@example.com"


@pytest.mark.parametrize(
    "token_kwargs, label",
    [
        ({"secret": "not-the-project-secret"}, "signed with the wrong secret"),
        ({"expires_in": -60}, "expired"),
        ({"audience": "anon"}, "wrong audience"),
    ],
)
def test_invalid_supabase_tokens_are_rejected(
    client, supabase_token, token_kwargs, label
):
    token = supabase_token(**token_kwargs)
    response = client.get("/api/analyses", headers=bearer(token))
    assert response.status_code == 401, f"{label} should not authenticate"


def test_malformed_token_is_rejected(client):
    assert client.get("/api/analyses", headers=bearer("not-a-jwt")).status_code == 401


def test_legacy_email_conflict_returns_actionable_409(
    client, db_session_factory, supabase_token
):
    """A pre-Supabase account owns the email; the caller gets a clear 409."""
    with db_session_factory() as db:
        db.add(
            models.Profile(
                id="legacy-sqlite-id",
                email="legacy@example.com",
                hashed_password="pbkdf2_sha256$1$aa$bb",
            )
        )
        db.commit()

    token = supabase_token(user_id=USER_A, email="legacy@example.com")
    response = client.get("/api/auth/me", headers=bearer(token))
    assert response.status_code == 409
    assert "migrate_sqlite_to_supabase" in response.json()["detail"]


def test_profile_metadata_refreshes_from_the_token(
    client, db_session_factory, supabase_token
):
    first = supabase_token(user_id=USER_A, email="name@example.com", full_name=None)
    assert client.get("/api/auth/me", headers=bearer(first)).status_code == 200

    # A later login carries the name (e.g. the user completed their Google profile).
    second = supabase_token(
        user_id=USER_A, email="name@example.com", full_name="Renamed Person"
    )
    assert client.get("/api/auth/me", headers=bearer(second)).status_code == 200

    with db_session_factory() as db:
        profile = db.query(models.Profile).filter(models.Profile.id == USER_A).one()
        assert profile.full_name == "Renamed Person"


# ---------------------------------------------------------------------------
# Data endpoints under Supabase identities
# ---------------------------------------------------------------------------
def test_analysis_is_stored_under_the_supabase_user(
    client, fake_youtube, supabase_token
):
    token = supabase_token(user_id=USER_A, email="owner@example.com")

    analyzed = client.post(
        "/api/analyze/youtube",
        json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
        headers=bearer(token),
    )
    assert analyzed.status_code == 200, analyzed.text

    listing = client.get("/api/analyses", headers=bearer(token))
    assert listing.status_code == 200
    items = listing.json()
    assert len(items) == 1
    assert items[0]["video_id"] == "dQw4w9WgXcQ"


def test_supabase_users_are_isolated_from_each_other(
    client, fake_youtube, supabase_token
):
    token_a = supabase_token(user_id=USER_A, email="a@example.com")
    token_b = supabase_token(user_id=USER_B, email="b@example.com")

    client.post(
        "/api/analyze/youtube",
        json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
        headers=bearer(token_a),
    )
    analysis_id = client.get("/api/analyses", headers=bearer(token_a)).json()[0]["id"]

    assert client.get("/api/analyses", headers=bearer(token_b)).json() == []
    assert (
        client.get(f"/api/analyses/{analysis_id}", headers=bearer(token_b)).status_code
        == 404
    )
    assert (
        client.delete(f"/api/analyses/{analysis_id}", headers=bearer(token_b)).status_code
        == 404
    )
    # Still owned by A.
    assert (
        client.get(f"/api/analyses/{analysis_id}", headers=bearer(token_a)).status_code
        == 200
    )


def test_generated_token_for_deleted_user_is_treated_as_guest(
    client, db_session_factory, fake_youtube, supabase_token
):
    """Supabase mints a `.../supabase/firebase` token for deleted accounts.

    It verifies cryptographically, so without the issuer check we would create a
    phantom profile. The request must still succeed, just as a guest.
    """
    stale = supabase_token(
        user_id="99999999-9999-9999-9999-999999999999",
        email="deleted@example.com",
        issuer="https://test.supabase.co/supabase/firebase",
    )

    analyzed = client.post(
        "/api/analyze/youtube",
        json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
        headers=bearer(stale),
    )
    assert analyzed.status_code == 200, analyzed.text

    with db_session_factory() as db:
        assert db.query(models.Profile).count() == 0

    real = supabase_token(user_id=USER_A, email="real@example.com")
    assert client.get("/api/analyses", headers=bearer(real)).json() == []


# ---------------------------------------------------------------------------
# Local fallback switch
# ---------------------------------------------------------------------------
def test_local_auth_can_be_disabled(client, db_session_factory, monkeypatch):
    monkeypatch.setattr(settings, "ALLOW_LOCAL_AUTH", False)

    signup = client.post(
        "/api/auth/signup", json={"email": "x@example.com", "password": "secret123"}
    )
    assert signup.status_code == 503
    assert "Supabase" in signup.json()["detail"]

    with db_session_factory() as db:
        db.add(models.Profile(id="local-user", email="local@example.com"))
        db.commit()
    local_token = create_access_token("local-user")
    assert client.get("/api/auth/me", headers=bearer(local_token)).status_code == 401


# ---------------------------------------------------------------------------
# Token helper unit tests
# ---------------------------------------------------------------------------
def test_verify_returns_none_when_no_verification_source_is_configured(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "")
    assert verify_supabase_token("anything") is None


def test_is_generated_access_token_detects_the_firebase_issuer():
    assert is_generated_access_token(
        {"iss": "https://abc.supabase.co/supabase/firebase"}
    )
    assert not is_generated_access_token({"iss": "https://abc.supabase.co/auth/v1"})


class _FakeSigningKey:
    """Stands in for PyJWT's ``PyJWK`` (only ``.key`` is read by the verifier)."""

    def __init__(self, key):
        self.key = key


class _FakeJwksClient:
    """A JWKS endpoint for a project that publishes one ES256 public key."""

    def __init__(self, public_key):
        self._public_key = public_key

    def fetch_data(self):
        return {"keys": [{"alg": "ES256"}]}

    def get_signing_key_from_jwt(self, token):  # noqa: ARG002 - signature match
        return _FakeSigningKey(self._public_key)


def test_asymmetric_project_ignores_a_stale_env_shared_secret(monkeypatch):
    """Regression: a leftover SUPABASE_JWT_SECRET must not become a signing key.

    Projects on the new asymmetric keys publish a JWKS endpoint. Anybody who can
    read a stale ``SUPABASE_JWT_SECRET`` from ``.env`` could otherwise mint an
    HS256 token for an arbitrary ``sub`` and be accepted as that user.
    """
    from cryptography.hazmat.primitives.asymmetric import ec

    # A configured project URL is what makes the JWKS endpoint reachable; the
    # client itself is faked below, so this stays offline.
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://test.supabase.co")
    private_key = ec.generate_private_key(ec.SECP256R1())
    monkeypatch.setattr(
        supabase_token, "_get_jwks_client", lambda url: _FakeJwksClient(private_key.public_key())
    )
    monkeypatch.setattr(supabase_token, "_uses_asymmetric_keys", lambda url: True)

    now = int(time.time())
    claims = {
        "sub": USER_A,
        "email": "a@example.com",
        "aud": "authenticated",
        "role": "authenticated",
        "iat": now,
        "exp": now + 3600,
    }

    # A token genuinely signed by the project's private key is accepted.
    genuine = jwt.encode(claims, private_key, algorithm="ES256")
    assert supabase_token.verify_supabase_token(genuine)["sub"] == USER_A

    # The same claims signed with the shared secret from `.env` are not.
    forged = jwt.encode(
        claims, settings.SUPABASE_JWT_SECRET or "stale-env-secret", algorithm="HS256"
    )
    assert supabase_token.verify_supabase_token(forged) is None


def test_legacy_symmetric_project_still_uses_the_shared_secret(monkeypatch):
    """Projects without a JWKS endpoint keep working via HS256."""
    monkeypatch.setattr(settings, "SUPABASE_URL", "")
    monkeypatch.setattr(supabase_token, "_uses_asymmetric_keys", lambda url: False)
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "legacy-secret")

    now = int(time.time())
    token = jwt.encode(
        {
            "sub": USER_B,
            "email": "b@example.com",
            "aud": "authenticated",
            "iat": now,
            "exp": now + 3600,
        },
        "legacy-secret",
        algorithm="HS256",
    )
    assert supabase_token.verify_supabase_token(token)["sub"] == USER_B
