# 📝 Consolidación de Guardado de Sub-Pedidos

## 🎯 Objetivo

Reducir el número de escrituras a la base de datos cuando un usuario actualiza un sub-pedido. Antes, cada cambio (fecha, localización, cantidad de items) generaba una mutación separada. Ahora, el usuario puede editar TODOS los campos que desee y hacer clic en **"Guardar"** UNA SOLA VEZ para registrar todos los cambios en una única transacción.

## ✨ Cambios Realizados

### 1. **Nuevo Hook: `useUpdateSubpedidoComplete`** 
📄 File: `hooks/use-update-subpedido-complete.ts`

```typescript
export function useUpdateSubpedidoComplete() {
  return useMutation({
    mutationFn: async ({ pedidoId, osId, updates }: UpdateSubpedidoCompletePayload) => {
      const { error } = await supabase
        .from('os_material_orders')
        .update({
          ...(updates.fechaEntrega && { delivery_date: updates.fechaEntrega }),
          ...(updates.localizacion && { delivery_location: updates.localizacion }),
          ...(updates.solicita && { solicita: updates.solicita }),
          ...(updates.items && { items: updates.items }),
        })
        .eq('id', pedidoId);
      if (error) throw error;
      return pedidoId;
    },
    onSuccess: (_, { osId }) => {
      // Invalidar queries para recalcular todo automáticamente
      queryClient.invalidateQueries({ queryKey: ['pedidos-pendientes', osId] });
      queryClient.invalidateQueries({ queryKey: ['materialOrders', osId] });
      queryClient.invalidateQueries({ queryKey: ['objetivo-gasto', osId] });
      // Esto fuerza la actualización automática de "Planificado" en CTA
    },
  });
}
```

**Ventajas:**
- ✅ Una sola llamada `update()` para todos los cambios
- ✅ Invalidación de múltiples queries para recalcular CTA automáticamente
- ✅ Transacción atómica (todo éxito o todo falla)

### 2. **Actualización de SubPedidoCard**
📄 File: `components/pedidos/sub-pedido-card.tsx`

#### Props actualizadas:
```typescript
interface SubPedidoCardProps {
  pedido: PedidoPendiente;
  
  // NUEVO: Callback consolidado (recibe TODOS los cambios)
  onSaveComplete?: (updates: {
    fechaEntrega?: string;
    localizacion?: string;
    solicita?: 'Sala' | 'Cocina';
    items?: PedidoItem[];
  }) => void;
  
  // LEGACY: Callbacks anteriores (todavía soportados)
  onEdit?: (updates) => void;
  onAddReferencias: () => void;
  onUpdateItems?: (items: PedidoItem[]) => void;
  onDelete: () => void;
}
```

#### Cambios en el comportamiento:

**ANTES:**
```tsx
const handleUpdateCantidad = (itemCode: string, cantidad: number) => {
  // ❌ Mutaba inmediatamente
  onUpdateItems(pedido.items.map(item => 
    item.itemCode === itemCode ? { ...item, cantidad } : item
  ));
};

const handleSaveContext = () => {
  // ❌ Mutaba inmediatamente
  onEdit({ fechaEntrega, localizacion, solicita });
  setEditMode(false);
};
```

**AHORA:**
```tsx
// Estado para ACUMULAR cambios
const [editedItems, setEditedItems] = useState<PedidoItem[]>(pedido.items);
const [editFecha, setEditFecha] = useState(pedido.fecha_entrega);
const [editLocalizacion, setEditLocalizacion] = useState(pedido.localizacion);
const [editSolicita, setEditSolicita] = useState<'Sala' | 'Cocina'>(pedido.solicita);

// Handlers que SOLO actualizan estado local
const handleUpdateCantidad = (itemCode: string, cantidad: number) => {
  // ✅ Solo actualizar estado - SIN mutaciones
  setEditedItems(prev =>
    prev.map(item =>
      item.itemCode === itemCode ? { ...item, cantidad } : item
    )
  );
};

// UN SOLO guardado consolidado
const handleSaveAll = () => {
  if (onSaveComplete) {
    // ✅ NUEVO: Una sola llamada con TODOS los cambios
    onSaveComplete({
      fechaEntrega: editFecha,
      localizacion: editLocalizacion,
      solicita: editSolicita,
      items: editedItems,
    });
  } else if (onEdit && onUpdateItems) {
    // Legacy: Compatibilidad hacia atrás
    onEdit({ fechaEntrega, localizacion, solicita });
    onUpdateItems(editedItems);
  }
  setEditMode(false);
};

const handleCancelEdit = () => {
  // ✅ Revertir todos los cambios sin guardar
  setEditFecha(pedido.fecha_entrega);
  setEditLocalizacion(pedido.localizacion);
  setEditSolicita(pedido.solicita);
  setEditedItems(pedido.items);
  setEditMode(false);
};
```

**Flujo visual:**
```
Usuario entra en modo edición
         ↓
[Edita fecha, localización, items, cantidades...]
         ↓
[Estado local se va actualizando - SIN mutaciones]
         ↓
Usuario hace clic en "Guardar"
         ↓
handleSaveAll() → onSaveComplete() → useUpdateSubpedidoComplete()
         ↓
UNA SOLA transacción a BD
         ↓
Query invalidation → CTA se recalcula automáticamente
```

### 3. **Actualización de AlquilerPage**
📄 File: `app/(dashboard)/os/[numero_expediente]/alquiler/page.tsx`

