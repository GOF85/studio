# hojas_picking and hojas_retorno Table Structure Analysis

## Summary of Issues Found

### 1. FIELD NAME INCONSISTENCY - CRITICAL ISSUE

#### In `hooks/use-data-store.ts` (Lines 620-650):
- **Expects**: `evento_id` field
```typescript
mappedPickingSheets[p.evento_id] = {
    id: p.id,
    osId: p.evento_id,  // <-- Uses p.evento_id
    items: p.items || [],
    status: p.estado,
    ...
}
```

#### In `hooks/use-data-queries.ts` (Lines 2876+):
- **Expects**: `os_id` field
```typescript
.from('hojas_picking')
.select('*')
.eq('os_id', osId)  // <-- Filters on os_id
```

#### In `hooks/use-material-module-data.ts` (Line 23):
- **Expects**: `os_id` field
```typescript
supabase.from('hojas_picking').select('*').eq('os_id', targetId)
```

---

## HOJAS_PICKING Table Structure

### Field Mapping Based on Code Analysis:

| Field | Expected Type | Usage Context | Location |
|-------|--------------|---|----------|
| `id` | string/UUID | Primary key, composite key | use-data-queries.ts:2990 |
| `os_id` OR `evento_id` | string | FK to eventos table, used for filtering | **INCONSISTENCY** |
| `estado` | string | Status field ('Pendiente', 'En Proceso', 'Listo') | use-data-store.ts:629 |
| `items` | array/JSONB | Material items with details | use-data-queries.ts:2969 |
| `data` | JSONB | Extra data container | use-data-queries.ts:2990 |
| `checkedItems` | array | Items marked as picked | use-data-queries.ts:2994 |
| `updated_at` | timestamp | Audit field | use-data-queries.ts:3023 |

