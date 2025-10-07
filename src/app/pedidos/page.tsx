
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { OrderItem, CateringItem, MaterialOrder, ServiceOrder, AlquilerDBItem, Precio, PedidoPlantilla, ArticuloCatering } from '@/types';
import { ItemCatalog } from '@/components/catalog/item-catalog';
import { OrderSummary, type ExistingOrderData } from '@/components/order/order-summary';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { FilePlus2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type CatalogSourceItem = CateringItem;

export default function PedidosPage() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [catalogItems, setCatalogItems] = useState<CateringItem[]>([]);
  const [plantillas, setPlantillas] = useState<PedidoPlantilla[]>([]);
  const [existingOrderData, setExistingOrderData] = useState<ExistingOrderData | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const osId = searchParams.get('osId');
  const orderType = searchParams.get('type') as 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler' | null;
  const editOrderId = searchParams.get('orderId');

  useEffect(() => {
    // This effect runs only on the client
    if (osId) {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allServiceOrders.find(os => os.id === osId);
      setServiceOrder(currentOS || null);
    }
    
    let itemsToLoad: CateringItem[] = [];

    if (orderType === 'Alquiler') {
      const storedAlquilerItems = JSON.parse(localStorage.getItem('alquilerDB') || '[]') as AlquilerDBItem[];
      itemsToLoad = storedAlquilerItems.map(item => ({
        itemCode: item.id,
        description: item.concepto,
        price: item.precioAlquiler,
        stock: 999, // Assume infinite stock for rentals
        imageUrl: item.imagen || `https://picsum.photos/seed/${item.id}/400/300`, // Use stored image or placeholder
        imageHint: 'rental item',
        category: 'Alquiler',
      }));
    } else if (orderType) {
        const allArticulos = JSON.parse(localStorage.getItem('articulos') || '[]') as ArticuloCatering[];
        
        itemsToLoad = allArticulos
            .filter(p => p.categoria === orderType)
            .map(p => ({
                itemCode: p.id,
                description: p.nombre,
                price: p.precioAlquiler > 0 ? p.precioAlquiler : p.precioVenta,
                stock: 999,
                imageUrl: p.imagen || `https://picsum.photos/seed/${p.id}/400/300`,
                imageHint: p.nombre.toLowerCase(),
                category: p.categoria,
                tipo: p.tipo,
            }));
    }
    setCatalogItems(itemsToLoad);

    const allPlantillas = JSON.parse(localStorage.getItem('pedidoPlantillas') || '[]') as PedidoPlantilla[];
    setPlantillas(allPlantillas.filter(p => p.tipo === orderType));
    
    if (editOrderId) {
      const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
      const orderToEdit = allMaterialOrders.find(o => o.id === editOrderId);
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
  }, [editOrderId, osId, orderType]);

  const handleAddItem = (item: CateringItem, quantity: number) => {
    if (quantity <= 0) return;

    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.itemCode === item.itemCode);
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        return prevItems.map((i) =>
          i.itemCode === item.itemCode ? { ...i, quantity: newQuantity } : i
        );
      } else {
        return [...prevItems, { ...item, quantity }];
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

  const handleAddLocation = (newLocation: string) => {
    if (!serviceOrder) return;
    
    const updatedOS = {
        ...serviceOrder,
        deliveryLocations: [...(serviceOrder.deliveryLocations || []), newLocation]
    };
    
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const osIndex = allServiceOrders.findIndex(os => os.id === serviceOrder.id);
    
    if (osIndex !== -1) {
        allServiceOrders[osIndex] = updatedOS;
        localStorage.setItem('serviceOrders', JSON.stringify(allServiceOrders));
        setServiceOrder(updatedOS);
        toast({ title: 'Localización añadida', description: `Se ha guardado "${newLocation}" en la Orden de Servicio.`})
    }
  }

  const handleSubmitOrder = (finalOrder: {
    items: OrderItem[];
    days: number;
    total: number;
    contractNumber: string;
    deliveryDate?: string;
    deliverySpace?: string;
    deliveryLocation?: string;
    solicita?: 'Sala' | 'Cocina';
  }) => {
    if (!osId || !orderType) {
        toast({ variant: 'destructive', title: 'Error', description: 'Falta información de la Orden de Servicio.' });
        return;
    }

    let allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    
    if (editOrderId) {
      // Update existing material order
      const orderIndex = allMaterialOrders.findIndex(o => o.id === editOrderId);
      if (orderIndex !== -1) {
        allMaterialOrders[orderIndex] = {
          ...allMaterialOrders[orderIndex],
          ...finalOrder,
        };
        toast({ title: 'Pedido de material actualizado' });
      }
    } else {
      // Create new material order
      const newMaterialOrder: MaterialOrder = {
        id: Date.now().toString(),
        osId,
        type: orderType as any, // Cast because we've already validated
        status: 'Asignado',
        ...finalOrder,
      };
      allMaterialOrders.push(newMaterialOrder);
      toast({ title: 'Pedido de material creado' });
    }

    localStorage.setItem('materialOrders', JSON.stringify(allMaterialOrders));
    
    setOrderItems([]);
    
    let modulePath = '';
    if (orderType === 'Almacen') modulePath = 'almacen';
    else if (orderType === 'Bodega') modulePath = 'bodega';
    else if (orderType === 'Bio') modulePath = 'bio';
    else if (orderType === 'Alquiler') modulePath = 'alquiler';

    const destination = `/os/${osId}/${modulePath}`;
    router.push(destination);
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
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_400px] lg:gap-8">
          <ItemCatalog
            items={catalogItems}
            onAddItem={handleAddItem}
            orderItems={orderItems}
            orderType={orderType}
            plantillas={plantillas}
            onApplyTemplate={handleApplyTemplate}
          />
          <div className="mt-8 lg:mt-0">
            <OrderSummary
              items={orderItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onSubmitOrder={handleSubmitOrder}
              onClearOrder={handleClearOrder}
              isEditing={!!editOrderId}
              serviceOrder={serviceOrder}
              onAddLocation={handleAddLocation}
              existingOrderData={existingOrderData}
              orderType={orderType}
            />
          </div>
        </div>
      </main>
      <footer className="py-4 border-t">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} MICE Catering. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
