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
            "description": "Assign an EXISTING patient to a specific room. If patient_id is not provided, returns a list of unassigned patients to choose from.",
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "string",
                        "description": "Patient ID or name to assign (optional - will list available patients if not provided)"
                    },
                    "room_id": {
                        "type": "string",
                        "description": "Room ID or name to assign to"
                    }
                },
                "required": ["room_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "admit_new_patient",
            "description": "Create a NEW patient and immediately assign them to a room. Use this when admitting someone who is not yet in the system.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Full name of the new patient"
                    },
                    "room_id": {
                        "type": "string",
                        "description": "Room ID or name to assign the new patient to"
                    },
                    "age": {
                        "type": "integer",
                        "description": "Patient's age (optional)"
                    },
                    "gender": {
                        "type": "string",
                        "enum": ["male", "female", "other"],
                        "description": "Patient's gender (optional)"
                    },
                    "conditions": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of medical conditions (optional)"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["stable", "improving", "declining", "critical"],
                        "description": "Initial patient status (default: stable)"
                    }
                },
                "required": ["name", "room_id"]
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
            "name": "list_unassigned_patients",
            "description": "Get patients who are NOT currently assigned to any room. Use this when you need to know which patients need room assignment, or when a user asks to assign a patient without specifying which one.",
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
# HELPER FUNCTIONS FOR DATABASE QUERIES
# ============================================================================

def fuzzy_match_room_db(query: str, supabase) -> Optional[Dict]:
    """Fuzzy match room by ID or name from database"""
    if not supabase:
        return None
    
    query_lower = query.lower().strip()
    
    try:
        # Fetch all rooms from database
        response = supabase.table("hospital_rooms").select("*").execute()
        rooms = response.data or []
        
        # Exact match on ID or name
        for room in rooms:
            if query_lower == room["id"].lower() or query_lower == room["name"].lower():
                return room
        
        # Handle "Room X" format
        if query_lower.startswith("room "):
            room_num = query_lower.replace("room ", "").strip()
            for room in rooms:
                name_lower = room["name"].lower()
                if name_lower == f"room {room_num}" or name_lower == f"room-{room_num}":
                    return room
        
        # Handle just number like "1", "2"
        if query_lower.isdigit():
            for room in rooms:
                if room["name"].lower() == f"room {query_lower}":
                    return room
        
        # Partial match on name
        for room in rooms:
            if query_lower in room["name"].lower():
                return room
        
        # Partial match on ID
        for room in rooms:
            if query_lower in room["id"].lower():
                return room
        
    except Exception as e:
        print(f"Error matching room: {e}")
    
    return None


def fuzzy_match_patient_db(query: str, supabase) -> Optional[Dict]:
    """Fuzzy match patient by ID or name from database"""
    if not supabase:
        return None
    
    query_lower = query.lower().strip()
    
    try:
        # Fetch all patients with user info
        response = supabase.table("patients").select(
            "id, user_id, age, gender, medical_conditions, status, users!patients_user_id_fkey(full_name, email)"
        ).execute()
        patients = response.data or []
        
        for patient in patients:
            user = patient.get("users", {}) or {}
            patient_name = user.get("full_name", "").lower()
            patient_id = str(patient.get("id", "")).lower()
            
            # Exact match
            if query_lower == patient_id or query_lower == patient_name:
                return {
                    "id": patient["id"],
                    "name": user.get("full_name", "Unknown"),
                    "age": patient.get("age"),
                    "condition": ", ".join(patient.get("medical_conditions") or []),
                    "status": patient.get("status", "stable")
                }
            
            # Partial match on name
            if query_lower in patient_name:
                return {
                    "id": patient["id"],
                    "name": user.get("full_name", "Unknown"),
                    "age": patient.get("age"),
                    "condition": ", ".join(patient.get("medical_conditions") or []),
                    "status": patient.get("status", "stable")
                }
        
    except Exception as e:
        print(f"Error matching patient: {e}")
    
    return None


def get_patient_in_room_db(room_id: str, supabase) -> Optional[Dict]:
    """Get the patient currently assigned to a room"""
    if not supabase:
        return None
    
    try:
        # Get active room assignment (where discharged_at is null)
        response = supabase.table("room_assignments").select(
            "patient_id, assigned_at, patients(id, user_id, age, medical_conditions, status, users!patients_user_id_fkey(full_name))"
        ).eq("room_id", room_id).is_("discharged_at", "null").execute()
        
        if response.data and len(response.data) > 0:
            assignment = response.data[0]
            patient = assignment.get("patients", {}) or {}
            user = patient.get("users", {}) or {}
            
            return {
                "id": patient.get("id"),
                "name": user.get("full_name", "Unknown"),
                "age": patient.get("age"),
                "condition": ", ".join(patient.get("medical_conditions") or []),
                "status": patient.get("status", "stable"),
                "assigned_at": assignment.get("assigned_at")
            }
    except Exception as e:
        print(f"Error getting patient in room: {e}")
    
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
        elif tool_name == "admit_new_patient":
            return await admit_new_patient(
                tool_input.get("name", ""),
                tool_input.get("room_id", ""),
                tool_input.get("age"),
                tool_input.get("gender"),
                tool_input.get("conditions"),
                tool_input.get("status", "stable"),
                supabase
            )
        elif tool_name == "remove_patient_from_room":
            return await remove_patient_from_room(tool_input.get("room_id", ""), tool_input.get("reason"), supabase)
        elif tool_name == "get_hallways":
            return await get_hallways(supabase)
        
        # Patient Operations
        elif tool_name == "list_all_patients":
            return await list_all_patients(tool_input.get("include_discharged", False), supabase)
        elif tool_name == "list_unassigned_patients":
            return await list_unassigned_patients(supabase)
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
# TOOL IMPLEMENTATIONS (using Supabase database)
# ============================================================================

