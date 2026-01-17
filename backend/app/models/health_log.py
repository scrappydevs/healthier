"""Health log models for food and exercise tracking."""

from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class FoodLogBase(BaseModel):
    """Base food log fields."""
    meal_type: Optional[str] = None
    description: Optional[str] = None
    voice_transcription: Optional[str] = None
    photo_url: Optional[str] = None
    logged_at: Optional[datetime] = None


class FoodLogCreate(FoodLogBase):
    """Fields required to create a food log."""
    patient_id: UUID


class FoodLogResponse(FoodLogBase):
    """Food log response."""
    id: UUID
    patient_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ExerciseLogBase(BaseModel):
    """Base exercise log fields."""
    exercise_type: str
    duration_minutes: Optional[int] = None
    intensity: Optional[str] = None
    voice_notes: Optional[str] = None
    logged_at: Optional[datetime] = None


class ExerciseLogCreate(ExerciseLogBase):
    """Fields required to create an exercise log."""
    patient_id: UUID


class ExerciseLogResponse(ExerciseLogBase):
    """Exercise log response."""
    id: UUID
    patient_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ActivitySummary(BaseModel):
    """Summary of patient activity."""
    medication_doses_taken: int
    medication_doses_total: int
    food_logs_count: int
    exercise_sessions_count: int
    adherence_rate: float
