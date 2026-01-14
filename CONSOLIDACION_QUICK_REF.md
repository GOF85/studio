# 🎯 Consolidación de Sub-Pedidos - Quick Reference

## ¿Qué se hizo?

Usuario puede editar todos los campos de un sub-pedido y **guardar TODO en UNA SOLA VEZ**, en lugar de múltiples guardados.

## Antes ❌
```
Edita fecha ──→ 1 escritura BD + toast
Edita localización ──→ 1 escritura BD + toast
Cambia cantidad ──→ 1 escritura BD + toast
Cambia cantidad ──→ 1 escritura BD + toast
= 4+ ESCRITURAS + 4+ TOASTS 😫
```

## Ahora ✅
```
Edita fecha ──→ (sin cambios BD)
Edita localización ──→ (sin cambios BD)
Cambia cantidad ──→ (sin cambios BD)
Cambia cantidad ──→ (sin cambios BD)
Hace clic "Guardar" ──→ 1 ESCRITURA + 1 TOAST 🚀
```

## Archivos Clave

| Archivo | Tipo | Qué Hace |
|---------|------|----------|
| `hooks/use-update-subpedido-complete.ts` | 🆕 NUEVO | Hook con mutation consolidada |
| `components/pedidos/sub-pedido-card.tsx` | ✏️ EDIT | Implementa estado acumulativo |
| `app/.../alquiler/page.tsx` | ✏️ EDIT | Usa nuevo hook y callback |

## Cómo Funciona

### En SubPedidoCard:
```typescript
// Estado LOCAL (no dispara mutaciones)
const [editedItems, setEditedItems] = useState(pedido.items);
const [editFecha, setEditFecha] = useState(pedido.fecha_entrega);

// Al hacer cambios: actualiza SOLO estado local
const handleUpdateCantidad = (code, qty) => {
  setEditedItems(prev => ...); // Solo estado
};

// AL GUARDAR: consolida TODO y envía
const handleSaveAll = () => {
  onSaveComplete?.({
    fechaEntrega: editFecha,
    localizacion: editLocalizacion,
    items: editedItems,  // ← TODOS aquí
  });
};
```

### En AlquilerPage:
```typescript
// Nuevo handler
const handleSubPedidoSaveComplete = async (pedidoId, updates) => {
  await updateSubpedidoComplete.mutateAsync({
    pedidoId,
    osId: numeroExpediente,
    updates,  // TODOS los cambios
  });
};

// Pasar al componente
<SubPedidoCard
  onSaveComplete={(u) => handleSubPedidoSaveComplete(pedido.id, u)}
/>
```

## Ventajas

| Antes | Ahora |
|-------|-------|
| 4-6 escrituras | 1 escritura |
| 4-6 toasts | 1 toast |
| Lento | Rápido |
| Inconsistente | Atómico |
| CTA no actualiza automáticamente | CTA se actualiza automáticamente |

## Testing

1. ✅ Abre Alquiler
2. ✅ Expande un sub-pedido
3. ✅ Haz clic en Editar
4. ✅ Cambia MÚLTIPLES cosas (fecha, localización, cantidades)
5. ✅ **Observa que NO hay toasts intermedios**
6. ✅ Haz clic "Guardar"
7. ✅ Verifica:
   - 1 toast al final
   - Sub-pedido actualizado
   - CTA "Planificado" actualizado automáticamente

## Documentación

Para más detalles:
- 📖 `CONSOLIDACION_GUARDADO_SUBPEDIDO.md` - Explicación técnica
- 📖 `FLUJO_CONSOLIDACION_VISUAL.md` - Diagramas y flujos
- 📖 `RESUMEN_CONSOLIDACION_COMPLETO.md` - Resumen completo

## ¿Siguiente?

Cuando esté listo: **Mejora #2 - Indicadores Visuales para Edición**
- Border dashed en modo edición
- Icono animado
- Badge "En edición"

---

**Status**: ✅ COMPLETADO
**Server**: Corriendo sin errores (localhost:3002)

