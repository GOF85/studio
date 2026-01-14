'use client';

import { PedidoEnviado } from '@/types';
import { SentOrderCard } from './sent-order-card';
import { Card } from '@/components/ui/card';

interface SentOrdersListProps {
  pedidos: PedidoEnviado[];
  isLoading?: boolean;
  onViewDetails?: (pedido: PedidoEnviado) => void;
  onDownloadPDF?: (pedido: PedidoEnviado) => void;
  onChangeStatus?: (pedido: PedidoEnviado) => void;
}

export function SentOrdersList({
  pedidos,
  isLoading = false,
  onViewDetails,
  onDownloadPDF,
  onChangeStatus,
}: SentOrdersListProps) {
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
      <Card className="p-12 text-center">
        <p className="text-gray-500 text-sm">
          No hay pedidos enviados aún
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Los pedidos consolidados aparecerán aquí
        </p>
      </Card>
    );
  }

  // Group by estado
  const grouped = pedidos.reduce(
    (acc, pedido) => {
      if (!acc[pedido.estado]) {
        acc[pedido.estado] = [];
      }
      acc[pedido.estado].push(pedido);
      return acc;
    },
    {} as Record<string, PedidoEnviado[]>
  );

  // Sort by estado priority
  const estadoOrder = ['En preparación', 'Listo', 'Entregado', 'Cancelado'];
  const sortedEstados = Object.keys(grouped).sort(
    (a, b) => estadoOrder.indexOf(a) - estadoOrder.indexOf(b)
  );

  return (
    <div className="space-y-6">
      {sortedEstados.map((estado) => (
        <div key={estado} className="space-y-3">
          <div className="flex items-center gap-2 px-2 py-1 sticky top-0 bg-gray-50 rounded">
            <h3 className="font-semibold text-sm text-gray-700">
              {estado}
            </h3>
            <span className="text-xs text-gray-500">
              {grouped[estado].length} pedido{grouped[estado].length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped[estado].map((pedido) => (
              <SentOrderCard
                key={pedido.id}
                pedido={pedido}
                onViewDetails={onViewDetails}
                onDownloadPDF={onDownloadPDF}
                onChangeStatus={onChangeStatus}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
