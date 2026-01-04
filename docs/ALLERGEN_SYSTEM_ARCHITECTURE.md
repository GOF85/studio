# Allergen Menu System - Architecture & Implementation Guide

## System Overview

The Allergen Menu System enables independent management of regular and allergen-free catering menus. It's designed for the **Cocina (Kitchen)**, **Comercial (Sales)**, **Dirección (Management)**, and **Operaciones (Logistics)** teams with clear approval workflows and profitability tracking.

## Core Components

### 1. Data Model
**Location**: `/types/index.ts`

```typescript
type GastronomyOrder = {
  id: string                              // briefing item ID
  osId: string                            // OS/evento ID
  status: GastronomyOrderStatus           // Pendiente | En preparación | Listo | Incidencia
  items: GastronomyOrderItem[]            // Regular menu items
  total: number                           // Regular menu total
  
  // NEW ALLERGEN FIELDS
  asistentesAlergenos?: number            // PAX count for allergen menu
  itemsAlergenos?: GastronomyOrderItem[]  // Allergen menu items with aprobadoCocina flag
  totalAlergenos?: number                 // Allergen menu total
}

type GastronomyOrderItem = {
  id: string                              // Recipe ID
  type: 'item' | 'separator'
  nombre: string
  costeMateriaPrima?: number
  precioVenta?: number
  quantity?: number
  comentarios?: string
  
  // NEW ALLERGEN FIELDS
  alergenosDeclarados?: { id: string }[]  // Allergen IDs for this item
  aprobadoCocina?: boolean                // Cocina approval status
}
```

### 2. Allergen Constants
**Location**: `/lib/allergen-constants.ts`

12 standard allergens used across the system:
- Gluten, Huevos, Lácteos, Cacahuetes, Frutos secos, Pescado, Crustáceos, Soja, Mostaza, Apio, Sésamo, Moluscos

**Usage**:
```typescript
import { ALLERGEN_LIST, getAllergenInfo } from '@/lib/allergen-constants'

// Get allergen by ID
const gluten = getAllergenInfo('gluten') // { id, label, icon }

// List all allergens
ALLERGEN_LIST.forEach(a => console.log(a.label))
```

### 3. UI Components

#### AllergenInfoModal
**Location**: `/components/gastro/allergen-info-modal.tsx`
- Shows detailed allergen list for a specific dish
- Triggered by 🔴 badge or info icon
- Displays allergen icons and names
- Warning text about cross-contamination

#### CostBreakdownModal
**Location**: `/components/gastro/cost-breakdown-modal.tsx`
- Expandable "Desglose" button in GastroInfoBar
- Shows cost per PAX for regular vs allergen menus
- Displays total revenue comparison
- Combined totals at bottom

#### DualCompositionCards
**Location**: `/components/gastro/dual-composition-cards.tsx`
- Two independent cards: Regular (emerald) | Allergen (red)
- Responsive layout: stacks on mobile, side-by-side on desktop
- Shows card headers with action buttons
- Conditional rendering (allergen card only when PAX > 0)

#### AllergenStatusBadge
**Location**: `/components/gastro/allergen-status-badge.tsx`
- Quick visual status indicator
- Shows PAX count, item count, approval status
- Color-coded variants (default, secondary, outline)

### 4. Forms & Detail Page
**Location**: `/app/(dashboard)/os/[numero_expediente]/gastronomia/[briefingItemId]/page.tsx`

**Form Fields**:
```typescript
// Zod schema
{
  items: GastronomyOrderItem[]            // Regular menu items (with field array)
  status: 'Pendiente' | 'En preparación' | 'Listo' | 'Incidencia'
  asistentesAlergenos: number             // NEW: Allergen PAX input
  itemsAlergenos: GastronomyOrderItem[]   // NEW: Allergen items (with field array)
}
```

**Key Features**:
- Allergen PAX input field (conditional display)
- Dual composition cards (regular & allergen)
- Separate drag-drop for each menu type
- Independent recipe selectors
- Approval checkboxes (✓ Aprobado Cocina) per allergen item
- Change detection with notifications
- Form saves both menus in single mutation

### 5. Hooks & Data Queries

#### useGastronomyOrderChanges
**Location**: `/hooks/use-gastronomy-order-changes.ts`
- Detects changes in allergen items (added, removed, modified)
- Debounced detection (default 1000ms)
- Toast notifications to notify kitchen
- Structured change metadata

**Usage**:
```typescript
useGastronomyOrderChanges(gastroOrder || null, {
  debounceMs: 1000,
  onChangeDetected: (changes) => {
    console.log(changes.itemsAdded, changes.allergenChanges)
  }
})
```

