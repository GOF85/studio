'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PedidoEnviado, PedidoItem } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ChevronDown, ChevronUp, Save, Edit2, Trash2, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EditableSentOrderDetailsModalProps {
  isOpen: boolean;
  pedido: PedidoEnviado | null;
  onClose: () => void;
  onSave?: (updates: Partial<PedidoEnviado>) => Promise<void>;
  isLoading?: boolean;
}

// Direcciones de Instalaciones disponibles
const INSTALACIONES_ADDRESSES = [
  'C/ Mallorca, 1, 28703 San Sebastián de los Reyes, Madrid',
  'C/ Isla de Palma, 4, 28703 San Sebastián de los Reyes, Madrid',
];

export function EditableSentOrderDetailsModal({
  isOpen,
  pedido,
  onClose,
  onSave,
  isLoading = false,
}: EditableSentOrderDetailsModalProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<PedidoEnviado> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (!pedido) return null;

  const estadoColors: Record<string, string> = {
    'En preparación': 'bg-amber-100 text-amber-800',
    'Listo': 'bg-emerald-100 text-emerald-800',
  };

  const totalValue = useMemo(
    () =>
      pedido.items.reduce((sum, item) => {
        const price = (item as any).priceSnapshot || (item as any).price || 0;
        return sum + price * ((item as any).cantidad || 0);
      }, 0),
    [pedido.items]
  );

  const handleEditStart = () => {
    setEditData({
      fecha_entrega: pedido.fecha_entrega,
      hora_entrega: pedido.hora_entrega,
      localizacion: pedido.localizacion,
      fecha_recogida: (pedido as any).fecha_recogida,
      hora_recogida: (pedido as any).hora_recogida,
      lugar_recogida: (pedido as any).lugar_recogida,
      direccion_instalaciones: (pedido as any).direccion_instalaciones || INSTALACIONES_ADDRESSES[0],
      items: pedido.items,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editData || !onSave) return;

    try {
      await onSave(editData);
      setIsEditing(false);
      setEditData(null);
      toast({
        title: 'Pedido actualizado',
        description: 'Se registrará quién realizó los cambios',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(null);
  };

  const handleRemoveItem = (itemCode: string) => {
    if (!editData) return;
    setEditData({
      ...editData,
      items: editData.items?.filter((item) => item.itemCode !== itemCode),
    });
  };

  const recogidaAddress = (pedido as any).lugar_recogida === 'Instalaciones' 
    ? ((editData as any)?.direccion_instalaciones || (pedido as any).direccion_instalaciones || INSTALACIONES_ADDRESSES[0])
    : pedido.direccion_espacio;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-md border-border/40">
        <DialogHeader className="sticky top-0 bg-background/95 z-10 pb-4 border-b border-border/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-widest">
                Pedido Enviado #{pedido.numero_pedido || 'N/A'}
              </DialogTitle>
              <DialogDescription>
                ID: {pedido.id.substring(0, 8)} • OS: {pedido.numero_expediente}
              </DialogDescription>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-1">
          {/* Estado Badge */}
          <div className="flex gap-2 items-center">
            <Badge className={estadoColors[pedido.estado] || ''}>
              {pedido.estado}
            </Badge>
            <Badge variant="outline">
              {pedido.items.length} artículos
            </Badge>
          </div>

          {/* Entrega Section - EXPANDIBLE */}
          <div className="border border-border/40 rounded-lg overflow-hidden">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between bg-blue-500/5 hover:bg-blue-500/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-black uppercase tracking-wider text-blue-600">
                  📦 ENTREGA DE MATERIAL
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {isExpanded && (
              <div className="px-4 py-4 space-y-4 bg-blue-500/2 border-t border-border/40">
                {!isEditing ? (
                  <>
                    {/* Display Mode */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">Fecha</p>
                        <p className="text-sm font-semibold">{formatDate(pedido.fecha_entrega)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">Hora</p>
                        <p className="text-sm font-mono font-semibold">{pedido.hora_entrega || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Localización</p>
                        <p className="text-sm font-semibold">{pedido.localizacion}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Dirección</p>
                      <p className="text-sm leading-relaxed bg-muted/30 p-3 rounded border border-border/40">
                        {pedido.direccion_espacio}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Edit Mode */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-bold uppercase">Fecha</label>
                          <Input
                            type="date"
                            value={editData?.fecha_entrega || ''}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                fecha_entrega: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Hora</label>
                          <Input
                            type="time"
                            value={editData?.hora_entrega || ''}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                hora_entrega: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Localización</label>
                          <Input
                            value={editData?.localizacion || ''}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                localizacion: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Recogida Section - EXPANDIBLE */}
          {(pedido as any).fecha_recogida && (
            <div className="border border-border/40 rounded-lg overflow-hidden">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between bg-orange-500/5 hover:bg-orange-500/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black uppercase tracking-wider text-orange-600">
                    📍 RECOGIDA DE MATERIAL
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 py-4 space-y-4 bg-orange-500/2 border-t border-border/40">
                  {!isEditing ? (
                    <>
                      {/* Display Mode */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase">Fecha</p>
                          <p className="text-sm font-semibold">
                            {formatDate((pedido as any).fecha_recogida)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase">Hora</p>
                          <p className="text-sm font-mono font-semibold">
                            {(pedido as any).hora_recogida || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase">Lugar</p>
                          <p className="text-sm font-semibold">
                            {(pedido as any).lugar_recogida || 'No especificado'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Dirección</p>
                        <p className="text-sm leading-relaxed bg-muted/30 p-3 rounded border border-border/40">
                          {recogidaAddress}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Edit Mode */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-bold uppercase">Fecha Recogida</label>
                            <Input
                              type="date"
                              value={editData?.fecha_recogida || ''}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  fecha_recogida: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase">Hora Recogida</label>
                            <Input
                              type="time"
                              value={editData?.hora_recogida || ''}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  hora_recogida: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase">Lugar Recogida</label>
                            <Select
                              value={editData?.lugar_recogida || 'Evento'}
                              onValueChange={(value) =>
                                setEditData({
                                  ...editData,
                                  lugar_recogida: value as 'Evento' | 'Instalaciones',
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Evento">En Evento</SelectItem>
                                <SelectItem value="Instalaciones">En Instalaciones</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {/* Selector de dirección de Instalaciones si está seleccionado */}
                        {editData?.lugar_recogida === 'Instalaciones' && (
                          <div>
                            <label className="text-xs font-bold uppercase">Dirección de Instalaciones</label>
                            <Select
                              value={editData?.direccion_instalaciones || INSTALACIONES_ADDRESSES[0]}
                              onValueChange={(value) =>
                                setEditData({
                                  ...editData,
                                  direccion_instalaciones: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {INSTALACIONES_ADDRESSES.map((addr, idx) => (
                                  <SelectItem key={idx} value={addr}>
                                    {addr}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Items Section */}
          <div className="border border-border/40 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-emerald-500/5 border-b border-border/40">
              <p className="text-sm font-black uppercase tracking-wider text-emerald-600">
                📋 Artículos ({pedido.items.length})
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-black uppercase">Artículo</TableHead>
                    <TableHead className="text-xs font-black uppercase text-center">Cantidad</TableHead>
                    <TableHead className="text-xs font-black uppercase text-right">Precio Unit.</TableHead>
                    <TableHead className="text-xs font-black uppercase text-right">Total</TableHead>
                    {isEditing && <TableHead className="text-xs font-black uppercase text-center">Acción</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(editData?.items || pedido.items).map((item, idx) => {
                    const price = (item as any).priceSnapshot || (item as any).price || 0;
                    const itemTotal = price * ((item as any).cantidad || 0);
                    return (
                      <TableRow key={idx} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-center font-mono">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={(item as any).cantidad || 0}
                              onChange={(e) => {
                                const newItems = [...(editData?.items || pedido.items)];
                                newItems[idx] = {
                                  ...newItems[idx],
                                  cantidad: parseInt(e.target.value) || 0,
                                };
                                setEditData({ ...editData, items: newItems });
                              }}
                              className="w-16 text-center"
                              min="0"
                            />
                          ) : (
                            (item as any).cantidad
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(price)}</TableCell>
                        <TableCell className="text-right font-bold font-mono">{formatCurrency(itemTotal)}</TableCell>
                        {isEditing && (
                          <TableCell className="text-center">
                            <button
                              onClick={() => setDeleteConfirm(item.itemCode)}
                              className="p-1 hover:bg-red-500/10 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Totales */}
            <div className="px-4 py-3 bg-muted/30 border-t border-border/40 flex justify-between items-center font-bold">
              <span>TOTAL</span>
              <span className="text-lg">{formatCurrency(editData?.items ? editData.items.reduce((sum, item) => sum + ((item as any).priceSnapshot || (item as any).price || 0) * ((item as any).cantidad || 0), 0) : totalValue)}</span>
            </div>
          </div>

          {/* Responsables Info */}
          <div className="grid grid-cols-2 gap-3">
            {pedido.responsable_metre && (
              <div className="p-3 bg-amber-50 dark:bg-amber-500/5 rounded-lg border border-amber-200/50">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-600 uppercase mb-1">Maître</p>
                <p className="text-sm font-medium">{pedido.responsable_metre}</p>
                {pedido.telefono_metre && (
                  <p className="text-xs font-mono text-muted-foreground">{pedido.telefono_metre}</p>
                )}
              </div>
            )}
            {pedido.responsable_pase && (
              <div className="p-3 bg-violet-50 dark:bg-violet-500/5 rounded-lg border border-violet-200/50">
                <p className="text-xs font-bold text-violet-900 dark:text-violet-600 uppercase mb-1">Pase</p>
                <p className="text-sm font-medium">{pedido.responsable_pase}</p>
                {pedido.telefono_pase && (
                  <p className="text-xs font-mono text-muted-foreground">{pedido.telefono_pase}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="sticky bottom-0 bg-background/95 border-t border-border/40 pt-4 mt-6">
          {!isEditing ? (
            <Button
              onClick={handleEditStart}
              className="gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Editar Pedido
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? (
                  <>Guardando...</>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Artículo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este artículo del pedido?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  handleRemoveItem(deleteConfirm);
                  setDeleteConfirm(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
