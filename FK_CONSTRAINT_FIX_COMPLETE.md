# FK CONSTRAINT FIX - COMPLETE SOLUTION

## Problem Summary
When consolidating sub-pedidos (rental orders), the system was throwing:
```
FK Constraint Error: "insert or update on table "os_pedidos_enviados" violates foreign key constraint "os_pedidos_enviados_os_id_fkey"
```

Root cause: The application was attempting to insert UUID values into the `os_id` field, but the database expected `numero_expediente` (VARCHAR string like "2025-12345").

## Architecture Understanding

### Middleware Behavior
- Routes like `/os/2025-12345/alquiler` get converted to `/os/[UUID]/alquiler` internally
- This conversion happens in `middleware.ts` for consistency and security
- Frontend components receive the UUID as the route parameter

### Database Schema (Critical)
```sql
-- eventos table
CREATE TABLE eventos (
  id UUID PRIMARY KEY,
  numero_expediente VARCHAR UNIQUE,
  ...
);

-- os_pedidos_enviados table
CREATE TABLE os_pedidos_enviados (
  id UUID PRIMARY KEY,
  os_id VARCHAR NOT NULL,  -- Stores numero_expediente (e.g., "2025-12345")
  FOREIGN KEY (os_id) REFERENCES eventos(numero_expediente)
);
```

**KEY INSIGHT**: The FK constraint references `eventos.numero_expediente`, NOT `eventos.id`

### Data Flow (Before Fix)
```
Middleware: /os/2025-12345/ → URL contains UUID
Frontend receives: UUID (e.g., 8935afe1-48bc-4669-b5c3-a6c4135fcac5)
  ↓
Hook (useGeneratePDFMulti):
  - Was trying to resolve UUID unnecessarily
  - Sent UUID to API
  ↓
API (generate-pdf/route.ts):
  - Received UUID
  - Used UUID directly as os_id
  - Tried to insert: os_id = '8935afe1-48bc-4669-...'
  ↓
Database: ❌ FK FAILED - '8935afe1-...' doesn't exist in eventos.numero_expediente
```

### Data Flow (After Fix)
```
Middleware: /os/2025-12345/ → URL contains UUID
Frontend receives: UUID
  ↓
Hook (useGeneratePDFMulti):
  - Passes UUID as-is to API
  - No unnecessary resolution ✅
  ↓
API (generate-pdf/route.ts):
  - Receives UUID
  - Detects UUID pattern (regex check)
  - Queries: SELECT numero_expediente FROM eventos WHERE id = UUID
  - Gets: numero_expediente = '2025-12345'
  - Uses '2025-12345' for all database operations
  ↓
Database: ✅ FK SATISFIED - '2025-12345' exists in eventos.numero_expediente
```

## Code Changes Made

### 1. Hook: `hooks/use-pedidos-enviados.ts`

**File**: [hooks/use-pedidos-enviados.ts](hooks/use-pedidos-enviados.ts)

**Change**: Removed unnecessary `resolveOsId()` call from `useGeneratePDFMulti`

**Before**:
```typescript
export function useGeneratePDFMulti() {
  return useMutation({
    mutationFn: async (request: GeneratePDFRequest) => {
      // ❌ WAS DOING THIS:
      const resolvedOsId = await resolveOsId(request.osId);
      body: JSON.stringify({
        osId: resolvedOsId,  // Sending resolved UUID
      })
    }
  });
}
```

**After**:
```typescript
export function useGeneratePDFMulti() {
  return useMutation({
    mutationFn: async (request: GeneratePDFRequest) => {
      // ✅ NOW DOING THIS:
      // Pass osId directly - let API handle conversion
      console.log('[useGeneratePDFMulti] osId recibido:', request.osId);
      
      body: JSON.stringify({
        osId: request.osId,  // Pass as-is, API will convert
      })
    }
  });
}
```

**Reason**: The hook should not make assumptions about what the API needs. The API is responsible for UUID→numero_expediente conversion.

---

### 2. API Route: `app/api/pedidos/generate-pdf/route.ts`

