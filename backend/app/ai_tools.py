"""
PillPal AI Tools - Function calling for Cerebras/OpenAI-compatible API
Allows the AI to fetch and modify hospital, patient, room, and hazard data
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid

from app.core.database import get_supabase


# ============================================================================
# TOOL DEFINITIONS (OpenAI function calling format)
# ============================================================================

PILLPAL_TOOLS = [
    # -------------------------------------------------------------------------
    # ROOM MANAGEMENT (10 tools)
    # -------------------------------------------------------------------------
    {
        "type": "function",
        "function": {
            "name": "get_room_status",
            "description": "Get detailed status of a specific room including occupancy, patient info, and current status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "room_id": {
                        "type": "string",
                        "description": "Room ID or name (e.g., 'Cardiac Care 101' or 'de9844aef33d')"
                    }
                },
                "required": ["room_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_all_rooms",
            "description": "List all rooms in the hospital with their current status, type, and occupancy.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_rooms_by_type",
            "description": "Get rooms filtered by type (patient, icu, operating, emergency, pharmacy, lab, nurses_station, reception, hallway, storage, ward).",
            "parameters": {
                "type": "object",
                "properties": {
                    "room_type": {
                        "type": "string",
                        "enum": ["patient", "icu", "operating", "emergency", "pharmacy", "lab", "nurses_station", "reception", "hallway", "storage", "ward"],
                        "description": "Type of room to filter by"
                    }
                },
                "required": ["room_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_available_rooms",
            "description": "Get all vacant rooms available for patient admission.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_occupied_rooms",
            "description": "Get all currently occupied rooms with patient information.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_room_status",
            "description": "Change the status of a room (normal, attention, critical, vacant).",
            "parameters": {
                "type": "object",
                "properties": {
                    "room_id": {
                        "type": "string",
                        "description": "Room ID or name"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["normal", "attention", "critical", "vacant"],
                        "description": "New status for the room"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Reason for status change"
                    }
                },
                "required": ["room_id", "status"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_room_patient",
            "description": "Get information about the patient currently in a specific room.",
            "parameters": {
                "type": "object",
                "properties": {
                    "room_id": {
                        "type": "string",
                        "description": "Room ID or name"
                    }
                },
                "required": ["room_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "assign_patient_to_room",
            "description": "Assign a patient to a specific room. Use when admitting a patient.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID to assign"
                    },
                    "room_id": {
                        "type": "string",
                        "description": "Room ID or name to assign to"
                    }
                },
                "required": ["patient_id", "room_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "remove_patient_from_room",
            "description": "Remove/discharge a patient from their room.",
            "parameters": {
                "type": "object",
                "properties": {
                    "room_id": {
                        "type": "string",
                        "description": "Room ID or name to clear"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Reason for removal (discharge, transfer, etc.)"
                    }
                },
                "required": ["room_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_hallways",
            "description": "List all hallway areas with their current activity status.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    
    # -------------------------------------------------------------------------
    # PATIENT OPERATIONS (8 tools)
    # -------------------------------------------------------------------------
    {
        "type": "function",
        "function": {
            "name": "list_all_patients",
            "description": "Get a list of all patients in the hospital with their basic information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "include_discharged": {
                        "type": "boolean",
                        "description": "Include discharged patients (default: false)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_patients",
            "description": "Search for patients by name, ID, or condition.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query (name, patient ID, or condition)"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_patient_details",
            "description": "Get complete details for a specific patient including vitals, medications, and room assignment.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or full name (e.g., 'John Doe' or 'Sarah Smith')"
                    }
                },
                "required": ["patient_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_patient_medications",
            "description": "Get the medication schedule for a specific patient.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or full name (e.g., 'John Doe' or 'Sarah Smith')"
                    }
                },
                "required": ["patient_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_patient_vitals",
            "description": "Get the latest vital signs for a patient.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or full name (e.g., 'John Doe' or 'Sarah Smith')"
                    }
                },
                "required": ["patient_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_patient_status",
            "description": "Update the condition/status of a patient.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or full name (e.g., 'John Doe' or 'Sarah Smith')"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["stable", "improving", "declining", "critical", "discharged"],
                        "description": "New patient status"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Additional notes about the status change"
                    }
                },
                "required": ["patient_id", "status"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "transfer_patient",
            "description": "Transfer a patient from one room to another.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or full name (e.g., 'John Doe' or 'Sarah Smith') to transfer"
                    },
                    "from_room": {
                        "type": "string",
                        "description": "Current room (optional if patient_id provided)"
                    },
                    "to_room": {
                        "type": "string",
                        "description": "Destination room"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Reason for transfer"
                    }
                },
                "required": ["to_room"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_patient_note",
            "description": "Add a clinical note to a patient's record.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or full name (e.g., 'John Doe' or 'Sarah Smith')"
                    },
                    "note_type": {
                        "type": "string",
                        "enum": ["observation", "medication", "procedure", "alert", "general"],
                        "description": "Type of note"
                    },
                    "content": {
                        "type": "string",
                        "description": "Note content"
                    }
                },
                "required": ["patient_id", "note_type", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_food_instructions",
            "description": "Add food or dietary instructions for a patient. Use this when a doctor wants to add specific food recommendations like 'eat more vegetables like broccoli' or dietary restrictions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or full name (e.g., 'John Doe' or 'Sarah Smith')"
                    },
                    "instructions": {
                        "type": "string",
                        "description": "Food or dietary instructions to add (e.g., 'Eat more vegetables like broccoli', 'Low sodium diet', 'Increase protein intake')"
                    },
                    "duration_days": {
                        "type": "integer",
                        "description": "Number of days this instruction should be active (optional, defaults to ongoing)"
                    }
                },
                "required": ["patient_id", "instructions"]
            }
        }
    },
    
    # -------------------------------------------------------------------------
    # HAZARD MANAGEMENT (6 tools)
    # -------------------------------------------------------------------------
    {
        "type": "function",
        "function": {
            "name": "list_active_hazards",
            "description": "Get all active hazards in the hospital that need attention.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "report_hazard",
            "description": "Report a new hazard (spill, fall, equipment issue, etc.).",
            "parameters": {
                "type": "object",
                "properties": {
                    "hazard_type": {
                        "type": "string",
                        "enum": ["spill", "fall", "equipment_failure", "medical_emergency", "security", "fire", "other"],
                        "description": "Type of hazard"
                    },
                    "location": {
                        "type": "string",
                        "description": "Location/room where hazard occurred"
                    },
                    "description": {
                        "type": "string",
                        "description": "Description of the hazard"
                    },
                    "severity": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "critical"],
                        "description": "Severity level"
                    }
                },
                "required": ["hazard_type", "location", "description", "severity"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_hazard_status",
            "description": "Update the status of a hazard (responding, resolved, etc.).",
            "parameters": {
                "type": "object",
                "properties": {
                    "hazard_id": {
                        "type": "string",
                        "description": "Hazard ID"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["active", "responding", "resolved"],
                        "description": "New status"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Resolution notes"
                    }
                },
                "required": ["hazard_id", "status"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_hazard_details",
            "description": "Get detailed information about a specific hazard.",
            "parameters": {
                "type": "object",
                "properties": {
                    "hazard_id": {
                        "type": "string",
                        "description": "Hazard ID"
                    }
                },
                "required": ["hazard_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_hazards_by_room",
            "description": "Get all hazards reported in a specific room/area.",
            "parameters": {
                "type": "object",
                "properties": {
                    "room_id": {
                        "type": "string",
                        "description": "Room ID or name"
                    }
                },
                "required": ["room_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_hazards_by_type",
            "description": "Get all hazards filtered by type.",
            "parameters": {
                "type": "object",
                "properties": {
                    "hazard_type": {
                        "type": "string",
                        "enum": ["spill", "fall", "equipment_failure", "medical_emergency", "security", "fire", "other"],
                        "description": "Type of hazard to filter by"
                    }
                },
                "required": ["hazard_type"]
            }
        }
    },
    
    # -------------------------------------------------------------------------
    # HOSPITAL STATISTICS (4 tools)
    # -------------------------------------------------------------------------
    {
        "type": "function",
        "function": {
            "name": "get_hospital_stats",
            "description": "Get overall hospital statistics including occupancy, patient counts, and alert counts.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_occupancy_rate",
            "description": "Get current room occupancy rate and breakdown by room type.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_critical_summary",
            "description": "Get summary of all critical patients and rooms requiring immediate attention.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_activity_summary",
            "description": "Get summary of recent hospital activity and events.",
            "parameters": {
                "type": "object",
                "properties": {
                    "hours": {
                        "type": "integer",
                        "description": "Number of hours to look back (default: 24)"
                    }
                },
                "required": []
            }
        }
    },
    
    # -------------------------------------------------------------------------
    # MEDICATION ADHERENCE (4 tools)
    # -------------------------------------------------------------------------
    {
        "type": "function",
        "function": {
            "name": "get_medication_schedule",
            "description": "Get today's medication schedule for all patients or a specific patient.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or full name (e.g., 'John Doe' or 'Sarah Smith') - optional, if not provided returns all"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "mark_medication_given",
            "description": "Record that a medication has been administered to a patient.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or full name (e.g., 'John Doe' or 'Sarah Smith')"
                    },
                    "medication_id": {
                        "type": "string",
                        "description": "Medication ID"
                    },
                    "administered_by": {
                        "type": "string",
                        "description": "Name/ID of person administering"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Administration notes"
                    }
                },
                "required": ["patient_id", "medication_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_missed_medications",
            "description": "Get list of overdue/missed medications.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_medication_alerts",
            "description": "Get medication-related alerts (interactions, allergies, missed doses).",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    
    # -------------------------------------------------------------------------
    # ALERT SYSTEM (4 tools)
    # -------------------------------------------------------------------------
    {
        "type": "function",
        "function": {
            "name": "get_active_alerts",
            "description": "Get all active alerts in the hospital.",
            "parameters": {
                "type": "object",
                "properties": {
                    "severity": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "critical"],
                        "description": "Filter by severity (optional)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_alert",
            "description": "Create a new alert.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Alert title"
                    },
                    "description": {
                        "type": "string",
                        "description": "Alert description"
                    },
                    "severity": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "critical"],
                        "description": "Alert severity"
                    },
                    "patient_id": {
                        "type": "string",
                        "description": "Related patient ID (optional)"
                    },
                    "room_id": {
                        "type": "string",
                        "description": "Related room ID (optional)"
                    }
                },
                "required": ["title", "description", "severity"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "acknowledge_alert",
            "description": "Mark an alert as acknowledged.",
            "parameters": {
                "type": "object",
                "properties": {
                    "alert_id": {
                        "type": "string",
                        "description": "Alert ID"
                    },
                    "acknowledged_by": {
                        "type": "string",
                        "description": "Name/ID of person acknowledging"
                    }
                },
                "required": ["alert_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "resolve_alert",
            "description": "Resolve and close an alert.",
            "parameters": {
                "type": "object",
                "properties": {
                    "alert_id": {
                        "type": "string",
                        "description": "Alert ID"
                    },
                    "resolution_notes": {
                        "type": "string",
                        "description": "Notes about how the alert was resolved"
                    }
                },
                "required": ["alert_id"]
            }
        }
    },
    
    # -------------------------------------------------------------------------
    # DASHBOARD / PATIENT DAILY DATA (6 tools)
    # -------------------------------------------------------------------------
    {
        "type": "function",
        "function": {
            "name": "get_patient_daily_summary",
            "description": "Get the AI-generated daily summary for a patient including alerts, meals, exercises, medications, and journal entries.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or full name"
                    },
                    "date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format (defaults to today)"
                    }
                },
                "required": ["patient_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "refresh_patient_summary",
            "description": "Force regenerate the daily summary for a patient. Use when data has changed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or full name"
                    },
                    "date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format (defaults to today)"
                    }
                },
                "required": ["patient_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "mark_pill_taken",
            "description": "Mark a scheduled medication/pill as taken for a patient.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or full name"
                    },
                    "medication_name": {
                        "type": "string",
                        "description": "Name of the medication (e.g., 'Atorvastatin', 'Aspirin')"
                    },
                    "date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format (defaults to today)"
                    }
                },
                "required": ["patient_id", "medication_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_patient_care_plans",
            "description": "Get the diet and exercise care plans for a patient.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or full name"
                    }
                },
                "required": ["patient_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_patient_pill_logs",
            "description": "Get the medication/pill log for a patient showing what was taken, missed, or pending.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or full name"
                    },
                    "date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format (defaults to today)"
                    }
                },
                "required": ["patient_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_patient_exercises",
            "description": "Get logged exercises for a patient.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or full name"
                    },
                    "date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format (optional, if not provided returns all)"
                    }
                },
                "required": ["patient_id"]
            }
        }
    },
]


# ============================================================================
# MOCK DATA (for demo without Supabase)
# ============================================================================

# Rooms matching the actual Smplrspace floor plan
MOCK_ROOMS = [
    # Patient rooms (Room 1-6)
    {"id": "room-1", "name": "Room 1", "type": "patient", "status": "normal", "patient_count": 1},
    {"id": "room-2", "name": "Room 2", "type": "patient", "status": "normal", "patient_count": 1},
    {"id": "room-3", "name": "Room 3", "type": "patient", "status": "attention", "patient_count": 1},
    {"id": "room-4", "name": "Room 4", "type": "patient", "status": "normal", "patient_count": 1},
    {"id": "room-5", "name": "Room 5", "type": "patient", "status": "vacant", "patient_count": 0},
    {"id": "room-6", "name": "Room 6", "type": "patient", "status": "normal", "patient_count": 1},
    
    # Special areas
    {"id": "critical-room", "name": "Critical Room", "type": "critical", "status": "critical", "patient_count": 1},
    {"id": "waiting-space", "name": "Waiting Space", "type": "waiting", "status": "normal", "patient_count": 0},
    {"id": "check-in-space", "name": "Check In Space", "type": "reception", "status": "normal", "patient_count": 0},
    {"id": "entrance", "name": "Entrance", "type": "hallway", "status": "normal", "patient_count": 0},
    
    # Utility areas
    {"id": "pantry", "name": "Pantry", "type": "pantry", "status": "normal", "patient_count": 0},
    {"id": "storage", "name": "Storage", "type": "storage", "status": "normal", "patient_count": 0},
    {"id": "wc-1", "name": "WC", "type": "restroom", "status": "normal", "patient_count": 0},
    {"id": "wc-2", "name": "WC", "type": "restroom", "status": "normal", "patient_count": 0},
]

# ============================================================================
# HELPER FUNCTIONS FOR SUPABASE DATA FETCHING
# All data should come from Supabase - no mock data
# ============================================================================

def _fetch_all_patients_sync(supabase) -> List[Dict]:
    """Synchronously fetch all patients from Supabase with user info"""
    if not supabase:
        return []
    try:
        # Use the explicit relationship name to avoid ambiguity
        response = supabase.table("patients").select(
            "id, user_id, age, gender, medical_conditions, status, care_setting, users!patients_user_id_fkey(full_name, email)"
        ).execute()
        patients = response.data if response.data else []
        
        # Format for easier use
        formatted = []
        for p in patients:
            user = p.get("users", {}) or {}
            formatted.append({
                "id": p["id"],
                "name": user.get("full_name", "Unknown"),
                "email": user.get("email"),
                "age": p.get("age"),
                "conditions": p.get("medical_conditions", []),
                "status": p.get("status", "active"),
                "care_setting": p.get("care_setting", "at_home"),
            })
        return formatted
    except Exception as e:
        print(f"Error fetching patients: {e}")
        return []


def _find_patient_by_id_or_name(patient_id: str, supabase) -> Optional[Dict]:
    """Find a patient by ID or name from Supabase"""
    patients = _fetch_all_patients_sync(supabase)
    query_lower = patient_id.lower().strip()
    
    for patient in patients:
        if query_lower == patient["id"].lower():
            return patient
        if patient.get("name") and query_lower == patient["name"].lower():
            return patient
        if patient.get("name") and query_lower in patient["name"].lower():
            return patient
    
    return None


def _fetch_patient_medications(patient_id: str, supabase) -> List[Dict]:
    """Fetch medications for a specific patient from Supabase"""
    if not supabase:
        return []
    try:
        # Get assigned medications with pill details
        response = supabase.table("patient_pills").select(
            "id, patient_id, frequency, times_of_day, pills(id, name, strength, unit, dosage_form)"
        ).eq("patient_id", patient_id).execute()
        
        meds = []
        for m in response.data or []:
            pill = m.get("pills", {}) or {}
            meds.append({
                "id": m["id"],
                "patient_id": m["patient_id"],
                "name": pill.get("name", "Unknown"),
                "dosage": f"{pill.get('strength', '')}{pill.get('unit', '')}",
                "schedule": ", ".join(m.get("times_of_day", [])) if m.get("times_of_day") else m.get("frequency", ""),
                "status": "active"
            })
        return meds
    except Exception as e:
        print(f"Error fetching medications: {e}")
        return []


def _fetch_all_medications(supabase) -> List[Dict]:
    """Fetch all patient medications from Supabase"""
    if not supabase:
        return []
    try:
        response = supabase.table("patient_pills").select(
            "id, patient_id, frequency, times_of_day, pills(id, name, strength, unit, dosage_form)"
        ).execute()
        
        meds = []
        for m in response.data or []:
            pill = m.get("pills", {}) or {}
            meds.append({
                "id": m["id"],
                "patient_id": m["patient_id"],
                "name": pill.get("name", "Unknown"),
                "dosage": f"{pill.get('strength', '')}{pill.get('unit', '')}",
                "schedule": ", ".join(m.get("times_of_day", [])) if m.get("times_of_day") else m.get("frequency", ""),
                "status": "active"
            })
        return meds
    except Exception as e:
        print(f"Error fetching all medications: {e}")
        return []


def _fetch_alerts(supabase) -> List[Dict]:
    """Fetch alerts from Supabase - for now returns empty as alerts table may not exist"""
    if not supabase:
        return []
    try:
        # Check if alerts table exists, otherwise return empty
        response = supabase.table("alerts").select("*").execute()
        return response.data or []
    except Exception as e:
        # Table may not exist yet
        return []


def _fetch_hazards(supabase) -> List[Dict]:
    """Fetch hazards from Supabase - for now returns empty as hazards table may not exist"""
    if not supabase:
        return []
    try:
        response = supabase.table("hazards").select("*").execute()
        return response.data or []
    except Exception as e:
        # Table may not exist yet
        return []


# ============================================================================
# TOOL EXECUTION FUNCTIONS
# ============================================================================

def fuzzy_match_room(query: str, rooms: List[Dict]) -> Optional[Dict]:
    """Fuzzy match room by ID or name"""
    query_lower = query.lower().strip()
    
    # Exact match on ID or name
    for room in rooms:
        if query_lower == room["id"].lower() or query_lower == room["name"].lower():
            return room
    
    # Handle "Room X" format - match against room names like "Room 1", "Room 2"
    if query_lower.startswith("room "):
        room_num = query_lower.replace("room ", "").strip()
        for room in rooms:
            name_lower = room["name"].lower()
            # Match "Room 1", "room-1", "room1" formats
            if name_lower == f"room {room_num}" or name_lower == f"room-{room_num}" or name_lower == f"room{room_num}":
                return room
    
    # Partial match on name
    for room in rooms:
        if query_lower in room["name"].lower():
            return room
    
    # Partial match on ID
    for room in rooms:
        if query_lower in room["id"].lower():
            return room
    
    return None


def fuzzy_match_patient(query: str, patients: List[Dict]) -> Optional[Dict]:
    """Fuzzy match patient by ID or name"""
    query_lower = query.lower().strip()
    
    for patient in patients:
        if query_lower == patient["id"].lower() or query_lower == patient["name"].lower():
            return patient
        if query_lower in patient["name"].lower():
            return patient
    
    return None


async def execute_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a tool call and return results"""
    try:
        supabase = get_supabase()
        
        # Room Management
        if tool_name == "get_room_status":
            return await get_room_status(tool_input.get("room_id", ""), supabase)
        elif tool_name == "list_all_rooms":
            return await list_all_rooms(supabase)
        elif tool_name == "list_rooms_by_type":
            return await list_rooms_by_type(tool_input.get("room_type", ""), supabase)
        elif tool_name == "list_available_rooms":
            return await list_available_rooms(supabase)
        elif tool_name == "list_occupied_rooms":
            return await list_occupied_rooms(supabase)
        elif tool_name == "update_room_status":
            return await update_room_status(tool_input.get("room_id", ""), tool_input.get("status", ""), tool_input.get("reason"), supabase)
        elif tool_name == "get_room_patient":
            return await get_room_patient(tool_input.get("room_id", ""), supabase)
        elif tool_name == "assign_patient_to_room":
            return await assign_patient_to_room(tool_input.get("patient_id", ""), tool_input.get("room_id", ""), supabase)
        elif tool_name == "remove_patient_from_room":
            return await remove_patient_from_room(tool_input.get("room_id", ""), tool_input.get("reason"), supabase)
        elif tool_name == "get_hallways":
            return await get_hallways(supabase)
        
        # Patient Operations
        elif tool_name == "list_all_patients":
            return await list_all_patients(tool_input.get("include_discharged", False), supabase)
        elif tool_name == "search_patients":
            return await search_patients(tool_input.get("query", ""), supabase)
        elif tool_name == "get_patient_details":
            return await get_patient_details(tool_input.get("patient_id", ""), supabase)
        elif tool_name == "get_patient_medications":
            return await get_patient_medications(tool_input.get("patient_id", ""), supabase)
        elif tool_name == "get_patient_vitals":
            return await get_patient_vitals(tool_input.get("patient_id", ""), supabase)
        elif tool_name == "update_patient_status":
            return await update_patient_status(tool_input.get("patient_id", ""), tool_input.get("status", ""), tool_input.get("notes"), supabase)
        elif tool_name == "transfer_patient":
            return await transfer_patient(tool_input.get("patient_id"), tool_input.get("from_room"), tool_input.get("to_room", ""), tool_input.get("reason"), supabase)
        elif tool_name == "add_patient_note":
            return await add_patient_note(tool_input.get("patient_id", ""), tool_input.get("note_type", ""), tool_input.get("content", ""), supabase)
        elif tool_name == "add_food_instructions":
            return await add_food_instructions(tool_input.get("patient_id", ""), tool_input.get("instructions", ""), tool_input.get("duration_days"), supabase)
        
        # Hazard Management
        elif tool_name == "list_active_hazards":
            return await list_active_hazards(supabase)
        elif tool_name == "report_hazard":
            return await report_hazard(tool_input.get("hazard_type", ""), tool_input.get("location", ""), tool_input.get("description", ""), tool_input.get("severity", ""), supabase)
        elif tool_name == "update_hazard_status":
            return await update_hazard_status(tool_input.get("hazard_id", ""), tool_input.get("status", ""), tool_input.get("notes"), supabase)
        elif tool_name == "get_hazard_details":
            return await get_hazard_details(tool_input.get("hazard_id", ""), supabase)
        elif tool_name == "get_hazards_by_room":
            return await get_hazards_by_room(tool_input.get("room_id", ""), supabase)
        elif tool_name == "get_hazards_by_type":
            return await get_hazards_by_type(tool_input.get("hazard_type", ""), supabase)
        
        # Hospital Statistics
        elif tool_name == "get_hospital_stats":
            return await get_hospital_stats(supabase)
        elif tool_name == "get_occupancy_rate":
            return await get_occupancy_rate(supabase)
        elif tool_name == "get_critical_summary":
            return await get_critical_summary(supabase)
        elif tool_name == "get_activity_summary":
            return await get_activity_summary(tool_input.get("hours", 24), supabase)
        
        # Medication Adherence
        elif tool_name == "get_medication_schedule":
            return await get_medication_schedule(tool_input.get("patient_id"), supabase)
        elif tool_name == "add_food_instructions":
            return await add_food_instructions(tool_input.get("patient_id", ""), tool_input.get("instructions", ""), tool_input.get("duration_days"), supabase)
        elif tool_name == "mark_medication_given":
            return await mark_medication_given(tool_input.get("patient_id", ""), tool_input.get("medication_id", ""), tool_input.get("administered_by"), tool_input.get("notes"), supabase)
        elif tool_name == "get_missed_medications":
            return await get_missed_medications(supabase)
        elif tool_name == "get_medication_alerts":
            return await get_medication_alerts(supabase)
        
        # Alert System
        elif tool_name == "get_active_alerts":
            return await get_active_alerts(tool_input.get("severity"), supabase)
        elif tool_name == "create_alert":
            return await create_alert(tool_input.get("title", ""), tool_input.get("description", ""), tool_input.get("severity", ""), tool_input.get("patient_id"), tool_input.get("room_id"), supabase)
        elif tool_name == "acknowledge_alert":
            return await acknowledge_alert(tool_input.get("alert_id", ""), tool_input.get("acknowledged_by"), supabase)
        elif tool_name == "resolve_alert":
            return await resolve_alert(tool_input.get("alert_id", ""), tool_input.get("resolution_notes"), supabase)
        
        # Dashboard / Patient Daily Data
        elif tool_name == "get_patient_daily_summary":
            return await get_patient_daily_summary(tool_input.get("patient_id", ""), tool_input.get("date"), supabase)
        elif tool_name == "refresh_patient_summary":
            return await refresh_patient_summary(tool_input.get("patient_id", ""), tool_input.get("date"), supabase)
        elif tool_name == "mark_pill_taken":
            return await mark_pill_taken(tool_input.get("patient_id", ""), tool_input.get("medication_name", ""), tool_input.get("date"), supabase)
        elif tool_name == "get_patient_care_plans":
            return await get_patient_care_plans_tool(tool_input.get("patient_id", ""), supabase)
        elif tool_name == "get_patient_pill_logs":
            return await get_patient_pill_logs_tool(tool_input.get("patient_id", ""), tool_input.get("date"), supabase)
        elif tool_name == "get_patient_exercises":
            return await get_patient_exercises_tool(tool_input.get("patient_id", ""), tool_input.get("date"), supabase)
        
        else:
            return {"error": f"Unknown tool: {tool_name}"}
    
    except Exception as e:
        print(f"❌ Error executing tool {tool_name}: {e}")
        return {"error": str(e)}


