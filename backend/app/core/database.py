"""
Supabase client module for database operations.
"""

from functools import lru_cache
from typing import Optional

from supabase import create_client, Client

from app.core.config import get_settings


_supabase_client: Optional[Client] = None


def get_supabase() -> Optional[Client]:
    """
    Get or create Supabase client instance.
    Returns None if credentials not configured.
    """
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    settings = get_settings()
    
    if not settings.supabase_url or not settings.supabase_key:
        print("⚠️ Supabase not configured - SUPABASE_URL or SUPABASE_KEY missing")
        return None
    
    try:
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_key
        )
        print("✅ Supabase client initialized")
        return _supabase_client
    except Exception as e:
        print(f"❌ Failed to initialize Supabase: {e}")
        return None


# Convenience alias
supabase = get_supabase()


def get_db() -> Client:
    """
    FastAPI dependency for getting database client.
    Raises if Supabase not configured.
    """
    client = get_supabase()
    if client is None:
        raise RuntimeError("Database not configured - check SUPABASE_URL and SUPABASE_KEY")
    return client
