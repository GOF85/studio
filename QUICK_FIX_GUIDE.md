# QUICK REFERENCE: hojas_picking & hojas_retorno

## 30-Second Summary

**Problem**: 400 Bad Request errors when accessing picking/return sheets

**Root Causes** (in order of likelihood):
1. Tables don't exist in Supabase
2. Field name mismatch: code uses `evento_id`, DB has `os_id`
3. Missing RLS policies

**Solution** (3 steps):
```bash
# 1. Create tables (run in Supabase SQL Editor)
# Copy-paste: migrations/20260110_create_hojas_picking_retorno.sql

# 2. Fix code bug in hooks/use-data-store.ts
# Line 623: p.evento_id → p.os_id
# Line 638: p.evento_id → p.os_id

# 3. Restart dev server
npm run dev
```

---

## Table Schemas at a Glance

### hojas_picking
| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT (PK) | UUID |
| `os_id` | VARCHAR(255) | FK to eventos |
| `estado` | VARCHAR | 'Pendiente'\|'En Proceso'\|'Listo' |
| `items` | JSONB | OrderItem[] |
| `data` | JSONB | {fechaNecesidad, itemStates, checkedItems, solicita} |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

### hojas_retorno
| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT (PK) | = os_id |
| `os_id` | VARCHAR(255) | FK to eventos (UNIQUE) |
| `data` | JSONB | {items[], status, itemStates} |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

---

## Code Locations

