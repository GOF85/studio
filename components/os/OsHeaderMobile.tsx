"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useEvento } from '@/hooks/use-data-queries';
import { ResponsableBadge } from '@/components/calendar/responsable-badge';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Menu, Star } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import OsModulesDialog from '@/components/os/OsModulesDialog';
import BadgeDetailsDialog from '@/components/os/BadgeDetailsDialog';
import SpaceDetailsDialog from '@/components/os/SpaceDetailsDialog';
import { useIsMobile } from '@/hooks/use-is-mobile';

export default function OsHeaderMobile({ osId }: { osId?: string }) {
  const { data: evento, isLoading } = useEvento(osId);
  const [open, setOpen] = useState(false);
  const [selectedResp, setSelectedResp] = useState<null | { nombre: string; rolLabel?: string; telefono?: string; mail?: string }>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
  const lastScrollY = useRef(0);
  // Auto-collapse on scroll: collapse when scrolling down, expand when scrolling up
  useEffect(() => {
    const threshold = 10;
    const onScroll = () => {
      const current = window.scrollY;
      if (Math.abs(current - lastScrollY.current) < threshold) return;

      if (current > lastScrollY.current) {
        // scrolling down -> collapse
        setOpen(false);
      } else {
        // scrolling up -> expand
        setOpen(true);
      }

      lastScrollY.current = current;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isMobile = useIsMobile();

  if (!osId) return null;

  const vip = evento?.isVip;

  return (
    <TooltipProvider>
      <div className="w-full sticky top-12 z-40 border-b">
          <div className={cn('container mx-auto px-3 md:px-4 rounded-none', open ? 'flex flex-col min-h-[56px] py-0' : 'flex items-center min-h-[40px] py-0', vip ? 'bg-amber-400 border-amber-500/30 text-black shadow-lg' : 'bg-emerald-50 border-emerald-200 text-emerald-900') }>
            {/* Top row: service number + space on left, chevron on right */}
            <div className="flex items-center justify-between py-0 w-full">
            <div className="flex items-center gap-3">
                  <OsModulesDialog
                osId={osId}
                trigger={
                  <button
                    aria-label="Abrir módulos"
                    className={cn('transition-transform duration-200 transform-gpu will-change-transform flex items-center justify-center hover:shadow-md', open ? 'h-9 w-9 scale-105 shadow-md rounded-md' : 'h-8 w-8 scale-100 rounded-full')}
                  >
                    <Menu className={cn('transition-transform duration-200 transform-gpu', open ? 'h-5 w-5 scale-110' : 'h-4 w-4 scale-100')} />
                  </button>
                }
              />

              <div className="flex items-center gap-2">
                <div className="text-xs font-extrabold truncate flex items-center gap-2">{isLoading ? 'Cargando...' : (
                  <>
                    {vip && <Star className="h-3 w-3 fill-current text-black" />}
                    <span>{evento?.serviceNumber}</span>
                  </>
                )}</div>
                {evento?.space && (
                  <button onClick={() => setSpaceDialogOpen(true)} className="text-xs font-semibold text-muted-foreground truncate hover:underline">· {evento.space}</button>
                )}
              </div>
            </div>

            <div>
              <button
                aria-expanded={open}
                onClick={() => setOpen(v => !v)}
                className="p-1 rounded-md hover:bg-muted/30 transition-transform transform-gpu"
              >
                {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* Expanded second row: client left, badges right */}
          {open && (
            <div className="mt-0 flex items-center justify-between">
              <div className="max-w-lg text-xs font-semibold text-foreground truncate">{evento?.client}—{evento?.finalClient || ''}</div>

              <div className="flex items-center gap-2">
                <button onClick={() => { setSelectedResp({ nombre: evento?.respMetre || '', rolLabel: 'Metre', telefono: evento?.respMetrePhone, mail: evento?.respMetreMail }); setDialogOpen(true); }} aria-label="Metre">
                  <ResponsableBadge nombre={evento?.respMetre || ''} rol="metre" showTooltip={false} compact />
                </button>

                <button onClick={() => { setSelectedResp({ nombre: evento?.respPase || '', rolLabel: 'Pase', telefono: evento?.respPasePhone, mail: evento?.respPaseMail }); setDialogOpen(true); }} aria-label="Pase">
                  <ResponsableBadge nombre={evento?.respPase || ''} rol="pase" showTooltip={false} compact />
                </button>

                <button onClick={() => { setSelectedResp({ nombre: evento?.respProjectManager || '', rolLabel: 'PM', telefono: evento?.respProjectManagerPhone, mail: evento?.respProjectManagerMail }); setDialogOpen(true); }} aria-label="PM">
                  <ResponsableBadge nombre={evento?.respProjectManager || ''} rol="project-manager" showTooltip={false} compact />
                </button>

                <button onClick={() => { setSelectedResp({ nombre: evento?.comercial || '', rolLabel: 'Comercial', telefono: evento?.comercialPhone, mail: evento?.comercialMail }); setDialogOpen(true); }} aria-label="Comercial">
                  <ResponsableBadge nombre={evento?.comercial || ''} rol="project-manager" showTooltip={false} compact />
                </button>
              </div>
            </div>
          )}

          {/* Badge details dialog */}
          <BadgeDetailsDialog
            open={dialogOpen}
            onOpenChange={(v) => { setDialogOpen(v); if (!v) setSelectedResp(null); }}
            nombre={selectedResp?.nombre}
            rolLabel={selectedResp?.rolLabel}
            telefono={selectedResp?.telefono}
            mail={selectedResp?.mail}
          />
          <SpaceDetailsDialog open={spaceDialogOpen} onOpenChange={(v) => setSpaceDialogOpen(v)} name={evento?.space} address={evento?.spaceAddress} />
        </div>
      </div>
    </TooltipProvider>
  );
}
