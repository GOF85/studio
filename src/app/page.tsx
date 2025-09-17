'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { OrderItem, CateringItem, MaterialOrder, ServiceOrder } from '@/types';
import { CATERING_ITEMS } from '@/lib/data';
import { Header } from '@/components/layout/header';
import { ItemCatalog } from '@/components/catalog/item-catalog';
import { OrderSummary } from '@/components/order/order-summary';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const osId = searchParams.get('osId');
  const orderType = searchParams.get('type') as 'Almacén' | 'Bodega' | null;
  const editOrderId = searchParams.get('orderId');

  useEffect(() => {
    // This effect runs only on the client
    if (osId) {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allServiceOrders.find(os => os.id === osId);
      setServiceOrder(currentOS || null);
    }
    
    if (editOrderId) {
      const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
      const orderToEdit = allMaterialOrders.find(o => o.id === editOrderId);
      if (orderToEdit) {
        setOrderItems(orderToEdit.items);
      }
    }
  }, [editOrderId, osId]);

  const handleAddItem = (item: CateringItem, quantity: number) => {
    if (quantity <= 0) return;

    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.itemCode === item.itemCode);
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > item.stock) {
          toast({
            variant: 'destructive',
            title: 'Stock insuficiente',
            description: `No puedes añadir más de ${item.stock} unidades de ${item.description}.`,
          });
          return prevItems.map((i) =>
            i.itemCode === item.itemCode ? { ...i, quantity: item.stock } : i
          );
        }
        return prevItems.map((i) =>
          i.itemCode === item.itemCode ? { ...i, quantity: newQuantity } : i
        );
      } else {
        if (quantity > item.stock) {
          toast({
            variant: 'destructive',
            title: 'Stock insuficiente',
            description: `No puedes añadir más de ${item.stock} unidades de ${item.description}.`,
          });
          return [...prevItems, { ...item, quantity: item.stock }];
        }
        return [...prevItems, { ...item, quantity }];
      }
    });
    toast({
      title: 'Artículo añadido',
      description: `${quantity} x ${item.description} añadido(s) al pedido.`,
    });
  };

  const handleUpdateQuantity = (itemCode: string, quantity: number) => {
    const itemData = CATERING_ITEMS.find((i) => i.itemCode === itemCode);
    if (!itemData) return;

    if (quantity <= 0) {
      handleRemoveItem(itemCode);
      return;
    }

    if (quantity > itemData.stock) {
      toast({
        variant: 'destructive',
        title: 'Stock insuficiente',
        description: `Solo hay ${itemData.stock} unidades disponibles de ${itemData.description}.`,
      });
      setOrderItems((prevItems) =>
        prevItems.map((item) =>
          item.itemCode === itemCode ? { ...item, quantity: itemData.stock } : item
        )
      );
      return;
    }

    setOrderItems((prevItems) =>
      prevItems.map((item) => (item.itemCode === itemCode ? { ...item, quantity } : item))
    );
  };

  const handleRemoveItem = (itemCode: string) => {
    setOrderItems((prevItems) => prevItems.filter((item) => item.itemCode !== itemCode));
  };

  const handleSubmitOrder = (finalOrder: {
    items: OrderItem[];
    days: number;
    total: number;
    contractNumber: string;
    deliveryDate?: string;
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
    
    // Redirect back to the module page
    const destination = `/${orderType.toLowerCase()}?osId=${osId}`;
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
            items={CATERING_ITEMS}
            onAddItem={handleAddItem}
            orderItems={orderItems}
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
