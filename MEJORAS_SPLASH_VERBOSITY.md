# Mejoras de Verbosity del Splash Screen - Síncronización Factusol

**Commit**: `19d36e40`
**Fecha**: 2024
**Objetivo**: Resolver problema donde splash screen se quedaba colgado sin mostrar progreso

## Problemas Identificados

1. **Splash screen cuelga**: Cuando se iniciaba la sincronización, el splash se quedaba en pantalla sin mostrar progreso
2. **Logging insuficiente**: Solo se mostraban los últimos 10 logs, no era posible ver la historia completa
3. **Sin timeouts**: Si el endpoint se colgaba, el usuario debía esperar indefinidamente
4. **Updates secuenciales lentos**: 6100 artículos × 1 update cada uno = muy lento

## Soluciones Implementadas

### 1. Backend - API Endpoint (`/app/api/factusol/sync-articulos/route.ts`)

#### Logging Mejorado

```typescript
// Antes
debugLog.push(`Procesados: ${updatedCount} actualizados + ${insertedCount} nuevos...`);

// Ahora
debugLog.push(`Procesando lote ${chunkNum}/${chunks.length} (${chunk.length} artículos)...`);
debugLog.push(`  → ${toUpdate.length} a actualizar, ${toInsert.length} nuevos`);
debugLog.push(`  ⏳ Actualizando ${toUpdate.length} artículos (en paralelo)...`);
debugLog.push(`    ✓ ${toUpdate.length - updateErrors}/${toUpdate.length} actualizados correctamente`);
```

Ahora el usuario puede ver:
- Número de lote actual y total
- Cuántos artículos a actualizar vs insertar en cada lote
- Progreso de actualizaciones
- Contador de éxitos y errores

#### Updates Paralelizados (🚀 CRITICAL FIX)

```typescript
// Antes: Loop secuencial
for (let i = 0; i < toUpdate.length; i++) {
    const { error: updateError } = await supabase
        .from('articulos_erp')
        .update({...})
        .eq('erp_id', article.erp_id);  // 1 request al servidor por artículo
}
// Con 6100 artículos: 6100 requests secuenciales = LENTÍSIMO

// Ahora: Parallelizado
const updatePromises = toUpdate.map(async (article) => {
    return supabase
        .from('articulos_erp')
        .update({...})
        .eq('erp_id', article.erp_id);
});
const updateResults = await Promise.all(updatePromises);  // TODO en paralelo
// Con 6100 artículos: ~61 requests paralelos (chunks de 50) = MUCHO más rápido
```

**Impacto**: Si antes tomaba 10-15 minutos con updates secuenciales, ahora debería tomar 1-2 minutos.

#### Chunks Más Pequeños

```typescript
// Antes
const chunks = chunkArray(articulosToInsert, 100);

// Ahora
const chunks = chunkArray(articulosToInsert, 50);
```

Chunks más pequeños = más logging granular = el usuario ve actualizaciones más frecuentemente.

### 2. Frontend - Splash Screen (`/app/(dashboard)/bd/erp/page.tsx`)

#### Timeout Global y AbortController

```typescript
// Timeout de 15 minutos para toda la operación
const timeoutId = setTimeout(() => {
    setIsSyncing(false);
    toast({ title: 'Timeout', description: '...' });
}, 900000);

// AbortController para cancelar fetch después de 14 minutos
const controller = new AbortController();
const fetchTimeoutId = setTimeout(() => controller.abort(), 840000);

const response = await fetch('/api/factusol/sync-articulos', {
    method: 'POST',
    signal: controller.signal,
});
```

**Beneficio**: Si algo se cuelga, el usuario es notificado en lugar de esperar forever.

#### Logging Progresivo en Frontend

```typescript
// El usuario ahora ve:
setSyncLog(prev => [...prev, 'Iniciando sincronización...']);
setSyncLog(prev => [...prev, '⏳ Enviando petición al servidor...']);
setSyncLog(prev => [...prev, '⏳ Recibiendo respuesta del servidor...']);
setSyncLog(prev => [...prev, 'Recargando datos desde Supabase...']);
setSyncLog(prev => [...prev, `Cargados ${articulosData.length} artículos de Supabase`]);
setSyncLog(prev => [...prev, '✅ Sincronización completada exitosamente']);
```

#### Mejor Manejo de Errores