# ============================================================================
# TOOL IMPLEMENTATIONS (using mock data for demo)
# ============================================================================

# --- Room Management ---

async def get_room_status(room_id: str, supabase) -> Dict[str, Any]:
    room = fuzzy_match_room(room_id, MOCK_ROOMS)
    if not room:
        return {"error": f"Room '{room_id}' not found"}
    
    # Fetch patients from Supabase
    all_patients = _fetch_all_patients_sync(supabase)
    
    return {
        "room": room,
        "patients": all_patients,  # For now, return all patients since room assignment isn't tracked
        "patient_count": len(all_patients)
    }


async def list_all_rooms(supabase) -> Dict[str, Any]:
    return {
        "rooms": MOCK_ROOMS,
        "count": len(MOCK_ROOMS)
    }


async def list_rooms_by_type(room_type: str, supabase) -> Dict[str, Any]:
    filtered = [r for r in MOCK_ROOMS if r["type"] == room_type]
    return {
        "rooms": filtered,
        "count": len(filtered),
        "type": room_type
    }


async def list_available_rooms(supabase) -> Dict[str, Any]:
    available = [r for r in MOCK_ROOMS if r["status"] == "vacant" or r.get("patient_count", 0) == 0]
    # Filter to only patient-capable rooms
    patient_rooms = [r for r in available if r["type"] in ["patient", "icu", "ward"]]
    return {
        "available_rooms": patient_rooms,
        "count": len(patient_rooms)
    }


