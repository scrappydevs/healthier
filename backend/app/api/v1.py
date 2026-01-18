"""API v1 routes."""

from typing import Optional
from uuid import UUID
from datetime import date
import json

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
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
    care_setting: Optional[str] = Query(None, description="Filter by care setting: 'in_clinic' or 'at_home'"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Client = Depends(get_db),
):
    """List patients with adherence data."""
    service = PatientService(db)
    patients, total = await service.get_patients(
        clinician_id=clinician_id,
        status=status,
        care_setting=care_setting,
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
    patient_id_str = str(patient_id)
    
    # First get the patient's user_id
    patient_response = db.table("patients").select("user_id").eq("id", patient_id_str).single().execute()
    if not patient_response.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    user_id = patient_response.data.get("user_id")
    if not user_id:
        return {"meals": [], "total": 0}
    
    # Query meals by user_id
    query = db.table("meals").select("*").eq("user_id", user_id).order("consumed_at", desc=True)
    
    if date:
        # Filter by date using string-based comparison (timezone-agnostic)
        # This matches the approach used in generate_daily_summary
        date_start = f"{date}T00:00:00"
        date_end = f"{date}T23:59:59"
        query = query.gte("consumed_at", date_start).lte("consumed_at", date_end)
    
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
    patient_id_str = str(patient_id)
    
    # Query exercises by patient_id (primary) or user_id (fallback)
    # First try patient_id directly - this is the most reliable
    query = db.table("exercises").select("*").eq("patient_id", patient_id_str)
    
    response = query.order("logged_at", desc=True).execute()
    exercises = response.data or []
    
    # If no results with patient_id, try user_id as fallback
    if not exercises:
        patient_response = db.table("patients").select("user_id").eq("id", patient_id_str).single().execute()
        if patient_response.data:
            user_id = patient_response.data.get("user_id")
            if user_id:
                query = db.table("exercises").select("*").eq("user_id", user_id)
                response = query.order("logged_at", desc=True).execute()
                exercises = response.data or []
    
    # Apply date filter if provided (timezone-agnostic string filtering)
    if date:
        # Filter using simple string comparison matching generate_daily_summary
        filtered_exercises = []
        for e in exercises:
            logged_at = e.get("logged_at", "")
            if logged_at and logged_at.startswith(date):
                filtered_exercises.append(e)
        exercises = filtered_exercises
    
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
    medications = []
    
    if user_id:
        # Query medications by user_id (iOS self-logged)
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
    
    # Get clinician-assigned medications from patient_pills
    patient_pills_response = db.table("patient_pills").select("*, pills(*)").eq("patient_id", str(patient_id)).eq("is_active", True).execute()
    assigned_medications = patient_pills_response.data or []
    
    return {
        "medications": medications,
        "assigned_medications": assigned_medications,
        "total": len(assigned_medications),  # Count clinician-assigned active prescriptions
    }


@router.post("/patients/{patient_id}/medications/assign")
async def assign_patient_medication(
    patient_id: UUID,
    pill_id: str = Query(...),
    frequency: str = Query(...),
    days_of_week: str = Query(...),
    times_of_day: str = Query(...),
    db: Client = Depends(get_db)
):
    """Assign a medication to a patient."""
    # Verify patient exists
    patient_res = db.table("patients").select("id, user_id").eq("id", str(patient_id)).single().execute()
    if not patient_res.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get pill info to extract dosage
    pill_res = db.table("pills").select("name, strength, unit, dosage_form, instructions").eq("id", pill_id).single().execute()
    if not pill_res.data:
        raise HTTPException(status_code=404, detail="Pill not found")
    
    dosage_amount = pill_res.data.get("strength", 1)  # Default to 1 if not specified
    
    # Day name to integer mapping (0=Mon, 1=Tue, ..., 6=Sun)
    day_mapping = {
        "Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, 
        "Fri": 4, "Sat": 5, "Sun": 6
    }
    
    # Parse arrays from comma-separated strings
    day_names = [d.strip() for d in days_of_week.split(",") if d.strip()]
    days_list = [day_mapping.get(d, 0) for d in day_names]  # Convert to integers
    times_list = [t.strip() for t in times_of_day.split(",") if t.strip()]
    
    # Create patient_pills record
    patient_pill_data = {
        "patient_id": str(patient_id),
        "pill_id": pill_id,
        "dosage_amount": dosage_amount,
        "frequency": frequency,
        "days_of_week": days_list,
        "times_of_day": times_list,
        "is_active": True,
        "start_date": date.today().isoformat(),
    }
    
    existing_res = (
        db.table("patient_pills")
        .select("id")
        .eq("patient_id", str(patient_id))
        .eq("pill_id", pill_id)
        .eq("is_active", True)
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )
    existing_id = existing_res.data[0]["id"] if existing_res.data else None

    if existing_id:
        patient_pill_id = existing_id
        result = (
            db.table("patient_pills")
            .update(
                {
                    "dosage_amount": dosage_amount,
                    "frequency": frequency,
                    "days_of_week": days_list,
                    "times_of_day": times_list,
                    "is_active": True,
                }
            )
            .eq("id", patient_pill_id)
            .execute()
        )
    else:
        result = db.table("patient_pills").insert(patient_pill_data).execute()
        patient_pill_id = result.data[0]["id"] if result.data else None
    
    # Create pill_logs for today's scheduled times
    if patient_pill_id and times_list:
        from datetime import datetime, timedelta
        today = date.today()
        
        # If days_list is empty and it's a daily medication, treat as every day
        effective_days = days_list if len(days_list) > 0 else ([0,1,2,3,4,5,6] if "daily" in frequency else [])
        
        # Check if today is in the allowed days_of_week
        today_weekday = today.weekday()  # Python: 0=Monday, 6=Sunday
        if today_weekday in effective_days:
            # Create a pill_log for each scheduled time today
            from datetime import timezone
            for time_str in times_list:
                # Parse time and create scheduled datetime
                # Assume times_of_day are in US Eastern Time (EST/EDT)
                hour, minute = map(int, time_str.split(":"))
                
                # Create the local datetime (what the patient sees: "08:00" = 8am local)
                scheduled_local = datetime.combine(today, datetime.min.time().replace(hour=hour, minute=minute))
                
                # Convert to UTC: EST is UTC-5, so 08:00 EST = 13:00 UTC
                # Note: This assumes EST for simplicity; production should use pytz/zoneinfo
                utc_offset_hours = 5  # EST offset from UTC
                scheduled_utc = scheduled_local.replace(tzinfo=timezone.utc) + timedelta(hours=utc_offset_hours)
                
                # Determine status using local time comparison
                now_local = datetime.now()
                if scheduled_local < now_local:
                    status = "missed"
                else:
                    status = "pending"
                
                pill_log_data = {
                    "patient_pill_id": patient_pill_id,
                    "patient_id": str(patient_id),
                    "scheduled_time": scheduled_utc.isoformat(),
                    "status": status,
                }
                
                db.table("pill_logs").insert(pill_log_data).execute()

        # Mirror clinician-assigned schedule into iOS-facing "medications" table.
        # The iOS app reads from "medications" and schedules reminders from "reminder_times".
        try:
            user_id = patient_res.data.get("user_id")
            if user_id:
                pill_name = pill_res.data.get("name") or "Medication"
                pill_strength = (pill_res.data.get("strength") or "").strip()
                pill_unit = (pill_res.data.get("unit") or "").strip()

                dosage_text = pill_strength
                if pill_strength and pill_unit and not pill_strength.lower().endswith(pill_unit.lower()):
                    dosage_text = f"{pill_strength}{pill_unit}"

                def map_frequency_for_ios(value: str) -> str:
                    v = (value or "").strip().lower()
                    if v in ("once_daily", "daily"):
                        return "Daily"
                    if v in ("twice_daily", "twice daily"):
                        return "Twice Daily"
                    if v in ("three_times_daily", "three times daily"):
                        return "Three Times Daily"
                    if v == "weekly":
                        return "Weekly"
                    if v == "as_needed":
                        return "As Needed"
                    return "Custom"

                ios_medication = {
                    # Use patient_pills.id so we can update the same record later if needed
                    "id": patient_pill_id,
                    "user_id": user_id,
                    "name": pill_name,
                    "dosage": dosage_text or (pill_unit or ""),
                    "frequency": map_frequency_for_ios(frequency),
                    "form": (pill_res.data.get("dosage_form") or "tablet").strip().lower(),
                    "instructions": pill_res.data.get("instructions"),
                    "prescribed_by": None,
                    # Store times as "HH:mm" strings - the iOS app can parse these into daily reminders
                    "reminder_times": times_list,
                    "is_active": True,
                }

                db.table("medications").upsert(ios_medication).execute()
        except Exception as e:
            # Do not fail clinician assignment if the iOS mirror fails, but log for debugging.
            print(f"Failed to mirror medication to iOS table: {e}")
    
    patient_pill_row = result.data[0] if result.data else None
    if not patient_pill_row and patient_pill_id:
        try:
            patient_pill_row = (
                db.table("patient_pills")
                .select("*")
                .eq("id", patient_pill_id)
                .single()
                .execute()
                .data
            )
        except Exception:
            patient_pill_row = None

    return {"success": True, "patient_pill": patient_pill_row}


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
    patient_id_str = str(patient_id)
    query = db.table("journal_logs").select(
        "id, patient_id, transcript, duration_seconds, "
        "tags, mood, sentiment_score, ai_analysis, metadata, logged_at, created_at"
    ).eq("patient_id", patient_id_str)
    
    # Use simple string-based date filtering (timezone-agnostic)
    if start_date:
        query = query.gte("logged_at", f"{start_date}T00:00:00")
    
    if end_date:
        query = query.lte("logged_at", f"{end_date}T23:59:59")
    
    response = query.order("logged_at", desc=True).execute()
    
    return {
        "entries": response.data or [],
        "total": len(response.data or [])
    }


@router.get("/patients/{patient_id}/pill-logs")
async def get_patient_pill_logs(
    patient_id: UUID,
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    db: Client = Depends(get_db)
):
    """Get pill logs for a patient, optionally filtered by date."""
    patient_id_str = str(patient_id)
    
    query = db.table("pill_logs").select(
        "id, patient_id, patient_pill_id, scheduled_time, taken_time, status, "
        "patient_pills(pill_id, dosage_amount, frequency, times_of_day, pills(name, strength, unit, dosage_form)), "
        "created_at"
    ).eq("patient_id", patient_id_str)
    
    # Filter by date if provided
    if date:
        date_start = f"{date}T00:00:00"
        date_end = f"{date}T23:59:59"
        query = query.gte("scheduled_time", date_start).lte("scheduled_time", date_end)
    
    # Check patient_pills to see if medications are assigned (needed for generating logs if none exist)
    patient_pills_response = db.table("patient_pills").select("id, patient_id, pill_id, is_active, times_of_day, frequency, days_of_week").eq("patient_id", patient_id_str).eq("is_active", True).execute()
    
    response = query.order("scheduled_time", desc=False).execute()
    
    # If no pill_logs exist but patient has active medications, generate them for the requested date
    if date and len(response.data or []) == 0 and len(patient_pills_response.data or []) > 0:
        from datetime import datetime
        target_date = __import__('datetime').date.fromisoformat(date)
        target_weekday = target_date.weekday()
        
        generated_logs = []
        for patient_pill in patient_pills_response.data:
            days_of_week = patient_pill.get("days_of_week") or []
            times_of_day = patient_pill.get("times_of_day") or []
            frequency = patient_pill.get("frequency", "")
            
            # If days_of_week is empty and it's a daily medication, treat as every day
            if len(days_of_week) == 0 and "daily" in frequency:
                days_of_week = [0, 1, 2, 3, 4, 5, 6]  # All days
            
            # Check if target date is in the schedule
            if target_weekday in days_of_week:
                for time_str in times_of_day:
                    # Parse time and create scheduled datetime
                    hour, minute = map(int, time_str.split(":"))
                    scheduled_datetime = datetime.combine(target_date, datetime.min.time().replace(hour=hour, minute=minute))
                    
                    # Determine status
                    now = datetime.now()
                    if scheduled_datetime < now:
                        status = "missed"
                    else:
                        status = "pending"
                    
                    pill_log_data = {
                        "patient_pill_id": patient_pill["id"],
                        "patient_id": patient_id_str,
                        "scheduled_time": scheduled_datetime.isoformat(),
                        "status": status,
                    }
                    
                    # Insert into database
                    insert_result = db.table("pill_logs").insert(pill_log_data).execute()
                    if insert_result.data:
                        generated_logs.append(insert_result.data[0])
        
        # Re-query to get the full data with joins
        if generated_logs:
            response = query.order("scheduled_time", desc=False).execute()
    
    return {
        "logs": response.data or [],
        "total": len(response.data or [])
    }


@router.post("/patients/{patient_id}/journal/summary")
async def generate_journal_day_summary(
    patient_id: UUID,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    force_refresh: bool = Query(False, description="Force regeneration even if cached"),
    db: Client = Depends(get_db)
):
    """Generate an AI summary of what the patient talked about in their journal entries for a specific day.
    
    Uses caching to avoid regenerating when no new entries have been added.
    """
    
    # Get journal entries for the day
    date_start = f"{date}T00:00:00"
    date_end = f"{date}T23:59:59"
    
    response = db.table("journal_logs").select(
        "id, transcript, mood, logged_at"
    ).eq("patient_id", str(patient_id)).gte(
        "logged_at", date_start
    ).lte("logged_at", date_end).order("logged_at", desc=False).execute()
    
    entries = response.data or []
    current_count = len(entries)
    
    if current_count == 0:
        return {
            "summary": "No journal entries recorded for this day.",
            "entry_count": 0,
            "cached": False
        }
    
    # Check for cached summary (unless force_refresh is True)
    if not force_refresh:
        cached_res = db.table("daily_summaries").select(
            "journal_summary, entry_counts"
        ).eq("patient_id", str(patient_id)).eq("date", date).maybe_single().execute()
        
        if cached_res.data:
            cached = cached_res.data
            cached_counts = cached.get("entry_counts") or {}
            cached_journal_count = cached_counts.get("journal", 0)
            
            # If journal count matches and we have a summary, return cached
            if cached_journal_count == current_count and cached.get("journal_summary"):
                return {
                    "summary": cached.get("journal_summary"),
                    "entry_count": current_count,
                    "cached": True
                }
    
    # Build context from all entries
    context = ""
    for entry in entries:
        transcript = entry.get("transcript", "")
        mood = entry.get("mood", "neutral")
        logged_at = entry.get("logged_at", "")[:16]
        context += f"[{logged_at}] Mood: {mood}\n\"{transcript}\"\n\n"
    
    # Use Cerebras to summarize what they talked about
    cerebras = get_cerebras_client()
    if not cerebras:
        return {
            "summary": "AI summary unavailable - Cerebras not configured",
            "entry_count": current_count,
            "cached": False
        }
    
    prompt = f"""You are a healthcare assistant. The patient recorded {current_count} voice journal {"entry" if current_count == 1 else "entries"} today.

Your task: Summarize WHAT the patient talked about. Synthesize the topics, experiences, thoughts, and feelings they shared into a cohesive 2-3 sentence summary.

DO NOT just list snippets or count entries. Focus on the substance of what they discussed.

Journal entries:
{context}

Provide a clear, natural summary of what the patient talked about:"""

    try:
        response = cerebras.chat.completions.create(
            model="llama-3.3-70b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=200
        )
        
        summary = response.choices[0].message.content.strip()
    except Exception as e:
        summary = f"Error generating summary: {str(e)}"
    
    # Store/update summary in daily_summaries table
    # First check if record exists
    from datetime import datetime as dt
    existing = db.table("daily_summaries").select("id, entry_counts").eq(
        "patient_id", str(patient_id)
    ).eq("date", date).maybe_single().execute()
    
    if existing.data:
        # Update existing record
        existing_counts = existing.data.get("entry_counts") or {}
        existing_counts["journal"] = current_count
        
        db.table("daily_summaries").update({
            "journal_summary": summary,
            "entry_counts": existing_counts,
            "generated_at": dt.utcnow().isoformat()
        }).eq("id", existing.data.get("id")).execute()
    else:
        # Create new record (get patient info first)
        patient_res = db.table("patients").select("user_id").eq("id", str(patient_id)).maybe_single().execute()
        user_id = patient_res.data.get("user_id") if patient_res.data else None
        
        db.table("daily_summaries").insert({
            "patient_id": str(patient_id),
            "user_id": user_id,
            "date": date,
            "journal_summary": summary,
            "entry_counts": {"journal": current_count},
            "generated_at": dt.utcnow().isoformat()
        }).execute()
    
    return {
        "summary": summary,
        "entry_count": current_count,
        "cached": False
    }


# ============================================
# DAILY AI SUMMARY
# ============================================

@router.post("/patients/{patient_id}/daily-summary")
async def generate_daily_summary(
    patient_id: UUID,
    summary_date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format, defaults to today"),
    force_refresh: bool = Query(False, description="Force regeneration even if cached"),
    db: Client = Depends(get_db)
):
    """Generate an AI-powered daily summary for a patient using Cerebras.
    
    Uses caching to avoid regenerating when no new data has been added.
    Set force_refresh=true to bypass the cache.
    """
    
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
    
    # Calculate current entry counts for cache comparison
    current_counts = {
        "meals": len(meals),
        "exercises": len(exercises),
        "journal": len(journal_entries),
        "pill_logs": len(pill_logs)
    }
    
    # Check for existing cached summary (unless force_refresh is True)
    if not force_refresh:
        cached_res = db.table("daily_summaries").select("*").eq(
            "patient_id", str(patient_id)
        ).eq("date", target_date).maybe_single().execute()
        
        if cached_res.data:
            cached = cached_res.data
            cached_counts = cached.get("entry_counts") or {}
            
            # Check if entry counts match (no new data added)
            if (cached_counts.get("meals") == current_counts["meals"] and
                cached_counts.get("exercises") == current_counts["exercises"] and
                cached_counts.get("journal") == current_counts["journal"] and
                cached_counts.get("pill_logs") == current_counts["pill_logs"] and
                cached.get("ai_summary")):
                
                # Return cached summary - no API call needed
                taken = sum(1 for p in pill_logs if p.get('status') == 'taken')
                missed = sum(1 for p in pill_logs if p.get('status') == 'missed')
                late = sum(1 for p in pill_logs if p.get('status') == 'late')
                pending = sum(1 for p in pill_logs if p.get('status') == 'pending')
                total_calories = sum(m.get('total_calories', 0) or 0 for m in meals)
                total_exercise_min = sum(e.get('duration_minutes', 0) or 0 for e in exercises)
                calories_burned = sum(e.get('calories_burned', 0) or 0 for e in exercises)
                
                return {
                    "date": target_date,
                    "patient_name": patient_name,
                    "summary": cached.get("ai_summary", ""),
                    "journal_summary": cached.get("journal_summary", ""),
                    "meals_summary": cached.get("meals_summary", ""),
                    "activity_summary": cached.get("activity_summary", ""),
                    "alerts": cached.get("ai_alerts", []),
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
                        "journal_entries": len(journal_entries),
                        "med_adherence_pct": round((taken / (taken + missed + late) * 100) if (taken + missed + late) > 0 else 100, 1)
                    },
                    "cached": True  # Indicate this was a cached response
                }
    
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
        if diet_plan.get('calorie_target'):
            context += f"  Daily Calorie Target: {diet_plan.get('calorie_target')} cal\n"
        if diet_plan.get('protein_target'):
            context += f"  Protein Target: {diet_plan.get('protein_target')}g\n"
        if diet_plan.get('carb_target'):
            context += f"  Carb Target: {diet_plan.get('carb_target')}g\n"
        if diet_plan.get('fat_target'):
            context += f"  Fat Target: {diet_plan.get('fat_target')}g\n"
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
    context += f"Total Consumed: {total_calories} cal, {total_protein}g protein, {total_carbs}g carbs, {total_fat}g fat\n"
    if diet_plan:
        if diet_plan.get('calorie_target'):
            diff = total_calories - diet_plan.get('calorie_target', 0)
            context += f"Calorie Target: {diet_plan.get('calorie_target')} cal (actual: {total_calories} cal, difference: {diff:+d} cal)\n"
        if diet_plan.get('protein_target'):
            diff = total_protein - diet_plan.get('protein_target', 0)
            context += f"Protein Target: {diet_plan.get('protein_target')}g (actual: {total_protein}g, difference: {diff:+.0f}g)\n"
        if diet_plan.get('carb_target'):
            diff = total_carbs - diet_plan.get('carb_target', 0)
            context += f"Carb Target: {diet_plan.get('carb_target')}g (actual: {total_carbs}g, difference: {diff:+.0f}g)\n"
        if diet_plan.get('fat_target'):
            diff = total_fat - diet_plan.get('fat_target', 0)
            context += f"Fat Target: {diet_plan.get('fat_target')}g (actual: {total_fat}g, difference: {diff:+.0f}g)\n"
    context += "\n"
    
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
    
    # Get prescribed exercises for this patient
    prescribed_exercises = db.table("prescribed_exercises").select(
        "*, exercise_catalog(name, category)"
    ).eq("patient_id", str(patient_id)).eq("is_active", True).execute()
    prescribed_list = prescribed_exercises.data or []
    
    context += f"\n=== PRESCRIBED EXERCISES ({len(prescribed_list)} assigned) ===\n"
    for px in prescribed_list:
        ex_name = px.get("exercise_catalog", {}).get("name", "Unknown")
        ex_category = px.get("exercise_catalog", {}).get("category", "")
        freq = px.get("frequency", "daily").replace("_", " ")
        sets_reps = ""
        if px.get("sets") and px.get("reps"):
            sets_reps = f"{px['sets']} sets × {px['reps']} reps"
        elif px.get("duration_seconds"):
            sets_reps = f"{px['duration_seconds'] // 60} minutes"
        context += f"- {ex_name} ({ex_category}): {sets_reps}, frequency: {freq}\n"
        if px.get("form_notes"):
            context += f"  Special instructions: {px['form_notes']}\n"
    
    context += f"\n=== LOGGED EXERCISES ({len(exercises)} logged, {total_exercise_min} min total) ===\n"
    
    # Match logged exercises to prescribed ones
    prescribed_names = {px.get("exercise_catalog", {}).get("name", "").lower(): px for px in prescribed_list}
    completed_prescribed = set()
    off_plan_exercises = []
    
    for ex in exercises:
        ex_type = (ex.get('exercise_type') or ex.get('name') or 'Exercise').lower()
        matched = False
        for name, px in prescribed_names.items():
            if name in ex_type or ex_type in name:
                completed_prescribed.add(name)
                matched = True
                form_score = ex.get('form_score', 'N/A')
                pose_analysis = ex.get('pose_analysis')
                form_info = ""
                if pose_analysis and isinstance(pose_analysis, dict) and pose_analysis.get('summary'):
                    form_info = f" | Form: {pose_analysis['summary'][:100]}"
                context += f"- [ON-PLAN] {ex.get('exercise_type', ex.get('name', 'Exercise'))}: {ex.get('duration_minutes', 0)} min, {ex.get('calories_burned', 0)} cal{form_info}\n"
                break
        
        if not matched:
            off_plan_exercises.append(ex)
            context += f"- [OFF-PLAN] {ex.get('exercise_type', ex.get('name', 'Exercise'))}: {ex.get('duration_minutes', 0)} min, {ex.get('calories_burned', 0)} cal (not in prescribed plan)\n"
    
    # Report missed prescribed exercises
    missed_prescribed = [name for name in prescribed_names.keys() if name not in completed_prescribed]
    if missed_prescribed:
        context += f"\n=== MISSED PRESCRIBED EXERCISES ({len(missed_prescribed)}) ===\n"
        for name in missed_prescribed:
            context += f"- {name.title()}: Not completed today\n"
    
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
        # Include full transcript (up to 500 chars) for better summarization
        transcript = entry.get('transcript', '')[:500]
        logged_at = entry.get('logged_at', '')[:16]
        context += f"- [{logged_at}] Mood: {mood}\n  What they said: \"{transcript}\"\n"
    
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
    
    prompt = f"""You are a healthcare assistant. Analyze the patient data for {target_date} and provide detailed summaries that compare their actual behavior against their prescribed care plans.

CRITICAL INSTRUCTIONS:
- Compare what the patient DID vs. what they were SUPPOSED TO DO according to their care plans
- Be specific about adherence (followed plan vs. didn't follow plan)
- Highlight gaps between prescribed targets and actual behavior
- Include relevant numbers (calories, minutes, medications, etc.)
- For exercises: Report which prescribed exercises were completed, which were missed, and if any off-plan exercises were done
- If pose analysis shows form issues (asymmetry, poor angles), flag as an alert
- Only flag genuine clinical concerns as alerts

Patient Data:
{context}

Respond in this exact JSON format:
{{
  "summary": "2-3 sentences summarizing the day's key highlights, comparing actual behavior to care plans where applicable. Include specific numbers.",
  "journal_summary": "Summarize WHAT the patient talked about across their journal entries - the topics, experiences, and thoughts they shared. Synthesize the content into a cohesive summary. Do NOT just count entries or list snippets. If 0 entries, say 'No journal entries recorded.'",
  "meals_summary": "2-3 sentences on nutrition. Compare actual intake to diet plan if one exists. Include specific numbers (calories, meals logged). Mention any violations of dietary restrictions. If 0 meals, say 'No meals logged.'",
  "activity_summary": "2-3 sentences on exercise. Compare logged exercises to PRESCRIBED exercises. State which prescribed exercises were completed and which were missed. If off-plan exercises were done, mention them. If pose analysis shows form concerns, note them. If 0 exercises, say 'No exercise logged.'",
  "alerts": [
    {{"severity": "high|medium|low", "type": "missed_dose|low_adherence|nutrition|inactivity|mood|diet_violation|exercise_form|missed_exercise|off_plan_exercise|other", "message": "Specific alert describing the issue and why it matters"}}
  ]
}}

Be clinical, specific, and comparison-focused. Explicitly state whether the patient followed their care plans or not."""

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
    
    # Store summary in database with entry counts for cache invalidation
    from datetime import datetime as dt
    summary_data = {
        "patient_id": str(patient_id),
        "user_id": user_id,
        "date": target_date,
        "ai_summary": summary,
        "journal_summary": journal_summary,
        "meals_summary": meals_summary,
        "activity_summary": activity_summary,
        "ai_alerts": alerts,
        "entry_counts": current_counts,  # Store counts for cache comparison
        "generated_at": dt.utcnow().isoformat(),
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
        },
        "cached": False  # Freshly generated, not from cache
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
# EXERCISE CATALOG & PRESCRIBED EXERCISES
# ============================================

