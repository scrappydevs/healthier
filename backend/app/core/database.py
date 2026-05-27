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

def get_db_sync() -> Client:
    """
    Get database client for use in background tasks (non-dependency injection).
    Raises if Supabase not configured.
    """
    client = get_supabase()
    if client is None:
        raise RuntimeError("Database not configured - check SUPABASE_URL and SUPABASE_KEY")
    return client

async def upload_image_to_bucket(
    bucket_name: str, 
    file_path: str, 
    data: bytes,
    content_type: str = "image/jpeg"
) -> str:
    """
    Upload an image to a Supabase storage bucket.
    
    Args:
        bucket_name: Name of the storage bucket
        file_path: Path/filename within the bucket (e.g., "pills/image123.jpg")
        data: Image data as bytes
        content_type: MIME type of the image
        
    Returns:
        Public URL of the uploaded image
        
    Raises:
        RuntimeError: If Supabase is not configured or upload fails
    """
    client = get_supabase()
    if client is None:
        raise RuntimeError("Supabase not configured - cannot upload to storage")
    
    try:
        # Upload file to storage bucket
        client.storage.from_(bucket_name).upload(
            file_path,
            data,
            file_options={
                "content-type": content_type,
                "upsert": "true"  # Overwrite if exists
            }
        )
        
        public_url = client.storage.from_(bucket_name).get_public_url(file_path)
        
        return public_url
    except Exception as e:
        print(f"❌ Failed to upload to Supabase storage: {e}")
        raise RuntimeError(f"Failed to upload image to storage: {str(e)}")

def ensure_bucket_exists(bucket_name: str, public: bool = True) -> bool:
    """
    Ensure a storage bucket exists, create it if it doesn't.
    
    Args:
        bucket_name: Name of the bucket
        public: Whether the bucket should be public
        
    Returns:
        True if bucket exists or was created successfully
    """
    client = get_supabase()
    if client is None:
        return False
    
    try:
        client.storage.from_(bucket_name).list(limit=1)
        return True
    except Exception:
        # Bucket doesn't exist, try to create it
        try:
            client.storage.create_bucket(
                bucket_name,
                options={"public": public}
            )
            print(f"✅ Created storage bucket: {bucket_name}")
            return True
        except Exception as e:
            print(f"⚠️ Failed to create bucket {bucket_name}: {e}")
            return False
