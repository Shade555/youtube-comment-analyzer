from datetime import datetime
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models, schemas
from .analytics import generate_analytics
from .auth import (
    create_access_token,
    get_current_user,
    get_optional_user,
    hash_password,
    verify_password,
)
from .config import settings
from .database import Base, engine, get_db
from .sentiment import unified_predict
from .youtube import extract_video_id, fetch_youtube_comments

# Create database tables on startup (no-op if they already exist).
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Hindi YouTube Comment Emotion & Sarcasm API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None

@app.get("/")
def health_check():
    payload = {
        "status": "ok",
        "message": "API is running.",
        # Lets the frontend/demo show which auth + database backend is live.
        "auth_mode": settings.AUTH_MODE,
        "database": "sqlite" if settings.using_sqlite else "postgres",
    }
    if settings.IGNORED_PLACEHOLDERS:
        # A half-filled .env is a common setup mistake. Say so loudly instead of
        # silently running on the SQLite fallback.
        payload["ignored_placeholders"] = list(settings.IGNORED_PLACEHOLDERS)
        payload["hint"] = (
            "These variables still hold .env.example placeholders and were "
            "ignored. Replace them with the real Supabase values and restart."
        )
    return payload


# ===========================================================================
# Authentication
#
# Identity is owned by Supabase Auth (GoTrue). The browser talks to Supabase
# directly for signup/login/OAuth/password-reset; these endpoints only mirror
# the resulting session into our own `profiles` table and are used for the
# offline fallback mode.
# ===========================================================================
def _require_local_auth() -> None:
    """Guard the local email/password endpoints.

    They stay available while running without Supabase (offline dev / tests) but
    are disabled as soon as a Supabase project is configured, so there is exactly
    one source of truth for credentials in a real deployment.
    """
    if not settings.ALLOW_LOCAL_AUTH:
        raise HTTPException(
            status_code=503,
            detail=(
                "Local authentication is disabled because Supabase Auth is "
                "configured. Use the Supabase client SDK (signUp / "
                "signInWithPassword) instead."
            ),
        )


