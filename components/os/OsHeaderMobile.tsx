
"use client";

// --- Helper: formato corto dd/MM - dd/MM ---
function formatShortDateRange(start: string | Date, end: string | Date) {
  if (!start || !end) return '';
  const s = typeof start === 'string' ? new Date(start) : start;
  const e = typeof end === 'string' ? new Date(end) : end;
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const sStr = `${pad(s.getDate())}/${pad(s.getMonth() + 1)}`;
  const eStr = `${pad(e.getDate())}/${pad(e.getMonth() + 1)}`;
  return `${sStr} - ${eStr}`;
}

function getResponsablesFromEvento(evento: any) {
  if (!evento) return [];
  const responsables = [];
  if (evento.respMetre) responsables.push({ nombre: evento.respMetre, rol: 'Metre', telefono: evento.respMetrePhone, mail: evento.respMetreMail });
  if (evento.respPase) responsables.push({ nombre: evento.respPase, rol: 'Pase', telefono: evento.respPasePhone, mail: evento.respPaseMail });
  if (evento.respProjectManager) responsables.push({ nombre: evento.respProjectManager, rol: 'Project Manager', telefono: evento.respProjectManagerPhone, mail: evento.respProjectManagerMail });
  if (evento.comercial) responsables.push({ nombre: evento.comercial, rol: 'Comercial', telefono: evento.comercialPhone, mail: evento.comercialMail });
  if (evento.respCocinaPase) responsables.push({ nombre: evento.respCocinaPase, rol: 'Cocina Pase', telefono: evento.respCocinaPasePhone, mail: evento.respCocinaPaseMail });
  if (evento.respCocinaCPR) responsables.push({ nombre: evento.respCocinaCPR, rol: 'Cocina CPR', telefono: evento.respCocinaCPRPhone, mail: evento.respCocinaCPRMail });
  if (evento.respRRHH) responsables.push({ nombre: evento.respRRHH, rol: 'RRHH', telefono: evento.respRRHHPhone, mail: evento.respRRHHMail });
  return responsables;
}

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEvento } from '@/hooks/use-data-queries';
import { ResponsableBadge } from '@/components/calendar/responsable-badge';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Menu, Star, PersonStanding } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import OsModulesDialog from '@/components/os/OsModulesDialog';
import ResponsableModal from '@/components/os/ResponsableModal';
import SpaceDetailsDialog from '@/components/os/SpaceDetailsDialog';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';

// --- Helper functions ---
function formatDateRange(start: string | Date, end: string | Date) {
  try {
    const s = typeof start === 'string' ? parseISO(start) : start;
    const e = typeof end === 'string' ? parseISO(end) : end;
    return `${format(s, 'dd/MM/yyyy')} - ${format(e, 'dd/MM/yyyy')}`;
  } catch {
    return '';
  }
}

function countDays(start: string | Date, end: string | Date) {
  try {
    const s = typeof start === 'string' ? parseISO(start) : start;
    const e = typeof end === 'string' ? parseISO(end) : end;
    return differenceInCalendarDays(e, s) + 1;
  } catch {
    return '';
  }
}



export default function OsHeaderMobile({ osId }: { osId?: string }) {
  const { data: evento, isLoading } = useEvento(osId);
  const [open, setOpen] = useState(false);
  const [respModalOpen, setRespModalOpen] = useState(false);
  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
  const modulesDialogRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();
  const vip = evento?.isVip;
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!osId) return null;

  return (
    <TooltipProvider>
      <div className="w-full sticky top-12 z-40 border-b">
        <div className={cn('container mx-auto px-3 md:px-4 rounded-none', open ? 'flex flex-col min-h-[56px] py-0' : 'flex items-center min-h-[40px] py-0', vip ? 'bg-amber-400 border-amber-500/30 text-black shadow-lg' : 'bg-emerald-50 border-emerald-200 text-emerald-900') }>
          {/* Top row: service number + space on left, chevron on right */}
          <div
            className="flex items-center justify-between py-0 w-full cursor-pointer select-none"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            tabIndex={0}
            role="button"
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(v => !v); }}
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* Botón menú hamburguesa */}
              <button
                type="button"
                aria-label="Abrir menú"
                className="mr-2 p-1 rounded hover:bg-amber-100 focus:bg-amber-200 transition"
                onClick={e => { e.stopPropagation(); modulesDialogRef.current?.click(); }}
              >
                <Menu className="w-5 h-5" />
              </button>
              {/* OsModulesDialog - trigger escondido, controlado por hamburguesa */}
              <OsModulesDialog
                osId={osId}
                numeroExpediente={evento?.serviceNumber}
                trigger={<button ref={modulesDialogRef} className="hidden" />}
              />
              {/* Número de expediente - solo texto */}
              <span className="inline-flex items-center gap-1 truncate">
                {vip && <Star className="h-3 w-3 fill-current text-black" />}
                <span className="truncate font-mono">{evento?.serviceNumber}</span>
              </span>
              {/* Espacio badge/modal */}
              {evento?.space && (
                <button
                  type="button"
                  className="ml-2 px-2 py-0.5 rounded bg-white/90 border border-amber-300 text-xs font-semibold text-amber-900 shadow-sm hover:bg-amber-50 truncate max-w-[120px]"
                  onClick={e => { e.stopPropagation(); setSpaceDialogOpen(true); }}
                  title={evento.space}
                >
                  {evento.space}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={open ? 'Cerrar cabecera' : 'Expandir cabecera'}
                tabIndex={-1}
                className="ml-1 p-1 rounded-full hover:bg-amber-100 focus:bg-amber-200 transition"
                onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
              >
                {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Expanded second row: client left, date-range badge, responsable icon right */}
          {open && (
            <div className="mt-0 flex items-center justify-between" id="os-header-mobile-expandable">
              {/* Cliente final solo en mobile, cliente solo en desktop */}
              <div className="max-w-lg text-xs font-semibold text-foreground truncate">
                <span className="font-bold">{evento?.finalClient}</span>
                <span className="hidden md:inline text-muted-foreground font-normal">{evento?.client ? ` — ${evento.client}` : ''}</span>
              </div>

              {/* Derecha: fecha y responsables alineados */}
              <div className="flex items-center gap-2 ml-auto">
                {/* Badge fecha */}
                {evento?.startDate && evento?.endDate && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold">
                    {formatShortDateRange(evento.startDate, evento.endDate)}
                    <span className="ml-2 px-1 py-0.5 rounded bg-blue-200 text-blue-900 font-mono text-[10px]">
                      {countDays(evento.startDate, evento.endDate)}d
                    </span>
                  </span>
                )}
                {/* Badge Responsables + icono */}
                <button
                  aria-label="Ver responsables"
                  className="ml-2 px-2 py-0.5 rounded bg-white border border-amber-300 shadow text-amber-700 hover:bg-amber-50 focus:bg-amber-100 transition flex items-center gap-1 text-xs font-semibold"
                  onClick={() => setRespModalOpen(true)}
                  type="button"
                >
                  <span>Responsables</span>
                  <PersonStanding className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Responsable modal */}
          <ResponsableModal
            open={respModalOpen}
            onOpenChange={setRespModalOpen}
            responsables={getResponsablesFromEvento(evento)}
            numeroExpediente={evento?.serviceNumber}
          />
          <SpaceDetailsDialog
            open={spaceDialogOpen}
            onOpenChange={setSpaceDialogOpen}
            name={evento?.space}
            address={evento?.spaceAddress}
            // Aquí podrías pasar lat/lng si lo tienes para el mapa
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
