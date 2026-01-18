"""
FastAPI application entry point.
"""

from contextlib import asynccontextmanager
from typing import Dict, Optional
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import anthropic

from app.api.health import router as health_router
from app.api.v1 import router as v1_router
from app.api.medications import router as medications_router
from app.core.config import get_settings
from app.ai_tools import PILLPAL_TOOLS, execute_tool
from app.core.database import get_supabase
from app.chat_context import (
    create_session,
    read_context,
    write_context,
    get_user_sessions,
    build_system_prompt,
)


# AI clients
_cerebras_client: Optional[OpenAI] = None
_claude_client: Optional[anthropic.Anthropic] = None


def get_cerebras_client() -> Optional[OpenAI]:
    """Get or create Cerebras client"""
    global _cerebras_client
    
    if _cerebras_client is not None:
        return _cerebras_client
    
    settings = get_settings()
    
    if not settings.cerebras_key:
        print("⚠️ Cerebras not configured - CEREBRAS_KEY missing")
        return None
    
    # Strip any whitespace/newlines from API key (common issue with env vars)
    cerebras_key = settings.cerebras_key.strip().split('\n')[0].strip()
    
    try:
        _cerebras_client = OpenAI(
            api_key=cerebras_key,
            base_url="https://api.cerebras.ai/v1"
        )
        print("✅ Cerebras client initialized")
        return _cerebras_client
    except Exception as e:
        print(f"❌ Failed to initialize Cerebras: {e}")
        return None


