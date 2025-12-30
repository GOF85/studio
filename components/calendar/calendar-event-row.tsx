'use client';

import { memo, useMemo } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { ResponsableBadge } from './responsable-badge';
import { cn } from '@/lib/utils';

// Utils
const formatSafeTime = (time: any) => {
  if (!time) return '--:--';
  if (typeof time !== 'string') return '--:--';
  // Si ya es formato HH:mm o HH:mm:ss
  if (/^\d{2}:\d{2}/.test(time)) return time.substring(0, 5);
  try {
    const d = new Date(time);
    if (isNaN(d.getTime())) return time;
    return format(d, 'HH:mm');
  } catch {
    return time;
  }
};

export interface CalendarEvent {
  date: Date;
  osId: string;
  serviceNumber: string;
  horaInicio: string;
  horaFin: string;
  space: string;
  client: string;
  finalClient: string;
  asistentes: number;
  status: string;
  briefingItems?: any[];
  gastronomyCount?: number;
  gastronomyPaxTotal?: number;
  respMetre?: string;
  respPase?: string;
  respProjectManager?: string;
  respMetrePhone?: string;
  respPasePhone?: string;
  respProjectManagerPhone?: string;
  respMetreMail?: string;
  respPaseMail?: string;
  respProjectManagerMail?: string;
}

export interface CalendarEventRowProps {
  event: CalendarEvent;
  onViewDetails: (serviceNumber: string) => void;
}

// Obtener colores según estado
const getStatusStyles = (status: string) => {
  const s = status?.toUpperCase() || '';
  switch (s) {
    case 'BORRADOR':
      return {
        badge: 'outline',
        border: 'border-dashed border-muted-foreground/40',
        bg: 'hover:bg-muted/40',
      };
    case 'PENDIENTE':
      return {
        badge: 'secondary',
        border: 'border border-amber-400',
        bg: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/30',
      };
    case 'CONFIRMADO':
      return {
        badge: 'default',
        border: 'border border-primary',
        bg: 'hover:bg-primary/5',
      };
    case 'EJECUTADO':
      return {
        badge: 'secondary',
        border: 'border border-slate-400',
        bg: 'hover:bg-slate-50/50 dark:hover:bg-slate-950/30',
      };
    case 'CANCELADO':
      return {
        badge: 'destructive',
        border: 'border border-destructive',
        bg: 'hover:bg-destructive/5',
      };
    default:
      return {
        badge: 'default',
        border: 'border border-border',
        bg: 'hover:bg-muted/40',
      };
  }
};

const getStatusLabel = (status: string): string => {
  const s = status?.toUpperCase() || '';
  switch (s) {
    case 'BORRADOR':
      return 'Borrador';
    case 'PENDIENTE':
      return 'Pendiente';
    case 'CONFIRMADO':
      return 'Confirmado';
    case 'EJECUTADO':
      return 'Entregado';
    case 'CANCELADO':
      return 'Cancelado';
    default:
      return status || 'Sin estado';
  }
};

const truncateText = (text: string, maxLength: number = 20): string => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

