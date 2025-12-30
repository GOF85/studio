
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

import { useEntrega, usePedidosEntrega, useArticulosEntregas, useRecetas } from '@/hooks/use-data-queries';
import { useSyncPedidosEntrega } from '@/hooks/mutations/use-pedidos-entrega-mutations';

export default function ConfeccionarEntregaPage() {
    const router = useRouter();
    const params = useParams() ?? {};
    const hitoId = (params.id as string) || '';
    const searchParams = useSearchParams() ?? new URLSearchParams();
    const osId = searchParams.get('osId') || '';
    const { toast } = useToast();

    const [isMounted, setIsMounted] = useState(false);
    const [localHito, setLocalHito] = useState<EntregaHito | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Supabase Hooks
    const { data: currentEntrega, isLoading: loadingEntrega } = useEntrega(osId);
    const { data: pedidosEntregaData, isLoading: loadingPedidos } = usePedidosEntrega(osId);
    const { data: articulosData } = useArticulosEntregas();
    const { data: recetasData } = useRecetas();
    const syncPedidosEntrega = useSyncPedidosEntrega();

    const productosVenta = useMemo(() => (articulosData || []) as any[], [articulosData]);
    const recetas = useMemo(() => (recetasData || []) as any[], [recetasData]);
    const recetasMap = useMemo(() => new Map(recetas.map(r => [r.id, r])), [recetas]);

    const { currentPedido, hito, expedicionNumero } = useMemo(() => {
        if (!currentEntrega || !pedidosEntregaData) return { currentPedido: null, hito: null, expedicionNumero: '' };
        
        const pedido = Array.isArray(pedidosEntregaData) 
            ? pedidosEntregaData.find((p: any) => p.id === currentEntrega.id) 
            : null;
            
        const hitos = pedido?.hitos || [];
        const foundHito = hitos.find((h: any) => String(h.id) === String(hitoId));
        
        let expNum = '';
        if (foundHito) {
            const hitoIndex = hitos.findIndex((h: any) => String(h.id) === String(hitoId));
            expNum = `${currentEntrega.numero_expediente || currentEntrega.serviceNumber}.${(hitoIndex + 1).toString().padStart(2, '0')}`;
        }
        
        return { currentPedido: pedido, hito: foundHito, expedicionNumero: expNum };
    }, [currentEntrega, pedidosEntregaData, hitoId]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Sync localHito with hito from query when it first loads
    useEffect(() => {
        if (hito && !localHito) {
            setLocalHito(hito);
        }
    }, [hito, localHito]);

    useEffect(() => {
        if (!osId || !hitoId || loadingEntrega || loadingPedidos || !isMounted) return;

        if (currentEntrega && pedidosEntregaData && !hito) {
            console.error('[DEBUG] Hito not found:', hitoId, 'Available hitos:', (currentPedido?.hitos || []).map((h: any) => h.id));
            toast({ variant: "destructive", title: "Error", description: "No se encontró la entrega." });
            router.push(`/entregas/pedido/${osId}`);
        }
    }, [osId, hitoId, currentEntrega, pedidosEntregaData, hito, currentPedido, loadingEntrega, loadingPedidos, router, toast, isMounted]);
    
     const handleUpdateHito = (updatedHito: EntregaHito) => {
        setLocalHito(updatedHito);
    };

    const handleSave = async () => {
        if (!osId || !localHito || !currentPedido) return;
        
        setIsSaving(true);
        const hitos = currentPedido.hitos || [];
        const hitoIndex = hitos.findIndex((h: any) => String(h.id) === String(hitoId));
        
        if (hitoIndex > -1) {
            const newHitos = [...hitos];
            newHitos[hitoIndex] = localHito;
            
            try {
                await syncPedidosEntrega.mutateAsync({ osId, hitos: newHitos });
                toast({ title: 'Cambios guardados', description: 'La entrega se ha actualizado correctamente.' });
            } catch (error) {
                console.error('Error syncing hito:', error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar los cambios.' });
            } finally {
                setIsSaving(false);
            }
        }
    };
    
    const handleAddItem = (item: ProductoVenta, quantity: number) => {
        if(!localHito) return;

        let itemCoste = 0;
        if (item.producidoPorPartner) {
            // Asumimos que el pvp de un producto de partner es su coste de compra para MICE.
            // Esto debería refinarse si hay un campo de coste explícito.
            itemCoste = item.pvp; 
        } else if (item.recetaId) {
            const receta = recetasMap.get(item.recetaId);
            itemCoste = receta?.costeMateriaPrima || 0;
        }

        const newItems = [...(localHito.items || [])];
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
            referencia: item.referenciaArticuloEntregas,
          });
        }
        handleUpdateHito({ ...localHito, items: newItems });
    }
    
    const catalogItems = useMemo(() => {
      if (!currentEntrega) return productosVenta;
      if (currentEntrega.tarifa === 'IFEMA') {
        return productosVenta;
      }
      return productosVenta.filter(p => !p.exclusivoIfema);
    }, [productosVenta, currentEntrega]);

    const totalPedido = useMemo(() => {
        if (!localHito) return 0;
        const totalProductos = localHito.items.reduce((sum, item) => sum + (item.pvp * item.quantity), 0);
        const costePorte = currentEntrega?.tarifa === 'IFEMA' ? 95 : 30;
        const totalPortes = (localHito.portes || 0) * costePorte;
        
        const horasCamarero = localHito.horasCamarero || 0;
        const horasFacturables = horasCamarero > 0 && horasCamarero < 4 ? 4 : horasCamarero;
        const pvpCamareroHora = currentEntrega?.tarifa === 'IFEMA' ? 44.50 : 36.50;
        const totalPvpCamarero = horasFacturables * pvpCamareroHora;

        return totalProductos + totalPortes + totalPvpCamarero;
    }, [localHito, currentEntrega]);


    if (!isMounted) {
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
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-tight">Hoja de Confección</h1>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{expedicionNumero || 'Cargando...'}</p>
                        </div>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">PVP Total Entrega</p>
                            <p className="text-lg font-black text-amber-600">{formatCurrency(totalPedido)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="default" 
                                size="sm" 
                                className="h-8 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider no-print"
                                onClick={handleSave}
                                disabled={isSaving || !localHito}
                            >
                                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
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
            </div>

            {!currentEntrega || !localHito ? (
                <div className="max-w-7xl mx-auto px-4">
                    <LoadingSkeleton title="Cargando datos de la entrega..." />
                </div>
            ) : (
                <div className="max-w-7xl mx-auto px-4 pb-12">
                    <div className="grid lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <UnifiedItemCatalog items={catalogItems} onAddItem={handleAddItem} />
                        </div>
                        <div className="space-y-6">
                            <DeliveryOrderSummary 
                                entrega={currentEntrega}
                                hito={localHito}
                                onUpdateHito={handleUpdateHito}
                                isEditing={true} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
