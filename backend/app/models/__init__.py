"""Pydantic models for request/response validation."""

from app.models.patient import (
    PatientBase,
    PatientCreate,
    PatientUpdate,
    PatientResponse,
    PatientWithAdherence,
    PatientListResponse,
)
from app.models.medication import (
    MedicationBase,
    MedicationCreate,
    MedicationResponse,
    MedicationScheduleBase,
    MedicationScheduleCreate,
    MedicationScheduleResponse,
    MedicationLogBase,
    MedicationLogCreate,
    MedicationLogResponse,
    MedicationLogUpdate,
)
from app.models.alert import (
    AlertBase,
    AlertCreate,
    AlertResponse,
    AlertUpdate,
    AlertListResponse,
)
from app.models.health_log import (
    FoodLogBase,
    FoodLogCreate,
    FoodLogResponse,
    ExerciseLogBase,
    ExerciseLogCreate,
    ExerciseLogResponse,
    ActivitySummary,
)

__all__ = [
    # Patient
    "PatientBase",
    "PatientCreate",
    "PatientUpdate",
    "PatientResponse",
    "PatientWithAdherence",
    "PatientListResponse",
    # Medication
    "MedicationBase",
    "MedicationCreate",
    "MedicationResponse",
    "MedicationScheduleBase",
    "MedicationScheduleCreate",
    "MedicationScheduleResponse",
    "MedicationLogBase",
    "MedicationLogCreate",
    "MedicationLogResponse",
    "MedicationLogUpdate",
    # Alert
    "AlertBase",
    "AlertCreate",
    "AlertResponse",
    "AlertUpdate",
    "AlertListResponse",
    # Health Logs
    "FoodLogBase",
    "FoodLogCreate",
    "FoodLogResponse",
    "ExerciseLogBase",
    "ExerciseLogCreate",
    "ExerciseLogResponse",
    "ActivitySummary",
]
