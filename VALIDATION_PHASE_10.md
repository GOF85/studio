# Phase 10 - UX Fixes & Recogida Info - Validation Guide

## Cambios Completados ✅

### 1. Fix Provider Display (campo nombre_comercial)
**Archivos modificados:**
- `components/pedidos/modals/new-pedido-modal.tsx` (línea 218)
- `components/pedidos/sub-pedido-card.tsx` (línea 282)

**Cambio:**
```typescript
// ANTES (INCORRECTO - camelCase)
{proveedor.nombreComercial || 'Sin nombre'}

// DESPUÉS (CORRECTO - snake_case)
{proveedor.nombre_comercial || 'Sin nombre'}
```

**Razón:** La base de datos retorna `nombre_comercial` (snake_case) pero los componentes buscaban `nombreComercial` (camelCase).

**Resultado esperado:** Ahora muestra "ALQUIEVENTS, S.L." en lugar de "Sin nombre"

---

### 2. Agregar Referencias Modal - UX Improvements
**Archivo:** `components/pedidos/modals/agregar-referencias-modal.tsx`

#### 2a. State para posición de imagen
```typescript
// Líneas 44-45: Agregado estado
const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
```

#### 2b. Header pegajoso (sticky)
```typescript
// Líneas 125-126: DialogHeader con posición sticky
<DialogContent ... showClose={false}>
  <DialogHeader className="sticky top-0 z-50 bg-white dark:bg-slate-950 pb-4">
```

**Cambios:**
- ✅ Ocultó el botón X (showClose={false})
- ✅ Header permanece visible al scrollear tabla
- ✅ Fondo blanco/oscuro evita transparencia

#### 2c. Hover solo en el nombre del item
```typescript
// Líneas 243-262: Movido desde TableRow a TableCell (description)
<TableCell 
  className="px-4 py-2 cursor-pointer"
  onMouseEnter={(e) => {
    if (item.imageUrl) {
      const rect = e.currentTarget.getBoundingClientRect();
      setImagePosition({ x: rect.right + 10, y: rect.top });
      setHoveredImageUrl(item.imageUrl);
    }
  }}
  onMouseLeave={() => {
    setHoveredImageUrl(null);
    setHoveredImageAlt('');
  }}
>
```

#### 2d. Imagen sigue al cursor
```typescript
// Líneas 308-321: Posición dinámica basada en cursor
<div 
  className="fixed z-[100] bg-white dark:bg-slate-900..."
  style={{
    left: `${imagePosition.x}px`,
    top: `${imagePosition.y}px`,
  }}
>
```

**Resultado esperado:**
- La imagen aparece junto al cursor cuando estás sobre el nombre del item
- No aparece cuando estás en otras columnas
- Se mueve dinámicamente al mover el mouse

---

### 3. SubPedidoCard - Mostrar Info de Recogida en Header
**Archivo:** `components/pedidos/sub-pedido-card.tsx`

#### Cambio en CardHeader (líneas 337-380)

**ANTES:**
```typescript
<div className="flex items-center gap-3 flex-wrap text-[10px]">
  <div className="flex items-center gap-1.5">
    <Calendar className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
    <span className="font-bold">
      {format(new Date(editMode ? editFecha : pedido.fecha_entrega), 'dd/MM/yyyy', { locale: es })}
    </span>
  </div>
  <div className="flex items-center gap-1.5">
    <MapPin className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
    <span className="font-medium">
      {editMode ? editLocalizacion : pedido.localizacion}
    </span>
  </div>
  <div className="text-muted-foreground">
    {editMode ? editSolicita : pedido.solicita}
  </div>
  <span className="text-[8px] text-muted-foreground">•</span>
  <span className="text-[9px] text-muted-foreground">
    {pedido.items.length} art. • {pedido.cantidad_unidades} ud.
  </span>
</div>
```

**DESPUÉS:**
```typescript
<div className="flex items-center gap-3 flex-wrap text-[10px]">
  {/* Entrega */}
  <div className="flex items-center gap-1.5">
    <span className="text-[9px] font-semibold text-blue-600">Ent:</span>
    <Calendar className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
    <span className="font-bold">
      {format(new Date(editMode ? editFecha : pedido.fecha_entrega), 'dd/MM', { locale: es })}
    </span>
  </div>
  <div className="flex items-center gap-1.5">
    <Clock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
    <span className="font-medium">
      {editMode ? editHora : pedido.hora_entrega || '—'}
    </span>
  </div>
  <div className="flex items-center gap-1.5">
    <MapPin className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
    <span className="font-medium text-[9px]">
      {editMode ? editLocalizacion : pedido.localizacion}
    </span>
  </div>

  {/* Separador visual */}
  <span className="text-[8px] text-muted-foreground">|</span>

  {/* Recogida (si existe) */}
  {((editMode && editFechaRecogida) || (!editMode && pedido.fecha_recogida)) && (
    <>
      <span className="text-[9px] font-semibold text-amber-600">Recog:</span>
      <Calendar className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
      <span className="font-bold">
        {format(new Date(editMode ? editFechaRecogida : pedido.fecha_recogida!), 'dd/MM', { locale: es })}
      </span>
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
        <span className="font-medium">
          {editMode ? editHoraRecogida : pedido.hora_recogida || '—'}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
        <span className="font-medium text-[9px]">
          {editMode ? editLugarRecogida : pedido.lugar_recogida || '—'}
        </span>
      </div>
    </>
  )}

  <span className="text-[8px] text-muted-foreground">•</span>
  <span className="text-[9px] text-muted-foreground">
    {pedido.items.length} art. • {pedido.cantidad_unidades} ud.
  </span>
</div>
```