async def list_occupied_rooms(supabase) -> Dict[str, Any]:
    occupied = [r for r in MOCK_ROOMS if r["status"] != "vacant" and r.get("patient_count", 0) > 0]
    return {
        "occupied_rooms": occupied,
        "count": len(occupied)
    }


async def update_room_status(room_id: str, status: str, reason: Optional[str], supabase) -> Dict[str, Any]:
    room = fuzzy_match_room(room_id, MOCK_ROOMS)
    if not room:
        return {"error": f"Room '{room_id}' not found"}
    
    old_status = room["status"]
    room["status"] = status
    
    return {
        "success": True,
        "room_id": room["id"],
        "room_name": room["name"],
        "old_status": old_status,
        "new_status": status,
        "reason": reason
    }


async def get_room_patient(room_id: str, supabase) -> Dict[str, Any]:
    room = fuzzy_match_room(room_id, MOCK_ROOMS)
    if not room:
        return {"error": f"Room '{room_id}' not found"}
    
    # Fetch patients from Supabase
    all_patients = _fetch_all_patients_sync(supabase)
    patients = all_patients  # Room assignment not tracked in current schema
    
    if not patients:
        return {
            "room": room["name"],
            "occupied": False,
            "message": f"{room['name']} is currently empty"
        }
    
    return {
        "room": room["name"],
        "occupied": True,
        "patients": patients
    }


