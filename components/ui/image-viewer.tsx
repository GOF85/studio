'use client'

import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogOverlay, DialogClose, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { NormalizedImage, getImageList } from '@/lib/image-utils';
import { cn } from '@/lib/utils';

interface ImageViewerProps {
  images: any;
  startIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageViewer({ images, startIndex = 0, open, onOpenChange }: ImageViewerProps) {
  const list: NormalizedImage[] = getImageList(images);
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    setIndex(startIndex);
  }, [startIndex]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') onOpenChange(false);
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(list.length - 1, i + 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, list.length, onOpenChange]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(list.length - 1, i + 1)), [list.length]);

  if (!list || list.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0 bg-black/95 border-none flex items-center justify-center">
        <DialogTitle className="sr-only">{`Vista de imagen ${index + 1} de ${list.length}`}</DialogTitle>
        <div className="relative w-full h-full flex items-center justify-center">
          <button aria-label="Anterior" className="absolute left-4 z-50 p-2 text-white" onClick={prev}>
            <ArrowLeft className="h-6 w-6" />
          </button>

          <div className="max-w-full max-h-full flex items-center justify-center">
            <img src={list[index].url} alt={`Imagen ${index + 1}`} className="max-w-full max-h-full object-contain" />
          </div>

          <button aria-label="Siguiente" className="absolute right-4 z-50 p-2 text-white" onClick={next}>
            <ArrowRight className="h-6 w-6" />
          </button>

          <div className="absolute left-0 right-0 bottom-4 text-center text-sm text-white/90">
            {index + 1} / {list.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageViewer;
