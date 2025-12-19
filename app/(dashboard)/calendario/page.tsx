'use client';

// 1. IMPORTS
import { useState, useMemo, useCallback, memo } from 'react';
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
  isValid
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Users, 
  Clock, 
  List, 
  Grid,
  AlertCircle
} from 'lucide-react';

import type { ServiceOrder } from '@/types';
import { useEventos } from '@/hooks/use-data-queries';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// 2. TYPES & INTERFACES
type CalendarStatus = 'BORRADOR' | 'PENDIENTE' | 'CONFIRMADO' | 'EJECUTADO' | 'CANCELADO';

interface CalendarEvent {
  date: Date;
  osId: string;
  serviceNumber: string;
  horaInicio: string;
  space: string;
  finalClient: string;
  asistentes: number;
  status: CalendarStatus | string;
}

interface EventsByDay {
  [dayKey: string]: {
    [osId: string]: CalendarEvent[]
  }
}

interface DayDetails {
  day: Date;
  osEvents: { [osId: string]: CalendarEvent[] };
}

// 3. HELPERS PUROS
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Definición de estilos según guía (Amber para atención/pendiente)
const getStatusStyles = (status: string) => {
  const s = status.toUpperCase();
  switch (s) {
    case 'BORRADOR': return { badge: 'outline', border: 'border-dashed border-muted-foreground/40', bg: 'bg-muted/30' };
    case 'PENDIENTE': return { badge: 'secondary', border: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' }; // Acento Ámbar
    case 'CONFIRMADO': return { badge: 'default', border: 'border-primary', bg: 'bg-card' };
    case 'EJECUTADO': return { badge: 'secondary', border: 'border-slate-400', bg: 'bg-slate-50' };
    case 'CANCELADO': return { badge: 'destructive', border: 'border-destructive', bg: 'bg-destructive/10' };
    default: return { badge: 'default', border: 'border-border', bg: 'bg-card' };
  }
};

const getHeatmapClass = (totalPax: number) => {
  if (totalPax === 0) return '';
  if (totalPax < 50) return 'bg-slate-50/50 hover:bg-slate-100/80';
  if (totalPax < 200) return 'bg-orange-50/40 hover:bg-orange-100/60'; // Acento cálido
  return 'bg-rose-50/40 hover:bg-rose-100/60';
};

// 4. SUB-COMPONENTES LOCALES

// Celda individual del Grid
const DayGridCell = memo(function DayGridCell({ 
  day, 
  dayOsEvents, 
  currentDate, 
  onViewDetails,
  router
}: {
  day: Date;
  dayOsEvents: { [osId: string]: CalendarEvent[] };
  currentDate: Date;
  onViewDetails: (details: DayDetails) => void;
  router: any;
}) {
  const osIds = Object.keys(dayOsEvents);
  const isCurrentMonth = isSameMonth(day, currentDate);
  const isToday = isSameDay(day, new Date());
  
  const dailyTotalPax = useMemo(
    () => Object.values(dayOsEvents).flat().reduce((acc, ev) => acc + ev.asistentes, 0),
    [dayOsEvents]
  );
  
  const loadClass = isCurrentMonth ? getHeatmapClass(dailyTotalPax) : '';

  return (
    <div
      className={cn(
        'min-h-[140px] p-2 flex flex-col transition-colors duration-200 relative group border-b border-r last:border-r-0',
        loadClass,
        !isCurrentMonth && 'bg-muted/10 text-muted-foreground/40'
      )}
    >
      {/* Header del día */}
      <div className="flex justify-between items-start mb-2">
        <span className={cn(
            'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-all', 
            isToday ? 'bg-primary text-primary-foreground shadow-md scale-110' : 'text-muted-foreground'
        )}>
            {format(day, 'd')}
        </span>
        {dailyTotalPax > 0 && isCurrentMonth && (
            <Badge variant="secondary" className="text-[10px] px-1 h-5 font-mono">
                {dailyTotalPax}p
            </Badge>
        )}
      </div>

      {/* Lista de eventos (Máx 4) */}
      <div className="flex-grow space-y-1.5 overflow-hidden">
        {osIds.slice(0, 4).map(osId => {
          const osEvents = dayOsEvents[osId];
          const firstEvent = osEvents[0];
          const styles = getStatusStyles(firstEvent.status);

          return (
            <Tooltip key={osId}>
              <TooltipTrigger asChild>
                <div 
                  onClick={(e) => { e.stopPropagation(); router.push(`/os/${firstEvent.serviceNumber}`); }}
                  className={cn(
                    "cursor-pointer text-[10px] px-1.5 py-1 rounded border truncate flex items-center gap-1.5 transition-all hover:scale-[1.02] hover:shadow-sm",
                    styles.bg,
                    styles.border === 'border-dashed border-muted-foreground/40' ? styles.border : `border-l-2 ${styles.border}`
                  )}
                >
                  <span className="font-semibold truncate flex-1">{firstEvent.finalClient}</span>
                  <span className="opacity-70 font-mono tracking-tighter shrink-0">{firstEvent.horaInicio}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="p-0 border-none shadow-xl z-50">
                 {/* Mini Card Preview */}
                <Card className="w-64 border-0">
                    <CardHeader className={cn("py-3 px-4", styles.bg)}>
                        <CardTitle className="text-sm font-bold flex justify-between items-center">
                            <span>{firstEvent.serviceNumber}</span>
                            <Badge variant={styles.badge as any} className="text-[10px] h-5">
                                {firstEvent.status}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3 text-sm bg-background">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Cliente</p>
                            <p className="font-medium">{firstEvent.finalClient}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Espacio</p>
                            <p className="font-medium">{firstEvent.space}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                            <div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Pax</p>
                                <p className="font-mono font-bold">{firstEvent.asistentes}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Hora</p>
                                <p className="font-mono font-bold">{firstEvent.horaInicio}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
              </TooltipContent>
            </Tooltip>
          )
        })}
        
        {/* Ver más... */}
        {osIds.length > 4 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full h-5 text-[10px] text-muted-foreground hover:text-primary p-0" 
            onClick={() => onViewDetails({ day, osEvents: dayOsEvents })}
          >
            + {osIds.length - 4} más
          </Button>
        )}
      </div>
    </div>
  );
});

