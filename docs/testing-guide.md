# Testing Guide: React Query Hooks

## 🧪 Guía de Testing

Esta guía explica cómo testear componentes que usan React Query.

## Configuración Inicial

### Instalar Dependencias de Testing
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest
```

### Configurar Vitest (opcional)
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

## Testear Queries

### Test Básico de Query
```typescript
import { renderWithQuery, setMockQueryData, createTestQueryClient } from '@/lib/query-test-utils';
import { screen } from '@testing-library/react';
import EventosList from '@/app/eventos/page';

describe('EventosList', () => {
  it('renders eventos from query', () => {
    const queryClient = createTestQueryClient();
    
    // Mock data
    setMockQueryData(queryClient, ['eventos'], [
      { 
        id: '1', 
        client: 'Test Event', 
        status: 'Confirmado',
        serviceNumber: 'EV-001',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        asistentes: 100,
      }
    ]);
    
    renderWithQuery(<EventosList />, { queryClient });
    
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('EV-001')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithQuery(<EventosList />);
    
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });
});
```

### Test con Error Handling
```typescript
import { renderWithQuery, createTestQueryClient } from '@/lib/query-test-utils';
import { screen } from '@testing-library/react';

describe('EventosList Error Handling', () => {
  it('displays error message on query failure', async () => {
    const queryClient = createTestQueryClient();
    
    // Mock error
    queryClient.setQueryData(['eventos'], () => {
      throw new Error('Failed to fetch eventos');
    });
    
    renderWithQuery(<EventosList />, { queryClient });
    
    expect(await screen.findByText(/error/i)).toBeInTheDocument();
  });
});
```

## Testear Mutations

### Test de Mutation Exitosa
```typescript
import { renderWithQuery, createTestQueryClient } from '@/lib/query-test-utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateEventoForm from '@/app/ejemplos/create-evento-form';
import * as supabase from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { id: '1', nombre_evento: 'Test' },
            error: null
          }))
        }))
      }))
    }))
  }
}));

describe('CreateEventoForm', () => {
  it('creates evento successfully', async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    
    renderWithQuery(<CreateEventoForm />, { queryClient });
    
    // Fill form
    await user.type(screen.getByLabelText(/número de expediente/i), 'EV-001');
    await user.type(screen.getByLabelText(/cliente/i), 'Test Client');
    await user.type(screen.getByLabelText(/fecha inicio/i), '2024-01-01');
    await user.type(screen.getByLabelText(/fecha fin/i), '2024-01-02');
    await user.type(screen.getByLabelText(/asistentes/i), '100');
    
    // Submit
    await user.click(screen.getByRole('button', { name: /crear evento/i }));
    
    // Wait for success
    await waitFor(() => {
      expect(screen.getByText(/evento creado/i)).toBeInTheDocument();
    });
  });
});
```

### Test de Mutation con Error
```typescript
describe('CreateEventoForm Error', () => {
  it('shows error toast on failure', async () => {
    const user = userEvent.setup();
    
    // Mock error
    jest.spyOn(supabase.supabase, 'from').mockImplementation(() => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({
            data: null,
            error: { message: 'Database error' }
          })
        })
      })
    }));
    
    renderWithQuery(<CreateEventoForm />);
    
    // Fill and submit form
    // ... (same as above)
    
    await waitFor(() => {
      expect(screen.getByText(/error al crear/i)).toBeInTheDocument();
    });
  });
});
```

## Testear Optimistic Updates

```typescript
describe('Optimistic Updates', () => {
  it('updates UI optimistically', async () => {
    const queryClient = createTestQueryClient();
    const user = userEvent.setup();
    
    // Set initial data
    setMockQueryData(queryClient, ['eventos'], [
      { id: '1', client: 'Old Name', status: 'Borrador' }
    ]);
    
    renderWithQuery(<EventoDetails eventoId="1" />, { queryClient });
    
    // Click edit button
    await user.click(screen.getByRole('button', { name: /editar/i }));
    
    // Change name
    await user.clear(screen.getByLabelText(/cliente/i));
    await user.type(screen.getByLabelText(/cliente/i), 'New Name');
    
    // Submit
    await user.click(screen.getByRole('button', { name: /guardar/i }));
    
    // Should see new name immediately (optimistic)
    expect(screen.getByText('New Name')).toBeInTheDocument();
  });
});
```

## Testear Prefetching

```typescript
describe('Prefetching', () => {
  it('prefetches data on hover', async () => {
    const queryClient = createTestQueryClient();
    const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');
    
    renderWithQuery(<EventosList />, { queryClient });
    
    const eventoCard = screen.getByText('Test Event');
    
    // Hover over card
    await userEvent.hover(eventoCard);
    
    // Should prefetch
    expect(prefetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['eventos', '1']
      })
    );
  });
});
```

## Testear Infinite Scroll

```typescript
describe('Infinite Scroll', () => {
  it('loads more items on scroll', async () => {
    const queryClient = createTestQueryClient();
    
    renderWithQuery(<RecetasInfiniteScroll />, { queryClient });
    
    // Initial items
    expect(screen.getAllByRole('article')).toHaveLength(20);
    
    // Scroll to bottom
    const sentinel = screen.getByTestId('scroll-sentinel');
    fireEvent.scroll(sentinel);
    
    // Wait for more items
    await waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(40);
    });
  });
});
```

## Mock Supabase Responses

### Helper para Mock Responses
```typescript
// src/test/mocks/supabase.ts
export function mockSupabaseSelect<T>(data: T[]) {
  return {
    data,
    error: null,
    count: data.length,
    status: 200,
    statusText: 'OK',
  };
}

