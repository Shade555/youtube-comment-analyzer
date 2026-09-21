"""End-to-end HTTP tests for the FastAPI backend (Phase 8).

Coverage:
* auth       -- signup / login / me / logout plus their failure modes
* isolation  -- a user can never read or mutate another user's data
* history    -- analysis persistence, listing, retrieval and deletion

Every request travels through the real ASGI application via ``TestClient``, so
these tests exercise routing, auth dependencies, validation, database queries,
ownership filtering and response serialisation end to end.
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def signup(client, email, password="secret123"):
    """Register a user and return the token payload (``access_token`` + user)."""
    response = client.post(
        "/api/auth/signup", json={"email": email, "password": password}
    )
    assert response.status_code == 200, response.text
    return response.json()


def auth(token_response):
    """Build an ``Authorization`` header from a signup/login response."""
    return {"Authorization": f"Bearer {token_response['access_token']}"}


def analyze(client, headers, video_id="dQw4w9WgXcQ"):
    """Run an analysis request and return the parsed JSON body."""
    response = client.post(
        "/api/analyze/youtube",
        json={"url": f"https://www.youtube.com/watch?v={video_id}"},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    return response.json()


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
def test_health_check(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_signup_returns_bearer_token_and_normalised_email(client):
    response = client.post(
        "/api/auth/signup",
        json={"email": "Alice@Example.com", "password": "secret123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["id"]
    assert body["user"]["email"] == "alice@example.com"


def test_signup_rejects_duplicate_email(client):
    signup(client, "dupe@example.com")
    response = client.post(
        "/api/auth/signup",
        json={"email": "DUPE@example.com", "password": "secret123"},
    )
    assert response.status_code == 409


def test_signup_rejects_invalid_email(client):
    response = client.post(
        "/api/auth/signup", json={"email": "not-an-email", "password": "secret123"}
    )
    assert response.status_code == 400


def test_signup_rejects_short_password(client):
    response = client.post(
        "/api/auth/signup", json={"email": "short@example.com", "password": "123"}
    )
    assert response.status_code == 422


def test_login_accepts_valid_and_rejects_invalid_credentials(client):
    signup(client, "login@example.com", password="secret123")

    ok = client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "secret123"},
    )
    assert ok.status_code == 200
    assert ok.json()["user"]["email"] == "login@example.com"

    wrong_password = client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "wrong-password"},
    )
    assert wrong_password.status_code == 401

    unknown_user = client.post(
        "/api/auth/login",
        json={"email": "ghost@example.com", "password": "secret123"},
    )
    assert unknown_user.status_code == 401



# ---------------------------------------------------------------------------
# Analysis -> history
# ---------------------------------------------------------------------------
def test_analyze_rejects_invalid_youtube_url(client, fake_youtube):
    response = client.post(
        "/api/analyze/youtube",
        json={"url": "not-a-youtube-url"},
        headers=auth(signup(client, "bad-url@example.com")),
    )
    assert response.status_code == 400


def test_authenticated_analysis_is_persisted_and_retrievable(client, fake_youtube):
    headers = auth(signup(client, "history@example.com"))

    result = analyze(client, headers)
    assert result["video_id"] == "dQw4w9WgXcQ"
    assert result["total_comments"] == 2
    assert result["analyzed_comments"] == 2
    assert result["video_title"] == "Fake Video"
    assert result["emotion_distribution"] == {"happiness": 2}
    assert result["model_usage"] == {"Pure Hindi": 1, "Hinglish": 1}
    assert result["sarcasm_rate"] == 0.0
    assert len(result["comments"]) == 2

    listing = client.get("/api/analyses", headers=headers)
    assert listing.status_code == 200
    items = listing.json()
    assert len(items) == 1
    assert items[0]["video_id"] == "dQw4w9WgXcQ"
    # The summary payload deliberately omits the full comment list.
    assert "comments" not in items[0]

    analysis_id = items[0]["id"]
    detail = client.get(f"/api/analyses/{analysis_id}", headers=headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["id"] == analysis_id
    assert body["video_title"] == "Fake Video"
    assert len(body["comments"]) == 2
    assert body["comments"][0]["emotions"] == ["happiness"]

    assert client.delete(f"/api/analyses/{analysis_id}", headers=headers).status_code == 200
    assert client.get("/api/analyses", headers=headers).json() == []
    assert client.get(f"/api/analyses/{analysis_id}", headers=headers).status_code == 404


def test_guest_analysis_is_not_added_to_history(client, fake_youtube):
    guest_result = analyze(client, headers={})
    assert guest_result["analyzed_comments"] == 2

    headers = auth(signup(client, "guest-history@example.com"))
    assert client.get("/api/analyses", headers=headers).json() == []


def test_history_endpoints_require_auth(client, fake_youtube):
    assert client.get("/api/analyses").status_code == 401
    assert client.get("/api/analyses/unknown-id").status_code == 401
    assert client.delete("/api/analyses/unknown-id").status_code == 401


def test_unknown_analysis_returns_404_for_owner(client):
    headers = auth(signup(client, "no-history@example.com"))
    assert client.get("/api/analyses/does-not-exist", headers=headers).status_code == 404
    assert (
        client.delete("/api/analyses/does-not-exist", headers=headers).status_code == 404
    )


# ---------------------------------------------------------------------------
# Cross-user isolation
# ---------------------------------------------------------------------------
def test_history_is_isolated_between_users(client, fake_youtube):
    alice = auth(signup(client, "alice@example.com"))
    bob = auth(signup(client, "bob@example.com"))

    analyze(client, alice)
    alice_items = client.get("/api/analyses", headers=alice).json()
    assert len(alice_items) == 1
    analysis_id = alice_items[0]["id"]

    # Bob sees nothing of Alice's and cannot read or delete it.
    assert client.get("/api/analyses", headers=bob).json() == []
    assert client.get(f"/api/analyses/{analysis_id}", headers=bob).status_code == 404
    assert client.delete(f"/api/analyses/{analysis_id}", headers=bob).status_code == 404

    # Bob's failed delete did not touch Alice's row.
    assert client.get(f"/api/analyses/{analysis_id}", headers=alice).status_code == 200
    assert len(client.get("/api/analyses", headers=alice).json()) == 1


def test_me_requires_a_valid_bearer_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert (
        client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"}).status_code
        == 401
    )

    me = client.get("/api/auth/me", headers=auth(signup(client, "me@example.com")))
    assert me.status_code == 200
    assert me.json()["email"] == "me@example.com"


def test_logout_requires_auth_and_confirms_logged_out(client):
    assert client.post("/api/auth/logout").status_code == 401

    response = client.post(
        "/api/auth/logout", headers=auth(signup(client, "logout@example.com"))
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