#### Imports:
```typescript
import { useUpdateSubpedidoComplete } from '@/hooks/use-update-subpedido-complete'
```

#### Instantiación del hook:
```typescript
const updateSubpedidoComplete = useUpdateSubpedidoComplete()
```

#### Nuevo handler:
```typescript
const handleSubPedidoSaveComplete = async (
  pedidoId: string,
  updates: {
    fechaEntrega?: string;
    localizacion?: string;
    solicita?: 'Sala' | 'Cocina';
    items?: any[];
  }
) => {
  try {
    await updateSubpedidoComplete.mutateAsync({
      pedidoId,
      osId: numeroExpediente,
      updates,
    })
    toast({ 
      title: 'Sub-pedido guardado', 
      description: 'Todos los cambios se han registrado en una sola transacción' 
    })
  } catch (error) {
    toast({ 
      title: 'Error al guardar', 
      description: 'No se pudo guardar el sub-pedido',
      variant: 'destructive'
    })
  }
}
```

#### Actualización del componente SubPedidoCard:
```typescript
{allPedidosPendientes.map((pedido) => (
  <SubPedidoCard
    key={pedido.id}
    pedido={pedido}
    // ✅ NUEVO: Callback consolidado
    onSaveComplete={(updates) => handleSubPedidoSaveComplete(pedido.id, updates)}
    // Legacy (todavía soportados para compatibilidad)
    onEdit={(updates) => handleSubPedidoEdit(pedido.id, updates)}
    onAddReferencias={() => handleOpenAgregarReferencias(pedido.id)}
    onUpdateItems={(items) => handleSubPedidoUpdateItems(pedido.id, items)}
    onDelete={() => handleSubPedidoDelete(pedido.id)}
    isLoading={updatePedidoItems.isPending}
    availableLocations={availableLocations}
  />
))}
```

## 📊 Impacto

### Reducción de Escrituras:

**ANTES (Ejemplo: cambiar 3 campos + 5 items):**
```
Usuario edita:
- Fecha entrega → 1 mutación
- Localización → 1 mutación  
- Solicita → (parte de mismo onEdit)
- Cantidad item 1 → 1 mutación (+ todos los items)
- Cantidad item 2 → 1 mutación
- Cantidad item 3 → 1 mutación
- Cantidad item 4 → 1 mutación
- Cantidad item 5 → 1 mutación
────────────────────────────
TOTAL: 6+ escrituras a BD
```

**AHORA:**
```
Usuario edita:
- Fecha entrega → Se acumula en estado local
- Localización → Se acumula en estado local
- Solicita → Se acumula en estado local
- Cantidad item 1 → Se acumula en estado local
- Cantidad item 2 → Se acumula en estado local
- Cantidad item 3 → Se acumula en estado local
- Cantidad item 4 → Se acumula en estado local
- Cantidad item 5 → Se acumula en estado local

Usuario hace clic "Guardar"
────────────────────────────
TOTAL: 1 sola escritura a BD ✅
```

## 🔄 Actualización Automática de CTA

Cuando el usuario hace clic en "Guardar":

1. **`handleSubPedidoSaveComplete`** se ejecuta
2. **`updateSubpedidoComplete.mutateAsync()`** realiza la actualización
3. En `onSuccess()`, se invalidan 3 queries:
   - `['pedidos-pendientes', osId]` → Recarga lista de sub-pedidos
   - `['materialOrders', osId]` → Recalcula totales
   - `['objetivo-gasto', osId]` → **Recalcula "Planificado" en CTA** ✅
4. React Query refetcha automáticamente
5. La tarjeta "Planificado" en CTA se actualiza con los nuevos valores

## 🧪 Testing

Para verificar que funciona:

1. Abre una orden de alquiler
2. Haz clic en editar un sub-pedido
3. Cambia MÚLTIPLES campos:
   - Fecha de entrega
   - Localización
   - Cantidad de items
4. Observa que **NO hay toasts intermedios** (sin mutaciones inmediatas)
5. Haz clic en "Guardar"
6. ✅ Debería:
   - Mostrar 1 solo toast: "Sub-pedido guardado"
   - Actualizar automáticamente el "Planificado" en CTA
   - Todo guardado en 1 sola transacción

## 🔐 Backward Compatibility

El código sigue soportando los handlers legacy (`onEdit`, `onUpdateItems`) por si hay otros componentes que los usen:

```typescript
} else if (onEdit && onUpdateItems) {
  // Legacy: Compatibilidad hacia atrás
  onEdit({ fechaEntrega, localizacion, solicita });
  onUpdateItems(editedItems);
}
```

Esto permite una migración gradual si es necesario.

## 📚 Siguiente Paso: Mejora #2

Después de verificar que esto funciona correctamente:

**Mejora #2: Indicadores Visuales para Edición**
- Border dashed azul cuando `editMode === true`
- Icono de edición animado en la esquina
- Badge "En edición" bajo el header
- Tiempo estimado: 1.5 horas

## 🎯 Resumen Rápido

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Escrituras por cambio** | N escrituras (una por campo/items) | 1 escritura consolidada |
| **Toasts** | Múltiples (uno por cada mutación) | 1 único toast al final |
| **UX** | Usuario ve confirmaciones múltiples | Usuario ve 1 confirmación |
| **CTA Update** | Manual (requería refetch manual) | Automática (via query invalidation) |
| **Compatibilidad** | N/A | Backward compatible ✅ |

