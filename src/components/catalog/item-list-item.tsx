
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';

import type { CateringItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ItemListItemProps {
  item: CateringItem;
  onAddItem: (quantity: number) => void;
}

export function ItemListItem({ item, onAddItem }: ItemListItemProps) {
  const [quantity, setQuantity] = useState(1);

  const handleAddClick = () => {
    if (quantity > 0) {
      onAddItem(quantity);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 border-b transition-colors hover:bg-secondary/50">
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md">
        <Image
          src={item.imageUrl}
          alt={item.description}
          fill
          className="object-cover"
          sizes="80px"
          data-ai-hint={item.imageHint}
        />
      </div>
      <div className="flex-grow">
        <h3 className="font-semibold text-lg">{item.description}</h3>
        <p className="text-sm text-muted-foreground">Código: {item.itemCode}</p>
        <Badge variant="outline" className="mt-1">{item.category}</Badge>
      </div>
      <div className="flex flex-col items-end gap-2">
        <p className="text-lg font-semibold text-primary">
          {item.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          <span className="text-sm font-normal text-muted-foreground">/día</span>
        </p>
         <Badge variant={item.stock > 0 ? "secondary" : "destructive"}>
            {item.stock > 0 ? `${item.stock} disponibles` : "Agotado"}
          </Badge>
      </div>
      <div className="flex items-center gap-2 w-48">
        <Input
          type="number"
          aria-label="Cantidad"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
          min="1"
          max={item.stock}
          className="w-20 text-center"
          disabled={item.stock === 0}
        />
        <Button
          className="flex-grow"
          onClick={handleAddClick}
          disabled={item.stock === 0 || quantity > item.stock}
          aria-label={`Añadir ${item.description} al pedido`}
        >
          <Plus className="mr-2 h-4 w-4" /> Añadir
        </Button>
      </div>
    </div>
  );
}
