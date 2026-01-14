# 🔄 Flujo de Consolidación de Sub-Pedidos

## Diagrama de Flujo General

```
┌─────────────────────────────────────────────────────────────────────┐
│                     COMPONENTE SubPedidoCard                          │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ Modo Normal (no  │
    │ editando)        │
    └────────┬─────────┘
             │
             │ Usuario hace clic en Editar
             ▼
    ┌──────────────────────────────────────────────────────┐
    │ Modo Edición Activado                                │
    │ - setEditMode(true)                                  │
    │ - Estado local copia valores actuales                │
    │   const [editFecha, editLocalizacion, editItems]     │
    └────────┬─────────────────────────────────────────────┘
             │
             ├─────────┬──────────┬─────────────┐
             │         │          │             │
             ▼         ▼          ▼             ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ Usuario      │ │ Usuario  │ │ Usuario  │ │ Usuario  │
    │ cambia fecha │ │ cambia   │ │ cambia   │ │ cambia   │
    │ de entrega   │ │locali-   │ │ cantidad │ │ solicita │
    │              │ │zación    │ │ de items │ │ Sala/... │
    └──────┬───────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
           │               │            │            │
           ▼               ▼            ▼            ▼
    ┌────────────────────────────────────────────────────────┐
    │ Handlers LOCALES: SIN MUTACIONES INMEDIATAS           │
    │ - setEditFecha() → Solo actualiza estado local       │
    │ - setEditLocalizacion() → Solo estado local          │
    │ - setEditedItems() → Solo estado local               │
    │                                                       │
    │ ❌ NO se llama a onEdit()                           │
    │ ❌ NO se llama a onUpdateItems()                    │
    │ ✅ Solo se actualiza el estado local                │
    └────────┬───────────────────────────────────────────┘
             │
             │ (Usuario puede seguir editando sin limites)
             │
             ├─ OPCIÓN 1: Usuario hace clic "GUARDAR" ──────┐
             │                                                │
             └─ OPCIÓN 2: Usuario hace clic "CANCELAR" ──────┼──┐
                                                              │  │
                                                              │  ▼
                                                              │  setEditMode(false)
                                                              │  Revertir todos estados
                                                              │  No guardar nada ✅
                                                              │
                                                              ▼
                                                    ┌──────────────────────────┐
                                                    │ handleSaveAll()          │
                                                    │ - Consolida TODOS los    │
                                                    │   cambios acumulados     │
                                                    │ - Llama onSaveComplete() │
                                                    │   UNA SOLA VEZ           │
                                                    └──────────┬───────────────┘
                                                               │
                                                               ▼
                                        ┌─────────────────────────────────────┐
                                        │ handleSubPedidoSaveComplete()        │
                                        │ (en AlquilerPage)                    │
                                        └──────────────┬──────────────────────┘
                                                       │
                                                       ▼
                                        ┌─────────────────────────────────────┐
                                        │ updateSubpedidoComplete.mutateAsync()│
                                        │ - Parámetro: pedidoId                │
                                        │ - Parámetro: osId                    │
                                        │ - Parámetro: updates {               │
                                        │   fechaEntrega?, localizacion?,      │
                                        │   solicita?, items?                  │
                                        │ }                                    │
                                        └──────────────┬──────────────────────┘
                                                       │
                                                       ▼
                                        ┌─────────────────────────────────────┐
                                        │ Supabase Update (UNA SOLA vez)       │
                                        │                                      │
                                        │ .from('os_material_orders')          │
                                        │ .update({                            │
                                        │   ...(updates.fechaEntrega &&        │
                                        │     { delivery_date: ... }),         │
                                        │   ...(updates.localizacion &&        │
                                        │     { delivery_location: ... }),     │
                                        │   ...(updates.solicita &&            │
                                        │     { solicita: ... }),              │
                                        │   ...(updates.items &&               │
                                        │     { items: ... }),                 │
                                        │ })                                   │
                                        │ .eq('id', pedidoId)                  │
                                        │                                      │
                                        │ ✅ 1 TRANSACCIÓN ATÓMICA             │
                                        └──────────────┬──────────────────────┘
                                                       │
                                                       ▼
                                        ┌─────────────────────────────────────┐
                                        │ onSuccess() - Query Invalidation     │
                                        │                                      │
                                        │ 1️⃣  invalidateQueries({              │
                                        │     queryKey: ['pedidos-pedientes']  │
                                        │ })                                   │
                                        │                                      │
                                        │ 2️⃣  invalidateQueries({              │
                                        │     queryKey: ['materialOrders']     │
                                        │ })                                   │
                                        │                                      │
                                        │ 3️⃣  invalidateQueries({              │
                                        │     queryKey: ['objetivo-gasto'] ← Recalcula CTA!
                                        │ })                                   │
                                        └──────────────┬──────────────────────┘
                                                       │
                                                       ▼
                                        ┌─────────────────────────────────────┐
                                        │ React Query Auto-Refetch             │
                                        │                                      │
                                        │ Automáticamente refetcha las 3 queries
                                        │ Actualiza UI con nuevos datos        │
                                        └──────────────┬──────────────────────┘
                                                       │
                                                       ▼
                                        ┌─────────────────────────────────────┐
                                        │ toast({                              │
                                        │   title: 'Sub-pedido guardado',      │
                                        │   description: 'Cambios registrados' │
                                        │ })                                   │
                                        │                                      │
                                        │ ✅ UNA SOLA NOTIFICACIÓN            │
                                        └──────────────┬──────────────────────┘
                                                       │
                                                       ▼
                                        ┌─────────────────────────────────────┐
                                        │ setEditMode(false)                   │
                                        │ Cerrar modo edición                  │
                                        └─────────────────────────────────────┘
```