const CalendarEventRowComponent = ({
  event,
  onViewDetails,
}: CalendarEventRowProps) => {
  const styles = useMemo(() => getStatusStyles(event.status), [event.status]);
  const statusLabel = useMemo(() => getStatusLabel(event.status), [event.status]);
  const truncatedSpace = useMemo(
    () => truncateText(event.space, 22),
    [event.space]
  );

  const handleClick = () => {
    onViewDetails(event.serviceNumber);
  };

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        onClick={handleClick}
        className={cn(
          'w-full h-auto p-3 justify-start gap-4 rounded-xl transition-all duration-300',
          'border border-border/40 bg-card/40 backdrop-blur-sm',
          styles.bg,
          styles.border,
          'group hover:shadow-md active:scale-[0.98]',
          'flex items-center flex-wrap md:flex-nowrap'
        )}
      >
        {/* Hora */}
        <div className="flex-shrink-0 w-24 md:w-28">
          <span className="text-xs font-black font-mono text-foreground tracking-tighter">
            {event.horaInicio} - {event.horaFin}
          </span>
        </div>

        {/* Espacio - Truncado en mobile */}
        <div className="flex-shrink-0 min-w-0 flex-1 md:w-48 md:flex-shrink-0">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-black text-foreground truncate block tracking-tight uppercase"
              title={event.space}
            >
              {truncatedSpace}
            </span>
            <span className="text-[10px] font-bold text-indigo-600/80">
              OS-{event.serviceNumber}
            </span>
          </div>
          <div className="flex items-center gap-2 truncate opacity-60">
            <span className="text-[10px] text-muted-foreground font-bold truncate block">
              {event.client}
            </span>
            <span className="text-[10px] text-muted-foreground font-black truncate block">
              • {event.finalClient}
            </span>
          </div>
        </div>

        {/* Pax */}
        <div className="flex-shrink-0 w-16 md:w-20">
          <span className="text-sm font-black text-primary tracking-tighter flex items-center gap-1">
            {event.asistentes} <Users className="h-3 w-3 text-muted-foreground" />
          </span>
        </div>

        {/* Estado - Badge */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {event.gastronomyCount !== undefined && event.gastronomyCount > 0 && (
            <Badge variant="secondary" className="text-[9px] px-2 py-0.5 font-black bg-orange-50 text-orange-700 border-orange-200">
              🍴 {event.gastronomyCount}
            </Badge>
          )}
          <Badge
            variant={styles.badge as any}
            className="text-[9px] px-2 py-0.5 font-black uppercase tracking-tighter"
          >
            {statusLabel}
          </Badge>
        </div>

        {/* Responsables - Badges compactos */}
        <div className="w-full md:w-auto flex items-center gap-1.5 mt-2 md:mt-0 flex-wrap md:flex-nowrap">
          {event.respMetre && (
            <ResponsableBadge
              nombre={event.respMetre}
              rol="metre"
              telefono={event.respMetrePhone}
              email={event.respMetreMail}
              showTooltip={true}
            />
          )}
          {event.respPase && (
            <ResponsableBadge
              nombre={event.respPase}
              rol="pase"
              telefono={event.respPasePhone}
              email={event.respPaseMail}
              showTooltip={true}
            />
          )}
          {event.respProjectManager && (
            <ResponsableBadge
              nombre={event.respProjectManager}
              rol="project-manager"
              telefono={event.respProjectManagerPhone}
              email={event.respProjectManagerMail}
              showTooltip={true}
            />
          )}
        </div>
      </Button>

      {/* Briefing Items with Times */}
      {event.briefingItems && event.briefingItems.length > 0 && (
        <div className="ml-4 md:ml-32 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {event.briefingItems.map((item: any, idx: number) => (
            <div key={idx} className="flex flex-col gap-0.5 bg-muted/20 border border-border/30 p-2 rounded-lg transition-all hover:bg-muted/40">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[10px] truncate pr-2 text-foreground/80 uppercase">{item.descripcion || 'Servicio'}</span>
                <span className="font-mono font-bold text-[9px] text-indigo-600">
                  {formatSafeTime(item.horaInicio)} - {formatSafeTime(item.horaFin)}
                </span>
              </div>
              {(item.comentario || item.comentarios) && (
                <p className="text-[9px] text-muted-foreground line-clamp-1 italic">"{item.comentario || item.comentarios}"</p>
              )}
              <div className="flex justify-between items-center mt-1">
                <span className="text-[8px] font-bold opacity-60 uppercase tracking-tighter">
                  {item.conGastronomia ? '🍴 Gastronomía' : '⚙️ Operativa'}
                </span>
                <div className="flex items-center gap-1 font-black text-[10px] text-primary">
                  {item.asistentes} <Users className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const CalendarEventRow = memo(CalendarEventRowComponent);
CalendarEventRow.displayName = 'CalendarEventRow';