async def assign_patient_to_room(patient_id: str, room_id: str, supabase) -> Dict[str, Any]:
    room = fuzzy_match_room(room_id, MOCK_ROOMS)
    if not room:
        return {"error": f"Room '{room_id}' not found"}
    
    # Find patient from Supabase
    patient = _find_patient_by_id_or_name(patient_id, supabase)
    if not patient:
        return {"error": f"Patient '{patient_id}' not found"}
    
    # Note: Room assignment not persisted in current schema
    return {
        "success": True,
        "patient_id": patient["id"],
        "patient_name": patient["name"],
        "room_name": room["name"],
        "note": "Room assignment feature not fully implemented in database"
    }


async def remove_patient_from_room(room_id: str, reason: Optional[str], supabase) -> Dict[str, Any]:
    room = fuzzy_match_room(room_id, MOCK_ROOMS)
    if not room:
        return {"error": f"Room '{room_id}' not found"}
    
    # Note: Room assignment not tracked in current schema
    return {
        "success": True,
        "room_name": room["name"],
        "reason": reason,
        "note": "Room assignment feature not fully implemented in database"
    }


async def get_hallways(supabase) -> Dict[str, Any]:
    hallways = [r for r in MOCK_ROOMS if r["type"] == "hallway"]
    return {
        "hallways": hallways,
        "count": len(hallways)
    }


# --- Patient Operations ---

async def list_all_patients(include_discharged: bool, supabase) -> Dict[str, Any]:
    """Fetch real patients from Supabase database"""
    try:
        if supabase:
            # Join patients with users to get full_name
            response = supabase.table("patients").select(
                "id, user_id, age, gender, medical_conditions, created_at, users!patients_user_id_fkey(full_name, email)"
            ).execute()
            patients = response.data if response.data else []
            
            # Format patients for response
            formatted = []
            for p in patients:
                user = p.get("users", {}) or {}
                formatted.append({
                    "id": p["id"],
                    "name": user.get("full_name", "Unknown"),
                    "email": user.get("email"),
                    "age": p.get("age"),
                    "gender": p.get("gender"),
                    "conditions": p.get("medical_conditions", []),
                    "created_at": p.get("created_at")
                })
            
            return {
                "patients": formatted,
                "count": len(formatted)
            }
    except Exception as e:
        print(f"Error fetching patients from Supabase: {e}")
    
    # Return empty if Supabase query fails - no mock data fallback
    return {
        "patients": [],
        "count": 0,
        "note": "No patients found or database query failed"
    }


async def search_patients(query: str, supabase) -> Dict[str, Any]:
    """Search for real patients in Supabase database"""
    try:
        if supabase:
            # Get all patients with user info, then filter by name
            response = supabase.table("patients").select(
                "id, user_id, age, gender, medical_conditions, users!patients_user_id_fkey(full_name, email)"
            ).execute()
            all_patients = response.data if response.data else []
            
            # Filter by name (case insensitive)
            query_lower = query.lower()
            patients = []
            for p in all_patients:
                user = p.get("users", {}) or {}
                full_name = user.get("full_name", "")
                if full_name and query_lower in full_name.lower():
                    patients.append(p)
            
            # Format patients for response
            formatted = []
            for p in patients:
                user = p.get("users", {}) or {}
                formatted.append({
                    "id": p["id"],
                    "name": user.get("full_name", "Unknown"),
                    "email": user.get("email"),
                    "age": p.get("age"),
                    "gender": p.get("gender"),
                    "conditions": p.get("medical_conditions", [])
                })
            
            return {
                "patients": formatted,
                "count": len(formatted),
                "query": query
            }
    except Exception as e:
        print(f"Error searching patients in Supabase: {e}")
    
    # Return empty if Supabase query fails - no mock data fallback
    return {
        "patients": [],
        "count": 0,
        "query": query,
        "note": "No patients found or database query failed"
    }


