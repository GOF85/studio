# DETAILED FINDINGS: hojas_picking and hojas_retorno Tables

## CRITICAL DISCOVERY: Tables May Not Exist in Database!

### Missing Migration Files
The `hojas_picking` and `hojas_retorno` tables are **referenced extensively in code** but have **NO migration files** creating them. The tables may not exist in Supabase, which would explain the 400 Bad Request errors.

---

## DEFINITIVE TABLE STRUCTURE (Based on Code Analysis)

### HOJAS_PICKING Table

#### Expected Database Schema:
```sql
CREATE TABLE IF NOT EXISTS hojas_picking (
    id TEXT PRIMARY KEY,                    -- Composite key or UUID
    os_id VARCHAR(255) NOT NULL,            -- Foreign key (can be UUID or numero_expediente)
    estado VARCHAR(50) DEFAULT 'Pendiente', -- 'Pendiente' | 'En Proceso' | 'Listo'
    items JSONB DEFAULT '[]'::jsonb,        -- Array of OrderItems with type field
    data JSONB DEFAULT '{}'::jsonb,         -- Extra data container
    checkedItems JSONB,                     -- Array of checked item IDs
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hojas_picking_os_id ON hojas_picking(os_id);
```

#### Where `data` JSONB Contains:
```json
{
  "fecha": "2025-01-10",
  "fechaNecesidad": "2025-01-10",
  "itemStates": {
    "item-key-1": { "checked": true, "location": "A-1", ... },
    "item-key-2": { "checked": false, ... }
  },
  "checkedItems": ["item-id-1", "item-id-2"],
  "solicita": "Sala" or "Cocina"
}
```

#### Field Breakdown:

| Field | Type | In DB Column | In JSONB data | Notes |
|-------|------|--------------|---------------|-------|
| id | string/UUID | ✅ Primary key | - | Composite key comment but uses simple UUID in practice |
| osId | string | ✅ os_id column | - | FK to eventos (UUID or numero_expediente) |
| status | string | ✅ estado column | - | 'Pendiente' \| 'En Proceso' \| 'Listo' |
| items | array | ✅ items column | - | `OrderItem[]` with MaterialOrderType |
| fechaNecesidad | string | ❌ - | ✅ data.fechaNecesidad | Date string |
| itemStates | object | ❌ - | ✅ data.itemStates | Keyed by item ID |
| checkedItems | array | ❌ - | ✅ data.checkedItems | Array of item IDs |
| solicita | string | ❌ - | ✅ data.solicita | 'Sala' \| 'Cocina' |

---

### HOJAS_RETORNO Table

#### Expected Database Schema:
```sql
CREATE TABLE IF NOT EXISTS hojas_retorno (
    id TEXT PRIMARY KEY,                      -- osId
    os_id VARCHAR(255) NOT NULL,              -- Foreign key (UUID or numero_expediente)
    data JSONB DEFAULT '{}'::jsonb,           -- All data stored here
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hojas_retorno_os_id ON hojas_retorno(os_id);
```

#### Where `data` JSONB Contains:
```json
{
  "items": [
    {
      "id": "item-id",
      "code": "ART-123",
      "name": "Article Name",
      "sentQuantity": 10,
      "returnedQuantity": 8,
      "orderId": "order-id",
      "type": "Almacen",
      "price": 15.50
    }
  ],
  "status": "Pendiente",
  "itemStates": {
    "order-id_ART-123": {
      "returnedQuantity": 8,
      "incidentComment": "Some items damaged",
      "isReviewed": true
    }
  }
}
```

#### Field Breakdown:

| Field | Type | In DB Column | In JSONB data | Notes |
|-------|------|--------------|---------------|-------|
| id | string | ✅ Primary key | - | Same as osId |
| osId | string | ✅ os_id column | - | FK to eventos |
| items | array | ❌ - | ✅ data.items | Items with sentQuantity + orderId |
| status | string | ❌ - | ✅ data.status | 'Pendiente' \| 'Procesando' \| 'Completado' |
| itemStates | object | ❌ - | ✅ data.itemStates | Key: `${orderId}_${itemCode}` |

---

## CODE LOCATIONS & FIELD USAGE

