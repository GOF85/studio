'use client';

import { memo, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResponsableBadge } from './responsable-badge';
import { cn } from '@/lib/utils';

export interface CalendarEvent {
  date: Date;
  osId: string;
  serviceNumber: string;
  horaInicio: string;
  space: string;
  finalClient: string;
  asistentes: number;
  status: string;
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
      return 'Ejecutado';
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
  const truncatedClient = useMemo(
    () => truncateText(event.finalClient, 18),
    [event.finalClient]
  );

  const handleClick = () => {
    onViewDetails(event.serviceNumber);
  };

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      className={cn(
        'w-full h-auto p-3 justify-start gap-2 rounded-lg transition-all duration-200',
        'border border-border',
        styles.bg,
        styles.border,
        'group hover:shadow-sm active:scale-[0.98]',
        'flex items-center flex-wrap md:flex-nowrap'
      )}
    >
      {/* Hora */}
      <div className="flex-shrink-0 w-16 md:w-20">
        <span className="text-sm font-mono font-semibold text-foreground">
          {event.horaInicio}
        </span>
      </div>

      {/* Cliente - Truncado en mobile */}
      <div className="flex-shrink-0 min-w-0 flex-1 md:w-40 md:flex-shrink-0">
        <span
          className="text-sm font-medium text-foreground truncate block"
          title={event.finalClient}
        >
          {truncatedClient}
        </span>
      </div>

      {/* Pax */}
      <div className="flex-shrink-0 w-12 md:w-16">
        <span className="text-sm font-bold text-primary">
          {event.asistentes} pax
        </span>
      </div>

      {/* Estado - Badge */}
      <div className="flex-shrink-0">
        <Badge
          variant={styles.badge as any}
          className="text-xs px-2 py-0.5 whitespace-nowrap"
        >
          {statusLabel}
        </Badge>
      </div>

      {/* Responsables - Badges compactos */}
      <div className="w-full md:w-auto flex items-center gap-1 mt-2 md:mt-0 flex-wrap md:flex-nowrap">
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
  );
};

export const CalendarEventRow = memo(CalendarEventRowComponent);
CalendarEventRow.displayName = 'CalendarEventRow';