async def get_patient_details(patient_id: str, supabase) -> Dict[str, Any]:
    """Fetch real patient details from Supabase database"""
    try:
        if supabase:
            # Try to fetch by ID first with user info
            response = supabase.table("patients").select(
                "id, user_id, age, gender, medical_conditions, users!patients_user_id_fkey(full_name, email)"
            ).eq("id", patient_id).execute()
            
            # If not found by ID, search by name
            if not response.data:
                # Get all patients and search by name
                all_patients = supabase.table("patients").select(
                    "id, user_id, age, gender, medical_conditions, users!patients_user_id_fkey(full_name, email)"
                ).execute()
                
                for p in (all_patients.data or []):
                    user = p.get("users", {}) or {}
                    name = user.get("full_name", "")
                    if name and patient_id.lower() in name.lower():
                        response.data = [p]
                        break
            
            if response.data:
                p = response.data[0]
                user = p.get("users", {}) or {}
                patient_name = user.get("full_name", "Unknown")
                
                # Fetch medications for this patient (through patient_pills)
                meds_response = supabase.table("patient_pills").select(
                    "id, pill_id, pills(name, strength, unit)"
                ).eq("patient_id", p["id"]).execute()
                medications = []
                for m in (meds_response.data or []):
                    pill = m.get("pills", {}) or {}
                    medications.append({
                        "id": m.get("id"),
                        "name": pill.get("name", "Unknown"),
                        "dosage": pill.get("dosage")
                    })
                
                # Fetch alerts for this patient
                alerts_response = supabase.table("alerts").select(
                    "id, title, message, severity, type, created_at"
                ).eq("patient_id", p["id"]).eq("resolved", False).execute()
                alerts = alerts_response.data if alerts_response.data else []
                
                return {
                    "patient": {
                        "id": p["id"],
                        "name": patient_name,
                        "email": user.get("email"),
                        "age": p.get("age"),
                        "gender": p.get("gender"),
                        "conditions": p.get("medical_conditions", [])
                    },
                    "patient_name": patient_name,
                    "medications": medications,
                    "alerts": alerts
                }
            
            return {"error": f"Patient '{patient_id}' not found"}
    except Exception as e:
        print(f"Error fetching patient details from Supabase: {e}")
    
    return {"error": f"Failed to fetch patient '{patient_id}'"}


async def get_patient_medications(patient_id: str, supabase) -> Dict[str, Any]:
    """Fetch real patient medications from Supabase database"""
    try:
        if supabase:
            # Get patient info first
            patient_res = supabase.table("patients").select(
                "id, user_id, users!patients_user_id_fkey(full_name)"
            ).eq("id", patient_id).execute()
            
            if not patient_res.data:
                # Try searching by name
                all_patients = supabase.table("patients").select(
                    "id, user_id, users!patients_user_id_fkey(full_name)"
                ).execute()
                
                for p in (all_patients.data or []):
                    user = p.get("users", {}) or {}
                    name = user.get("full_name", "")
                    if name and patient_id.lower() in name.lower():
                        patient_res.data = [p]
                        break
            
            if patient_res.data:
                p = patient_res.data[0]
                user = p.get("users", {}) or {}
                patient_name = user.get("full_name", "Unknown")
                actual_patient_id = p["id"]
                
                # Get medications through patient_pills
                meds_res = supabase.table("patient_pills").select(
                    "id, pill_id, frequency, special_instructions, pills(name, strength, unit, instructions)"
                ).eq("patient_id", actual_patient_id).execute()
                
                medications = []
                for m in (meds_res.data or []):
                    pill = m.get("pills", {}) or {}
                    medications.append({
                        "id": m.get("id"),
                        "pill_id": m.get("pill_id"),
                        "name": pill.get("name", "Unknown"),
                        "dosage": pill.get("dosage"),
                        "description": pill.get("description"),
                        "frequency": m.get("frequency"),
                        "special_instructions": m.get("special_instructions")
                    })
                
                return {
                    "patient_id": actual_patient_id,
                    "patient_name": patient_name,
                    "medications": medications,
                    "count": len(medications)
                }
            
            return {"error": f"Patient '{patient_id}' not found"}
    except Exception as e:
        print(f"Error fetching patient medications: {e}")
    
    return {"error": f"Failed to fetch medications for patient '{patient_id}'"}


async def get_patient_vitals(patient_id: str, supabase) -> Dict[str, Any]:
    patient = _find_patient_by_id_or_name(patient_id, supabase)
    if not patient:
        return {"error": f"Patient '{patient_id}' not found"}
    
    # Note: Vitals not currently tracked in database - returning placeholder
    return {
        "patient_id": patient["id"],
        "patient_name": patient["name"],
        "vitals": {
            "heart_rate": None,
            "blood_pressure": None,
            "temperature": None,
            "respiratory_rate": None,
            "oxygen_saturation": None,
            "recorded_at": datetime.now().isoformat()
        },
        "note": "Vitals tracking not implemented in current database schema"
    }


async def update_patient_status(patient_id: str, status: str, notes: Optional[str], supabase) -> Dict[str, Any]:
    patient = _find_patient_by_id_or_name(patient_id, supabase)
    if not patient:
        return {"error": f"Patient '{patient_id}' not found"}
    
    old_status = patient.get("status")
    
    # Update status in Supabase
    try:
        if supabase:
            supabase.table("patients").update({"status": status}).eq("id", patient["id"]).execute()
    except Exception as e:
        return {"error": f"Failed to update patient status: {e}"}
    
    return {
        "success": True,
        "patient_id": patient["id"],
        "patient_name": patient["name"],
        "old_status": old_status,
        "new_status": status,
        "notes": notes
    }


async def transfer_patient(patient_id: Optional[str], from_room: Optional[str], to_room: str, reason: Optional[str], supabase) -> Dict[str, Any]:
    dest_room = fuzzy_match_room(to_room, MOCK_ROOMS)
    if not dest_room:
        return {"error": f"Destination room '{to_room}' not found"}
    
    # Find patient from Supabase
    patient = None
    if patient_id:
        patient = _find_patient_by_id_or_name(patient_id, supabase)
    
    if not patient:
        return {"error": "Patient not found"}
    
    # Note: Room assignment not persisted in current schema
    return {
        "success": True,
        "patient_id": patient["id"],
        "patient_name": patient["name"],
        "to_room": dest_room["name"],
        "reason": reason,
        "note": "Room assignment feature not fully implemented in database"
    }


async def add_patient_note(patient_id: str, note_type: str, content: str, supabase) -> Dict[str, Any]:
    patient = _find_patient_by_id_or_name(patient_id, supabase)
    if not patient:
        return {"error": f"Patient '{patient_id}' not found"}
    
    # Note: Patient notes not currently stored in database - would need a notes table
    return {
        "success": True,
        "patient_id": patient["id"],
        "patient_name": patient["name"],
        "note_type": note_type,
        "content": content,
        "created_at": datetime.now().isoformat(),
        "note": "Notes feature not fully implemented in database schema"
    }


async def add_food_instructions(patient_id: str, instructions: str, duration_days: Optional[int], supabase) -> Dict[str, Any]:
    patient = _find_patient_by_id_or_name(patient_id, supabase)
    if not patient:
        return {"error": f"Patient '{patient_id}' not found"}
    
    end_date = None
    if duration_days:
        from datetime import timedelta
        end_date = (datetime.now() + timedelta(days=duration_days)).isoformat()
    
    # Store in patient_plans table if it exists
    try:
        if supabase:
            supabase.table("patient_plans").upsert({
                "patient_id": patient["id"],
                "plan_type": "diet",
                "content": instructions,
                "updated_at": datetime.now().isoformat()
            }, on_conflict="patient_id,plan_type").execute()
    except Exception as e:
        print(f"Error saving food instructions: {e}")
    
    return {
        "success": True,
        "patient_id": patient["id"],
        "patient_name": patient["name"],
        "instructions": instructions,
        "duration_days": duration_days,
        "end_date": end_date,
        "created_at": datetime.now().isoformat(),
        "message": f"Food instructions added for {patient['name']}: {instructions}"
    }


# --- Hazard Management ---
# Note: Hazards table may not exist in current schema

async def list_active_hazards(supabase) -> Dict[str, Any]:
    hazards = _fetch_hazards(supabase)
    active = [h for h in hazards if h.get("status") in ["active", "responding"]]
    return {
        "hazards": active,
        "count": len(active),
        "note": "Hazards feature requires hazards table in database" if not hazards else None
    }


async def report_hazard(hazard_type: str, location: str, description: str, severity: str, supabase) -> Dict[str, Any]:
    new_hazard = {
        "id": f"H-{str(uuid.uuid4())[:8]}",
        "type": hazard_type,
        "location": location,
        "description": description,
        "severity": severity,
        "status": "active",
        "reported_at": datetime.now().isoformat()
    }
    
    # Try to save to hazards table if it exists
    try:
        if supabase:
            supabase.table("hazards").insert(new_hazard).execute()
    except Exception as e:
        print(f"Hazards table may not exist: {e}")
    
    return {
        "success": True,
        "hazard": new_hazard,
        "note": "Hazards feature requires hazards table in database"
    }