```typescript
// Diferencia entre timeout de fetch vs timeout global
if (error.name === 'AbortError') {
    errorMessage = 'La solicitud fue cancelada por timeout (14 minutos)';
}

// Validación de respuesta HTTP
if (!response.ok) {
    setSyncLog(prev => [...prev, `❌ Error HTTP ${response.status}: ${response.statusText}`]);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}
```

#### Terminal-Style Splash Screen

El splash ya estaba mejorado en versión anterior, pero ahora funciona mejor con:

```tsx
{/* Logs - Full verbose output */}
<div className="flex-1 px-6 py-4 overflow-y-auto font-mono text-xs 
                 bg-gray-900 text-green-400 rounded-none border">
    <div className="space-y-1">
        {syncLog.map((log, idx) => (
            <div key={idx}>
                <span className="text-gray-500">[{String(idx + 1).padStart(3, '0')}]</span> {log}
            </div>
        ))}
    </div>
</div>
```

**Características**:
- Muestra TODOS los logs (no solo últimos 10)
- Terminal style: fondo negro, texto verde, monospace
- Líneas numeradas [001], [002], etc.
- Auto-scroll al final
- Contador de logs
- Status detection (✅/❌/⏳)

## Prueba de Verificación

1. **Navega a** `/bd/erp`
2. **Haz clic en** "Sincronizar con Factusol"
3. **Deberías ver**:
   - Splash screen aparece INMEDIATAMENTE
   - Logs aparecen en tiempo real en el terminal
   - Primer log: "Iniciando sincronización..."
   - Logs de progreso cada ~5-10 segundos (un lote completado)
   - Si algo se cuelga por >15 minutos, ves un error de timeout

4. **Logs esperados**:
   ```
   [001] Iniciando sincronización...
   [002] ⏳ Enviando petición al servidor...
   [003] ⏳ Recibiendo respuesta del servidor...
   [004] Iniciando sincronización de Artículos (F_ART)...
   [005] Consultando F_ART en Factusol...
   [006] Tipo de respuesta: object
   [007] Es array: true
   [008] Longitud: 6100
   [009] Primera fila (muestra): {...}
   [010] Extrayendo familias...
   ...
   [050] Procesando lote 1/122 (50 artículos)...
   [051]   → 2000 a actualizar, 100 nuevos
   [052]   ⏳ Actualizando 2000 artículos (en paralelo)...
   [053]     ✓ 2000/2000 actualizados correctamente
   ...
   [500] ✅ Sincronización completada exitosamente
   ```

## Comparación de Rendimiento

| Métrica | Antes | Después |
|---------|-------|---------|
| Updates | Secuencial (1 por vez) | Paralelo (50 por lote) |
| Tiempo estimado | 10-15 min | 1-2 min |
| Logging | Últimos 10 logs | Todos los logs |
| Timeout | Sin timeout | 15 min global |
| Feedback visual | Cuelga sin info | Progreso en tiempo real |

## Cambios en Archivos

### `/app/api/factusol/sync-articulos/route.ts`
- ✅ Logging mejorado en loops de procesamiento
- ✅ Updates paralelizados con `Promise.all()`
- ✅ Chunks más pequeños (50 vs 100)
- ✅ Mejor reporte de errores por artículo

### `/app/(dashboard)/bd/erp/page.tsx`
- ✅ Timeout global de 15 minutos
- ✅ AbortController para fetch (14 minutos)
- ✅ Logging progresivo de fases (enviando, recibiendo, recargando)
- ✅ Mejor diferenciación de errores (HTTP vs AbortError vs otros)
- ✅ Logs de éxito intermedios

## Próximos Pasos (Optional)

Si la sincronización sigue siendo lenta después de esto:

1. **Medir velocidad real**: Ver tiempo en logs del servidor
2. **Usar bulk updates**: Si Supabase permite, usar RPC call para actualizar todo en 1 query
3. **Usar batch insert**: Ya implementado, pero podría optimizarse si es necesario
4. **Monitorar conexión Factusol**: Si la API de Factusol es lenta, eso no podemos optimizar

## Validación

```bash
# Ver que los cambios están en git
git log --oneline | head -3
# 19d36e40 feat: Mejorar verbosity del sync y paralelizar updates...
# 2a1b88f7 Deployment fix documentation and vercel json config
# c11d24d9 Add fix deployment guide...

# Ver que está en main
git branch -v
# * main 19d36e40 feat: Mejorar verbosity...

# Vercel debería estar desplegando ahora
# Puedes verificar en https://vercel.com/studio dashboard
```