**File**: [app/api/pedidos/generate-pdf/route.ts](app/api/pedidos/generate-pdf/route.ts)

**Changes**:
1. Moved Supabase client creation earlier (before first usage)
2. Added UUID detection + conversion logic in PASO 1
3. Updated ConsolidatedGroup interface with optional recogida fields

#### Change 2a: Move Supabase Client
**Before** (Line ~103):
```typescript
// ❌ supabase created here, but used above in line 74
```

**After** (Line ~55):
```typescript
// ✅ supabase created immediately after parameters validated
const cookieStore = await cookies();
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies: { ... } }
);
```

#### Change 2b: Add UUID Detection + Conversion (PASO 1)
**New Code** (Lines 67-105):
```typescript
// ✅ UUID DETECTION & CONVERSION LOGIC
const isUUID = osId?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

if (isUUID && resolvedUUID) {
  // osId is UUID (from middleware), fetch numero_expediente
  console.log('   ℹ️ osId es UUID, buscando numero_expediente...');
  
  const { data: evento } = await supabase
    .from('eventos')
    .select('numero_expediente')
    .eq('id', resolvedUUID)
    .single();
  
  if (evento?.numero_expediente) {
    numeroExpediente = evento.numero_expediente;
    console.log('   ✅ numero_expediente encontrado:', numeroExpediente);
  }
}
```

**Key Points**:
- Detects UUID using regex pattern
- Queries `eventos` table to get `numero_expediente`
- Stores result in `numeroExpediente` variable
- Falls back to osId if query fails (safety measure)
- Logs at each step for debugging

#### Change 2c: Use numero_expediente Everywhere
**All Database Operations** (Lines 129+):
```typescript
const osIdForPedidos = numeroExpediente;  // e.g., "2025-12345"

// PASO 2: Fetch
const { data: selectedPedidos } = await supabase
  .from('os_pedidos_pendientes')
  .select('*')
  .in('id', selectedPedidoIds)
  .eq('os_id', osIdForPedidos)  // ← Using numero_expediente

// PASO 5: Insert
const { data: createdPedido } = await supabase
  .from('os_pedidos_enviados')
  .insert({
    os_id: osIdForPedidos,  // ← Using numero_expediente
    fecha_entrega: group.fecha_entrega,
    // ... other fields
  })
  .select()
  .single();
```

#### Change 2d: Update Interface
**Before**:
```typescript
interface ConsolidatedGroup {
  fecha_entrega: string;
  localizacion: string;
  proveedor_id?: string;
  items: Record<string, ConsolidatedItem>;
}
```

**After**:
```typescript
interface ConsolidatedGroup {
  fecha_entrega: string;
  hora_entrega?: string;           // ← Added for rental orders
  localizacion: string;
  proveedor_id?: string;
  items: Record<string, ConsolidatedItem>;
  fecha_recogida?: string;         // ← Added for rental orders
  hora_recogida?: string;          // ← Added for rental orders
  lugar_recogida?: string;         // ← Added for rental orders
}
```

---

## Verification Checklist

After deploying the fix, verify:

- [ ] **UUID Detection Works**
  - Run consolidation
  - Check browser console PASO 1
  - Should show: "✅ numero_expediente encontrado: 2025-12345"

- [ ] **No FK Errors**
  - Complete consolidation flow
  - No error toast with "foreign key constraint"
  - Toast shows "Pedidos consolidados"

- [ ] **Sub-pedidos Appear in Consolidados**
  - After consolidation, reload page
  - Click "Consolidados" tab
  - New record should appear
  - Can expand to see items

- [ ] **Database Consistency**
  - Query: `SELECT os_id FROM os_pedidos_enviados LIMIT 5;`
  - All os_id values should be numeric like "2025-12345"
  - NO values should be UUIDs

- [ ] **PDF Generation**
  - Consolidation completes
  - PDF is generated
  - PDF is sent to provider (if configured)

---

## Logs to Expect

