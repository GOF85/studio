# LocalStorage to Supabase Migration - Quick Start

## 🚀 Quick Start Guide

Esta guía te ayudará a empezar a usar el nuevo sistema basado en React Query y Supabase.

## Para Desarrolladores

### 1. Usar Hooks de Datos

En lugar de acceder a `localStorage` directamente, usa los hooks de React Query:

```typescript
// ❌ ANTES (localStorage)
const [eventos, setEventos] = useState([]);

useEffect(() => {
  const stored = JSON.parse(localStorage.getItem('serviceOrders') || '[]');
  setEventos(stored);
}, []);

// ✅ AHORA (React Query)
import { useEventos } from '@/hooks/use-data-queries';

const { data: eventos = [], isLoading, error } = useEventos();
```

### 2. Crear Datos

```typescript
// ❌ ANTES
const handleCreate = (newEvento) => {
  const current = JSON.parse(localStorage.getItem('serviceOrders') || '[]');
  localStorage.setItem('serviceOrders', JSON.stringify([...current, newEvento]));
};

// ✅ AHORA
import { useCreateEvento } from '@/hooks/use-data-queries';

const createEvento = useCreateEvento();

const handleCreate = async (newEvento) => {
  await createEvento.mutateAsync(newEvento);
  // Automáticamente actualiza la lista
};
```

### 3. Con Toast Notifications

```typescript
import { useCreateEventoWithToast } from '@/hooks/use-toast-mutations';

const createEvento = useCreateEventoWithToast();

const handleCreate = async (newEvento) => {
  await createEvento.mutateAsync(newEvento);
  // Automáticamente muestra toast de éxito/error
};
```

## Hooks Disponibles

### Queries (Lectura)
- `useEventos()` - Lista de eventos
- `useRecetas()` - Lista de recetas
- `useElaboraciones()` - Lista de elaboraciones
- `useMaterialOrders(eventoId)` - Pedidos de material
- `useTransporteOrders(eventoId)` - Pedidos de transporte
- `useHieloOrders(eventoId)` - Pedidos de hielo
- `useDecoracionOrders(eventoId)` - Pedidos de decoración
- `useAtipicoOrders(eventoId)` - Pedidos atípicos
- `usePersonalMiceOrders(eventoId)` - Personal MICE
- `usePersonalExterno(eventoId)` - Personal externo
- `useEntregas()` - Lista de entregas
- `usePruebasMenu(eventoId)` - Pruebas de menú

### Mutations (Escritura)
- `useCreateEvento()` - Crear evento
- `useUpdateEvento()` - Actualizar evento
- `useDeleteEvento()` - Eliminar evento
- `useCreateReceta()` - Crear receta
- `useCreateEntrega()` - Crear entrega

### Mutations con Toast
- `useCreateEventoWithToast()` - Crear con notificación
- `useUpdateEventoWithToast()` - Actualizar con notificación
- `useDeleteEventoWithToast()` - Eliminar con notificación
- `useCreateRecetaWithToast()` - Crear receta con notificación

## Características Avanzadas

### Prefetching
```typescript
import { usePrefetchEvento } from '@/lib/react-query-utils';

const prefetchEvento = usePrefetchEvento();

// En hover
<Card onMouseEnter={() => prefetchEvento(eventoId)}>
```

### Búsqueda con Debouncing
```typescript
import { useSearchEventos } from '@/lib/react-query-utils';

const [searchTerm, setSearchTerm] = useState('');
const { data: results } = useSearchEventos(searchTerm);
```

### Infinite Scroll
```typescript
import { useInfiniteRecetas } from '@/lib/react-query-utils';

const { 
  data, 
  fetchNextPage, 
  hasNextPage 
} = useInfiniteRecetas(20);
```

## Para Usuarios

### Migrar Datos Existentes

1. Visita `/migration` en tu navegador
2. Haz clic en "Verificar Datos Pendientes"
3. Si hay datos, haz clic en "Iniciar Migración"
4. Espera a que complete (se hace respaldo automático)

### React Query DevTools

En desarrollo, verás un botón flotante en la esquina inferior derecha. Haz clic para:
- Ver todas las queries activas
- Inspeccionar datos en caché
- Forzar refetch
- Ver estados de loading/error

## Troubleshooting

### "No se cargan los datos"
1. Abre React Query DevTools
2. Verifica que la query esté en estado "success"
3. Revisa la consola por errores de Supabase

### "Los cambios no se reflejan"
1. Verifica que la mutation tenga `onSuccess` con `invalidateQueries`
2. Comprueba que el `queryKey` sea correcto
3. Usa DevTools para ver el estado del caché

### "Error de autenticación"
1. Verifica que estés autenticado en Supabase
2. Comprueba las políticas RLS de la tabla
3. Revisa los permisos de tu usuario

## Recursos

- [Best Practices](./react-query-best-practices.md)
- [Testing Guide](./testing-guide.md)
- [Walkthrough Completo](../../../.gemini/antigravity/brain/0540b800-035b-48d4-b027-d9bffa495321/walkthrough.md)
