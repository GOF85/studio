# 🔄 Relación de Queries: Alquiler ↔ CTA Explotación

## El Problema

Cuando un usuario borra un pedido en **Alquiler**, ese cambio **no se reflejaba en CTA Explotación** porque las queries eran independientes.

## La Solución: Query Invalidation Chain

```
┌─────────────────────────────────────────────────────────────┐
│ Usuario borra pedido en Alquiler                            │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
                  ┌──────────────────────┐
                  │ deleteEnviado.mutate │
                  │  mutateAsync()       │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────────────────┐
                  │ Supabase DELETE                  │
                  │ os_pedidos_enviados              │
                  │ WHERE id = X AND os_id = numero  │
                  └──────────┬───────────────────────┘
                             │
                             ▼
                  ┌──────────────────────────────────────────┐
                  │ onSuccess() → Query Invalidation         │
                  │                                          │
                  │ ✅ ['pedidos-enviados', osId]            │
                  │    ↑ Actualiza lista en Alquiler         │
                  │                                          │
                  │ ✅ ['materialOrders', osId]              │
                  │    ↑ Recalcula "Planificado" en CTA      │
                  └──────────┬───────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────────────────┐
                  │ React Query Auto-Refetch         │
                  └──────────┬───────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
  │ Alquiler    │    │ CTA Expl.    │    │ Otros módulos│
  │ UI Updates  │    │ Recalcula    │    │ Si aplica    │
  │ sin pedido  │    │ "Planificado"│    │              │
  └─────────────┘    └──────────────┘    └──────────────┘
```

## Flujo de Datos

### Query: `['pedidos-enviados', osId]`
- **Lectura**: Trae pedidos de `os_pedidos_enviados`
- **Ubicación**: Alquiler page (tarjeta "Pedidos Consolidados y Enviados")
- **Invalidado por**: Delete pedido → actualiza lista al instante

### Query: `['materialOrders', osId]`
- **Lectura**: Trae pedidos de material (alquiler, bodega, etc.)
- **Ubicación**: CTA Explotación (calcula "Planificado")
- **Invalidado por**: 
  - ✅ Delete pedido (ahora)
  - Delete pedido pendiente
  - Crear pedido
  - Actualizar sub-pedido

## Cómo Funciona el Recálculo

### En CTA Explotación:
```typescript
const { data: materialOrders } = useMaterialOrders(serviceOrder?.numero_expediente)

// Calcula:
const materialTotals = useMemo(() => {
  return materialOrders.reduce((acc, order) => {
    const type = order.type || 'Otros'  // 'Alquiler', 'Bodega', etc.
    acc[type] = (acc[type] || 0) + (order.total ?? 0)
    return acc
  }, {})
}, [materialOrders])  // ← Si materialOrders cambia, recalcula

// Usa esto en:
const costesBase = [
  {
    label: 'Alquiler',
    presupuesto: materialTotals['Alquiler'] || 0,
    cierre: getCierreCost('Alquiler', materialTotals['Alquiler'] || 0),
  },
  // ... más costes
]
```

### Cuando se invalida `['materialOrders', osId]`:
1. React Query detect cambio de query
2. Refetcha automáticamente los datos
3. `materialOrders` recibe nuevos datos (sin el pedido borrado)
4. `useMemo` en `materialTotals` recalcula
5. `processedCostes` se regenera
6. `rentabilidadData` recalcula todo
7. **UI se actualiza con los nuevos valores** ✅

## Queries Invalidadas Después de Delete Pedido

```typescript
// 1. Alquiler page se actualiza
queryClient.invalidateQueries({
  queryKey: ['pedidos-enviados'],        // Cualquier osId
});
queryClient.invalidateQueries({
  queryKey: ['pedidos-enviados', osId],  // Esta orden específicamente
});

// 2. CTA Explotación recalcula
queryClient.invalidateQueries({
  queryKey: ['materialOrders'],          // Cualquier osId
});
queryClient.invalidateQueries({
  queryKey: ['materialOrders', osId],    // Esta orden específicamente
});
```

## Casos de Uso

| Acción | Queries Invalidadas | Impacto |
|--------|-------------------|---------|
| **Delete pedido enviado** | `['pedidos-enviados', osId]`<br>`['materialOrders', osId]` | Alquiler: Desaparece<br>CTA: Recalcula "Planificado" |
| **Delete sub-pedido** | `['pedidos-pendientes', osId]`<br>`['materialOrders', osId]`<br>`['objetivo-gasto', osId]` | Alquiler: Desaparece<br>CTA: Recalcula todo |
| **Update sub-pedido** | `['pedidos-pendientes', osId]`<br>`['materialOrders', osId]`<br>`['objetivo-gasto', osId]` | Alquiler: Se actualiza<br>CTA: Recalcula |

## Debugging

Si algo **no se actualiza**:

1. **Abre DevTools** (F12)
2. **Network tab**: Verifica que se hace el DELETE
3. **Console**: Busca logs `[useDeletePedidoEnviado]`
4. **Application → Storage**: Revisa React Query cache
5. **Verifica que osId sea el mismo** en ambas páginas

```javascript
// En console, verifica:
localStorage.getItem('osId') // Debe ser consistente
```

## Lecciones Aprendidas

1. ✅ **Invalidar en el origen**: Cuando cambias datos en DB, invalida las queries que los usan
2. ✅ **Pensar en cadenas**: Un cambio puede afectar múltiples páginas
3. ✅ **Usar mismo formato**: Los queryKeys deben tener la misma estructura
4. ✅ **Logging**: Siempre log qué se invalida para debugging
5. ✅ **Test en ambos lados**: Verifica que cambios se reflejen en todas las partes de la app