#### useUpdateGastronomyOrder
**Location**: `/hooks/use-briefing-data.ts`
- Extended mutation to handle allergen data
- Saves `asistentes_alergenos`, `items_alergenos`, `total_alergenos` to database
- Invalidates query cache on success

### 6. Reports & Analytics
**Location**: `/app/(dashboard)/os/[numero_expediente]/gastronomia/reportes/page.tsx`

**Dashboard Displays**:
- Revenue vs Costs (bar chart)
- Margin % comparison (regular vs allergen)
- Cost per PAX analysis
- Item count metrics
- Allergen demand insights
- Profitability comparison

## Workflow: From Entry to Approval

### 1. Entry (Commercial/Admin)
```
Commercial briefing → "Con gastronomía?" selected
                   → Detail page opened
                   → Enter allergen PAX count
                   → Select allergen items from recipes
```

### 2. Composition (Kitchen Preview)
```
Allergen items added → Items appear in red card
                    → Change notification sent
                    → Quantities and totals calculated
```

### 3. Approval (Kitchen)
```
Kitchen reviews items → ✓ Checkbox per item
                     → Once all approved
                     → Form saved with aprobadoCocina: true
```

### 4. Tracking (Management/Logistics)
```
Profitability reports → Revenue vs costs
                     → Margin analysis
                     → Allergen demand trends
```

## Database Schema

**Table**: `gastronomia_orders`

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| briefing_item_id | UUID | - | Links to commercial briefing item |
| os_id | UUID/VARCHAR | - | Links to OS/evento |
| status | VARCHAR | 'Pendiente' | Regular menu status |
| items | JSONB | [] | Regular menu composition |
| total | NUMERIC | 0 | Regular menu total cost |
| **asistentes_alergenos** | INTEGER | 0 | **NEW: Allergen PAX count** |
| **items_alergenos** | JSONB | [] | **NEW: Allergen menu items** |
| **total_alergenos** | NUMERIC | 0 | **NEW: Allergen menu total** |

**Migration**: `/supabase/migrations/20260104_add_allergen_fields.sql`

## Integration Points

### Main List Page
**Location**: `/app/(dashboard)/os/[numero_expediente]/gastronomia/page.tsx`
- GastroInfoBar now shows allergen PAX badge (+X 🔴)
- Cost breakdown modal accessible from header
- Change notifications trigger on modifications

### Profitability Dashboard
**Location**: `/app/(dashboard)/os/[numero_expediente]/gastronomia/reportes/page.tsx`
- Regular vs Allergen profitability comparison
- Margin % analysis
- Cost per PAX breakdown
- Demand insights

## Key Design Decisions

### ✅ Parallel, Not Sequential
- Regular and allergen menus are completely independent
- No shared items or forced dependencies
- Each can have different quantities, prices, compositions

### ✅ Single Document Storage
- One `gastronomia_orders` record per briefing item
- Arrays for items (`items` and `itemsAlergenos`)
- Easier to maintain consistency and backup

### ✅ Approval at Item Level
- `aprobadoCocina` flag on each allergen item
- Kitchen can approve items individually
- No separate approval workflow needed

### ✅ No Status Workflow for Allergens
- Allergen items don't have Pendiente/Preparación/Listo lifecycle
- Status applies only to main menu
- Allergens treated as a modifier to the main order

### ✅ Generic Allergen List
- Fixed list of 12 standard allergens
- No custom allergens per customer
- Simplifies validation and reporting

## Testing Recommendations

### Unit Tests
- [ ] Allergen constant validation
- [ ] Change detection accuracy
- [ ] Cost calculations

### Integration Tests
- [ ] Form save with allergen data
- [ ] Data persistence and reload
- [ ] Mutation handling

### E2E Tests
- [ ] Complete workflow (entry → approval → reports)
- [ ] Mobile responsiveness
- [ ] Notification triggers

### Manual Testing
- [ ] Add allergen items and approve
- [ ] Verify profitability reports
- [ ] Test on mobile/tablet
- [ ] Verify change notifications

## Future Enhancements

### Phase 2 (Planned)
- [ ] Client allergen declaration form
- [ ] Automated alerts to operations
- [ ] Kitchen prep zone tracking
- [ ] Recipe-level allergen mapping
- [ ] Audit/traceability logs

### Performance Optimizations
- [ ] Pagination for large item lists
- [ ] Debounced form saves
- [ ] Query result caching
- [ ] Virtualized lists

## Troubleshooting

### "Column does not exist" error
→ Run migration: `supabase db push`

### Allergen card not showing
→ Check that `asistentesAlergenos` is > 0 in form

### Change notification not appearing
→ Verify hook is imported and called in detail page

### Approval checkbox not saving
→ Ensure `aprobadoCocina` field is in form schema

---

**System Version**: 1.0.0  
**Last Updated**: 2026-01-04  
**Status**: Production Ready (after schema migration)
