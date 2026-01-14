'use client';

import { PedidoPendiente } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Edit3, Copy } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface PendingOrderCardProps {
  pedido: PedidoPendiente;
  onEdit?: (pedido: PedidoPendiente) => void;
  onDelete?: (pedidoId: string) => void;
  onDuplicate?: (pedido: PedidoPendiente) => void;
  onChangeContext?: (pedido: PedidoPendiente) => void;
  isSelected?: boolean;
  onSelect?: (pedidoId: string, selected: boolean) => void;
}

export function PendingOrderCard({
  pedido,
  onEdit,
  onDelete,
  onDuplicate,
  onChangeContext,
  isSelected = false,
  onSelect,
}: PendingOrderCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 bg-blue-50'
          : 'hover:shadow-md'
      }`}
      onClick={() => onSelect?.(pedido.id, !isSelected)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">
                {formatDate(pedido.fecha_entrega)}
              </h3>
              <Badge variant="outline" className="text-xs">
                {pedido.localizacion}
              </Badge>
              <Badge
                variant={pedido.solicita === 'Sala' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {pedido.solicita}
              </Badge>
            </div>
          </div>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect?.(pedido.id, e.target.checked);
            }}
            className="w-4 h-4 rounded border-gray-300"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Items preview */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">
            {pedido.cantidad_articulos} artículos • {Math.round(pedido.cantidad_unidades)} unidades
          </p>
          <div className="max-h-24 overflow-y-auto space-y-1">
            {pedido.items.slice(0, 5).map((item) => (
              <div key={item.id || item.itemCode} className="text-xs text-gray-700 flex justify-between">
                <span className="truncate">{item.description}</span>
                <span className="ml-2 whitespace-nowrap font-medium">
                  x{item.cantidad}
                </span>
              </div>
            ))}
            {pedido.items.length > 5 && (
              <p className="text-xs text-gray-500">
                +{pedido.items.length - 5} más...
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
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(pedido);
            }}
          >
            <Edit3 className="w-3 h-3 mr-1" />
            Editar
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8"
            onClick={(e) => {
              e.stopPropagation();
              onChangeContext?.(pedido);
            }}
          >
            <Copy className="w-3 h-3 mr-1" />
            Cambiar contexto
          </Button>

          <Button
            size="sm"
            variant="destructive"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(pedido.id);
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
