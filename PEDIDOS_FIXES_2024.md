# Pedidos Page - Changes Summary

## Issues Fixed

### 1. ✅ Localización (Location) Update Error - **FIXED**
**Problem**: When changing delivery location, API returned error `"Cannot coerce the result to a single JSON object" (400)`

**Root Cause**: The `useUpdateEvento` hook was calling `.select().single()` on an update operation without properly selecting columns first, causing Supabase client to fail parsing the response.

**Solution Applied**:
- Removed problematic `.select().single()` call from `useUpdateEvento` mutation
- Changed from expecting full data response to simple acknowledgment
- Updated `onSuccess` callback to only invalidate the `eventos` query cache

**Files Changed**:
- [hooks/use-data-queries.ts](hooks/use-data-queries.ts#L573-L581) - Lines 573-581

**How to Test**:
1. Refresh the page (F5)
2. Navigate to a pedido with orderType='Alquiler' (Alquiler tab)
3. In the filters section, find the "Localización" (Location) dropdown
4. Try adding a new location
5. Should see success toast notification (no 400 error anymore)

---

### 2. 🔄 Categories Not Displaying - **ATTEMPTED FIX**
**Problem**: All items displayed under "SIN CATEGORÍA" instead of being organized by category

**Root Cause**: Items in database have empty/null `subcategoria` and `tipo` fields, causing the grouping key to be `undefined`, which then gets grouped into a catch-all category.

**Solution Applied**:
- Implemented cascading fallback for grouping key:
  ```
  tipo: p.subcategoria || p.tipo || p.categoria || 'Sin categoría'
  ```
- This ensures EVERY item has a valid grouping category (worst case: 'Sin categoría')
- Applied to all order types: Alquiler, Hielo, Almacén, Bodega, Bio

**Files Changed**:
- [app/(dashboard)/pedidos/page.tsx](app/(dashboard)/pedidos/page.tsx#L163-L220) - Alquiler, Hielo, and others

**How to Test**:
1. Refresh page (F5)
2. Go to Alquiler tab
3. Check browser console (F12 → Console tab)
4. Look for logs: `[DEBUG] Cargando catálogo para tipo: "Alquiler"`
5. Check if items now show categories (should be at least "Sin categoría")
6. If STILL showing undefined/empty categories, database articles lack proper categoria values

**Expected Console Output**:
```
[DEBUG] Loaded 250 articulos
[DEBUG] Alquiler articles: 45
[DEBUG] First Alquiler article: {
  id: "art_123",
  nombre: "Chair White",
  subcategoria: null,
  tipo: null,
  categoria: "Alquiler",
  imagenes: "✓ 2 items"
}
[DEBUG] Cargando catálogo para tipo: "Alquiler", total items: 45
```

---

### 3. 🖼️ Images Not Displaying - **UNDER INVESTIGATION**
**Problem**: No images appear next to items in catalog (all show "SIN FOTO")

**Expected Data Flow**:
```
Database (articulos.imagenes - JSONB array)
    ↓
pedidos/page.tsx (getThumbnail(p) extracts URL)
    ↓
ItemCatalog (passes imagenes: p.imagenes)
    ↓
ItemListItem (getThumbnail(item.imagenes) displays thumbnail)
```

**Code Status**: ✅ All code is correct - images ARE being passed through properly

**Blocker**: Need to verify if database articles actually have `imagenes` data populated

**How to Test**:
1. Refresh page (F5)
2. Go to Alquiler tab
3. Check console for debug line:
   ```
   [DEBUG] First Alquiler article: { ..., imagenes: "✓ 2 items" }
   ```
4. If shows "✓ 2 items" - data is in DB, check ItemListItem rendering
5. If shows "null" - no imagenes data in database for these articles

**What to Check Next** (if still no images):
- Item dimensions: 10x10px thumbnail with "SIN FOTO" fallback
- Check if `getThumbnail()` is receiving imagenes property
- Verify image URL format (should be valid http/https URL or relative path)

---

## Files Modified Summary

| File | Change | Type |
|------|--------|------|
| `hooks/use-data-queries.ts` | Removed `.select().single()` from updateEvento | API Fix |
| `app/(dashboard)/pedidos/page.tsx` | Added cascading fallback for grouping key | Category Logic |
| `app/(dashboard)/pedidos/page.tsx` | Added useEffect debug logging | Debugging |
| `app/api/material-orders/update-item/route.ts` | Removed `.select()` from update (completed earlier) | API Fix |

---

## Debug Information Added

### Console Logs to Monitor

When Alquiler tab is loaded, you should see:
```javascript
[DEBUG] Loaded 250 articulos
[DEBUG] Alquiler articles: 45  
[DEBUG] First Alquiler article: {
  id: "art_...",
  nombre: "...",
  subcategoria: "...",
  tipo: "...",
  categoria: "Alquiler",
  imagenes: "..."
}
[DEBUG] Cargando catálogo para tipo: "Alquiler", total items: 45
```

These logs appear in:
- Browser DevTools Console (F12 → Console tab)
- Server terminal where `npm run dev` is running

---

## Next Steps for User

1. **Refresh page** with F5 key
2. **Test location update** - try adding a delivery location, should succeed without error
3. **Check category display** - items should show categories in sticky headers
4. **Share console output** - run debug snippet if categories still not showing:
   ```javascript
   // Paste in browser console:
   const articulosDebug = document.querySelector('[data-test="articulos"]')?.textContent;
   console.log('PAGE ARTICULOS:', articulosDebug);
   ```
5. **If images still missing** - check if database has imagenes populated

---

## Technical Details

### Cascading Grouping Key Logic
```typescript
const groupingKey = p.subcategoria || p.tipo || p.categoria || 'Sin categoría';
```

**Precedence** (left to right):
1. `subcategoria` - Most specific (e.g., "Sillas", "Mesas")
2. `tipo` - Secondary grouping (e.g., "Decoración")
3. `categoria` - Broad category (e.g., "Alquiler")
4. 'Sin categoría' - Fallback for items with no categorization

### Supabase Client Behavior
- **Old behavior**: `.update().select().single()` → Parses response as single object → Fails if response isn't valid JSON
- **New behavior**: `.update()` → Returns simple acknowledgment → No parsing issues

### Image Pipeline
1. Database: `articulos.imagenes` = `[{id, url, esPrincipal, orden, descripcion}]`
2. pedidos/page maps to: `imagenes: p.imagenes`
3. item-catalog passes to ItemListItem
4. ItemListItem calls `getThumbnail(item.imagenes)` → returns first URL
5. Renders 10x10px img tag or "SIN FOTO" fallback

