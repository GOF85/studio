'use client';

// 1. IMPORTS
import { useState, useEffect, useMemo, useCallback, memo, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  add,
  sub,
  startOfWeek,
  endOfWeek,
  parse,
  parseISO,
  isValid
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Clock,
  AlertCircle
} from 'lucide-react';

import type { ServiceOrder } from '@/types';
import { useCalendarEvents } from '@/hooks/use-data-queries';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SplashScreen from '@/components/layout/splash-screen';
import { DayExpandedBottomSheet } from '@/components/calendar/day-expanded-bottom-sheet';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';

// 2. TYPES & INTERFACES
type CalendarStatus = 'BORRADOR' | 'PENDIENTE' | 'CONFIRMADO' | 'EJECUTADO' | 'CANCELADO';

interface CalendarEvent {
  date: Date;
  osId: string;
  serviceNumber: string;
  horaInicio: string;
  horaFin: string;
  space: string;
  client: string;
  finalClient: string;
  asistentes: number;
  status: CalendarStatus | string;
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

interface EventsByDay {
  [dayKey: string]: {
    [osId: string]: CalendarEvent[]
  }
}

// 3. HELPERS PUROS
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/**
 * Formatea una hora de forma segura manejando nulos y formatos inválidos
 */
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

/**
 * Transforma los datos crudos de Supabase al formato interno del calendario
 */
const transformCalendarData = (serviceOrders: ServiceOrder[], briefings: any[]): CalendarEvent[] => {
  const allEvents: CalendarEvent[] = [];

  serviceOrders.forEach((os: ServiceOrder) => {
    const statusNormalized = os.status?.toUpperCase() || 'BORRADOR';
    if (statusNormalized === 'CANCELADO') return;

    const briefing = briefings.find(b => b.osId === os.id || (b as any).os_id === os.id);
    const dates = new Set<string>();

    if (briefing && briefing.items && briefing.items.length > 0) {
      briefing.items.forEach((item: any) => {
        if (item.fecha) {
          dates.add(item.fecha);
        }
      });
    }

    // Si no hay servicios con fecha, usamos la fecha de inicio de la OS
    if (dates.size === 0) {
      const dateKey = os.startDate ? format(new Date(os.startDate), 'yyyy-MM-dd') : null;
      if (dateKey) dates.add(dateKey);
    }

    dates.forEach(dateKey => {
      const eventDate = parseISO(dateKey);
      const itemsForThisDate = briefing?.items?.filter((i: any) => i.fecha === dateKey) || [];

      // Extraer hora de inicio específica (la más temprana del día)
      let horaInicio = os.startDate ? format(new Date(os.startDate), 'HH:mm') : '00:00';
      let horaFin = os.endDate ? format(new Date(os.endDate), 'HH:mm') : '00:00';
      
      if (itemsForThisDate.length > 0) {
        const sortedItems = [...itemsForThisDate].sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''));
        if (sortedItems[0].horaInicio) {
          horaInicio = sortedItems[0].horaInicio;
        }
        
        const sortedByEnd = [...itemsForThisDate].sort((a, b) => (b.horaFin || '').localeCompare(a.horaFin || ''));
        if (sortedByEnd[0].horaFin) {
          horaFin = sortedByEnd[0].horaFin;
        }
      }

      const gastronomyCount = itemsForThisDate.filter((i: any) => i.conGastronomia).length;
      const gastronomyPaxTotal = itemsForThisDate
        .filter((i: any) => i.conGastronomia)
        .reduce((max: number, item: any) => Math.max(max, Number(item.asistentes) || 0), 0);
      
      const totalPaxThisDay = itemsForThisDate.reduce((max: number, item: any) => Math.max(max, Number(item.asistentes) || 0), 0);

      allEvents.push({
        date: eventDate,
        osId: os.id,
        serviceNumber: os.serviceNumber || 'S/N',
        horaInicio,
        horaFin,
        space: os.space || 'Por definir',
        client: os.client || 'Empresa',
        finalClient: os.finalClient || 'Cliente',
        asistentes: totalPaxThisDay > 0 ? totalPaxThisDay : (os.asistentes || 0),
        status: statusNormalized,
        briefingItems: itemsForThisDate,
        gastronomyCount,
        gastronomyPaxTotal,
        respMetre: os.respMetre || undefined,
        respPase: os.respPase || undefined,
        respProjectManager: os.respProjectManager || undefined,
        respMetrePhone: os.respMetrePhone || undefined,
        respPasePhone: os.respPasePhone || undefined,
        respProjectManagerPhone: os.respProjectManagerPhone || undefined,
        respMetreMail: os.respMetreMail || undefined,
        respPaseMail: os.respPaseMail || undefined,
        respProjectManagerMail: os.respProjectManagerMail || undefined,
      });
    });
  });

  return allEvents;
};

