/**
 * Testing utilities for React Query
 * Helpers for testing components that use React Query hooks
 */

import React, { type ReactElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';

/**
 * Create a test query client with sensible defaults
 */
export function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false, // Don't retry in tests
                gcTime: Infinity, // Keep cache forever in tests
            },
            mutations: {
                retry: false,
            },
        },
        logger: {
            log: console.log,
            warn: console.warn,
            error: () => { }, // Suppress errors in tests
        },
    });
}

/**
 * Wrapper for testing components with React Query
 */
export function createQueryWrapper(queryClient?: QueryClient) {
    const client = queryClient || createTestQueryClient();

    return function Wrapper({ children }: { children: ReactNode }) {
        return React.createElement(QueryClientProvider, { client }, children as any);
    };
}

/**
 * Custom render function that includes QueryClientProvider
 */
export function renderWithQuery(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient }
) {
    const { queryClient, ...renderOptions } = options || {};
    const Wrapper = createQueryWrapper(queryClient);

    return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Mock Supabase response for testing
 */
export function mockSupabaseQuery<T>(data: T[], error?: any) {
    return {
        data: error ? null : data,
        error: error || null,
        count: data.length,
        status: error ? 400 : 200,
        statusText: error ? 'Error' : 'OK',
    };
}

/**
 * Wait for query to finish loading
 */
export async function waitForQuery(queryClient: QueryClient, queryKey: any[]) {
    await queryClient.refetchQueries({ queryKey });
}

/**
 * Set mock data in query cache
 */
export function setMockQueryData<T>(
    queryClient: QueryClient,
    queryKey: any[],
    data: T
) {
    queryClient.setQueryData(queryKey, data);
}

/**
 * Example test setup
 * 
 * ```typescript
 * import { renderWithQuery, createTestQueryClient, setMockQueryData } from '@/lib/query-test-utils';
 * 
 * describe('EventosList', () => {
 *   it('renders eventos', () => {
 *     const queryClient = createTestQueryClient();
 *     
 *     // Set mock data
 *     setMockQueryData(queryClient, ['eventos'], [
 *       { id: '1', client: 'Test Event', status: 'Confirmado' }
 *     ]);
 *     
 *     // Render with query client
 *     const { getByText } = renderWithQuery(<EventosList />, { queryClient });
 *     
 *     expect(getByText('Test Event')).toBeInTheDocument();
 *   });
 * });
 * ```
 */
