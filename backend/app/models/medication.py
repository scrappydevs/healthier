"""Medication models for request/response validation."""

from datetime import date, datetime, time
from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class MedicationBase(BaseModel):
    """Base medication fields."""
    name: str
    generic_name: Optional[str] = None
    dosage: str
    unit: str
    instructions: Optional[str] = None
    warnings: Optional[str] = None


class MedicationCreate(MedicationBase):
    """Fields required to create a medication."""
    pass


class MedicationResponse(MedicationBase):
    """Medication response."""
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class MedicationScheduleBase(BaseModel):
    """Base medication schedule fields."""
    dosage_amount: float
    frequency: str
    times_of_day: list[str]
    days_of_week: Optional[list[int]] = None
    start_date: date
    end_date: Optional[date] = None
    with_food: bool = False
    notes: Optional[str] = None


class MedicationScheduleCreate(MedicationScheduleBase):
    """Fields required to create a schedule."""
    patient_id: UUID
    medication_id: UUID


class MedicationScheduleResponse(MedicationScheduleBase):
    """Medication schedule response."""
    id: UUID
    patient_id: UUID
    medication_id: UUID
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    medication: Optional[MedicationResponse] = None

    class Config:
        from_attributes = True


class MedicationLogBase(BaseModel):
    """Base medication log fields."""
    scheduled_time: datetime
    taken_time: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
    confirmed_by: Optional[str] = None


class MedicationLogCreate(MedicationLogBase):
    """Fields required to create a medication log."""
    schedule_id: UUID
    patient_id: UUID


class MedicationLogResponse(MedicationLogBase):
    """Medication log response."""
    id: UUID
    schedule_id: UUID
    patient_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class MedicationLogUpdate(BaseModel):
    """Fields that can be updated on a medication log."""
    taken_time: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    confirmed_by: Optional[str] = None