@router.get("/exercise-catalog")
async def get_exercise_catalog(
    category: Optional[str] = None,
    db: Client = Depends(get_db)
):
    """Get all exercises from the catalog, optionally filtered by category."""
    query = db.table("exercise_catalog").select("*").order("category").order("name")
    
    if category:
        query = query.eq("category", category)
    
    response = query.execute()
    return {"exercises": response.data or []}


@router.get("/patients/{patient_id}/prescribed-exercises")
async def get_prescribed_exercises(
    patient_id: UUID,
    include_inactive: bool = False,
    db: Client = Depends(get_db)
):
    """Get prescribed exercises for a patient with catalog details."""
    query = db.table("prescribed_exercises").select(
        "*, exercise_catalog(*)"
    ).eq("patient_id", str(patient_id))
    
    if not include_inactive:
        query = query.eq("is_active", True)
    
    response = query.order("priority").execute()
    return {"prescribed_exercises": response.data or []}


@router.post("/patients/{patient_id}/prescribed-exercises")
async def prescribe_exercise(
    patient_id: UUID,
    exercise_id: UUID,
    sets: Optional[int] = None,
    reps: Optional[int] = None,
    duration_seconds: Optional[int] = None,
    frequency: str = "daily",
    form_notes: Optional[str] = None,
    priority: int = 1,
    db: Client = Depends(get_db)
):
    """Prescribe an exercise to a patient."""
    # Check if already prescribed and active
    existing = db.table("prescribed_exercises").select("id").eq(
        "patient_id", str(patient_id)
    ).eq("exercise_id", str(exercise_id)).eq("is_active", True).execute()
    
    if existing.data:
        raise HTTPException(status_code=400, detail="Exercise already prescribed to this patient")
    
    # Get defaults from catalog if not specified
    if sets is None and reps is None and duration_seconds is None:
        catalog = db.table("exercise_catalog").select("*").eq("id", str(exercise_id)).single().execute()
        if catalog.data:
            sets = catalog.data.get("default_sets")
            reps = catalog.data.get("default_reps")
            duration_seconds = catalog.data.get("default_duration_seconds")
    
    prescription_data = {
        "patient_id": str(patient_id),
        "exercise_id": str(exercise_id),
        "sets": sets,
        "reps": reps,
        "duration_seconds": duration_seconds,
        "frequency": frequency,
        "form_notes": form_notes,
        "priority": priority,
        "is_active": True
    }
    
    response = db.table("prescribed_exercises").insert(prescription_data).execute()
    
    # Fetch with catalog details
    full_response = db.table("prescribed_exercises").select(
        "*, exercise_catalog(*)"
    ).eq("id", response.data[0]["id"]).single().execute()
    
    return {"prescribed_exercise": full_response.data}


