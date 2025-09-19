
'use client';

import { useState, useMemo } from 'react';
import type { CateringItem, OrderItem } from '@/types';
import { ItemListItem } from './item-list-item';
import { AssistantDialog } from '../order/assistant-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ItemCatalogProps {
  items: CateringItem[];
  orderItems: OrderItem[];
  onAddItem: (item: CateringItem, quantity: number) => void;
  orderType: string | null;
}

export function ItemCatalog({ items, onAddItem, orderItems, orderType }: ItemCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = useMemo(() => ['all', ...new Set(items.map(item => item.category))], [items]);
  
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || item.itemCode.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, searchTerm, selectedCategory]);

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h2 className="text-3xl font-headline font-bold tracking-tight">Catálogo de Artículos</h2>
        {orderType !== 'Alquiler' && <AssistantDialog onAddSuggestedItem={onAddItem} />}
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input 
          placeholder="Buscar por nombre o código..."
          className="flex-grow"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[240px]">
            <SelectValue placeholder="Filtrar por categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category === 'all' ? 'Todas las categorías' : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="border rounded-lg overflow-hidden">
        {filteredItems.length > 0 ? (
          <div className="divide-y">
            {filteredItems.map((item, index) => {
              const orderedItem = orderItems.find(oi => oi.itemCode === item.itemCode);
              const availableStock = item.stock - (orderedItem?.quantity || 0);
              return (
                <ItemListItem key={`${item.itemCode}-${index}`} item={{...item, stock: availableStock}} onAddItem={(quantity) => onAddItem(item, quantity)} orderType={orderType} />
              )
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground p-8">No se encontraron artículos que coincidan con tu búsqueda.</p>
        )}
      </div>
    </section>
  );
}
