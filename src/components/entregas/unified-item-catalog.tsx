

'use client';

import { useState, useMemo } from 'react';
import type { ProductoVenta } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';


interface UnifiedItemCatalogProps {
  items: ProductoVenta[];
  onAddItem: (item: ProductoVenta, quantity: number) => void;
}

function ItemRow({ item, onAdd }: { item: ProductoVenta, onAdd: (item: ProductoVenta) => void }) {
    return (
        <div className="flex items-center gap-4 p-2 border-b transition-colors hover:bg-secondary/50">
            <div className="flex-grow">
                <h3 className="font-semibold text-base">{item.nombre}</h3>
            </div>
            <div className="text-sm font-semibold text-primary w-24 text-right">
                {formatCurrency(item.pvp)}
            </div>
            <Button size="sm" variant="outline" className="w-24" onClick={() => onAdd(item)}>
                <Plus className="mr-1 h-4 w-4" /> Añadir
            </Button>
        </div>
    )
}

export function UnifiedItemCatalog({ items, onAddItem }: UnifiedItemCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');

   const groupedAndSortedItems = useMemo(() => {
    const grouped: { [key: string]: ProductoVenta[] } = {};
    
    const filteredItems = items.filter(item => 
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filteredItems.forEach(item => {
      if (!grouped[item.categoria]) {
        grouped[item.categoria] = [];
      }
      grouped[item.categoria].push(item);
    });

    for (const category in grouped) {
        grouped[category].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
    
    return Object.entries(grouped).sort(([catA], [catB]) => catA.localeCompare(catB));
  }, [items, searchTerm]);


  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h2 className="text-3xl font-headline font-bold tracking-tight">Confección del Pedido</h2>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input 
          placeholder="Buscar producto de venta..."
          className="flex-grow"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="border rounded-lg overflow-y-auto max-h-[calc(100vh-20rem)]">
        {groupedAndSortedItems.length > 0 ? (
          <div className="divide-y">
             {groupedAndSortedItems.map(([category, items]) => (
                <div key={category}>
                    <h3 className="font-bold bg-muted/50 p-2 sticky top-0">{category}</h3>
                    {items.map((item) => (
                        <ItemRow 
                            key={item.id} 
                            item={item} 
                            onAdd={(itemToAdd) => onAddItem(itemToAdd, 1)} 
                        />
                    ))}
                </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground p-8">No se encontraron productos de venta que coincidan con tu búsqueda.</p>
        )}
      </div>
    </section>
  );
}
