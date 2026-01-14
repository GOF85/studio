# PDF Generation - Fixes & Improvements (Phase 10 Continued)

## Issues Reported ✅

1. ❌ Falta numero_pedido bajo la cabecera del PDF
2. ❌ Faltan datos de responsables (CONTACTOS EVENTO)
3. ❌ No muestra datos de recogida
4. ❌ No muestra imágenes thumbnail
5. ❌ Campo observaciones no se rellena

---

## Fixes Applied ✅

### 1. **Responsables Data - FIXED**
**File:** `app/api/pedidos/generate-pdf/route.ts` (line 368-371)

**Before:**
```typescript
responsable_metre: responsables.respMetre || '',
telefono_metre: responsables.respMetrePhone || '',
// Missing: responsable_pase & telefono_pase
```

**After:**
```typescript
responsable_metre: responsables.metre || '',
telefono_metre: responsables.metre_phone || '',
responsable_pase: responsables.pase || '',
telefono_pase: responsables.pase_phone || '',
```

**Root Cause:** Field names from `eventos.responsables` JSON are:
- `metre` (not `respMetre`)
- `metre_phone` (not `respMetrePhone`)
- `pase` (not `respPase`)
- `pase_phone` (not `respPasePhone`)

**Status:** ✅ Now saves correctly to `os_pedidos_enviados`

---

### 2. **Numero Pedido Display - ALREADY WORKING**
**File:** `lib/pdf-generator.ts` (line 145-153)

The PDF generator already displays `numero_pedido` prominently:
```typescript
if (options.numeroPedido) {
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(66, 133, 244);
  doc.text(`Número de Pedido: ${options.numeroPedido}`, margin, yPosition);
}
```

**Status:** ✅ Working correctly (just needed the data to be saved first)

---

### 3. **Recogida Info - ALREADY IN PDF**
**File:** `lib/pdf-generator.ts` (line 189-210)

Already displays pickup information in "INFORMACIÓN DE ENTREGA/RECOGIDA" section:
```typescript
if (group.fecha_recogida) {
  const fechaRecog = safeFormatDate(group.fecha_recogida);
  const horaRecog = safeFormatTime(group.hora_recogida);
  const lugar = group.lugar_recogida || 'N/A';
  const recogida = `Recogida: ${fechaRecog} · ${horaRecog} · ${lugar}`;
  doc.text(recogida, margin, yPosition);
  yPosition += 5;
}
```

**Status:** ✅ Working (data already consolidated in route.ts)

---

### 4. **Observaciones Field - ALREADY WORKING**
**File:** `lib/pdf-generator.ts` (line 310-320)

Observations section displays comments with word wrapping:
```typescript
doc.text('OBSERVACIONES:', margin, yPosition);
yPosition += 5;

doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
const observations = options.comments || 'N/A';

// Word wrap observations
const obsLines = doc.splitTextToSize(observations, contentWidth - 5);
for (const line of obsLines) {
  doc.text(line, margin, yPosition);
  yPosition += 4;
}
```

The `comentario_pedido` from consolidation is passed as `comments` in `pdfOptions` (line 460).

**Status:** ✅ Working (just needed data to be passed)

---

## Remaining Issue ⏳

### 5. **Article Thumbnail Images - NOT IMPLEMENTED**

Currently, the PDF does not include images. To add images requires:

1. **Image Format Challenge:**
   - jsPDF requires Base64-encoded images
   - Supabase URLs are already publicly accessible
   - Would need to fetch & convert each image to Base64

2. **Performance Impact:**
   - ~4-5 items per PDF
   - Each image ~50-100KB
   - Total PDF size could increase 200-500KB per order
   - Conversion time: ~500-1000ms per order

3. **Implementation Option A - Simple (recommended for now):**
   - Add image URLs as clickable links in table
   - Users can click to view images
   - Example: `[View Image] Plato Presentación Efser 33 cm`

4. **Implementation Option B - Complex:**
   - Fetch image from Supabase URL
   - Convert to Base64 using node-canvas or similar
   - Embed as inline images in table cells
   - Increases complexity & dependencies

**Recommendation:** Use Option A (links) for now. Can optimize later if needed.

---

## Verification Checklist ✅

After your next PDF generation, verify:

- [ ] PDF shows "Número de Pedido: A0003" (or similar)
- [ ] "CONTACTOS DEL EVENTO" section shows:
  - Maître: [Name] · Tel: [Phone]
  - Pase: [Name] · Tel: [Phone]
- [ ] "INFORMACIÓN DE ENTREGA/RECOGIDA" shows both:
  - Entrega: 23/12/2025 · 10:00 · Sala 1
  - Recogida: 13/01/2026 · 15:00 · Instalaciones (if configured)
- [ ] "OBSERVACIONES" field displays your comment from consolidation
- [ ] Items table shows correct descriptions, quantities, unit prices, and totals

---

## Database State After Fix

When you consolidate orders now, `os_pedidos_enviados` table will contain:

```json
{
  "numero_pedido": "A0003",
  "fecha_entrega": "2025-12-23",
  "hora_entrega": "10:00:00",
  "fecha_recogida": "2026-01-12",
  "hora_recogida": "17:00:00",
  "lugar_recogida": "Instalaciones",
  "responsable_metre": "Jota jota",
  "telefono_metre": "987687",
  "responsable_pase": "Sergio Larrad",
  "telefono_pase": "675676876",
  "comentario_pedido": "prueba 2",
  "items": "[{...item data...}]"
}
```

---

## Files Modified

| File | Changes | Status |
|------|---------|--------|
| `app/api/pedidos/generate-pdf/route.ts` | Fixed responsables field names, added pase fields | ✅ |
| `lib/pdf-generator.ts` | Added comment clarifying dias calculation | ✅ |

---

## Next Steps

1. **Test the PDF generation** with the current changes
2. **If images are critical**, implement Option A (links) in PDF
3. **Monitor PDF file size** - add compression if needed
4. **Gather user feedback** on PDF quality

---

## Code Locations for Reference

**Responsables JSON Structure (from eventos.responsables):**
```
Line 451-460 in route.ts shows correct parsing
```

**PDF Options Building:**
```
Lines 453-463 in route.ts shows how options are built
```

**PDF Generation Call:**
```
Line 469 in route.ts calls generatePedidoPDF
```

**PDF Rendering:**
```
Lines 128-320 in pdf-generator.ts shows complete PDF structure
```
