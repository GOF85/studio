# Best Practices: React Query + Supabase

## 📚 Guía de Mejores Prácticas

Esta guía documenta los patrones recomendados para trabajar con React Query y Supabase en este proyecto.

## 🎯 Estructura de Hooks

### Patrón Básico de Query
```typescript
export function useEntities(filterId?: string) {
    return useQuery({
        queryKey: ['entities', filterId], // Incluir filtros en la key
        queryFn: async () => {
            let query = supabase.from('entities').select('*');
            
            if (filterId) {
                query = query.eq('filter_id', filterId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!filterId || filterId === undefined, // Control de ejecución
    });
}
```

### Patrón Básico de Mutation
```typescript
export function useCreateEntity() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (entity: Partial<Entity>) => {
            const { data, error } = await supabase
                .from('entities')
                .insert(entity)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            // Invalidar queries relacionadas
            queryClient.invalidateQueries({ queryKey: ['entities'] });
        },
    });
}
```

## 🔑 Query Keys

### Convención de Nomenclatura
```typescript
// ✅ CORRECTO
['eventos']                    // Todos los eventos
['eventos', eventoId]          // Un evento específico
['eventos', { status: 'CONFIRMADO' }] // Eventos filtrados
['materialOrders', eventoId]   // Pedidos de un evento

// ❌ INCORRECTO
['getEventos']                 // No usar verbos
['evento-123']                 // No hardcodear IDs
['all_events']                 // Usar camelCase
```

### Jerarquía de Keys
```typescript
// Nivel 1: Entidad
['eventos']

// Nivel 2: Filtro o ID
['eventos', eventoId]
['eventos', { year: 2024 }]

// Nivel 3: Relaciones
['eventos', eventoId, 'material']
['eventos', eventoId, 'personal']
```

## 💾 Mapeo de Datos

### Transformar Datos de Supabase
```typescript
export function useEventos() {
    return useQuery({
        queryKey: ['eventos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('eventos')
                .select('*');

            if (error) throw error;

            // Mapear a tipo de aplicación
            return (data || []).map((e): ServiceOrder => ({
                id: e.id,
                serviceNumber: e.numero_expediente,
                client: e.nombre_evento,
                startDate: e.fecha_inicio,
                endDate: e.fecha_fin,
                status: e.estado === 'CONFIRMADO' ? 'Confirmado' : 'Borrador',
                asistentes: e.comensales || 0,
                // ... resto de campos
            }));
        },
    });
}
```

## 🔄 Invalidación de Caché

### Invalidación Específica
```typescript
// Invalidar todas las queries de eventos
queryClient.invalidateQueries({ queryKey: ['eventos'] });

// Invalidar solo un evento específico
queryClient.invalidateQueries({ queryKey: ['eventos', eventoId] });

// Invalidar queries que empiecen con 'eventos'
queryClient.invalidateQueries({ 
    predicate: (query) => query.queryKey[0] === 'eventos' 
});
```

### Invalidación en Cascada
```typescript
export function useDeleteEvento() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('eventos')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: (_, deletedId) => {
            // Invalidar lista de eventos
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
            
            // Invalidar queries relacionadas
            queryClient.invalidateQueries({ queryKey: ['materialOrders', deletedId] });
            queryClient.invalidateQueries({ queryKey: ['personalMice', deletedId] });
        },
    });
}
```

## ⚡ Optimistic Updates

### Patrón Básico
```typescript
export function useUpdateEvento() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<ServiceOrder> & { id: string }) => {
            const { data, error } = await supabase
                .from('eventos')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onMutate: async (newData) => {
            // Cancelar queries en curso
            await queryClient.cancelQueries({ queryKey: ['eventos'] });

            // Snapshot del estado anterior
            const previousEventos = queryClient.getQueryData(['eventos']);

            // Actualizar optimísticamente
            queryClient.setQueryData(['eventos'], (old: any[]) => 
                old.map(evento => 
                    evento.id === newData.id 
                        ? { ...evento, ...newData } 
                        : evento
                )
            );

            return { previousEventos };
        },
        onError: (err, newData, context) => {
            // Revertir en caso de error
            queryClient.setQueryData(['eventos'], context?.previousEventos);
        },
        onSettled: () => {
            // Siempre refrescar al final
            queryClient.invalidateQueries({ queryKey: ['eventos'] });
        },
    });
}
```

## 🎨 Uso en Componentes

