"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
          <DialogDescription className="sr-only">
            Localización y detalles del espacio del evento.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3">
          {address ? (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Dirección</p>
              <p className="text-sm mb-2">{address}</p>
              <div className="rounded overflow-hidden border border-muted-foreground/10">
                <iframe
                  title="Mapa Google Maps"
                  width="100%"
                  height="180"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
                ></iframe>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin dirección disponible</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
