"""Patient models for request/response validation."""

from datetime import date, datetime
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


class PatientBase(BaseModel):
    """Base patient fields."""
    date_of_birth: Optional[date] = None
    medical_conditions: Optional[list[str]] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    notes: Optional[str] = None


class PatientCreate(PatientBase):
    """Fields required to create a patient."""
    user_id: UUID
    clinician_id: Optional[UUID] = None


class PatientUpdate(PatientBase):
    """Fields that can be updated on a patient."""
    status: Optional[str] = None


class PatientResponse(PatientBase):
    """Patient response with computed fields."""
    id: UUID
    user_id: UUID
    clinician_id: Optional[UUID] = None
    age: Optional[int] = None
    status: str = "active"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PatientWithAdherence(PatientResponse):
    """Patient with adherence data for dashboard."""
    full_name: str
    adherence_rate: float = Field(ge=0, le=100)
    last_active: Optional[datetime] = None
    medication_count: int = 0


class PatientListResponse(BaseModel):
    """Paginated patient list response."""
    patients: list[PatientWithAdherence]
    total: int
    page: int
    per_page: int