# --- Room Management ---

async def get_room_status(room_id: str, supabase) -> Dict[str, Any]:
    """Get room status from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    room = fuzzy_match_room_db(room_id, supabase)
    if not room:
        return {"error": f"Room '{room_id}' not found"}
    
    # Get patient assigned to this room
    patient = get_patient_in_room_db(room["id"], supabase)
    
    # Get active tasks for this room
    tasks = []
    try:
        tasks_res = supabase.table("room_tasks").select("*").eq(
            "room_id", room["id"]
        ).eq("status", "pending").execute()
        tasks = tasks_res.data or []
    except Exception as e:
        print(f"Error fetching room tasks: {e}")
    
    # Get hazards for this room
    hazards = []
    try:
        hazards_res = supabase.table("hospital_hazards").select("*").eq(
            "room_id", room["id"]
        ).in_("status", ["active", "responding"]).execute()
        hazards = hazards_res.data or []
    except Exception as e:
        print(f"Error fetching room hazards: {e}")
    
    return {
        "room_id": room["id"],
        "room_name": room["name"],
        "type": room["room_type"],
        "status": room["status"],
        "occupied": patient is not None,
        "patient": patient,
        "pending_tasks": len(tasks),
        "active_hazards": len(hazards)
    }


async def list_all_rooms(supabase) -> Dict[str, Any]:
    """List all rooms with their current occupancy status from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        # Fetch all rooms
        rooms_res = supabase.table("hospital_rooms").select("*").execute()
        rooms = rooms_res.data or []
        
        # Fetch all active room assignments with patient info
        assignments_res = supabase.table("room_assignments").select(
            "room_id, patient_id, patients(id, users!patients_user_id_fkey(full_name))"
        ).is_("discharged_at", "null").execute()
        
        # Build assignment map
        assignment_map = {}
        for a in (assignments_res.data or []):
            patient = a.get("patients", {}) or {}
            user = patient.get("users", {}) or {}
            assignment_map[a["room_id"]] = user.get("full_name", "Unknown")
        
        rooms_with_occupancy = []
        for room in rooms:
            patient_name = assignment_map.get(room["id"])
            rooms_with_occupancy.append({
                "id": room["id"],
                "name": room["name"],
                "type": room["room_type"],
                "status": room["status"],
                "occupied": patient_name is not None,
                "patient_name": patient_name
            })
        
        return {
            "rooms": rooms_with_occupancy,
            "total": len(rooms_with_occupancy)
        }
    except Exception as e:
        print(f"Error listing rooms: {e}")
        return {"error": str(e)}


async def list_rooms_by_type(room_type: str, supabase) -> Dict[str, Any]:
    """List rooms filtered by type from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        response = supabase.table("hospital_rooms").select("*").eq(
            "room_type", room_type
        ).execute()
        rooms = response.data or []
        
        return {
            "rooms": [{"id": r["id"], "name": r["name"], "status": r["status"]} for r in rooms],
            "count": len(rooms),
            "type": room_type
        }
    except Exception as e:
        return {"error": str(e)}


async def list_available_rooms(supabase) -> Dict[str, Any]:
    """List rooms available for patient admission from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        # Get patient-capable rooms
        rooms_res = supabase.table("hospital_rooms").select("*").in_(
            "room_type", ["patient", "critical"]
        ).neq("status", "maintenance").execute()
        rooms = rooms_res.data or []
        
        # Get occupied room IDs
        assignments_res = supabase.table("room_assignments").select(
            "room_id"
        ).is_("discharged_at", "null").execute()
        occupied_ids = set(a["room_id"] for a in (assignments_res.data or []))
        
        # Filter to available rooms
        available = [
            {"id": r["id"], "name": r["name"], "type": r["room_type"], "status": r["status"]}
            for r in rooms if r["id"] not in occupied_ids
        ]
        
        return {
            "available_rooms": available,
            "count": len(available)
        }
    except Exception as e:
        return {"error": str(e)}


async def list_occupied_rooms(supabase) -> Dict[str, Any]:
    """List rooms with patients assigned from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        # Get active assignments with room and patient info
        assignments_res = supabase.table("room_assignments").select(
            "room_id, hospital_rooms(id, name, room_type, status), patients(id, medical_conditions, users!patients_user_id_fkey(full_name))"
        ).is_("discharged_at", "null").execute()
        
        occupied = []
        for a in (assignments_res.data or []):
            room = a.get("hospital_rooms", {}) or {}
            patient = a.get("patients", {}) or {}
            user = patient.get("users", {}) or {}
            
            occupied.append({
                "id": room.get("id"),
                "name": room.get("name"),
                "type": room.get("room_type"),
                "status": room.get("status"),
                "patient_name": user.get("full_name", "Unknown"),
                "patient_condition": ", ".join(patient.get("medical_conditions") or [])
            })
        
        return {
            "occupied_rooms": occupied,
            "count": len(occupied)
        }
    except Exception as e:
        return {"error": str(e)}


async def update_room_status(room_id: str, status: str, reason: Optional[str], supabase) -> Dict[str, Any]:
    """Update room status in database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    room = fuzzy_match_room_db(room_id, supabase)
    if not room:
        return {"error": f"Room '{room_id}' not found"}
    
    old_status = room["status"]
    
    try:
        # Update room status
        supabase.table("hospital_rooms").update({
            "status": status
        }).eq("id", room["id"]).execute()
        
        # Record status change in history
        supabase.table("room_status_history").insert({
            "room_id": room["id"],
            "old_status": old_status,
            "new_status": status,
            "reason": reason,
            "changed_by": "ai_system"
        }).execute()
        
        return {
            "success": True,
            "room_id": room["id"],
            "room_name": room["name"],
            "old_status": old_status,
            "new_status": status,
            "reason": reason
        }
    except Exception as e:
        return {"error": str(e)}


