/**
 * Advanced React Query Utilities
 * 
 * This file contains advanced patterns for React Query:
 * - Prefetching for faster navigation
 * - Pagination helpers
 * - Infinite scroll patterns
 */

import { useQueryClient, useInfiniteQuery, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ============================================
// PREFETCHING UTILITIES
// ============================================

/**
 * Prefetch eventos for faster navigation
 * Call this on hover or when user is likely to navigate
 */
export function usePrefetchEventos() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.prefetchQuery({
            queryKey: ['eventos'],
            queryFn: async () => {
                const { data, error } = await supabase
                    .from('eventos')
                    .select('*')
                    .order('fecha_inicio', { ascending: false });

                if (error) throw error;
                return data || [];
            },
        });
    };
}

/**
 * Prefetch a specific evento by ID
 */
export function usePrefetchEvento() {
    const queryClient = useQueryClient();

    return (eventoId: string) => {
        queryClient.prefetchQuery({
            queryKey: ['eventos', eventoId],
            queryFn: async () => {
                const { data, error } = await supabase
                    .from('eventos')
                    .select('*')
                    .eq('id', eventoId)
                    .single();

                if (error) throw error;
                return data;
            },
        });
    };
}

/**
 * Prefetch related data for an evento
 * Useful when navigating to evento detail page
 */
export function usePrefetchEventoDetails() {
    const queryClient = useQueryClient();

    return async (eventoId: string) => {
        // Prefetch all related data in parallel
        await Promise.all([
            queryClient.prefetchQuery({
                queryKey: ['materialOrders', eventoId],
                queryFn: async () => {
                    const { data, error } = await supabase
                        .from('pedidos_material')
                        .select('*')
                        .eq('evento_id', eventoId);
                    if (error) throw error;
                    return data || [];
                },
            }),
            queryClient.prefetchQuery({
                queryKey: ['transporteOrders', eventoId],
                queryFn: async () => {
                    const { data, error } = await supabase
                        .from('pedidos_transporte')
                        .select('*')
                        .eq('evento_id', eventoId);
                    if (error) throw error;
                    return data || [];
                },
            }),
            queryClient.prefetchQuery({
                queryKey: ['personalMiceOrders', eventoId],
                queryFn: async () => {
                    const { data, error } = await supabase
                        .from('personal_mice_asignaciones')
                        .select('*')
                        .eq('evento_id', eventoId);
                    if (error) throw error;
                    return data || [];
                },
            }),
        ]);
    };
}

// ============================================
// PAGINATION UTILITIES
// ============================================

export type PaginationParams = {
    page: number;
    pageSize: number;
};

export type PaginatedResponse<T> = {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

/**
 * Paginated eventos query
 */
export function usePaginatedEventos(params: PaginationParams) {
    return useInfiniteQuery({
        queryKey: ['eventos', 'paginated', params],
        queryFn: async ({ pageParam = 0 }) => {
            const from = pageParam * params.pageSize;
            const to = from + params.pageSize - 1;

            // Get total count
            const { count } = await supabase
                .from('eventos')
                .select('*', { count: 'exact', head: true });

            // Get paginated data
            const { data, error } = await supabase
                .from('eventos')
                .select('*')
                .order('fecha_inicio', { ascending: false })
                .range(from, to);

            if (error) throw error;

            return {
                data: data || [],
                total: count || 0,
                page: pageParam,
                pageSize: params.pageSize,
                totalPages: Math.ceil((count || 0) / params.pageSize),
            };
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.page + 1 < lastPage.totalPages) {
                return lastPage.page + 1;
            }
            return undefined;
        },
        initialPageParam: 0,
    });
}

/**
 * Infinite scroll for recetas
 */
