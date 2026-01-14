import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PedidoItem } from '@/types/pedidos';
import { Trash2, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface EditItemsModalProps {
  isOpen: boolean;
  items: PedidoItem[];
  onClose: () => void;
  onSave: (items: PedidoItem[]) => void;
  isLoading?: boolean;
}

export function EditItemsModal({
  isOpen,
  items: initialItems,
  onClose,
  onSave,
  isLoading = false,
}: EditItemsModalProps) {
  const [items, setItems] = useState<PedidoItem[]>(initialItems);

  // Update items when initialItems changes
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleQuantityChange = (id: string | undefined, newQuantity: number) => {
    if (!id) return;
    setItems(
      items.map((i) =>
        i.id === id
          ? { ...i, cantidad: Math.max(1, newQuantity) }
          : i
      )
    );
  };

  const handleRemoveItem = (id: string | undefined) => {
    if (!id) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    onSave(items);
    onClose();
  };

  const totalValue = items.reduce(
    (sum, item) => sum + ((item.priceSnapshot || item.price || 0) * item.cantidad),
    0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto bg-background/95 backdrop-blur-md border-border/40">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-black uppercase tracking-widest">Editar Artículos del Pedido</DialogTitle>
          <DialogDescription className="text-[12px]">
            Solo puedes modificar la cantidad. Los datos del artículo (foto, categoría, precio) son fijos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {items.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 p-3 bg-muted/30 rounded border border-border/40"
                >
                  {/* Foto */}
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.description}
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}

                  {/* Info + Editable cantidad */}
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-start gap-2 justify-between">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-tight">
                          {item.description}
                        </p>
                        {item.subcategoria && (
                          <Badge className="text-[7px] mt-1" variant="secondary">
                            {item.subcategoria}
                          </Badge>
                        )}
                      </div>
                      {/* Eliminar item */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>

                    {/* Cantidad editable + precio */}
                    <div className="flex items-center gap-2 text-[9px]">
                      <span className="text-muted-foreground min-w-fit">
                        {formatCurrency(item.priceSnapshot || item.price || 0)} ×
                      </span>
                      <Input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) =>
                          handleQuantityChange(item.id, parseInt(e.target.value) || 1)
                        }
                        className="h-6 w-12 text-[9px] text-center px-1"
                      />
                      <span className="text-muted-foreground min-w-fit">=</span>
                      <span className="font-black text-[9px] min-w-fit">
                        {formatCurrency((item.priceSnapshot || item.price || 0) * item.cantidad)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-muted-foreground text-[11px]">
              No hay artículos en este pedido
            </div>
          )}
        </div>

        {/* Total */}
        {items.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/40 flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase">Total del Pedido</span>
            <span className="text-[12px] font-black">
              {formatCurrency(totalValue)}
            </span>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} className="text-[10px]">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || items.length === 0}
            className="text-[10px]"
          >
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
