

'use client';

import { useState, useMemo } from 'react';
import type { Receta, PackDeVenta, Precio, PedidoEntregaItem } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

type CatalogItem = Receta | PackDeVenta | Precio;

interface UnifiedItemCatalogProps {
  items: CatalogItem[];
  onAddItem: (item: CatalogItem, quantity: number) => void;
}

function ItemRow({ item, onAdd }: { item: CatalogItem, onAdd: () => void }) {
    let name: string, description: string, price: number | string;

    if ('nombre' in item) {
        name = item.nombre;
        description = 'pvp' in item ? `Pack de Venta` : `Receta de Gastronomía`;
        price = 'pvp' in item ? item.pvp.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : (item.precioVenta || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
    } else { // It's a Precio
        name = item.producto;
        description = `Cat. ${item.categoria} - ${item.loc}`;
        price = item.precioUd.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
    }

    return (
        <div className="flex items-center gap-4 p-2 border-b transition-colors hover:bg-secondary/50">
            <div className="flex-grow">
                <h3 className="font-semibold text-base">{name}</h3>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="text-sm font-semibold text-primary w-24 text-right">
                {price}
            </div>
            <Button size="sm" variant="outline" className="w-24" onClick={onAdd}>
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
    return items.filter(item => {
        if ('nombre' in item) return item.nombre.toLowerCase().includes(term);
        if ('producto' in item) return item.producto.toLowerCase().includes(term);
        return false;
    });
  }, [items, searchTerm]);

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h2 className="text-3xl font-headline font-bold tracking-tight">Confección del Pedido</h2>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input 
          placeholder="Buscar por nombre en todo el catálogo (gastronomía, packs, bebidas...)"
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
                    key={'id' in item ? item.id : item.producto} 
                    item={item} 
                    onAdd={() => onAddItem(item, 1)} 
                />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground p-8">No se encontraron artículos que coincidan con tu búsqueda.</p>
        )}
      </div>
    </section>
  );
}