| Purpose | File | Line |
|---------|------|------|
| Type definitions | [types/index.ts](types/index.ts#L953) | 953-979 |
| Query hooks | [hooks/use-data-queries.ts](hooks/use-data-queries.ts#L2876) | 2876-3220 |
| **🔴 BUG** | [hooks/use-data-store.ts](hooks/use-data-store.ts#L620) | 620-650 |
| Material queries | [hooks/use-material-module-data.ts](hooks/use-material-module-data.ts#L23) | 23-24 |
| Deletion | [services/os-service.ts](services/os-service.ts#L87) | 87-88 |

---

## Exact Code Fixes

### Fix 1: Line 623 (mapping key)
```diff
- mappedPickingSheets[p.evento_id] = {
+ mappedPickingSheets[p.os_id] = {
```

### Fix 2: Line 623 (osId value)
```diff
  osId: p.evento_id,
+ osId: p.os_id,
```

### Fix 3: Line 638 (mapping key)
```diff
- mappedReturnSheets[p.evento_id] = {
+ mappedReturnSheets[p.os_id] = {
```

### Fix 4: Line 638 (osId value)
```diff
  osId: p.evento_id,
+ osId: p.os_id,
```

---

## Files Referenced in Analysis

### Documentation Created (IN THIS REPO):
- [HOJAS_TABLES_COMPLETE_SUMMARY.md](HOJAS_TABLES_COMPLETE_SUMMARY.md) ← Full guide
- [HOJAS_TABLES_DETAILED_ANALYSIS.md](HOJAS_TABLES_DETAILED_ANALYSIS.md) ← Deep dive
- [FIX_HOJAS_TABLES.md](FIX_HOJAS_TABLES.md) ← Code changes
- [TABLE_STRUCTURE_ANALYSIS.md](TABLE_STRUCTURE_ANALYSIS.md) ← Structure overview
- [migrations/20260110_create_hojas_picking_retorno.sql](migrations/20260110_create_hojas_picking_retorno.sql) ← SQL to run

### Source Code Files:
- [types/index.ts#L953](types/index.ts#L953) - PickingSheet & ReturnSheet types
- [hooks/use-data-queries.ts#L2876](hooks/use-data-queries.ts#L2876) - Query hooks
- [hooks/use-data-store.ts#L620](hooks/use-data-store.ts#L620) - **BUG: uses evento_id**
- [hooks/use-material-module-data.ts#L23](hooks/use-material-module-data.ts#L23) - Material queries
- [services/os-service.ts#L87](services/os-service.ts#L87) - Deletion logic
- [app/(dashboard)/almacen/picking/page.tsx](app/(dashboard)/almacen/picking/page.tsx) - UI

---

## Common 400 Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `relation "public.hojas_picking" does not exist` | Table missing | Run migration |
| `column "os_id" does not exist` | Wrong column name | Verify DB schema |
| `column "evento_id" does not exist` | Code bug | Fix use-data-store.ts |
| `permission denied` | RLS blocking | Add policies (in migration) |
| `null value violates not-null` | os_id is null | Pass valid os_id |
| `duplicate key value` | Upsert conflict | Check unique constraint |

---

## How the Bug Manifests

```
DB Query: SELECT * FROM hojas_picking WHERE os_id = 'abc-123'
         ↓
Result: { id: 'x', os_id: 'abc-123', estado: 'Pendiente', ... }
         ↓
Code:   mappedPickingSheets[p.evento_id] = ...
             ↑ This is UNDEFINED!
         ↓
Store:  mappedPickingSheets = { undefined: {...} }  ✗ Wrong!
         Should be: { 'abc-123': {...} }  ✓ Correct!
         ↓
Result: UI shows empty picking sheets list
```

---

## Testing After Fix

### Step 1: Verify tables exist
```sql
-- Run in Supabase SQL Editor
SELECT * FROM hojas_picking LIMIT 1;
SELECT * FROM hojas_retorno LIMIT 1;
```

### Step 2: Check code fix applied
```bash
grep -n "os_id\|evento_id" hooks/use-data-store.ts | grep -E "623|638"
# Should show: os_id (not evento_id)
```

### Step 3: Restart dev server
```bash
npm run dev
```

### Step 4: Test in browser
```
1. Navigate to: http://localhost:3000/almacen/picking
2. Open DevTools (F12)
3. Check Network tab
4. Verify NO 400 errors
5. Verify picking sheets load correctly
```

---

## Emergency Checklist

- [ ] Tables exist? `SELECT 1 FROM hojas_picking;`
- [ ] Column names correct? Field should be `os_id` not `evento_id`
- [ ] RLS policies added? Can authenticated users read/write?
- [ ] Code fixed? use-data-store.ts lines 623, 638
- [ ] Dev server restarted? Kill with Ctrl+C, restart with `npm run dev`
- [ ] No 400 errors? Check Network tab in DevTools
- [ ] Picking sheets visible? Navigate to /almacen/picking
- [ ] Return sheets visible? Navigate to /almacen/retornos

---

## Support

If you still get 400 errors after these fixes:

1. **Check exact error message** in Browser DevTools > Network tab
2. **Search error message** in [HOJAS_TABLES_COMPLETE_SUMMARY.md](HOJAS_TABLES_COMPLETE_SUMMARY.md)
3. **Verify table schema** in Supabase Dashboard
4. **Check RLS policies** in Supabase Dashboard > Auth
5. **Check logs** with `npm run dev` (watch terminal output)

---

## File Sizes & Complexity

| File | Lines | Complexity |
|------|-------|-----------|
| types/index.ts (PickingSheet) | 10 | Simple type |
| use-data-queries.ts (hooks) | 350+ | Complex queries |
| use-data-store.ts (mapping) | 30 | Simple logic |
| SQL migration | 80 | SQL DDL |

---

## Timeline to Fix

1. **1 min**: Read this guide
2. **2 min**: Copy SQL migration
3. **3 min**: Paste & run in Supabase
4. **5 min**: Edit use-data-store.ts (4 line changes)
5. **2 min**: Restart dev server
6. **5 min**: Test in browser

**Total: ~20 minutes**

---

## Key Insight

The code is **reading** from `os_id` column (correct), but **mapping** it as `evento_id` (wrong).

This creates a silent failure where:
- ✅ No errors thrown
- ✅ Data fetched successfully
- ❌ Data never reaches UI
- ❌ Appears as empty records

Fix: Change `evento_id` → `os_id` in use-data-store.ts
