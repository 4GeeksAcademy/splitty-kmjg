"""
Supabase client initialization.
Provides clients for:
- Database (PostgreSQL via SQLAlchemy - already configured in app.py)
- Auth (JWT validation)
- Storage (for receipt uploads - alternative to Cloudinary)
"""
import os
from supabase import create_client, Client

# Supabase connection settings from environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Lazy-loaded client instances
_supabase_client: Client = None


def get_supabase_client() -> Client:
    """
    Get or create Supabase client instance.
    Returns None if not configured.
    """
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print("WARNING: Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY")
        return None
    
    _supabase_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return _supabase_client


def get_supabase_admin_client() -> Client:
    """
    Get Supabase client with service role key (for admin operations).
    Use only on server-side, never expose to frontend.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("WARNING: SUPABASE_SERVICE_KEY not set. Admin operations will fail.")
        return get_supabase_client()
    
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def is_supabase_storage_configured() -> bool:
    """Check if Supabase Storage is available as alternative to Cloudinary."""
    return bool(SUPABASE_URL and SUPABASE_ANON_KEY)