async def get_room_patient(room_id: str, supabase) -> Dict[str, Any]:
    """Get patient currently in a room from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    room = fuzzy_match_room_db(room_id, supabase)
    if not room:
        return {"error": f"Room '{room_id}' not found"}
    
    patient = get_patient_in_room_db(room["id"], supabase)
    
    if not patient:
        return {
            "room": room["name"],
            "occupied": False,
            "message": f"{room['name']} is currently empty"
        }
    
    return {
        "room": room["name"],
        "occupied": True,
        "patient": patient
    }


async def assign_patient_to_room(patient_id: str, room_id: str, supabase) -> Dict[str, Any]:
    """Assign a patient to a room in database.
    
    If patient_id is empty/missing, returns list of unassigned patients to choose from.
    """
    if not supabase:
        return {"error": "Database not configured"}
    
    # If no patient_id provided, help by listing unassigned patients
    if not patient_id or patient_id.strip() == "":
        unassigned = await list_unassigned_patients(supabase)
        if unassigned.get("count", 0) > 0:
            patients = unassigned.get("unassigned_patients", [])
            patient_list = "\n".join([f"- {p['name']} (ID: {p['id'][:8]}..., {p.get('status', 'stable')})" for p in patients[:10]])
            return {
                "error": "No patient specified. Please specify which patient to assign.",
                "available_patients": patients[:10],
                "suggestion": f"These patients need room assignment:\n{patient_list}\n\nPlease specify the patient name or ID."
            }
        else:
            return {
                "error": "No patient specified and no unassigned patients found.",
                "suggestion": "All patients are currently assigned to rooms, or you may need to create a new patient first."
            }
    
    room = fuzzy_match_room_db(room_id, supabase)
    if not room:
        return {"error": f"Room '{room_id}' not found"}
    
    patient = fuzzy_match_patient_db(patient_id, supabase)
    if not patient:
        # Patient not found - suggest available patients
        unassigned = await list_unassigned_patients(supabase)
        if unassigned.get("count", 0) > 0:
            patients = unassigned.get("unassigned_patients", [])
            return {
                "error": f"Patient '{patient_id}' not found.",
                "available_patients": patients[:5],
                "suggestion": f"Did you mean one of these unassigned patients? {', '.join([p['name'] for p in patients[:5]])}"
            }
        return {"error": f"Patient '{patient_id}' not found"}
    
    # Check if room is already occupied
    existing_patient = get_patient_in_room_db(room["id"], supabase)
    if existing_patient:
        return {"error": f"Room '{room['name']}' is already occupied by {existing_patient['name']}. Discharge them first or choose another room."}
    
    try:
        # Remove patient from any previous room
        supabase.table("room_assignments").update({
            "discharged_at": datetime.now().isoformat()
        }).eq("patient_id", patient["id"]).is_("discharged_at", "null").execute()
        
        # Create new assignment
        supabase.table("room_assignments").insert({
            "room_id": room["id"],
            "patient_id": patient["id"],
            "notes": "Assigned via AI assistant"
        }).execute()
        
        # Update room status if vacant
        if room["status"] == "vacant":
            supabase.table("hospital_rooms").update({
                "status": "normal"
            }).eq("id", room["id"]).execute()
        
        return {
            "success": True,
            "patient_id": str(patient["id"]),
            "patient_name": patient["name"],
            "room_name": room["name"],
            "room_id": room["id"]
        }
    except Exception as e:
        return {"error": str(e)}


async def admit_new_patient(
    name: str, 
    room_id: str, 
    age: Optional[int],
    gender: Optional[str],
    conditions: Optional[List[str]],
    status: str,
    supabase
) -> Dict[str, Any]:
    """Create a new patient and immediately assign them to a room"""
    if not supabase:
        return {"error": "Database not configured"}
    
    if not name or not name.strip():
        return {"error": "Patient name is required"}
    
    # Validate room
    room = fuzzy_match_room_db(room_id, supabase)
    if not room:
        return {"error": f"Room '{room_id}' not found"}
    
    # Check if room is already occupied
    existing_patient = get_patient_in_room_db(room["id"], supabase)
    if existing_patient:
        return {"error": f"Room '{room['name']}' is already occupied by {existing_patient['name']}. Choose another room or discharge the current patient first."}
    
    try:
        # Generate a unique email for the user (required by schema)
        import random
        import string
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        email = f"{name.lower().replace(' ', '.')}_{random_suffix}@patient.hospital.local"
        
        # Create user first
        user_res = supabase.table("users").insert({
            "email": email,
            "full_name": name,
            "role": "patient"
        }).execute()
        
        if not user_res.data:
            return {"error": "Failed to create user account for patient"}
        
        user_id = user_res.data[0]["id"]
        
        # Create patient record
        patient_data = {
            "user_id": user_id,
            "status": status or "stable"
        }
        if age:
            patient_data["age"] = age
        if gender:
            patient_data["gender"] = gender
        if conditions:
            patient_data["medical_conditions"] = conditions
        
        patient_res = supabase.table("patients").insert(patient_data).execute()
        
        if not patient_res.data:
            return {"error": "Failed to create patient record"}
        
        patient_id = patient_res.data[0]["id"]
        
        # Create room assignment
        supabase.table("room_assignments").insert({
            "room_id": room["id"],
            "patient_id": patient_id,
            "notes": f"New patient admitted via AI assistant"
        }).execute()
        
        # Update room status to normal (occupied)
        supabase.table("hospital_rooms").update({
            "status": "normal"
        }).eq("id", room["id"]).execute()
        
        return {
            "success": True,
            "patient_id": str(patient_id),
            "patient_name": name,
            "room_name": room["name"],
            "room_id": room["id"],
            "message": f"Successfully admitted {name} to {room['name']}"
        }
    except Exception as e:
        print(f"Error admitting new patient: {e}")
        return {"error": str(e)}


async def remove_patient_from_room(room_id: str, reason: Optional[str], supabase) -> Dict[str, Any]:
    """Remove/discharge patient from a room in database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    room = fuzzy_match_room_db(room_id, supabase)
    if not room:
        return {"error": f"Room '{room_id}' not found"}
    
    patient = get_patient_in_room_db(room["id"], supabase)
    if not patient:
        return {"error": f"{room['name']} is already empty"}
    
    try:
        # Mark assignment as discharged
        supabase.table("room_assignments").update({
            "discharged_at": datetime.now().isoformat(),
            "notes": reason or "Discharged via AI assistant"
        }).eq("room_id", room["id"]).eq("patient_id", patient["id"]).is_(
            "discharged_at", "null"
        ).execute()
        
        # Set room status to vacant (for patient-type rooms)
        if room["room_type"] in ["patient"]:
            supabase.table("hospital_rooms").update({
                "status": "vacant"
            }).eq("id", room["id"]).execute()
        
        return {
            "success": True,
            "room_name": room["name"],
            "discharged_patient": patient["name"],
            "reason": reason or "Discharged"
        }
    except Exception as e:
        return {"error": str(e)}


