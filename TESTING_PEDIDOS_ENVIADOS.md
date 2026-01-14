# ⚡ Quick Start - Testing Pedidos Enviados

## El Problema Resuelto
- ❌ ~~Sub-pedidos desaparecen al consolidar~~ → ✅ SOLUCIONADO
- ❌ ~~No se crean registros en "Pedidos Consolidados"~~ → ✅ SOLUCIONADO
- ✅ **Causas**: 
  1. UUID/VARCHAR mismatch en filtros
  2. Hook resolvía UUID cuando no debería
  3. API no convertía UUID a numero_expediente
- ✅ **Corregido**: Conversión automática UUID ↔ numero_expediente

## Cómo Testear (3 minutos)

### 1. Reinicia el servidor
```bash
npm run dev
```

### 2. Abre browser DevTools
- F12 (Chrome/Edge/Firefox)
- Cmd+Option+I (Safari)
- Tab: Console

### 3. Ve al módulo Alquiler
- Navega a un OS con sub-pedidos
- Sección "Sub-Pedidos Pendientes"

### 4. Consolida sub-pedidos
1. Click "Enviar Sub-Pedidos"
2. Selecciona algunos
3. Click "Enviar"
4. Confirma

### 5. Verifica logs

**Frontend (DevTools Console):**
```
✅ [ALQUILER] Iniciando consolidación de pedidos
✅ [useGeneratePDFMulti] Iniciando mutación
✅ [useGeneratePDFMulti] osId recibido: ...
✅ [useGeneratePDFMulti] Llamando a /api/pedidos/generate-pdf
✅ [useGeneratePDFMulti] Respuesta recibida: {status: 200, ok: true}
✅ [useGeneratePDFMulti] ✅ Datos recibidos: {...}
```

**Backend Terminal (donde corre npm run dev):**
```
[PASO 1] Resolviendo osId...
   osId recibido: 8935afe1-...
   osId tipo: string - Es UUID? SÍ
   ℹ️ osId es UUID, buscando numero_expediente...
   ✅ numero_expediente encontrado: 2025-12345
   Final: numeroExpediente para tablas pedidos: 2025-12345

[PASO 2] Obteniendo pedidos pendientes seleccionados...
   Pedidos encontrados: 2

[PASO 5] Creando registros en os_pedidos_enviados...
   ✅ Creado exitosamente (ID: xxx-xxx-xxx)

[PASO 7] Eliminando pedidos pendientes...
   ✅ Eliminados 2 pedidos pendientes

✅ [ÉXITO] Generación de PDF completada
```

### 6. Verifica resultado
- Recarga la página: F5
- Sub-pedidos deben desaparecer del "Pendientes"
- Deben aparecer en "Pedidos Consolidados"

## Si Falla

### Error: "FK constraint violation"
- **Antigua respuesta**: Pasaba UUID directamente
- **Nuevo código**: Convierte UUID a numero_expediente
- **Solución**: Si aún ves error, revisa PASO 1 en logs
  - Debe mostrar "número_expediente encontrado"

### Error: "Error en respuesta"
- Ver el mensaje de error en logs
- Copiar el error completo
- Comparar con [FK_CONSTRAINT_FIX.md](FK_CONSTRAINT_FIX.md)

### No aparecen sub-pendientes
- Verificar que existe osId con datos
- Buscar en PASO 2 si encuentra pedidos

## Archivos Clave

```
📂 studio/
├── app/api/pedidos/generate-pdf/route.ts  ← API (CONVERTIDOR UUID)
├── hooks/use-pedidos-enviados.ts  ← Hook (SIN RESOLUCIÓN)
├── app/(dashboard)/os/[...]/alquiler/page.tsx  ← Handler
├── docs/
│   ├── FK_CONSTRAINT_FIX.md  ← Explicación técnica
│   ├── DEBUG_PEDIDOS_ENVIADOS.md  ← Guía completa
│   └── CAMBIOS_DEBUG_PEDIDOS.md  ← Cambios anteriores
└── TESTING_PEDIDOS_ENVIADOS.md  ← Este archivo
```

## La Solución En Una Línea

**Antes**: API recibía UUID, intentaba insertar UUID como numero_expediente ❌  
**Ahora**: API recibe UUID, lo convierte a numero_expediente, inserta correctamente ✅

---

**Duración esperada del test**: ~3 minutos  
**Éxito esperado**: Sub-pedidos en "Consolidados"  
**Signos de éxito**: PASO 1-7 completados sin ❌, FK error desaparece

## Cambios Realizados En Esta Sesión

1. **Hook (use-pedidos-enviados.ts)**:
   - Removida `resolveOsId()` innecesaria
   - Ahora pasa osId original al API

2. **API (generate-pdf/route.ts)**:
   - Agregada detección UUID automática
   - Agregada conversión UUID → numero_expediente
   - Conversión ocurre ANTES de usar en filtros

3. **Documentación**:
   - FK_CONSTRAINT_FIX.md (nuevo)
   - TESTING_PEDIDOS_ENVIADOS.md (actualizado)
   - DEBUG_PEDIDOS_ENVIADOS.md (previo)