export function mockSupabaseError(message: string) {
  return {
    data: null,
    error: { message },
    count: 0,
    status: 400,
    statusText: 'Error',
  };
}

// Usage
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve(mockSupabaseSelect([
        { id: '1', nombre: 'Test' }
      ]))
    })
  }
}));
```

## Testing Best Practices

### 1. Usar Test Query Client
```typescript
// ✅ CORRECTO
const queryClient = createTestQueryClient();
renderWithQuery(<Component />, { queryClient });

// ❌ INCORRECTO - usar el client de producción
renderWithQuery(<Component />);
```

### 2. Limpiar después de cada test
```typescript
afterEach(() => {
  queryClient.clear();
});
```

### 3. Mock Supabase, no la red
```typescript
// ✅ CORRECTO - mock a nivel de Supabase
jest.mock('@/lib/supabase');

// ❌ INCORRECTO - mock a nivel de fetch
global.fetch = jest.fn();
```

### 4. Testear estados de loading
```typescript
it('shows loading state', () => {
  renderWithQuery(<Component />);
  expect(screen.getByText(/cargando/i)).toBeInTheDocument();
});
```

### 5. Testear estados de error
```typescript
it('shows error state', async () => {
  // Mock error
  queryClient.setQueryData(['eventos'], () => {
    throw new Error('Test error');
  });
  
  renderWithQuery(<Component />, { queryClient });
  expect(await screen.findByText(/error/i)).toBeInTheDocument();
});
```

## Ejemplo Completo

```typescript
import { renderWithQuery, createTestQueryClient, setMockQueryData } from '@/lib/query-test-utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventosPage from '@/app/eventos/page';

describe('EventosPage', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('renders list of eventos', () => {
    setMockQueryData(queryClient, ['eventos'], [
      { id: '1', client: 'Event 1', status: 'Confirmado' },
      { id: '2', client: 'Event 2', status: 'Borrador' },
    ]);

    renderWithQuery(<EventosPage />, { queryClient });

    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
  });

  it('filters eventos by search', async () => {
    const user = userEvent.setup();
    
    setMockQueryData(queryClient, ['eventos'], [
      { id: '1', client: 'Apple Event', status: 'Confirmado' },
      { id: '2', client: 'Banana Event', status: 'Confirmado' },
    ]);

    renderWithQuery(<EventosPage />, { queryClient });

    const searchInput = screen.getByPlaceholderText(/buscar/i);
    await user.type(searchInput, 'Apple');

    expect(screen.getByText('Apple Event')).toBeInTheDocument();
    expect(screen.queryByText('Banana Event')).not.toBeInTheDocument();
  });

  it('creates new evento', async () => {
    const user = userEvent.setup();
    
    renderWithQuery(<EventosPage />, { queryClient });

    await user.click(screen.getByRole('button', { name: /nuevo evento/i }));
    
    // Fill form...
    
    await user.click(screen.getByRole('button', { name: /crear/i }));

    await waitFor(() => {
      expect(screen.getByText(/evento creado/i)).toBeInTheDocument();
    });
  });
});
```

## Recursos

- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [React Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)
- [Vitest Docs](https://vitest.dev/)
