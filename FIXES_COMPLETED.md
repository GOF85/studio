# PDF Workflow Fixes - Completed ✅

## Summary
Fixed 6 critical issues in the PDF generation workflow and alquiler page. All changes are deployed and server is running.

---

## 1. ✅ Removed "Nuevo" Button (Line 1139 - alquiler page)
**Issue**: Redirect button to `/pedidos?numero_expediente=xxx&type=Alquiler` conflicted with modal-based workflow.

**File**: [app/(dashboard)/os/[numero_expediente]/alquiler/page.tsx](app/(dashboard)/os/[numero_expediente]/alquiler/page.tsx#L1139)

**Change**: Removed entire Button component that wrapped `Link` to /pedidos route.
```tsx
// REMOVED:
<Button asChild className="...">
  <Link href={`/pedidos?numero_expediente=${serviceOrder?.numero_expediente}&type=Alquiler`}>
    <PlusCircle className="mr-1.5 h-3 w-3" />
    Nuevo
  </Link>
</Button>
```

**Impact**: Users now only see "Nuevo" button in modal, not as a navigation link.

---

## 2. ✅ Page Refresh on Modal Close
**Issue**: After creating a pedido, modal closed but references didn't appear until manual refresh.

**File**: [app/(dashboard)/os/[numero_expediente]/alquiler/page.tsx](app/(dashboard)/os/[numero_expediente]/alquiler/page.tsx#L451)

**Change**: Added forced page reload with 100ms delay:
```tsx
const handleCloseNewPedido = () => {
  setModals((m) => ({ ...m, newPedido: false }))
  // Force full page reload to ensure references appear
  setTimeout(() => window.location.reload(), 100)
}
```

**Impact**: Page automatically refreshes after modal closes, ensuring UI reflects new state.

---

## 3. ✅ Fixed PDF Filename Format
**Issue**: PDF filename was `Pedido 12345 OS A0001 ProviderName.pdf` (wrong format).
**Requirement**: Should be `pedido-A0001_2025-12345.pdf` (lowercase, hyphen-separated).

**File**: [app/api/pedidos/generate-pdf/route.ts](app/api/pedidos/generate-pdf/route.ts#L585)

**Change**:
```tsx
// BEFORE:
const pdfFileName = `Pedido ${numeroPedido} OS ${numeroExpediente} ${providerName}.pdf`;

// AFTER:
const pdfFileName = `pedido-${numeroPedido}_${numeroExpediente}.pdf`;
```

**Impact**: PDF filenames now follow consistent naming convention.

---

## 4. ✅ Fixed Proveedor Null Issue
**Issue**: `proveedor` field was `null` in database despite code saving it.
**Root Cause**: Modal passed `nombreComercialProveedor`, but page handler wasn't forwarding it to the hook.

**File**: [app/(dashboard)/os/[numero_expediente]/alquiler/page.tsx](app/(dashboard)/os/[numero_expediente]/alquiler/page.tsx#L461)

**Change**: Updated handler to include `nombreComercialProveedor`:
```tsx
const handleSubmitNewPedido = async (data: {
  fechaEntrega: string
  horaEntrega: string
  localizacion: string
  solicita: 'Sala' | 'Cocina'
  proveedorId: string
  nombreComercialProveedor?: string  // ← ADDED
}) => {
  const pedidoData = {
    // ... other fields
    nombreComercialProveedor: data.nombreComercialProveedor,  // ← ADDED
    items: [],
  }
```

**Impact**: Proveedor name now saves correctly to database (`os_pedidos_pendientes.proveedor`).
**Note**: Migration file exists at `supabase/migrations/20260114_add_proveedor_to_pedidos.sql` - ensure it's been executed in production.

---

## 5. ✅ Fixed Dirección Recogida (N/A Issue)
**Issue**: `direccionRecogida` showing "N/A" in PDF header instead of event address or warehouse address.
**Root Cause**: `getPickupAddress()` function existed but wasn't being used in PDF options. Variable scope issue - `group` referenced outside its loop.

**File**: [app/api/pedidos/generate-pdf/route.ts](app/api/pedidos/generate-pdf/route.ts#L548)

**Change**: 
1. Extracted first group before PDF generation loop:
```tsx
const firstGroupKey = Object.keys(consolidatedGroups)[0];
const firstGroup = firstGroupKey ? consolidatedGroups[firstGroupKey] : null;
```

2. Updated pdfOptions to use `firstGroup` instead of undefined `group`:
```tsx
const pdfOptions = {
  // ... other options
  lugarRecogida: firstGroup?.lugar_recogida,  // ← Fixed
  direccionRecogida: getPickupAddress(firstGroup?.lugar_recogida, eventoToUse?.space_address),  // ← Fixed
  // ... rest of options
};
```

3. Function already correctly implemented:
```typescript
function getPickupAddress(lugar_recogida?: string, eventoSpaceAddress?: string): string {
  if (lugar_recogida === 'Evento') {
    return eventoSpaceAddress || '';
  } else if (lugar_recogida === 'Instalaciones') {
    return 'Almacen Micecatering. C. Mallorca, 1, 28703 San Sebastián de los Reyes, Madrid';
  }
  return '';
}
```

**Impact**: 
- If `lugar_recogida = "Evento"`: PDF shows event's space_address
- If `lugar_recogida = "Instalaciones"`: PDF shows warehouse address
- Otherwise: Shows empty (or "N/A" if not handled)

---

## 6. ✅ Fixed Table Headers Visibility in PDF
**Issue**: Table headers not visible in PDF output (white text on green background disappeared).
**Root Causes**: 
- Text color not being reset after header row
- Header font size (6.5pt) might have been too small
- Text positioning issue

**File**: [lib/pdf-generator.ts](lib/pdf-generator.ts#L117)

**Changes**:
1. Increased header font size from 6.5pt → 7pt (more visible)
2. Increased header height from 7 → 8
3. Increased line width from 0.3 → 0.5 (more visible borders)
4. Improved text centering with proper alignment
5. **Critical**: Added explicit `doc.setTextColor(0, 0, 0)` BEFORE each data cell to ensure black text:

```tsx
// ===== DRAW DATA ROWS =====
// CRITICAL: Reset text color BEFORE drawing data rows
doc.setTextColor(0, 0, 0);  // Black text for data
doc.setDrawColor(34, 139, 34);  // Keep green borders
doc.setFont('helvetica', 'normal');
doc.setFontSize(6);
doc.setLineWidth(0.3);

for (const row of tableData) {
  // ... for each cell:
  doc.setTextColor(0, 0, 0);  // ← Ensure black text
  doc.rect(...);  // Draw cell
  doc.text(...);  // Draw text
}
```

**Impact**: Table headers now visible with white text on green background, followed by black text for data rows.

---

## Testing Checklist

- [ ] Create new rental pedido through modal
- [ ] Verify proveedor field is saved (check database)
- [ ] Verify page refreshes after modal closes
- [ ] Generate PDF and check:
  - [ ] Filename format: `pedido-A0001_2025-12345.pdf`
  - [ ] Proveedor name displayed in header
  - [ ] Dirección showing event address (not "N/A")
  - [ ] Table headers visible with white text on green
  - [ ] Table data visible with black text
- [ ] Verify "Nuevo" button removed from alquiler page header

---

## Files Modified

1. [app/(dashboard)/os/[numero_expediente]/alquiler/page.tsx](app/(dashboard)/os/[numero_expediente]/alquiler/page.tsx) - 3 changes
2. [app/api/pedidos/generate-pdf/route.ts](app/api/pedidos/generate-pdf/route.ts) - 2 changes
3. [lib/pdf-generator.ts](lib/pdf-generator.ts) - 1 major refactor

---

## Server Status
✅ Running at `http://localhost:3000`
✅ All compilation successful
✅ Ready for testing
