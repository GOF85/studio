

'use client';

import { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, Trash2, Minus, Plus } from 'lucide-react';

import type { PedidoEntregaItem, MargenCategoria } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { formatCurrency } from '@/lib/utils';

interface DeliveryOrderSummaryProps {
  items: PedidoEntregaItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearOrder: () => void;
}

export function DeliveryOrderSummary({ items, onUpdateQuantity, onRemoveItem, onClearOrder }: DeliveryOrderSummaryProps) {
  const [margenes, setMargenes] = useState<MargenCategoria[]>([]);
  const { toast } = useToast();
  
  useEffect(() => {
    const storedMargenes = JSON.parse(localStorage.getItem('margenesCategoria') || '[]') as MargenCategoria[];
    setMargenes(storedMargenes);
  }, []);

  const { costeTotal, pvpTotal } = useMemo(() => {
    let coste = 0;
    let pvp = 0;
    
    items.forEach(item => {
        const itemCoste = item.coste || 0;
        const itemQuantity = item.quantity || 0;
        coste += itemCoste * itemQuantity;

        let itemPvp = item.pvp || itemCoste;
        
        if (item.type === 'producto') {
            const margenData = margenes.find(m => m.categoria === item.categoria);
            const margen = margenData ? margenData.margen / 100 : 0;
            itemPvp = itemCoste * (1 + margen);
        }
        
        pvp += itemPvp * itemQuantity;
    });

    return { costeTotal: coste, pvpTotal: pvp };
  }, [items, margenes]);
  
  return (
    <Card className="sticky top-24 h-[calc(100vh-7rem)] flex flex-col">
      <CardHeader className="flex-grow-0 flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-headline">Resumen del Pedido</CardTitle>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearOrder} aria-label="Vaciar pedido">
            <Trash2 className="h-4 w-4 mr-1" />
            Vaciar
          </Button>
        )}
      </CardHeader>
      <div className="flex-grow overflow-y-auto">
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10">
              <ShoppingCart className="h-12 w-12 mb-4" />
              <p className="font-medium">Tu pedido está vacío</p>
              <p className="text-sm">Añade artículos desde el catálogo para empezar.</p>
            </div>
          ) : (
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4">
                    <div className="flex-grow">
                      <p className="font-medium leading-tight">{item.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        Coste: {formatCurrency(item.coste)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                      <Input type="number" value={item.quantity} onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 0)} className="h-7 w-12 text-center px-1" />
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
          )}
        </CardContent>
      </div>
      {items.length > 0 && (
          <div className="flex-grow-0 flex-shrink-0 p-6 pt-0">
            <Separator className="my-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Coste Total Producción:</span>
                <span>{formatCurrency(costeTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 text-primary">
                <span>PVP Total:</span>
                <span>{formatCurrency(pvpTotal)}</span>
              </div>
            </div>
          </div>
        )}
    </Card>
  );
}
