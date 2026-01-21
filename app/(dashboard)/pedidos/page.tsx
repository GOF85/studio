
'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { OrderItem, MaterialOrder, ServiceOrder, PedidoPlantilla, ArticuloCatering, AlquilerDBItem, Precio, CateringItem, Proveedor } from '@/types';
import { ItemCatalog } from '@/components/catalog/item-catalog';
import OsHeader from '@/components/os/OsHeader';
import { OrderSummary, type ExistingOrderData } from '@/components/order/order-summary';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Briefcase, FilePlus2, FileText, Warehouse, Wine, Leaf, Archive, Snowflake, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ObjectiveDisplay } from '@/components/os/objective-display';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

import { useEvento, useArticulos, useProveedores, usePlantillasPedidos, useUpdateEvento, useHieloOrders, useProveedoresTiposServicio } from '@/hooks/use-data-queries';
import { useCreateHieloOrder, useUpdateHieloOrderItem } from '@/hooks/mutations/use-hielo-mutations';
import { getThumbnail } from '@/lib/image-utils';

function PedidosHeaderMetrics({ totalPlanned, facturacion = 0, osId }: { totalPlanned: number; facturacion: number; osId: string }) {
  const planificadoPctFacturacion = useMemo(() => {
    if (!facturacion || facturacion === 0) return '0%'
    return `${((totalPlanned / facturacion) * 100).toFixed(1)}%`
  }, [totalPlanned, facturacion])

  return (
    <div className="flex items-center gap-1.5">
      {/* Presupuesto Actual */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 px-2.5 py-0.5 border rounded-lg transition-all cursor-help shrink-0 ${
            totalPlanned < facturacion
              ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200/50'
              : 'bg-red-50/50 dark:bg-red-500/5 border-red-200/50'
          }`}>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${
              totalPlanned < facturacion
                ? 'text-emerald-600/70'
                : 'text-red-600/70'
            }`}>Planificado</span>
            <div className="flex items-baseline gap-0">
              <span className={`font-black text-xs md:text-sm tabular-nums ${
                totalPlanned < facturacion
                  ? 'text-emerald-700'
                  : 'text-red-700'
              }`}>
                {formatCurrency(totalPlanned).split(',')[0]}
              </span>
              <span className={`text-[8px] font-bold ${
                totalPlanned < facturacion
                  ? 'text-emerald-600/60'
                  : 'text-red-600/60'
              }`}>
                ,{formatCurrency(totalPlanned).split(',')[1]}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-bold">
          {planificadoPctFacturacion} de facturación
        </TooltipContent>
      </Tooltip>

      {/* Objetivo de Gasto */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-2.5 py-0.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 rounded-lg transition-all cursor-help shrink-0">
            <span className="text-[9px] font-bold uppercase text-muted-foreground/70 tracking-wider">Objetivo</span>
            <div className="flex items-baseline gap-0">
              <span className="font-black text-xs md:text-sm text-zinc-700 dark:text-zinc-300 tabular-nums">
                {formatCurrency(facturacion).split(',')[0]}
              </span>
              <span className="text-[8px] font-bold text-zinc-500/60 text-zinc-400">
                ,{formatCurrency(facturacion).split(',')[1]}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-bold flex flex-col gap-1">
          <span>100% de facturación (Referencia)</span>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function PedidosPageInner() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [existingOrderData, setExistingOrderData] = useState<ExistingOrderData | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  
  const numeroExpediente = searchParams.get('numero_expediente');
  const orderType = searchParams.get('type') as 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler' | 'Hielo' | null;
  const editOrderId = searchParams.get('orderId');

  const { data: serviceOrder } = useEvento(numeroExpediente || undefined);
  const { data: allArticulos } = useArticulos();
  const { data: allProveedores } = useProveedores();
  const { data: allPlantillas } = usePlantillasPedidos();
  const { data: tiposServicio = [] } = useProveedoresTiposServicio();
  const { data: allHieloOrders = [] } = useHieloOrders(numeroExpediente || undefined);
  const { mutateAsync: createHieloOrder } = useCreateHieloOrder();
  const { mutateAsync: updateHieloItem } = useUpdateHieloOrderItem();
  const updateEvento = useUpdateEvento();

  // Local function to load existing orders for editing
  const loadOrders = async (osId: string, type: string) => {
    try {
      const response = await fetch('/api/material-orders/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ osId, type }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load orders');
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error loading orders:', error);
      return [];
    }
  };

  const plantillas = useMemo(() => 
    (allPlantillas || []).filter(p => p.tipo === orderType),
    [allPlantillas, orderType]
  );

  const rentalProviders = useMemo(() => {
    if (!allProveedores) return [];
    if (orderType === 'Alquiler') {
      // Filtrar proveedores que tengan 'Alquiler' en tiposServicio
      const alquilerIds = new Set(
        tiposServicio
          .filter(t => Array.isArray(t.tipos) && t.tipos.some((tipo: string) => tipo.toLowerCase() === 'alquiler'))
          .map(t => t.proveedor_id)
      );
      return allProveedores.filter(p => alquilerIds.has(p.id));
    }
    if (orderType === 'Hielo') {
      const providersWithHielo = new Set(
        tiposServicio
          .filter(t => t.tipos?.some((tipo: string) => tipo.toLowerCase() === 'hielo'))
          .map(t => t.proveedor_id)
      );
      return allProveedores.filter(p => providersWithHielo.has(p.id));
    }
    return [];
  }, [allProveedores, orderType, tiposServicio]);

  const catalogItems = useMemo(() => {
    if (!allArticulos || !orderType) {
      return [];
    }

    const filteredArticulos = allArticulos.filter(item => item && item.id && item.nombre);
    let itemsToLoad: CateringItem[] = [];

    if (orderType === 'Alquiler') {
      const alquilerFiltered = filteredArticulos.filter(p => (p.categoria as string) === 'Alquiler' || (p.categoria as string) === 'ALQUILER');
      itemsToLoad = alquilerFiltered.map(p => {
        const thumb = getThumbnail(p.imagenes) || '';
        return {
          ...p, 
          itemCode: p.id, 
          description: p.nombre, 
          price: typeof p.precioAlquiler === 'number' ? p.precioAlquiler : 0, 
          stock: 999, 
          imageUrl: thumb, 
          imagenes: p.imagenes,
          imageHint: p.nombre, 
          category: p.categoria,
          tipo: p.subcategoria || p.tipo || p.categoria || 'Sin categoría',
          unidadVenta: p.unidadVenta ?? undefined
        };
      });
    } else if (orderType === 'Hielo') {
      itemsToLoad = filteredArticulos
        .filter(p => p.subcategoria?.toUpperCase() === '00HIELO' && p.tipoArticulo === 'micecatering')
        .map(p => ({
          ...p,
          itemCode: p.id,
          description: p.nombre,
          price: p.precioVenta,
          stock: 999,
          imageUrl: getThumbnail(p.imagenes) || '',
          imagenes: p.imagenes,
          imageHint: p.nombre,
          tipo: p.subcategoria || p.tipo || p.categoria || 'Sin categoría',
          unidadVenta: p.unidadVenta ?? undefined,
          category: p.categoria,
        }));
    } else {
      const typeMap = { 'Almacen': 'Almacén', 'Bodega': 'Bebida', 'Bio': 'Bio' };
      const filterType = typeMap[orderType as keyof typeof typeMap];

      itemsToLoad = filteredArticulos
        .filter(p => p.categoria === filterType)
        .map(p => ({
          ...p,
          itemCode: p.id,
          description: p.nombre,
          price: orderType === 'Almacen' ? p.precioAlquiler : p.precioVenta,
          stock: 999,
          imageUrl: getThumbnail(p.imagenes) || '',
          imagenes: p.imagenes,
          imageHint: p.nombre,
          tipo: p.subcategoria || p.tipo || p.categoria || 'Sin categoría',
          unidadVenta: p.unidadVenta ?? undefined,
          category: p.categoria,
        }));
    }
    const result = itemsToLoad.filter(item => item && item.description && item.itemCode);
    return result;
  }, [allArticulos, orderType]);

  const totalPlanned = useMemo(() => {
    return orderItems.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 0), 0)
  }, [orderItems])

  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  useEffect(() => {
    const loadEditData = async () => {
        if (editOrderId && numeroExpediente && orderType) {
            if (orderType === 'Hielo') {
                const orderToEdit = allHieloOrders.find(o => o.id === editOrderId);
                if (orderToEdit) {
                    setOrderItems(orderToEdit.items.map(item => ({
                        itemCode: item.id,
                        description: item.producto,
                        price: item.precio,
                        quantity: item.cantidad,
                        stock: 999,
                        imageUrl: '',
                        imageHint: item.producto.toLowerCase(),
                        category: 'Hielo'
                    })));
                    setSelectedProviderId(orderToEdit.proveedorId || null);
                    setExistingOrderData({
                        days: 1,
                        contractNumber: '',
                        deliveryDate: orderToEdit.fecha,
                        deliverySpace: '',
                        deliveryLocation: '',
                        solicita: 'Cocina'
                    });
                }
            } else {
                const orders = await loadOrders(numeroExpediente || '', orderType as string);
                const orderToEdit = orders.find((o: any) => o.id === editOrderId);
                if (orderToEdit) {
                    setOrderItems(orderToEdit.items);
                    setExistingOrderData({
                        days: orderToEdit.days,
                        contractNumber: orderToEdit.contractNumber,
                        deliveryDate: orderToEdit.deliveryDate,
                        deliverySpace: orderToEdit.deliverySpace,
                        deliveryLocation: orderToEdit.deliveryLocation,
                        solicita: orderToEdit.solicita
                    });
                }
            }
        }
    };

    loadEditData();
  }, [editOrderId, numeroExpediente, orderType, loadOrders, allHieloOrders]);

  const handleAddItem = (item: CateringItem, quantity: number) => {
    if (quantity <= 0) return;

    const orderItem: OrderItem = {
        itemCode: item.itemCode,
        description: item.description,
        price: item.price,
        stock: 999,
        imageUrl: item.imageUrl || '',
        imageHint: item.description.toLowerCase(),
        category: item.category,
        tipo: item.tipo,
        quantity: 0,
        unidadVenta: item.unidadVenta,
    };

    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.itemCode === orderItem.itemCode);
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        return prevItems.map((i) =>
          i.itemCode === orderItem.itemCode ? { ...i, quantity: newQuantity } : i
        );
      } else {
        return [...prevItems, { ...orderItem, quantity }];
      }
    });
  };

  const handleApplyTemplate = (plantilla: PedidoPlantilla) => {
    plantilla.items.forEach(plantillaItem => {
        const catalogItem = catalogItems.find(item => item.itemCode === plantillaItem.itemCode);
        if(catalogItem) {
            handleAddItem(catalogItem, plantillaItem.quantity);
        }
    });
    toast({
        title: `Plantilla "${plantilla.nombre}" aplicada`,
        description: `${plantilla.items.length} tipos de artículos añadidos al pedido.`
    });
  };

  const handleUpdateQuantity = (itemCode: string, quantity: number) => {
    const itemData = catalogItems.find((i) => i.itemCode === itemCode);
    if (!itemData) return;

    if (quantity <= 0) {
      handleRemoveItem(itemCode);
      return;
    }

    setOrderItems((prevItems) =>
      prevItems.map((item) => (item.itemCode === itemCode ? { ...item, quantity } : item))
    );
  };

  const handleRemoveItem = (itemCode: string) => {
    setOrderItems((prevItems) => prevItems.filter((item) => item.itemCode !== itemCode));
  };

  const handleAddLocation = async (newLocation: string) => {
    if (!serviceOrder || !numeroExpediente) return;
    
    const updatedLocations = [...(serviceOrder.deliveryLocations || []), newLocation];
    
    try {
        await updateEvento.mutateAsync({
            id: numeroExpediente,
            deliveryLocations: updatedLocations
        });
        toast({ title: 'Localización añadida', description: `Se ha guardado "${newLocation}" en la Orden de Servicio.`})
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la localización.' });
    }
  }

  const handleSubmitOrder = async (finalOrder: {
    items: OrderItem[];
    days: number;
    total: number;
    contractNumber: string;
    deliveryDate?: string;
    deliveryTime?: string;
    deliverySpace?: string;
    deliveryLocation?: string;
    solicita?: 'Sala' | 'Cocina';
  }) => {
    if (!numeroExpediente || !orderType) {
        toast({ variant: 'destructive', title: 'Error', description: 'Falta información de la Orden de Servicio.' });
        return;
    }

    try {
        if (orderType === 'Hielo') {
            if (!selectedProviderId) {
                toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar un proveedor.' });
                return;
            }

            if (editOrderId) {
                for (const item of finalOrder.items) {
                    await updateHieloItem({
                        id: editOrderId,
                        updates: {
                            cantidad: item.quantity,
                            precio: item.price || 0,
                            proveedorId: selectedProviderId || undefined
                        }
                    });
                }
            } else {
                await createHieloOrder({
                    osId: numeroExpediente,
                    proveedorId: selectedProviderId,
                    items: finalOrder.items.map(item => ({
                        producto: item.description,
                        cantidad: item.quantity,
                        precio: item.price || 0
                    })),
                    deliveryTime: finalOrder.deliveryTime
                });
            }
        } else {
            // Use API UPSERT which has merge logic for existing orders
            const response = await fetch('/api/material-orders/upsert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    osId: numeroExpediente,
                    type: orderType,
                    items: finalOrder.items.map(item => ({ ...item, type: orderType as any })),
                    days: finalOrder.days || 1,
                    deliveryDate: finalOrder.deliveryDate,
                    deliverySpace: finalOrder.deliverySpace,
                    deliveryLocation: finalOrder.deliveryLocation,
                    solicita: finalOrder.solicita,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to upsert order');
            }

            // Invalidate the materialOrders query cache immediately after successful save
            console.log('🔄 [PEDIDOS] Invalidando caché de materialOrders:', numeroExpediente, orderType);
            await queryClient.invalidateQueries({
                queryKey: ['materialOrders', numeroExpediente, orderType]
            });
        }

        toast({ title: editOrderId ? 'Pedido actualizado' : 'Pedido creado' });

        setOrderItems([]);
        
        let modulePath = '';
        if (orderType === 'Almacen') modulePath = 'almacen';
        else if (orderType === 'Bodega') modulePath = 'bodega';
        else if (orderType === 'Bio') modulePath = 'bio';
        else if (orderType === 'Alquiler') modulePath = 'alquiler';
        else if (orderType === 'Hielo') modulePath = 'hielo';

        const destination = `/os/${numeroExpediente}/${modulePath}`;
        router.push(destination);
    } catch (error: any) {
        console.error('Error submitting order:', error);
        const errorMessage = error?.message || error?.error_description || 'No se pudo guardar el pedido.';
        toast({ 
            variant: 'destructive', 
            title: 'Error al guardar', 
            description: errorMessage 
        });
    }
  };

  const handleClearOrder = () => {
    setOrderItems([]);
    toast({
      title: 'Pedido vaciado',
      description: 'Se han eliminado todos los artículos de tu pedido.',
    });
  };

  if (!numeroExpediente || !orderType) {
    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Acceso no válido</h1>
                    <p className="text-muted-foreground">
                        Para crear un pedido de material, accede desde una Orden de Servicio.
                    </p>
                </div>
            </main>
        </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen bg-background/30">
        {/* OsHeader sticky */}
        <div className="sticky top-12 z-30">
          <OsHeader
            osId={numeroExpediente}
            subtitle={orderType ? (orderType === 'Almacen' ? 'Catálogo de Artículos de almacén' : (orderType === 'Bodega' ? 'Catálogo de Artículos de bebida' : (orderType === 'Bio' ? 'Catálogo de Artículos Bio' : 'Catálogo de Artículos'))) : 'Catálogo de Artículos'}
            subtitleIcon={orderType === 'Almacen' ? <Warehouse className="h-5 w-5 text-indigo-600" /> : orderType === 'Bodega' ? <Wine className="h-5 w-5 text-indigo-600" /> : orderType === 'Bio' ? <Leaf className="h-5 w-5 text-indigo-600" /> : orderType === 'Alquiler' ? <Archive className="h-5 w-5 text-indigo-600" /> : orderType === 'Hielo' ? <Snowflake className="h-5 w-5 text-indigo-600" /> : <FilePlus2 className="h-5 w-5 text-indigo-600" />}
          />
        </div>

        {/* Header Premium Sticky - Metrics */}
        <div className="sticky top-[5.25rem] md:top-[88px] z-30 bg-background/95 backdrop-blur-md border-b border-border/40 transition-none shadow-sm mb-0">
          <div className="max-w-7xl mx-auto px-4 py-0 flex items-center justify-between gap-4 min-h-9 md:min-h-10">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded-lg bg-blue-500/10 border border-blue-500/20 shadow-sm">
                  {orderType === 'Almacen' ? <Warehouse className="h-3.5 w-3.5 text-black" /> : orderType === 'Bodega' ? <Wine className="h-3.5 w-3.5 text-black" /> : orderType === 'Bio' ? <Leaf className="h-3.5 w-3.5 text-black" /> : orderType === 'Alquiler' ? <Archive className="h-3.5 w-3.5 text-black" /> : orderType === 'Hielo' ? <Snowflake className="h-3.5 w-3.5 text-black" /> : <FilePlus2 className="h-3.5 w-3.5 text-black" />}
                </div>
                <div className="flex flex-col">
                  <h1 className="text-[10px] font-black uppercase tracking-tight leading-none text-black">{orderType}</h1>
                  <p className="text-[7px] font-bold text-muted-foreground uppercase leading-none opacity-70 truncate max-w-[100px] md:max-w-[180px]">{serviceOrder?.nombre_evento}</p>
                </div>
              </div>

              <div className="h-6 w-px bg-border/40 hidden md:block" />

              <div className="hidden md:block">
                <PedidosHeaderMetrics 
                  totalPlanned={totalPlanned} 
                   facturacion={serviceOrder?.facturacion || 0}
                  osId={numeroExpediente}
                />
              </div>
            </div>
          </div>
        </div>

      <main className="flex-grow container mx-auto px-4 py-0">
        <div className="grid lg:grid-cols-[1fr_400px] lg:gap-8">
          <ItemCatalog
            items={catalogItems}
            onAddItem={handleAddItem}
            orderItems={orderItems}
            orderType={orderType}
            plantillas={plantillas}
            onApplyTemplate={handleApplyTemplate}
            rentalProviders={rentalProviders}
            selectedProviderId={selectedProviderId}
            onSelectProvider={setSelectedProviderId}
          />
          <div className="mt-8 lg:mt-0">
            <div className="sticky top-4 space-y-4">
                <div className="flex items-center gap-2">
                    <ObjectiveDisplay osId={numeroExpediente} moduleName={orderType.toLowerCase() as any} />
                </div>
                <OrderSummary
                items={orderItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onSubmitOrder={handleSubmitOrder}
                onClearOrder={handleClearOrder}
                isEditing={!!editOrderId}
                serviceOrder={serviceOrder || null}
                onAddLocation={handleAddLocation}
                existingOrderData={existingOrderData}
                orderType={orderType}
                osId={numeroExpediente || undefined}
                />
            </div>
          </div>
        </div>
      </main>
      </div>
    </TooltipProvider>
  );
}

export default function PedidosPage() {
  return (
    <Suspense fallback={<div>Cargando ...</div>}>
      <PedidosPageInner />
    </Suspense>
  );
}
