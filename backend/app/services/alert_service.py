"""Alert service for database operations."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from supabase import Client

from app.models import AlertCreate, AlertResponse, AlertUpdate


class AlertService:
    """Service for alert-related database operations."""

    def __init__(self, db: Client):
        self.db = db

    async def get_alerts(
        self,
        clinician_id: Optional[UUID] = None,
        acknowledged: Optional[bool] = None,
        severity: Optional[str] = None,
        limit: int = 50,
    ) -> tuple[list[AlertResponse], int, int, int]:
        """Get alerts with counts."""
        query = self.db.table("alerts").select(
            "*, patients!alerts_patient_id_fkey(users!patients_user_id_fkey(full_name))",
            count="exact"
        )

        if clinician_id:
            query = query.eq("clinician_id", str(clinician_id))
        if acknowledged is not None:
            query = query.eq("acknowledged", acknowledged)
        if severity:
            query = query.eq("severity", severity)

        query = query.order("created_at", desc=True).limit(limit)
        response = query.execute()

        alerts = []
        for row in response.data:
            patient_name = None
            if row.get("patients") and row["patients"].get("users"):
                patient_name = row["patients"]["users"]["full_name"]

            alerts.append(AlertResponse(
                id=row["id"],
                patient_id=row["patient_id"],
                clinician_id=row.get("clinician_id"),
                type=row["type"],
                severity=row["severity"],
                title=row.get("title", "Alert"),
                message=row["message"],
                acknowledged=row["acknowledged"],
                acknowledged_at=row.get("acknowledged_at"),
                acknowledged_by=row.get("acknowledged_by"),
                created_at=row["created_at"],
                patient_name=patient_name,
            ))

        total = response.count or 0
        critical_count = len([a for a in alerts if a.severity == "critical" and not a.acknowledged])
        unacknowledged_count = len([a for a in alerts if not a.acknowledged])

        return alerts, total, critical_count, unacknowledged_count

    async def create_alert(self, data: AlertCreate) -> AlertResponse:
        """Create a new alert."""
        insert_data = data.model_dump(exclude_none=True)
        insert_data["patient_id"] = str(insert_data["patient_id"])
        if insert_data.get("clinician_id"):
            insert_data["clinician_id"] = str(insert_data["clinician_id"])

        response = self.db.table("alerts").insert(insert_data).execute()
        row = response.data[0]

        return AlertResponse(
            id=row["id"],
            patient_id=row["patient_id"],
            clinician_id=row.get("clinician_id"),
            type=row["type"],
            severity=row["severity"],
            title=row.get("title", "Alert"),
            message=row["message"],
            acknowledged=row["acknowledged"],
            acknowledged_at=row.get("acknowledged_at"),
            acknowledged_by=row.get("acknowledged_by"),
            created_at=row["created_at"],
        )

    async def acknowledge_alert(
        self, alert_id: UUID, user_id: UUID
    ) -> Optional[AlertResponse]:
        """Acknowledge an alert."""
        response = self.db.table("alerts").update({
            "acknowledged": True,
            "acknowledged_at": datetime.utcnow().isoformat(),
            "acknowledged_by": str(user_id),
        }).eq("id", str(alert_id)).execute()

        if not response.data:
            return None

        row = response.data[0]
        return AlertResponse(
            id=row["id"],
            patient_id=row["patient_id"],
            clinician_id=row.get("clinician_id"),
            type=row["type"],
            severity=row["severity"],
            title=row.get("title", "Alert"),
            message=row["message"],
            acknowledged=row["acknowledged"],
            acknowledged_at=row.get("acknowledged_at"),
            acknowledged_by=row.get("acknowledged_by"),
            created_at=row["created_at"],
        )