async def get_hallways(supabase) -> Dict[str, Any]:
    """Get all hallway areas from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        response = supabase.table("hospital_rooms").select("*").eq(
            "room_type", "hallway"
        ).execute()
        hallways = response.data or []
        
        return {
            "hallways": [{"id": h["id"], "name": h["name"], "status": h["status"]} for h in hallways],
            "count": len(hallways)
        }
    except Exception as e:
        return {"error": str(e)}


# --- Patient Operations ---

async def list_all_patients(include_discharged: bool, supabase) -> Dict[str, Any]:
    """Fetch real patients from Supabase database"""
    try:
        if supabase:
            # Join patients with users to get full_name (using explicit FK hint)
            response = supabase.table("patients").select(
                "id, user_id, age, gender, medical_conditions, status, created_at, users!patients_user_id_fkey(full_name, email)"
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
                    "status": p.get("status", "stable"),
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


async def list_unassigned_patients(supabase) -> Dict[str, Any]:
    """Get patients who are NOT currently assigned to any room"""
    try:
        if supabase:
            # Get all patients
            patients_res = supabase.table("patients").select(
                "id, user_id, age, gender, medical_conditions, status, users!patients_user_id_fkey(full_name, email)"
            ).execute()
            all_patients = patients_res.data or []
            
            # Get currently assigned patient IDs
            assignments_res = supabase.table("room_assignments").select(
                "patient_id"
            ).is_("discharged_at", "null").execute()
            assigned_ids = {a["patient_id"] for a in (assignments_res.data or [])}
            
            # Filter to unassigned patients
            unassigned = []
            for p in all_patients:
                if p["id"] not in assigned_ids:
                    user = p.get("users", {}) or {}
                    unassigned.append({
                        "id": p["id"],
                        "name": user.get("full_name", "Unknown"),
                        "age": p.get("age"),
                        "status": p.get("status", "stable"),
                        "conditions": p.get("medical_conditions", [])
                    })
            
            if unassigned:
                return {
                    "unassigned_patients": unassigned,
                    "count": len(unassigned),
                    "message": f"{len(unassigned)} patient(s) need room assignment"
                }
            else:
                return {
                    "unassigned_patients": [],
                    "count": 0,
                    "message": "All patients are currently assigned to rooms"
                }
    except Exception as e:
        print(f"Error fetching unassigned patients: {e}")
        return {"error": str(e)}
    
    return {"error": "Database not configured"}


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
    """Get patient vitals from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    patient = fuzzy_match_patient_db(patient_id, supabase)
    if not patient:
        return {"error": f"Patient '{patient_id}' not found"}
    
    try:
        # Get most recent vitals
        vitals_res = supabase.table("vitals").select("*").eq(
            "patient_id", patient["id"]
        ).order("measured_at", desc=True).limit(10).execute()
        
        vitals = {}
        for v in (vitals_res.data or []):
            vital_type = v.get("type")
            if vital_type not in vitals:
                vitals[vital_type] = {
                    "value": v.get("value_primary"),
                    "secondary": v.get("value_secondary"),
                    "unit": v.get("unit"),
                    "recorded_at": v.get("measured_at")
                }
        
        return {
            "patient_id": str(patient["id"]),
            "patient_name": patient["name"],
            "vitals": vitals
        }
    except Exception as e:
        return {"error": str(e)}


