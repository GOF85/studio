#!/usr/bin/env python3
import os
import sys
from pathlib import Path

# Try to import supabase client
try:
    from supabase import create_client, Client
except ImportError:
    os.system(f"{sys.executable} -m pip install supabase -q")
    from supabase import create_client, Client

# Get credentials from environment
url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").strip()
service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

if not url or not service_key:
    print("❌ Missing Supabase credentials in environment variables")
    sys.exit(1)

client: Client = create_client(url, service_key)

# Read migration SQL
migration_file = Path(__file__).parent / "migrations" / "20260118_control_panel_tables.sql"
if not migration_file.exists():
    print(f"❌ Migration file not found: {migration_file}")
    sys.exit(1)

with open(migration_file, 'r') as f:
    sql = f.read()

print(f"📄 Executing Control Panel Overhaul migration...")

try:
    # Execute the SQL via RPC if available
    result = client.rpc('exec_sql', {'sql': sql}).execute()
    print("✓ Migration executed successfully via RPC!")
except Exception as e:
    print(f"Note: RPC failed, trying alternative (Postgrest RPC)...")
    try:
        response = client.postgrest.rpc("exec_sql", {"sql": sql})
        print("✓ Migration executed successfully via Postgrest!")
    except Exception as e2:
        print(f"❌ Error: {e2}")
        print("\nSQL to execute manually:")
        print("-" * 40)
        print(sql)
        print("-" * 40)
        sys.exit(1)
