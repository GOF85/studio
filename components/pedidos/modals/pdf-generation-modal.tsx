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
import { PedidoPendiente } from '@/types';
import { FileText, AlertCircle } from 'lucide-react';

interface PDFGenerationModalProps {
  isOpen: boolean;
  selectedPedidos: PedidoPendiente[];
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  consolidationPreview?: Array<{
    fecha: string;
    localizacion: string;
    totalArticulos: number;
    totalUnidades: number;
  }>;
}

export function PDFGenerationModal({
  isOpen,
  selectedPedidos,
  onClose,
  onConfirm,
  isLoading = false,
  consolidationPreview,
}: PDFGenerationModalProps) {
  // Calculate consolidation automatically
  const grouped = selectedPedidos.reduce(
    (acc, pedido) => {
      const key = `${pedido.fecha_entrega}|${pedido.localizacion}`;
      if (!acc[key]) {
        acc[key] = {
          fecha: pedido.fecha_entrega,
          localizacion: pedido.localizacion,
          items: [],
          pedidos: [],
        };
      }
      acc[key].items.push(...pedido.items);
      acc[key].pedidos.push(pedido);
      return acc;
    },
    {} as Record<
      string,
      {
        fecha: string;
        localizacion: string;
        items: any[];
        pedidos: PedidoPendiente[];
      }
    >
  );

  const consolidationGroups = Object.values(grouped);
  const totalArticulos = consolidationGroups.reduce(
    (sum, g) => sum + g.items.length,
    0
  );
  const totalUnidades = consolidationGroups.reduce(
    (sum, g) => sum + g.items.reduce((s, i) => s + (i.cantidad || 0), 0),
    0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Confirmar generación de PDF
          </DialogTitle>
          <DialogDescription>
            Revisa el consolidado antes de generar el PDF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Summary */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-blue-600 font-medium">
                  Pedidos seleccionados
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {selectedPedidos.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">
                  Consolidados a
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {consolidationGroups.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">
                  Total de artículos
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {totalArticulos}
                </p>
              </div>
            </div>
          </div>

          {/* Consolidation preview */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              Consolidación por fecha y localización:
            </p>
            {consolidationGroups.map((group, idx) => {
              const totalItems = group.items.length;
              const totalQty = group.items.reduce(
                (sum, i) => sum + (i.cantidad || 0),
                0
              );
              return (
                <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {group.fecha} • {group.localizacion}
                  </p>
                  <p className="text-xs text-gray-600">
                    {group.pedidos.length} pedidos →{' '}
                    <span className="font-semibold">
                      {totalItems} artículos ({totalQty} unidades)
                    </span>
                  </p>
                  <div className="mt-1 text-xs text-gray-500 space-y-1">
                    {group.pedidos.map((p) => (
                      <div key={p.id} className="pl-2">
                        • {p.solicita}: {p.cantidad_articulos} art.
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warning */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Los pedidos de <strong>Sala y Cocina</strong> se consolidarán en
              un único documento para la misma fecha y localización.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading || consolidationGroups.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Generando PDF...' : `Generar ${consolidationGroups.length} PDF`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
