# ✅ FK CONSTRAINT FIX - READY FOR TESTING

**Status**: ✅ Code complete and compiled  
**Files Modified**: 2 files  
**Breaking Changes**: None  
**Backward Compatible**: Yes

---

## What Was Fixed

The consolidation flow was throwing:
```
FK Constraint Error: violates foreign key constraint "os_pedidos_enviados_os_id_fkey"
```

**Root Cause**: API was inserting UUID values where the database expected `numero_expediente` strings.

**Solution**: Added UUID detection in the API to automatically convert UUID → numero_expediente before database operations.

---

## Files Changed

### 1. [hooks/use-pedidos-enviados.ts](hooks/use-pedidos-enviados.ts)
- Removed unnecessary `resolveOsId()` call from hook
- Hook now passes osId directly to API
- API responsible for UUID conversion

### 2. [app/api/pedidos/generate-pdf/route.ts](app/api/pedidos/generate-pdf/route.ts)
- Added UUID detection logic (PASO 1, lines 67-105)
- Queries `eventos` table to get `numero_expediente` when UUID detected
- Uses `numero_expediente` for all database operations
- Updated `ConsolidatedGroup` interface with rental fields

---

## How to Test

### Quick Test (3 minutes)

1. **Start server** (if not running):
   ```bash
   npm run dev
   ```
   Server will be at `http://localhost:3001`

2. **Open browser DevTools**:
   - Press `F12`
   - Go to **Console** tab

3. **Navigate to an OS with sub-pedidos**:
   - Go to `/os/[numero_expediente]/alquiler`
   - Find "Sub-Pedidos Pendientes" section
   - Must have at least 1 pending sub-order

4. **Trigger consolidation**:
   - Click "Enviar Sub-Pedidos" button
   - Modal appears with pending orders
   - Select 1+ orders
   - Click "Enviar" and confirm

5. **Watch console logs**:
   - Look for `[INICIO] POST /api/pedidos/generate-pdf`
   - Should see PASO 1: "✅ numero_expediente encontrado: 2025-XXXXX"
   - Should see PASO 5: "✅ Creado exitosamente"
   - Wait for toast: "Pedidos consolidados"

6. **Verify result**:
   - Click "Consolidados" tab
   - New order should appear
   - Reload page - should still be there

### What Success Looks Like

**Browser Console (PASO 1)**:
```
osId recibido: 8935afe1-48bc-4669-b5c3-a6c4135fcac5
osId tipo: string - Es UUID? SÍ
ℹ️ osId es UUID, buscando numero_expediente...
✅ numero_expediente encontrado: 2025-12345
Final: numeroExpediente para tablas pedidos: 2025-12345
```

**Browser Console (PASO 5)**:
```
📝 Datos a insertar:
   os_id: 2025-12345
   fecha_entrega: 2025-02-14
   localizacion: Salón Principal
   items_count: 3
   estado: En preparación
✅ Creado exitosamente (ID: 987c6543-ba98-76d5-...)
```

**Browser Toast**:
```
✅ Pedidos consolidados
```

**UI Change**:
- Sub-orders disappear from "Pendientes"
- New record appears in "Consolidados"
- Reload page - record persists

### Troubleshooting

**Still seeing FK error?**
1. Check PASO 1 logs for "✅ numero_expediente encontrado"
   - If showing "⚠️ No se encontró numero_expediente", the UUID→numero_expediente lookup failed
   - Verify the UUID actually exists in the database

2. Check PASO 5 for actual `os_id` value being inserted
   - Should be "2025-12345" NOT a UUID
   - If showing UUID, the conversion didn't happen

3. Server logs (terminal):
   - Should show same PASO logs without errors
   - Look for any database error messages

**No logs appearing?**
- Open DevTools Console (F12)
- Reload page
- Check Network tab → find generate-pdf request
- Click on it, go to Response tab
- Should see detailed error message

---

## Testing Checklist

Use this to verify the fix is working:

- [ ] Server starts without errors
- [ ] Can navigate to OS with sub-pedidos
- [ ] Click "Enviar Sub-Pedidos" opens modal
- [ ] Select orders and click "Enviar"
- [ ] PASO 1 shows UUID detection
- [ ] PASO 1 shows "✅ numero_expediente encontrado"
- [ ] PASO 5 shows "✅ Creado exitosamente"
- [ ] Green toast appears "Pedidos consolidados"
- [ ] Sub-orders disappear from Pendientes
- [ ] New order appears in Consolidados tab
- [ ] Order persists after page reload
- [ ] No errors in browser console
- [ ] No errors in server terminal

---

## Technical Details

### The Problem
```
Frontend → Receives UUID from middleware
  ↓
API → Was using UUID directly as os_id
  ↓
Database → FK Constraint Failed ❌
           (UUID doesn't exist in numero_expediente column)
```

### The Solution
```
Frontend → Receives UUID from middleware
  ↓
API → Detects UUID pattern
  ↓
API → Queries: SELECT numero_expediente FROM eventos WHERE id = UUID
  ↓
API → Uses numero_expediente for all operations
  ↓
Database → FK Constraint Satisfied ✅
           (numero_expediente exists in eventos.numero_expediente)
```

### Files Modified Summary
1. **Hook** (`use-pedidos-enviados.ts`):
   - Before: Tried to resolve UUID unnecessarily
   - After: Passes UUID to API as-is

2. **API** (`generate-pdf/route.ts`):
   - Before: Used UUID directly for database operations
   - After: Detects UUID → converts to numero_expediente → uses for DB

---

## Server Status

The development server is running at:
- **URL**: http://localhost:3001
- **Status**: ✅ Running and ready for testing

To restart if needed:
```bash
# Kill existing process
lsof -ti:3001 | xargs kill -9

# Start fresh
npm run dev
```

---

## Related Documentation

- [FK_CONSTRAINT_FIX_COMPLETE.md](FK_CONSTRAINT_FIX_COMPLETE.md) - Detailed technical explanation
- [TEST_CONSOLIDATION_FLOW.md](TEST_CONSOLIDATION_FLOW.md) - Comprehensive testing guide
- [DEBUG_PEDIDOS_ENVIADOS.md](DEBUG_PEDIDOS_ENVIADOS.md) - Debug logging reference

---

## Next Steps

1. ✅ Code changes complete
2. ✅ Server running
3. **👉 YOU ARE HERE**: Run the manual test above
4. Verify all checklist items pass
5. Commit changes to git
6. Deploy to staging for QA

---

**Questions?** Check the logs in the browser console - they're very detailed and will show exactly what's happening at each step.