async def update_hazard_status(hazard_id: str, status: str, notes: Optional[str], supabase) -> Dict[str, Any]:
    hazards = _fetch_hazards(supabase)
    hazard = next((h for h in hazards if h.get("id") == hazard_id), None)
    if not hazard:
        return {"error": f"Hazard '{hazard_id}' not found"}
    
    old_status = hazard["status"]
    hazard["status"] = status
    
    return {
        "success": True,
        "hazard_id": hazard_id,
        "old_status": old_status,
        "new_status": status,
        "notes": notes
    }


async def get_hazard_details(hazard_id: str, supabase) -> Dict[str, Any]:
    hazards = _fetch_hazards(supabase)
    hazard = next((h for h in hazards if h.get("id") == hazard_id), None)
    if not hazard:
        return {"error": f"Hazard '{hazard_id}' not found"}
    
    return {"hazard": hazard}


async def get_hazards_by_room(room_id: str, supabase) -> Dict[str, Any]:
    room = fuzzy_match_room(room_id, MOCK_ROOMS)
    room_name = room["name"] if room else room_id
    
    hazards = _fetch_hazards(supabase)
    filtered = [h for h in hazards if room_name.lower() in h.get("location", "").lower()]
    return {
        "room": room_name,
        "hazards": filtered,
        "count": len(filtered)
    }


async def get_hazards_by_type(hazard_type: str, supabase) -> Dict[str, Any]:
    hazards = _fetch_hazards(supabase)
    filtered = [h for h in hazards if h.get("type") == hazard_type]
    return {
        "type": hazard_type,
        "hazards": filtered,
        "count": len(filtered)
    }


# --- Hospital Statistics ---

async def get_hospital_stats(supabase) -> Dict[str, Any]:
    patient_rooms = [r for r in MOCK_ROOMS if r["type"] in ["patient", "icu", "ward"]]
    occupied = [r for r in patient_rooms if r["status"] != "vacant" and r.get("patient_count", 0) > 0]
    critical = [r for r in patient_rooms if r["status"] == "critical"]
    
    # Fetch real data from Supabase
    patients = _fetch_all_patients_sync(supabase)
    hazards = _fetch_hazards(supabase)
    alerts = _fetch_alerts(supabase)
    
    return {
        "total_rooms": len(patient_rooms),
        "occupied_rooms": len(occupied),
        "vacant_rooms": len(patient_rooms) - len(occupied),
        "critical_rooms": len(critical),
        "total_patients": len(patients),
        "active_hazards": len([h for h in hazards if h.get("status") == "active"]),
        "active_alerts": len([a for a in alerts if a.get("status") == "active"]),
        "occupancy_rate": round(len(occupied) / len(patient_rooms) * 100, 1) if patient_rooms else 0
    }


async def get_occupancy_rate(supabase) -> Dict[str, Any]:
    stats = await get_hospital_stats(supabase)
    
    by_type = {}
    for room_type in ["patient", "icu", "ward"]:
        rooms_of_type = [r for r in MOCK_ROOMS if r["type"] == room_type]
        occupied_of_type = [r for r in rooms_of_type if r["status"] != "vacant"]
        by_type[room_type] = {
            "total": len(rooms_of_type),
            "occupied": len(occupied_of_type),
            "rate": round(len(occupied_of_type) / len(rooms_of_type) * 100, 1) if rooms_of_type else 0
        }
    
    return {
        "overall_rate": stats["occupancy_rate"],
        "by_type": by_type
    }


async def get_critical_summary(supabase) -> Dict[str, Any]:
    critical_rooms = [r for r in MOCK_ROOMS if r["status"] == "critical"]
    
    # Fetch real data from Supabase
    patients = _fetch_all_patients_sync(supabase)
    alerts = _fetch_alerts(supabase)
    
    critical_patients = [p for p in patients if p.get("status") == "critical"]
    critical_alerts = [a for a in alerts if a.get("severity") == "critical"]
    
    return {
        "critical_rooms": critical_rooms,
        "critical_patients": critical_patients,
        "critical_alerts": critical_alerts,
        "summary": {
            "rooms": len(critical_rooms),
            "patients": len(critical_patients),
            "alerts": len(critical_alerts)
        }
    }


async def get_activity_summary(hours: int, supabase) -> Dict[str, Any]:
    return {
        "period_hours": hours,
        "events": {
            "admissions": 3,
            "discharges": 2,
            "transfers": 1,
            "alerts_created": 5,
            "alerts_resolved": 3,
            "hazards_reported": 2,
            "hazards_resolved": 1
        },
        "current_status": await get_hospital_stats(supabase)
    }


# --- Medication Adherence ---

async def get_medication_schedule(patient_id: Optional[str], supabase) -> Dict[str, Any]:
    if patient_id:
        patient = _find_patient_by_id_or_name(patient_id, supabase)
        if patient:
            meds = _fetch_patient_medications(patient["id"], supabase)
            # Add patient names to medications
            for med in meds:
                med["patient_name"] = patient["name"]
        else:
            meds = []
    else:
        meds = _fetch_all_medications(supabase)
        # Add patient names to all medications
        patients = _fetch_all_patients_sync(supabase)
        for med in meds:
            patient = next((p for p in patients if p["id"] == med.get("patient_id")), None)
            if patient:
                med["patient_name"] = patient["name"]
    
    return {
        "medications": meds,
        "count": len(meds),
        "patient_id": patient_id
    }


async def mark_medication_given(patient_id: str, medication_id: str, administered_by: Optional[str], notes: Optional[str], supabase) -> Dict[str, Any]:
    patient = _find_patient_by_id_or_name(patient_id, supabase)
    if not patient:
        return {"error": f"Patient '{patient_id}' not found"}
    
    actual_patient_id = patient["id"]
    meds = _fetch_patient_medications(actual_patient_id, supabase)
    med = next((m for m in meds if m.get("id") == medication_id), None)
    
    if not med:
        return {"error": f"Medication '{medication_id}' not found for patient '{patient_id}'"}
    
    # Log the medication as given in pill_logs if the table exists
    try:
        if supabase:
            supabase.table("pill_logs").insert({
                "patient_id": actual_patient_id,
                "patient_pill_id": medication_id,
                "scheduled_time": datetime.now().isoformat(),
                "taken_time": datetime.now().isoformat(),
                "status": "taken",
                "notes": notes
            }).execute()
    except Exception as e:
        print(f"Error logging medication: {e}")
    
    return {
        "success": True,
        "medication_id": medication_id,
        "medication_name": med.get("name", "Unknown"),
        "patient_id": actual_patient_id,
        "patient_name": patient["name"],
        "administered_by": administered_by,
        "administered_at": datetime.now().isoformat()
    }


async def get_missed_medications(supabase) -> Dict[str, Any]:
    """Fetch real missed medications from Supabase database"""
    try:
        if supabase:
            from datetime import date
            today = date.today().isoformat()
            
            # Get all pill logs for today that are missed or late
            # Join through patient_pills to get pill info
            response = supabase.table("pill_logs").select(
                "id, patient_id, scheduled_time, status, patient_pills(pill_id, pills(name, strength, unit))"
            ).in_("status", ["missed", "late"]).gte("scheduled_time", today).execute()
            
            missed = response.data if response.data else []
            
            # Get patient names separately (patients -> users for full_name)
            patient_ids = list(set(m.get("patient_id") for m in missed if m.get("patient_id")))
            patient_names = {}
            
            if patient_ids:
                patients_res = supabase.table("patients").select(
                    "id, user_id, users!patients_user_id_fkey(full_name)"
                ).in_("id", patient_ids).execute()
                
                for p in (patients_res.data or []):
                    user = p.get("users", {}) or {}
                    patient_names[p.get("id")] = user.get("full_name", "Unknown")
            
            # Format the response
            formatted = []
            for m in missed:
                patient_pills = m.get("patient_pills", {}) or {}
                pill = patient_pills.get("pills", {}) or {}
                formatted.append({
                    "id": m.get("id"),
                    "patient_id": m.get("patient_id"),
                    "patient_name": patient_names.get(m.get("patient_id"), "Unknown"),
                    "medication_name": pill.get("name", "Unknown"),
                    "dosage": pill.get("dosage"),
                    "scheduled_time": m.get("scheduled_time"),
                    "status": m.get("status")
                })
            
            return {
                "missed_medications": formatted,
                "count": len(formatted)
            }
    except Exception as e:
        print(f"Error fetching missed medications from Supabase: {e}")
    
    # Return empty if Supabase query fails - no mock data fallback
    return {
        "missed_medications": [],
        "count": 0,
        "note": "No missed medications found or database query failed"
    }


