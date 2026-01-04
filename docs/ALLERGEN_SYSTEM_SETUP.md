# Allergen Menu System - Setup & Deployment Guide

## Overview
Complete implementation of parallel allergen menu system for Studio catering platform. This enables kitchen teams to manage regular and allergen-free menus independently while tracking costs and approval status.

## Deployment Checklist

### 1. Apply Database Migration ✅
**Status**: Migration file created at `/supabase/migrations/20260104_add_allergen_fields.sql`

**To apply manually in Supabase:**
```bash
# Using Supabase CLI
supabase db push

# OR manually in Supabase dashboard:
# 1. Go to SQL Editor
# 2. Copy content from: supabase/migrations/20260104_add_allergen_fields.sql
# 3. Run the SQL
```

**Columns added:**
- `asistentes_alergenos` (INTEGER) - PAX count for allergen menu
- `items_alergenos` (JSONB) - Array of allergen menu items with approval status
- `total_alergenos` (NUMERIC) - Revenue total for allergen items

### 2. Code Changes Summary ✅
**Files created:**
- `/lib/allergen-constants.ts` - Allergen definitions (12 standard allergens)
- `/components/gastro/allergen-info-modal.tsx` - Allergen details dialog
- `/components/gastro/cost-breakdown-modal.tsx` - Cost analysis modal
- `/components/gastro/dual-composition-cards.tsx` - Dual card layout
- `/hooks/use-gastronomy-order-changes.ts` - Change detection hook
- `/app/(dashboard)/os/[numero_expediente]/gastronomia/reportes/page.tsx` - Profitability dashboard

**Files modified:**
- `/types/index.ts` - Extended GastronomyOrder type
- `/hooks/use-briefing-data.ts` - Updated useUpdateGastronomyOrder mutation
- `/app/(dashboard)/os/[numero_expediente]/gastronomia/[briefingItemId]/page.tsx` - Form extended with allergen fields

### 3. Frontend Form Features ✅
**Detail Page Enhancements:**
- Allergen PAX input field (number input)
- Dual composition cards (Regular | Allergen)
- Independent allergen items management:
  - Add allergen items via recipe selector
  - Drag-drop reordering
  - Quantity/price editing
  - **Approval checkbox** (✓ Aprobado Cocina) per item
- Change detection with toast notifications
- Cost breakdown modal showing regular vs allergen costs

### 4. Main List Page Updates ✅
**Gastronomía module main view:**
- GastroInfoBar displays allergen PAX badge (+X 🔴)
- Cost breakdown modal accessible from header
- Change notifications trigger on data modifications

### 5. Reports & Analytics ✅
**New profitability page:** `/gastronomia/reportes/`
- Revenue vs Costs comparison (bar chart)
- Margin % analysis (regular vs allergen)
- Cost per PAX breakdown
- Allergen demand insights
- Recharts visualizations

## Testing Checklist

### Form Functionality
- [ ] Allergen PAX input accepts numbers (0+)
- [ ] Allergen card only displays when PAX > 0
- [ ] Can add items to allergen menu via recipe selector
- [ ] Drag-drop reordering works for allergen items
- [ ] Quantity changes recalculate totals
- [ ] Approval checkbox toggles correctly
- [ ] Form saves with both regular + allergen items
- [ ] Change notification appears when items are modified

### Data Persistence
- [ ] Allergen data saves to database
- [ ] Page refresh loads allergen data correctly
- [ ] GastroInfoBar displays correct allergen PAX count
- [ ] Cost breakdown modal shows accurate figures

### Mobile Responsiveness
- [ ] Dual cards stack vertically on mobile
- [ ] Tables are scrollable on mobile
- [ ] Buttons don't truncate on small screens
- [ ] Allergen PAX input field is accessible
- [ ] Modal dialogs work on mobile viewports

### Analytics
- [ ] Profitability page loads data correctly
- [ ] Charts render without errors
- [ ] Margin calculations are accurate
- [ ] Allergen demand metrics display

## Known Limitations & Future Enhancements

### Current Implementation
✅ Parallel menu tracking (regular + allergen)
✅ Approval workflow (Cocina approval per item)
✅ Cost analysis and breakdown
✅ Profitability reports
✅ Change notifications

### Not Yet Implemented (Phase 2)
⏳ Client allergen declaration form
⏳ Specialized kitchen prep zones tracking
⏳ Automated allergen alerts to operations team
⏳ Recipe-level allergen mapping
⏳ Allergen traceability audit logs

## Troubleshooting

### Column Not Found Error
**Error**: `column "asistentes_alergenos" does not exist`
**Solution**: Run the migration at `/supabase/migrations/20260104_add_allergen_fields.sql`

### Form Validation Error
**Error**: `itemsAlergenos expected array`
**Solution**: Ensure migration was applied. Schema must include JSONB columns.

### Allergen Card Not Displaying
**Issue**: Allergen composition card not showing despite entering PAX
**Solution**: Check that form watch is updating `asistentesAlergenos` value in real-time

### Change Notifications Not Appearing
**Issue**: Toast notifications not showing when items change
**Solution**: Verify useGastronomyOrderChanges hook is imported and called in detail page

## Rollback Plan
If issues occur:
1. **Remove columns** (if migration caused issues):
```sql
ALTER TABLE gastronomia_orders
DROP COLUMN IF EXISTS asistentes_alergenos,
DROP COLUMN IF EXISTS items_alergenos,
DROP COLUMN IF EXISTS total_alergenos;
```

2. **Revert code changes**:
- Remove allergen fields from GastronomyOrder type
- Revert hooks/use-briefing-data.ts to previous version
- Simplify detail page form (remove allergen PAX input and dual cards)

## Support & Documentation
- Allergen constants: `/lib/allergen-constants.ts` (12 standard allergens)
- Type definitions: `/types/index.ts` (GastronomyOrder extended)
- Form validation: `/app/(dashboard)/os/[numero_expediente]/gastronomia/[briefingItemId]/page.tsx` (Zod schema)
- Reports: `/app/(dashboard)/os/[numero_expediente]/gastronomia/reportes/page.tsx`

---
**Deployment Date**: 2026-01-04
**Version**: 1.0.0
**Status**: Ready for Testing
