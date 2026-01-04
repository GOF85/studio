"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name?: string | null;
  address?: string | null;
};

export default function SpaceDetailsDialog({ open, onOpenChange, name, address }: Props) {
  const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-4 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">{name || 'Espacio'}</DialogTitle>
        </DialogHeader>

        <div className="mt-3">
          {address ? (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Dirección</p>
              <p className="text-sm">{address}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin dirección disponible</p>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <ExternalLink className="h-4 w-4" />
              Abrir en Google Maps
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