export function useInfiniteRecetas(pageSize: number = 20) {
    return useInfiniteQuery({
        queryKey: ['recetas', 'infinite', pageSize],
        queryFn: async ({ pageParam = 0 }) => {
            const from = pageParam * pageSize;
            const to = from + pageSize - 1;

            const { data, error } = await supabase
                .from('recetas')
                .select('*')
                .order('nombre', { ascending: true })
                .range(from, to);

            if (error) throw error;

            return {
                data: data || [],
                nextCursor: data && data.length === pageSize ? pageParam + 1 : undefined,
            };
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
    });
}

// ============================================
// OPTIMISTIC UPDATE HELPERS
// ============================================

/**
 * Helper to perform optimistic updates
 */
export async function optimisticUpdate<T>(
    queryClient: QueryClient,
    queryKey: any[],
    updater: (old: T) => T
) {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey });

    // Snapshot previous value
    const previous = queryClient.getQueryData<T>(queryKey);

    // Optimistically update
    if (previous) {
        queryClient.setQueryData(queryKey, updater(previous));
    }

    return { previous };
}

/**
 * Helper to add item to list optimistically
 */
export function optimisticAdd<T extends { id: string }>(
    queryClient: QueryClient,
    queryKey: any[],
    newItem: T
) {
    return optimisticUpdate<T[]>(queryClient, queryKey, (old) => [...old, newItem]);
}

/**
 * Helper to update item in list optimistically
 */
export function optimisticUpdateItem<T extends { id: string }>(
    queryClient: QueryClient,
    queryKey: any[],
    itemId: string,
    updates: Partial<T>
) {
    return optimisticUpdate<T[]>(queryClient, queryKey, (old) =>
        old.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );
}

/**
 * Helper to remove item from list optimistically
 */
export function optimisticRemove<T extends { id: string }>(
    queryClient: QueryClient,
    queryKey: any[],
    itemId: string
) {
    return optimisticUpdate<T[]>(queryClient, queryKey, (old) =>
        old.filter((item) => item.id !== itemId)
    );
}

// ============================================
// BACKGROUND SYNC UTILITIES
// ============================================

/**
 * Enable background refetching for critical data
 * Call this in layout or app component
 */
export function useBackgroundSync() {
    const queryClient = useQueryClient();

    // Refetch eventos every 5 minutes in background
    const refetchEventos = () => {
        queryClient.refetchQueries({
            queryKey: ['eventos'],
            type: 'active' // Only refetch if query is being used
        });
    };

    // Set up interval
    if (typeof window !== 'undefined') {
        setInterval(refetchEventos, 5 * 60 * 1000); // 5 minutes
    }
}

// ============================================
// CACHE WARMING
// ============================================

/**
 * Warm up cache on app load
 * Prefetch commonly used data
 */
export async function warmUpCache(queryClient: QueryClient) {
    const criticalQueries = [
        {
            queryKey: ['eventos'],
            queryFn: async () => {
                const { data } = await supabase
                    .from('eventos')
                    .select('*')
                    .order('fecha_inicio', { ascending: false })
                    .limit(50); // Only recent eventos
                return data || [];
            },
        },
        {
            queryKey: ['recetas'],
            queryFn: async () => {
                const { data } = await supabase
                    .from('recetas')
                    .select('*')
                    .eq('estado', 'ACTIVO')
                    .limit(100);
                return data || [];
            },
        },
    ];

    await Promise.all(
        criticalQueries.map((query) => queryClient.prefetchQuery(query))
    );
}

// ============================================
// SEARCH UTILITIES
// ============================================

/**
 * Search eventos with debouncing
 */
export function useSearchEventos(searchTerm: string, debounceMs: number = 300) {
    const queryClient = useQueryClient();

    return useInfiniteQuery({
        queryKey: ['eventos', 'search', searchTerm],
        queryFn: async ({ pageParam = 0 }) => {
            if (!searchTerm || searchTerm.length < 2) {
                return { data: [], nextCursor: undefined };
            }

            const from = pageParam * 20;
            const to = from + 19;

            const { data, error } = await supabase
                .from('eventos')
                .select('*')
                .or(`nombre_evento.ilike.%${searchTerm}%,numero_expediente.ilike.%${searchTerm}%`)
                .order('fecha_inicio', { ascending: false })
                .range(from, to);

            if (error) throw error;

            return {
                data: data || [],
                nextCursor: data && data.length === 20 ? pageParam + 1 : undefined,
            };
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
        enabled: searchTerm.length >= 2,
        staleTime: debounceMs,
    });
}
