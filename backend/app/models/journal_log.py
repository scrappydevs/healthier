"""Journal log models for mental health tracking and AI analysis."""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


class JournalLogBase(BaseModel):
    """Base journal log fields."""
    transcript: str
    voice_transcription: Optional[str] = None
    duration_seconds: Optional[float] = None
    tags: Optional[list[str]] = None
    mood: Optional[str] = Field(None, pattern="^(very_positive|positive|neutral|negative|very_negative)$")
    sentiment_score: Optional[float] = Field(None, ge=-1.0, le=1.0)
    ai_analysis: Optional[dict] = None
    metadata: Optional[dict] = None
    logged_at: Optional[datetime] = None


class JournalLogCreate(JournalLogBase):
    """Fields required to create a journal log."""
    patient_id: UUID


class JournalLogUpdate(BaseModel):
    """Fields that can be updated on a journal log."""
    transcript: Optional[str] = None
    tags: Optional[list[str]] = None
    mood: Optional[str] = Field(None, pattern="^(very_positive|positive|neutral|negative|very_negative)$")
    sentiment_score: Optional[float] = Field(None, ge=-1.0, le=1.0)
    ai_analysis: Optional[dict] = None
    metadata: Optional[dict] = None


class JournalLogResponse(JournalLogBase):
    """Journal log response."""
    id: UUID
    patient_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
