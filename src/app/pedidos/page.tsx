
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { OrderItem, CateringItem, MaterialOrder, ServiceOrder, AlquilerDBItem, Precio } from '@/types';
import { Header } from '@/components/layout/header';
import { ItemCatalog } from '@/components/catalog/item-catalog';
import { OrderSummary } from '@/components/order/order-summary';
import { useToast } from '@/hooks/use-toast';

type CatalogSourceItem = CateringItem | (Omit<AlquilerDBItem, 'precioReposicion' | 'precioAlquiler' | 'imagen'> & { price: number; description: string; stock: number; itemCode: string; imageUrl: string; imageHint: string; category: string });

export default function PedidosPage() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [catalogItems, setCatalogItems] = useState<CateringItem[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const osId = searchParams.get('osId');
  const orderType = searchParams.get('type') as 'Almacén' | 'Bodega' | 'Bio' | 'Alquiler' | null;
  const editOrderId = searchParams.get('orderId');

  useEffect(() => {
    // This effect runs only on the client
    if (osId) {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allServiceOrders.find(os => os.id === osId);
      setServiceOrder(currentOS || null);
    }
    
    const allPrecios = JSON.parse(localStorage.getItem('precios') || '[]') as Precio[];
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
        const categoryMap = {
            'Almacén': 'ALMACEN',
            'Bodega': 'BODEGA',
            'Bio': 'BIO',
        }
        const filterCategory = categoryMap[orderType];
        
        itemsToLoad = allPrecios
            .filter(p => p.categoria === filterCategory)
            .map(p => ({
                itemCode: p.id,
                description: p.producto,
                price: p.precioAlquilerUd,
                stock: 999, // Assuming infinite stock from external providers
                imageUrl: p.imagen || `https://picsum.photos/seed/${p.id}/400/300`,
                imageHint: p.producto.toLowerCase(),
                category: p.categoria,
            }));
    }
    setCatalogItems(itemsToLoad);
    
    if (editOrderId) {
      const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
      const orderToEdit = allMaterialOrders.find(o => o.id === editOrderId);
      if (orderToEdit) {
        setOrderItems(orderToEdit.items);
      }
    }
  }, [editOrderId, osId, orderType]);

  const handleAddItem = (item: CatalogSourceItem, quantity: number) => {
    if (quantity <= 0) return;

    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.itemCode === item.itemCode);
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        return prevItems.map((i) =>
          i.itemCode === item.itemCode ? { ...i, quantity: newQuantity } : i
        );
      } else {
        return [...prevItems, { ...(item as CateringItem), quantity }];
      }
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
        type: orderType,
        status: 'Asignado',
        ...finalOrder,
      };
      allMaterialOrders.push(newMaterialOrder);
      toast({ title: 'Pedido de material creado' });
    }

    localStorage.setItem('materialOrders', JSON.stringify(allMaterialOrders));
    
    setOrderItems([]);
    
    let modulePath = '';
    if (orderType === 'Almacén') modulePath = 'almacen';
    else if (orderType === 'Bodega') modulePath = 'bodega';
    else if (orderType === 'Bio') modulePath = 'bio';
    else if (orderType === 'Alquiler') modulePath = 'alquiler';

    const destination = `/${modulePath}?osId=${osId}`;
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
            <Header />
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
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_400px] lg:gap-8">
          <ItemCatalog
            items={catalogItems}
            onAddItem={handleAddItem}
            orderItems={orderItems}
            orderType={orderType}
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
            />
          </div>
        </div>
      </main>
      <footer className="py-4 border-t">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CateringStock. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
