#!/usr/bin/env python3
"""
Execute Supabase migration to add proveedor_id column
"""
import os
import sys
from supabase import create_client, Client

# Load environment
SUPABASE_URL = "https://zyrqdqpbrsevuygjrhvk.supabase.co"
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_SERVICE_KEY:
    print("❌ Error: SUPABASE_SERVICE_ROLE_KEY not set")
    sys.exit(1)

print(f"🔗 Connecting to Supabase: {SUPABASE_URL}")

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Migration SQL
migration_sql = """
-- Add proveedor_id column to os_pedidos_pendientes
ALTER TABLE os_pedidos_pendientes 
ADD COLUMN proveedor_id VARCHAR REFERENCES proveedores(id) ON DELETE RESTRICT;

-- Add index for performance
CREATE INDEX idx_os_pedidos_pendientes_proveedor_id ON os_pedidos_pendientes(proveedor_id);
"""

print("\n📝 Executing migration SQL...")
print(migration_sql)

try:
    # Execute raw SQL
    result = supabase.postgrest.rpc("exec_sql", {"sql": migration_sql})
    print("\n✅ Migration executed successfully!")
    print(f"Result: {result}")
except Exception as e:
    print(f"\n❌ Migration failed: {e}")
    sys.exit(1)