async def get_medication_alerts(supabase) -> Dict[str, Any]:
    """Fetch real medication alerts from Supabase database"""
    try:
        if supabase:
            # Get medication-related alerts (missed_dose, low_adherence)
            response = supabase.table("alerts").select(
                "id, title, message, severity, type, patient_id, created_at"
            ).in_("type", ["missed_dose", "low_adherence", "pattern_detected"]).eq("resolved", False).execute()
            
            alerts = response.data if response.data else []
            
            # Get patient names separately
            patient_ids = list(set(a.get("patient_id") for a in alerts if a.get("patient_id")))
            patient_names = {}
            
            if patient_ids:
                patients_res = supabase.table("patients").select(
                    "id, user_id, users!patients_user_id_fkey(full_name)"
                ).in_("id", patient_ids).execute()
                
                for p in (patients_res.data or []):
                    user = p.get("users", {}) or {}
                    patient_names[p.get("id")] = user.get("full_name", "Unknown")
            
            # Format the response
            formatted = []
            for a in alerts:
                formatted.append({
                    "id": a.get("id"),
                    "title": a.get("title"),
                    "message": a.get("message"),
                    "severity": a.get("severity"),
                    "type": a.get("type"),
                    "patient_id": a.get("patient_id"),
                    "patient_name": patient_names.get(a.get("patient_id"), "Unknown"),
                    "created_at": a.get("created_at")
                })
            
            return {
                "alerts": formatted,
                "count": len(formatted)
            }
    except Exception as e:
        print(f"Error fetching medication alerts from Supabase: {e}")
    
    # Return empty if Supabase query fails - no mock data fallback
    return {
        "alerts": [],
        "count": 0,
        "note": "No medication alerts found or database query failed"
    }


# --- Alert System ---

async def get_active_alerts(severity: Optional[str], supabase) -> Dict[str, Any]:
    """Fetch real active alerts from Supabase database"""
    try:
        if supabase:
            query = supabase.table("alerts").select(
                "id, title, message, severity, type, patient_id, created_at"
            ).eq("resolved", False)
            
            if severity:
                query = query.eq("severity", severity)
            
            response = query.execute()
            alerts = response.data if response.data else []
            
            # Get patient names separately
            patient_ids = list(set(a.get("patient_id") for a in alerts if a.get("patient_id")))
            patient_names = {}
            
            if patient_ids:
                patients_res = supabase.table("patients").select(
                    "id, user_id, users!patients_user_id_fkey(full_name)"
                ).in_("id", patient_ids).execute()
                
                for p in (patients_res.data or []):
                    user = p.get("users", {}) or {}
                    patient_names[p.get("id")] = user.get("full_name", "Unknown")
            
            # Format the response
            formatted = []
            for a in alerts:
                formatted.append({
                    "id": a.get("id"),
                    "title": a.get("title"),
                    "message": a.get("message"),
                    "severity": a.get("severity"),
                    "type": a.get("type"),
                    "patient_id": a.get("patient_id"),
                    "patient_name": patient_names.get(a.get("patient_id")),
                    "created_at": a.get("created_at")
                })
            
            return {
                "alerts": formatted,
                "count": len(formatted),
                "severity_filter": severity
            }
    except Exception as e:
        print(f"Error fetching active alerts from Supabase: {e}")
    
    # Return empty if Supabase query fails - no mock data fallback
    return {
        "alerts": [],
        "count": 0,
        "severity_filter": severity,
        "note": "No active alerts found or database query failed"
    }


async def create_alert(title: str, description: str, severity: str, patient_id: Optional[str], room_id: Optional[str], supabase) -> Dict[str, Any]:
    actual_patient_id = None
    patient_name = None
    if patient_id:
        patient = _find_patient_by_id_or_name(patient_id, supabase)
        if patient:
            actual_patient_id = patient["id"]
            patient_name = patient["name"]
        else:
            actual_patient_id = patient_id
    
    new_alert = {
        "id": str(uuid.uuid4()),
        "title": title,
        "message": description,
        "severity": severity,
        "resolved": False,
        "patient_id": actual_patient_id,
        "created_at": datetime.now().isoformat()
    }
    
    # Try to save to alerts table if it exists
    try:
        if supabase:
            supabase.table("alerts").insert(new_alert).execute()
    except Exception as e:
        print(f"Alerts table may not exist or error saving: {e}")
    
    return {
        "success": True,
        "alert": {**new_alert, "patient_name": patient_name, "room_id": room_id}
    }


async def acknowledge_alert(alert_id: str, acknowledged_by: Optional[str], supabase) -> Dict[str, Any]:
    alerts = _fetch_alerts(supabase)
    alert = next((a for a in alerts if a.get("id") == alert_id), None)
    if not alert:
        return {"error": f"Alert '{alert_id}' not found"}
    
    # Try to update in database
    try:
        if supabase:
            supabase.table("alerts").update({
                "acknowledged_by": acknowledged_by,
                "acknowledged_at": datetime.now().isoformat()
            }).eq("id", alert_id).execute()
    except Exception as e:
        print(f"Error updating alert: {e}")
    
    return {
        "success": True,
        "alert_id": alert_id,
        "acknowledged_by": acknowledged_by
    }


async def resolve_alert(alert_id: str, resolution_notes: Optional[str], supabase) -> Dict[str, Any]:
    alerts = _fetch_alerts(supabase)
    alert = next((a for a in alerts if a.get("id") == alert_id), None)
    if not alert:
        return {"error": f"Alert '{alert_id}' not found"}
    
    # Try to update in database
    try:
        if supabase:
            supabase.table("alerts").update({
                "resolved": True,
                "resolution_notes": resolution_notes,
                "resolved_at": datetime.now().isoformat()
            }).eq("id", alert_id).execute()
    except Exception as e:
        print(f"Error resolving alert: {e}")
    
    return {
        "success": True,
        "alert_id": alert_id,
        "resolution_notes": resolution_notes
    }


# --- Dashboard / Patient Daily Data ---

async def get_patient_daily_summary(patient_identifier: str, date: Optional[str], supabase) -> Dict[str, Any]:
    """Get the AI-generated daily summary for a patient"""
    try:
        if not supabase:
            return {"error": "Database not available"}
        
        # Find patient by name or ID using Supabase
        patient = _find_patient_by_id_or_name(patient_identifier, supabase)
        if patient:
            patient_id = patient.get("id")
        else:
            return {"error": f"Patient '{patient_identifier}' not found"}
        
        target_date = date or datetime.now().strftime("%Y-%m-%d")
        
        # Get the cached summary
        summary_res = supabase.table("daily_summaries").select("*").eq(
            "patient_id", patient_id
        ).eq("date", target_date).single().execute()
        
        if summary_res.data:
            return {
                "patient_id": patient_id,
                "date": target_date,
                "summary": summary_res.data.get("ai_summary"),
                "alerts": summary_res.data.get("ai_alerts", []),
                "journal_summary": summary_res.data.get("journal_summary"),
                "meals_summary": summary_res.data.get("meals_summary"),
                "activity_summary": summary_res.data.get("activity_summary"),
                "medications_taken": summary_res.data.get("medications_taken", 0),
                "medications_scheduled": summary_res.data.get("medications_scheduled", 0),
                "total_calories": summary_res.data.get("total_calories_consumed", 0),
                "exercise_minutes": summary_res.data.get("total_exercise_minutes", 0)
            }
        else:
            return {
                "patient_id": patient_id,
                "date": target_date,
                "message": "No summary available for this date. Use refresh_patient_summary to generate one."
            }
    except Exception as e:
        return {"error": f"Failed to get daily summary: {str(e)}"}


async def refresh_patient_summary(patient_identifier: str, date: Optional[str], supabase) -> Dict[str, Any]:
    """Force regenerate the daily summary for a patient"""
    # This would need to trigger the actual summary generation endpoint
    # For now, we return a message indicating this should be done via the API
    return {
        "message": f"To refresh the summary for patient '{patient_identifier}', use the 'Refresh' button on the dashboard or call the daily-summary API endpoint with force_refresh=true.",
        "action_required": "manual_refresh"
    }