### 1. Type Definitions
**File**: [types/index.ts](types/index.ts#L953-L979)

```typescript
export type PickingSheet = {
    id: string;                 // Composite key: osId + fechaNecesidad
    osId: string;               // Foreign key to eventos
    fechaNecesidad: string;     // Date string
    items: (OrderItem & { type: MaterialOrderType })[];
    status: 'Pendiente' | 'En Proceso' | 'Listo';
    checkedItems?: string[];    // Array of checked item IDs
    itemStates?: Record<string, Omit<PickingItemState, 'itemCode'>>;
    os?: ServiceOrder;
    solicita?: 'Sala' | 'Cocina';
};

export type ReturnSheet = {
    id: string;                 // osId
    osId: string;               // Foreign key to eventos
    items: (OrderItem & { sentQuantity: number; orderId: string; type: MaterialOrderType; })[];
    status: 'Pendiente' | 'Procesando' | 'Completado';
    itemStates: Record<string, ReturnItemState>; // Key is `${orderId}_${itemCode}`
    os?: ServiceOrder;
};
```

### 2. Query Hooks (use-data-queries.ts)

#### usePickingSheets [Line 2876]
```typescript
.from('hojas_picking')
.select('*')
.eq('os_id', osId)              // Filters by os_id (UUID or numero_expediente)
```
**Reads**: id, os_id, estado, items, data, checkedItems, updated_at

#### usePickingSheet [Line 2970]
```typescript
.from('hojas_picking')
.select('*')
.eq('id', id)
.single()
```
**Then maps** data JSONB to PickingSheet properties

#### useUpdatePickingSheet [Line 3013]
```typescript
const updateData = {};
if (rest.status) updateData.estado = rest.status;
if (rest.items) updateData.items = rest.items;

const jsonbData = {};
if (rest.fechaNecesidad) jsonbData.fechaNecesidad = rest.fechaNecesidad;
if (rest.itemStates) jsonbData.itemStates = rest.itemStates;
if (rest.checkedItems) jsonbData.checkedItems = rest.checkedItems;
if (rest.solicita) jsonbData.solicita = rest.solicita;

updateData.data = jsonbData;  // Puts everything else in JSONB

.from('hojas_picking')
.update(updateData)
.eq('id', id)
```

#### useReturnSheets [Line 3079]
```typescript
.from('hojas_retorno')
.select('*')
.eq('os_id', osId)
```

#### useReturnSheet [Line 3161]
```typescript
.from('hojas_retorno')
.select('*')
.eq('os_id', osId)
.maybeSingle()
```

#### useUpdateReturnSheet [Line 3197]
```typescript
.from('hojas_retorno')
.upsert({
    os_id: osId,
    data: newData,
    updated_at: new Date().toISOString()
})
```

### 3. Data Store Mapping (use-data-store.ts)

#### Lines 620-632 (PROBLEMATIC - Uses evento_id instead of os_id!)
```typescript
(pickingSheetsDB || []).forEach((p: any) => {
    const data = p.data || {};
    mappedPickingSheets[p.evento_id] = {    // ⚠️ READS p.evento_id
        id: p.id,
        osId: p.evento_id,                   // ⚠️ MAPS to osId
        items: p.items || [],
        status: p.estado,
        fechaNecesidad: data.fecha || data.fechaNecesidad || '',
        itemStates: data.itemStates,
        checkedItems: data.checkedItems
    };
});
```

#### Lines 635-644 (PROBLEMATIC - Uses evento_id!)
```typescript
(returnSheetsDB || []).forEach((p: any) => {
    const data = p.data || {};
    mappedReturnSheets[p.evento_id] = {     // ⚠️ READS p.evento_id
        id: p.id,
        osId: p.evento_id,                   // ⚠️ MAPS to osId
        items: data.items || [],
        status: data.status || 'Pendiente',
        itemStates: data.itemStates || {}
    };
});
```

### 4. Material Module Data Hook (use-material-module-data.ts)

Line 23-24:
```typescript
supabase.from('hojas_picking').select('*').eq('os_id', targetId),  // ✅ Correct
supabase.from('hojas_retorno').select('*').eq('os_id', targetId),  // ✅ Correct
```

---

## ⚠️ CRITICAL INCONSISTENCY #1: Field Name Mismatch

**use-data-store.ts expects: `evento_id`**
```typescript
mappedPickingSheets[p.evento_id] = { osId: p.evento_id, ... }
```

**use-data-queries.ts uses: `os_id`**
```typescript
.eq('os_id', osId)
```

### Consequences:
- If DB has `os_id` ✅ use-data-queries works, use-data-store gets `undefined`
- If DB has `evento_id` ✅ use-data-store works, use-data-queries gets 400 Bad Request
- **Solution**: Standardize on `os_id` and fix use-data-store.ts

---

## ⚠️ CRITICAL INCONSISTENCY #2: Field Name Mismatch (Discovery)

Looking at other tables in the codebase, I found:
- `os_mermas` uses `os_id` ([use-material-module-data.ts](use-material-module-data.ts#L27))
- `os_devoluciones` uses `os_id` ([use-material-module-data.ts](use-material-module-data.ts#L28))
- Other tables consistently use `os_id` not `evento_id`

**use-data-store.ts appears to be WRONG** - it reads from other fields that use `os_id` but somehow expects `evento_id` for picking/return sheets. This is a copy-paste error!

**Evidence**: Look at line 604-608 in use-data-store.ts - same mapping for `pedidosMaterial`:
```typescript
(pedidosMaterialDB || []).forEach((p: any) => {
    const key = `${p.evento_id}-${p.categoria}`;
    
    // ... but pedidos_material also uses os_id!
```

All tables seem to have this same bug where use-data-store.ts uses `evento_id`.

---

## ⚠️ Critical Issue #3: No Composite Key Implementation

**Code comment** in [types/index.ts#L955](types/index.ts#L955):
```typescript
id: string; // Composite key: osId + fechaNecesidad
```

**But actual code** uses simple UUID and updates by id only.

**useUpdatePickingSheet** logic:
```typescript
.update(updateData)
.eq('id', id)  // Simple key, not composite
```

If multiple sheets exist for same osId+date, there will be conflicts!

---

## 🔴 ROOT CAUSE OF 400 BAD REQUEST ERRORS

### Most Likely Cause:
The tables **don't exist** or have been created **manually in Supabase** with a schema that doesn't match the code's expectations.

### Secondary Causes:

1. **Field name mismatch** (os_id vs evento_id)
   - Queries fail when column doesn't exist

2. **Upsert conflicts** in [useUpdateReturnSheet](hooks/use-data-queries.ts#L3197)
   - If `os_id` is not the right field name
   - Supabase upsert will fail: `{"code":"400","message":"column ... does not exist"}`

3. **Missing primary key definition**
   - Upsert requires proper key constraints

4. **RLS policies blocking access**
   - Table might exist but policies deny access

---

## API ROUTES & DATA MUTATION

### No dedicated API routes found
All operations go directly to Supabase:
- **Read**: `usePickingSheets()`, `useReturnSheets()`
- **Update**: `useUpdatePickingSheet()`, `useUpdateReturnSheet()`
- **Delete**: `useDeletePickingSheet()`
- **Upsert**: `useUpdateReturnSheet()` uses `.upsert()`

### Key operations:
1. **Update picking sheet status**: Changes `estado` column
2. **Update picking sheet data**: Merges into JSONB `data` column
3. **Upsert return sheet**: Creates or updates entire `data` JSONB

---

## DELETION CASCADE

File: [services/os-service.ts#L87-88](services/os-service.ts#L87)

Both tables are marked for deletion when an OS is deleted:
```typescript
const TABLES_WITH_OS_ID = [
    'hojas_picking',    // Deleted by os_id
    'hojas_retorno',    // Deleted by os_id
    // ...
];
```

Uses the pattern:
```typescript
const orExpr = `os_id.eq.${targetId},numero_expediente.eq.${id}`;
await supabase.from(table).delete().or(orExpr);
```

This assumes both `os_id` column exists and can be filtered.

---

## SUMMARY OF REQUIRED FIXES

### Immediate Actions:

1. ✅ **Verify tables exist in Supabase**
   - Check: Database > Tables in Supabase dashboard
   - If missing: Create them with provided SQL

2. ✅ **Verify field names**
   - Must have: `id`, `os_id`, `estado` (for picking), `data`
   - NOT `evento_id`

3. ✅ **Fix use-data-store.ts**
   - Change `p.evento_id` to `p.os_id` on lines 623, 638
   - Change mapping key from `p.evento_id` to `p.os_id`

4. ✅ **Verify JSONB structure**
   - `data` column should store extra fields
   - Primary fields (`id`, `os_id`, `estado`) in main columns

5. ✅ **Test upsert logic**
   - Ensure `os_id` is properly set in upsert
   - Add unique constraint on `os_id` for return sheets

6. ✅ **Add proper RLS policies**
   - Allow authenticated users to read/write
   - Consider multi-tenancy if needed

### Optional:

7. Create migration files to document schema
8. Add proper indexes on `os_id` and `id`
9. Add triggers for `updated_at` column

---

## RECOMMENDATIONS

### To immediately resolve 400 errors:

1. **Execute provided SQL** to create tables (see TABLE_CREATION.sql)
2. **Update use-data-store.ts** lines 623 and 638 to use `os_id` instead of `evento_id`
3. **Test** each mutation hook after changes
4. **Check browser DevTools** Network tab to see exact error response from Supabase

### Long-term improvements:

1. Add TypeScript strict type checking for DB columns
2. Create Supabase schema migrations
3. Add runtime validation of DB responses
4. Document table structures in code comments
5. Add Jest tests for data transformations
