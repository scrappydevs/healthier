"""
Chat context and session management for PillPal AI.
Handles conversation history, context building, and session persistence.
"""

from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime
import uuid


@dataclass
class ChatContext:
    """Represents the context for a chat session"""
    session_id: str
    user_id: str
    messages: List[Dict[str, str]] = field(default_factory=list)
    state: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())


# In-memory session storage (for demo without database)
_sessions: Dict[str, ChatContext] = {}

# Title generator function (set by main.py)
_title_generator: Optional[Callable[[str], str]] = None


def set_title_generator(generator: Callable[[str], str]) -> None:
    """Set the title generator function (uses Cerebras)"""
    global _title_generator
    _title_generator = generator


async def generate_smart_title(message: str) -> str:
    """Generate a smart, concise title for the chat session using AI"""
    global _title_generator
    
    if _title_generator is None:
        # Fallback to simple truncation
        return message[:40] + "..." if len(message) > 40 else message
    
    try:
        title = _title_generator(message)
        return title
    except Exception as e:
        print(f"⚠️ Title generation failed: {e}")
        return message[:40] + "..." if len(message) > 40 else message


async def create_session(user_id: str, initial_message: str = "") -> Dict[str, Any]:
    """Create a new chat session"""
    session_id = str(uuid.uuid4())
    
    # Generate smart title from initial message using AI
    if initial_message:
        title = await generate_smart_title(initial_message)
    else:
        title = "New Chat"
    
    context = ChatContext(
        session_id=session_id,
        user_id=user_id,
        state={"title": title}
    )
    
    _sessions[session_id] = context
    
    return {
        "id": session_id,
        "title": title,
        "created_at": context.created_at
    }


async def read_context(session_id: str) -> ChatContext:
    """Read context for a session"""
    if session_id in _sessions:
        return _sessions[session_id]
    
    # Create new context if not found
    context = ChatContext(
        session_id=session_id,
        user_id="default_user"
    )
    _sessions[session_id] = context
    return context


async def write_context(session_id: str, context: ChatContext) -> None:
    """Save context for a session"""
    context.updated_at = datetime.now().isoformat()
    _sessions[session_id] = context


async def get_user_sessions(user_id: str) -> List[Dict[str, Any]]:
    """Get all sessions for a user"""
    sessions = []
    for session_id, context in _sessions.items():
        if context.user_id == user_id:
            sessions.append({
                "id": session_id,
                "title": context.state.get("title", "Chat"),
                "created_at": context.created_at,
                "updated_at": context.updated_at,
                "message_count": len(context.messages)
            })
    
    # Sort by updated_at descending
    sessions.sort(key=lambda x: x["updated_at"], reverse=True)
    return sessions


async def delete_session(session_id: str) -> bool:
    """Delete a session"""
    if session_id in _sessions:
        del _sessions[session_id]
        return True
    return False


