
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
                <p className="text-xs text-muted-foreground">Cat. {item.categoria}</p>
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

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
        item.nombre.toLowerCase().includes(term) || 
        item.categoria.toLowerCase().includes(term)
    );
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
      <div className="border rounded-lg overflow-hidden">
        {filteredItems.length > 0 ? (
          <div className="divide-y">
            {filteredItems.map((item) => (
                <ItemRow 
                    key={item.id} 
                    item={item} 
                    onAdd={(itemToAdd) => onAddItem(itemToAdd, 1)} 
                />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground p-8">No se encontraron productos de venta que coincidan con tu búsqueda.</p>
        )}
      </div>
    </section>
  );
}
