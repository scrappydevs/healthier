"""Medication API endpoints."""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query
from app.core.database import supabase
from app.models.medication import (
    PillCreate,
    PillUpdate,
    PillResponse,
    MedicationScheduleCreate,
    MedicationScheduleUpdate,
    MedicationScheduleResponse,
    MedicationLogCreate,
    MedicationLogUpdate,
    MedicationLogResponse,
)

router = APIRouter(prefix="/medications", tags=["medications"])


# ============================================
# PILLS (Medication Catalog)
# ============================================

@router.get("/pills", response_model=List[PillResponse])
async def list_pills(
    search: Optional[str] = Query(None, description="Search by name, generic name, or brand name"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all pills in the medication catalog."""
    query = supabase.table("pills").select("*")
    
    if search:
        query = query.or_(f"name.ilike.%{search}%,generic_name.ilike.%{search}%,brand_name.ilike.%{search}%")
    
    result = query.order("name").range(offset, offset + limit - 1).execute()
    
    if result.data is None:
        raise HTTPException(status_code=500, detail="Failed to fetch pills")
    
    return result.data


@router.get("/pills/{pill_id}", response_model=PillResponse)
async def get_pill(pill_id: UUID):
    """Get a specific pill by ID."""
    result = supabase.table("pills").select("*").eq("id", str(pill_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Pill not found")
    
    return result.data[0]


@router.post("/pills", response_model=PillResponse, status_code=201)
async def create_pill(pill: PillCreate):
    """Create a new pill in the catalog."""
    result = supabase.table("pills").insert(pill.model_dump()).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create pill")
    
    return result.data[0]


@router.patch("/pills/{pill_id}", response_model=PillResponse)
async def update_pill(pill_id: UUID, pill: PillUpdate):
    """Update a pill."""
    update_data = {k: v for k, v in pill.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = supabase.table("pills").update(update_data).eq("id", str(pill_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Pill not found")
    
    return result.data[0]


@router.delete("/pills/{pill_id}", status_code=204)
async def delete_pill(pill_id: UUID):
    """Delete a pill from the catalog."""
    result = supabase.table("pills").delete().eq("id", str(pill_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Pill not found")
    
    return None


# ============================================
# PATIENT MEDICATION SCHEDULES
# ============================================

@router.get("/schedules", response_model=List[MedicationScheduleResponse])
async def list_schedules(
    patient_id: Optional[UUID] = Query(None),
    is_active: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List medication schedules."""
    query = supabase.table("patient_pills").select("*, pill:pills(*)")
    
    if patient_id:
        query = query.eq("patient_id", str(patient_id))
    
    if is_active is not None:
        query = query.eq("is_active", is_active)
    
    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    
    if result.data is None:
        raise HTTPException(status_code=500, detail="Failed to fetch schedules")
    
    return result.data


@router.get("/schedules/{schedule_id}", response_model=MedicationScheduleResponse)
async def get_schedule(schedule_id: UUID):
    """Get a specific medication schedule."""
    result = supabase.table("patient_pills").select("*, pill:pills(*)").eq("id", str(schedule_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    return result.data[0]


@router.post("/schedules", response_model=MedicationScheduleResponse, status_code=201)
async def create_schedule(schedule: MedicationScheduleCreate):
    """Create a new medication schedule for a patient."""
    schedule_data = schedule.model_dump()
    schedule_data["patient_id"] = str(schedule_data["patient_id"])
    schedule_data["pill_id"] = str(schedule_data["pill_id"])
    
    result = supabase.table("patient_pills").insert(schedule_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create schedule")
    
    schedule_id = result.data[0]["id"]
    
    full_result = supabase.table("patient_pills").select("*, pill:pills(*)").eq("id", schedule_id).execute()
    
    return full_result.data[0]


@router.patch("/schedules/{schedule_id}", response_model=MedicationScheduleResponse)
async def update_schedule(schedule_id: UUID, schedule: MedicationScheduleUpdate):
    """Update a medication schedule."""
    update_data = {k: v for k, v in schedule.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = supabase.table("patient_pills").update(update_data).eq("id", str(schedule_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    full_result = supabase.table("patient_pills").select("*, pill:pills(*)").eq("id", str(schedule_id)).execute()
    
    return full_result.data[0]


@router.delete("/schedules/{schedule_id}", status_code=204)
async def delete_schedule(schedule_id: UUID):
    """Delete a medication schedule."""
    result = supabase.table("patient_pills").delete().eq("id", str(schedule_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    return None


# ============================================
# MEDICATION LOGS
# ============================================

@router.get("/logs", response_model=List[MedicationLogResponse])
async def list_logs(
    patient_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List medication logs."""
    query = supabase.table("pill_logs").select("*")
    
    if patient_id:
        query = query.eq("patient_id", str(patient_id))
    
    if status:
        query = query.eq("status", status)
    
    result = query.order("scheduled_time", desc=True).range(offset, offset + limit - 1).execute()
    
    if result.data is None:
        raise HTTPException(status_code=500, detail="Failed to fetch logs")
    
    return result.data


@router.get("/logs/{log_id}", response_model=MedicationLogResponse)
async def get_log(log_id: UUID):
    """Get a specific medication log."""
    result = supabase.table("pill_logs").select("*").eq("id", str(log_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Log not found")
    
    return result.data[0]


@router.post("/logs", response_model=MedicationLogResponse, status_code=201)
async def create_log(log: MedicationLogCreate):
    """Create a new medication log entry."""
    log_data = log.model_dump()
    log_data["patient_id"] = str(log_data["patient_id"])
    log_data["patient_pill_id"] = str(log_data["patient_pill_id"])
    
    result = supabase.table("pill_logs").insert(log_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create log")
    
    return result.data[0]


@router.patch("/logs/{log_id}", response_model=MedicationLogResponse)
async def update_log(log_id: UUID, log: MedicationLogUpdate):
    """Update a medication log entry."""
    update_data = {k: v for k, v in log.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = supabase.table("pill_logs").update(update_data).eq("id", str(log_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Log not found")
    
    return result.data[0]


@router.delete("/logs/{log_id}", status_code=204)
async def delete_log(log_id: UUID):
    """Delete a medication log entry."""
    result = supabase.table("pill_logs").delete().eq("id", str(log_id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Log not found")
    
    return None


# ============================================
# PATIENT-SPECIFIC VIEWS
# ============================================

@router.get("/patients/{patient_id}/medications", response_model=List[MedicationScheduleResponse])
async def get_patient_medications(patient_id: UUID, is_active: bool = Query(True)):
    """Get all medications for a specific patient."""
    query = supabase.table("patient_pills").select("*, pill:pills(*)").eq("patient_id", str(patient_id))
    
    if is_active is not None:
        query = query.eq("is_active", is_active)
    
    result = query.order("created_at", desc=True).execute()
    
    if result.data is None:
        raise HTTPException(status_code=500, detail="Failed to fetch patient medications")
    
    return result.data


@router.get("/patients/{patient_id}/logs", response_model=List[MedicationLogResponse])
async def get_patient_logs(
    patient_id: UUID,
    limit: int = Query(50, ge=1, le=500),
):
    """Get medication logs for a specific patient."""
    result = supabase.table("pill_logs").select("*").eq("patient_id", str(patient_id)).order("scheduled_time", desc=True).limit(limit).execute()
    
    if result.data is None:
        raise HTTPException(status_code=500, detail="Failed to fetch patient logs")
    
    return result.data
