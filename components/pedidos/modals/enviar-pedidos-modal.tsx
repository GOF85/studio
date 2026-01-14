'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Package, CheckCircle2 } from 'lucide-react';
import { PedidoPendiente, ConsolidationPreview } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EnviarPedidosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedPedidoIds: string[], preview: ConsolidationPreview[], comentario?: string) => void;
  isLoading?: boolean;
  pedidosPendientes: PedidoPendiente[];
}

export function EnviarPedidosModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  pedidosPendientes = [],
}: EnviarPedidosModalProps) {
  const [selectedPedidoIds, setSelectedPedidoIds] = useState<Set<string>>(new Set());
  const [comentario, setComentario] = useState<string>('');

  // Generar preview de consolidación
  const consolidationPreview = useMemo(() => {
    const selected = pedidosPendientes.filter((p) => selectedPedidoIds.has(p.id));

    // Agrupar por (proveedor_id, fecha_entrega, localizacion)
    // NOTA: Ignora solicita
    const grouped: Record<string, ConsolidationPreview> = {};

    selected.forEach((pedido) => {
      const key = `${pedido.proveedor_id || 'sin-proveedor'}|${pedido.fecha_entrega}|${pedido.localizacion}`;

      if (!grouped[key]) {
        grouped[key] = {
          proveedor_id: pedido.proveedor_id,
          fecha_entrega: pedido.fecha_entrega,
          localizacion: pedido.localizacion,
          items: [],
          subPedidoIds: [],
        };
      }

      grouped[key].items.push(...pedido.items);
      grouped[key].subPedidoIds.push(pedido.id);
    });

    return Object.values(grouped);
  }, [pedidosPendientes, selectedPedidoIds]);

  const totalArticulos = useMemo(() => {
    return consolidationPreview.reduce((sum, group) => sum + group.items.length, 0);
  }, [consolidationPreview]);

  const totalUnidades = useMemo(() => {
    return consolidationPreview.reduce(
      (sum, group) =>
        sum +
        group.items.reduce((itemSum, item) => itemSum + (item.cantidad || 0), 0),
      0
    );
  }, [consolidationPreview]);

  const totalValor = useMemo(() => {
    return consolidationPreview.reduce(
      (sum, group) =>
        sum +
        group.items.reduce(
          (itemSum, item) =>
            itemSum + (item.priceSnapshot || item.price || 0) * (item.cantidad || 0),
          0
        ),
      0
    );
  }, [consolidationPreview]);

  const handleTogglePedido = (pedidoId: string) => {
    const newSelected = new Set(selectedPedidoIds);
    if (newSelected.has(pedidoId)) {
      newSelected.delete(pedidoId);
    } else {
      newSelected.add(pedidoId);
    }
    setSelectedPedidoIds(newSelected);
  };

  const handleSelectAll = (shouldSelect: boolean) => {
    if (shouldSelect) {
      setSelectedPedidoIds(new Set(pedidosPendientes.map((p) => p.id)));
    } else {
      setSelectedPedidoIds(new Set());
    }
  };

  const handleConfirm = () => {
    if (selectedPedidoIds.size > 0) {
      onConfirm(Array.from(selectedPedidoIds), consolidationPreview, comentario);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Enviar Pedidos
          </DialogTitle>
          <DialogDescription>
            Selecciona los sub-pedidos que deseas consolidar y enviar. Se agruparán por
            fecha y localización.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selector de sub-pedidos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-black uppercase tracking-widest">
                Sub-pedidos disponibles ({pedidosPendientes.length})
              </h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[8px]"
                  onClick={() => handleSelectAll(true)}
                >
                  Todos
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[8px]"
                  onClick={() => handleSelectAll(false)}
                >
                  Ninguno
                </Button>
              </div>
            </div>

            <div className="space-y-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
              {pedidosPendientes.length > 0 ? (
                pedidosPendientes.map((pedido) => {
                  const isSelected = selectedPedidoIds.has(pedido.id);
                  const totalValue = pedido.items.reduce(
                    (sum, item) =>
                      sum + (item.priceSnapshot || item.price || 0) * item.cantidad,
                    0
                  );

                  return (
                    <div
                      key={pedido.id}
                      className={`flex items-center gap-3 p-2 rounded border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500/30'
                          : 'bg-muted/20 border-border/40 hover:bg-muted/30'
                      }`}
                      onClick={() => handleTogglePedido(pedido.id)}
                    >
                      <Checkbox checked={isSelected} onChange={() => {}} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold">
                            {format(new Date(pedido.fecha_entrega), 'dd/MM/yyyy', {
                              locale: es,
                            })}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {pedido.localizacion}
                          </span>
                          <Badge variant="outline" className="text-[7px]">
                            {pedido.solicita}
                          </Badge>
                        </div>
                        <p className="text-[9px] text-muted-foreground">
                          {pedido.items.length} artículos • {pedido.cantidad_unidades}{' '}
                          unidades
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black font-mono">
                          {formatCurrency(totalValue)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-[9px] text-muted-foreground italic text-center py-4">
                  No hay sub-pedidos pendientes
                </p>
              )}
            </div>

            <p className="text-[8px] text-muted-foreground mt-2">
              Seleccionados: <span className="font-bold">{selectedPedidoIds.size}</span>
            </p>
          </div>

          {/* Preview de consolidación */}
          {selectedPedidoIds.size > 0 && consolidationPreview.length > 0 && (
            <>
              <div className="border-t pt-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest mb-3">
                  Preview de consolidación
                </h3>

                {/* Alert de cambios */}
                {consolidationPreview.length > 1 && (
                  <Alert className="mb-4 bg-amber-500/5 border-amber-500/20">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-[9px] text-amber-600">
                      Los {selectedPedidoIds.size} sub-pedidos seleccionados se
                      reorganizarán en {consolidationPreview.length} grupo(s) por fecha y
                      localización.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Grupos de consolidación */}
                <div className="space-y-2">
                  {consolidationPreview.map((group, idx) => (
                    <Card key={idx} className="bg-muted/20 border-border/40">
                      <CardHeader className="py-2 px-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span className="text-[10px] font-black">
                              {format(new Date(group.fecha_entrega), 'dd/MM/yyyy', {
                                locale: es,
                              })}{' '}
                              — {group.localizacion}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="py-2 px-3 text-[9px] text-muted-foreground space-y-1">
                        <p>
                          De {group.subPedidoIds.length} sub-pedido(s):{' '}
                          {group.subPedidoIds.join(', ').substring(0, 30)}...
                        </p>
                        <p className="flex gap-3">
                          <span>
                            <strong>{group.items.length}</strong> artículos
                          </span>
                          <span>
                            <strong>
                              {group.items.reduce(
                                (sum, item) => sum + item.cantidad,
                                0
                              )}
                            </strong>{' '}
                            unidades
                          </span>
                          <span>
                            <strong>
                              {formatCurrency(
                                group.items.reduce(
                                  (sum, item) =>
                                    sum +
                                    (item.priceSnapshot || item.price || 0) * item.cantidad,
                                  0
                                )
                              )}
                            </strong>
                          </span>
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Resumen total */}
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardContent className="py-3 px-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-[8px] font-bold uppercase text-blue-600">
                        Grupos
                      </p>
                      <p className="text-lg font-black">{consolidationPreview.length}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold uppercase text-blue-600">
                        Artículos
                      </p>
                      <p className="text-lg font-black">{totalArticulos}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold uppercase text-blue-600">
                        Unidades
                      </p>
                      <p className="text-lg font-black">{totalUnidades}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold uppercase text-blue-600">
                        Valor Total
                      </p>
                      <p className="text-lg font-black font-mono">
                        {formatCurrency(totalValor)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Campo de comentarios */}
              <div className="space-y-2">
                <Label htmlFor="comentario" className="text-[11px] font-black uppercase tracking-widest">
                  Observaciones del Pedido (Opcional)
                </Label>
                <Textarea
                  id="comentario"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Añade comentarios, instrucciones especiales o notas para el proveedor..."
                  className="min-h-[80px] text-[11px]"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedPedidoIds.size === 0 || isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? 'Consolidando...' : 'Generar PDF y Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
