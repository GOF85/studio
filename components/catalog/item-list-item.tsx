
'use client';

import { useState, useEffect, memo } from 'react';
import ImageViewer from '@/components/ui/image-viewer';
import { getThumbnail, getImageList } from '@/lib/image-utils';
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

function isValidImageUrl(string: string) {
  if (!string || typeof string !== 'string') return false;
  const s = string.trim();
  if (s.startsWith('/') || s.startsWith('//') || s.startsWith('data:') || s.startsWith('blob:')) return true;
  try {
    const url = new URL(s);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function ItemListItemInner({ item, onAddItem, orderType }: ItemListItemProps) {
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


  const imageUrl = isValidImageUrl(item.imageUrl) ? item.imageUrl : null;
  const [isOpen, setIsOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  // FIXED: If item.imageUrl already has a URL (from catalogItems), use it directly
  // Otherwise try to extract from imagenes array
  const thumb = item.imageUrl ? item.imageUrl : getThumbnail(item.imagenes);
  const imagesList = getImageList(item.imagenes || item.imageUrl || item.images || item);

  // Debug logging
  if (!thumb) {
    console.log(`[NO THUMB] ${item.description}: imagenes=${item.imagenes ? 'exists' : 'null'}, imageUrl=${item.imageUrl || 'null'}`);
  }

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return (
    <div className="flex items-center gap-2 py-2 px-3 border-b transition-colors hover:bg-secondary/50 min-h-[56px]">
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted flex items-center justify-center">
        {thumb ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img onClick={() => { setStartIndex(0); setIsOpen(true); }} src={thumb} alt={item.description} className="object-cover w-full h-full cursor-zoom-in" data-ai-hint={item.imageHint} />
            <ImageViewer images={imagesList} startIndex={startIndex} open={isOpen} onOpenChange={setIsOpen} />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-grow min-w-0">
        <h3 className="font-bold text-[13px] leading-tight truncate">{item.description}</h3>
        <Badge variant="outline" className="mt-1 text-[10px] font-semibold">{item.tipo || item.category}</Badge>
      </div>
      <div className="flex flex-col items-end gap-1 min-w-[70px] flex-shrink-0">
        <p className="text-[12px] font-semibold text-primary">
          {(item.price || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
        </p>
      </div>
      <div className="flex items-center gap-1 w-auto min-w-[180px] flex-shrink-0">
        <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleStepClick(-1)} disabled={quantity <= (item.unidadVenta || 1)}><Minus className="h-3.5 w-3.5" /></Button>
            <Input
            type="number"
            aria-label="Cantidad"
            value={quantity}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10) || 1)}
            min="1"
            className="h-8 w-12 text-center text-[12px]"
            />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleStepClick(1)}><Plus className="h-3.5 w-3.5" /></Button>
        </div>
        <Button
          size="sm"
          className="flex-grow h-8 whitespace-nowrap px-3 text-[12px]"
          onClick={handleAddClick}
          aria-label={`Añadir ${item.description} al pedido`}
        >
          Añadir
        </Button>
      </div>
    </div>
  );
}

export const ItemListItem = memo(ItemListItemInner);