@app.post("/api/auth/signup", response_model=schemas.TokenResponse)
def signup(request: schemas.SignupRequest, db: Session = Depends(get_db)):
    _require_local_auth()
    email = request.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email is required.")

    existing = db.query(models.Profile).filter(models.Profile.email == email).first()
    if existing:
        raise HTTPException(
            status_code=409, detail="An account with this email already exists."
        )

    user = models.Profile(email=email, hashed_password=hash_password(request.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return schemas.TokenResponse(
        access_token=token, user=schemas.ProfileResponse.from_profile(user)
    )


@app.post("/api/auth/login", response_model=schemas.TokenResponse)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    _require_local_auth()
    email = request.email.strip().lower()
    user = db.query(models.Profile).filter(models.Profile.email == email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user.id)
    return schemas.TokenResponse(
        access_token=token, user=schemas.ProfileResponse.from_profile(user)
    )


@app.get("/api/auth/me", response_model=schemas.ProfileResponse)
def read_me(current_user: models.Profile = Depends(get_current_user)):
    """Return the mirrored profile for the verified Supabase (or local) token.

    Calling this also provisions the profile row on first login, which is why the
    frontend hits it right after Supabase reports a session.
    """
    return schemas.ProfileResponse.from_profile(current_user)


@app.post("/api/auth/logout")
def logout(current_user: models.Profile = Depends(get_current_user)):
    # Supabase sessions are stateless JWTs: the client discards its token (or
    # calls supabase.auth.signOut()). This endpoint just confirms the session was
    # valid, and doubles as a way for the client to know the API accepted it.
    return {"status": "ok", "message": "Logged out."}


# ===========================================================================
# YouTube analysis (existing pipeline preserved + auto-persist when logged in)
# ===========================================================================
@app.post("/api/analyze/youtube", response_model=schemas.YouTubeAnalyzeResponse)
def analyze_youtube_video(
    request: schemas.YouTubeAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: Optional[models.Profile] = Depends(get_optional_user),
):
    video_id = extract_video_id(request.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL.")

    try:
        youtube_data = fetch_youtube_comments(video_id)
        raw_comments = youtube_data["comments"]

        if not raw_comments:
            raise HTTPException(status_code=404, detail="No comments found in this video.")

        predictions = []
        for c in raw_comments:
            result = unified_predict(c["text"])
            # Only include if preprocessing produced some text
            if result["processed_text"]:
                predictions.append(result)

        if not predictions:
            raise HTTPException(
                status_code=404,
                detail="Comments found, but none contained valid words after preprocessing.",
            )

        analytics = generate_analytics(predictions)

        response = schemas.YouTubeAnalyzeResponse(
            video_id=video_id,
            total_comments=len(raw_comments),
            analyzed_comments=len(predictions),
            emotion_distribution=analytics["emotion_distribution"],
            sarcasm_rate=analytics["sarcasm_rate"],
            model_usage=analytics["model_usage"],
            comments=predictions,
            video_url=request.url,
            video_title=youtube_data.get("title"),
            thumbnail_url=youtube_data.get("thumbnail"),
        )

        # Persist only successful analyses, and only for authenticated users.
        if current_user is not None:
            saved = models.Analysis(
                user_id=current_user.id,
                video_id=video_id,
                video_url=request.url,
                video_title=youtube_data.get("title"),
                thumbnail_url=youtube_data.get("thumbnail"),
                total_comments=response.total_comments,
                analyzed_comments=response.analyzed_comments,
                emotion_distribution=response.emotion_distribution,
                sarcasm_rate=response.sarcasm_rate,
                model_usage=response.model_usage,
                comments=[c.model_dump() for c in response.comments],
                status="completed",
            )
            db.add(saved)
            db.commit()

        return response

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"Error analyzing YouTube video: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")


# ===========================================================================
# Analysis history (user-scoped)
# ===========================================================================
@app.get("/api/analyses", response_model=List[schemas.AnalysisSummary])
def list_analyses(
    current_user: models.Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.Analysis)
        .filter(models.Analysis.user_id == current_user.id)
        .order_by(models.Analysis.created_at.desc())
        .all()
    )
    return [
        schemas.AnalysisSummary(
            id=r.id,
            video_id=r.video_id,
            video_url=r.video_url,
            video_title=r.video_title,
            thumbnail_url=r.thumbnail_url,
            total_comments=r.total_comments,
            analyzed_comments=r.analyzed_comments,
            sarcasm_rate=r.sarcasm_rate,
            status=r.status,
            created_at=_iso(r.created_at),
        )
        for r in rows
    ]


@app.get("/api/analyses/{analysis_id}", response_model=schemas.AnalysisResponse)
def get_analysis(
    analysis_id: str,
    current_user: models.Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(models.Analysis)
        .filter(
            models.Analysis.id == analysis_id,
            models.Analysis.user_id == current_user.id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return schemas.AnalysisResponse(
        id=row.id,
        video_id=row.video_id,
        video_url=row.video_url,
        video_title=row.video_title,
        thumbnail_url=row.thumbnail_url,
        total_comments=row.total_comments,
        analyzed_comments=row.analyzed_comments,
        emotion_distribution=row.emotion_distribution or {},
        sarcasm_rate=row.sarcasm_rate,
        model_usage=row.model_usage or {},
        comments=row.comments or [],
        status=row.status,
        created_at=_iso(row.created_at),
    )


@app.delete("/api/analyses/{analysis_id}")
def delete_analysis(
    analysis_id: str,
    current_user: models.Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(models.Analysis)
        .filter(
            models.Analysis.id == analysis_id,
            models.Analysis.user_id == current_user.id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    db.delete(row)
    db.commit()
    return {"status": "ok", "message": "Analysis deleted."}
