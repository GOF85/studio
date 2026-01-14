# Test Consolidation Flow - UUID Fix

## Summary
This test verifies that the UUID→numero_expediente conversion is working correctly in the consolidation flow.

## The Fix
Previously:
- Middleware converts `numero_expediente` (string) → UUID (in URL)
- Frontend receives UUID
- Hook was resolving UUID unnecessarily
- API received UUID and tried to insert it as `os_id` → FK constraint failed

Now:
- Frontend receives UUID from middleware
- Hook passes UUID as-is to API
- API detects UUID pattern
- API queries `eventos` table to get `numero_expediente`
- API uses `numero_expediente` for all database operations
- FK constraint satisfied ✅

## Manual Testing Steps

### Step 1: Start the development server
```bash
npm run dev
```

### Step 2: Open browser DevTools
```
F12 or Right-click → Inspect → Console tab
```

### Step 3: Navigate to an OS with sub-pedidos
- Go to `/os/[numero_expediente]/alquiler` 
- Make sure you have pending sub-orders ("Sub-Pedidos Pendientes")

### Step 4: Execute consolidation
1. Click "Enviar Sub-Pedidos"
2. Modal opens with pending sub-orders
3. Select the sub-orders you want to consolidate
4. Click "Enviar" button
5. Confirm in the dialog

### Step 5: Check Console Logs

#### Expected Log Output (PASO 1):

```
🔄 [PASO 1] Resolviendo osId...
   osId recibido: 8935afe1-48bc-4669-b5c3-a6c4135fcac5
   osId tipo: string - Es UUID? SÍ
   osId resuelto a UUID: 8935afe1-48bc-4669-b5c3-a6c4135fcac5
   ℹ️ osId es UUID, buscando numero_expediente...
   ✅ numero_expediente encontrado: 2025-12345
   Final: numeroExpediente para tablas pedidos: 2025-12345
```

Key indicators:
- ✅ `osId recibido: 8935...` (is UUID from middleware)
- ✅ `osId es UUID? SÍ` (detection working)
- ✅ `✅ numero_expediente encontrado: 2025-12345` (conversion successful)

#### Expected Log Output (PASO 5 - Insert):

```
🔄 [PASO 5] Creando registros en os_pedidos_enviados...
   📦 Procesando grupo: 2025-02-14__Salón...
      Artículos: 3
      Unidades: 15
      Verificando si ya existe consolidado...
      📝 Datos a insertar:
         os_id: 2025-12345
         fecha_entrega: 2025-02-14
         localizacion: Salón Principal
         items_count: 3
         estado: En preparación
      ✅ Creado exitosamente (ID: xxx-xxx-xxx)
```

Key indicators:
- ✅ `os_id: 2025-12345` (NOT a UUID - using numero_expediente)
- ✅ `✅ Creado exitosamente` (insert succeeded - FK satisfied)

### Step 6: Check for Success Toast
After a few seconds:
- ✅ Green toast: "Pedidos consolidados" 
- ❌ No error toast with FK constraint message

### Step 7: Verify in "Consolidados" Tab
1. Reload the page
2. Click on "Consolidados" tab
3. Should see the newly created consolidado order
4. Click to expand and verify items are there

### Step 8: Verify Database (Optional)
```sql
-- Check the os_pedidos_enviados table
SELECT 
  id,
  os_id,
  fecha_entrega,
  localizacion,
  estado,
  created_at
FROM os_pedidos_enviados
WHERE os_id = '2025-12345'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check that os_id is VARCHAR (numero_expediente), NOT UUID
-- Should see values like '2025-12345', NOT '8935afe1-48bc-4669-...'
```

## Troubleshooting

### Issue: Still seeing FK constraint error
**Check:**
1. Is PASO 1 showing "✅ numero_expediente encontrado"?
   - If NO: The uuid→numero_expediente lookup is failing
   - Check if the evento record exists in the database
   
2. Is PASO 5 showing `os_id: 2025-12345` (NOT uuid)?
   - If showing UUID: The conversion didn't happen
   - Check if isUUID regex is matching properly

3. Middleware not converting numero_expediente to UUID?
   - Check middleware.ts
   - The URL should show UUID in logs

### Issue: Logs not appearing in browser console
- Check browser console (F12)
- Check Network tab to see API response
- Check Supabase logs in dashboard

### Issue: Consolidados not appearing after reload
1. Check if insert actually succeeded (PASO 5 should say ✅ Creado exitosamente)
2. Try manual query in Supabase dashboard
3. Check if there's a filtering issue in usePedidosEnviados hook

## Files Changed
- `hooks/use-pedidos-enviados.ts`: Removed unnecessary resolveOsId, added UUID detection in usePedidosEnviados
- `app/api/pedidos/generate-pdf/route.ts`: Added UUID detection and numero_expediente conversion in PASO 1

## Expected Behavior After Fix
1. ✅ Sub-pedidos disappear from "Pendientes" tab
2. ✅ New record appears in "Consolidados" tab  
3. ✅ No FK constraint error
4. ✅ PDF generated and sent successfully
5. ✅ Database shows os_id as numero_expediente string, not UUID