/**
 * Retorna estilos visuales basados en el estado del evento (Paleta Semántica)
 */
const getStatusStyles = (status: string) => {
  const s = status.toUpperCase();
  switch (s) {
    case 'BORRADOR': 
      return { badge: 'outline', border: 'border-dashed border-muted-foreground/40', bg: 'bg-muted/30' };
    case 'PENDIENTE': 
      return { badge: 'secondary', border: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' }; // Ámbar: Atención
    case 'CONFIRMADO': 
      return { badge: 'default', border: 'border-emerald-500', bg: 'bg-emerald-50/50', text: 'text-emerald-700' }; // Esmeralda: Éxito
    case 'EJECUTADO': 
      return { badge: 'secondary', border: 'border-slate-400', bg: 'bg-slate-50' };
    case 'CANCELADO': 
      return { badge: 'destructive', border: 'border-destructive', bg: 'bg-destructive/10' };
    default: 
      return { badge: 'default', border: 'border-border', bg: 'bg-card' };
  }
};

/**
 * Retorna clases de heatmap basadas en el volumen de PAX
 */
const getHeatmapClass = (totalPax: number) => {
  if (totalPax === 0) return '';
  if (totalPax < 50) return 'bg-slate-50/50 hover:bg-slate-100/80';
  if (totalPax < 200) return 'bg-orange-50/40 hover:bg-orange-100/60'; // Naranja: Gastronomía/Carga media
  return 'bg-rose-50/40 hover:bg-rose-100/60'; // Rose: Carga alta
};

// 4. SUB-COMPONENTES LOCALES

// Celda individual del Grid
const DayGridCell = memo(function DayGridCell({
  day,
  dayOsEvents,
  currentDate,
  onViewDetails,
  router,
  viewMode
}: {
  day: Date;
  dayOsEvents: { [osId: string]: CalendarEvent[] };
  currentDate: Date;
  onViewDetails: (day: Date) => void;
  router: any;
  viewMode: 'grid' | 'agenda' | 'week';
}) {
  const osIds = Object.keys(dayOsEvents);
  const isCurrentMonth = viewMode === 'week' ? true : isSameMonth(day, currentDate);
  const isToday = isSameDay(day, new Date());

  const dailyTotalPax = useMemo(
    () => Object.values(dayOsEvents).flat().reduce((acc, ev) => acc + ev.asistentes, 0),
    [dayOsEvents]
  );

  const loadClass = isCurrentMonth ? getHeatmapClass(dailyTotalPax) : '';
  const maxEvents = viewMode === 'week' ? 8 : 4;

  return (
    <div
      onClick={() => Object.keys(dayOsEvents).length > 0 && onViewDetails(day)}
      className={cn(
        'min-h-[140px] p-2 flex flex-col transition-all duration-500 relative group border-b border-r last:border-r-0',
        Object.keys(dayOsEvents).length > 0 && 'cursor-pointer hover:bg-primary/[0.02] hover:shadow-[0_10px_40px_rgba(0,0,0,0.04)]',
        loadClass,
        !isCurrentMonth && 'bg-muted/5 text-muted-foreground/20',
        viewMode === 'week' && 'min-h-[400px] p-4'
      )}
    >
      {/* Header del día */}
      <div className="flex justify-between items-start mb-2">
        <span className={cn(
          'text-sm font-bold w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-500',
          isToday ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110' : 'text-muted-foreground group-hover:text-foreground'
        )}>
          {format(day, 'd')}
        </span>
        {dailyTotalPax > 0 && isCurrentMonth && (
          <Badge variant="secondary" className="text-[10px] px-2 h-5 font-black bg-background/80 backdrop-blur-sm border-border/40">
            {dailyTotalPax}p
          </Badge>
        )}
      </div>

      {/* Lista de eventos */}
      <div className="flex-grow space-y-1.5 overflow-hidden">
        {osIds.slice(0, maxEvents).map(osId => {
          const osEvents = dayOsEvents[osId];
          const firstEvent = osEvents[0];
          const styles = getStatusStyles(firstEvent.status);

          return (
            <Tooltip key={osId}>
              <TooltipTrigger asChild>
                <div
                  onClick={(e) => { e.stopPropagation(); router.push(`/os/${firstEvent.osId}`); }}
                  className={cn(
                    "cursor-pointer text-[9px] px-1.5 py-1 rounded-md border truncate flex flex-col gap-0.5 transition-all duration-300 hover:translate-x-1 hover:shadow-md active:scale-[0.98]",
                    styles.bg,
                    styles.border === 'border-dashed border-muted-foreground/40' ? styles.border : `border-l-2 ${styles.border}`,
                    viewMode === 'week' && "py-2 text-[10px]"
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-black truncate flex-1 tracking-tight uppercase">{firstEvent.space}</span>
                    <span className="font-mono font-bold text-[8px] opacity-70 shrink-0">{firstEvent.horaInicio}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 opacity-60">
                    <div className="flex items-center gap-1 truncate">
                      <span className="truncate text-[8px] font-medium">{firstEvent.finalClient}</span>
                      {firstEvent.gastronomyCount !== undefined && firstEvent.gastronomyCount > 0 && (
                        <span className="text-[8px] text-orange-600 font-bold">🍴{firstEvent.gastronomyCount}</span>
                      )}
                    </div>
                    <span className="font-black text-[8px] shrink-0">{firstEvent.asistentes}p</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="p-0 border-none shadow-2xl z-50">
                {/* Mini Card Preview */}
                <Card className="w-72 border-0 overflow-hidden rounded-2xl">
                  <CardHeader className={cn("py-3 px-4", styles.bg)}>
                    <CardTitle className="text-sm font-black flex justify-between items-center tracking-tight">
                      <div className="flex flex-col">
                        <span className="uppercase">{firstEvent.space}</span>
                        <span className="text-[10px] opacity-70 font-mono">OS-{firstEvent.serviceNumber}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {firstEvent.gastronomyCount !== undefined && firstEvent.gastronomyCount > 0 && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-black bg-orange-50 text-orange-700 border-orange-200">
                            🍴 {firstEvent.gastronomyCount}
                          </Badge>
                        )}
                        <Badge variant={styles.badge as any} className="text-[9px] h-4 px-1.5 font-black uppercase tracking-tighter">
                          {firstEvent.status}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 text-sm bg-background/95 backdrop-blur-md">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.15em] mb-1 opacity-70">Cliente</p>
                        <p className="font-bold text-foreground truncate">{firstEvent.client}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.15em] mb-1 opacity-70">Cliente Final</p>
                        <p className="font-bold text-foreground truncate">{firstEvent.finalClient}</p>
                      </div>
                    </div>

                    {/* Briefing Items with Times */}
                    {firstEvent.briefingItems && firstEvent.briefingItems.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-border/40">
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.15em] mb-1 opacity-70">Servicios del Día</p>
                        <div className="space-y-1.5">
                          {firstEvent.briefingItems.map((item: any, idx: number) => (
                            <div key={idx} className="flex flex-col gap-0.5 bg-muted/30 p-2 rounded-lg border border-border/20">
                              <div className="flex justify-between items-center">
                                <span className="font-black text-[10px] truncate pr-2 uppercase">{item.descripcion || 'Servicio'}</span>
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
                                <div className="flex items-center gap-1 font-black text-[10px]">
                                  {item.asistentes} <Users className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/40">
                      <div className="space-y-0.5">
                        <p className="text-[9px] text-muted-foreground flex items-center gap-1 font-black uppercase tracking-wider"><Users className="h-3 w-3" /> Total Pax</p>
                        <p className="font-mono font-black text-lg tracking-tighter">{firstEvent.asistentes}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] text-muted-foreground flex items-center gap-1 font-black uppercase tracking-wider"><Clock className="h-3 w-3" /> Horario OS</p>
                        <p className="font-mono font-black text-sm tracking-tighter">{firstEvent.horaInicio} - {firstEvent.horaFin}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipContent>
            </Tooltip>
          )
        })}

        {/* Ver más... */}
        {osIds.length > maxEvents && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-5 text-[10px] text-muted-foreground hover:text-primary p-0"
            onClick={() => onViewDetails(day)}
          >
            + {osIds.length - maxEvents} más
          </Button>
        )}
      </div>
    </div>
  );
});

// Vista Agenda (Móvil / Lista)
const AgendaView = memo(function AgendaView({
  allDays,
  eventsByDay,
  router
}: {
  allDays: Date[];
  eventsByDay: EventsByDay;
  router: any;
}) {
  if (!allDays?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/60 border rounded-lg bg-muted/10 mt-4">
        <CalendarIcon className="h-12 w-12 mb-3 opacity-50" />
        <p className="font-medium">Sin días seleccionados</p>
      </div>
    );
  }

  return (
    <div className="space-y-0 pb-20 mt-4 border border-border/40 rounded-2xl overflow-hidden bg-card/40 backdrop-blur-md shadow-sm">
      {allDays.map((day) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const dayData = eventsByDay[dayKey];
        const hasEvents = dayData && Object.keys(dayData).length > 0;
        const isToday = isSameDay(day, new Date());

        if (!hasEvents) {
          return (
            <div key={dayKey} className={cn(
              "py-2.5 px-4 border-b border-border/40 flex justify-between items-center transition-colors",
              isToday ? "bg-primary/5" : "bg-muted/10 opacity-40"
            )}>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}>
                  {format(day, 'EEEE d MMM', { locale: es })}
                </span>
                {isToday && <Badge variant="default" className="text-[8px] h-3.5 px-1 font-black uppercase">Hoy</Badge>}
              </div>
              <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/30 italic">Sin eventos</span>
            </div>
          );
        }

        // Calcular pax total del día
        const dailyPax = Object.values(dayData).flat().reduce((acc, ev) => acc + ev.asistentes, 0);

        return (
          <div key={dayKey} className="group border-b border-border/40 last:border-b-0">
            {/* Sticky Day Header */}
            <div className={cn(
              "sticky top-0 z-10 py-2.5 px-4 bg-background/95 backdrop-blur border-b flex justify-between items-center font-medium text-sm transition-colors",
              isToday ? "text-primary border-primary bg-primary/5" : "text-foreground group-hover:bg-muted/30"
            )}>
              <div className="flex items-center gap-3">
                <span className="capitalize font-black text-xs tracking-tight">{format(day, 'EEEE d MMM', { locale: es })}</span>
                {isToday && <Badge variant="default" className="text-[8px] h-3.5 px-1 font-black uppercase">Hoy</Badge>}
              </div>
              {dailyPax > 0 && (
                <Badge variant="secondary" className="text-[10px] px-2 h-5 font-black bg-background/80 backdrop-blur-sm border-border/40">
                  {dailyPax}p
                </Badge>
              )}
            </div>

            {/* Event List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-transparent">
              {Object.entries(dayData).map(([osId, osEvents]) => {
                const firstEvent = osEvents[0];
                const styles = getStatusStyles(firstEvent.status);

                return (
                  <div
                    key={osId}
                    onClick={() => router.push(`/os/${firstEvent.osId}`)}
                    className={cn(
                      "relative rounded-xl p-3 border border-border/40 bg-card/60 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group/card active:scale-[0.98]",
                      styles.bg,
                      styles.border !== 'border-dashed border-muted-foreground/40' && `border-l-4 ${styles.border}`
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col min-w-0">
                        <p className="font-black text-xs truncate tracking-tight text-foreground uppercase">{firstEvent.space}</p>
                        <p className="text-[10px] font-bold text-indigo-600/80 hover:underline">
                          OS-{firstEvent.serviceNumber}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {firstEvent.gastronomyCount !== undefined && firstEvent.gastronomyCount > 0 && (
                          <Badge variant="secondary" className="text-[8px] h-3.5 px-1 font-black bg-orange-50 text-orange-700 border-orange-100">
                            🍴 {firstEvent.gastronomyCount}
                          </Badge>
                        )}
                        <Badge variant={styles.badge as any} className="text-[8px] h-3.5 px-1 font-black uppercase tracking-tighter">
                          {firstEvent.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-foreground/70">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{firstEvent.horaInicio} - {firstEvent.horaFin}</span>
                        </div>
                        <div className="flex items-center gap-1 font-black text-foreground">
                          {firstEvent.asistentes} <Users className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-border/10 pt-1.5">
                        <p className="truncate text-[10px] font-medium opacity-60">{firstEvent.client}</p>
                        <p className="truncate text-[10px] font-bold opacity-80">{firstEvent.finalClient}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// Tira de fechas horizontal para móvil
const MobileDateStrip = ({
  currentDate,
  onDateSelect
}: {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
}) => {
  const days = useMemo(() => {
    // Generar 14 días alrededor de la fecha actual
    return Array.from({ length: 14 }).map((_, i) => add(currentDate, { days: i - 3 }));
  }, [currentDate]);

  return (
    <div className="flex overflow-x-auto py-4 px-4 gap-3 no-scrollbar bg-background/40 backdrop-blur-md border-b border-border/40 sticky top-[104px] z-20 -mx-4 sm:hidden">
      {days.map((day) => {
        const isSelected = isSameDay(day, currentDate);
        const isToday = isSameDay(day, new Date());
        return (
          <button
            key={day.toISOString()}
            onClick={() => onDateSelect(day)}
            className={cn(
              "flex flex-col items-center justify-center min-w-[56px] h-16 rounded-2xl transition-all duration-300 border",
              isSelected 
                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-200 scale-105" 
                : "bg-card/60 border-border/40 text-muted-foreground hover:border-indigo-300"
            )}
          >
            <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">
              {format(day, 'EEE', { locale: es })}
            </span>
            <span className="text-lg font-black tracking-tighter">
              {format(day, 'd')}
            </span>
            {isToday && !isSelected && (
              <div className="w-1 h-1 bg-indigo-500 rounded-full mt-0.5" />
            )}
          </button>
        );
      })}
    </div>
  );
};

// 5. MAIN COMPONENT
function CalendarioServiciosPageInner() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // --- STATE & URL SYNC ---
  // Leemos estado de la URL, fallback a valores por defecto
  const viewParam = searchParams?.get('view');
  const dateParam = searchParams?.get('date');

  const viewMode = (viewParam === 'agenda' ? 'agenda' : viewParam === 'week' ? 'week' : viewParam === 'grid' ? 'grid' : isMobile ? 'agenda' : 'grid') as 'grid' | 'agenda' | 'week';

  // Force agenda on mobile if no view is specified
  useEffect(() => {
    if (isMobile && !viewParam) {
      setViewMode('agenda');
    }
  }, [isMobile, viewParam]);

  const currentDate = useMemo(() => {
    if (dateParam) {
      const parsed = parse(dateParam, 'yyyy-MM', new Date());
      if (isValid(parsed)) return parsed;

      // Intentar parsear como fecha completa para vista semanal
      const parsedFull = parse(dateParam, 'yyyy-MM-dd', new Date());
      if (isValid(parsedFull)) return parsedFull;
    }
    return new Date();
  }, [dateParam]);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // --- DATA FETCHING ---
  const fetchRange = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return { start: startDate.toISOString(), end: endDate.toISOString() };
  }, [currentDate]);

  const { data: calendarData, isLoading: isLoadingCalendar, error: calendarError } = useCalendarEvents(fetchRange.start, fetchRange.end);
  
  const serviceOrders = calendarData?.events || [];
  const briefings = calendarData?.briefings || [];

  useEffect(() => {
    document.title = 'Mice Catering | Calendario';
  }, []);
  const isLoading = isLoadingCalendar;

  // --- LOGIC ---

  // Transformación de datos (Memoized)
  const events = useMemo(() => transformCalendarData(serviceOrders, briefings), [serviceOrders, briefings]);

  // Cálculos de Calendario
  const calendarDays = useMemo(() => {
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate, viewMode]);

  // Agrupación
  const eventsByDay = useMemo(() => {
    const grouped: EventsByDay = {};
    events.forEach(event => {
      const dayKey = format(event.date, 'yyyy-MM-dd');
      if (!grouped[dayKey]) grouped[dayKey] = {};
      if (!grouped[dayKey][event.osId]) grouped[dayKey][event.osId] = [];
      grouped[dayKey][event.osId].push(event);
    });
    return grouped;
  }, [events]);

  // Días con eventos (Solo mes actual o semana actual)
  const daysWithEventsCurrentMonth = useMemo(() => {
    return calendarDays.filter(day => {
      if (viewMode !== 'week' && !isSameMonth(day, currentDate)) return false;
      const dayKey = format(day, 'yyyy-MM-dd');
      return eventsByDay[dayKey] && Object.keys(eventsByDay[dayKey]).length > 0;
    });
  }, [calendarDays, eventsByDay, currentDate, viewMode]);

  // --- HANDLERS ---

  // Actualizar URL sin recargar
  const updateParams = useCallback((newParams: { view?: string; date?: string }) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (newParams.view) params.set('view', newParams.view);
    if (newParams.date) params.set('date', newParams.date);

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const setViewMode = (mode: 'grid' | 'agenda' | 'week') => updateParams({ view: mode });

  const handleMonthChange = (direction: 'next' | 'prev') => {
    const amount = viewMode === 'week' ? { weeks: 1 } : { months: 1 };
    const newDate = direction === 'next'
      ? add(currentDate, amount)
      : sub(currentDate, amount);

    const formatStr = viewMode === 'week' ? 'yyyy-MM-dd' : 'yyyy-MM';
    updateParams({ date: format(newDate, formatStr) });

    // Scroll Reset Effect
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleDayClick = useCallback((day: Date) => {
    setSelectedDay(day);
  }, []);

  const handleCloseDayDetails = useCallback(() => {
    setSelectedDay(null);
  }, []);

  const handleEventClick = useCallback((serviceNumber: string) => {
    router.push(`/os/${serviceNumber}`);
    handleCloseDayDetails();
  }, [router, handleCloseDayDetails]);

  // --- RENDER ---

  if (isLoading) {
    return <SplashScreen />;
  }

  if (calendarError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h2 className="text-lg font-bold">Error al cargar el calendario</h2>
          <p className="text-muted-foreground">{(calendarError as any)?.message || 'Ocurrió un error inesperado'}</p>
        </div>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <main className="flex-1 w-full bg-background/30 min-h-screen flex flex-col">
        {/* Header Premium Sticky */}
        <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <CalendarIcon className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="hidden md:block">
                <h1 className="text-sm font-bold text-foreground tracking-tight">
                  Calendario de eventos
                </h1>
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-3">
            {/* Navegación Mes/Semana */}
            <div className="flex items-center bg-muted/50 border border-border/40 rounded-lg p-0.5">
              <Button variant="ghost" size="icon" onClick={() => handleMonthChange('prev')} className="h-7 w-7 hover:bg-indigo-500/10 rounded-md">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-[10px] font-black min-w-[120px] text-center uppercase tracking-widest">
                {viewMode === 'week'
                  ? `Sem. ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: es })}`
                  : format(currentDate, 'MMMM yyyy', { locale: es })
                }
              </h2>
              <Button variant="ghost" size="icon" onClick={() => handleMonthChange('next')} className="h-7 w-7 hover:bg-indigo-500/10 rounded-md">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-4 w-[1px] bg-border/40 mx-1" />

            {/* Selector Vistas */}
            <div className="flex bg-muted/50 p-1 rounded-lg border border-border/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('agenda')}
                className={cn(
                  "h-6 px-3 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                  viewMode === 'agenda' ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Agenda
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "h-6 px-3 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                  viewMode === 'grid' ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Mes
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('week')}
                className={cn(
                  "h-6 px-3 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                  viewMode === 'week' ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Semana
              </Button>
            </div>
          </div>
        </div>
      </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-0 pb-6 sm:pb-8 w-full flex-grow space-y-6">
          {isMobile && viewMode === 'agenda' && (
            <MobileDateStrip 
              currentDate={currentDate} 
              onDateSelect={(date) => updateParams({ date: format(date, 'yyyy-MM-dd') })} 
            />
          )}
          <div className="flex-1 flex flex-col relative">
            {/* VISTA AGENDA */}
            {viewMode === 'agenda' && (
              <AgendaView
                allDays={calendarDays.filter(d => isSameMonth(d, currentDate))}
                eventsByDay={eventsByDay}
                router={router}
              />
            )}

            {/* VISTA GRID (MES O SEMANA) */}
            {(viewMode === 'grid' || viewMode === 'week') && (
              <div className={cn(
                "border border-border/40 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-card/40 backdrop-blur-md overflow-hidden flex flex-col flex-1 transition-all duration-500",
                viewMode === 'week' ? "min-h-[800px]" : "min-h-[700px]"
              )}>
                {/* Grid Header */}
                <div className="grid grid-cols-7 border-b border-border/40 bg-muted/30 divide-x divide-border/40">
                  {WEEKDAYS.map(day => (
                    <div key={day} className="text-center text-[10px] font-black uppercase tracking-[0.2em] py-3 text-muted-foreground/70">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Grid Body */}
                <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/40 flex-1 bg-transparent">
                  {calendarDays.map((day) => (
                    <DayGridCell
                      key={day.toISOString()}
                      day={day}
                      dayOsEvents={eventsByDay[format(day, 'yyyy-MM-dd')] || {}}
                      currentDate={currentDate}
                      onViewDetails={handleDayClick}
                      router={router}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* DAY EXPANDED BOTTOM SHEET */}
      {
        selectedDay && (
          <DayExpandedBottomSheet
            day={selectedDay}
            osEvents={eventsByDay[format(selectedDay, 'yyyy-MM-dd')] || {}}
            isOpen={!!selectedDay}
            onClose={handleCloseDayDetails}
            onEventClick={handleEventClick}
            router={router}
          />
        )
      }
    </TooltipProvider >
  );
}
export default function CalendarioServiciosPage() {
  return (
    <Suspense fallback={<div>Cargando ...</div>}>
      <CalendarioServiciosPageInner />
    </Suspense>
  );
}
