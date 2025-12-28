
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import type { Entrega, PedidoEntrega, ProductoVenta, EntregaHito, PedidoEntregaItem, Receta } from '@/types';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { UnifiedItemCatalog } from '@/components/entregas/unified-item-catalog';
import { DeliveryOrderSummary } from '@/components/entregas/delivery-order-summary';
import { formatCurrency } from '@/lib/utils';

import { useEntrega, usePedidosEntrega, useArticulos, useRecetas } from '@/hooks/use-data-queries';
import { useSyncPedidosEntrega } from '@/hooks/mutations/use-pedidos-entrega-mutations';

export default function ConfeccionarEntregaPage() {
    const router = useRouter();
    const params = useParams() ?? {};
    const hitoId = (params.id as string) || '';
    const searchParams = useSearchParams() ?? new URLSearchParams();
    const osId = searchParams.get('osId') || '';
    const { toast } = useToast();

    const [hito, setHito] = useState<EntregaHito | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [expedicionNumero, setExpedicionNumero] = useState('');

    // Supabase Hooks
    const { data: currentEntrega, isLoading: loadingEntrega } = useEntrega(osId);
    const { data: pedidosEntregaData, isLoading: loadingPedidos } = usePedidosEntrega(osId);
    const { data: articulosData } = useArticulos();
    const { data: recetasData } = useRecetas();
    const syncPedidosEntrega = useSyncPedidosEntrega();

    const productosVenta = useMemo(() => (articulosData || []) as any[], [articulosData]);
    const recetas = useMemo(() => (recetasData || []) as any[], [recetasData]);
    const recetasMap = useMemo(() => new Map(recetas.map(r => [r.id, r])), [recetas]);

    useEffect(() => {
        if (!osId || !hitoId || loadingEntrega || loadingPedidos) return;

        if (currentEntrega && pedidosEntregaData) {
            const currentPedido = Array.isArray(pedidosEntregaData) 
                ? pedidosEntregaData.find((p: any) => p.evento_id === osId) 
                : null;
            
            const hitos = currentPedido?.hitos || [];
            const currentHito = hitos.find((h: any) => h.id === hitoId);

            if (currentHito) {
                setHito(currentHito);
                const hitoIndex = hitos.findIndex((h: any) => h.id === hitoId);
                setExpedicionNumero(`${currentEntrega.numero_expediente || currentEntrega.serviceNumber}.${(hitoIndex + 1).toString().padStart(2, '0')}`);
            } else {
                toast({ variant: "destructive", title: "Error", description: "No se encontró la entrega." });
                router.push(`/entregas/pedido/${osId}`);
            }
        }
        
        setIsMounted(true);
    }, [osId, hitoId, currentEntrega, pedidosEntregaData, loadingEntrega, loadingPedidos, router, toast]);
    
     const handleUpdateHito = async (updatedHito: EntregaHito) => {
        if (!osId || !hito || !pedidosEntregaData) return;

        setHito(updatedHito);
        
        const currentPedido = Array.isArray(pedidosEntregaData) 
            ? pedidosEntregaData.find((p: any) => p.evento_id === osId) 
            : null;
        
        if (currentPedido) {
            const hitos = currentPedido.hitos || [];
            const hitoIndex = hitos.findIndex((h: any) => h.id === hitoId);
            if (hitoIndex > -1) {
                const newHitos = [...hitos];
                newHitos[hitoIndex] = updatedHito;
                
                try {
                    await syncPedidosEntrega.mutateAsync({ osId, hitos: newHitos });
                } catch (error) {
                    console.error('Error syncing hito:', error);
                    toast({ variant: 'destructive', title: 'Error', description: 'No se pudo sincronizar el cambio.' });
                }
            }
        }
    };
    
    const handleAddItem = (item: ProductoVenta, quantity: number) => {
        if(!hito) return;

        let itemCoste = 0;
        if (item.producidoPorPartner) {
            // Asumimos que el pvp de un producto de partner es su coste de compra para MICE.
            // Esto debería refinarse si hay un campo de coste explícito.
            itemCoste = item.pvp; 
        } else if (item.recetaId) {
            const receta = recetasMap.get(item.recetaId);
            itemCoste = receta?.costeMateriaPrima || 0;
        }

        const newItems = [...(hito.items || [])];
        const existingIndex = newItems.findIndex(i => i.id === item.id);

        if (existingIndex > -1) {
          newItems[existingIndex].quantity += quantity;
        } else {
          newItems.push({
            id: item.id,
            nombre: item.nombre,
            quantity: quantity,
            pvp: currentEntrega?.tarifa === 'IFEMA' ? (item.pvpIfema || item.pvp) : item.pvp,
            coste: itemCoste,
            categoria: item.categoria,
          });
        }
        handleUpdateHito({ ...hito, items: newItems });
    }
    
    const catalogItems = useMemo(() => {
      if (!currentEntrega) return productosVenta;
      if (currentEntrega.tarifa === 'IFEMA') {
        return productosVenta;
      }
      return productosVenta.filter(p => !p.exclusivoIfema);
    }, [productosVenta, currentEntrega]);

    const totalPedido = useMemo(() => {
        if (!hito) return 0;
        const totalProductos = hito.items.reduce((sum, item) => sum + (item.pvp * item.quantity), 0);
        const costePorte = currentEntrega?.tarifa === 'IFEMA' ? 95 : 30;
        const totalPortes = (hito.portes || 0) * costePorte;
        
        const horasCamarero = hito.horasCamarero || 0;
        const horasFacturables = horasCamarero > 0 && horasCamarero < 4 ? 4 : horasCamarero;
        const pvpCamareroHora = currentEntrega?.tarifa === 'IFEMA' ? 44.50 : 36.50;
        const totalPvpCamarero = horasFacturables * pvpCamareroHora;

        return totalProductos + totalPortes + totalPvpCamarero;
    }, [hito, currentEntrega]);


    if (!isMounted || !currentEntrega || !hito) {
        return <LoadingSkeleton title="Cargando Hoja de Confección..." />;
    }

    return (
        <main className="min-h-screen bg-background">
            {/* Premium Sticky Header */}
            <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/entregas/pedido/${osId}`)} className="h-8 w-8 p-0 rounded-full hover:bg-amber-500/10 hover:text-amber-600 no-print">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <Package className="h-5 w-5 text-amber-500" />
                        </div>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">PVP Total Entrega</p>
                            <p className="text-lg font-black text-amber-600">{formatCurrency(totalPedido)}</p>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] font-bold uppercase tracking-wider border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-600 no-print"
                            onClick={() => router.push(`/entregas/pedido/${osId}`)}
                        >
                            Finalizar
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 pb-12">
                <div className="grid lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <UnifiedItemCatalog items={catalogItems} onAddItem={handleAddItem} />
                    </div>
                    <div className="space-y-6">
                        <DeliveryOrderSummary 
                            entrega={currentEntrega}
                            hito={hito}
                            onUpdateHito={handleUpdateHito}
                            isEditing={true} 
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