// Vista Agenda (Móvil / Lista)
const AgendaView = memo(function AgendaView({
  daysWithEvents,
  eventsByDay,
  router
}: {
  daysWithEvents: Date[];
  eventsByDay: EventsByDay;
  router: any;
}) {
  if (!daysWithEvents?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/60 border rounded-lg bg-muted/10 mt-4">
        <CalendarIcon className="h-12 w-12 mb-3 opacity-50" />
        <p className="font-medium">Sin eventos este mes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 mt-4">
      {daysWithEvents.map((day) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const dayData = eventsByDay[dayKey];
        if (!dayData) return null;

        const isToday = isSameDay(day, new Date());
        
        // Calcular pax total del día
        const dailyPax = Object.values(dayData).flat().reduce((acc, ev) => acc + ev.asistentes, 0);

        return (
          <div key={dayKey} className="group">
            {/* Sticky Day Header */}
            <div className={cn(
              "sticky top-0 z-10 py-2 px-3 bg-background/95 backdrop-blur border-b flex justify-between items-center font-medium text-sm transition-colors",
              isToday ? "text-primary border-primary bg-primary/5" : "text-foreground group-hover:bg-muted/30"
            )}>
              <span className="capitalize">{format(day, 'EEEE d MMM', { locale: es })}</span>
              {dailyPax > 0 && <span className="text-xs text-muted-foreground font-mono">{dailyPax} pax</span>}
            </div>

            {/* Event List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-card">
              {Object.entries(dayData).map(([osId, osEvents]) => {
                const firstEvent = osEvents[0];
                const styles = getStatusStyles(firstEvent.status);

                return (
                  <div 
                    key={osId} 
                    onClick={() => router.push(`/os/${firstEvent.serviceNumber}`)}
                    className={cn(
                        "relative rounded-lg p-3 border shadow-sm transition-all hover:shadow-md cursor-pointer group/card",
                        styles.bg,
                        styles.border !== 'border-dashed border-muted-foreground/40' && `border-l-4 ${styles.border}`
                    )}
                  >
                     <div className="flex justify-between items-start mb-2">
                        <p className="font-bold text-sm truncate pr-2">{firstEvent.finalClient}</p>
                        <Badge variant={styles.badge as any} className="text-[10px] h-5 px-1.5 shrink-0">
                          {firstEvent.status}
                        </Badge>
                     </div>
                     
                     <div className="text-xs text-muted-foreground space-y-1">
                        <p className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> 
                            <span className="font-mono text-foreground">{firstEvent.horaInicio}</span>
                        </p>
                        <p className="truncate">{firstEvent.space}</p>
                        <p className="flex items-center gap-1.5 font-medium text-foreground">
                            <Users className="h-3 w-3" /> 
                            {firstEvent.asistentes} pax
                        </p>
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

// 5. MAIN COMPONENT
export default function CalendarioServiciosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // --- STATE & URL SYNC ---
  // Leemos estado de la URL, fallback a valores por defecto
  const viewParam = searchParams.get('view');
  const dateParam = searchParams.get('date');

  const viewMode = (viewParam === 'agenda' ? 'agenda' : 'grid') as 'grid' | 'agenda';
  
  const currentDate = useMemo(() => {
    if (dateParam) {
      const parsed = parse(dateParam, 'yyyy-MM', new Date());
      if (isValid(parsed)) return parsed;
    }
    return new Date();
  }, [dateParam]);

  const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);

  // --- DATA FETCHING ---
  const { data: serviceOrders = [], isLoading } = useEventos();

  // --- LOGIC ---
  
  // Transformación de datos (Memoized)
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];
    serviceOrders.forEach((os: ServiceOrder) => {
      const statusNormalized = os.status?.toUpperCase() || 'BORRADOR';
      if (statusNormalized !== 'CANCELADO' && os.startDate) {
        const eventDate = new Date(os.startDate);
        allEvents.push({
          date: eventDate,
          osId: os.id,
          serviceNumber: os.serviceNumber || 'S/N',
          horaInicio: format(eventDate, 'HH:mm'), 
          space: os.space || 'Por definir',
          finalClient: os.finalClient || 'Cliente',
          asistentes: os.asistentes || 0,
          status: statusNormalized,
        });
      }
    });
    return allEvents;
  }, [serviceOrders]);

  // Cálculos de Calendario
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = useMemo(() => 
    eachDayOfInterval({ start: startDate, end: endDate }), 
  [startDate, endDate]);

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

  // Días con eventos (Solo mes actual)
  const daysWithEventsCurrentMonth = useMemo(() => {
    return calendarDays.filter(day => {
      if (!isSameMonth(day, currentDate)) return false;
      const dayKey = format(day, 'yyyy-MM-dd');
      return eventsByDay[dayKey] && Object.keys(eventsByDay[dayKey]).length > 0;
    });
  }, [calendarDays, eventsByDay, currentDate]);

  // --- HANDLERS ---

  // Actualizar URL sin recargar
  const updateParams = useCallback((newParams: { view?: string; date?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newParams.view) params.set('view', newParams.view);
    if (newParams.date) params.set('date', newParams.date);
    
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const setViewMode = (mode: 'grid' | 'agenda') => updateParams({ view: mode });
  
  const handleMonthChange = (direction: 'next' | 'prev') => {
    const newDate = direction === 'next' 
      ? add(currentDate, { months: 1 }) 
      : sub(currentDate, { months: 1 });
    
    updateParams({ date: format(newDate, 'yyyy-MM') });
    
    // Scroll Reset Effect
    window.scrollTo({ top: 0, behavior: 'instant' }); 
  };

  // --- RENDER ---
  
  if (isLoading) {
    return <LoadingSkeleton title="Cargando Calendario..." />;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <main className="container mx-auto px-4 py-8 flex flex-col min-h-screen">
        
        {/* HEADER TOOLBAR */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 sticky top-0 z-20 bg-background/80 backdrop-blur-sm py-4 border-b">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 text-foreground tracking-tight">
              <CalendarIcon className="h-8 w-8 text-primary" />
              Calendario Operativo
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
             {/* Navegación Mes */}
             <div className="flex items-center bg-card rounded-md shadow-sm border p-1 order-2 sm:order-1 flex-1 sm:flex-none justify-between sm:justify-center">
                <Button variant="ghost" size="icon" onClick={() => handleMonthChange('prev')}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-sm font-bold min-w-[140px] text-center capitalize">
                  {format(currentDate, 'MMMM yyyy', { locale: es })}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => handleMonthChange('next')}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
            </div>

            {/* Selector Vistas */}
            <div className="flex bg-muted/20 p-1 rounded-lg border order-1 sm:order-2">
              <Button 
                variant={viewMode === 'agenda' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('agenda')}
                className="flex-1 sm:flex-none gap-2"
              >
                <List className="h-4 w-4" /> Agenda
              </Button>
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('grid')}
                className="flex-1 sm:flex-none gap-2"
              >
                <Grid className="h-4 w-4" /> Grid
              </Button>
            </div>
            
             {/* Acción Externa */}
             <Button 
                variant="outline" 
                className="border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 font-semibold order-3"
                onClick={() => router.push('/pes')}
              >
                PES Previsión
             </Button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 flex flex-col relative">
          
          {/* VISTA AGENDA */}
          {viewMode === 'agenda' && (
            <AgendaView 
              daysWithEvents={daysWithEventsCurrentMonth}
              eventsByDay={eventsByDay}
              router={router}
            />
          )}

          {/* VISTA GRID */}
          {viewMode === 'grid' && (
            <div className="border rounded-xl shadow-sm bg-card overflow-hidden flex flex-col flex-1 min-h-[700px]">
              {/* Grid Header */}
              <div className="grid grid-cols-7 border-b bg-muted/40 divide-x">
                {WEEKDAYS.map(day => (
                  <div key={day} className="text-center text-[11px] font-bold uppercase tracking-wider py-2.5 text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Grid Body */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y flex-1 bg-background">
                {calendarDays.map((day) => (
                    <DayGridCell
                      key={day.toISOString()}
                      day={day}
                      dayOsEvents={eventsByDay[format(day, 'yyyy-MM-dd')] || {}}
                      currentDate={currentDate}
                      onViewDetails={setDayDetails}
                      router={router}
                    />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* DIALOG DETAILS (Clean Local State) */}
      <Dialog open={!!dayDetails} onOpenChange={(o) => !o && setDayDetails(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="bg-primary/10 p-2 rounded-full">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                </div>
                <span className="capitalize">
                    {dayDetails?.day ? format(dayDetails.day, 'EEEE d MMMM', { locale: es }) : ''}
                </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto p-1 space-y-3 mt-2 pr-2 flex-1">
            {dayDetails && Object.values(dayDetails.osEvents).flat().map((event, idx) => {
               const styles = getStatusStyles(event.status);
               return (
                <div 
                    key={`${event.osId}-${idx}`} 
                    onClick={() => router.push(`/os/${event.serviceNumber}`)}
                    className={cn(
                        "p-3 rounded-lg border transition-all hover:bg-muted/50 cursor-pointer flex gap-3 group relative",
                        styles.bg,
                        styles.border !== 'border-dashed border-muted-foreground/40' && `border-l-4 ${styles.border}`
                    )}
                 >
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                            <p className="font-bold text-sm truncate pr-2">{event.finalClient}</p>
                            <Badge variant={styles.badge as any} className="text-[10px] h-5">{event.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{event.space}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs font-mono text-muted-foreground">
                             <span className="flex items-center gap-1 bg-background/50 px-1.5 py-0.5 rounded border"><Clock className="w-3 h-3"/> {event.horaInicio}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center pl-3 border-l bg-background/30 w-16 shrink-0">
                        <span className="font-bold text-lg">{event.asistentes}</span>
                        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">pax</span>
                    </div>
                 </div>
               );
            })}
            {dayDetails && Object.keys(dayDetails.osEvents).length === 0 && (
                 <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>No hay eventos detallados.</p>
                 </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}