### PASO 1 (UUID Detection)
```
═══════════════════════════════════════════════════════════════
📥 [INICIO] POST /api/pedidos/generate-pdf
═══════════════════════════════════════════════════════════════
📋 Parámetros recibidos:
   osId: 8935afe1-48bc-4669-b5c3-a6c4135fcac5
   selectedPedidoIds: ['123e4567-e89b-12d3-a456-426614174000', ...]
   selectedPedidoIds.length: 2
   generatedBy: test-user

🔄 [PASO 1] Resolviendo osId...
   osId recibido: 8935afe1-48bc-4669-b5c3-a6c4135fcac5
   osId tipo: string - Es UUID? SÍ
   osId resuelto a UUID: 8935afe1-48bc-4669-b5c3-a6c4135fcac5
   ℹ️ osId es UUID, buscando numero_expediente...
   ✅ numero_expediente encontrado: 2025-12345
   Final: numeroExpediente para tablas pedidos: 2025-12345
```

### PASO 2 (Fetch Pending)
```
🔄 [PASO 2] Obteniendo pedidos pendientes seleccionados...
   IDs a buscar: ['id1', 'id2']
   Filtro os_id (numero_expediente): 2025-12345
   Resultado fetchError: OK
   Pedidos encontrados: 2
```

### PASO 5 (Insert Consolidado)
```
🔄 [PASO 5] Creando registros en os_pedidos_enviados...

   📦 Procesando grupo: 2025-02-14__Salón Principal
      Artículos: 3
      Unidades: 15
      Verificando si ya existe consolidado...
      📝 Datos a insertar:
         os_id: 2025-12345
         fecha_entrega: 2025-02-14
         localizacion: Salón Principal
         items_count: 3
         estado: En preparación
      ✅ Creado exitosamente (ID: 987c6543-ba98-76d5-e432-098765432100)
```

---

## Technical Details

### UUID Regex Pattern
The pattern used to detect UUIDs:
```regex
^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
```

This matches standard UUID v4 format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### FK Constraint Definition
```sql
ALTER TABLE os_pedidos_enviados
ADD CONSTRAINT os_pedidos_enviados_os_id_fkey
FOREIGN KEY (os_id) REFERENCES eventos(numero_expediente)
ON DELETE CASCADE;
```

The constraint references `numero_expediente` (VARCHAR), not the UUID primary key.

---

## Related Files

1. **Frontend Handler**: [app/(dashboard)/os/[numero_expediente]/alquiler/page.tsx](app/(dashboard)/os/[numero_expediente]/alquiler/page.tsx#L714)
   - Handles "Enviar Sub-Pedidos" button click
   - Passes UUID to hook

2. **Middleware**: [middleware.ts](middleware.ts)
   - Converts numero_expediente → UUID in URL

3. **Supabase Client**: [lib/supabase/index.ts](lib/supabase/index.ts)
   - `resolveOsId()` function for UUID resolution

4. **Test Guide**: [TEST_CONSOLIDATION_FLOW.md](TEST_CONSOLIDATION_FLOW.md)
   - Step-by-step testing instructions

---

## Deployment Notes

1. **Zero Downtime**: This fix doesn't require database migrations
2. **Backward Compatible**: Works with both UUID and numero_expediente inputs
3. **Testing**: Run end-to-end consolidation flow with existing test data
4. **Monitoring**: Check logs for any "⚠️ No se encontró numero_expediente" warnings

---

## FAQ

**Q: Why does middleware convert to UUID?**
A: Consistent URL structure across the application. The UUID is the canonical ID in the database.

**Q: Why does the database use numero_expediente for FK?**
A: For user-facing display and external system integration. numero_expediente is human-readable.

**Q: What if numero_expediente lookup fails?**
A: Falls back to using the osId as-is. Logs a warning. System will attempt insert but FK may still fail if osId is invalid.

**Q: Can we remove the middleware conversion?**
A: Not recommended. Would require updating URL handling throughout the application. Current approach (detect and convert) is safer.

**Q: Why not store both UUID and numero_expediente in os_pedidos_enviados?**
A: Single source of truth principle. FK relationship is the authority.
