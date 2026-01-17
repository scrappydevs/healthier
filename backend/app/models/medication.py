"""Medication models for request/response validation."""

from datetime import date, datetime, time
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class PillBase(BaseModel):
    """Base pill/medication catalog fields."""
    name: str
    generic_name: Optional[str] = None
    brand_name: Optional[str] = None
    dosage_form: str
    strength: str
    unit: str
    color: Optional[str] = None
    shape: Optional[str] = None
    imprint: Optional[str] = None
    instructions: Optional[str] = None
    warnings: Optional[str] = None
    side_effects: Optional[List[str]] = None
    interactions: Optional[List[str]] = None
    image_url: Optional[str] = None
    ndc_code: Optional[str] = None


class PillCreate(PillBase):
    """Fields required to create a pill."""
    pass


class PillUpdate(BaseModel):
    """Fields that can be updated on a pill."""
    name: Optional[str] = None
    generic_name: Optional[str] = None
    brand_name: Optional[str] = None
    dosage_form: Optional[str] = None
    strength: Optional[str] = None
    unit: Optional[str] = None
    color: Optional[str] = None
    shape: Optional[str] = None
    imprint: Optional[str] = None
    instructions: Optional[str] = None
    warnings: Optional[str] = None
    side_effects: Optional[List[str]] = None
    interactions: Optional[List[str]] = None
    image_url: Optional[str] = None
    ndc_code: Optional[str] = None


class PillResponse(PillBase):
    """Pill response."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MedicationBase(BaseModel):
    """Base medication fields - legacy support."""
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
    """Base medication schedule fields (patient_pills table)."""
    dosage_amount: float
    frequency: str
    times_of_day: List[str]
    days_of_week: Optional[List[int]] = None
    start_date: date
    end_date: Optional[date] = None
    with_food: bool = False
    special_instructions: Optional[str] = None
    prescribing_doctor: Optional[str] = None
    pharmacy: Optional[str] = None
    refill_date: Optional[date] = None
    quantity_remaining: Optional[int] = None


class MedicationScheduleCreate(MedicationScheduleBase):
    """Fields required to create a schedule."""
    patient_id: UUID
    pill_id: UUID


class MedicationScheduleUpdate(BaseModel):
    """Fields that can be updated on a schedule."""
    dosage_amount: Optional[float] = None
    frequency: Optional[str] = None
    times_of_day: Optional[List[str]] = None
    days_of_week: Optional[List[int]] = None
    end_date: Optional[date] = None
    with_food: Optional[bool] = None
    special_instructions: Optional[str] = None
    prescribing_doctor: Optional[str] = None
    pharmacy: Optional[str] = None
    refill_date: Optional[date] = None
    quantity_remaining: Optional[int] = None
    is_active: Optional[bool] = None


class MedicationScheduleResponse(MedicationScheduleBase):
    """Medication schedule response."""
    id: UUID
    patient_id: UUID
    pill_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    pill: Optional[PillResponse] = None

    class Config:
        from_attributes = True


class MedicationLogBase(BaseModel):
    """Base medication log fields (pill_logs table)."""
    scheduled_time: datetime
    taken_time: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
    confirmed_by: Optional[str] = None
    side_effects_reported: Optional[List[str]] = None


class MedicationLogCreate(MedicationLogBase):
    """Fields required to create a medication log."""
    patient_pill_id: UUID
    patient_id: UUID


class MedicationLogResponse(MedicationLogBase):
    """Medication log response."""
    id: UUID
    patient_pill_id: UUID
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
    side_effects_reported: Optional[List[str]] = None
