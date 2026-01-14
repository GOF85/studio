#!/bin/bash
# Cleanup script to delete duplicate A0003 pedidos

# Get all numero_pedido values and count them
sqlite3 <<EOF
-- This won't work directly without DB access
-- Using manual SQL instead
EOF

# For now, output manual cleanup instructions
cat << 'EOF'
Manual cleanup needed:

1. Go to Supabase Dashboard
2. Navigate to: SQL Editor
3. Run this query:

```sql
DELETE FROM os_pedidos_enviados 
WHERE numero_pedido = 'A0003' 
AND created_at < (
  SELECT MAX(created_at) 
  FROM os_pedidos_enviados 
  WHERE numero_pedido = 'A0003'
);
```

This will keep the oldest A0003 and delete newer duplicates.

Alternatively, if you want to delete ALL A0003:

```sql
DELETE FROM os_pedidos_enviados WHERE numero_pedido = 'A0003';
```
EOF