@router.patch("/patients/{patient_id}/prescribed-exercises/{prescription_id}")
async def update_prescribed_exercise(
    patient_id: UUID,
    prescription_id: UUID,
    updates: dict,
    db: Client = Depends(get_db)
):
    """Update a prescribed exercise."""
    allowed_fields = {"sets", "reps", "duration_seconds", "frequency", "form_notes", "priority", "is_active"}
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    filtered_updates["updated_at"] = "now()"
    
    response = db.table("prescribed_exercises").update(filtered_updates).eq(
        "id", str(prescription_id)
    ).eq("patient_id", str(patient_id)).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    # Fetch with catalog details
    full_response = db.table("prescribed_exercises").select(
        "*, exercise_catalog(*)"
    ).eq("id", str(prescription_id)).single().execute()
    
    return {"prescribed_exercise": full_response.data}


@router.delete("/patients/{patient_id}/prescribed-exercises/{prescription_id}")
async def remove_prescribed_exercise(
    patient_id: UUID,
    prescription_id: UUID,
    db: Client = Depends(get_db)
):
    """Remove (deactivate) a prescribed exercise."""
    response = db.table("prescribed_exercises").update({
        "is_active": False,
        "updated_at": "now()"
    }).eq("id", str(prescription_id)).eq("patient_id", str(patient_id)).execute()
    
    return {"success": True}


