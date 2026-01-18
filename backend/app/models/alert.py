"""Alert models for request/response validation."""

from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class AlertBase(BaseModel):
    """Base alert fields."""
    type: str
    severity: str
    title: str
    message: str


class AlertCreate(AlertBase):
    """Fields required to create an alert."""
    patient_id: UUID
    clinician_id: Optional[UUID] = None


class AlertResponse(AlertBase):
    """Alert response."""
    id: UUID
    patient_id: UUID
    clinician_id: Optional[UUID] = None
    acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[UUID] = None
    created_at: datetime
    patient_name: Optional[str] = None

    class Config:
        from_attributes = True


class AlertUpdate(BaseModel):
    """Fields that can be updated on an alert."""
    acknowledged: Optional[bool] = None
    acknowledged_by: Optional[UUID] = None


class AlertListResponse(BaseModel):
    """Alert list response."""
    alerts: list[AlertResponse]
    total: int
    critical_count: int
    unacknowledged_count: int
