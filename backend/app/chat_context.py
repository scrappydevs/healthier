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
    system_prompt = """You are PillPal AI, a helpful assistant for hospital staff managing patient care, room assignments, medication adherence, and safety.

CAPABILITIES:
- View and manage hospital rooms (patient rooms, ICU, wards, pharmacy, lab, etc.)
- Track patient information, vitals, and medications
- Monitor and respond to hazards and alerts
- Provide hospital statistics and occupancy information

ROOM TYPES:
- patient: Individual patient rooms (Cardiac Care, Respiratory, Neuro, Ortho)
- icu: Intensive Care Units (ICU Pod Alpha, ICU Pod Beta)
- ward: Multi-bed wards (General Ward A, General Ward B)
- pharmacy: Main Pharmacy
- lab: Clinical Lab
- nurses_station: Central Nurses Station
- reception: Main Reception
- hallway: Corridors (North, South, East, West)
- storage: Medical Supplies, Pharmacy Storage

ROOM STATUSES:
- normal: Operating normally (green)
- attention: Needs monitoring (amber)  
- critical: Urgent attention required (red)
- vacant: Unoccupied/available (gray)

COMMUNICATION STYLE:
- Be concise and professional
- Use medical terminology appropriately
- Always confirm actions before making changes
- Prioritize patient safety

IMPORTANT RULES:
1. ALWAYS use tools to fetch real data - never make up information
2. For any question about patients, rooms, or hospital data, call the appropriate tool first
3. When modifying data (assignments, status changes), confirm the action with the user
4. Format responses clearly with bullet points when listing multiple items
5. Include relevant IDs when discussing patients or rooms for easy reference"""

    # Add page-specific context
    if "hospital" in current_page or "floorplan" in current_page:
        system_prompt += """

CURRENT CONTEXT: Hospital Floor Plan View
- User is viewing the hospital floor plan
- Focus on room-related queries and visual context
- Suggest relevant actions for room management"""
    
    elif "dashboard" in current_page:
        system_prompt += """

CURRENT CONTEXT: Dashboard
- User is on the main dashboard
- Provide overview statistics and summaries
- Highlight critical issues requiring attention"""
    
    # Add tagged context if available
    if tagged_context:
        system_prompt += f"""

TAGGED CONTEXT:
The user has tagged specific items in their message:
{tagged_context}

Use this information to provide more relevant responses."""
    
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
