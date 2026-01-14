#!/bin/bash
# Execute migration to add hora_entrega and recogida columns

# Load environment variables
source .env.local 2>/dev/null || true

# Get Supabase credentials
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Error: Missing Supabase credentials"
  echo "   NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL:0:20}..."
  echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_KEY:0:20}..."
  exit 1
fi

echo "🔍 Executing migration: 20260112_add_hora_entrega_recogida_to_pedidos.sql"
echo "   Supabase URL: ${SUPABASE_URL:0:40}..."

# Use psql to execute the migration if available
if command -v psql &> /dev/null; then
  echo "📌 Using psql to execute migration..."
  
  # Extract connection string from Supabase URL
  # Format: https://[project-id].supabase.co
  # Need to convert to postgres://...
  
  cat migrations/20260112_add_hora_entrega_recogida_to_pedidos.sql | \
    psql "postgresql://postgres:[password]@[host]:5432/postgres" \
      -v ON_ERROR_STOP=1
    
  exit $?
fi

echo "❌ Error: psql not found. Cannot execute migration."
echo "   Please run the SQL manually in Supabase dashboard:"
echo "   1. Go to: https://app.supabase.com"
echo "   2. Open SQL Editor"
echo "   3. Paste the contents of: migrations/20260112_add_hora_entrega_recogida_to_pedidos.sql"
echo "   4. Click 'Run'"
exit 1
