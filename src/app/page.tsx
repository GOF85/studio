'use client';

import { useState } from 'react';
import type { OrderItem, CateringItem } from '@/types';
import { CATERING_ITEMS } from '@/lib/data';
import { Header } from '@/components/layout/header';
import { ItemCatalog } from '@/components/catalog/item-catalog';
import { OrderSummary } from '@/components/order/order-summary';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const { toast } = useToast();

  const handleAddItem = (item: CateringItem, quantity: number) => {
    if (quantity <= 0) return;

    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.itemCode === item.itemCode);
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > item.stock) {
          toast({
            variant: "destructive",
            title: "Stock insuficiente",
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
            variant: "destructive",
            title: "Stock insuficiente",
            description: `No puedes añadir más de ${item.stock} unidades de ${item.description}.`,
          });
          return [...prevItems, { ...item, quantity: item.stock }];
        }
        return [...prevItems, { ...item, quantity }];
      }
    });
    toast({
      title: "Artículo añadido",
      description: `${quantity} x ${item.description} añadido(s) al pedido.`,
    });
  };

  const handleUpdateQuantity = (itemCode: string, quantity: number) => {
    const itemData = CATERING_ITEMS.find(i => i.itemCode === itemCode);
    if (!itemData) return;

    if (quantity <= 0) {
      handleRemoveItem(itemCode);
      return;
    }

    if (quantity > itemData.stock) {
      toast({
        variant: "destructive",
        title: "Stock insuficiente",
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
      prevItems.map((item) =>
        item.itemCode === itemCode ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (itemCode: string) => {
    setOrderItems((prevItems) => prevItems.filter((item) => item.itemCode !== itemCode));
  };

  const handleSubmitOrder = (finalOrder: { items: OrderItem[], days: number, total: number }) => {
    console.log('Pedido Enviado:', finalOrder);
    toast({
      title: '¡Pedido enviado con éxito!',
      description: 'Tu solicitud de alquiler ha sido procesada.',
    });
    setOrderItems([]);
  };

  const handleClearOrder = () => {
    setOrderItems([]);
     toast({
      title: 'Pedido vaciado',
      description: 'Se han eliminado todos los artículos de tu pedido.',
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_400px] lg:gap-8">
          <ItemCatalog items={CATERING_ITEMS} onAddItem={handleAddItem} orderItems={orderItems} />
          <div className="mt-8 lg:mt-0">
            <OrderSummary
              items={orderItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onSubmitOrder={handleSubmitOrder}
              onClearOrder={handleClearOrder}
              onAddSuggestedItem={handleAddItem}
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
