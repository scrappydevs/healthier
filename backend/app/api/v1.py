"""API v1 routes."""

from typing import Optional
from uuid import UUID
from datetime import date
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from openai import OpenAI

from app.core.database import get_db
from app.core.config import get_settings
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


def get_cerebras_client() -> Optional[OpenAI]:
    """Get Cerebras client"""
    settings = get_settings()
    if not settings.cerebras_key:
        return None
    return OpenAI(
        api_key=settings.cerebras_key,
        base_url="https://api.cerebras.ai/v1"
    )


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


# ============================================
# PILLS (Medication Reference)
# ============================================

@router.get("/pills")
async def get_pills(db: Client = Depends(get_db)):
    """Get all available pills/medications for assignment."""
    response = db.table("pills").select(
        "id, name, generic_name, dosage_form, strength, unit, instructions"
    ).order("name").execute()
    
    return {"pills": response.data or []}


# ============================================
# JOURNAL LOGS
# ============================================

@router.get("/patients/{patient_id}/journal")
async def get_patient_journal(
    patient_id: UUID,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Client = Depends(get_db)
):
    """Get journal entries for a patient, optionally filtered by date range."""
    query = db.table("journal_logs").select(
        "id, patient_id, transcript, duration_seconds, "
        "tags, mood, sentiment_score, ai_analysis, metadata, logged_at, created_at"
    ).eq("patient_id", str(patient_id))
    
    if start_date:
        query = query.gte("logged_at", f"{start_date}T00:00:00")
    if end_date:
        query = query.lte("logged_at", f"{end_date}T23:59:59")
    
    response = query.order("logged_at", desc=True).execute()
    
    return {
        "entries": response.data or [],
        "total": len(response.data or [])
    }


# ============================================
# DAILY AI SUMMARY
# ============================================

