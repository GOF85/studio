import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubPedidoCard } from '../sub-pedido-card';
import type { PedidoPendiente } from '@/types';

// Mock del hook useProveedor
vi.mock('@/hooks/use-data-queries', () => ({
  useProveedor: () => ({ data: null }),
}));

describe('SubPedidoCard - Status Badges', () => {
  const baseSubpedido: PedidoPendiente = {
    id: 'test-1',
    os_id: 'OS-001',
    tipo: 'Alquiler',
    estado: 'Pendiente',
    fecha_entrega: '2026-01-20',
    hora_entrega: '10:00', // NEW
    localizacion: 'Cocina',
    solicita: 'Sala',
    items: [
      {
        itemCode: 'item-1',
        description: 'Test Item',
        cantidad: 1,
        price: 10,
      },
    ],
    cantidad_articulos: 1,
    cantidad_unidades: 1,
    created_at: '2026-01-11T00:00:00Z',
    updated_at: '2026-01-11T00:00:00Z',
  };

  it('renders pending status badge with correct styling', () => {
    const subpedido = { ...baseSubpedido, status: 'pending' as const };
    render(
      <SubPedidoCard
        pedido={subpedido}
        onEdit={() => {}}
        onAddReferencias={() => {}}
        onUpdateItems={() => {}}
        onDelete={() => {}}
        availableLocations={[]}
      />
    );
    
    expect(screen.getByText('PENDIENTE')).toBeInTheDocument();
  });

  it('renders review status badge with correct styling', () => {
    const subpedido = { ...baseSubpedido, status: 'review' as const };
    render(
      <SubPedidoCard
        pedido={subpedido}
        onEdit={() => {}}
        onAddReferencias={() => {}}
        onUpdateItems={() => {}}
        onDelete={() => {}}
        availableLocations={[]}
      />
    );
    
    expect(screen.getByText('PARA REVISAR')).toBeInTheDocument();
  });

  it('renders confirmed status badge with correct styling', () => {
    const subpedido = { ...baseSubpedido, status: 'confirmed' as const };
    render(
      <SubPedidoCard
        pedido={subpedido}
        onEdit={() => {}}
        onAddReferencias={() => {}}
        onUpdateItems={() => {}}
        onDelete={() => {}}
        availableLocations={[]}
      />
    );
    
    expect(screen.getByText('CONFIRMADO')).toBeInTheDocument();
  });

  it('renders sent status badge with correct styling', () => {
    const subpedido = { ...baseSubpedido, status: 'sent' as const };
    render(
      <SubPedidoCard
        pedido={subpedido}
        onEdit={() => {}}
        onAddReferencias={() => {}}
        onUpdateItems={() => {}}
        onDelete={() => {}}
        availableLocations={[]}
      />
    );
    
    expect(screen.getByText('ENVIADO')).toBeInTheDocument();
  });

  it('renders cancelled status badge with correct styling', () => {
    const subpedido = { ...baseSubpedido, status: 'cancelled' as const };
    render(
      <SubPedidoCard
        pedido={subpedido}
        onEdit={() => {}}
        onAddReferencias={() => {}}
        onUpdateItems={() => {}}
        onDelete={() => {}}
        availableLocations={[]}
      />
    );
    
    expect(screen.getByText('CANCELADO')).toBeInTheDocument();
  });

  it('defaults to pending status when status is not provided', () => {
    const subpedido = { ...baseSubpedido, status: undefined };
    render(
      <SubPedidoCard
        pedido={subpedido}
        onEdit={() => {}}
        onAddReferencias={() => {}}
        onUpdateItems={() => {}}
        onDelete={() => {}}
        availableLocations={[]}
      />
    );
    
    expect(screen.getByText('PENDIENTE')).toBeInTheDocument();
  });
});
