
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

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEvento, usePersonal } from '@/hooks/use-data-queries';
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
  const { data: personal } = usePersonal();
  const [open, setOpen] = useState(false);
  const [respModalOpen, setRespModalOpen] = useState(false);
  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
  const modulesDialogRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();
  const vip = evento?.isVip;
  const pathname = usePathname();

  function getResponsablesFromEvento(evento: any) {
    if (!evento) return [];
    const responsablesList: any[] = [];
    
    // El objeto responsables puede venir en una columna JSONB o en columnas sueltas
    const respObj = (typeof evento.responsables === 'string' 
      ? JSON.parse(evento.responsables) 
      : (evento.responsables || {}));

    const getVal = (jsonKey: string, camelKey: string, snakeKey: string) => {
      return respObj[jsonKey] || evento[camelKey] || evento[snakeKey];
    }

    const rolesMap = [
      { id: 'metre', label: 'Metre', json: 'metre', camel: 'respMetre', snake: 'metre_responsable' },
      { id: 'pase', label: 'Pase', json: 'pase', camel: 'respPase', snake: 'resp_pase' },
      { id: 'cocina_pase', label: 'Cocina Pase', json: 'cocina_pase', camel: 'respCocinaPase', snake: 'resp_cocina_pase' },
      { id: 'cocina_cpr', label: 'Cocina CPR', json: 'cocina_cpr', camel: 'respCocinaCPR', snake: 'produccion_cocina_cpr' },
      { id: 'pm', label: 'Project Manager', json: 'project_manager', camel: 'respProjectManager', snake: 'project_manager' },
      { id: 'logistica', label: 'Logística', json: 'logistica', camel: 'respLogistica', snake: 'logistica_evento' },
      { id: 'comercial', label: 'Comercial', json: 'comercial', camel: 'comercial', snake: 'comercial' },
      { id: 'rrhh', label: 'RRHH', json: 'rrhh', camel: 'respRRHH', snake: 'resp_rrhh' },
    ];

    rolesMap.forEach(role => {
      let name = getVal(role.json, role.camel, role.snake);
      
      // Fallbacks específicos
      if (!name && role.id === 'pm') name = evento.revision_pm_name;
      if (!name && role.id === 'logistica') name = evento.mozo;
      if (!name && role.id === 'cocina_cpr') name = evento.jefe_cocina;

      if (name) {
        let telefono = getVal(`${role.json}_phone`, `${role.camel}Phone`, `${role.snake}_phone`);
        let mail = getVal(`${role.json}_mail`, `${role.camel}Mail`, `${role.snake}_mail`);

        // Si faltan datos o el nombre es un ID, intentar buscar en la lista de personal
        const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-.*$/i.test(name) || (name.length > 5 && !name.includes(' '));
        if (personal) {
          const person = isId 
            ? personal.find(p => p.id === name)
            : personal.find(p => `${p.nombre} ${p.apellido1}` === name);
          
          if (person) {
            if (isId) name = `${person.nombre} ${person.apellido1}`;
            if (!telefono) telefono = person.telefono || '';
            if (!mail) mail = person.email || '';
          }
        }

        responsablesList.push({
          nombre: name,
          rol: role.label,
          telefono,
          mail
        });
      }
    });

    return responsablesList;
  }

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
                numeroExpediente={evento?.serviceNumber || osId}
                trigger={<button ref={modulesDialogRef} className="hidden" />}
              />
              {/* Número de expediente - solo texto */}
              <span className="inline-flex items-center gap-1 truncate">
                {vip && <Star className="h-3 w-3 fill-current text-black" />}
                <span className="truncate font-mono">{evento?.serviceNumber || osId}</span>
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
            <div className="mt-0 flex flex-col gap-0.5" id="os-header-mobile-expandable">
              <div className="flex items-center justify-between">
                {/* Cliente final solo en mobile, cliente solo en desktop */}
                <div className="max-w-lg text-xs font-semibold text-foreground truncate">
                  <span className="font-bold">{evento?.finalClient}</span>
                  <span className="hidden md:inline text-muted-foreground font-normal">{evento?.client ? ` — ${evento.client}` : ''}</span>
                </div>

                {/* Derecha: responsables alineados */}
                <div className="flex items-center gap-2 ml-auto">
                  {/* Badge Responsables + icono */}
                  <button
                    aria-label="Ver responsables"
                    className="px-2 py-0.5 rounded bg-white border border-amber-300 shadow text-amber-700 hover:bg-amber-50 focus:bg-amber-100 transition flex items-center gap-1 text-xs font-semibold"
                    onClick={() => setRespModalOpen(true)}
                    type="button"
                  >
                    <span>Responsables</span>
                    <PersonStanding className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Segunda línea: Fecha y Duración */}
              {evento?.startDate && evento?.endDate && (
                <div className="flex items-center gap-2 text-[11px] font-bold text-blue-800">
                  <span className="px-1.5 py-0.5 rounded bg-blue-100/80">
                    {formatDateRange(evento.startDate, evento.endDate)}
                    <span className="ml-2 px-1 py-0.5 rounded bg-blue-200 text-blue-900 font-mono text-[10px]">
                      {countDays(evento.startDate, evento.endDate)} {countDays(evento.startDate, evento.endDate) === 1 ? 'día' : 'días'}
                    </span>
                  </span>
                </div>
              )}
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