@router.post("/patients/{patient_id}/daily-summary")
async def generate_daily_summary(
    patient_id: UUID,
    summary_date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format, defaults to today"),
    db: Client = Depends(get_db)
):
    """Generate an AI-powered daily summary for a patient using Cerebras."""
    
    target_date = summary_date or date.today().isoformat()
    
    # Get patient info
    patient_res = db.table("patients").select(
        "id, user_id, age, gender, medical_conditions"
    ).eq("id", str(patient_id)).single().execute()
    
    if not patient_res.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient = patient_res.data
    user_id = patient.get("user_id")
    
    # Get patient name
    user_res = db.table("users").select("full_name").eq("id", user_id).single().execute()
    patient_name = user_res.data.get("full_name", "Patient") if user_res.data else "Patient"
    
    # Fetch all data for the day
    date_start = f"{target_date}T00:00:00"
    date_end = f"{target_date}T23:59:59"
    
    # Meals (via user_id)
    meals_res = db.table("meals").select("*").eq("user_id", user_id).gte(
        "consumed_at", date_start
    ).lte("consumed_at", date_end).execute()
    meals = meals_res.data or []
    
    # Exercises (via user_id)
    exercises_res = db.table("exercises").select("*").eq("user_id", user_id).gte(
        "logged_at", date_start
    ).lte("logged_at", date_end).execute()
    exercises = exercises_res.data or []
    
    # Medication logs (via patient_id)
    pill_logs_res = db.table("pill_logs").select(
        "*, patient_pills(pill_id, pills(name))"
    ).eq("patient_id", str(patient_id)).gte(
        "scheduled_time", date_start
    ).lte("scheduled_time", date_end).execute()
    pill_logs = pill_logs_res.data or []
    
    # Journal entries (via patient_id)
    journal_res = db.table("journal_logs").select("*").eq(
        "patient_id", str(patient_id)
    ).gte("logged_at", date_start).lte("logged_at", date_end).execute()
    journal_entries = journal_res.data or []
    
    # Get patient's care plans
    plans_res = db.table("patient_plans").select("*").eq(
        "patient_id", str(patient_id)
    ).eq("is_active", True).execute()
    plans = plans_res.data or []
    
    diet_plan = next((p for p in plans if p.get('plan_type') == 'diet'), None)
    exercise_plan = next((p for p in plans if p.get('plan_type') == 'exercise'), None)
    
    # Calculate totals
    total_calories = sum(m.get('total_calories', 0) or 0 for m in meals)
    total_protein = sum(m.get('total_protein', 0) or 0 for m in meals)
    total_carbs = sum(m.get('total_carbs', 0) or 0 for m in meals)
    total_fat = sum(m.get('total_fat', 0) or 0 for m in meals)
    total_exercise_min = sum(e.get('duration_minutes', 0) or 0 for e in exercises)
    
    # Build context for AI
    context = f"""
Patient: {patient_name}
Age: {patient.get('age', 'Unknown')}
Medical Conditions: {', '.join(patient.get('medical_conditions') or ['None listed'])}
Date: {target_date}

=== DOCTOR'S CARE PLANS ===
"""
    if diet_plan:
        context += f"Diet Plan: {diet_plan.get('title', 'Active')}\n"
        context += f"  Notes/Restrictions: {diet_plan.get('notes', 'None')}\n"
    else:
        context += "Diet Plan: None set\n"
        
    if exercise_plan:
        context += f"Exercise Plan: {exercise_plan.get('title', 'Active')}\n"
        context += f"  Notes: {exercise_plan.get('notes', 'None')}\n"
        if exercise_plan.get('exercise_minutes_target'):
            context += f"  Daily Target: {exercise_plan.get('exercise_minutes_target')} minutes\n"
        if exercise_plan.get('exercise_days_per_week'):
            context += f"  Days per Week: {exercise_plan.get('exercise_days_per_week')}\n"
    else:
        context += "Exercise Plan: None set\n"

    context += f"\n=== MEALS ({len(meals)} logged) ===\n"
    context += f"Total: {total_calories} cal, {total_protein}g protein, {total_carbs}g carbs, {total_fat}g fat\n"
    
    # Check for diet plan violations using AI
    violations = []
    if diet_plan and diet_plan.get('notes') and meals:
        diet_notes = diet_plan.get('notes', '')
        cerebras = get_cerebras_client()
        
        if cerebras:
            for meal in meals:
                meal_name = meal.get('name', 'Unknown')
                meal_analysis = meal.get('ai_analysis', '') if meal.get('ai_analysis') else ''
                meal_info = f"Meal: {meal_name}\nType: {meal.get('meal_type', 'meal')}\nAnalysis: {meal_analysis}"
                
                try:
                    violation_check = cerebras.chat.completions.create(
                        model="llama-3.3-70b",
                        messages=[
                            {
                                "role": "system",
                                "content": "You are a healthcare assistant. Determine if a meal violates dietary restrictions. Respond with only 'YES' if it violates, 'NO' if it doesn't."
                            },
                            {
                                "role": "user",
                                "content": f"Dietary restrictions: {diet_notes}\n\n{meal_info}\n\nDoes this meal violate the restrictions? Respond with only YES or NO."
                            }
                        ],
                        temperature=0.1,
                        max_tokens=10
                    )
                    
                    response_text = violation_check.choices[0].message.content.strip().upper()
                    if "YES" in response_text:
                        violations.append({
                            'meal': meal_name,
                            'meal_id': meal.get('id'),
                            'meal_type': meal.get('meal_type', 'meal'),
                            'time': meal.get('consumed_at', '')[:16],
                        })
                except:
                    # Fallback to keyword matching
                    diet_lower = diet_notes.lower()
                    meal_lower = f"{meal_name} {meal_analysis}".lower()
                    restriction_keywords = ['fried', 'sodium', 'salt', 'processed', 'sugar', 'dairy', 'gluten', 'alcohol', 'avoid']
                    for keyword in restriction_keywords:
                        if keyword in diet_lower and any(kw in meal_lower for kw in ['fried', 'sodium', 'salt', 'processed', 'sugar', 'dairy', 'gluten', 'alcohol']):
                            violations.append({
                                'meal': meal_name,
                                'meal_id': meal.get('id'),
                                'meal_type': meal.get('meal_type', 'meal'),
                                'time': meal.get('consumed_at', '')[:16],
                            })
                            break
    
    for meal in meals:
        context += f"- {meal.get('meal_type', 'meal').title()}: {meal.get('name', 'Unknown')} ({meal.get('total_calories', 0)} cal, {meal.get('total_protein', 0)}g protein) at {meal.get('consumed_at', '')[:16]}\n"
        if meal.get('ai_analysis'):
            context += f"  Analysis: {meal.get('ai_analysis')[:100]}...\n"
    
    if violations:
        context += f"\n=== DIET PLAN VIOLATIONS ===\n"
        for v in violations:
            context += f"- {v['meal_type'].title()}: {v['meal']} at {v['time']} - Violates dietary restrictions\n"
    
    context += f"\n=== EXERCISES ({len(exercises)} logged, {total_exercise_min} min total) ===\n"
    for ex in exercises:
        context += f"- {ex.get('exercise_type', ex.get('name', 'Exercise'))}: {ex.get('duration_minutes', 0)} min, {ex.get('calories_burned', 0)} cal burned\n"
    
    context += f"\n=== MEDICATIONS ===\n"
    taken = sum(1 for p in pill_logs if p.get('status') == 'taken')
    missed = sum(1 for p in pill_logs if p.get('status') == 'missed')
    late = sum(1 for p in pill_logs if p.get('status') == 'late')
    pending = sum(1 for p in pill_logs if p.get('status') == 'pending')
    
    for log in pill_logs:
        pill_name = "Unknown"
        if log.get('patient_pills') and log['patient_pills'].get('pills'):
            pill_name = log['patient_pills']['pills'].get('name', 'Unknown')
        context += f"- {pill_name}: {log.get('status', 'unknown')} (scheduled {log.get('scheduled_time', '')[:16]})\n"
    
    context += f"\n=== JOURNAL ENTRIES ({len(journal_entries)}) ===\n"
    for entry in journal_entries:
        mood = entry.get('mood', 'neutral')
        transcript = entry.get('transcript', '')[:200]
        context += f"- Mood: {mood}. Entry: {transcript}...\n"
    
    # Use Cerebras to generate summary
    cerebras = get_cerebras_client()
    if not cerebras:
        return {
            "summary": "AI summary unavailable - Cerebras not configured",
            "alerts": [],
            "stats": {
                "meals": len(meals),
                "exercises": len(exercises),
                "medications_taken": taken,
                "medications_missed": missed,
                "medications_late": late,
                "medications_pending": pending,
                "journal_entries": len(journal_entries)
            }
        }
    
    prompt = f"""You are a healthcare assistant helping clinicians monitor elderly patients. Based on the following patient data for {target_date}, provide:

1. An overall summary (2-3 sentences) of the patient's day
2. A journal summary (1-2 sentences) summarizing all journal entries and the patient's mood
3. A meals summary (1-2 sentences) summarizing what they ate and nutritional status
4. An activity summary (1-2 sentences) summarizing their exercise/activity
5. Any concerns or alerts the clinician should be aware of (return as JSON array)
   - Include alerts for diet plan violations if any are listed
   - Include alerts for missed medications, poor nutrition, negative mood, no activity, etc.

Patient Data:
{context}

Respond in this exact JSON format:
{{
  "summary": "Overall summary of the patient's day...",
  "journal_summary": "Summary of journal entries and mood...",
  "meals_summary": "Summary of meals and nutrition...",
  "activity_summary": "Summary of exercise and activity...",
  "alerts": [
    {{"severity": "high|medium|low", "type": "missed_dose|low_adherence|nutrition|inactivity|mood|diet_violation|other", "message": "Alert message"}}
  ]
}}

Only include alerts if there are genuine concerns. Be concise and compassionate."""

    try:
        response = cerebras.chat.completions.create(
            model="llama-3.3-70b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=500
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # Parse JSON response
        try:
            # Handle potential markdown code blocks
            if "```json" in ai_response:
                ai_response = ai_response.split("```json")[1].split("```")[0].strip()
            elif "```" in ai_response:
                ai_response = ai_response.split("```")[1].split("```")[0].strip()
            
            result = json.loads(ai_response)
            summary = result.get("summary", "No summary generated")
            journal_summary = result.get("journal_summary", "")
            meals_summary = result.get("meals_summary", "")
            activity_summary = result.get("activity_summary", "")
            alerts = result.get("alerts", [])
        except json.JSONDecodeError:
            summary = ai_response
            journal_summary = ""
            meals_summary = ""
            activity_summary = ""
            alerts = []
        
    except Exception as e:
        summary = f"Error generating summary: {str(e)}"
        journal_summary = ""
        meals_summary = ""
        activity_summary = ""
        alerts = []
    
    # Calculate stats
    total_calories = sum(m.get('total_calories', 0) or 0 for m in meals)
    total_exercise_min = sum(e.get('duration_minutes', 0) or 0 for e in exercises)
    calories_burned = sum(e.get('calories_burned', 0) or 0 for e in exercises)
    
    # Store summary in database
    summary_data = {
        "patient_id": str(patient_id),
        "user_id": user_id,
        "date": target_date,
        "ai_summary": summary,
        "ai_alerts": alerts,
        "total_calories_consumed": total_calories,
        "total_calories_burned": calories_burned,
        "total_exercise_minutes": total_exercise_min,
        "medications_taken": taken,
        "medications_scheduled": taken + missed + late + pending,
        "medication_adherence_score": (taken / (taken + missed + late)) * 100 if (taken + missed + late) > 0 else 100
    }
    
    # Upsert summary
    db.table("daily_summaries").upsert(
        summary_data,
        on_conflict="patient_id,date"
    ).execute()
    
    # Valid alert types in the database
    VALID_ALERT_TYPES = {'missed_dose', 'low_adherence', 'refill_needed', 'pattern_detected', 'vital_abnormal', 'missed_meal', 'inactivity', 'fall_detected'}
    
    # Map AI-generated types to valid database types
    def map_alert_type(ai_type: str) -> str:
        type_mapping = {
            'nutrition': 'pattern_detected',
            'mood': 'pattern_detected',
            'diet_violation': 'pattern_detected',
            'other': 'pattern_detected',
        }
        mapped = type_mapping.get(ai_type, ai_type)
        return mapped if mapped in VALID_ALERT_TYPES else 'pattern_detected'
    
    # Create alerts in alerts table if high or medium severity
    for alert in alerts:
        if alert.get("severity") in ["high", "medium"]:
            alert_data = {
                "patient_id": str(patient_id),
                "type": map_alert_type(alert.get("type", "pattern_detected")),
                "severity": alert.get("severity", "medium"),
                "title": f"Alert for {patient_name}",
                "message": alert.get("message", ""),
                "metadata": {"date": target_date, "source": "daily_summary"}
            }
            db.table("alerts").insert(alert_data).execute()
    
    # Also create alerts for diet violations directly
    if violations:
        for violation in violations:
            alert_data = {
                "patient_id": str(patient_id),
                "type": "pattern_detected",  # Diet violations mapped to pattern_detected
                "severity": "medium",
                "title": f"Diet Plan Violation: {violation['meal']}",
                "message": f"Patient consumed {violation['meal']} ({violation['meal_type']}) which violates dietary restrictions: {diet_plan.get('notes', '')[:100] if diet_plan else 'N/A'}",
                "metadata": {"date": target_date, "source": "diet_plan_check", "meal_id": violation.get('meal_id')}
            }
            db.table("alerts").insert(alert_data).execute()
    
    return {
        "date": target_date,
        "patient_name": patient_name,
        "summary": summary,
        "journal_summary": journal_summary,
        "meals_summary": meals_summary,
        "activity_summary": activity_summary,
        "alerts": alerts,
        "stats": {
            "meals": len(meals),
            "total_calories": total_calories,
            "exercises": len(exercises),
            "exercise_minutes": total_exercise_min,
            "calories_burned": calories_burned,
            "medications_taken": taken,
            "medications_missed": missed,
            "medications_late": late,
            "medications_pending": pending,
            "adherence_percent": round((taken / (taken + missed + late)) * 100) if (taken + missed + late) > 0 else 100,
            "journal_entries": len(journal_entries)
        }
    }


@router.get("/patients/{patient_id}/daily-summary")
async def get_daily_summary(
    patient_id: UUID,
    summary_date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format, defaults to today"),
    db: Client = Depends(get_db)
):
    """Get existing daily summary for a patient."""
    target_date = summary_date or date.today().isoformat()
    
    response = db.table("daily_summaries").select("*").eq(
        "patient_id", str(patient_id)
    ).eq("date", target_date).single().execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="No summary found for this date")
    
    return response.data