async def update_patient_status(patient_id: str, status: str, notes: Optional[str], supabase) -> Dict[str, Any]:
    """Update patient status in database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    patient = fuzzy_match_patient_db(patient_id, supabase)
    if not patient:
        return {"error": f"Patient '{patient_id}' not found"}
    
    old_status = patient.get("status", "unknown")
    
    try:
        # Update patient status
        supabase.table("patients").update({
            "status": status,
            "notes": notes
        }).eq("id", patient["id"]).execute()
        
        return {
            "success": True,
            "patient_id": str(patient["id"]),
            "patient_name": patient["name"],
            "old_status": old_status,
            "new_status": status,
            "notes": notes
        }
    except Exception as e:
        return {"error": str(e)}


async def transfer_patient(patient_id: Optional[str], from_room: Optional[str], to_room: str, reason: Optional[str], supabase) -> Dict[str, Any]:
    """Transfer patient from one room to another in database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    dest_room = fuzzy_match_room_db(to_room, supabase)
    if not dest_room:
        return {"error": f"Destination room '{to_room}' not found"}
    
    # Check if destination room is already occupied
    existing_patient = get_patient_in_room_db(dest_room["id"], supabase)
    if existing_patient:
        return {"error": f"Destination room '{dest_room['name']}' is already occupied by {existing_patient['name']}"}
    
    # Find patient to transfer
    patient = None
    source_room = None
    if patient_id:
        patient = fuzzy_match_patient_db(patient_id, supabase)
    elif from_room:
        source_room = fuzzy_match_room_db(from_room, supabase)
        if source_room:
            patient = get_patient_in_room_db(source_room["id"], supabase)
    
    if not patient:
        return {"error": "Patient not found"}
    
    try:
        # Get current room assignment to find source room
        if not source_room:
            assignment_res = supabase.table("room_assignments").select(
                "room_id, hospital_rooms(id, name, room_type)"
            ).eq("patient_id", patient["id"]).is_("discharged_at", "null").execute()
            
            if assignment_res.data:
                source_room = assignment_res.data[0].get("hospital_rooms", {})
        
        old_room_name = source_room["name"] if source_room else None
        
        # Discharge from current room
        supabase.table("room_assignments").update({
            "discharged_at": datetime.now().isoformat(),
            "notes": f"Transferred to {dest_room['name']}: {reason or 'No reason provided'}"
        }).eq("patient_id", patient["id"]).is_("discharged_at", "null").execute()
        
        # Update source room status to vacant if it's a patient room
        if source_room and source_room.get("room_type") == "patient":
            supabase.table("hospital_rooms").update({
                "status": "vacant"
            }).eq("id", source_room["id"]).execute()
        
        # Create new assignment
        supabase.table("room_assignments").insert({
            "room_id": dest_room["id"],
            "patient_id": patient["id"],
            "notes": f"Transferred from {old_room_name or 'unknown'}: {reason or 'No reason provided'}"
        }).execute()
        
        # Update destination room status
        if dest_room["status"] == "vacant":
            supabase.table("hospital_rooms").update({
                "status": "normal"
            }).eq("id", dest_room["id"]).execute()
        
        return {
            "success": True,
            "patient_id": str(patient["id"]),
            "patient_name": patient["name"],
            "from_room": old_room_name,
            "to_room": dest_room["name"],
            "reason": reason or "Transfer completed"
        }
    except Exception as e:
        return {"error": str(e)}


async def add_patient_note(patient_id: str, note_type: str, content: str, supabase) -> Dict[str, Any]:
    """Add a note for a patient (stored as room task)"""
    if not supabase:
        return {"error": "Database not configured"}
    
    patient = fuzzy_match_patient_db(patient_id, supabase)
    if not patient:
        return {"error": f"Patient '{patient_id}' not found"}
    
    try:
        # Get patient's current room
        assignment_res = supabase.table("room_assignments").select(
            "room_id"
        ).eq("patient_id", patient["id"]).is_("discharged_at", "null").execute()
        
        room_id = assignment_res.data[0]["room_id"] if assignment_res.data else None
        
        # Create a task for the note
        supabase.table("room_tasks").insert({
            "room_id": room_id,
            "patient_id": patient["id"],
            "task_type": "other",
            "title": f"Note: {note_type}",
            "description": content,
            "priority": "normal",
            "status": "completed",
            "completed_at": datetime.now().isoformat()
        }).execute()
        
        return {
            "success": True,
            "patient_id": str(patient["id"]),
            "patient_name": patient["name"],
            "note_type": note_type,
            "content": content,
            "created_at": datetime.now().isoformat()
        }
    except Exception as e:
        return {"error": str(e)}


async def add_food_instructions(patient_id: str, instructions: str, duration_days: Optional[int], supabase) -> Dict[str, Any]:
    """Add food instructions for a patient (stored as room task)"""
    if not supabase:
        return {"error": "Database not configured"}
    
    patient = fuzzy_match_patient_db(patient_id, supabase)
    if not patient:
        return {"error": f"Patient '{patient_id}' not found"}
    
    try:
        from datetime import timedelta
        
        # Get patient's current room
        assignment_res = supabase.table("room_assignments").select(
            "room_id"
        ).eq("patient_id", patient["id"]).is_("discharged_at", "null").execute()
        
        room_id = assignment_res.data[0]["room_id"] if assignment_res.data else None
        
        # Calculate due date
        due_at = None
        if duration_days:
            due_at = (datetime.now() + timedelta(days=duration_days)).isoformat()
        
        # Create a food task
        supabase.table("room_tasks").insert({
            "room_id": room_id,
            "patient_id": patient["id"],
            "task_type": "food",
            "title": "Food Instructions",
            "description": instructions,
            "priority": "normal",
            "status": "pending",
            "due_at": due_at,
            "metadata": {"duration_days": duration_days}
        }).execute()
        
        return {
            "success": True,
            "patient_id": str(patient["id"]),
            "patient_name": patient["name"],
            "instructions": instructions,
            "duration_days": duration_days,
            "due_at": due_at,
            "created_at": datetime.now().isoformat(),
            "message": f"Food instructions added for {patient['name']}: {instructions}"
        }
    except Exception as e:
        return {"error": str(e)}


# --- Hazard Management ---
# Note: Hazards table may not exist in current schema

