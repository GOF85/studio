"use client";

import React from 'react';
import { Phone, Mail, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nombre?: string;
  rolLabel?: string;
  telefono?: string;
  mail?: string;
};

export default function BadgeDetailsDialog({ open, onOpenChange, nombre, rolLabel, telefono, mail }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Contacto</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <div className="text-sm font-bold">{nombre || 'Sin asignar'}</div>
            {rolLabel && <div className="text-xs text-muted-foreground">{rolLabel}</div>}
          </div>

          {telefono && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-foreground/90" />
              <a href={`tel:${telefono}`} className="text-sm text-blue-600 hover:underline">{telefono}</a>
            </div>
          )}

          {mail && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-foreground/90" />
              <a href={`mailto:${mail}`} className="text-sm text-blue-600 hover:underline">{mail}</a>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
