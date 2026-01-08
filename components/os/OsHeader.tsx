"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useEvento } from '@/hooks/use-data-queries';
import { cn } from '@/lib/utils';
import { Calendar, Building, Users, Star, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import OsModulesDialog from '@/components/os/OsModulesDialog';
import { Menu, ChevronDown, ChevronUp } from 'lucide-react';
import BadgeDetailsDialog from '@/components/os/BadgeDetailsDialog';
import { ResponsableBadge } from '@/components/calendar/responsable-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import SpaceDetailsDialog from '@/components/os/SpaceDetailsDialog';

type Props = {
  osId?: string | null;
  subtitle?: string | null;
  subtitleIcon?: React.ReactNode;
};

const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.split(' ');
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export function OsHeader({ osId, subtitle, subtitleIcon }: Props) {
  const { data: serviceOrder, isLoading } = useEvento(osId || undefined);
  const [open, setOpen] = useState(false);
  const [selectedResp, setSelectedResp] = useState<null | { nombre: string; rolLabel?: string; telefono?: string; mail?: string }>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);

  const durationDays = useMemo(() => {
    if (!serviceOrder?.startDate || !serviceOrder?.endDate) return 0;
    return differenceInDays(new Date(serviceOrder.endDate), new Date(serviceOrder.startDate)) + 1;
  }, [serviceOrder]);

  if (isLoading || !serviceOrder) {
    return (
      <div className="sticky top-12 z-30 py-2 border-b bg-background/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex-1">
            <div className="h-6 w-48 bg-muted/20 rounded-md animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const mapsUrl = serviceOrder.spaceAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(serviceOrder.spaceAddress)}` : null;

  return (
    <div className="w-full sticky top-12 z-30 py-0 border-b transition-all duration-300">
      <div className={cn('container mx-auto px-3 md:px-4 rounded-none', open ? 'min-h-[64px]' : 'min-h-[40px]', serviceOrder.isVip ? 'bg-amber-400 border-amber-500/30 text-black shadow-lg' : 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm')}>
        {/* Header main row: left column contains service number stack, right column badges/toggle */}
        <div className="flex items-center justify-between py-0">
          <div className="flex items-center gap-3">
            <OsModulesDialog 
              osId={serviceOrder.id} 
              numeroExpediente={serviceOrder.serviceNumber}
              trigger={
                <button className={cn('transition-transform duration-200 transform-gpu will-change-transform flex items-center justify-center hover:shadow-md', open ? 'h-full w-14 scale-105 shadow-md rounded-md' : 'h-8 w-8 scale-100 rounded-full')}>
                  <Menu className={cn('transition-transform duration-200 transform-gpu', open ? 'h-6 w-6 scale-110' : 'h-5 w-5 scale-100')} />
                </button>
              } 
            />

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <Link href={`/os/${serviceOrder.serviceNumber || osId}`} className="flex items-center gap-2 group">
                  <div className={cn(
                    "p-1 rounded-xl transition-all duration-300 shadow-inner",
                    serviceOrder.isVip ? "bg-black/20 text-black" : "bg-primary/10 text-primary"
                  )}>
                    <ClipboardList className="h-3 w-3" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {serviceOrder.isVip && <Star className="h-3 w-3 fill-black text-black" />}
                    <span className="font-black tracking-tighter text-[9px]">{serviceOrder.serviceNumber}</span>
                  </div>
                </Link>

                <div className="h-3 w-[1px] mx-1 bg-border/40" />
                <button onClick={() => setSpaceDialogOpen(true)} className="text-[9px] font-semibold text-muted-foreground/90 hover:underline">{serviceOrder.space}</button>
              </div>
              {open && (
                <div className="mt-0 text-left">
                  <div className="max-w-lg text-[9px] font-semibold text-foreground truncate">{serviceOrder.client}—{serviceOrder.finalClient || ''}</div>
                </div>
              )}
            </div>
          </div>

            <div className="flex items-center gap-3">
            {open && (
              <div className="flex items-center gap-3">
                <button onClick={() => { setSelectedResp({ nombre: serviceOrder.respMetre || '', rolLabel: 'Metre', telefono: serviceOrder.respMetrePhone, mail: serviceOrder.respMetreMail }); setDialogOpen(true); }} aria-label="Metre">
                  <ResponsableBadge nombre={serviceOrder.respMetre || ''} rol="metre" showTooltip={false} compact />
                </button>

                <button onClick={() => { setSelectedResp({ nombre: serviceOrder.respPase || '', rolLabel: 'Pase', telefono: serviceOrder.respPasePhone, mail: serviceOrder.respPaseMail }); setDialogOpen(true); }} aria-label="Pase">
                  <ResponsableBadge nombre={serviceOrder.respPase || ''} rol="pase" showTooltip={false} compact />
                </button>

                <button onClick={() => { setSelectedResp({ nombre: serviceOrder.respProjectManager || '', rolLabel: 'PM', telefono: serviceOrder.respProjectManagerPhone, mail: serviceOrder.respProjectManagerMail }); setDialogOpen(true); }} aria-label="PM">
                  <ResponsableBadge nombre={serviceOrder.respProjectManager || ''} rol="project-manager" showTooltip={false} compact />
                </button>

                <button onClick={() => { setSelectedResp({ nombre: serviceOrder.comercial || '', rolLabel: 'Comercial', telefono: serviceOrder.comercialPhone, mail: serviceOrder.comercialMail }); setDialogOpen(true); }} aria-label="Comercial">
                  <ResponsableBadge nombre={serviceOrder.comercial || ''} rol="project-manager" showTooltip={false} compact />
                </button>
              </div>
            )}

            <div>
              <button onClick={() => setOpen(v => !v)} className="p-1 rounded-md hover:bg-muted/20">
                {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>

        <BadgeDetailsDialog
          open={dialogOpen}
          onOpenChange={(v) => { setDialogOpen(v); if (!v) setSelectedResp(null); }}
          nombre={selectedResp?.nombre}
          rolLabel={selectedResp?.rolLabel}
          telefono={selectedResp?.telefono}
          mail={selectedResp?.mail}
        />
        <SpaceDetailsDialog open={spaceDialogOpen} onOpenChange={(v) => setSpaceDialogOpen(v)} name={serviceOrder.space} address={serviceOrder.spaceAddress} />
      </div>
    </div>
  );
}

export default OsHeader;
