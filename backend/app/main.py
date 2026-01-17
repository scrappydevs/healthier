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

from app.api.health import router as health_router
from app.api.v1 import router as v1_router
from app.core.config import get_settings
from app.ai_tools import PILLPAL_TOOLS, execute_tool
from app.chat_context import (
    create_session,
    read_context,
    write_context,
    get_user_sessions,
    build_system_prompt,
)


# Cerebras client (OpenAI-compatible)
_cerebras_client: Optional[OpenAI] = None


def get_cerebras_client() -> Optional[OpenAI]:
    """Get or create Cerebras client"""
    global _cerebras_client
    
    if _cerebras_client is not None:
        return _cerebras_client
    
    settings = get_settings()
    
    if not settings.cerebras_key:
        print("⚠️ Cerebras not configured - CEREBRAS_KEY missing")
        return None
    
    try:
        _cerebras_client = OpenAI(
            api_key=settings.cerebras_key,
            base_url="https://api.cerebras.ai/v1"
        )
        print("✅ Cerebras client initialized")
        return _cerebras_client
    except Exception as e:
        print(f"❌ Failed to initialize Cerebras: {e}")
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
    
    # Initialize AI client
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
    error: Optional[str] = None


@app.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest):
    """
    Context-aware AI chat endpoint using Cerebras API with tool calling.
    """
    cerebras_client = get_cerebras_client()
    
    if not cerebras_client:
        return ChatResponse(
            response="AI assistant is not available. Please configure CEREBRAS_KEY.",
            session_id=request.session_id or "error",
            error="cerebras_not_configured"
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
        
        # Build messages for API
        api_messages = [
            {"role": "system", "content": build_system_prompt(context)}
        ]
        api_messages.extend([
            {"role": msg["role"], "content": msg["content"]}
            for msg in context.messages
        ])
        
        print(f"\n💬 User message: {request.message}")
        
        # Call Cerebras API with tools
        response = cerebras_client.chat.completions.create(
            model="llama-3.3-70b",
            messages=api_messages,
            tools=PILLPAL_TOOLS,
            tool_choice="auto",
            max_tokens=2048,
            temperature=0.7,
        )
        
        # Handle tool calls with multi-round support
        assistant_response = ""
        all_tool_results = []
        max_rounds = 5
        round_num = 0
        
        current_response = response
        
        while current_response.choices[0].message.tool_calls and round_num < max_rounds:
            round_num += 1
            print(f"\n{'='*60}")
            print(f"🔄 TOOL ROUND {round_num}")
            print(f"{'='*60}")
            
            tool_calls = current_response.choices[0].message.tool_calls
            tool_messages = []
            
            # Add assistant message with tool calls
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
            
            # Execute each tool call
            for tool_call in tool_calls:
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments)
                
                print(f"\n🔧 Tool call: {tool_name}")
                print(f"   Input: {tool_args}")
                
                tool_result = await execute_tool(tool_name, tool_args)
                print(f"   Result: {json.dumps(tool_result, indent=2)[:500]}...")
                
                all_tool_results.append(tool_result)
                
                # Add tool result to messages
                api_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(tool_result)
                })
            
            # Call API again with tool results
            current_response = cerebras_client.chat.completions.create(
                model="llama-3.3-70b",
                messages=api_messages,
                tools=PILLPAL_TOOLS,
                tool_choice="auto",
                max_tokens=2048,
                temperature=0.7,
            )
            
            print(f"\n📊 Round {round_num} complete")
        
        # Extract final response
        assistant_response = current_response.choices[0].message.content or ""
        
        print(f"\n✅ Tool execution complete after {round_num} rounds")
        print(f"   Total tools called: {len(all_tool_results)}")
        
        # Add assistant response to context
        context.messages.append({
            "role": "assistant",
            "content": assistant_response
        })
        
        # Save updated context
        await write_context(session_id, context)
        
        # Check if cache should be invalidated
        invalidate_cache = False
        cache_keys = []
        
        for tool_result in all_tool_results:
            if isinstance(tool_result, dict) and tool_result.get("success"):
                invalidate_cache = True
                cache_keys = ["rooms", "patients", "hazards", "alerts"]
                break
        
        return ChatResponse(
            response=assistant_response,
            session_id=session_id,
            session_title=session_title,
            tool_calls=len(all_tool_results),
            tool_rounds=round_num,
            invalidate_cache=invalidate_cache,
            cache_keys=cache_keys
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


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
