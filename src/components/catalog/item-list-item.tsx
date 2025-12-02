
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus } from 'lucide-react';

import type { CateringItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ItemListItemProps {
  item: CateringItem;
  onAddItem: (quantity: number) => void;
  orderType?: string | null;
}

function isValidHttpUrl(string: string) {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

export function ItemListItem({ item, onAddItem, orderType }: ItemListItemProps) {
  const [quantity, setQuantity] = useState(item.unidadVenta || 1);

  const handleAddClick = () => {
    if (quantity > 0) {
      onAddItem(quantity);
    }
  };
  
  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(Math.max(1, newQuantity));
  }
  
  const handleStepClick = (step: number) => {
    const newQuantity = quantity + (step * (item.unidadVenta || 1));
    handleQuantityChange(newQuantity);
  }


  const imageUrl = isValidHttpUrl(item.imageUrl) ? item.imageUrl : `https://picsum.photos/seed/${item.itemCode}/400/300`;

  return (
    <div className="flex items-center gap-2 p-2 border-b transition-colors hover:bg-secondary/50">
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
        <Image
          src={imageUrl}
          alt={item.description}
          fill
          className="object-cover"
          sizes="40px"
          data-ai-hint={item.imageHint}
        />
      </div>
      <div className="flex-grow">
        <h3 className="font-semibold text-base">{item.description}</h3>
        <Badge variant="outline" className="mt-1 text-xs">{item.category}</Badge>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="text-base font-semibold text-primary">
          {item.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
        </p>
      </div>
      <div className="flex items-center gap-2 w-48">
        <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleStepClick(-1)} disabled={quantity <= (item.unidadVenta || 1)}><Minus className="h-4 w-4" /></Button>
            <Input
            type="number"
            aria-label="Cantidad"
            value={quantity}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10) || 1)}
            min="1"
            className="h-9 w-16 text-center"
            />
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleStepClick(1)}><Plus className="h-4 w-4" /></Button>
        </div>
        <Button
          size="sm"
          className="flex-grow h-9"
          onClick={handleAddClick}
          aria-label={`Añadir ${item.description} al pedido`}
        >
          Añadir
        </Button>
      </div>
    </div>
  );
}