### Where Used:
- **Table Name**: `hojas_picking`
- **Type Definition**: `PickingSheet` in [types/index.ts](types/index.ts#L953)
- **Primary Hook**: `usePickingSheets()` in [hooks/use-data-queries.ts](hooks/use-data-queries.ts#L2876)
- **Data Store**: [hooks/use-data-store.ts](hooks/use-data-store.ts#L620)

### Data Structure (from useUpdatePickingSheet):
```typescript
{
  id: string,                    // Primary key
  os_id: string,                 // Foreign key to eventos (UUID or numero_expediente)
  estado: string,                // 'Pendiente' | 'En Proceso' | 'Listo'
  items: OrderItem[],            // Array of material items
  data: {                         // JSONB column
    fecha?: string,
    fechaNecesidad?: string,
    itemStates?: Record<string, PickingItemState>,
    checkedItems?: string[],
    solicita?: 'Sala' | 'Cocina'
  },
  updated_at?: timestamp
}
```

---

## HOJAS_RETORNO Table Structure

### Field Mapping Based on Code Analysis:

| Field | Expected Type | Usage Context | Location |
|-------|--------------|---|----------|
| `id` | string/UUID | Primary key | use-data-queries.ts:3172 |
| `os_id` OR `evento_id` | string | FK to eventos table | **INCONSISTENCY** |
| `data` | JSONB | Holds items, status, and itemStates | use-data-queries.ts:3173 |
| `updated_at` | timestamp | Audit field | use-data-queries.ts:3219 |

### Where Used:
- **Table Name**: `hojas_retorno`
- **Type Definition**: `ReturnSheet` in [types/index.ts](types/index.ts#L970)
- **Primary Hook**: `useReturnSheets()` in [hooks/use-data-queries.ts](hooks/use-data-queries.ts#L3079)
- **Data Store**: [hooks/use-data-store.ts](hooks/use-data-store.ts#L635)

### Data Structure (from useUpdateReturnSheet):
```typescript
{
  id: string,                    // Primary key (osId)
  os_id: string,                 // Foreign key to eventos (UUID or numero_expediente)
  data: {                         // JSONB column
    items: OrderItem[],          // Items with sentQuantity and orderId
    status: string,              // 'Pendiente' | 'Procesando' | 'Completado'
    itemStates: Record<string, ReturnItemState>  // Key: `${orderId}_${itemCode}`
  },
  updated_at?: timestamp
}
```

---

## Critical Issues & 400 Bad Request Root Causes

### Issue #1: Field Name Inconsistency (MAIN ISSUE)
- **Location**: [hooks/use-data-store.ts](hooks/use-data-store.ts#L623) vs [hooks/use-data-queries.ts](hooks/use-data-queries.ts#L2887)
- **Problem**: 
  - `use-data-store.ts` reads from `p.evento_id`
  - `use-data-queries.ts` filters by `os_id`
  - **Actual DB field may be either `os_id` or `evento_id`**
- **Impact**: 
  - If DB has `evento_id`, queries in use-data-queries.ts fail (400 Bad Request - invalid column)
  - If DB has `os_id`, use-data-store.ts mapping fails silently (creates entries with undefined osId)

### Issue #2: UPSERT Strategy Problem
- **Location**: [hooks/use-data-queries.ts](hooks/use-data-queries.ts#L3197) for ReturnSheets
- **Problem**: 
```typescript
.upsert({
    os_id: osId,           // May not be a valid field if DB uses evento_id
    data: newData,
    updated_at: new Date().toISOString()
})
```
- **Impact**: 400 Bad Request if field names don't match

### Issue #3: Missing Migration Files
- **Location**: No migration files found for creating these tables
- **Problem**: Tables may not exist or may have been created with different schema
- **Impact**: Cannot verify actual field names and types

### Issue #4: No Composite Key Strategy
- **Location**: [types/index.ts](types/index.ts#L955)
- **Problem**: Comment says `id: string; // Composite key: osId + fechaNecesidad` but code uses simple UUID
- **Impact**: Potential duplicate records or update conflicts

---

## Column Details from Code

### hojas_picking.items Structure:
```typescript
OrderItem & { type: MaterialOrderType }
// OrderItem has: id, code, name, quantity, unit, price, etc.
// MaterialOrderType: 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler'
```

### hojas_picking.data.itemStates Structure:
```typescript
Record<string, Omit<PickingItemState, 'itemCode'>>
// PickingItemState has: checked, location, etc.
```

### hojas_retorno.items Structure:
```typescript
OrderItem & { sentQuantity: number; orderId: string; type: MaterialOrderType }
```

### hojas_retorno.data.itemStates Structure:
```typescript
Record<string, ReturnItemState>
// ReturnItemState: { returnedQuantity, incidentComment?, isReviewed? }
// Key format: `${orderId}_${itemCode}`
```

---

## References in Code

### Direct References:
- [types/index.ts:953-979](types/index.ts#L953) - Type definitions
- [hooks/use-data-queries.ts:2876-3220](hooks/use-data-queries.ts#L2876) - Query hooks
- [hooks/use-data-store.ts:620-650](hooks/use-data-store.ts#L620) - Data store mapping
- [hooks/use-material-module-data.ts:22-24](hooks/use-material-module-data.ts#L22) - Material module queries
- [services/os-service.ts:87-88](services/os-service.ts#L87) - Used in deletion cascade
- [app/(dashboard)/bd/borrar-os/components/BorrarOsClient.tsx:59-60](app/(dashboard)/bd/borrar-os/components/BorrarOsClient.tsx#L59) - Metadata definition

### API Routes:
- No dedicated API routes found - all operations go through Supabase client directly

### Usage Pages:
- [app/(dashboard)/almacen/picking/page.tsx](app/(dashboard)/almacen/picking/page.tsx) - List page
- [app/(dashboard)/almacen/picking/[id]/page.tsx](app/(dashboard)/almacen/picking/[id]/page.tsx) - Detail page
- [app/(dashboard)/almacen/retornos/page.tsx](app/(dashboard)/almacen/retornos/page.tsx) - Returns list
- [app/(dashboard)/almacen/retornos/[id]/page.tsx](app/(dashboard)/almacen/retornos/[id]/page.tsx) - Returns detail

---

## Recommended Actions

1. **Verify actual table schema** in Supabase dashboard
2. **Check if field is `os_id` or `evento_id`** 
3. **Standardize field name across all code** (likely `os_id` based on naming patterns)
4. **Fix use-data-store.ts** mapping if needed
5. **Add migration file** to document the actual schema
6. **Implement proper RLS policies** for these tables
