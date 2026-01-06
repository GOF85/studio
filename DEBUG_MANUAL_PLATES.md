# Debug: Platos Manuales No Se Distinguen

## Problema Reportado
La tabla no distingue entre platos manuales (creados por el usuario) y platos del Book (recetas predefinidas).

## Cómo Debuggear

### 1. **Abre la Consola del Navegador** (F12 o Cmd+Opt+I)
- Ve a la pestaña "Console"
- Busca por `"Field ID:"` cuando hagas clic en cualquier plato

### 2. **Qué Buscar**
Cuando hagas clic en un plato, deberías ver en la consola algo como:
```
Field ID: manual-1704556800123 Is Manual: true
// ✅ Este es un plato MANUAL (creado por ti)

Field ID: 550e8400-e29b-41d4-a716-446655440000 Is Manual: false
// ❌ Este es un plato del BOOK (receta predefinida)
```

### 3. **Señales Visuales en la UI**
- **Platos Manuales** deben tener:
  - ⚠️ Icono AlertCircle (amarillo)
  - 🟡 Fondo amarillo semitransparente
  - Deben ser EDITABLES (al hacer clic se abre modal)

- **Platos Book** deben tener:
  - ❌ SIN icono
  - ❌ SIN fondo amarillo
  - ❌ NO deben ser editables (muestra mensaje de error)

## Puntos de Control en el Código

### Campo ID Storage
El ID se genera así:
```typescript
// Platos manuales en RecetaSelector
id: `manual-${Date.now()}`

// Platos del Book
id: receta.id (UUID de Supabase)
```

### Detección en SortableRow (Línea ~375)
```tsx
field.id?.toString().startsWith('manual-') 
// true = plato manual
// false = plato book
```

### Cargar del Formulario
Al cargar datos desde Supabase (`useGastronomyOrders`), verificar que:
1. El campo `id` se mantenga intacto
2. No se sobrescriba el ID al guardar
3. La estructura de datos en BD preserve el ID

## Pasos para Debug Detallado

### Test 1: Crear un Plato Manual
1. Abre la página de gastronomía
2. Haz clic en "Añadir Plato 🟠" (Menú General)
3. Rellena el formulario:
   - Nombre: "Plato Test Manual"
   - Categoría: Cualquiera
   - Precio: 5€
   - Alérgenos: Selecciona algunos
4. Haz clic en "Crear"
5. En la consola, busca `Field ID: manual-` (debe aparecer)

### Test 2: Agregar un Plato del Book
1. Haz clic en "Añadir Plato 🟠"
2. Busca una receta en el buscador
3. Haz clic en ella para seleccionar
4. En la consola, busca el UUID (no debe contener "manual-")

### Test 3: Verificar Persistencia
1. Crea un plato manual
2. Haz clic en "Guardar"
3. Recarga la página (F5)
4. El plato debe seguir siendo manual (mismo ID)
5. Verifica en la consola que el ID sigue siendo `manual-xxxxx`

## Hipótesis Posibles

### Hipótesis 1: ID No Se Guarda Correctamente
- **Síntoma**: Después de guardar y recargar, el plato pierde su identificación manual
- **Verificación**: Abre DevTools → Network → busca la request de guardado
- **Solución**: Revisar `onSubmit` para asegurar que el ID se envía correctamente

### Hipótesis 2: ID Se Sobrescribe al Cargar
- **Síntoma**: El ID no comienza con "manual-" después de guardar
- **Verificación**: En la consola, inmediatamente después de crear pero antes de guardar, ¿qué ID ves?
- **Solución**: Revisar el query de carga en `useGastronomyOrders`

### Hipótesis 3: Field ID Es Undefined/Null
- **Síntoma**: En la consola ves `Field ID: undefined` o el check falla
- **Verificación**: Abre DevTools → Console → inspecciona el objeto del field
- **Solución**: Asegurar que `field.id` siempre tiene un valor

## Checklist de Verificación

- [ ] En la consola aparecen los IDs cuando haces clic
- [ ] Los platos manuales tienen icono amarillo ⚠️
- [ ] Los platos manuales tienen fondo amarillo
- [ ] Al hacer clic en un plato manual se abre el modal de edición
- [ ] Al hacer clic en un plato book se muestra error "Solo puedes editar platos creados manualmente"
- [ ] Después de guardar y recargar, los manuales siguen siendo manuales
- [ ] Los IDs en BD están preservados correctamente

## Información Útil

### Archivos Relacionados
- [page.tsx](app/(dashboard)/os/[numero_expediente]/gastronomia/[briefingItemId]/page.tsx) - Línea 375 (detección)
- [receta-selector.tsx](components/os/gastronomia/receta-selector.tsx) - Generación de ID manual
- [edit-gastronomia-plate-modal.tsx](components/os/gastronomia/edit-gastronomia-plate-modal.tsx) - Modal de edición

### Queries Supabase
```sql
-- Verificar que los IDs se guardan en items
SELECT id, nombre FROM your_gastro_order_items LIMIT 10;
-- Buscar platos manuales (deben comenzar con "manual-")
```

### Console Commands
```javascript
// En la consola del navegador, verifica los items del formulario
// (si tienes acceso a React Query/Form Context)
document.querySelectorAll('[data-testid="plato-row"]').forEach(el => {
  console.log(el.getAttribute('data-id'))
})
```