# ============================================
# PATIENT PLANS (Diet & Exercise)
# ============================================

@router.get("/patients/{patient_id}/plans")
async def get_patient_plans(
    patient_id: UUID,
    plan_type: Optional[str] = Query(None, description="Filter by plan type: diet or exercise"),
    db: Client = Depends(get_db)
):
    """Get all care plans for a patient."""
    query = db.table("patient_plans").select("*").eq("patient_id", str(patient_id)).eq("is_active", True)
    
    if plan_type:
        query = query.eq("plan_type", plan_type)
    
    response = query.order("created_at", desc=True).execute()
    
    return {"plans": response.data or []}


@router.post("/patients/{patient_id}/plans")
async def create_patient_plan(
    patient_id: UUID,
    plan: dict,
    db: Client = Depends(get_db)
):
    """Create a new care plan for a patient."""
    # Verify patient exists
    patient_res = db.table("patients").select("id").eq("id", str(patient_id)).single().execute()
    if not patient_res.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    plan_type = plan.get("plan_type", "diet")
    
    # Deactivate all existing active plans of the same type for this patient
    # This ensures only one active plan per type per patient
    db.table("patient_plans").update({"is_active": False}).eq(
        "patient_id", str(patient_id)
    ).eq("plan_type", plan_type).eq("is_active", True).execute()
    
    plan_data = {
        "patient_id": str(patient_id),
        "plan_type": plan_type,
        "title": plan.get("title"),
        "notes": plan.get("notes"),
        "goals": plan.get("goals", []),
        "restrictions": plan.get("restrictions", []),
        "calorie_target": plan.get("calorie_target"),
        "protein_target": plan.get("protein_target"),
        "carb_target": plan.get("carb_target"),
        "fat_target": plan.get("fat_target"),
        "exercise_minutes_target": plan.get("exercise_minutes_target"),
        "exercise_days_per_week": plan.get("exercise_days_per_week"),
        "is_active": True,
    }
    
    response = db.table("patient_plans").insert(plan_data).execute()
    
    return {"plan": response.data[0] if response.data else None}


