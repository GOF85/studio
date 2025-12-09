# Guía de Refactorización: Tablas Mobile-First

Esta guía explica cómo refactorizar tablas para implementar una experiencia mobile-first con tarjetas apiladas e infinite scroll.

## Componentes y Hooks Disponibles

### 1. `useInfiniteScroll` Hook
Ubicación: `hooks/use-infinite-scroll.ts`

Hook para implementar infinite scroll usando IntersectionObserver. Compatible con `useInfiniteQuery` de TanStack Query.

**Uso:**
```typescript
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';

const sentinelRef = useInfiniteScroll({
  fetchNextPage: () => {
    // Lógica para cargar más datos
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  },
  hasNextPage: currentPage < totalPages,
  isFetchingNextPage: false,
  enabled: true,
});
```

### 2. `MobileTableView` Component
Ubicación: `components/ui/mobile-table-view.tsx`

Componente para renderizar tablas como tarjetas apiladas en móvil.

**Uso:**
```typescript
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view';

const columns: MobileTableColumn<YourType>[] = [
  { key: 'nombre', label: 'Nombre', isTitle: true },
  { key: 'categoria', label: 'Categoría' },
  { key: 'precio', label: 'Precio', format: (value) => formatCurrency(value as number) },
];

<MobileTableView
  data={items}
  columns={columns}
  renderActions={(item) => (
    <Button onClick={() => handleEdit(item.id)}>Editar</Button>
  )}
  sentinelRef={sentinelRef}
  isLoading={false}
/>
```

## Patrón de Refactorización

### Paso 1: Importar Componentes y Hooks

```typescript
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
```

### Paso 2: Preparar Datos para Móvil

```typescript
// Para infinite scroll en móvil: mostrar todos los items filtrados
const mobileItems = useMemo(() => {
  return filteredItems; // o usar data?.pages.flatMap(page => page.data) si usas useInfiniteQuery
}, [filteredItems]);

// Hook para infinite scroll
const sentinelRef = useInfiniteScroll({
  fetchNextPage: () => {
    // Si usas useInfiniteQuery:
    // fetchNextPage();
    
    // Si usas paginación tradicional:
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  },
  hasNextPage: currentPage < totalPages, // o hasNextPage de useInfiniteQuery
  isFetchingNextPage: false, // o isFetchingNextPage de useInfiniteQuery
  enabled: true,
});
```

### Paso 3: Definir Columnas para Vista Móvil

```typescript
const mobileColumns: MobileTableColumn<YourDataType>[] = [
  { 
    key: 'nombre', 
    label: 'Nombre', 
    isTitle: true, // Esta columna será el título de la tarjeta
    format: (value, row) => (
      // Formato personalizado si es necesario
      <div className="flex items-center gap-2">
        {row.requiereRevision && <AlertTriangle className="h-4 w-4" />}
        <span>{value}</span>
      </div>
    )
  },
  { key: 'categoria', label: 'Categoría' },
  { key: 'precio', label: 'Precio', format: (value) => formatCurrency(value as number) },
  { key: 'fecha', label: 'Fecha', format: (value) => format(new Date(value), 'dd/MM/yyyy') },
  // Columnas que no quieres mostrar en móvil:
  { key: 'id', label: 'ID', hideOnMobile: true },
];
```

### Paso 4: Envolver Tabla Existente y Agregar Vista Móvil

```typescript
<>
  {/* Vista Móvil: Tarjetas Apiladas */}
  <div className="md:hidden space-y-4">
    <MobileTableView
      data={mobileItems}
      columns={mobileColumns}
      renderActions={(item) => (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(item.id)}
            className="flex-1"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(item.id)}
            className="flex-1 text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </>
      )}
      sentinelRef={sentinelRef}
      isLoading={isFetchingNextPage} // o false si no hay infinite query
      emptyMessage="No se encontraron datos."
    />
  </div>

  {/* Vista Escritorio: Tabla Tradicional */}
  <div className="hidden md:block border rounded-lg">
    <Table>
      {/* ... tabla existente sin cambios ... */}
    </Table>
  </div>
</>
```

## Casos Especiales

### Con useInfiniteQuery

Si el componente ya usa `useInfiniteQuery`:

```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery(...);

const mobileItems = useMemo(() => {
  return data?.pages.flatMap(page => page.data) || [];
}, [data]);

const sentinelRef = useInfiniteScroll({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  enabled: true,
});
```

### Sin Paginación

Si no hay paginación, simplemente muestra todos los datos:

```typescript
const mobileItems = filteredItems;

const sentinelRef = useInfiniteScroll({
  fetchNextPage: () => {
    // TODO: Conectar lógica de carga infinita aquí
  },
  hasNextPage: false,
  isFetchingNextPage: false,
  enabled: false, // Deshabilitar infinite scroll
});
```

## Archivos Refactorizados (Ejemplos)

- ✅ `app/(dashboard)/book/recetas/page.tsx`
- ✅ `app/(dashboard)/bd/erp/page.tsx`

## Checklist de Refactorización

- [ ] Importar `MobileTableView` y `useInfiniteScroll`
- [ ] Crear `mobileItems` con todos los items filtrados
- [ ] Configurar `useInfiniteScroll` hook
- [ ] Definir `mobileColumns` con las columnas de la tabla
- [ ] Envolver tabla existente en `hidden md:block`
- [ ] Agregar vista móvil con `MobileTableView`
- [ ] Incluir acciones (botones) en `renderActions`
- [ ] Probar en dispositivo móvil
- [ ] Verificar que infinite scroll funciona correctamente

## Notas Importantes

1. **NO modificar la lógica de la tabla de escritorio** - Solo envolverla en `hidden md:block`
2. **Mantener todas las funcionalidades** - Botones de acción deben estar en ambas vistas
3. **Infinite scroll es opcional** - Si no hay paginación, dejar `enabled: false`
4. **Formateo de valores** - Usar la función `format` en las columnas para valores complejos

