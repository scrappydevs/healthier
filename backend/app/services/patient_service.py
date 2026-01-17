"""Patient service for database operations."""

from typing import Optional
from uuid import UUID

from supabase import Client

from app.models import PatientCreate, PatientUpdate, PatientWithAdherence


class PatientService:
    """Service for patient-related database operations."""

    def __init__(self, db: Client):
        self.db = db

    async def get_patients(
        self,
        clinician_id: Optional[UUID] = None,
        status: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[list[PatientWithAdherence], int]:
        """Get paginated list of patients with adherence data."""
        query = self.db.table("patients").select(
            "*, users!patients_user_id_fkey(full_name)",
            count="exact"
        )

        if clinician_id:
            query = query.eq("clinician_id", str(clinician_id))
        if status:
            query = query.eq("status", status)

        offset = (page - 1) * per_page
        query = query.range(offset, offset + per_page - 1)
        query = query.order("created_at", desc=True)

        response = query.execute()

        patients = []
        for row in response.data:
            adherence = self._calculate_adherence(row["id"])
            last_active = self._get_last_active(row["id"])
            med_count = self._get_medication_count(row["id"])

            patients.append(PatientWithAdherence(
                id=row["id"],
                user_id=row["user_id"],
                clinician_id=row.get("clinician_id"),
                date_of_birth=row.get("date_of_birth"),
                age=row.get("age"),
                medical_conditions=row.get("medical_conditions"),
                emergency_contact_name=row.get("emergency_contact_name"),
                emergency_contact_phone=row.get("emergency_contact_phone"),
                notes=row.get("notes"),
                status=row.get("status", "active"),
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                full_name=row["users"]["full_name"] if row.get("users") else "Unknown",
                adherence_rate=adherence,
                last_active=last_active,
                medication_count=med_count,
            ))

        return patients, response.count or 0

    async def get_patient(self, patient_id: UUID) -> Optional[PatientWithAdherence]:
        """Get a single patient with adherence data."""
        response = self.db.table("patients").select(
            "*, users!patients_user_id_fkey(full_name)"
        ).eq("id", str(patient_id)).single().execute()

        if not response.data:
            return None

        row = response.data
        adherence = self._calculate_adherence(row["id"])
        last_active = self._get_last_active(row["id"])
        med_count = self._get_medication_count(row["id"])

        return PatientWithAdherence(
            id=row["id"],
            user_id=row["user_id"],
            clinician_id=row.get("clinician_id"),
            date_of_birth=row.get("date_of_birth"),
            age=row.get("age"),
            medical_conditions=row.get("medical_conditions"),
            emergency_contact_name=row.get("emergency_contact_name"),
            emergency_contact_phone=row.get("emergency_contact_phone"),
            notes=row.get("notes"),
            status=row.get("status", "active"),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            full_name=row["users"]["full_name"] if row.get("users") else "Unknown",
            adherence_rate=adherence,
            last_active=last_active,
            medication_count=med_count,
        )

    async def create_patient(self, data: PatientCreate) -> PatientWithAdherence:
        """Create a new patient."""
        insert_data = data.model_dump(exclude_none=True)
        insert_data["user_id"] = str(insert_data["user_id"])
        if insert_data.get("clinician_id"):
            insert_data["clinician_id"] = str(insert_data["clinician_id"])

        response = self.db.table("patients").insert(insert_data).execute()
        return await self.get_patient(response.data[0]["id"])

    async def update_patient(
        self, patient_id: UUID, data: PatientUpdate
    ) -> Optional[PatientWithAdherence]:
        """Update a patient."""
        update_data = data.model_dump(exclude_none=True)
        if not update_data:
            return await self.get_patient(patient_id)

        self.db.table("patients").update(update_data).eq(
            "id", str(patient_id)
        ).execute()

        return await self.get_patient(patient_id)

    def _calculate_adherence(self, patient_id: str) -> float:
        """Calculate adherence rate for a patient (last 7 days)."""
        response = self.db.rpc(
            "calculate_adherence_rate",
            {"p_patient_id": patient_id, "p_days": 7}
        ).execute()

        if response.data is not None:
            return float(response.data)
        return 100.0

    def _get_last_active(self, patient_id: str) -> Optional[str]:
        """Get last activity timestamp for a patient."""
        response = self.db.table("pill_logs").select(
            "taken_time"
        ).eq("patient_id", patient_id).not_.is_("taken_time", "null").order(
            "taken_time", desc=True
        ).limit(1).execute()

        if response.data:
            return response.data[0]["taken_time"]
        return None

    def _get_medication_count(self, patient_id: str) -> int:
        """Get active medication count for a patient."""
        response = self.db.table("patient_pills").select(
            "id", count="exact"
        ).eq("patient_id", patient_id).eq("is_active", True).execute()

        return response.count or 0
