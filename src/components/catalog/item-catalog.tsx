'use client';

import type { CateringItem, OrderItem } from '@/types';
import { ItemCard } from './item-card';
import { AssistantDialog } from '../order/assistant-dialog';

interface ItemCatalogProps {
  items: CateringItem[];
  orderItems: OrderItem[];
  onAddItem: (item: CateringItem, quantity: number) => void;
}

export function ItemCatalog({ items, onAddItem, orderItems }: ItemCatalogProps) {
  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h2 className="text-3xl font-headline font-bold tracking-tight">Catálogo de Artículos</h2>
        <AssistantDialog onAddSuggestedItem={onAddItem} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((item) => {
          const orderedItem = orderItems.find(oi => oi.itemCode === item.itemCode);
          const availableStock = item.stock - (orderedItem?.quantity || 0);
          return (
            <ItemCard key={item.itemCode} item={{...item, stock: availableStock}} onAddItem={(quantity) => onAddItem(item, quantity)} />
          )
        })}
      </div>
    </section>
  );
}