## Comparativa: Antes vs Después

### ANTES (❌ Múltiples Mutaciones)

```
┌─ Estado Global (Sub-Pedido en BD) ─┐
│                                     │
│  fecha: "2025-01-15"               │
│  localizacion: "SALA A"            │
│  items: [5, 10, 3, ...]            │
│                                     │
└─────────────────────────────────────┘

USUARIO EDITA:

1️⃣  Cambia fecha → "2025-01-20"
    onEdit({ fechaEntrega: "2025-01-20" })
    ↓ Mutation 1 → BD Update ❌
    ↓ toast: "Fecha actualizada"

2️⃣  Cambia localización → "SALA B"
    onEdit({ localizacion: "SALA B" })
    ↓ Mutation 2 → BD Update ❌
    ↓ toast: "Localización actualizada"

3️⃣  Cambia cantidad item 1 → 8
    onUpdateItems([8, 10, 3, ...])
    ↓ Mutation 3 → BD Update ❌
    ↓ toast: "Items actualizados"

4️⃣  Cambia cantidad item 2 → 15
    onUpdateItems([8, 15, 3, ...])
    ↓ Mutation 4 → BD Update ❌
    ↓ toast: "Items actualizados"

RESULTADO: 4+ ESCRITURAS, 4+ TOASTS ❌
```

### AHORA (✅ Una Única Mutación Consolidada)

```
┌─ Estado Local (Acumulativo) ──┐    ┌─ Estado Global (BD) ──────────┐
│                               │    │                               │
│ editFecha: "2025-01-20"      │    │ fecha: "2025-01-15"          │
│ editLocalizacion: "SALA B"   │    │ localizacion: "SALA A"       │
│ editItems: [8, 15, 3, ...] │    │ items: [5, 10, 3, ...]       │
│                               │    │                               │
└───────────────────────────────┘    └───────────────────────────────┘

USUARIO EDITA:

1️⃣  Cambia fecha → "2025-01-20"
    setEditFecha() → Estado local ✅ (SIN mutación)

2️⃣  Cambia localización → "SALA B"
    setEditLocalizacion() → Estado local ✅ (SIN mutación)

3️⃣  Cambia cantidad item 1 → 8
    setEditedItems() → Estado local ✅ (SIN mutación)

4️⃣  Cambia cantidad item 2 → 15
    setEditedItems() → Estado local ✅ (SIN mutación)

5️⃣  Usuario hace clic "GUARDAR"
    
    handleSaveAll() →
    onSaveComplete({
      fechaEntrega: "2025-01-20",
      localizacion: "SALA B",
      items: [8, 15, 3, ...]
    })
    
    ↓ UNA SOLA Mutation → BD Update ✅
    
    Supabase actualiza:
      delivery_date = "2025-01-20"
      delivery_location = "SALA B"
      items = [8, 15, 3, ...]
    
    ↓ onSuccess() invalida queries:
      - ['pedidos-pendientes', osId]
      - ['materialOrders', osId]
      - ['objetivo-gasto', osId] ← CTA se actualiza automáticamente
    
    ↓ toast: "Sub-pedido guardado"

RESULTADO: 1 ESCRITURA, 1 TOAST ✅
```

## Ventajas de la Consolidación

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Transacciones BD** | 4-6 | 1 ✅ |
| **Toasts mostrados** | 4-6 | 1 ✅ |
| **Consistencia** | Parcial (puede fallar una) | Atómica (todo o nada) ✅ |
| **Experiencia** | Múltiples confirmaciones | Una confirmación final ✅ |
| **Performance** | Múltiples roundtrips | 1 roundtrip ✅ |
| **CTA Update** | Manual | Automática ✅ |

## Estados y Transiciones

```
[NORMAL] 
  ↓ (Click Editar)
[EDITANDO]
  ├─ (Click Cancelar) ↘ Revertir cambios
  │                     ↓
  │                   [NORMAL]
  │
  └─ (Edita campos...)
    ↓
[EDITANDO con cambios acumulados]
  ├─ (Click Guardar) ↘ Consolidar y enviar
  │                    ↓
  │                  [GUARDANDO]
  │                    ↓
  │                  [NORMAL con cambios reflejados]
  │
  └─ (Click Cancelar) ↘ Revertir cambios
                        ↓
                      [NORMAL]
```

