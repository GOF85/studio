
'use client';

import { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, Trash2, Minus, Plus } from 'lucide-react';

import type { PedidoEntregaItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { useFormContext } from 'react-hook-form';

interface DeliveryOrderSummaryProps {
  items: PedidoEntregaItem[];
  onUpdateItems: (items: PedidoEntregaItem[]) => void;
  isEditing: boolean;
}

export function DeliveryOrderSummary({ items, onUpdateItems, isEditing }: DeliveryOrderSummaryProps) {
  const { toast } = useToast();

  const onUpdateQuantity = (itemId: string, quantity: number) => {
    let newItems: PedidoEntregaItem[];
    if (quantity <= 0) {
      newItems = items.filter(i => i.id !== itemId);
    } else {
      newItems = items.map(i => i.id === itemId ? { ...i, quantity } : i);
    }
    onUpdateItems(newItems);
  };

  const onClearOrder = () => {
    onUpdateItems([]);
  };

  const { costeTotal, pvpTotal } = useMemo(() => {
    let coste = 0;
    let pvp = 0;
    
    items.forEach(item => {
        coste += (item.coste || 0) * (item.quantity || 0);
        pvp += (item.pvp || 0) * (item.quantity || 0);
    });

    return { costeTotal: coste, pvpTotal: pvp };
  }, [items]);
  
  return (
    <Card className="sticky top-24 h-[calc(100vh-7rem)] flex flex-col">
      <CardHeader className="flex-grow-0 flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-headline">Resumen del Hito</CardTitle>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearOrder} aria-label="Vaciar hito">
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
              <p className="font-medium">Hito vacío</p>
              <p className="text-sm">Añade productos desde el catálogo para empezar.</p>
            </div>
          ) : (
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4">
                    <div className="flex-grow">
                      <p className="font-medium leading-tight">{item.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        PVP: {formatCurrency(item.pvp)}
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
