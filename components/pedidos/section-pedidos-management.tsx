'use client';

import { useState } from 'react';
import { usePedidosPendientes } from '@/hooks/use-pedidos-pendientes';
import { usePedidosEnviados } from '@/hooks/use-pedidos-enviados';
import { PendingOrdersList } from './pending-orders-list';
import { SentOrdersList } from './sent-orders-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PedidoPendiente, PedidoEnviado } from '@/types';

interface PedidosManagementSectionProps {
  osId: string;
  onEditPendiente?: (pedido: PedidoPendiente) => void;
  onDeletePendiente?: (pedidoId: string) => void;
  onCreateNew?: () => void;
  onGeneratePDF?: (selectedIds: string[]) => void;
  onViewDetails?: (pedido: PedidoEnviado) => void;
  onDownloadPDF?: (pedido: PedidoEnviado) => void;
}

export function PedidosManagementSection({
  osId,
  onEditPendiente,
  onDeletePendiente,
  onCreateNew,
  onGeneratePDF,
  onViewDetails,
  onDownloadPDF,
}: PedidosManagementSectionProps) {
  const [activeTab, setActiveTab] = useState<'pendientes' | 'enviados'>('pendientes');

  // Queries
  const {
    data: pendidosPendientes = [],
    isLoading: isPendientesLoading,
  } = usePedidosPendientes(osId);

  const {
    data: pedidosEnviados = [],
    isLoading: isEnviadosLoading,
  } = usePedidosEnviados(osId);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as 'pendientes' | 'enviados')}
      className="w-full"
    >
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="pendientes" className="relative">
          Pendientes
          {pendidosPendientes.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-blue-600 rounded-full">
              {pendidosPendientes.length}
            </span>
          )}
        </TabsTrigger>

        <TabsTrigger value="enviados" className="relative">
          Enviados
          {pedidosEnviados.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-emerald-600 rounded-full">
              {pedidosEnviados.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pendientes" className="space-y-4 mt-4">
        <PendingOrdersList
          pedidos={pendidosPendientes}
          isLoading={isPendientesLoading}
          onEdit={onEditPendiente}
          onDelete={onDeletePendiente}
          onCreateNew={onCreateNew}
          onGeneratePDF={onGeneratePDF}
        />
      </TabsContent>

      <TabsContent value="enviados" className="space-y-4 mt-4">
        <SentOrdersList
          pedidos={pedidosEnviados}
          isLoading={isEnviadosLoading}
          onViewDetails={onViewDetails}
          onDownloadPDF={onDownloadPDF}
        />
      </TabsContent>
    </Tabs>
  );
}
