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
  startOfToday,
  isBefore,
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
  AlertCircle,
  Package,
  Plus,
  MapPin,
  Eye,
  EyeOff
} from 'lucide-react';

import { useEntregas } from '@/hooks/use-data-queries';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import SplashScreen from '@/components/layout/splash-screen';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// 2. TYPES & INTERFACES
type DeliveryStatus = 'BORRADOR' | 'PENDIENTE' | 'CONFIRMADO' | 'EJECUTADO' | 'CANCELADO';

interface CalendarEvent {
  date: Date;
  osId: string;
  serviceNumber: string;
  horaInicio: string;
  space: string;
  client: string;
  finalClient: string;
  asistentes: number;
  status: DeliveryStatus | string;
  items?: any[];
}

interface EventsByDay {
  [dayKey: string]: {
    [osId: string]: CalendarEvent[]
  }
}

// 3. HELPERS PUROS
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/**
 * Transforma los datos de entregas al formato interno del calendario
 */
const transformDeliveryData = (entregas: any[]): CalendarEvent[] => {
  const allEvents: CalendarEvent[] = [];

  entregas.forEach((entrega: any) => {
    const hitos = entrega.hitos || [];
    const statusNormalized = (entrega.estado || 'BORRADOR').toUpperCase();
    if (statusNormalized === 'CANCELADO') return;

    hitos.forEach((hito: any, index: number) => {
      if (!hito.fecha) return;
      
      const hitoIndex = (index + 1).toString().padStart(2, '0');
      const eventDate = parseISO(hito.fecha);

      allEvents.push({
        date: eventDate,
        osId: entrega.numero_expediente,
        serviceNumber: `${entrega.numero_expediente}.${hitoIndex}`,
        horaInicio: hito.hora || '00:00',
        space: hito.lugarEntrega || 'Por definir',
        client: entrega.nombre_evento || 'Evento',
        finalClient: entrega.nombre_evento || 'Cliente',
        asistentes: entrega.asistentes || 0,
        status: statusNormalized,
        items: hito.items || []
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
      return { badge: 'secondary', border: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' };
    case 'CONFIRMADO': 
      return { badge: 'default', border: 'border-emerald-500', bg: 'bg-emerald-50/50', text: 'text-emerald-700' };
    case 'EJECUTADO': 
      return { badge: 'secondary', border: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-700' };
    case 'CANCELADO': 
      return { badge: 'destructive', border: 'border-destructive', bg: 'bg-destructive/10' };
    default: 
      return { badge: 'default', border: 'border-border', bg: 'bg-card' };
  }
};

/**
 * Retorna clases de heatmap basadas en el volumen de pedidos
 */
const getHeatmapClass = (count: number) => {
  if (count === 0) return '';
  if (count < 3) return 'bg-amber-50/30 hover:bg-amber-100/50';
  if (count < 8) return 'bg-orange-50/40 hover:bg-orange-100/60';
  return 'bg-orange-100/50 hover:bg-orange-200/60';
};

// 4. SUB-COMPONENTES LOCALES

// Celda individual del Grid
const DayGridCell = memo(function DayGridCell({
  day,
  dayEvents,
  currentDate,
  onViewDetails,
  router,
  viewMode
}: {
  day: Date;
  dayEvents: { [osId: string]: CalendarEvent[] };
  currentDate: Date;
  onViewDetails: (day: Date) => void;
  router: any;
  viewMode: 'grid' | 'agenda' | 'week';
}) {
  const osIds = Object.keys(dayEvents);
  const isCurrentMonth = viewMode === 'week' ? true : isSameMonth(day, currentDate);
  const isToday = isSameDay(day, new Date());

  const totalEvents = Object.values(dayEvents).flat().length;
  const loadClass = isCurrentMonth ? getHeatmapClass(totalEvents) : '';
  const maxEvents = viewMode === 'week' ? 8 : 4;

  return (
    <div
      onClick={() => osIds.length > 0 && onViewDetails(day)}
      className={cn(
        'min-h-[140px] p-2 flex flex-col transition-all duration-500 relative group border-b border-r last:border-r-0',
        osIds.length > 0 && 'cursor-pointer hover:bg-amber-500/[0.02] hover:shadow-[0_10px_40px_rgba(0,0,0,0.04)]',
        loadClass,
        !isCurrentMonth && 'bg-muted/5 text-muted-foreground/20',
        viewMode === 'week' && 'min-h-[400px] p-4'
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={cn(
          'text-sm font-bold w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-500',
          isToday ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20 scale-110' : 'text-muted-foreground group-hover:text-foreground'
        )}>
          {format(day, 'd')}
        </span>
        {totalEvents > 0 && isCurrentMonth && (
          <Badge variant="secondary" className="text-[10px] px-2 h-5 font-black bg-background/80 backdrop-blur-sm border-border/40">
            {totalEvents} {totalEvents === 1 ? 'pedido' : 'pedidos'}
          </Badge>
        )}
      </div>

      <div className="flex-grow space-y-1.5 overflow-hidden">
        {osIds.slice(0, maxEvents).map(osId => {
          const events = dayEvents[osId];
          const firstEvent = events[0];
          const styles = getStatusStyles(firstEvent.status);

          return (
            <Tooltip key={osId}>
              <TooltipTrigger asChild>
                <div
                  onClick={(e) => { e.stopPropagation(); router.push(`/entregas/pedido/${firstEvent.osId}`); }}
                  className={cn(
                    "cursor-pointer text-[9px] px-1.5 py-1 rounded-md border truncate flex flex-col gap-0.5 transition-all duration-300 hover:translate-x-1 hover:shadow-md active:scale-[0.98]",
                    styles.bg,
                    styles.border === 'border-dashed border-muted-foreground/40' ? styles.border : `border-l-2 ${styles.border}`,
                    viewMode === 'week' && "py-2 text-[10px]"
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-black truncate flex-1 tracking-tight uppercase">
                      {firstEvent.serviceNumber}
                    </span>
                    <span className="font-mono font-bold text-[8px] opacity-70 shrink-0">{firstEvent.horaInicio}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 opacity-60">
                    <span className="truncate text-[8px] font-medium">{firstEvent.client}</span>
                    <span className="font-black text-[8px] shrink-0">{firstEvent.asistentes}p</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="p-0 border-none shadow-2xl z-50">
                <Card className="w-72 border-0 overflow-hidden rounded-2xl">
                  <CardHeader className={cn("py-3 px-4", styles.bg)}>
                    <CardTitle className="text-sm font-black flex justify-between items-center tracking-tight">
                      <div className="flex flex-col">
                        <span className="uppercase">{firstEvent.serviceNumber}</span>
                        <span className="text-[10px] opacity-70 font-mono">{firstEvent.client}</span>
                      </div>
                      <Badge variant={styles.badge as any} className="text-[9px] h-4 px-1.5 font-black uppercase tracking-tighter">
                        {firstEvent.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 text-sm bg-background/95 backdrop-blur-md">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-xs font-medium">{firstEvent.space}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-xs font-medium">{firstEvent.horaInicio}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-xs font-medium">{firstEvent.asistentes} asistentes</span>
                        </div>
                    </div>

                    {firstEvent.items && firstEvent.items.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-border/40">
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.15em] mb-1 opacity-70">Contenido del Pedido</p>
                        <div className="space-y-1">
                          {firstEvent.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-[10px] bg-muted/30 p-1.5 rounded-lg border border-border/20">
                                <span className="font-bold truncate pr-2">{item.nombre}</span>
                                <span className="font-black text-amber-600 shrink-0">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TooltipContent>
            </Tooltip>
          )
        })}

        {osIds.length > maxEvents && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-5 text-[10px] text-muted-foreground hover:text-amber-600 p-0"
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
              isToday ? "bg-amber-500/5" : "bg-muted/10 opacity-40"
            )}>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isToday ? "text-amber-600" : "text-muted-foreground"
                )}>
                  {format(day, 'EEEE d MMM', { locale: es })}
                </span>
                {isToday && <Badge variant="default" className="text-[8px] h-3.5 px-1 font-black uppercase bg-amber-600">Hoy</Badge>}
              </div>
              <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/30 italic">Sin entregas</span>
            </div>
          );
        }

        const totalDayEvents = Object.values(dayData).flat().length;

        return (
          <div key={dayKey} className="group border-b border-border/40 last:border-b-0">
            <div className={cn(
              "sticky top-0 z-10 py-2.5 px-4 bg-background/95 backdrop-blur border-b flex justify-between items-center font-medium text-sm transition-colors",
              isToday ? "text-amber-600 border-amber-600 bg-amber-500/5" : "text-foreground group-hover:bg-muted/30"
            )}>
              <div className="flex items-center gap-3">
                <span className="capitalize font-black text-xs tracking-tight">{format(day, 'EEEE d MMM', { locale: es })}</span>
                {isToday && <Badge variant="default" className="text-[8px] h-3.5 px-1 font-black uppercase bg-amber-600">Hoy</Badge>}
              </div>
              <Badge variant="secondary" className="text-[10px] px-2 h-5 font-black bg-background/80 backdrop-blur-sm border-border/40">
                {totalDayEvents} {totalDayEvents === 1 ? 'pedido' : 'pedidos'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-transparent">
              {Object.entries(dayData).map(([osId, events]) => {
                const firstEvent = events[0];
                const styles = getStatusStyles(firstEvent.status);

                return (
                  <div
                    key={osId}
                    onClick={() => router.push(`/entregas/pedido/${firstEvent.osId}`)}
                    className={cn(
                      "relative rounded-xl p-3 border border-border/40 bg-card/60 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group/card active:scale-[0.98]",
                      styles.bg,
                      styles.border !== 'border-dashed border-muted-foreground/40' && `border-l-4 ${styles.border}`
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col min-w-0">
                        <p className="font-black text-xs truncate tracking-tight text-foreground uppercase">{firstEvent.serviceNumber}</p>
                        <p className="text-[10px] font-bold text-amber-600/80">
                          {firstEvent.client}
                        </p>
                      </div>
                      <Badge variant={styles.badge as any} className="text-[8px] h-3.5 px-1 font-black uppercase tracking-tighter">
                        {firstEvent.status}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-foreground/70">
                          <Clock className="h-3 w-3 text-amber-500" />
                          <span>{firstEvent.horaInicio}</span>
                        </div>
                        <div className="flex items-center gap-1 font-black text-foreground">
                          {firstEvent.asistentes} <Users className="h-3 w-3 text-amber-500" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 border-t border-border/10 pt-1.5">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <p className="truncate text-[10px] font-medium opacity-60">{firstEvent.space}</p>
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
                ? "bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-200 scale-105" 
                : "bg-card/60 border-border/40 text-muted-foreground hover:border-amber-300"
            )}
          >
            <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">
              {format(day, 'EEE', { locale: es })}
            </span>
            <span className="text-lg font-black tracking-tighter">
              {format(day, 'd')}
            </span>
            {isToday && !isSelected && (
              <div className="w-1 h-1 bg-amber-500 rounded-full mt-0.5" />
            )}
          </button>
        );
      })}
    </div>
  );
};

// 5. MAIN COMPONENT
function CalendarioEntregasPageInner() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const viewParam = searchParams?.get('view');
  const dateParam = searchParams?.get('date');

  const viewMode = (viewParam === 'agenda' ? 'agenda' : viewParam === 'week' ? 'week' : viewParam === 'grid' ? 'grid' : isMobile ? 'agenda' : 'grid') as 'grid' | 'agenda' | 'week';

  useEffect(() => {
    if (isMobile && !viewParam) {
      setViewMode('agenda');
    }
  }, [isMobile, viewParam]);

  const currentDate = useMemo(() => {
    if (dateParam) {
      const parsed = parse(dateParam, 'yyyy-MM', new Date());
      if (isValid(parsed)) return parsed;
      const parsedFull = parse(dateParam, 'yyyy-MM-dd', new Date());
      if (isValid(parsedFull)) return parsedFull;
    }
    return new Date();
  }, [dateParam]);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showPast, setShowPast] = useState(false);

  const { data: entregas, isLoading, error } = useEntregas();

  useEffect(() => {
    document.title = 'Mice Catering | Calendario Entregas';
  }, []);

  const events = useMemo(() => transformDeliveryData(entregas || []), [entregas]);

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

  // Agrupar por semanas para colapsar pasadas
  const weeks = useMemo(() => {
    const result = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

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

  const updateParams = useCallback((newParams: { view?: string; date?: string }) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (newParams.view) params.set('view', newParams.view);
    if (newParams.date) params.set('date', newParams.date);

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const setViewMode = (mode: 'grid' | 'agenda' | 'week') => updateParams({ view: mode });

  const handleMonthChange = (direction: 'next' | 'prev') => {
    const amount = viewMode === 'week' ? { weeks: 1 } : { months: 1 };
    const newDate = direction === 'next' ? add(currentDate, amount) : sub(currentDate, amount);
    const formatStr = viewMode === 'week' ? 'yyyy-MM-dd' : 'yyyy-MM';
    updateParams({ date: format(newDate, formatStr) });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (isLoading) return <SplashScreen />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h2 className="text-lg font-bold">Error al cargar el calendario</h2>
          <p className="text-muted-foreground">{(error as any)?.message || 'Ocurrió un error inesperado'}</p>
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
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <CalendarIcon className="h-5 w-5 text-amber-500" />
              </div>
              <div className="hidden md:block">
                <h1 className="text-sm font-bold text-foreground tracking-tight">
                  Calendario de Entregas
                </h1>
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-4">
                {/* Toggle Ver Pasados */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/40 hover:bg-muted/80 transition-colors cursor-pointer group" onClick={() => setShowPast(!showPast)}>
                    <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-all",
                    showPast ? "bg-amber-600 border-amber-600 text-white" : "border-muted-foreground/40 bg-background"
                    )}>
                    {showPast && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest transition-colors",
                    showPast ? "text-amber-600" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                    Ver pasados
                    </span>
                </div>

                <div className="h-4 w-[1px] bg-border/40 mx-1" />

                <div className="flex items-center bg-muted/50 border border-border/40 rounded-lg p-0.5">
                <Button variant="ghost" size="icon" onClick={() => handleMonthChange('prev')} className="h-7 w-7 hover:bg-amber-500/10 rounded-md">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-[10px] font-black min-w-[120px] text-center uppercase tracking-widest">
                    {viewMode === 'week'
                    ? `Sem. ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: es })}`
                    : format(currentDate, 'MMMM yyyy', { locale: es })
                    }
                </h2>
                <Button variant="ghost" size="icon" onClick={() => handleMonthChange('next')} className="h-7 w-7 hover:bg-amber-500/10 rounded-md">
                    <ChevronRight className="h-4 w-4" />
                </Button>
                </div>

                <div className="h-4 w-[1px] bg-border/40 mx-1" />

                <div className="flex bg-muted/50 p-1 rounded-lg border border-border/40">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('agenda')}
                    className={cn(
                    "h-6 px-3 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                    viewMode === 'agenda' ? "bg-amber-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
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
                    viewMode === 'grid' ? "bg-amber-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
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
                    viewMode === 'week' ? "bg-amber-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
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
            {viewMode === 'agenda' && (
              <AgendaView
                allDays={calendarDays.filter(d => {
                  const isCurrentMonth = isSameMonth(d, currentDate);
                  if (!isCurrentMonth) return false;
                  if (!showPast && isBefore(d, startOfToday()) && !isSameDay(d, startOfToday())) return false;
                  return true;
                })}
                eventsByDay={eventsByDay}
                router={router}
              />
            )}

            {(viewMode === 'grid' || viewMode === 'week') && (
              <div className={cn(
                "border border-border/40 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-card/40 backdrop-blur-md overflow-hidden flex flex-col transition-all duration-500",
                viewMode === 'week' ? "min-h-[800px] flex-1" : (showPast ? "min-h-[700px] flex-1" : "h-auto")
              )}>
                <div className="grid grid-cols-7 border-b border-border/40 bg-muted/30 divide-x divide-border/40">
                  {WEEKDAYS.map(day => (
                    <div key={day} className="text-center text-[10px] font-black uppercase tracking-[0.2em] py-3 text-muted-foreground/70">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 divide-x divide-y divide-border/40 bg-transparent">
                  {weeks.map((week, weekIdx) => {
                    const isPastWeek = !showPast && viewMode === 'grid' && week.every(day => isBefore(day, startOfToday()) && !isSameDay(day, startOfToday()));
                    
                    if (isPastWeek) return null;

                    return week.map((day) => (
                      <DayGridCell
                        key={day.toISOString()}
                        day={day}
                        dayEvents={eventsByDay[format(day, 'yyyy-MM-dd')] || {}}
                        currentDate={currentDate}
                        onViewDetails={setSelectedDay}
                        router={router}
                        viewMode={viewMode}
                      />
                    ));
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
            <DialogContent className="max-w-2xl rounded-2xl border-border/40 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black tracking-tight">
                        Entregas para el {selectedDay ? format(selectedDay, "EEEE d 'de' MMMM", { locale: es }) : ''}
                    </DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {selectedDay && Object.values(eventsByDay[format(selectedDay, 'yyyy-MM-dd')] || {}).flat().map((event) => {
                        const styles = getStatusStyles(event.status);
                        return (
                            <Link 
                                key={event.osId} 
                                href={`/entregas/pedido/${event.osId}`} 
                                className={cn(
                                    "block p-4 rounded-xl border border-border/40 bg-card/60 hover:bg-amber-500/5 hover:border-amber-500/30 transition-all group",
                                    styles.border !== 'border-dashed border-muted-foreground/40' && `border-l-4 ${styles.border}`
                                )}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                        <p className="font-black text-sm tracking-tight uppercase group-hover:text-amber-700">{event.serviceNumber}</p>
                                        <p className="text-xs font-bold text-muted-foreground">{event.client}</p>
                                    </div>
                                    <Badge variant={styles.badge as any} className="text-[10px] font-black uppercase tracking-widest">
                                        {event.status}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/10">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                                        <span className="font-bold">{event.horaInicio}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Users className="h-3.5 w-3.5 text-amber-500" />
                                        <span className="font-bold">{event.asistentes} asistentes</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground col-span-2">
                                        <MapPin className="h-3.5 w-3.5 text-amber-500" />
                                        <span className="font-medium truncate">{event.space}</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    </TooltipProvider >
  );
}

export default function CalendarioEntregasPage() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <CalendarioEntregasPageInner />
    </Suspense>
  );
}
