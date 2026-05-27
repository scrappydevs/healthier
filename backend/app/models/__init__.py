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
from app.models.journal_log import (
    JournalLogBase,
    JournalLogCreate,
    JournalLogUpdate,
    JournalLogResponse,
)

__all__ = [
    "PatientBase",
    "PatientCreate",
    "PatientUpdate",
    "PatientResponse",
    "PatientWithAdherence",
    "PatientListResponse",
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
    "JournalLogBase",
    "JournalLogCreate",
    "JournalLogUpdate",
    "JournalLogResponse",
]