async def list_active_hazards(supabase) -> Dict[str, Any]:
    """List active hazards from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        response = supabase.table("hospital_hazards").select("*").in_(
            "status", ["active", "responding"]
        ).execute()
        hazards = response.data or []
        
        # Format for response
        formatted = [{
            "id": str(h["id"]),
            "type": h["hazard_type"],
            "location": h["location"],
            "description": h["description"],
            "severity": h["severity"],
            "status": h["status"],
            "room_id": h.get("room_id"),
            "reported_at": h.get("created_at")
        } for h in hazards]
        
        return {
            "hazards": formatted,
            "count": len(formatted)
        }
    except Exception as e:
        return {"error": str(e)}


async def report_hazard(hazard_type: str, location: str, description: str, severity: str, supabase) -> Dict[str, Any]:
    """Report a new hazard to database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        # Try to find matching room for the location
        room = fuzzy_match_room_db(location, supabase)
        room_id = room["id"] if room else None
        
        response = supabase.table("hospital_hazards").insert({
            "hazard_type": hazard_type,
            "location": location,
            "room_id": room_id,
            "description": description,
            "severity": severity,
            "status": "active",
            "reported_by": "ai_system"
        }).execute()
        
        hazard = response.data[0] if response.data else {}
        
        return {
            "success": True,
            "hazard": {
                "id": str(hazard.get("id")),
                "type": hazard_type,
                "location": location,
                "description": description,
                "severity": severity,
                "status": "active"
            }
        }
    except Exception as e:
        return {"error": str(e)}


async def update_hazard_status(hazard_id: str, status: str, notes: Optional[str], supabase) -> Dict[str, Any]:
    """Update hazard status in database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        # Get current hazard
        current = supabase.table("hospital_hazards").select("*").eq(
            "id", hazard_id
        ).execute()
        
        if not current.data:
            return {"error": f"Hazard '{hazard_id}' not found"}
        
        old_status = current.data[0]["status"]
        
        update_data = {"status": status, "notes": notes}
        if status == "resolved":
            update_data["resolved_at"] = datetime.now().isoformat()
            update_data["resolved_by"] = "ai_system"
        
        supabase.table("hospital_hazards").update(update_data).eq(
            "id", hazard_id
        ).execute()
        
        return {
            "success": True,
            "hazard_id": hazard_id,
            "old_status": old_status,
            "new_status": status,
            "notes": notes
        }
    except Exception as e:
        return {"error": str(e)}


async def get_hazard_details(hazard_id: str, supabase) -> Dict[str, Any]:
    """Get hazard details from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        response = supabase.table("hospital_hazards").select("*").eq(
            "id", hazard_id
        ).execute()
        
        if not response.data:
            return {"error": f"Hazard '{hazard_id}' not found"}
        
        h = response.data[0]
        return {
            "hazard": {
                "id": str(h["id"]),
                "type": h["hazard_type"],
                "location": h["location"],
                "description": h["description"],
                "severity": h["severity"],
                "status": h["status"],
                "room_id": h.get("room_id"),
                "reported_at": h.get("created_at"),
                "resolved_at": h.get("resolved_at")
            }
        }
    except Exception as e:
        return {"error": str(e)}


async def get_hazards_by_room(room_id: str, supabase) -> Dict[str, Any]:
    """Get hazards for a specific room from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    room = fuzzy_match_room_db(room_id, supabase)
    room_name = room["name"] if room else room_id
    actual_room_id = room["id"] if room else None
    
    try:
        query = supabase.table("hospital_hazards").select("*")
        if actual_room_id:
            query = query.eq("room_id", actual_room_id)
        else:
            query = query.ilike("location", f"%{room_id}%")
        
        response = query.in_("status", ["active", "responding"]).execute()
        hazards = response.data or []
        
        formatted = [{
            "id": str(h["id"]),
            "type": h["hazard_type"],
            "description": h["description"],
            "severity": h["severity"],
            "status": h["status"]
        } for h in hazards]
        
        return {
            "room": room_name,
            "hazards": formatted,
            "count": len(formatted)
        }
    except Exception as e:
        return {"error": str(e)}


async def get_hazards_by_type(hazard_type: str, supabase) -> Dict[str, Any]:
    """Get hazards filtered by type from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        response = supabase.table("hospital_hazards").select("*").eq(
            "hazard_type", hazard_type
        ).in_("status", ["active", "responding"]).execute()
        hazards = response.data or []
        
        formatted = [{
            "id": str(h["id"]),
            "location": h["location"],
            "description": h["description"],
            "severity": h["severity"],
            "status": h["status"]
        } for h in hazards]
        
        return {
            "type": hazard_type,
            "hazards": formatted,
            "count": len(formatted)
        }
    except Exception as e:
        return {"error": str(e)}


# --- Hospital Statistics ---

