"""
Run the database migration using Supabase.
Usage: cd backend && source venv/bin/activate && infisical run --env=dev -- python run_migration.py
"""

import os
from pathlib import Path

from supabase import create_client


def run_migration():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_KEY must be set")
        return False
    
    # Read migration file
    migration_path = Path(__file__).parent.parent / "supabase" / "migrations" / "20260117000001_initial_schema.sql"
    
    if not migration_path.exists():
        print(f"Error: Migration file not found at {migration_path}")
        return False
    
    sql = migration_path.read_text()
    
    print(f"Connecting to Supabase: {url}")
    client = create_client(url, key)
    
    # Split SQL into individual statements and execute
    # Note: Supabase RPC doesn't support raw SQL, so we'll need to use the REST API
    # For complex migrations, use the Supabase CLI or Dashboard SQL Editor
    
    print("Migration file found. Please run this SQL in Supabase Dashboard:")
    print(f"  1. Go to https://supabase.com/dashboard/project/elynkmbekbbdocmstkjr/sql")
    print(f"  2. Paste the contents of: {migration_path}")
    print(f"  3. Click 'Run'")
    print()
    print("Or use supabase CLI:")
    print("  supabase link --project-ref elynkmbekbbdocmstkjr")
    print("  supabase db push")
    
    return True


if __name__ == "__main__":
    run_migration()
