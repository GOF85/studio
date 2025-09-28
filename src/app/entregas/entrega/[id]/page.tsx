'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import { format } from 'date-fns';
import type { Entrega, PedidoEntrega, ProductoVenta, EntregaHito, PedidoEntregaItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { UnifiedItemCatalog } from '@/components/entregas/unified-item-catalog';
import { DeliveryOrderSummary } from '@/components/entregas/delivery-order-summary';

export default function ConfeccionarEntregaPage() {
    const [entrega, setEntrega] = useState<Entrega | null>(null);
    const [hito, setHito] = useState<EntregaHito | null>(null);
    const [productosVenta, setProductosVenta] = useState<ProductoVenta[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    
    const router = useRouter();
    const params = useParams();
    const hitoId = params.id as string;
    const searchParams = useSearchParams();
    const osId = searchParams.get('osId');
    const { toast } = useToast();

    const loadData = useCallback(() => {
        if (!osId || !hitoId) return;

        const allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
        const currentEntrega = allEntregas.find(e => e.id === osId);
        setEntrega(currentEntrega || null);
        
        const allPedidos = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const currentPedido = allPedidos.find(p => p.osId === osId);
        const currentHito = currentPedido?.hitos?.find(h => h.id === hitoId);
        
        if (!currentHito) {
            toast({ variant: "destructive", title: "Error", description: "No se encontró el hito de entrega." });
            router.push(`/entregas/pedido/${osId}`);
            return;
        }
        setHito(currentHito);
        
        const allProductosVenta = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
        setProductosVenta(allProductosVenta);

        setIsMounted(true);
    }, [osId, hitoId, router, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
     const handleUpdateHitoItems = (items: PedidoEntregaItem[]) => {
        if (!osId || !hito) return;

        setHito(prevHito => prevHito ? {...prevHito, items} : null);
        
        const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const pedidoIndex = allPedidosEntrega.findIndex(p => p.osId === osId);

        if (pedidoIndex > -1) {
            const hitoIndex = allPedidosEntrega[pedidoIndex].hitos.findIndex(h => h.id === hitoId);
            if(hitoIndex > -1) {
                allPedidosEntrega[pedidoIndex].hitos[hitoIndex].items = items;
                localStorage.setItem('pedidosEntrega', JSON.stringify(allPedidosEntrega));
                toast({ title: 'Hito actualizado' });
            }
        }
    };
    
    const handleAddItem = (item: ProductoVenta, quantity: number) => {
        if(!hito) return;

        const costeComponentes = item.componentes.reduce((sum, comp) => sum + comp.coste * comp.cantidad, 0);
        const newItems = [...(hito.items || [])];
        const existingIndex = newItems.findIndex(i => i.id === item.id);

        if (existingIndex > -1) {
          newItems[existingIndex].quantity += quantity;
        } else {
          newItems.push({
            id: item.id,
            nombre: item.nombre,
            quantity: quantity,
            pvp: item.pvp,
            coste: costeComponentes,
            categoria: item.categoria,
          });
        }
        handleUpdateHitoItems(newItems);
    }


    if (!isMounted || !entrega || !hito) {
        return <LoadingSkeleton title="Cargando Hoja de Confección..." />;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/entregas/pedido/${osId}`)} className="mb-2 no-print">
                        <ArrowLeft className="mr-2" /> Volver al Pedido
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <Package /> Confección de Entrega: {entrega.serviceNumber}.{(hito.id.slice(-2))}
                    </h1>
                    <CardDescription>
                        Cliente: {entrega.client} | Fecha: {format(new Date(hito.fecha), 'dd/MM/yyyy')} | Hora: {hito.hora}
                    </CardDescription>
                </div>
            </div>
            
             <div className="grid lg:grid-cols-[1fr_400px] lg:gap-8 mt-6">
                <UnifiedItemCatalog items={productosVenta} onAddItem={handleAddItem} />
                <div className="mt-8 lg:mt-0">
                    <DeliveryOrderSummary items={hito?.items || []} onUpdateItems={handleUpdateHitoItems} isEditing={true} />
                </div>
            </div>
        </main>
    );
}