async def get_hospital_stats(supabase) -> Dict[str, Any]:
    """Get hospital statistics from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        # Count patient-capable rooms
        rooms_res = supabase.table("hospital_rooms").select("id, status").in_(
            "room_type", ["patient", "critical"]
        ).execute()
        rooms = rooms_res.data or []
        total_rooms = len(rooms)
        
        # Count occupied rooms
        assignments_res = supabase.table("room_assignments").select(
            "room_id"
        ).is_("discharged_at", "null").execute()
        occupied_ids = set(a["room_id"] for a in (assignments_res.data or []))
        occupied_count = len([r for r in rooms if r["id"] in occupied_ids])
        
        # Count critical rooms
        critical_rooms = len([r for r in rooms if r["status"] == "critical"])
        
        # Count active hazards
        hazards_res = supabase.table("hospital_hazards").select(
            "id", count="exact"
        ).eq("status", "active").execute()
        active_hazards = hazards_res.count or 0
        
        # Count active alerts
        alerts_res = supabase.table("alerts").select(
            "id", count="exact"
        ).eq("acknowledged", False).execute()
        active_alerts = alerts_res.count or 0
        
        # Count total patients with room assignments
        total_patients = len(occupied_ids)
        
        return {
            "total_patient_rooms": total_rooms,
            "occupied_rooms": occupied_count,
            "vacant_rooms": total_rooms - occupied_count,
            "critical_rooms": critical_rooms,
            "total_patients": total_patients,
            "active_hazards": active_hazards,
            "active_alerts": active_alerts,
            "occupancy_rate": round(occupied_count / total_rooms * 100, 1) if total_rooms else 0
        }
    except Exception as e:
        return {"error": str(e)}


async def get_occupancy_rate(supabase) -> Dict[str, Any]:
    """Get room occupancy rate from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        stats = await get_hospital_stats(supabase)
        if "error" in stats:
            return stats
        
        # Build occupancy summary by room type
        by_type = {}
        for room_type in ["patient", "critical"]:
            rooms_res = supabase.table("hospital_rooms").select("id").eq(
                "room_type", room_type
            ).execute()
            rooms = rooms_res.data or []
            
            assignments_res = supabase.table("room_assignments").select(
                "room_id"
            ).is_("discharged_at", "null").execute()
            occupied_ids = set(a["room_id"] for a in (assignments_res.data or []))
            
            occupied = len([r for r in rooms if r["id"] in occupied_ids])
            
            if rooms:
                by_type[room_type] = {
                    "total": len(rooms),
                    "occupied": occupied,
                    "vacant": len(rooms) - occupied,
                    "rate": round(occupied / len(rooms) * 100, 1)
                }
        
        return {
            "overall_rate": stats.get("occupancy_rate", 0),
            "occupied": stats.get("occupied_rooms", 0),
            "vacant": stats.get("vacant_rooms", 0),
            "total": stats.get("total_patient_rooms", 0),
            "by_type": by_type
        }
    except Exception as e:
        return {"error": str(e)}


async def get_critical_summary(supabase) -> Dict[str, Any]:
    """Get summary of critical situations from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        # Get critical rooms
        rooms_res = supabase.table("hospital_rooms").select("*").eq(
            "status", "critical"
        ).execute()
        critical_rooms = [{
            "id": r["id"],
            "name": r["name"],
            "type": r["room_type"]
        } for r in (rooms_res.data or [])]
        
        # Get critical alerts
        alerts_res = supabase.table("alerts").select("*").eq(
            "severity", "critical"
        ).eq("acknowledged", False).execute()
        critical_alerts = [{
            "id": str(a["id"]),
            "title": a.get("title"),
            "message": a.get("message"),
            "patient_id": str(a.get("patient_id")) if a.get("patient_id") else None
        } for a in (alerts_res.data or [])]
        
        # Get critical hazards
        hazards_res = supabase.table("hospital_hazards").select("*").eq(
            "severity", "critical"
        ).eq("status", "active").execute()
        critical_hazards = [{
            "id": str(h["id"]),
            "type": h["hazard_type"],
            "location": h["location"],
            "description": h["description"]
        } for h in (hazards_res.data or [])]
        
        return {
            "critical_rooms": critical_rooms,
            "critical_alerts": critical_alerts,
            "critical_hazards": critical_hazards,
            "summary": {
                "rooms": len(critical_rooms),
                "alerts": len(critical_alerts),
                "hazards": len(critical_hazards)
            }
        }
    except Exception as e:
        return {"error": str(e)}


async def get_activity_summary(hours: int, supabase) -> Dict[str, Any]:
    """Get activity summary from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        from datetime import timedelta
        cutoff = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        # Count recent room assignments (admissions)
        admissions_res = supabase.table("room_assignments").select(
            "id", count="exact"
        ).gte("assigned_at", cutoff).execute()
        
        # Count recent discharges
        discharges_res = supabase.table("room_assignments").select(
            "id", count="exact"
        ).gte("discharged_at", cutoff).execute()
        
        # Count recent hazards
        hazards_res = supabase.table("hospital_hazards").select(
            "id", count="exact"
        ).gte("created_at", cutoff).execute()
        
        # Count resolved hazards
        resolved_res = supabase.table("hospital_hazards").select(
            "id", count="exact"
        ).gte("resolved_at", cutoff).execute()
        
        return {
            "period_hours": hours,
            "events": {
                "admissions": admissions_res.count or 0,
                "discharges": discharges_res.count or 0,
                "hazards_reported": hazards_res.count or 0,
                "hazards_resolved": resolved_res.count or 0
            },
            "current_status": await get_hospital_stats(supabase)
        }
    except Exception as e:
        return {"error": str(e)}


# --- Medication Adherence ---

