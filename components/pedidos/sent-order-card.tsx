'use client';

import { PedidoEnviado } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, FileText, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface SentOrderCardProps {
  pedido: PedidoEnviado;
  onViewDetails?: (pedido: PedidoEnviado) => void;
  onDownloadPDF?: (pedido: PedidoEnviado) => void;
  onChangeStatus?: (pedido: PedidoEnviado) => void;
}

const estadoColors: Record<string, string> = {
  'En preparación': 'bg-amber-100 text-amber-800 border-amber-300',
  'Listo': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Cancelado': 'bg-red-100 text-red-800 border-red-300',
  'Entregado': 'bg-blue-100 text-blue-800 border-blue-300',
};

export function SentOrderCard({
  pedido,
  onViewDetails,
  onDownloadPDF,
  onChangeStatus,
}: SentOrderCardProps) {
  const statusColor = estadoColors[pedido.estado] || 'bg-gray-100 text-gray-800';
  const totalItems = pedido.items.length;
  const totalUnidades = pedido.items.reduce(
    (sum, item) => sum + (item.cantidad || 0),
    0
  );

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">
                {formatDate(pedido.fecha_entrega)}
              </h3>
              <Badge variant="outline" className="text-xs">
                {pedido.localizacion}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {pedido.nombre_espacio || 'Espacio'}
              </span>
            </div>
          </div>
          <Badge className={`${statusColor} border text-xs`}>
            {pedido.estado}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Consolidation info */}
        <div className="bg-gray-50 rounded p-2 text-xs text-gray-600 space-y-1">
          <div>
            <span className="font-medium">ID PDF:</span>{' '}
            <span className="font-mono text-gray-500">
              {pedido.id.substring(0, 8)}
            </span>
          </div>
          <div>
            <span className="font-medium">Pedidos consolidados:</span>{' '}
            {pedido.pedidos_pendientes_ids?.length || 0}
          </div>
          {pedido.fecha_envio_pdf && (
            <div>
              <span className="font-medium">Enviado:</span>{' '}
              {formatDate(pedido.fecha_envio_pdf)}
            </div>
          )}
        </div>

        {/* Items summary */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">
            {totalItems} artículos • {Math.round(totalUnidades)} unidades
          </p>
          <div className="max-h-20 overflow-y-auto space-y-1">
            {pedido.items.slice(0, 4).map((item) => (
              <div
                key={item.id || item.itemCode}
                className="text-xs text-gray-700 flex justify-between"
              >
                <span className="truncate">{item.description}</span>
                <span className="ml-2 whitespace-nowrap font-medium">
                  x{item.cantidad}
                </span>
              </div>
            ))}
            {totalItems > 4 && (
              <p className="text-xs text-gray-500">
                +{totalItems - 4} más...
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8"
            onClick={() => onViewDetails?.(pedido)}
          >
            <Eye className="w-3 h-3 mr-1" />
            Detalles
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8"
            onClick={() => onDownloadPDF?.(pedido)}
          >
            <Download className="w-3 h-3 mr-1" />
            PDF
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onChangeStatus?.(pedido)}
            title={`Cambiar estado de ${pedido.estado}`}
          >
            <FileText className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
