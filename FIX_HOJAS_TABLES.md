# REQUIRED CODE FIXES

## Issue: Field Name Mismatch (evento_id vs os_id)

### Problem Location 1: [hooks/use-data-store.ts Line 623](hooks/use-data-store.ts#L620)

**Current Code (WRONG):**
```typescript
// Map Picking Sheets
const mappedPickingSheets: Record<string, PickingSheet> = {};
(pickingSheetsDB || []).forEach((p: any) => {
    const data = p.data || {};
    mappedPickingSheets[p.evento_id] = {    // ❌ WRONG: uses evento_id
        id: p.id,
        osId: p.evento_id,                   // ❌ WRONG: expects p.evento_id
        items: p.items || [],
        status: p.estado,
        fechaNecesidad: data.fecha || data.fechaNecesidad || '',
        itemStates: data.itemStates,
        checkedItems: data.checkedItems
    };
});
```

**Fixed Code:**
```typescript
// Map Picking Sheets
const mappedPickingSheets: Record<string, PickingSheet> = {};
(pickingSheetsDB || []).forEach((p: any) => {
    const data = p.data || {};
    mappedPickingSheets[p.os_id] = {        // ✅ FIXED: uses os_id
        id: p.id,
        osId: p.os_id,                      // ✅ FIXED: maps p.os_id
        items: p.items || [],
        status: p.estado,
        fechaNecesidad: data.fecha || data.fechaNecesidad || '',
        itemStates: data.itemStates,
        checkedItems: data.checkedItems
    };
});
```

---

### Problem Location 2: [hooks/use-data-store.ts Line 638](hooks/use-data-store.ts#L635)

**Current Code (WRONG):**
```typescript
// Map Return Sheets
const mappedReturnSheets: Record<string, ReturnSheet> = {};
(returnSheetsDB || []).forEach((p: any) => {
    const data = p.data || {};
    mappedReturnSheets[p.evento_id] = {    // ❌ WRONG: uses evento_id
        id: p.id,
        osId: p.evento_id,                  // ❌ WRONG: expects p.evento_id
        items: data.items || [],
        status: data.status || 'Pendiente',
        itemStates: data.itemStates || {}
    };
});
```

**Fixed Code:**
```typescript
// Map Return Sheets
const mappedReturnSheets: Record<string, ReturnSheet> = {};
(returnSheetsDB || []).forEach((p: any) => {
    const data = p.data || {};
    mappedReturnSheets[p.os_id] = {        // ✅ FIXED: uses os_id
        id: p.id,
        osId: p.os_id,                      // ✅ FIXED: maps p.os_id
        items: data.items || [],
        status: data.status || 'Pendiente',
        itemStates: data.itemStates || {}
    };
});
```

---

## Apply These Fixes

The changes are simple - replace 2 instances of `p.evento_id` with `p.os_id` on:
1. Line 623 (mapping key)
2. Line 623 (osId assignment)  
3. Line 638 (mapping key)
4. Line 638 (osId assignment)

---

## After Applying Fixes:

1. ✅ Restart development server: `npm run dev`
2. ✅ Run TypeScript check: `npm run typecheck`
3. ✅ Test queries in browser console:
   ```javascript
   // Should now properly map picking sheets with os_id
   console.log(window.__dataStore?.data?.pickingSheets)
   ```
4. ✅ Verify no 400 Bad Request errors when:
   - Loading picking sheets list
   - Updating picking sheet status
   - Upserting return sheets

---

## Verification Commands

### Check if fix is working:
```bash
# Run in terminal after fix
npm run typecheck  # Should have no errors
npm run dev        # Should start without errors
```

### Query test in browser DevTools:
```javascript
// After navigating to /almacen/picking
fetch('/api/data').then(r => r.json()).then(d => console.log(d.pickingSheets))

// Or check the data store
console.log(JSON.stringify(window.__dataStore?.data?.pickingSheets, null, 2))
```

---

## Summary

| Issue | Location | Fix | Impact |
|-------|----------|-----|--------|
| evento_id typo in mapping | use-data-store.ts:623 | Change to os_id | Prevents undefined osId |
| evento_id typo in return mapping | use-data-store.ts:638 | Change to os_id | Prevents undefined osId |
| Query mismatch | Already correct in use-data-queries.ts | None needed | ✅ |
| Database field name | hojas_picking table | Must be os_id | Critical for queries |

The root cause is that **use-data-store.ts was looking for `evento_id` but all queries use `os_id`**, creating a mismatch where:
- ✅ Queries would succeed (because db has `os_id`)
- ❌ Data mapping would fail (because code expected `evento_id`)

This would manifest as empty picking sheets and return sheets in the UI!