@router.patch("/patients/{patient_id}/plans/{plan_id}")
async def update_patient_plan(
    patient_id: UUID,
    plan_id: UUID,
    updates: dict,
    db: Client = Depends(get_db)
):
    """Update a care plan."""
    response = db.table("patient_plans").update(updates).eq(
        "id", str(plan_id)
    ).eq("patient_id", str(patient_id)).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {"plan": response.data[0]}


@router.delete("/patients/{patient_id}/plans/{plan_id}")
async def delete_patient_plan(
    patient_id: UUID,
    plan_id: UUID,
    db: Client = Depends(get_db)
):
    """Delete (deactivate) a care plan."""
    response = db.table("patient_plans").update({"is_active": False}).eq(
        "id", str(plan_id)
    ).eq("patient_id", str(patient_id)).execute()
    
    return {"success": True}


# ============================================
# SUMMARIES (Journal, Meals, Exercises)
# ============================================

@router.post("/journal-entries/{entry_id}/summary")
async def generate_journal_summary(
    entry_id: UUID,
    db: Client = Depends(get_db)
):
    """Generate a concise summary for a journal entry."""
    entry_res = db.table("journal_logs").select("*").eq("id", str(entry_id)).single().execute()
    
    if not entry_res.data:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    entry = entry_res.data
    transcript = entry.get("transcript", "")
    
    if not transcript:
        return {"summary": "No transcript available"}
    
    cerebras = get_cerebras_client()
    if not cerebras:
        # Fallback: return first sentence
        import re
        first_sentence = re.split(r'[.!?]', transcript)[0] if transcript else ""
        return {"summary": first_sentence[:100] + "..." if len(first_sentence) > 100 else first_sentence}
    
    try:
        response = cerebras.chat.completions.create(
            model="llama-3.3-70b",
            messages=[
                {
                    "role": "system",
                    "content": "You are a healthcare assistant. Create a brief, professional summary (1-2 sentences) of patient journal entries for clinicians."
                },
                {
                    "role": "user",
                    "content": f"Summarize this journal entry:\n\n{transcript}"
                }
            ],
            temperature=0.3,
            max_tokens=100
        )
        
        summary = response.choices[0].message.content.strip()
        
        # Update entry with summary in ai_analysis
        current_analysis = entry.get("ai_analysis", {}) or {}
        if isinstance(current_analysis, str):
            try:
                current_analysis = json.loads(current_analysis)
            except:
                current_analysis = {}
        
        current_analysis["summary"] = summary
        db.table("journal_logs").update({"ai_analysis": current_analysis}).eq("id", str(entry_id)).execute()
        
        return {"summary": summary}
    except Exception as e:
        # Fallback
        import re
        first_sentence = re.split(r'[.!?]', transcript)[0] if transcript else ""
        return {"summary": first_sentence[:100] + "..." if len(first_sentence) > 100 else first_sentence}


