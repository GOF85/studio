"use client";

import React from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Mail, Phone, Copy, User, Users, UserCog, ChefHat, Briefcase, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Responsable {
  nombre?: string;
  apellido?: string;
  rol?: string;
  telefono?: string;
  mail?: string;
  roles?: string[];
}


interface ResponsableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  responsables: Responsable[];
  numeroExpediente?: string;
}

export default function ResponsableModal({ open, onOpenChange, responsables, numeroExpediente }: ResponsableModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-full p-2 sm:p-4">
        <DialogHeader>
          <DialogTitle>
            {`Responsables OS${numeroExpediente ? ' ' + numeroExpediente : ''}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {responsables.map((resp, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/40 border border-border">
              <User className="h-6 w-6 text-amber-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs truncate">{resp.nombre} {resp.apellido}</div>
                {resp.rol && <div className="text-[11px] text-muted-foreground font-medium">{resp.rol}</div>}
                <div className="flex items-center gap-2 mt-1">
                  {resp.telefono && (
                    <a href={`tel:${resp.telefono}`} className="flex items-center gap-1 text-emerald-700 hover:underline text-xs">
                      <Phone className="h-4 w-4" /> {resp.telefono}
                    </a>
                  )}
                  {resp.mail && (
                    <a href={`mailto:${resp.mail}`} className="flex items-center gap-1 text-blue-700 hover:underline text-xs">
                      <Mail className="h-4 w-4" /> {resp.mail}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <DialogClose asChild>
          <button className="mt-2 w-full py-2 rounded bg-amber-600 text-white font-bold hover:bg-amber-700 transition text-sm" type="button">Cerrar</button>
        </DialogClose>

      </DialogContent>
    </Dialog>
  );
}
