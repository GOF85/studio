'use client';

import { PedidoPendiente } from '@/types';
import { PendingOrderCard } from './pending-order-card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';

interface PendingOrdersListProps {
  pedidos: PedidoPendiente[];
  isLoading?: boolean;
  onEdit?: (pedido: PedidoPendiente) => void;
  onDelete?: (pedidoId: string) => void;
  onDuplicate?: (pedido: PedidoPendiente) => void;
  onChangeContext?: (pedido: PedidoPendiente) => void;
  onCreateNew?: () => void;
  onGeneratePDF?: (selectedIds: string[]) => void;
}

export function PendingOrdersList({
  pedidos,
  isLoading = false,
  onEdit,
  onDelete,
  onDuplicate,
  onChangeContext,
  onCreateNew,
  onGeneratePDF,
}: PendingOrdersListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelect = (pedidoId: string, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(pedidoId);
    } else {
      newSelected.delete(pedidoId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === pedidos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pedidos.map(p => p.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-gray-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
        <p className="text-gray-500 text-sm mb-4">
          No hay pedidos pendientes
        </p>
        <Button onClick={onCreateNew} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Crear primer pedido
        </Button>
      </div>
    );
  }

  // Group by fecha + localizacion
  const grouped = pedidos.reduce(
    (acc, pedido) => {
      const key = `${pedido.fecha_entrega}|${pedido.localizacion}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(pedido);
      return acc;
    },
    {} as Record<string, PedidoPendiente[]>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 sticky top-0 bg-white z-10 py-2 border-b">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedIds.size === pedidos.length && pedidos.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">
            {selectedIds.size > 0
              ? `${selectedIds.size} seleccionado${selectedIds.size !== 1 ? 's' : ''}`
              : 'Seleccionar todos'}
          </span>
        </label>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onCreateNew}
            variant="default"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo pedido
          </Button>

          {selectedIds.size > 0 && (
            <Button
              size="sm"
              onClick={() => onGeneratePDF?.(Array.from(selectedIds))}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Generar PDF ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Grouped pedidos */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([key, groupPedidos]) => {
          const [fecha, localizacion] = key.split('|');
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1 sticky top-12 bg-gray-50 z-9 rounded">
                <h3 className="font-semibold text-sm text-gray-700">
                  {fecha} • {localizacion}
                </h3>
                <span className="text-xs text-gray-500">
                  {groupPedidos.length} tarjeta{groupPedidos.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupPedidos.map((pedido) => (
                  <PendingOrderCard
                    key={pedido.id}
                    pedido={pedido}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onChangeContext={onChangeContext}
                    isSelected={selectedIds.has(pedido.id)}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
