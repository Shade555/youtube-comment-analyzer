import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship

from .database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Profile(Base):
    """Application-level user profile.

    In Supabase mode ``id`` is the ``auth.users.id`` UUID handed to us in the
    access token's ``sub`` claim, and Supabase owns the password hash (inside its
    own ``auth`` schema). In local (offline) mode ``id`` is generated here and
    ``hashed_password`` holds a PBKDF2 hash - which is why that column is
    nullable.
    """

    __tablename__ = "profiles"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    analyses = relationship(
        "Analysis", back_populates="user", cascade="all, delete-orphan"
    )


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("profiles.id"), index=True, nullable=False)

    video_id = Column(String, nullable=False, index=True)
    video_url = Column(String, nullable=True)
    video_title = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True)

    total_comments = Column(Integer, default=0)
    analyzed_comments = Column(Integer, default=0)
    # Full analysis payloads stored as JSON so an old analysis can be re-opened
    # without re-calling the YouTube API.
    emotion_distribution = Column(JSON, default=dict)
    model_usage = Column(JSON, default=dict)
    comments = Column(JSON, default=list)
    sarcasm_rate = Column(Float, default=0.0)

    status = Column(String, default="completed")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("Profile", back_populates="analyses")