### Loading States
```typescript
function EventosList() {
    const { data: eventos, isLoading, error } = useEventos();

    if (isLoading) {
        return <LoadingSkeleton title="Cargando eventos..." />;
    }

    if (error) {
        return <ErrorMessage error={error} />;
    }

    return (
        <div>
            {eventos.map(evento => (
                <EventoCard key={evento.id} evento={evento} />
            ))}
        </div>
    );
}
```

### Mutations con Feedback
```typescript
function CreateEventoForm() {
    const createEvento = useCreateEvento();
    const { toast } = useToast();

    const handleSubmit = async (data: Partial<ServiceOrder>) => {
        try {
            await createEvento.mutateAsync(data);
            toast({
                title: "Evento creado",
                description: "El evento se ha creado correctamente.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo crear el evento.",
                variant: "destructive",
            });
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* ... campos del formulario */}
            <Button 
                type="submit" 
                disabled={createEvento.isPending}
            >
                {createEvento.isPending ? 'Creando...' : 'Crear Evento'}
            </Button>
        </form>
    );
}
```

## 🔍 Queries Dependientes

### Cargar Datos en Secuencia
```typescript
function EventoDetails({ eventoId }: { eventoId: string }) {
    // Primera query
    const { data: evento } = useEventos(eventoId);

    // Segunda query (solo se ejecuta si evento existe)
    const { data: material } = useMaterialOrders(evento?.id);

    // Tercera query (depende de las anteriores)
    const { data: personal } = usePersonalMice(evento?.id);

    // ...
}
```

## 📊 Cálculos Derivados

### Usar useMemo para Cálculos Pesados
```typescript
function Dashboard() {
    const { data: eventos = [] } = useEventos();
    const { data: material = [] } = useMaterialOrders();

    const stats = useMemo(() => {
        // Cálculos pesados solo cuando cambien las dependencias
        const totalFacturacion = eventos.reduce((sum, e) => sum + e.facturacion, 0);
        const totalCoste = material.reduce((sum, m) => sum + m.total, 0);
        
        return {
            facturacion: totalFacturacion,
            coste: totalCoste,
            margen: totalFacturacion - totalCoste,
        };
    }, [eventos, material]);

    return <StatsDisplay stats={stats} />;
}
```

## 🚫 Anti-Patrones a Evitar

### ❌ NO hacer fetch manual
```typescript
// ❌ INCORRECTO
useEffect(() => {
    const fetchData = async () => {
        const { data } = await supabase.from('eventos').select('*');
        setEventos(data);
    };
    fetchData();
}, []);

// ✅ CORRECTO
const { data: eventos } = useEventos();
```

### ❌ NO duplicar estado
```typescript
// ❌ INCORRECTO
const { data: eventos } = useEventos();
const [localEventos, setLocalEventos] = useState(eventos);

// ✅ CORRECTO
const { data: eventos } = useEventos();
// Usar directamente 'eventos'
```

### ❌ NO invalidar en exceso
```typescript
// ❌ INCORRECTO - Invalida TODO
queryClient.invalidateQueries();

// ✅ CORRECTO - Invalida solo lo necesario
queryClient.invalidateQueries({ queryKey: ['eventos'] });
```

## 🎯 Configuración Recomendada

### QueryClient Config
```typescript
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000,        // 1 minuto
            gcTime: 5 * 60 * 1000,       // 5 minutos
            refetchOnWindowFocus: false, // Evitar refetch al cambiar de pestaña
            retry: 1,                    // Reintentar solo 1 vez
        },
    },
});
```

## 📝 Nomenclatura de Hooks

### Convención
```typescript
// Queries (lectura)
useEventos()           // Lista
useEvento(id)          // Individual
useMaterialOrders(id)  // Relación

// Mutations (escritura)
useCreateEvento()
useUpdateEvento()
useDeleteEvento()
```

## 🔐 Manejo de Errores

### Error Boundaries
```typescript
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function App() {
    return (
        <QueryErrorResetBoundary>
            {({ reset }) => (
                <ErrorBoundary
                    onReset={reset}
                    fallbackRender={({ error, resetErrorBoundary }) => (
                        <div>
                            Error: {error.message}
                            <button onClick={resetErrorBoundary}>Reintentar</button>
                        </div>
                    )}
                >
                    <YourApp />
                </ErrorBoundary>
            )}
        </QueryErrorResetBoundary>
    );
}
```

## 📚 Recursos Adicionales

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Supabase Docs](https://supabase.com/docs/reference/javascript/introduction)
- [React Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)