async def mark_pill_taken(patient_identifier: str, medication_name: str, date: Optional[str], supabase) -> Dict[str, Any]:
    """Mark a scheduled medication as taken"""
    try:
        if not supabase:
            return {"error": "Database not available"}
        
        # Find patient
        patients_res = supabase.table("patients").select(
            "id, user_id, users!patients_user_id_fkey(full_name)"
        ).execute()
        
        patient_id = None
        patient_name = None
        for p in (patients_res.data or []):
            user = p.get("users", {}) or {}
            if patient_identifier.lower() in user.get("full_name", "").lower() or patient_identifier == p.get("id"):
                patient_id = p.get("id")
                patient_name = user.get("full_name", "Unknown")
                break
        
        if not patient_id:
            return {"error": f"Patient '{patient_identifier}' not found"}
        
        target_date = date or datetime.now().strftime("%Y-%m-%d")
        
        # Find the pill log entry for this medication
        pill_logs_res = supabase.table("pill_logs").select(
            "id, patient_pills(pill_id, pills(name))"
        ).eq("patient_id", patient_id).gte(
            "scheduled_time", f"{target_date}T00:00:00"
        ).lte("scheduled_time", f"{target_date}T23:59:59").execute()
        
        for log in (pill_logs_res.data or []):
            patient_pills = log.get("patient_pills", {}) or {}
            pill = patient_pills.get("pills", {}) or {}
            if medication_name.lower() in pill.get("name", "").lower():
                # Update this log to 'taken'
                supabase.table("pill_logs").update({
                    "status": "taken",
                    "taken_at": datetime.now().isoformat()
                }).eq("id", log.get("id")).execute()
                
                return {
                    "success": True,
                    "patient_name": patient_name,
                    "medication": pill.get("name"),
                    "status": "taken",
                    "message": f"Marked {pill.get('name')} as taken for {patient_name}"
                }
        
        return {"error": f"No scheduled dose of '{medication_name}' found for {patient_name} on {target_date}"}
    except Exception as e:
        return {"error": f"Failed to mark medication as taken: {str(e)}"}


async def get_patient_care_plans_tool(patient_identifier: str, supabase) -> Dict[str, Any]:
    """Get care plans (diet and exercise) for a patient"""
    try:
        if not supabase:
            return {"error": "Database not available"}
        
        # Find patient
        patients_res = supabase.table("patients").select(
            "id, user_id, users!patients_user_id_fkey(full_name)"
        ).execute()
        
        patient_id = None
        patient_name = None
        for p in (patients_res.data or []):
            user = p.get("users", {}) or {}
            if patient_identifier.lower() in user.get("full_name", "").lower() or patient_identifier == p.get("id"):
                patient_id = p.get("id")
                patient_name = user.get("full_name", "Unknown")
                break
        
        if not patient_id:
            return {"error": f"Patient '{patient_identifier}' not found"}
        
        # Get care plans
        plans_res = supabase.table("patient_plans").select("*").eq(
            "patient_id", patient_id
        ).eq("is_active", True).execute()
        
        plans = plans_res.data or []
        diet_plan = next((p for p in plans if p.get("plan_type") == "diet"), None)
        exercise_plan = next((p for p in plans if p.get("plan_type") == "exercise"), None)
        
        return {
            "patient_name": patient_name,
            "diet_plan": {
                "title": diet_plan.get("title") if diet_plan else None,
                "notes": diet_plan.get("notes") if diet_plan else None,
                "calorie_target": diet_plan.get("calorie_target") if diet_plan else None,
                "protein_target": diet_plan.get("protein_target") if diet_plan else None,
                "carb_target": diet_plan.get("carb_target") if diet_plan else None,
                "fat_target": diet_plan.get("fat_target") if diet_plan else None
            } if diet_plan else None,
            "exercise_plan": {
                "title": exercise_plan.get("title") if exercise_plan else None,
                "notes": exercise_plan.get("notes") if exercise_plan else None,
                "exercise_minutes_target": exercise_plan.get("exercise_minutes_target") if exercise_plan else None,
                "exercise_days_per_week": exercise_plan.get("exercise_days_per_week") if exercise_plan else None
            } if exercise_plan else None
        }
    except Exception as e:
        return {"error": f"Failed to get care plans: {str(e)}"}


async def get_patient_pill_logs_tool(patient_identifier: str, date: Optional[str], supabase) -> Dict[str, Any]:
    """Get medication logs for a patient"""
    try:
        if not supabase:
            return {"error": "Database not available"}
        
        # Find patient
        patients_res = supabase.table("patients").select(
            "id, user_id, users!patients_user_id_fkey(full_name)"
        ).execute()
        
        patient_id = None
        patient_name = None
        for p in (patients_res.data or []):
            user = p.get("users", {}) or {}
            if patient_identifier.lower() in user.get("full_name", "").lower() or patient_identifier == p.get("id"):
                patient_id = p.get("id")
                patient_name = user.get("full_name", "Unknown")
                break
        
        if not patient_id:
            return {"error": f"Patient '{patient_identifier}' not found"}
        
        target_date = date or datetime.now().strftime("%Y-%m-%d")
        
        # Get pill logs
        logs_res = supabase.table("pill_logs").select(
            "id, status, scheduled_time, taken_at, patient_pills(pill_id, pills(name, strength, unit))"
        ).eq("patient_id", patient_id).gte(
            "scheduled_time", f"{target_date}T00:00:00"
        ).lte("scheduled_time", f"{target_date}T23:59:59").execute()
        
        logs = []
        for log in (logs_res.data or []):
            patient_pills = log.get("patient_pills", {}) or {}
            pill = patient_pills.get("pills", {}) or {}
            logs.append({
                "medication": pill.get("name", "Unknown"),
                "dosage": pill.get("dosage"),
                "status": log.get("status"),
                "scheduled_time": log.get("scheduled_time"),
                "taken_at": log.get("taken_at")
            })
        
        taken = sum(1 for l in logs if l["status"] == "taken")
        missed = sum(1 for l in logs if l["status"] == "missed")
        pending = sum(1 for l in logs if l["status"] in ["pending", "upcoming"])
        
        return {
            "patient_name": patient_name,
            "date": target_date,
            "medications": logs,
            "summary": {
                "taken": taken,
                "missed": missed,
                "pending": pending,
                "total": len(logs)
            }
        }
    except Exception as e:
        return {"error": f"Failed to get pill logs: {str(e)}"}


async def get_patient_exercises_tool(patient_identifier: str, date: Optional[str], supabase) -> Dict[str, Any]:
    """Get logged exercises for a patient"""
    try:
        if not supabase:
            return {"error": "Database not available"}
        
        # Find patient
        patients_res = supabase.table("patients").select(
            "id, user_id, users!patients_user_id_fkey(full_name)"
        ).execute()
        
        patient_id = None
        patient_name = None
        user_id = None
        for p in (patients_res.data or []):
            user = p.get("users", {}) or {}
            if patient_identifier.lower() in user.get("full_name", "").lower() or patient_identifier == p.get("id"):
                patient_id = p.get("id")
                patient_name = user.get("full_name", "Unknown")
                user_id = p.get("user_id")
                break
        
        if not patient_id or not user_id:
            return {"error": f"Patient '{patient_identifier}' not found"}
        
        # Get exercises (via user_id)
        query = supabase.table("exercises").select("*").eq("user_id", user_id)
        
        if date:
            query = query.gte("logged_at", f"{date}T00:00:00").lte("logged_at", f"{date}T23:59:59")
        
        exercises_res = query.order("logged_at", desc=True).limit(20).execute()
        
        exercises = []
        total_minutes = 0
        total_calories = 0
        
        for ex in (exercises_res.data or []):
            exercises.append({
                "type": ex.get("exercise_type", "Exercise"),
                "duration_minutes": ex.get("duration_minutes", 0),
                "calories_burned": ex.get("calories_burned", 0),
                "intensity": ex.get("intensity"),
                "logged_at": ex.get("logged_at")
            })
            total_minutes += ex.get("duration_minutes", 0) or 0
            total_calories += ex.get("calories_burned", 0) or 0
        
        return {
            "patient_name": patient_name,
            "date": date or "all",
            "exercises": exercises,
            "summary": {
                "count": len(exercises),
                "total_minutes": total_minutes,
                "total_calories_burned": total_calories
            }
        }
    except Exception as e:
        return {"error": f"Failed to get exercises: {str(e)}"}
