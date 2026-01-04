
'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { OrderItem, MaterialOrder, ServiceOrder, PedidoPlantilla, ArticuloCatering, AlquilerDBItem, Precio, CateringItem, Proveedor } from '@/types';
import { ItemCatalog } from '@/components/catalog/item-catalog';
import OsHeader from '@/components/os/OsHeader';
import { OrderSummary, type ExistingOrderData } from '@/components/order/order-summary';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Briefcase, FilePlus2, FileText, Warehouse, Wine, Leaf, Archive, Snowflake } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ObjectiveDisplay } from '@/components/os/objective-display';
import { useOSMaterialOrders } from '@/hooks/use-os-material-orders';
import { Badge } from '@/components/ui/badge';

import { useEvento, useArticulos, useProveedores, usePlantillasPedidos, useUpdateEvento, useHieloOrders, useProveedoresTiposServicio } from '@/hooks/use-data-queries';
import { useCreateHieloOrder, useUpdateHieloOrderItem } from '@/hooks/mutations/use-hielo-mutations';

function PedidosPageInner() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [existingOrderData, setExistingOrderData] = useState<ExistingOrderData | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const { loadOrders, saveOrder } = useOSMaterialOrders();
  
  const osId = searchParams.get('osId');
  const orderType = searchParams.get('type') as 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler' | 'Hielo' | null;
  const editOrderId = searchParams.get('orderId');

  const { data: serviceOrder } = useEvento(osId || undefined);
  const { data: allArticulos } = useArticulos();
  const { data: allProveedores } = useProveedores();
  const { data: allPlantillas } = usePlantillasPedidos();
  const { data: tiposServicio = [] } = useProveedoresTiposServicio();
  const { data: allHieloOrders = [] } = useHieloOrders(osId || undefined);
  const { mutateAsync: createHieloOrder } = useCreateHieloOrder();
  const { mutateAsync: updateHieloItem } = useUpdateHieloOrderItem();
  const updateEvento = useUpdateEvento();

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
    if (!allArticulos || !orderType) return [];

    const filteredArticulos = allArticulos.filter(item => item && item.id && item.nombre);
    let itemsToLoad: CateringItem[] = [];

    function getThumbnail(articulo: any) {
      if (Array.isArray(articulo.imagenes) && articulo.imagenes.length > 0) {
        const first = articulo.imagenes[0];
        // soportar tanto array de strings (urls) como array de objetos { url, esPrincipal }
        if (typeof first === 'string') return first;
        const principal = articulo.imagenes.find((img: any) => img && img.esPrincipal) || first;
        if (principal && (principal.url || typeof principal === 'string')) return principal.url || principal;
      }
      if (articulo.imagen && typeof articulo.imagen === 'string') return articulo.imagen;
      return '';
    }

    function getImageList(articulo: any) {
      if (Array.isArray(articulo.imagenes) && articulo.imagenes.length > 0) {
        return articulo.imagenes.map((img: any) => (typeof img === 'string' ? img : img?.url)).filter(Boolean);
      }
      if (articulo.imagen && typeof articulo.imagen === 'string') return [articulo.imagen];
      return [];
    }

    if (orderType === 'Alquiler') {
      itemsToLoad = filteredArticulos
        .filter(p => p.producidoPorPartner)
          .map(p => ({ 
          ...p, 
          itemCode: p.id, 
          description: p.nombre, 
          price: typeof p.precioAlquiler === 'number' ? p.precioAlquiler : 0, 
          stock: 999, 
          imageUrl: getThumbnail(p), 
          images: getImageList(p),
          imageHint: p.nombre, 
          category: p.categoria,
          tipo: p.subcategoria || p.tipo || undefined,
          unidadVenta: p.unidadVenta ?? undefined
        }));
    } else if (orderType === 'Hielo') {
      itemsToLoad = filteredArticulos
        .filter(p => p.subcategoria?.toUpperCase() === '00HIELO' && p.tipoArticulo === 'micecatering')
        .map(p => ({
          ...p,
          itemCode: p.id,
          description: p.nombre,
          price: p.precioVenta,
          stock: 999,
          imageUrl: getThumbnail(p),
          imageHint: p.nombre,
          tipo: p.subcategoria || p.tipo || undefined,
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
          imageUrl: getThumbnail(p),
          imageHint: p.nombre,
          tipo: p.subcategoria || p.tipo || undefined,
          unidadVenta: p.unidadVenta ?? undefined,
          category: p.categoria,
        }));
    }
    return itemsToLoad.filter(item => item && item.description && item.itemCode);
  }, [allArticulos, orderType]);

  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  useEffect(() => {
    const loadEditData = async () => {
        if (editOrderId && osId && orderType) {
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
                const orders = await loadOrders(osId, orderType);
                const orderToEdit = orders.find(o => o.id === editOrderId);
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
  }, [editOrderId, osId, orderType, loadOrders, allHieloOrders]);

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
    if (!serviceOrder || !osId) return;
    
    const updatedLocations = [...(serviceOrder.deliveryLocations || []), newLocation];
    
    try {
        await updateEvento.mutateAsync({
            id: osId,
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
    if (!osId || !orderType) {
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
                    osId,
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
            const orderToSave: Partial<MaterialOrder> & { osId: string, type: string } = {
                id: editOrderId || undefined,
                osId,
                type: orderType,
                status: 'Asignado',
                ...finalOrder,
                items: finalOrder.items.map(item => ({ ...item, type: orderType as any }))
            };

            await saveOrder(orderToSave);
        }

        toast({ title: editOrderId ? 'Pedido actualizado' : 'Pedido creado' });

        setOrderItems([]);
        
        let modulePath = '';
        if (orderType === 'Almacen') modulePath = 'almacen';
        else if (orderType === 'Bodega') modulePath = 'bodega';
        else if (orderType === 'Bio') modulePath = 'bio';
        else if (orderType === 'Alquiler') modulePath = 'alquiler';
        else if (orderType === 'Hielo') modulePath = 'hielo';

        const destination = `/os/${osId}/${modulePath}`;
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

  if (!osId || !orderType) {
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
    <div className="flex flex-col min-h-screen bg-background/30">
          {/* Reusable OS header with subtitle */}
          <div>
            {/* Use centralized OsHeader for consistent look; pass subtitle based on orderType */}
            {/* Dynamically import to avoid client/server mismatch if necessary */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <div className="sticky top-12 z-30">
              {/* simple wrapper that renders OsHeader with subtitle/icon */}
              {/* Map orderType to subtitle */}
              <OsHeader
                osId={osId}
                subtitle={orderType ? (orderType === 'Almacen' ? 'Catálogo de Artículos de almacén' : (orderType === 'Bodega' ? 'Catálogo de Artículos de bebida' : (orderType === 'Bio' ? 'Catálogo de Artículos Bio' : 'Catálogo de Artículos'))) : 'Catálogo de Artículos'}
                subtitleIcon={orderType === 'Almacen' ? <Warehouse className="h-5 w-5 text-indigo-600" /> : orderType === 'Bodega' ? <Wine className="h-5 w-5 text-indigo-600" /> : orderType === 'Bio' ? <Leaf className="h-5 w-5 text-indigo-600" /> : orderType === 'Alquiler' ? <Archive className="h-5 w-5 text-indigo-600" /> : orderType === 'Hielo' ? <Snowflake className="h-5 w-5 text-indigo-600" /> : <FilePlus2 className="h-5 w-5 text-indigo-600" />}
              />
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
                    <ObjectiveDisplay osId={osId} moduleName={orderType.toLowerCase() as any} />
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
                />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PedidosPage() {
  return (
    <Suspense fallback={<div>Cargando ...</div>}>
      <PedidosPageInner />
    </Suspense>
  );
}