@router.post("/meals/{meal_id}/summary")
async def generate_meal_summary(
    meal_id: UUID,
    db: Client = Depends(get_db)
):
    """Generate a summary for a meal entry."""
    meal_res = db.table("meals").select("*").eq("id", str(meal_id)).single().execute()
    
    if not meal_res.data:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    meal = meal_res.data
    name = meal.get("name", "")
    meal_type = meal.get("meal_type", "")
    calories = meal.get("total_calories", 0)
    protein = meal.get("total_protein", 0)
    carbs = meal.get("total_carbs", 0)
    fat = meal.get("total_fat", 0)
    ai_analysis = meal.get("ai_analysis", "")
    
    context = f"Meal: {name} ({meal_type})\nCalories: {calories}, Protein: {protein}g, Carbs: {carbs}g, Fat: {fat}g"
    if ai_analysis:
        context += f"\nAnalysis: {ai_analysis[:200]}"
    
    cerebras = get_cerebras_client()
    if not cerebras:
        return {"summary": f"{name} - {calories} cal, {protein}g protein"}
    
    try:
        response = cerebras.chat.completions.create(
            model="llama-3.3-70b",
            messages=[
                {
                    "role": "system",
                    "content": "You are a healthcare assistant. Create a brief summary (1 sentence) of meal entries highlighting nutritional value and any concerns."
                },
                {
                    "role": "user",
                    "content": f"Summarize this meal:\n\n{context}"
                }
            ],
            temperature=0.3,
            max_tokens=80
        )
        
        summary = response.choices[0].message.content.strip()
        return {"summary": summary}
    except Exception as e:
        return {"summary": f"{name} - {calories} cal, {protein}g protein"}