@router.get("/patients/{patient_id}/exercise-adherence")
async def get_exercise_adherence(
    patient_id: UUID,
    date: Optional[str] = None,
    db: Client = Depends(get_db)
):
    """Get exercise adherence summary for a patient on a given date."""
    from datetime import datetime, timedelta
    
    if date:
        target_date = datetime.fromisoformat(date).date()
    else:
        target_date = datetime.now().date()
    
    start_of_day = datetime.combine(target_date, datetime.min.time()).isoformat()
    end_of_day = datetime.combine(target_date, datetime.max.time()).isoformat()
    
    # Get prescribed exercises
    prescribed = db.table("prescribed_exercises").select(
        "*, exercise_catalog(name, category)"
    ).eq("patient_id", str(patient_id)).eq("is_active", True).execute()
    
    # Get logged exercises for the day
    logged = db.table("exercises").select("*").eq(
        "patient_id", str(patient_id)
    ).gte("logged_at", start_of_day).lte("logged_at", end_of_day).execute()
    
    prescribed_list = prescribed.data or []
    logged_list = logged.data or []
    
    # Match logged exercises to prescriptions
    completed = []
    missed = []
    off_plan = []
    
    prescribed_names = {p["exercise_catalog"]["name"].lower(): p for p in prescribed_list}
    
    for log in logged_list:
        exercise_type = (log.get("exercise_type") or log.get("name") or "").lower()
        
        # Check if it matches any prescribed exercise
        matched = False
        for name, prescription in prescribed_names.items():
            if name in exercise_type or exercise_type in name:
                completed.append({
                    "prescription": prescription,
                    "log": log,
                    "form_score": log.get("form_score")
                })
                matched = True
                break
        
        if not matched:
            off_plan.append(log)
    
    # Find missed exercises (prescribed but not completed)
    completed_names = {c["prescription"]["exercise_catalog"]["name"].lower() for c in completed}
    for name, prescription in prescribed_names.items():
        if name not in completed_names:
            missed.append(prescription)
    
    return {
        "date": str(target_date),
        "summary": {
            "total_prescribed": len(prescribed_list),
            "completed": len(completed),
            "missed": len(missed),
            "off_plan": len(off_plan)
        },
        "completed": completed,
        "missed": missed,
        "off_plan": off_plan
    }


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