**Cambios clave:**
- ✅ Ahora muestra hora de entrega (antes no aparecía)
- ✅ Agregó sección de Recogida que solo aparece si existe `fecha_recogida`
- ✅ Usa color azul para entrega, ámbar para recogida (diferenciación visual)
- ✅ Formato de fecha más compacto: `dd/MM` en lugar de `dd/MM/yyyy` para ahorrar espacio
- ✅ Etiquetas "Ent:" y "Recog:" para claridad

**Resultado esperado:**
```
Ent: 📅 12/01 🕐 10:00 📍 Sala | Recog: 📅 13/01 🕐 15:00 📍 Instalaciones • 5 art. • 12 ud.
```

---

## Guía de Validación

### ✅ Test 1: Provider Display
1. Navega a `/alquiler`
2. Haz clic en "Crear Sub-Pedido"
3. **Esperado:** Selector de Proveedor muestra "ALQUIEVENTS, S.L." (no "Sin nombre")
4. **Si falla:** Verifica que `components/pedidos/modals/new-pedido-modal.tsx` línea 218 tenga `proveedor.nombre_comercial`

---

### ✅ Test 2: Agregar Referencias Modal UX
1. En Sub-Pedido, haz clic en "Agregar"
2. Se abre modal con tabla de referencias

**Test 2a - Header sticky:**
- Scrollea la tabla hacia abajo
- **Esperado:** El header con "Agregar referencias" permanece visible y pegado arriba
- **Si falla:** Verifica que `DialogHeader` tenga clase `sticky top-0 z-50`

**Test 2b - Hover en nombre solo:**
- Coloca mouse sobre una fila en cualquier lado
- **Esperado:** No aparece imagen
- Coloca mouse específicamente sobre el nombre/descripción del item
- **Esperado:** Aparece imagen a la derecha del mouse
- **Si falla:** Verifica que `onMouseEnter` esté en `TableCell` (description), no en `TableRow`

**Test 2c - Imagen sigue cursor:**
- Mueve el mouse lentamente sobre el nombre
- **Esperado:** La imagen se mueve dinámicamente junto al cursor
- **Si falla:** Verifica que `style={{ left: \`${imagePosition.x}px\`, top: \`${imagePosition.y}px\` }}`

**Test 2d - Sin botón X:**
- Observa el modal
- **Esperado:** No hay botón X en la esquina superior derecha
- **Si falla:** Verifica que `DialogContent` tenga `showClose={false}`

---

### ✅ Test 3: SubPedidoCard Header con Recogida
1. Navega a un Sub-Pedido existente
2. Observa el header de la card

**Resultado esperado:**
```
Ent: 📅 12/01 🕐 10:00 📍 Sala | Recog: 📅 13/01 🕐 15:00 📍 Instalaciones • 5 art. • 12 ud.
```

**Si no ves "Recog:":**
- El sub-pedido no tiene fecha de recogida configurada
- Haz clic en la card para expandir
- En la sección de edición, completa los campos de Recogida
- Haz clic en "Guardar"
- **Esperado:** Ahora aparece "Recog:" en el header

**Colores esperados:**
- Entrega: Iconos azules (📅🕐📍)
- Recogida: Iconos ámbar (📅🕐📍)

---

### ✅ Test 4: End-to-End Complete
1. Crea Sub-Pedido nuevo (proveedor debe mostrar correctamente)
2. Haz clic en "Agregar"
3. Selecciona items (verifica imagen aparece al hover sobre nombre)
4. Haz clic en "Agregar X"
5. **CRÍTICO:** Sin refrescar la página, la card debe mostrar los items inmediatamente
6. Si tienes recogida, expande la card y configúrala
7. **Esperado:** Header muestra ambas fechas/horas/ubicaciones

---

## Troubleshooting

### Problema: Imagen no aparece en agregar-referencias
- ✅ Verifica que estés hovering sobre la columna "Descripción/Nombre"
- ✅ Verifica que el item tenga `imageUrl`

### Problema: Header de SubPedidoCard muy largo
- Esto es normal - se ajusta a una o dos líneas según el ancho de la pantalla
- Si necesita compactarse más, se pueden reducir aún más los espacios

### Problema: Datos no guardan después de Agregar
- Verificar que `useAgregarItemsAPedido` (línea 388 en use-pedidos-pendientes.ts) uses invalidation predicate
- Debería ser: `queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'pedidos-pendientes' })`

---

## Resumen de Archivos Modificados

| Archivo | Líneas | Cambios |
|---------|--------|---------|
| `components/pedidos/modals/new-pedido-modal.tsx` | 218 | `nombreComercial` → `nombre_comercial` |
| `components/pedidos/modals/agregar-referencias-modal.tsx` | 44-45, 125-126, 243-262, 308-321 | Añadidas imagePosition state, sticky header, hover restringido, posición dinámica |
| `components/pedidos/sub-pedido-card.tsx` | 282, 337-380 | `nombreComercial` → `nombre_comercial`, header con recogida info |

---

## Status de la Sesión

✅ **COMPLETADO:**
- [x] Provider display field fix
- [x] Modal image hover UX improvements
- [x] Modal header sticky positioning
- [x] SubPedidoCard recogida information display
- [x] TypeScript validation (sin errores)
- [x] Server compilation (exitosa)

🔄 **EN PROGRESO:**
- Testing de todos los cambios

⏳ **PRÓXIMOS PASOS:**
- Ejecutar validación end-to-end completa
- Verificar que datos se guardan y actualizan correctamente
- Consolidar sub-pedidos y validar PDF
