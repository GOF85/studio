'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PedidoEnviado } from '@/types';
import { formatDate } from '@/lib/utils';

interface SentOrderDetailsModalProps {
  isOpen: boolean;
  pedido: PedidoEnviado | null;
  onClose: () => void;
}

export function SentOrderDetailsModal({
  isOpen,
  pedido,
  onClose,
}: SentOrderDetailsModalProps) {
  if (!pedido) return null;

  const estadoColors: Record<string, string> = {
    'En preparación': 'bg-amber-100 text-amber-800',
    'Listo': 'bg-emerald-100 text-emerald-800',
    'Cancelado': 'bg-red-100 text-red-800',
    'Entregado': 'bg-blue-100 text-blue-800',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-96 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles del pedido enviado</DialogTitle>
          <DialogDescription>
            ID: {pedido.id.substring(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <p className="text-xs text-gray-600 mb-1">Número de pedido</p>
              <p className="font-bold text-lg text-blue-600">{pedido.numero_pedido || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Fecha de entrega</p>
              <p className="font-semibold text-gray-900">
                {formatDate(pedido.fecha_entrega)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Hora de entrega</p>
              <p className="font-semibold text-gray-900">
                {(pedido as any).hora_entrega || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Localización</p>
              <p className="font-semibold text-gray-900">{pedido.localizacion}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Estado</p>
              <Badge className={estadoColors[pedido.estado] || ''}>
                {pedido.estado}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Espacio</p>
              <p className="font-semibold text-gray-900">
                {pedido.nombre_espacio || 'N/A'}
              </p>
            </div>
            {pedido.direccion_espacio && (
              <div className="col-span-2">
                <p className="text-xs text-gray-600 mb-1">Dirección</p>
                <p className="text-sm text-gray-900">{pedido.direccion_espacio}</p>
              </div>
            )}
          </div>

          {/* Pickup info if available */}
          {(pedido as any).fecha_recogida && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm font-bold text-orange-900 mb-3">📍 Información de Recogida</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Fecha</p>
                  <p className="font-medium text-gray-900">
                    {formatDate((pedido as any).fecha_recogida)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Hora</p>
                  <p className="font-medium text-gray-900">
                    {(pedido as any).hora_recogida || 'N/A'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-600 mb-1">Lugar</p>
                  <p className="font-medium text-gray-900">
                    {(pedido as any).lugar_recogida || 'No especificado'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Economic Summary - NEW */}
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <p className="text-sm font-bold text-emerald-900 mb-3">Resumen Económico</p>
            <div className="space-y-2">
              {pedido.items.map((item) => {
                const itemPrice = (item as any).priceSnapshot || (item as any).price || 0;
                const itemTotal = itemPrice * ((item as any).cantidad || 0);
                return (
                  <div key={(item as any).itemCode || (item as any).id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{(item as any).description}</span>
                    <span className="font-medium text-gray-900">
                      {itemPrice.toFixed(2)}€ × {(item as any).cantidad} = {itemTotal.toFixed(2)}€
                    </span>
                  </div>
                );
              })}
              <div className="border-t border-emerald-200 pt-2 mt-2">
                <div className="flex justify-between font-bold text-emerald-900">
                  <span>TOTAL:</span>
                  <span>
                    {pedido.items
                      .reduce((sum, item) => {
                        const itemPrice = (item as any).priceSnapshot || (item as any).price || 0;
                        return sum + itemPrice * ((item as any).cantidad || 0);
                      }, 0)
                      .toFixed(2)}€
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Responsables info - IMPROVED */}
          <div className="space-y-3">
            {pedido.responsable_metre && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs font-bold text-amber-900 mb-2">📞 MAÎTRE</p>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-gray-600">Nombre:</span>{' '}
                    <span className="font-medium">{pedido.responsable_metre}</span>
                  </p>
                  {pedido.telefono_metre && (
                    <p>
                      <span className="text-gray-600">Teléfono:</span>{' '}
                      <span className="font-medium font-mono">{pedido.telefono_metre}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
            {pedido.responsable_pase && (
              <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
                <p className="text-xs font-bold text-violet-900 mb-2">👤 PASE</p>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-gray-600">Nombre:</span>{' '}
                    <span className="font-medium">{pedido.responsable_pase}</span>
                  </p>
                  {pedido.telefono_pase && (
                    <p>
                      <span className="text-gray-600">Teléfono:</span>{' '}
                      <span className="font-medium font-mono">{pedido.telefono_pase}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <p className="text-sm font-medium text-gray-900 mb-3">
              Artículos ({pedido.items.length})
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {pedido.items.map((item) => (
                <div
                  key={item.id || item.itemCode}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
                >
                  <span className="text-gray-900">{item.description}</span>
                  <span className="font-medium text-gray-700">
                    x{item.cantidad}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Comments */}
          {pedido.comentario_pedido && (
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Comentarios</p>
              <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded">
                {pedido.comentario_pedido}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-gray-500 space-y-1 pt-4 border-t">
            <p>Consolidado: {formatDate(pedido.fecha_consolidacion)}</p>
            {pedido.fecha_envio_pdf && (
              <p>Enviado: {formatDate(pedido.fecha_envio_pdf)}</p>
            )}
            <p>
              Pedidos origen: {pedido.pedidos_pendientes_ids?.length || 0}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