# ============================================
# POSE ANALYSIS
# ============================================

def _run_pose_analysis_background(
    exercise_id: str,
    video_url: str,
    exercise_type: str,
):
    """Background task to run pose analysis without blocking the API response."""
    import asyncio
    from app.services.pose_analysis import analyze_exercise_video
    from app.core.database import get_db_sync
    
    # Get fresh database connection for background task
    db = get_db_sync()
    cerebras = get_cerebras_client()
    
    try:
        # Run the async analysis in a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        analysis = loop.run_until_complete(
            analyze_exercise_video(
                video_url=video_url,
                exercise_type=exercise_type,
                exercise_id=exercise_id,
                supabase_client=db,
                cerebras_client=cerebras,
            )
        )
        loop.close()
        
        # Store analysis results
        update_data = {"pose_analysis": analysis}
        if analysis.get("processed_video_url"):
            update_data["processed_video_url"] = analysis["processed_video_url"]
        
        db.table("exercises").update(update_data).eq("id", exercise_id).execute()
        
    except Exception as e:
        # Log error but don't raise (background task)
        import logging
        logging.error(f"Background pose analysis failed for {exercise_id}: {e}")


@router.post("/exercises/{exercise_id}/analyze-pose")
async def analyze_exercise_pose(
    exercise_id: UUID,
    background_tasks: BackgroundTasks,
    db: Client = Depends(get_db)
):
    """
    Analyze exercise video using YOLO pose estimation.
    Returns immediately with status, runs analysis in background.
    Poll GET /exercises/{id}/pose-analysis to check completion.
    """
    exercise_res = db.table("exercises").select(
        "id, pose_analysis, video_url, processed_video_url, exercise_type, name"
    ).eq("id", str(exercise_id)).single().execute()
    
    if not exercise_res.data:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    exercise = exercise_res.data
    
    # If already analyzed, return cached result
    if exercise.get("pose_analysis"):
        # Check both the column and pose_analysis for processed_video_url
        processed_url = exercise.get("processed_video_url") or exercise["pose_analysis"].get("processed_video_url")
        return {
            "status": "completed",
            "exercise_id": str(exercise_id),
            "pose_analysis": exercise["pose_analysis"],
            "processed_video_url": processed_url,
        }
    
    video_url = exercise.get("video_url")
    if not video_url:
        raise HTTPException(status_code=400, detail="No video URL for this exercise")
    
    exercise_type = exercise.get("exercise_type") or exercise.get("name") or "exercise"
    
    # Queue background task and return immediately
    background_tasks.add_task(
        _run_pose_analysis_background,
        exercise_id=str(exercise_id),
        video_url=video_url,
        exercise_type=exercise_type,
    )
    
    return {
        "status": "processing",
        "exercise_id": str(exercise_id),
        "message": "Analysis queued. Poll GET /exercises/{id}/pose-analysis for results.",
    }


