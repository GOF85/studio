'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Package, ShoppingBag, Factory, Truck } from 'lucide-react';
import type { Entrega, PedidoEntrega, ProductoVenta, IngredienteERP, PickingEntregaState, EntregaHito } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { formatUnit } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type PickingItem = {
    id: string;
    nombre: string;
    cantidad: number;
    unidad: string;
    origen: 'CPR' | 'Partner' | 'Almacén';
    checked: boolean;
};

export default function PickingEntregaPage() {
    const [entrega, setEntrega] = useState<Entrega | null>(null);
    const [hito, setHito] = useState<EntregaHito | null>(null);
    const [pickingList, setPickingList] = useState<PickingItem[]>([]);
    const [pickingState, setPickingState] = useState<PickingEntregaState>({ hitoId: '', checkedItems: new Set() });
    const [isMounted, setIsMounted] = useState(false);
    
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const hitoId = params.id as string;
    const osId = searchParams.get('osId');
    const { toast } = useToast();

    const loadData = useCallback(() => {
        if (!osId || !hitoId) return;

        const allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
        const currentEntrega = allEntregas.find(e => e.id === osId);
        setEntrega(currentEntrega || null);
        
        const allPedidos = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const currentPedido = allPedidos.find(p => p.osId === osId);
        const currentHito = currentPedido?.hitos.find(h => h.id === hitoId);
        setHito(currentHito || null);

        const allProductosVenta = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
        const productosMap = new Map(allProductosVenta.map(p => [p.id, p]));

        const allErpItems = JSON.parse(localStorage.getItem('ingredientesERP') || '[]') as IngredienteERP[];
        const erpMap = new Map(allErpItems.map(i => [i.id, i]));
        
        const allPickingStates = JSON.parse(localStorage.getItem('pickingEntregasState') || '{}') as Record<string, {hitoId: string, checkedItems: string[]}>;
        const savedState = allPickingStates[hitoId];
        const checkedItemsSet = savedState ? new Set(savedState.checkedItems) : new Set<string>();

        if (currentHito) {
            const items: PickingItem[] = [];
            
            currentHito.items.forEach(item => {
                const producto = productosMap.get(item.id);
                if (!producto) return;

                const baseId = `prod_${producto.id}`;
                if (producto.producidoPorPartner) {
                    items.push({
                        id: baseId,
                        nombre: producto.nombre,
                        cantidad: item.quantity,
                        unidad: 'Uds',
                        origen: 'Partner',
                        checked: checkedItemsSet.has(baseId),
                    });
                } else if (producto.recetaId) {
                    items.push({
                        id: baseId,
                        nombre: producto.nombre,
                        cantidad: item.quantity,
                        unidad: 'Uds',
                        origen: 'CPR',
                        checked: checkedItemsSet.has(baseId),
                    });
                } else {
                    producto.componentes.forEach(comp => {
                        const erpItem = erpMap.get(comp.erpId);
                        if (erpItem) {
                            const existingItemIndex = items.findIndex(i => i.id === erpItem.id);
                            const quantityToAdd = comp.cantidad * item.quantity;
                            if (existingItemIndex > -1) {
                                items[existingItemIndex].cantidad += quantityToAdd;
                            } else {
                                items.push({
                                    id: erpItem.id,
                                    nombre: erpItem.nombreProductoERP,
                                    cantidad: quantityToAdd,
                                    unidad: erpItem.unidad,
                                    origen: 'Almacén',
                                    checked: checkedItemsSet.has(erpItem.id),
                                });
                            }
                        }
                    });
                }
            });
            setPickingList(items);
        }
        
        setPickingState({ hitoId, checkedItems: checkedItemsSet });
        setIsMounted(true);
    }, [osId, hitoId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCheckItem = (itemId: string, isChecked: boolean) => {
        const newCheckedItems = new Set(pickingState.checkedItems);
        if (isChecked) {
            newCheckedItems.add(itemId);
        } else {
            newCheckedItems.delete(itemId);
        }
        const newState = { ...pickingState, checkedItems: newCheckedItems };
        setPickingState(newState);

        // Save to localStorage
        const allStates = JSON.parse(localStorage.getItem('pickingEntregasState') || '{}');
        allStates[hitoId] = { hitoId, checkedItems: Array.from(newCheckedItems) };
        localStorage.setItem('pickingEntregasState', JSON.stringify(allStates));
        
        // Update the list visually
        setPickingList(prev => prev.map(item => item.id === itemId ? { ...item, checked: isChecked } : item));
    };
    
    const groupedItems = useMemo(() => {
        const groups: Record<PickingItem['origen'], PickingItem[]> = {
            'Almacén': [],
            'CPR': [],
            'Partner': [],
        };
        pickingList.forEach(item => {
            groups[item.origen].push(item);
        });
        return groups;
    }, [pickingList]);

    if (!isMounted || !entrega || !hito) {
        return <LoadingSkeleton title="Cargando Hoja de Picking..." />;
    }
    
    const renderSection = (title: string, items: PickingItem[], icon: React.ReactNode) => (
        items.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">{icon} {title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        {items.map(item => (
                            <li key={item.id} className="flex items-center p-2 rounded-md hover:bg-secondary">
                                <Checkbox
                                    id={`item-${item.id}`}
                                    checked={item.checked}
                                    onCheckedChange={(checked) => handleCheckItem(item.id, !!checked)}
                                    className="h-5 w-5 mr-4"
                                />
                                <Label htmlFor={`item-${item.id}`} className="flex-grow text-base">
                                    {item.nombre}
                                </Label>
                                <span className="font-mono font-semibold text-lg">{item.cantidad.toFixed(2)}</span>
                                <span className="text-sm text-muted-foreground w-12 text-right">{formatUnit(item.unidad)}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        )
    );

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/entregas/picking')} className="mb-2">
                        <ArrowLeft className="mr-2" /> Volver al listado
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <Package /> Hoja de Picking: {entrega.serviceNumber}.{(hito.id.slice(-2))}
                    </h1>
                    <CardDescription>
                        Cliente: {entrega.client} | Fecha: {format(new Date(hito.fecha), 'dd/MM/yyyy')} | Hora: {hito.hora}
                    </CardDescription>
                </div>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-8 mt-6">
                {renderSection('Recoger de Almacén', groupedItems['Almacén'], <ShoppingBag />)}
                {renderSection('Recoger de Producción CPR', groupedItems['CPR'], <Factory />)}
                {renderSection('Recepcionar del Partner', groupedItems['Partner'], <Truck />)}
            </div>
        </main>
    );
}