def build_system_prompt(context: ChatContext, hospital_state: Optional[Dict[str, Any]] = None) -> str:
    """Build context-aware system prompt for the AI
    
    Args:
        context: The chat context with page info and session data
        hospital_state: Optional real-time hospital state including:
            - rooms: List of rooms with occupancy
            - patients: List of patients with locations
            - alerts: Active alerts
            - hazards: Active hazards
            - stats: Occupancy statistics
    """
    
    current_page = context.state.get("current_page", "/")
    tagged_context = context.state.get("tagged_context")
    
    # Base system prompt - focused and concise
    system_prompt = """You are PillPal AI, a hospital floor plan assistant. Help clinical staff manage rooms, patients, hazards, and alerts.

AVAILABLE TOOLS:

ROOMS:
- list_all_rooms: All rooms with status and occupancy
- get_room_status: Specific room details (patient, tasks, hazards)
- list_available_rooms / list_occupied_rooms: Filter by availability
- update_room_status: Change status (normal/critical/vacant/maintenance)

PATIENT ASSIGNMENT:
- list_unassigned_patients: Show patients who need a room
- assign_patient_to_room: Assign EXISTING patient to room (if patient not specified, shows available options)
- admit_new_patient: Create NEW patient and assign to room in one step
- remove_patient_from_room: Discharge patient from room
- transfer_patient: Move patient between rooms

PATIENTS:
- list_all_patients / search_patients / get_patient_details
- get_patient_medications / update_patient_status
- get_patient_meals: Meals logged by a patient (defaults to today, optional date)
- add_food_instructions: Assign dietary instructions to patient

HAZARDS & ALERTS:
- list_active_hazards / report_hazard / update_hazard_status
- create_alert / get_active_alerts / acknowledge_alert / resolve_alert

STATS:
- get_hospital_stats: Occupancy, alerts, hazards overview
- get_occupancy_rate / get_critical_summary

ROOM STATUS VALUES:
- normal (green): Occupied, stable patient
- critical (red): Patient needs urgent attention
- vacant (no highlight): Available/empty
- maintenance (amber): Under maintenance

COMMON WORKFLOWS:

1. "Add a patient to Room X":
   - If user specifies patient name that exists: use assign_patient_to_room
   - If patient is new/unknown: use admit_new_patient to create and assign
   - If unclear which patient: call list_unassigned_patients first and ask

2. "Discharge patient from Room X":
   - Use remove_patient_from_room with the room_id
   - Room will become vacant (no highlight on floor plan)

3. "What patients need rooms?":
   - Use list_unassigned_patients

4. "Room X is critical" or "Patient in Room X is critical":
   - Use update_patient_status to set patient status to critical
   - Room will turn red on the floor plan

RESPONSE FORMAT:
- Be direct and concise - clinical staff are busy
- Use bullet lists, not tables
- Structure: Status first, then details, then actions taken
- After actions, confirm what changed

RULES:
1. ALWAYS call tools first - never guess data
2. Ask clarifying questions when patient identity is unclear
3. The floor plan auto-refreshes after changes - occupied rooms show colors, empty rooms don't
4. When assigning tasks, they appear in the room detail panel"""

    # Add page-specific context
    if "hospital" in current_page or "floorplan" in current_page:
        system_prompt += """

CURRENT CONTEXT: Hospital Floor Plan Visualization
You are viewing an interactive 3D floor plan with these areas:
- **Patient Rooms**: Room 1-6 (individual patient rooms)
- **Critical Room**: Emergency care area
- **Waiting Space**: Patient waiting area
- **Check In Space**: Reception/check-in
- **Pantry**: Staff pantry
- **WCs**: Restrooms (2)
- **Storage**: Supply storage
- **Entrance**: Main entrance

The map responds to your changes in real-time:
- When you mark a room as "critical", it turns red on the map
- Occupied rooms with stable patients show green
- Rooms with declining patients show yellow
- Empty patient rooms are not highlighted
- Critical Room is always red when occupied

Focus on spatial commands like:
- "Show me which rooms are occupied"
- "Mark Room 3 as critical" 
- "Transfer patient to Room 5"
- "What's the status of the Critical Room?"
"""
    
    elif "dashboard" in current_page:
        system_prompt += """

CURRENT CONTEXT: Dashboard View
- User is viewing summary statistics
- Provide overviews and highlight issues needing attention
"""
    
    # Add real-time hospital state if provided
    if hospital_state:
        system_prompt += "\n\n--- CURRENT HOSPITAL STATE (REAL-TIME) ---\n"
        
        # Room occupancy summary
        rooms = hospital_state.get("rooms", [])
        if rooms:
            occupied_rooms = [r for r in rooms if r.get("patient")]
            vacant_rooms = [r for r in rooms if not r.get("patient") and r.get("type") == "patient"]
            
            system_prompt += f"\nROOM OCCUPANCY ({len(occupied_rooms)} occupied, {len(vacant_rooms)} vacant):\n"
            for room in rooms:
                if room.get("type") in ["patient", "critical"]:
                    patient = room.get("patient")
                    if patient:
                        status_indicator = "🔴" if patient.get("status") == "critical" else "🟡" if patient.get("status") == "declining" else "🟢"
                        system_prompt += f"- {room['name']}: {status_indicator} {patient['name']} ({patient.get('status', 'stable')})\n"
                    else:
                        system_prompt += f"- {room['name']}: Empty\n"
        
        # Active alerts
        alerts = hospital_state.get("alerts", [])
        if alerts:
            system_prompt += f"\nACTIVE ALERTS ({len(alerts)}):\n"
            for alert in alerts[:5]:  # Show max 5
                system_prompt += f"- [{alert.get('severity', 'info').upper()}] {alert.get('title', 'Alert')}\n"
        
        # Active hazards
        hazards = hospital_state.get("hazards", [])
        if hazards:
            system_prompt += f"\nACTIVE HAZARDS ({len(hazards)}):\n"
            for hazard in hazards[:5]:  # Show max 5
                system_prompt += f"- [{hazard.get('severity', 'low').upper()}] {hazard.get('type', 'Unknown')} at {hazard.get('location', 'Unknown')}\n"
        
        # Quick stats
        stats = hospital_state.get("stats", {})
        if stats:
            system_prompt += f"\nQUICK STATS:\n"
            system_prompt += f"- Occupancy: {stats.get('occupancy_rate', 0)}%\n"
            system_prompt += f"- Critical rooms: {stats.get('critical_rooms', 0)}\n"
            system_prompt += f"- Active alerts: {stats.get('active_alerts', 0)}\n"
            system_prompt += f"- Active hazards: {stats.get('active_hazards', 0)}\n"
        
        system_prompt += "\n--- END HOSPITAL STATE ---"
    
    # Add tagged context if available
    if tagged_context:
        system_prompt += f"""

TAGGED CONTEXT:
{tagged_context}
"""
    
    return system_prompt


def get_quick_suggestions(context: ChatContext) -> List[str]:
    """Get context-aware quick suggestions"""
    current_page = context.state.get("current_page", "/")
    
    if "hospital" in current_page or "floorplan" in current_page:
        return [
            "Show room occupancy",
            "List available rooms",
            "Show critical rooms",
            "Active hazards"
        ]
    elif "dashboard" in current_page:
        return [
            "Hospital statistics",
            "Active alerts",
            "Critical patients",
            "Medication schedule"
        ]
    else:
        return [
            "Room status",
            "Active alerts",
            "Hospital overview"
        ]
