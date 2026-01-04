'use client';

import { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, Trash2, Minus, Plus, Truck, Users, AlertTriangle } from 'lucide-react';

import type { PedidoEntregaItem, EntregaHito, Entrega, Receta } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { useFormContext } from 'react-hook-form';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { cn } from '@/lib/utils';
import { useRecetas } from '@/hooks/use-data-queries';

interface DeliveryOrderSummaryProps {
  entrega: Entrega;
  hito: EntregaHito;
  onUpdateHito: (hito: EntregaHito) => void;
  isEditing: boolean;
}

export function DeliveryOrderSummary({ entrega, hito, onUpdateHito, isEditing }: DeliveryOrderSummaryProps) {
  const { toast } = useToast();
  const { data: allRecetas = [] } = useRecetas();
  const recetasMap = useMemo(() => new Map(allRecetas.map(r => [r.id, r])), [allRecetas]);

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
  
  const handleHorasCamareroChange = (quantity: number) => {
    const newQuantity = Math.max(0, quantity);
    onUpdateHito({ ...hito, horasCamarero: newQuantity });
  };

  const handleObservacionesChange = (observaciones: string) => {
    onUpdateHito({ ...hito, observaciones });
  };

  const onClearOrder = () => {
    onUpdateHito({ ...hito, items: [], portes: 0, horasCamarero: 0, observaciones: '' });
  };

  const { costeTotal, pvpTotalProductos } = useMemo(() => {
    let coste = 0;
    let pvp = 0;
    

    hito.items.forEach(item => {
        coste += (item.coste || 0) * (item.quantity || 0);
        pvp += (item.pvp || 0) * (item.quantity || 0);
    });

    return { costeTotal: coste, pvpTotalProductos: pvp };
  }, [hito.items, recetasMap]);

  const groupedItems = useMemo(() => {
    return hito.items.reduce((acc, item) => {
      const category = item.categoria || 'Varios';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, PedidoEntregaItem[]>);
  }, [hito.items]);

  const costePorte = entrega.tarifa === 'IFEMA' ? 95 : 30;
  const totalPortes = (hito.portes || 0) * costePorte;
  
  const horasCamarero = hito.horasCamarero || 0;
  const horasFacturables = horasCamarero > 0 && horasCamarero < 4 ? 4 : horasCamarero;
  const pvpCamareroHora = entrega.tarifa === 'IFEMA' ? 44.50 : 36.50;
  const costeCamareroHora = 17.50;
  const totalPvpCamarero = horasFacturables * pvpCamareroHora;
  const totalCosteCamarero = horasCamarero * costeCamareroHora;

  const pvpTotalFinal = pvpTotalProductos + totalPortes + totalPvpCamarero;

  return (
    <div className="sticky top-24 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 custom-scrollbar">
        <Card className="flex flex-col theme-orange overflow-hidden">
        <CardHeader className="flex-grow-0 flex-shrink-0 flex flex-row items-center justify-between p-4">
            <CardTitle className="text-xl font-headline">Resumen de la Entrega</CardTitle>
            {hito.items.length > 0 && isEditing && (
            <Button variant="ghost" size="sm" onClick={onClearOrder} aria-label="Vaciar entrega">
                <Trash2 className="h-4 w-4 mr-1" />
                Vaciar
            </Button>
            )}
        </CardHeader>
        <div className="flex-grow min-h-[8rem]">
            <CardContent className="p-4">
            {hito.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 h-full">
                <ShoppingCart className="h-12 w-12 mb-4" />
                <p className="font-medium">Entrega vacía</p>
                <p className="text-sm">Añade productos desde el catálogo para empezar.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {Object.entries(groupedItems).map(([category, items]) => (
                    <div key={category}>
                        <h4 className="font-semibold text-sm mb-2 pb-1 border-b">{category}</h4>
                        <ul className="space-y-1.5">
                        {items.map((item) => (
                            <li key={item.id} className="flex items-center gap-2">
                            <div className="flex-grow">
                                <div className="flex items-center gap-1.5">
                                    {item.referencia && (
                                        <span className="text-[9px] font-black bg-amber-500/10 text-amber-600 px-1 py-0.5 rounded uppercase tracking-widest">
                                            {item.referencia}
                                        </span>
                                    )}
                                    <p className="font-medium leading-tight text-sm">{item.nombre}</p>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                PVP: {formatCurrency(item.pvp)}
                                </p>
                            </div>
                            {isEditing && (
                                <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                                <Input type="number" value={item.quantity} onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 0)} className="h-6 w-10 text-center px-1 text-sm" />
                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                                </div>
                            )}
                            {!isEditing && <span className="font-semibold text-sm">{item.quantity} uds.</span>}
                            </li>
                        ))}
                        </ul>
                    </div>
                    ))}
                </div>
            )}
            </CardContent>
        </div>
        {(hito.items.length > 0 || (hito.portes ?? 0) > 0 || (hito.horasCamarero ?? 0) > 0) && (
            <>
            <Separator />
            <div className="flex-grow-0 flex-shrink-0 p-4 bg-muted/10">
                <div className="mb-2 space-y-2">
                    <Label className="font-semibold text-sm">Servicios Adicionales</Label>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-sm">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span>Portes ({formatCurrency(costePorte)}/ud)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handlePortesChange((hito.portes ?? 0) - 1)}><Minus className="h-3 w-3" /></Button>
                            <Input type="number" value={hito.portes ?? 0} onChange={(e) => handlePortesChange(parseInt(e.target.value) || 0)} className="h-6 w-10 text-center px-1 text-sm" />
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handlePortesChange((hito.portes ?? 0) + 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>Horas de Camarero ({formatCurrency(pvpCamareroHora)}/h)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleHorasCamareroChange((hito.horasCamarero ?? 0) - 1)}><Minus className="h-3 w-3" /></Button>
                            <Input type="number" value={hito.horasCamarero ?? 0} onChange={(e) => handleHorasCamareroChange(parseInt(e.target.value) || 0)} className="h-6 w-10 text-center px-1 text-sm" />
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleHorasCamareroChange((hito.horasCamarero ?? 0) + 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                    </div>
                    {horasCamarero > 0 && horasCamarero < 4 && <p className="text-xs text-amber-600 text-center pt-1">Se facturará el mínimo de 4 horas de servicio.</p>}
                </div>

                <Separator className="my-2"/>

                <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Coste Productos:</span>
                    <span>{formatCurrency(costeTotal)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Coste Serv. Camarero:</span>
                    <span>{formatCurrency(totalCosteCamarero)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-base pt-1 text-primary">
                    <span>PVP Total:</span>
                    <span>{formatCurrency(pvpTotalFinal)}</span>
                </div>
                </div>
            </div>
            </>
            )}
        </Card>
        <Card className={cn("overflow-hidden", horasCamarero > 0 && "border-amber-500 bg-amber-50")}>
            <CardHeader className="py-2">
                <CardTitle className="text-base font-semibold">Observaciones de la Entrega</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <Textarea 
                    value={hito.observaciones || ''}
                    onChange={(e) => handleObservacionesChange(e.target.value)}
                    rows={1}
                    placeholder="Añadir notas sobre la entrega, contacto, etc."
                />
                 {horasCamarero > 0 && (
                    <div className="mt-2 text-xs text-amber-700 font-bold flex items-center gap-2 p-1.5 bg-amber-100 rounded-md">
                        <AlertTriangle className="h-4 w-4" />
                        <span>IMPORTANTE: Rellenar datos para el servicio de camarero.</span>
                    </div>
                 )}
            </CardContent>
        </Card>
    </div>
  );
}