@router.post("/exercises/{exercise_id}/summary")
async def generate_exercise_summary(
    exercise_id: UUID,
    db: Client = Depends(get_db)
):
    """Generate a summary for an exercise entry."""
    exercise_res = db.table("exercises").select("*").eq("id", str(exercise_id)).single().execute()
    
    if not exercise_res.data:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    exercise = exercise_res.data
    name = exercise.get("name") or exercise.get("exercise_type", "")
    duration = exercise.get("duration_minutes", 0)
    calories = exercise.get("calories_burned", 0)
    intensity = exercise.get("intensity", "")
    
    context = f"Exercise: {name}\nDuration: {duration} min, Calories burned: {calories}, Intensity: {intensity}"
    
    cerebras = get_cerebras_client()
    if not cerebras:
        return {"summary": f"{name} - {duration} min, {calories} cal"}
    
    try:
        response = cerebras.chat.completions.create(
            model="llama-3.3-70b",
            messages=[
                {
                    "role": "system",
                    "content": "You are a healthcare assistant. Create a brief summary (1 sentence) of exercise entries highlighting activity level and benefits."
                },
                {
                    "role": "user",
                    "content": f"Summarize this exercise:\n\n{context}"
                }
            ],
            temperature=0.3,
            max_tokens=80
        )
        
        summary = response.choices[0].message.content.strip()
        return {"summary": summary}
    except Exception as e:
        return {"summary": f"{name} - {duration} min, {calories} cal"}
