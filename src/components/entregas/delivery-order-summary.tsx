



'use client';

import { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, Trash2, Minus, Plus, Truck } from 'lucide-react';

import type { PedidoEntregaItem, EntregaHito, Entrega } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { useFormContext } from 'react-hook-form';
import { Label } from '../ui/label';

interface DeliveryOrderSummaryProps {
  entrega: Entrega;
  hito: EntregaHito;
  onUpdateHito: (hito: EntregaHito) => void;
  isEditing: boolean;
}

export function DeliveryOrderSummary({ entrega, hito, onUpdateHito, isEditing }: DeliveryOrderSummaryProps) {
  const { toast } = useToast();

  const onUpdateQuantity = (itemId: string, quantity: number) => {
    let newItems: PedidoEntregaItem[];
    if (quantity <= 0) {
      newItems = hito.items.filter(i => i.id !== itemId);
    } else {
      newItems = hito.items.map(i => i.id === itemId ? { ...i, quantity } : i);
    }
    onUpdateHito({ ...hito, items: newItems });
  };

  const handlePortesChange = (quantity: number) => {
    const newQuantity = Math.max(0, quantity);
    onUpdateHito({ ...hito, portes: newQuantity });
  };

  const onClearOrder = () => {
    onUpdateHito({ ...hito, items: [], portes: 0 });
  };

  const { costeTotal, pvpTotalProductos } = useMemo(() => {
    let coste = 0;
    let pvp = 0;
    
    hito.items.forEach(item => {
        coste += (item.coste || 0) * (item.quantity || 0);
        pvp += (item.pvp || 0) * (item.quantity || 0);
    });

    return { costeTotal: coste, pvpTotalProductos: pvp };
  }, [hito.items]);
  
  const costePorte = entrega.tarifa === 'IFEMA' ? 95 : 30;
  const totalPortes = (hito.portes || 0) * costePorte;
  const pvpTotalFinal = pvpTotalProductos + totalPortes;

  return (
    <Card className="sticky top-24 h-[calc(100vh-7rem)] flex flex-col theme-orange">
      <CardHeader className="flex-grow-0 flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-headline">Resumen de la Entrega</CardTitle>
        {hito.items.length > 0 && isEditing && (
          <Button variant="ghost" size="sm" onClick={onClearOrder} aria-label="Vaciar entrega">
            <Trash2 className="h-4 w-4 mr-1" />
            Vaciar
          </Button>
        )}
      </CardHeader>
      <div className="flex-grow overflow-y-auto">
        <CardContent className="p-4">
          {hito.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10">
              <ShoppingCart className="h-12 w-12 mb-4" />
              <p className="font-medium">Entrega vacía</p>
              <p className="text-sm">Añade productos desde el catálogo para empezar.</p>
            </div>
          ) : (
              <ul className="space-y-4">
                {hito.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4">
                    <div className="flex-grow">
                      <p className="font-medium leading-tight">{item.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        PVP: {formatCurrency(item.pvp)}
                      </p>
                    </div>
                     {isEditing && (
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                        <Input type="number" value={item.quantity} onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 0)} className="h-7 w-12 text-center px-1" />
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                      </div>
                    )}
                    {!isEditing && <span className="font-semibold">{item.quantity} uds.</span>}
                  </li>
                ))}
              </ul>
          )}
        </CardContent>
      </div>
      {(hito.items.length > 0 || hito.portes > 0) && (
        <>
          <Separator />
          <div className="flex-grow-0 flex-shrink-0 p-4">
             <div className="mb-4">
                <Label className="font-semibold text-base">Logística</Label>
                <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-muted-foreground" />
                        <span>Portes ({formatCurrency(costePorte)}/ud)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handlePortesChange((hito.portes || 0) - 1)}><Minus className="h-4 w-4" /></Button>
                        <Input type="number" value={hito.portes || 0} onChange={(e) => handlePortesChange(parseInt(e.target.value) || 0)} className="h-7 w-12 text-center px-1" />
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handlePortesChange((hito.portes || 0) + 1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>

            <Separator className="my-4"/>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Coste Total Producción:</span>
                <span>{formatCurrency(costeTotal)}</span>
              </div>
               <div className="flex justify-between">
                <span>Coste Total Portes:</span>
                <span>{formatCurrency(totalPortes)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-lg pt-2 text-primary">
                <span>PVP Total:</span>
                <span>{formatCurrency(pvpTotalFinal)}</span>
              </div>
            </div>
          </div>
        </>
        )}
    </Card>
  );
}