async def get_medication_schedule(patient_id: Optional[str], supabase) -> Dict[str, Any]:
    """Get medication schedule from database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        if patient_id:
            patient = fuzzy_match_patient_db(patient_id, supabase)
            if not patient:
                return {"error": f"Patient '{patient_id}' not found"}
            
            # Get medications for specific patient
            meds_res = supabase.table("patient_pills").select(
                "id, dosage_amount, frequency, times_of_day, is_active, pills(name, strength, unit, instructions)"
            ).eq("patient_id", patient["id"]).eq("is_active", True).execute()
            
            medications = []
            for m in (meds_res.data or []):
                pill = m.get("pills", {}) or {}
                medications.append({
                    "id": str(m["id"]),
                    "name": pill.get("name", "Unknown"),
                    "dosage": f"{m.get('dosage_amount', '')} {pill.get('strength', '')} {pill.get('unit', '')}".strip(),
                    "schedule": ", ".join(m.get("times_of_day") or []),
                    "frequency": m.get("frequency"),
                    "instructions": pill.get("instructions"),
                    "patient_name": patient["name"],
                    "patient_id": str(patient["id"])
                })
            
            return {
                "medications": medications,
                "count": len(medications),
                "patient_id": str(patient["id"]),
                "patient_name": patient["name"]
            }
        else:
            # Get all pending medications
            meds_res = supabase.table("pill_logs").select(
                "id, scheduled_time, status, patient_pills(pills(name, strength), patients(id, users!patients_user_id_fkey(full_name)))"
            ).eq("status", "pending").execute()
            
            medications = []
            for m in (meds_res.data or []):
                pp = m.get("patient_pills", {}) or {}
                pill = pp.get("pills", {}) or {}
                patient = pp.get("patients", {}) or {}
                user = patient.get("users", {}) or {}
                
                medications.append({
                    "id": str(m["id"]),
                    "name": pill.get("name", "Unknown"),
                    "dosage": pill.get("strength", ""),
                    "scheduled_time": m.get("scheduled_time"),
                    "status": m.get("status"),
                    "patient_name": user.get("full_name", "Unknown"),
                    "patient_id": str(patient.get("id")) if patient.get("id") else None
                })
            
            return {
                "medications": medications,
                "count": len(medications),
                "note": "Showing pending medications for all patients"
            }
    except Exception as e:
        return {"error": str(e)}


async def mark_medication_given(patient_id: str, medication_id: str, administered_by: Optional[str], notes: Optional[str], supabase) -> Dict[str, Any]:
    """Mark a medication as given in database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    patient = fuzzy_match_patient_db(patient_id, supabase)
    if not patient:
        return {"error": f"Patient '{patient_id}' not found"}
    
    try:
        # Update pill_log status
        supabase.table("pill_logs").update({
            "status": "taken",
            "taken_time": datetime.now().isoformat(),
            "confirmed_by": administered_by or "ai_system",
            "notes": notes
        }).eq("id", medication_id).execute()
        
        # Also create a completed task for this
        assignment_res = supabase.table("room_assignments").select(
            "room_id"
        ).eq("patient_id", patient["id"]).is_("discharged_at", "null").execute()
        
        room_id = assignment_res.data[0]["room_id"] if assignment_res.data else None
        
        supabase.table("room_tasks").insert({
            "room_id": room_id,
            "patient_id": patient["id"],
            "task_type": "medication",
            "title": "Medication Administered",
            "description": notes or "Medication marked as given",
            "priority": "normal",
            "status": "completed",
            "completed_at": datetime.now().isoformat(),
            "completed_by": administered_by or "ai_system"
        }).execute()
        
        return {
            "success": True,
            "medication_id": medication_id,
            "patient_id": str(patient["id"]),
            "patient_name": patient["name"],
            "administered_by": administered_by or "ai_system",
            "administered_at": datetime.now().isoformat()
        }
    except Exception as e:
        return {"error": str(e)}


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
    """Create a new alert in database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    actual_patient_id = None
    patient_name = None
    if patient_id:
        patient = fuzzy_match_patient_db(patient_id, supabase)
        if patient:
            actual_patient_id = patient["id"]
            patient_name = patient["name"]
    
    # Resolve room_id if provided
    actual_room_id = None
    if room_id:
        room = fuzzy_match_room_db(room_id, supabase)
        if room:
            actual_room_id = room["id"]
    
    try:
        response = supabase.table("alerts").insert({
            "title": title,
            "message": description,
            "severity": severity,
            "type": "custom",
            "patient_id": actual_patient_id,
            "acknowledged": False
        }).execute()
        
        alert = response.data[0] if response.data else {}
        
        # Also create a room task if room is associated
        if actual_room_id:
            supabase.table("room_tasks").insert({
                "room_id": actual_room_id,
                "patient_id": actual_patient_id,
                "task_type": "alert",
                "title": title,
                "description": description,
                "priority": "urgent" if severity in ["critical", "high"] else "normal",
                "status": "pending"
            }).execute()
        
        return {
            "success": True,
            "alert": {
                "id": str(alert.get("id")),
                "title": title,
                "description": description,
                "severity": severity,
                "patient_id": str(actual_patient_id) if actual_patient_id else None,
                "patient_name": patient_name,
                "room_id": actual_room_id,
                "created_at": alert.get("created_at")
            }
        }
    except Exception as e:
        return {"error": str(e)}


async def acknowledge_alert(alert_id: str, acknowledged_by: Optional[str], supabase) -> Dict[str, Any]:
    """Acknowledge an alert in database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        # Check if alert exists
        check = supabase.table("alerts").select("id").eq("id", alert_id).execute()
        if not check.data:
            return {"error": f"Alert '{alert_id}' not found"}
        
        supabase.table("alerts").update({
            "acknowledged": True,
            "acknowledged_at": datetime.now().isoformat(),
            "acknowledged_by": acknowledged_by or "ai_system"
        }).eq("id", alert_id).execute()
        
        return {
            "success": True,
            "alert_id": alert_id,
            "acknowledged_by": acknowledged_by or "ai_system"
        }
    except Exception as e:
        return {"error": str(e)}


async def resolve_alert(alert_id: str, resolution_notes: Optional[str], supabase) -> Dict[str, Any]:
    """Resolve an alert in database"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        # Check if alert exists
        check = supabase.table("alerts").select("id").eq("id", alert_id).execute()
        if not check.data:
            return {"error": f"Alert '{alert_id}' not found"}
        
        supabase.table("alerts").update({
            "resolved": True,
            "resolved_at": datetime.now().isoformat()
        }).eq("id", alert_id).execute()
        
        return {
            "success": True,
            "alert_id": alert_id,
            "resolution_notes": resolution_notes
        }
    except Exception as e:
        return {"error": str(e)}
