"use client";

import React from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Phone, User, ChefHat, HandPlatter, PencilRuler, ReceiptEuro, IdCard } from "lucide-react";
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
  // Icono por rol
  function getRolIcon(rol: string | undefined) {
    switch ((rol || '').toLowerCase()) {
      case 'metre': return <HandPlatter className="h-5 w-5 text-amber-600 flex-shrink-0" />;
      case 'pase': return <ChefHat className="h-5 w-5 text-amber-600 flex-shrink-0" />;
      case 'project manager': return <PencilRuler className="h-5 w-5 text-amber-600 flex-shrink-0" />;
      case 'comercial': return <ReceiptEuro className="h-5 w-5 text-amber-600 flex-shrink-0" />;
      case 'cocina pase': return <ChefHat className="h-5 w-5 text-amber-600 flex-shrink-0" />;
      case 'cocina cpr': return <ChefHat className="h-5 w-5 text-amber-600 flex-shrink-0" />;
      case 'rrhh': return <IdCard className="h-5 w-5 text-amber-600 flex-shrink-0" />;
      default: return <User className="h-5 w-5 text-amber-600 flex-shrink-0" />;
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-full p-2 sm:p-3 rounded-lg">
        <DialogHeader className="mb-1">
          <DialogTitle className="text-base font-bold">
            {`Responsables OS${numeroExpediente ? ' ' + numeroExpediente : ''}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {responsables.map((resp, i) => (
            <div key={i} className="flex items-start gap-2 p-1 rounded border border-border bg-muted/30">
              {getRolIcon(resp.rol)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <span className="truncate">{resp.nombre} {resp.apellido}</span>
                  {resp.rol && <span className="font-normal text-[11px] text-muted-foreground">| {resp.rol}</span>}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  {resp.telefono && (
                    <a href={`tel:${resp.telefono}`} className="flex items-center gap-1 text-emerald-700 hover:underline">
                      <Phone className="h-4 w-4" /> {resp.telefono}
                    </a>
                  )}
                  {resp.mail && (
                    <a href={`mailto:${resp.mail}`} className="flex items-center gap-1 text-blue-700 hover:underline">
                      <Mail className="h-4 w-4" /> {resp.mail}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