def get_claude_client() -> Optional[anthropic.Anthropic]:
    """Get or create Claude client"""
    global _claude_client
    
    if _claude_client is not None:
        return _claude_client
    
    settings = get_settings()
    
    # Try multiple env var names for Claude API key
    import os
    claude_key = settings.claude_api_key or os.getenv("CLAUDE_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
    
    if not claude_key:
        print("⚠️ Claude not configured - CLAUDE_API_KEY missing")
        return None
    
    # Strip any whitespace/newlines from API key (common issue with env vars)
    claude_key = claude_key.strip().split('\n')[0].strip()
    
    try:
        _claude_client = anthropic.Anthropic(api_key=claude_key)
        print("✅ Claude client initialized")
        return _claude_client
    except Exception as e:
        print(f"❌ Failed to initialize Claude: {e}")
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Startup and shutdown logic goes here.
    """
    # Startup
    settings = get_settings()
    print(f"🚀 Starting {settings.app_name} v{settings.app_version}")
    print(f"📚 API docs available at http://{settings.host}:{settings.port}/docs")
    
    # Initialize AI clients (prefer Claude, fallback to Cerebras)
    get_claude_client()
    get_cerebras_client()

    yield

    # Shutdown
    print("👋 Shutting down...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="NexHacks Study API - Built for hackathon speed",
        lifespan=lifespan,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(health_router)
    app.include_router(v1_router)
    app.include_router(medications_router)

    return app


app = create_app()


# ============================================================================
# AI CHAT ENDPOINTS
# ============================================================================

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_id: str = "default_user"
    chat_state: Optional[Dict] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    session_title: Optional[str] = None
    tool_calls: int = 0
    tool_rounds: int = 0
    invalidate_cache: bool = False
    cache_keys: list = []
    flash_room_id: Optional[str] = None  # Room to flash when task is assigned
    error: Optional[str] = None


def convert_tools_for_claude(openai_tools: list) -> list:
    """Convert OpenAI tool format to Claude tool format"""
    claude_tools = []
    for tool in openai_tools:
        if tool.get("type") == "function":
            func = tool["function"]
            claude_tools.append({
                "name": func["name"],
                "description": func["description"],
                "input_schema": func["parameters"]
            })
    return claude_tools


async def chat_with_claude(client: anthropic.Anthropic, messages: list, system_prompt: str, tools: list) -> tuple:
    """Handle Claude chat with tool calling"""
    all_tool_results = []
    max_rounds = 5
    round_num = 0
    
    # Convert messages to Claude format (no system in messages)
    claude_messages = []
    for msg in messages:
        if msg["role"] == "system":
            continue  # Skip, we pass system separately
        claude_messages.append({"role": msg["role"], "content": msg["content"]})
    
    claude_tools = convert_tools_for_claude(tools)
    
    while round_num < max_rounds:
        round_num += 1
        print(f"\n{'='*60}")
        print(f"🔄 CLAUDE ROUND {round_num}")
        print(f"{'='*60}")
        
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=system_prompt,
            tools=claude_tools,
            messages=claude_messages
        )
        
        # Check if we have tool use
        tool_uses = [block for block in response.content if block.type == "tool_use"]
        text_blocks = [block for block in response.content if block.type == "text"]
        
        if not tool_uses:
            # No tools, return text response
            final_text = "".join(block.text for block in text_blocks)
            print(f"\n✅ Claude response (no tools): {final_text[:200]}...")
            return final_text, all_tool_results, round_num
        
        # Process tool calls
        print(f"   Found {len(tool_uses)} tool calls")
        
        # Add assistant message with tool use
        claude_messages.append({
            "role": "assistant",
            "content": response.content
        })
        
        # Execute tools and collect results
        tool_results = []
        for tool_use in tool_uses:
            tool_name = tool_use.name
            tool_input = tool_use.input
            
            print(f"\n🔧 Tool call: {tool_name}")
            print(f"   Input: {tool_input}")
            
            tool_result = await execute_tool(tool_name, tool_input)
            print(f"   Result: {json.dumps(tool_result, indent=2)[:500]}...")
            
            all_tool_results.append(tool_result)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_use.id,
                "content": json.dumps(tool_result)
            })
        
        # Add tool results to messages
        claude_messages.append({
            "role": "user",
            "content": tool_results
        })
        
        # Check stop reason
        if response.stop_reason == "end_turn":
            final_text = "".join(block.text for block in text_blocks)
            return final_text, all_tool_results, round_num
    
    # Max rounds reached
    return "I've gathered the information. Let me know if you need anything else.", all_tool_results, round_num


async def chat_with_cerebras(client: OpenAI, api_messages: list, tools: list) -> tuple:
    """Handle Cerebras/OpenAI chat with tool calling"""
    all_tool_results = []
    max_rounds = 5
    round_num = 0
    
    response = client.chat.completions.create(
        model="llama-3.3-70b",
        messages=api_messages,
        tools=tools,
        tool_choice="auto",
        max_tokens=2048,
        temperature=0.7,
    )
    
    current_response = response
    
    while current_response.choices[0].message.tool_calls and round_num < max_rounds:
        round_num += 1
        print(f"\n{'='*60}")
        print(f"🔄 CEREBRAS TOOL ROUND {round_num}")
        print(f"{'='*60}")
        
        tool_calls = current_response.choices[0].message.tool_calls
        
        api_messages.append({
            "role": "assistant",
            "content": current_response.choices[0].message.content or "",
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                }
                for tc in tool_calls
            ]
        })
        
        for tool_call in tool_calls:
            tool_name = tool_call.function.name
            tool_args = json.loads(tool_call.function.arguments)
            
            print(f"\n🔧 Tool call: {tool_name}")
            print(f"   Input: {tool_args}")
            
            tool_result = await execute_tool(tool_name, tool_args)
            print(f"   Result: {json.dumps(tool_result, indent=2)[:500]}...")
            
            all_tool_results.append(tool_result)
            
            api_messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(tool_result)
            })
        
        current_response = client.chat.completions.create(
            model="llama-3.3-70b",
            messages=api_messages,
            tools=tools,
            tool_choice="auto",
            max_tokens=2048,
            temperature=0.7,
        )
        
        print(f"\n📊 Round {round_num} complete")
    
    assistant_response = current_response.choices[0].message.content or ""
    return assistant_response, all_tool_results, round_num


async def fetch_hospital_state() -> dict:
    """Fetch current hospital state for AI context injection"""
    supabase = get_supabase()
    if not supabase:
        return {}
    
    hospital_state = {}
    
    try:
        # Fetch rooms with patient assignments
        rooms_res = supabase.table("hospital_rooms").select("*").execute()
        rooms = rooms_res.data or []
        
        # Fetch active room assignments with patient info
        assignments_res = supabase.table("room_assignments").select(
            "room_id, patient_id, patients(id, age, medical_conditions, status, users!patients_user_id_fkey(full_name))"
        ).is_("discharged_at", "null").execute()
        
        assignment_map = {}
        for a in (assignments_res.data or []):
            patient = a.get("patients", {}) or {}
            user = patient.get("users", {}) or {}
            assignment_map[a["room_id"]] = {
                "id": str(patient.get("id")) if patient.get("id") else None,
                "name": user.get("full_name", "Unknown"),
                "age": patient.get("age"),
                "condition": ", ".join(patient.get("medical_conditions") or []),
                "status": patient.get("status", "stable")
            }
        
        # Combine rooms with patient data
        hospital_state["rooms"] = []
        for room in rooms:
            patient = assignment_map.get(room["id"])
            hospital_state["rooms"].append({
                "id": room["id"],
                "name": room["name"],
                "type": room["room_type"],
                "status": room["status"],
                "patient": patient
            })
        
        # Fetch active alerts
        alerts_res = supabase.table("alerts").select(
            "id, title, message, severity, type, patient_id"
        ).eq("acknowledged", False).execute()
        hospital_state["alerts"] = alerts_res.data or []
        
        # Fetch active hazards
        try:
            hazards_res = supabase.table("hospital_hazards").select("*").in_(
                "status", ["active", "responding"]
            ).execute()
            hospital_state["hazards"] = [
                {
                    "id": str(h["id"]),
                    "type": h.get("hazard_type", "unknown"),
                    "location": h.get("location", "Unknown"),
                    "description": h.get("description", ""),
                    "severity": h.get("severity", "low")
                }
                for h in (hazards_res.data or [])
            ]
        except Exception as hazard_err:
            print(f"⚠️ Error fetching hazards for state: {hazard_err}")
            hospital_state["hazards"] = []
        
        # Calculate stats
        patient_rooms = [r for r in hospital_state["rooms"] if r["type"] in ["patient", "critical"]]
        occupied = len([r for r in patient_rooms if r.get("patient")])
        total = len(patient_rooms)
        
        hospital_state["stats"] = {
            "total_patient_rooms": total,
            "occupied_rooms": occupied,
            "vacant_rooms": total - occupied,
            "occupancy_rate": round(occupied / total * 100, 1) if total > 0 else 0,
            "critical_rooms": len([r for r in patient_rooms if r["status"] == "critical"]),
            "active_alerts": len(hospital_state["alerts"]),
            "active_hazards": len(hospital_state["hazards"])
        }
        
        print(f"📊 Hospital state fetched: {occupied}/{total} rooms occupied, {len(hospital_state['alerts'])} alerts, {len(hospital_state['hazards'])} hazards")
        
    except Exception as e:
        print(f"⚠️ Error fetching hospital state: {e}")
    
    return hospital_state


@app.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest):
    """
    Context-aware AI chat endpoint using Claude (preferred) or Cerebras with tool calling.
    """
    claude_client = get_claude_client()
    cerebras_client = get_cerebras_client()
    
    if not claude_client and not cerebras_client:
        return ChatResponse(
            response="AI assistant is not available. Please configure CLAUDE_API_KEY or CEREBRAS_KEY.",
            session_id=request.session_id or "error",
            error="ai_not_configured"
        )
    
    try:
        # Get or create session
        session_title = None
        if request.session_id:
            try:
                context = await read_context(request.session_id)
                session_id = request.session_id
                session_title = context.state.get("title")
            except Exception as e:
                print(f"⚠️ Failed to load session {request.session_id}: {e}")
                session = await create_session(request.user_id, request.message[:100])
                session_id = session["id"]
                session_title = session["title"]
                context = await read_context(session_id)
        else:
            session = await create_session(request.user_id, request.message[:100])
            session_id = session["id"]
            session_title = session["title"]
            context = await read_context(session_id)
        
        # Update context state
        if request.chat_state:
            context.state.update(request.chat_state)
        
        # Add user message to context
        context.messages.append({
            "role": "user",
            "content": request.message
        })
        
        # Fetch current hospital state for context injection
        hospital_state = await fetch_hospital_state()
        
        system_prompt = build_system_prompt(context, hospital_state)
        print(f"\n💬 User message: {request.message}")
        
        # Prefer Claude, fallback to Cerebras
        if claude_client:
            print("🤖 Using Claude API")
            assistant_response, all_tool_results, round_num = await chat_with_claude(
                claude_client, 
                context.messages, 
                system_prompt, 
                PILLPAL_TOOLS
            )
        else:
            print("🤖 Using Cerebras API")
            api_messages = [{"role": "system", "content": system_prompt}]
            api_messages.extend([
                {"role": msg["role"], "content": msg["content"]}
                for msg in context.messages
            ])
            assistant_response, all_tool_results, round_num = await chat_with_cerebras(
                cerebras_client,
                api_messages,
                PILLPAL_TOOLS
            )
        
        print(f"\n✅ Tool execution complete after {round_num} rounds")
        print(f"   Total tools called: {len(all_tool_results)}")
        
        # Add assistant response to context
        context.messages.append({
            "role": "assistant",
            "content": assistant_response
        })
        
        # Save updated context
        await write_context(session_id, context)
        
        # Check if cache should be invalidated and detect flash room
        invalidate_cache = False
        cache_keys = []
        flash_room_id = None
        
        for tool_result in all_tool_results:
            if isinstance(tool_result, dict) and tool_result.get("success"):
                invalidate_cache = True
                cache_keys = ["rooms", "patients", "hazards", "alerts", "tasks"]
                
                # Detect tasks assigned to rooms for flash effect
                if tool_result.get("room_name"):
                    # Convert room name to ID
                    room_name = tool_result["room_name"]
                    room_id = room_name.lower().replace(" ", "-")
                    flash_room_id = room_id
                    cache_keys.append("tasks")
                elif tool_result.get("room_id"):
                    flash_room_id = tool_result["room_id"]
                    cache_keys.append("tasks")
        
        return ChatResponse(
            response=assistant_response,
            session_id=session_id,
            session_title=session_title,
            tool_calls=len(all_tool_results),
            tool_rounds=round_num,
            invalidate_cache=invalidate_cache,
            cache_keys=cache_keys,
            flash_room_id=flash_room_id
        )
    
    except Exception as e:
        print(f"❌ Error in AI chat: {e}")
        import traceback
        traceback.print_exc()
        return ChatResponse(
            response="I'm having trouble processing your request. Please try again.",
            session_id=request.session_id or "error",
            error=str(e)
        )


@app.get("/ai/sessions")
async def get_sessions(user_id: str = "default_user"):
    """Get all chat sessions for a user"""
    try:
        sessions = await get_user_sessions(user_id)
        return {"sessions": sessions}
    except Exception as e:
        print(f"❌ Error fetching sessions: {e}")
        return {"sessions": [], "error": str(e)}


@app.get("/ai/sessions/{session_id}")
async def get_session(session_id: str):
    """Get a specific session with message history"""
    try:
        context = await read_context(session_id)
        return {
            "session_id": session_id,
            "title": context.state.get("title", "Chat"),
            "messages": context.messages,
            "created_at": context.created_at,
            "updated_at": context.updated_at
        }
    except Exception as e:
        print(f"❌ Error fetching session: {e}")
        return {"error": str(e)}


@app.get("/smplrspace/config")
async def get_smplrspace_config():
    """
    Get Smplrspace configuration for the frontend.
    Keeps sensitive tokens on the backend.
    """
    import os
    # Use os.getenv directly - handle both correct and typo'd Infisical keys
    return {
        "organizationId": os.getenv("SMPLR_ORG_ID") or os.getenv("SMPLR_ORD_ID"),
        "clientToken": os.getenv("SMPLR_CLIENT_TOKEN") or os.getenv("SMPLR_TOKEN") or os.getenv("SMPR_CLIENT_TOKEN"),
        "spaceId": os.getenv("SMPLR_SPACE_ID"),
    }


# ============================================================================
# FLOOR PLAN DATA ENDPOINTS (DATABASE-BACKED)
# ============================================================================

@app.get("/api/v1/hospital/rooms")
async def get_hospital_rooms():
    """Get all hospital rooms with patient assignments from database"""
    supabase = get_supabase()
    if not supabase:
        return {"error": "Database not configured", "rooms": []}
    
    try:
        # Fetch all rooms
        rooms_res = supabase.table("hospital_rooms").select("*").execute()
        rooms = rooms_res.data or []
        
        # Fetch all active room assignments with patient info
        # Use explicit FK hint to disambiguate patients->users relationship
        assignments_res = supabase.table("room_assignments").select(
            "room_id, patient_id, patients(id, age, medical_conditions, status, users!patients_user_id_fkey(full_name))"
        ).is_("discharged_at", "null").execute()
        
        # Build assignment map
        assignment_map = {}
        for a in (assignments_res.data or []):
            patient = a.get("patients", {}) or {}
            user = patient.get("users", {}) or {}
            assignment_map[a["room_id"]] = {
                "id": str(patient.get("id")) if patient.get("id") else None,
                "name": user.get("full_name", "Unknown"),
                "age": patient.get("age"),
                "condition": ", ".join(patient.get("medical_conditions") or []),
                "status": patient.get("status", "stable")
            }
        
        rooms_with_patients = []
        for room in rooms:
            patient = assignment_map.get(room["id"])
            rooms_with_patients.append({
                "id": room["id"],
                "name": room["name"],
                "type": room["room_type"],
                "status": room["status"],
                "patient": patient
            })
        
        return {"rooms": rooms_with_patients}
    except Exception as e:
        print(f"Error fetching rooms: {e}")
        return {"error": str(e), "rooms": []}


@app.get("/api/v1/hospital/hazards")
async def get_hospital_hazards():
    """Get all active hazards from database"""
    supabase = get_supabase()
    if not supabase:
        return {"error": "Database not configured", "hazards": []}
    
    try:
        response = supabase.table("hospital_hazards").select("*").in_(
            "status", ["active", "responding"]
        ).execute()
        hazards = response.data or []
        
        formatted = [{
            "id": str(h["id"]),
            "type": h["hazard_type"],
            "location": h.get("location_name", h.get("location", "Unknown")),
            "room_id": h.get("room_id"),
            "description": h["description"],
            "severity": h["severity"],
            "status": h["status"],
            "reported_at": h.get("created_at")
        } for h in hazards]
        
        return {"hazards": formatted}
    except Exception as e:
        print(f"Error fetching hazards: {e}")
        return {"error": str(e), "hazards": []}


@app.get("/api/v1/hospital/alerts")
async def get_hospital_alerts():
    """Get all active alerts from database"""
    supabase = get_supabase()
    if not supabase:
        return {"error": "Database not configured", "alerts": []}
    
    try:
        response = supabase.table("alerts").select(
            "id, title, message, severity, type, patient_id, created_at"
        ).eq("acknowledged", False).execute()
        alerts = response.data or []
        
        # Get room assignments for alert patients
        patient_ids = [a.get("patient_id") for a in alerts if a.get("patient_id")]
        room_map = {}
        
        if patient_ids:
            assignments_res = supabase.table("room_assignments").select(
                "patient_id, room_id"
            ).in_("patient_id", patient_ids).is_("discharged_at", "null").execute()
            
            for a in (assignments_res.data or []):
                room_map[str(a["patient_id"])] = a["room_id"]
        
        formatted = [{
            "id": str(a["id"]),
            "title": a.get("title"),
            "description": a.get("message"),
            "severity": a.get("severity"),
            "type": a.get("type"),
            "patient_id": str(a.get("patient_id")) if a.get("patient_id") else None,
            "room_id": room_map.get(str(a.get("patient_id"))),
            "created_at": a.get("created_at")
        } for a in alerts]
        
        return {"alerts": formatted}
    except Exception as e:
        print(f"Error fetching alerts: {e}")
        return {"error": str(e), "alerts": []}


@app.get("/api/v1/hospital/rooms/{room_id}/details")
async def get_room_details(room_id: str):
    """Get full details for a specific room including patient, tasks, hazards"""
    supabase = get_supabase()
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        # Get room
        room_res = supabase.table("hospital_rooms").select("*").eq("id", room_id).execute()
        if not room_res.data:
            return {"error": f"Room '{room_id}' not found"}
        
        room = room_res.data[0]
        
        # Get patient in room
        assignment_res = supabase.table("room_assignments").select(
            "patient_id, assigned_at, patients(id, age, medical_conditions, status, users!patients_user_id_fkey(full_name, email))"
        ).eq("room_id", room_id).is_("discharged_at", "null").execute()
        
        patient = None
        if assignment_res.data:
            p = assignment_res.data[0].get("patients", {}) or {}
            user = p.get("users", {}) or {}
            patient = {
                "id": str(p.get("id")) if p.get("id") else None,
                "name": user.get("full_name", "Unknown"),
                "email": user.get("email"),
                "age": p.get("age"),
                "conditions": p.get("medical_conditions", []),
                "status": p.get("status", "stable"),
                "assigned_at": assignment_res.data[0].get("assigned_at")
            }
        
        # Get pending tasks for room
        tasks_res = supabase.table("room_tasks").select("*").eq(
            "room_id", room_id
        ).eq("status", "pending").execute()
        tasks = [{
            "id": str(t["id"]),
            "type": t["task_type"],
            "title": t["title"],
            "description": t.get("description"),
            "priority": t["priority"],
            "due_at": t.get("due_at")
        } for t in (tasks_res.data or [])]
        
        # Get hazards for room
        hazards_res = supabase.table("hospital_hazards").select("*").eq(
            "room_id", room_id
        ).in_("status", ["active", "responding"]).execute()
        hazards = [{
            "id": str(h["id"]),
            "type": h["hazard_type"],
            "description": h["description"],
            "severity": h["severity"],
            "status": h["status"]
        } for h in (hazards_res.data or [])]
        
        # Get alerts for patient in room
        alerts = []
        if patient and patient.get("id"):
            alerts_res = supabase.table("alerts").select("*").eq(
                "patient_id", patient["id"]
            ).eq("acknowledged", False).execute()
            alerts = [{
                "id": str(a["id"]),
                "title": a.get("title"),
                "message": a.get("message"),
                "severity": a.get("severity")
            } for a in (alerts_res.data or [])]
        
        # Get pending medications for patient
        medications = []
        if patient and patient.get("id"):
            meds_res = supabase.table("pill_logs").select(
                "id, scheduled_time, status, patient_pills(pills(name, strength, unit))"
            ).eq("patient_id", patient["id"]).eq("status", "pending").execute()
            
            for m in (meds_res.data or []):
                pp = m.get("patient_pills", {}) or {}
                pill = pp.get("pills", {}) or {}
                medications.append({
                    "id": str(m["id"]),
                    "name": pill.get("name", "Unknown"),
                    "dosage": f"{pill.get('strength', '')} {pill.get('unit', '')}".strip(),
                    "scheduled_time": m.get("scheduled_time"),
                    "status": m.get("status")
                })
        
        return {
            "room": {
                "id": room["id"],
                "name": room["name"],
                "type": room["room_type"],
                "status": room["status"]
            },
            "patient": patient,
            "tasks": tasks,
            "hazards": hazards,
            "alerts": alerts,
            "medications": medications
        }
    except Exception as e:
        print(f"Error fetching room details: {e}")
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