@router.get("/exercises/{exercise_id}/pose-analysis")
async def get_exercise_pose_analysis(
    exercise_id: UUID,
    db: Client = Depends(get_db)
):
    """Get cached pose analysis for an exercise."""
    exercise_res = db.table("exercises").select("id, pose_analysis, video_url, processed_video_url, exercise_type, name").eq("id", str(exercise_id)).single().execute()
    
    if not exercise_res.data:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    exercise = exercise_res.data
    pose_analysis = exercise.get("pose_analysis")
    
    # Check both the column and pose_analysis for processed_video_url
    processed_url = exercise.get("processed_video_url")
    if not processed_url and pose_analysis:
        processed_url = pose_analysis.get("processed_video_url")
    
    return {
        "exercise_id": exercise["id"],
        "video_url": exercise.get("video_url"),
        "processed_video_url": processed_url,
        "exercise_type": exercise.get("exercise_type") or exercise.get("name"),
        "pose_analysis": pose_analysis,
        "has_analysis": pose_analysis is not None,
    }


@router.post("/exercises/process-pending")
async def process_pending_pose_analyses(
    limit: int = Query(5, description="Max number of videos to process"),
    db: Client = Depends(get_db)
):
    """
    Process exercises that have video_url but no pose_analysis.
    Can be called by a cron job, webhook, or manually.
    """
    from app.services.pose_analysis import analyze_exercise_video
    
    # Find exercises with video but no analysis
    exercises_res = db.table("exercises").select(
        "id, video_url, exercise_type, name"
    ).not_.is_("video_url", "null").is_("pose_analysis", "null").limit(limit).execute()
    
    exercises = exercises_res.data or []
    
    if not exercises:
        return {"message": "No pending videos to process", "processed": 0}
    
    cerebras = get_cerebras_client()
    results = []
    
    for exercise in exercises:
        try:
            exercise_type = exercise.get("exercise_type") or exercise.get("name") or "exercise"
            
            analysis = await analyze_exercise_video(
                video_url=exercise["video_url"],
                exercise_type=exercise_type,
                exercise_id=str(exercise["id"]),
                supabase_client=db,
                cerebras_client=cerebras,
            )
            
            # Store results
            update_data = {"pose_analysis": analysis}
            if analysis.get("processed_video_url"):
                update_data["processed_video_url"] = analysis["processed_video_url"]
            
            db.table("exercises").update(update_data).eq("id", str(exercise["id"])).execute()
            
            results.append({
                "exercise_id": exercise["id"],
                "status": "success",
                "summary": analysis.get("summary", "")[:100],
            })
        except Exception as e:
            results.append({
                "exercise_id": exercise["id"],
                "status": "error",
                "error": str(e),
            })
    
    return {
        "message": f"Processed {len(results)} videos",
        "processed": len([r for r in results if r["status"] == "success"]),
        "results": results,
    }
