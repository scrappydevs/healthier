"""
Chat context and session management for PillPal AI.
Handles conversation history, context building, and session persistence.
"""

from typing import Dict, List, Any, Optional
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


async def create_session(user_id: str, initial_message: str = "") -> Dict[str, Any]:
    """Create a new chat session"""
    session_id = str(uuid.uuid4())
    
    # Generate title from initial message
    title = initial_message[:50] + "..." if len(initial_message) > 50 else initial_message
    if not title:
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


def build_system_prompt(context: ChatContext) -> str:
    """Build context-aware system prompt for the AI"""
    
    current_page = context.state.get("current_page", "/")
    tagged_context = context.state.get("tagged_context")
    
    # Base system prompt
    system_prompt = """You are PillPal AI, a hospital floor plan assistant. You help clinical staff manage rooms, patients, hazards, and alerts using the interactive floor plan visualization.

YOUR TOOLS (use them to answer questions and take actions):

ROOM MANAGEMENT:
- list_all_rooms: Get all rooms with status and occupancy
- get_room_status: Get details of a specific room  
- list_available_rooms: Show vacant rooms ready for patients
- list_occupied_rooms: Show rooms with patients
- update_room_status: Change room status (normal/attention/critical/vacant)
- assign_patient_to_room: Put a patient in a room
- remove_patient_from_room: Discharge/remove patient from room
- transfer_patient: Move patient from one room to another

PATIENT OPERATIONS:
- list_all_patients: Get all patients
- search_patients: Find patient by name/ID
- get_patient_details: Full patient info including vitals
- get_patient_medications: Patient's medication list
- update_patient_status: Change patient status

HAZARDS & ALERTS:
- list_active_hazards: View current hazards
- report_hazard: Create a new hazard
- create_alert: Create alert for room/patient
- get_active_alerts: View active alerts
- resolve_alert: Mark alert as resolved

HOSPITAL STATS:
- get_hospital_stats: Overview of occupancy, alerts, etc.
- get_occupancy_rate: Current bed utilization
- get_critical_summary: Critical situations summary

ROOM STATUS COLORS (reflected on floor plan):
- normal (green): Room is occupied, patient stable
- attention (amber): Needs monitoring  
- critical (red): Urgent attention required
- vacant (gray): Empty, available for admission

RESPONSE FORMATTING RULES:
1. Use clear markdown formatting with headers, bullets, and bold for emphasis
2. For room lists, use a table or bullet list with: Room Name | Status | Patient (if any)
3. For patient info, include: Name, Room, Condition, Status
4. Use emoji sparingly but effectively: ✅ success, ⚠️ warning, 🔴 critical, 📍 location
5. Keep responses concise - clinical staff are busy
6. After any action (transfer, status change), confirm what changed

CRITICAL RULES:
1. ALWAYS call tools to get real data - never guess or make up information
2. When asked about rooms, patients, or status - call the appropriate tool FIRST
3. After making changes (move patient, update status), the floor plan will auto-refresh
4. For "mark room X as critical", use update_room_status tool with status="critical"
5. For "room X is critical", interpret as a command to update that room's status"""

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
- When you mark a room "attention", it turns amber
- Room assignments and patient locations are reflected visually

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
