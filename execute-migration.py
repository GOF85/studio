#!/usr/bin/env python3
"""Execute Supabase migration for numero_pedido column"""

import os
import sys
from pathlib import Path

# Try to import supabase client
try:
    from supabase import create_client, Client
except ImportError:
    print("Installing supabase-py...")
    os.system(f"{sys.executable} -m pip install supabase -q")
    from supabase import create_client, Client

# Get credentials
url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").strip()
service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

if not url or not service_key:
    print("❌ Missing Supabase credentials")
    print(f"   URL present: {bool(url)}")
    print(f"   Service key present: {bool(service_key)}")
    sys.exit(1)

print(f"✓ Connecting to Supabase: {url[:40]}...")

# Create client with service key (for admin operations)
client: Client = create_client(url, service_key)

# Read migration SQL
migration_file = Path(__file__).parent / "migrations" / "20260112_add_numero_pedido.sql"
if not migration_file.exists():
    print(f"❌ Migration file not found: {migration_file}")
    sys.exit(1)

with open(migration_file, 'r') as f:
    sql = f.read()

print(f"📄 Executing migration from {migration_file.name}...")
print("-" * 60)

try:
    # Execute the SQL
    result = client.rpc('exec_sql', {'sql': sql}).execute()
    print("✓ Migration executed successfully!")
    print(result)
except Exception as e:
    # If rpc method doesn't exist, try direct SQL execution
    print(f"Note: RPC method not available, trying alternative approach...")
    try:
        # Try using the admin API directly
        response = client.postgrest.rpc("exec_sql", {"sql": sql})
        print("✓ Migration executed successfully!")
    except Exception as e2:
        print(f"❌ Error executing migration: {e2}")
        print("\nYou can execute this SQL manually in Supabase SQL Editor:")
        print("-" * 60)
        print(sql)
        print("-" * 60)
        sys.exit(1)

print("\n✓ Numero_pedido column migration completed!")
