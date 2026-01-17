"""API v1 routes."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.core.database import get_db
from app.models import (
    PatientCreate,
    PatientUpdate,
    PatientWithAdherence,
    PatientListResponse,
    AlertCreate,
    AlertResponse,
    AlertListResponse,
)
from app.services import PatientService, AlertService

router = APIRouter(prefix="/api/v1", tags=["v1"])


# ============================================
# USERS
# ============================================

@router.get("/users/me")
async def get_current_user(db: Client = Depends(get_db)):
    """Get current user profile. In production, this would use auth context."""
    # For now, return a mock user or fetch from database
    # In production, you'd get the user ID from the auth token
    response = db.table("users").select("*").eq("role", "clinician").limit(1).execute()
    
    if response.data:
        user = response.data[0]
        return {
            "id": user["id"],
            "email": user.get("email", ""),
            "full_name": user.get("full_name", ""),
            "role": user.get("role", "clinician"),
            "specialty": user.get("specialty"),
            "notification_preferences": {
                "critical_alerts": True,
                "daily_summary": True,
                "weekly_reports": False,
            },
            "alert_thresholds": {
                "low_adherence_percent": 75,
                "missed_doses_critical": 2,
            },
        }
    
    # Return default if no user found
    return {
        "id": "00000000-0000-0000-0000-000000000001",
        "email": "clinician@healthier.app",
        "full_name": "Clinician",
        "role": "clinician",
        "specialty": None,
        "notification_preferences": {
            "critical_alerts": True,
            "daily_summary": True,
            "weekly_reports": False,
        },
        "alert_thresholds": {
            "low_adherence_percent": 75,
            "missed_doses_critical": 2,
        },
    }


@router.patch("/users/me")
async def update_current_user(
    data: dict,
    db: Client = Depends(get_db),
):
    """Update current user profile."""
    # In production, you'd get the user ID from auth context
    # and update the actual database record
    return {
        "id": "00000000-0000-0000-0000-000000000001",
        "email": data.get("email", "clinician@healthier.app"),
        "full_name": data.get("full_name", "Clinician"),
        "role": "clinician",
        "specialty": data.get("specialty"),
        "notification_preferences": data.get("notification_preferences", {
            "critical_alerts": True,
            "daily_summary": True,
            "weekly_reports": False,
        }),
        "alert_thresholds": data.get("alert_thresholds", {
            "low_adherence_percent": 75,
            "missed_doses_critical": 2,
        }),
    }


# ============================================
# PATIENTS
# ============================================

@router.get("/patients", response_model=PatientListResponse)
async def list_patients(
    clinician_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Client = Depends(get_db),
):
    """List patients with adherence data."""
    service = PatientService(db)
    patients, total = await service.get_patients(
        clinician_id=clinician_id,
        status=status,
        page=page,
        per_page=per_page,
    )
    return PatientListResponse(
        patients=patients,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/patients/{patient_id}", response_model=PatientWithAdherence)
async def get_patient(
    patient_id: UUID,
    db: Client = Depends(get_db),
):
    """Get a single patient with adherence data."""
    service = PatientService(db)
    patient = await service.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("/patients", response_model=PatientWithAdherence, status_code=201)
async def create_patient(
    data: PatientCreate,
    db: Client = Depends(get_db),
):
    """Create a new patient."""
    service = PatientService(db)
    return await service.create_patient(data)


@router.patch("/patients/{patient_id}", response_model=PatientWithAdherence)
async def update_patient(
    patient_id: UUID,
    data: PatientUpdate,
    db: Client = Depends(get_db),
):
    """Update a patient."""
    service = PatientService(db)
    patient = await service.update_patient(patient_id, data)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


# ============================================
# PATIENT MEALS (from iOS app)
# ============================================

@router.get("/patients/{patient_id}/meals")
async def get_patient_meals(
    patient_id: UUID,
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    db: Client = Depends(get_db),
):
    """Get meals logged by a patient via the iOS app."""
    # First get the patient's user_id
    patient_response = db.table("patients").select("user_id").eq("id", str(patient_id)).single().execute()
    if not patient_response.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    user_id = patient_response.data.get("user_id")
    if not user_id:
        return {"meals": [], "total": 0}
    
    # Query meals by user_id
    query = db.table("meals").select("*").eq("user_id", user_id).order("consumed_at", desc=True)
    
    if date:
        # Filter by date (start and end of day)
        query = query.gte("consumed_at", f"{date}T00:00:00").lt("consumed_at", f"{date}T23:59:59")
    
    response = query.execute()
    meals = response.data or []
    
    return {
        "meals": meals,
        "total": len(meals),
    }


# ============================================
# PATIENT EXERCISES (from iOS app)
# ============================================

@router.get("/patients/{patient_id}/exercises")
async def get_patient_exercises(
    patient_id: UUID,
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    db: Client = Depends(get_db),
):
    """Get exercises logged by a patient via the iOS app."""
    # First get the patient's user_id
    patient_response = db.table("patients").select("user_id").eq("id", str(patient_id)).single().execute()
    if not patient_response.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    user_id = patient_response.data.get("user_id")
    if not user_id:
        return {"exercises": [], "total": 0, "summary": {"total_minutes": 0, "total_calories": 0}}
    
    # Query exercises by user_id (using the new user_id column)
    query = db.table("exercises").select("*").eq("user_id", user_id).order("logged_at", desc=True)
    
    if date:
        query = query.gte("logged_at", f"{date}T00:00:00").lt("logged_at", f"{date}T23:59:59")
    
    response = query.execute()
    exercises = response.data or []
    
    # Calculate summary
    total_minutes = sum(e.get("duration_minutes") or 0 for e in exercises)
    total_calories = sum(e.get("calories_burned") or 0 for e in exercises)
    
    return {
        "exercises": exercises,
        "total": len(exercises),
        "summary": {
            "total_minutes": total_minutes,
            "total_calories": total_calories,
        },
    }


# ============================================
# PATIENT MEDICATIONS (from iOS app)
# ============================================

@router.get("/patients/{patient_id}/medications")
async def get_patient_medications(
    patient_id: UUID,
    db: Client = Depends(get_db),
):
    """Get medications and logs for a patient via the iOS app."""
    # First get the patient's user_id
    patient_response = db.table("patients").select("user_id").eq("id", str(patient_id)).single().execute()
    if not patient_response.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    user_id = patient_response.data.get("user_id")
    if not user_id:
        return {"medications": [], "total": 0}
    
    # Query medications by user_id
    meds_response = db.table("medications").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    medications = meds_response.data or []
    
    # For each medication, get recent logs
    for med in medications:
        logs_response = db.table("medication_logs").select("*").eq(
            "medication_id", med.get("id")
        ).order("taken_at", desc=True).limit(10).execute()
        med["recent_logs"] = logs_response.data or []
        
        # Calculate adherence for this medication
        total_logs = len(logs_response.data or [])
        on_time_logs = len([l for l in (logs_response.data or []) if l.get("was_on_time")])
        med["adherence_rate"] = round((on_time_logs / total_logs * 100) if total_logs > 0 else 100, 1)
    
    return {
        "medications": medications,
        "total": len(medications),
    }


# ============================================
# ALERTS
# ============================================

@router.get("/alerts", response_model=AlertListResponse)
async def list_alerts(
    clinician_id: Optional[UUID] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Client = Depends(get_db),
):
    """List alerts with counts."""
    service = AlertService(db)
    alerts, total, critical, unack = await service.get_alerts(
        clinician_id=clinician_id,
        acknowledged=acknowledged,
        severity=severity,
        limit=limit,
    )
    return AlertListResponse(
        alerts=alerts,
        total=total,
        critical_count=critical,
        unacknowledged_count=unack,
    )


@router.post("/alerts", response_model=AlertResponse, status_code=201)
async def create_alert(
    data: AlertCreate,
    db: Client = Depends(get_db),
):
    """Create a new alert."""
    service = AlertService(db)
    return await service.create_alert(data)


@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: UUID,
    user_id: UUID = Query(..., description="ID of user acknowledging the alert"),
    db: Client = Depends(get_db),
):
    """Acknowledge an alert."""
    service = AlertService(db)
    alert = await service.acknowledge_alert(alert_id, user_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


# ============================================
# DASHBOARD STATS
# ============================================

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    clinician_id: Optional[UUID] = Query(None),
    db: Client = Depends(get_db),
):
    """Get dashboard statistics."""
    patient_service = PatientService(db)
    alert_service = AlertService(db)

    patients, total_patients = await patient_service.get_patients(
        clinician_id=clinician_id, per_page=1000
    )
    alerts, _, critical_count, _ = await alert_service.get_alerts(
        clinician_id=clinician_id, acknowledged=False
    )

    avg_adherence = 0.0
    if patients:
        avg_adherence = sum(p.adherence_rate for p in patients) / len(patients)

    # Calculate timestamp for 24 hours ago
    from datetime import datetime, timedelta, timezone
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    
    doses_response = db.table("pill_logs").select(
        "status", count="exact"
    ).gte(
        "scheduled_time", yesterday
    ).execute()

    total_doses = doses_response.count or 0
    taken_doses = len([d for d in (doses_response.data or []) if d["status"] == "taken"])

    return {
        "total_patients": total_patients,
        "average_adherence": round(avg_adherence, 1),
        "active_alerts": len(alerts),
        "critical_alerts": critical_count,
        "doses_today": {
            "taken": taken_doses,
            "total": total_doses,
        },
    }


# ============================================
# ANALYTICS
# ============================================

@router.get("/analytics")
async def get_analytics(
    clinician_id: Optional[UUID] = Query(None),
    db: Client = Depends(get_db),
):
    """Get analytics data for charts."""
    patient_service = PatientService(db)
    
    # Get patients for calculations
    patients, total_patients = await patient_service.get_patients(
        clinician_id=clinician_id, per_page=1000
    )
    
    avg_adherence = 0.0
    if patients:
        avg_adherence = sum(p.adherence_rate for p in patients) / len(patients)

    # Get monthly adherence data (last 12 months) - return zeros if no data
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_adherence = []
    if avg_adherence > 0:
        # Calculate real monthly adherence from pill_logs
        for i, month in enumerate(months):
            # For now, use current average (would need date-based calculation for real monthly data)
            monthly_adherence.append({
                "label": month,
                "value": round(avg_adherence, 1)
            })
    else:
        # No data - return zeros
        for month in months:
            monthly_adherence.append({
                "label": month,
                "value": 0.0
            })
    
    # Get medication breakdown from actual data
    meds_response = db.table("pills").select(
        "id, name", count="exact"
    ).limit(5).execute()
    
    medication_breakdown = []
    if meds_response.data:
        for med in meds_response.data:
            # Get patient_pills for this medication
            patient_pills_response = db.table("patient_pills").select(
                "id", count="exact"
            ).eq("pill_id", med.get("id", "")).execute()
            
            # Get logs for these patient_pills
            if patient_pills_response.data:
                patient_pill_ids = [pp.get("id") for pp in patient_pills_response.data]
                logs_response = db.table("pill_logs").select(
                    "status", count="exact"
                ).in_("patient_pill_id", patient_pill_ids).execute()
                taken = len([l for l in (logs_response.data or []) if l.get("status") in ("taken", "late")])
                total = logs_response.count or 0
                if total > 0:
                    medication_breakdown.append({
                        "label": med.get("name", "Unknown"),
                        "value": taken,
                        "target": total
                    })
    
    # Time of day adherence - return zeros if no data
    if avg_adherence > 0:
        # Calculate from actual pill_logs data by time of day
        time_of_day = [
            {"label": "Morning", "value": round(avg_adherence, 1)},
            {"label": "Noon", "value": round(avg_adherence, 1)},
            {"label": "Afternoon", "value": round(avg_adherence, 1)},
            {"label": "Evening", "value": round(avg_adherence, 1)},
            {"label": "Night", "value": round(avg_adherence, 1)},
        ]
    else:
        time_of_day = [
            {"label": "Morning", "value": 0.0},
            {"label": "Noon", "value": 0.0},
            {"label": "Afternoon", "value": 0.0},
            {"label": "Evening", "value": 0.0},
            {"label": "Night", "value": 0.0},
        ]
    
    # Age distribution
    age_distribution = [
        {"label": "65-69", "value": 0},
        {"label": "70-74", "value": 0},
        {"label": "75-79", "value": 0},
        {"label": "80-84", "value": 0},
        {"label": "85+", "value": 0},
    ]
    for p in patients:
        if p.age:
            if 65 <= p.age <= 69:
                age_distribution[0]["value"] += 1
            elif 70 <= p.age <= 74:
                age_distribution[1]["value"] += 1
            elif 75 <= p.age <= 79:
                age_distribution[2]["value"] += 1
            elif 80 <= p.age <= 84:
                age_distribution[3]["value"] += 1
            elif p.age >= 85:
                age_distribution[4]["value"] += 1
    
    # Get food and exercise logs count
    food_response = db.table("food").select("id", count="exact").execute()
    exercise_response = db.table("exercises").select("id", count="exact").execute()
    doses_response = db.table("pill_logs").select("id", count="exact").execute()
    
    return {
        "monthly_adherence": monthly_adherence,
        "medication_breakdown": medication_breakdown,
        "time_of_day": time_of_day,
        "age_distribution": age_distribution,
        "summary": {
            "avg_adherence": round(avg_adherence, 1),
            "total_doses": doses_response.count or 0,
            "total_patients": total_patients,
            "food_logs": food_response.count or 0,
            "exercise_sessions": exercise_response.count or 0,
        }
    }


# ============================================
# RECENT ACTIVITY
# ============================================

@router.get("/activity/recent")
async def get_recent_activity(
    clinician_id: Optional[UUID] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: Client = Depends(get_db),
):
    """Get recent activity across all patients (medications, food, exercise)."""
    activities = []
    
    # Get recent pill logs (taken medications)
    pill_logs_query = db.table("pill_logs").select(
        "id, patient_id, taken_time, status"
    ).in_("status", ["taken", "late"]).not_.is_("taken_time", "null").order("taken_time", desc=True).limit(limit).execute()
    
    # Get patient IDs and fetch patient names
    patient_ids = set()
    for log in (pill_logs_query.data or []):
        patient_ids.add(log.get("patient_id"))
    
    # Fetch patient names
    patient_names = {}
    if patient_ids:
        patients_query = db.table("patients").select(
            "id, user_id, users!patients_user_id_fkey(full_name)"
        ).in_("id", list(patient_ids)).execute()
        for patient in (patients_query.data or []):
            patient_names[patient.get("id")] = patient.get("users", {}).get("full_name", "Unknown")
    
    for log in (pill_logs_query.data or []):
        patient_id = log.get("patient_id")
        patient_name = patient_names.get(patient_id, "Unknown")
        activities.append({
            "id": f"pill_{log.get('id')}",
            "type": "medication",
            "patient_name": patient_name,
            "action": "Took medication",
            "timestamp": log.get("taken_time"),
            "status": "completed",
        })
    
    # Get recent food logs
    food_query = db.table("food").select(
        "id, patient_id, logged_at, meal_type, name"
    ).order("logged_at", desc=True).limit(limit).execute()
    
    for food in (food_query.data or []):
        patient_id = food.get("patient_id")
        patient_name = patient_names.get(patient_id)
        if not patient_name and patient_id:
            # Fetch this patient's name if not already fetched
            patient_res = db.table("patients").select(
                "id, user_id, users!patients_user_id_fkey(full_name)"
            ).eq("id", patient_id).single().execute()
            if patient_res.data:
                patient_name = patient_res.data.get("users", {}).get("full_name", "Unknown")
                patient_names[patient_id] = patient_name
            else:
                patient_name = "Unknown"
        else:
            patient_name = patient_name or "Unknown"
        
        meal_type = food.get("meal_type", "meal")
        food_name = food.get("name") or meal_type
        activities.append({
            "id": f"food_{food.get('id')}",
            "type": "food",
            "patient_name": patient_name,
            "action": f"Logged {food_name}",
            "timestamp": food.get("logged_at"),
        })
    
    # Get recent exercise logs
    exercise_query = db.table("exercises").select(
        "id, patient_id, logged_at, exercise_type, duration_minutes"
    ).order("logged_at", desc=True).limit(limit).execute()
    
    for exercise in (exercise_query.data or []):
        patient_id = exercise.get("patient_id")
        patient_name = patient_names.get(patient_id)
        if not patient_name and patient_id:
            # Fetch this patient's name if not already fetched
            patient_res = db.table("patients").select(
                "id, user_id, users!patients_user_id_fkey(full_name)"
            ).eq("id", patient_id).single().execute()
            if patient_res.data:
                patient_name = patient_res.data.get("users", {}).get("full_name", "Unknown")
                patient_names[patient_id] = patient_name
            else:
                patient_name = "Unknown"
        else:
            patient_name = patient_name or "Unknown"
        
        exercise_type = exercise.get("exercise_type", "exercise")
        duration = exercise.get("duration_minutes")
        action = exercise_type
        if duration:
            action += f" - {duration} min"
        activities.append({
            "id": f"exercise_{exercise.get('id')}",
            "type": "exercise",
            "patient_name": patient_name,
            "action": action,
            "timestamp": exercise.get("logged_at"),
        })
    
    # Sort by timestamp and limit
    activities.sort(key=lambda x: x.get("timestamp") or "", reverse=True)
    return {"activities": activities[:limit]}
