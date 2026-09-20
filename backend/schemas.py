from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class YouTubeAnalyzeRequest(BaseModel):
    url: str

class CommentAnalysis(BaseModel):
    text: str
    processed_text: str
    emotion_model: str
    emotions: List[str]
    sarcasm_label: int
    sarcasm_probability: float

class YouTubeAnalyzeResponse(BaseModel):
    # "model_usage" trips pydantic's protected "model_" namespace; disable it.
    model_config = {"protected_namespaces": ()}

    video_id: str
    total_comments: int
    analyzed_comments: int
    emotion_distribution: Dict[str, int]
    sarcasm_rate: float
    model_usage: Dict[str, int]
    comments: List[CommentAnalysis]
    # Optional metadata surfaced from the already-fetched YouTube response.
    video_url: Optional[str] = None
    video_title: Optional[str] = None
    thumbnail_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Auth schemas
# ---------------------------------------------------------------------------
class SignupRequest(BaseModel):
    email: str
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: str
    password: str


class ProfileResponse(BaseModel):
    """Public shape of a user profile (Supabase identity mirrored locally)."""

    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_profile(cls, profile) -> "ProfileResponse":
        return cls(
            id=profile.id,
            email=profile.email,
            full_name=profile.full_name,
            avatar_url=profile.avatar_url,
        )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: ProfileResponse


# ---------------------------------------------------------------------------
# Analysis persistence schemas
# ---------------------------------------------------------------------------
class SaveAnalysisRequest(BaseModel):
    model_config = {"protected_namespaces": ()}

    video_id: str
    video_url: Optional[str] = None
    video_title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    total_comments: int = 0
    analyzed_comments: int = 0
    emotion_distribution: Dict[str, int] = {}
    sarcasm_rate: float = 0.0
    model_usage: Dict[str, int] = {}
    comments: List[dict] = []
    status: str = "completed"


class AnalysisResponse(BaseModel):
    id: str
    video_id: str
    video_url: Optional[str] = None
    video_title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    total_comments: int
    analyzed_comments: int
    emotion_distribution: Dict[str, int]
    sarcasm_rate: float
    model_usage: Dict[str, int]
    comments: List[dict]
    status: str
    created_at: str

    class Config:
        from_attributes = True
        protected_namespaces = ()


class AnalysisSummary(BaseModel):
    """Lightweight history item that omits the full comment list."""

    id: str
    video_id: str
    video_url: Optional[str] = None
    video_title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    total_comments: int
    analyzed_comments: int
    sarcasm_rate: float
    status: str
    created_at: str

    class Config:
        from_attributes = True
