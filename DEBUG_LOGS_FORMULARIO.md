# Debug Logs - Formulario de Artículos

## Cambios Realizados

### 1. **Corregido el Error Principal**
- ❌ REMOVIDO: Campo `imagenes` que no existe en la tabla Supabase
- ✅ Los datos ahora deberían guardarse correctamente

### 2. **Mejorados los Debug Logs**
El formulario ahora muestra logs detallados en este orden:

```
[FORM] Iniciando submit con datos: { nombre: ..., categoria: ..., tipo: ... }
[PACK] Precio coste calculado: X Items: Y
[SUPABASE] Datos a insertar: { ...objeto completo... }
[SUPABASE] Query completada en XXms
[SUCCESS] Artículo insertado: ID
```

### 3. **Optimizaciones de Velocidad**
- ✅ `useMemo` para búsqueda de producto ERP
- ✅ `useMemo` para función `calculatePrice`
- ✅ Select optimizado en carga de artículos ERP (solo campos necesarios)
- ✅ Logging de tiempos de carga ([PERF])

---

## Qué Verificar en la Consola del Navegador

### ✅ Si el formulario se guarda CORRECTAMENTE:
```
[FORM] Iniciando submit con datos: { nombre: 'Test', categoria: 'Bebidas', tipo: 'micecatering' }
[SUPABASE] Datos a insertar: { id: '...', nombre: 'Test', categoria: 'Bebidas', ... }
[SUPABASE] Query completada en 234.56ms
[SUCCESS] Artículo insertado: 550e8400-e29b-41d4-a716-446655440000
Toast: "Nuevo artículo añadido correctamente."
```

### ❌ Si hay ERROR en Supabase:
```
[FORM] Iniciando submit con datos: ...
[SUPABASE] Datos a insertar: ...
[SUPABASE] Query completada en XXXms
[ERROR] Error de Supabase: { 
  code: 'PGRST116',
  message: 'new row violates row-level security policy',
  details: '...'
}
Toast: "Error al guardar: new row violates row-level security policy"
```

---

## Tipos de Errores Esperados

### Error: "column 'imagenes' does not exist"
**✅ SOLUCIONADO** - Ya no enviamos este campo

### Error: "violates row-level security policy"
**Causa**: Permisos de Supabase
**Solución**: Revisar políticas RLS en la tabla `articulos`

### Error: "violates check constraint"
**Causa**: `tipo_articulo` debe ser 'micecatering' o 'entregas'
**Verificación**: El formulario valida esto en el schema Zod

### Error: "null value in column 'nombre' violates not-null constraint"
**Causa**: `nombre` o `categoria` están vacíos (debería prevenirse por validación)
**Verificación**: El schema requiere `min(1)` para ambos

---

## Métricas de Rendimiento

En la consola verás:
```
[PERF] Iniciando carga de artículos ERP...
[PERF] Artículos ERP cargados en 245.32ms: 1250
[PERF] Producto ERP encontrado: Cerveza Premium
```

---

## Pasos para Depurar

1. **Abre DevTools** (F12)
2. **Ve a Console**
3. **Rellena el formulario**
4. **Presiona Guardar**
5. **Lee los logs en este orden**:
   - `[FORM]` - Se lanzó el submit
   - `[SUPABASE]` - Datos que se enviaron
   - `[ERROR]` o `[SUCCESS]` - Resultado final

---

## Campos que Se Envían a Supabase

```javascript
{
  id: UUID,
  nombre: string,                    // OBLIGATORIO
  categoria: string,                 // OBLIGATORIO
  tipo_articulo: 'micecatering' | 'entregas',
  precio_venta: number,
  precio_alquiler: number,
  precio_reposicion: number,
  erp_id: string | null,
  producido_por_partner: boolean,
  es_habitual: boolean,
  stock_seguridad: number,
  unidad_venta: number,
  loc: string | null,
  pack: array,                       // Solo si tipo_articulo = 'entregas'
  alergenos: array,                  // Solo si categoria = 'gastronomía'
  doc_drive_url: string | null,
  iva: number,
  dpt_entregas: string | null,
  precio_venta_entregas: number | null,
  precio_venta_entregas_ifema: number | null,
  precio_coste: number | null,
  precio_coste_alquiler: number | null,
  precio_alquiler_ifema: number | null,
  precio_venta_ifema: number | null
}
```

---

## Próximos Pasos

1. Prueba el formulario con los logs mejorados
2. Comparte los logs de error si sigue sin funcionar
3. Verifica que la tabla Supabase tenga RLS correctamente configurado
