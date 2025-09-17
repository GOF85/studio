
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';

import type { CateringItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ItemCardProps {
  item: CateringItem;
  onAddItem: (quantity: number) => void;
}

export function ItemCard({ item, onAddItem }: ItemCardProps) {
  const [quantity, setQuantity] = useState(1);

  const handleAddClick = () => {
    if (quantity > 0) {
      onAddItem(quantity);
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="p-0">
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={item.imageUrl}
            alt={item.description}
            fill
            className="object-cover"
            data-ai-hint={item.imageHint}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg font-headline mb-1">{item.description}</CardTitle>
        <CardDescription>Código: {item.itemCode}</CardDescription>
        <div className="flex items-center justify-between mt-2">
          <p className="text-lg font-semibold text-primary">
            {item.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            <span className="text-sm font-normal text-muted-foreground">/día</span>
          </p>
          <Badge variant={item.stock > 0 ? "secondary" : "destructive"}>
            {item.stock > 0 ? `${item.stock} disponibles` : "Agotado"}
          </Badge>
        </div>
         <Badge variant="outline" className="mt-2">{item.category}</Badge>
      </CardContent>
      <CardFooter className="p-4 pt-0 bg-secondary/30">
        <div className="flex w-full items-center gap-2">
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
            className="w-full"
            onClick={handleAddClick}
            disabled={item.stock === 0 || quantity > item.stock}
            aria-label={`Añadir ${item.description} al pedido`}
          >
            <Plus className="mr-2 h-4 w-4" /> Añadir
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
