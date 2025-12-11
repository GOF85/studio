'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
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
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Clock, List, Grid } from 'lucide-react';
import type { ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEventos } from '@/hooks/use-data-queries';

// --- TIPOS ---

type CalendarEvent = {
  date: Date;
  osId: string;
  serviceNumber: string;
  serviceType: string;
  horaInicio: string;
  space: string;
  finalClient: string;
  asistentes: number;
  status: 'BORRADOR' | 'PENDIENTE' | 'CONFIRMADO' | 'EJECUTADO' | 'CANCELADO' | string;
};

type EventsByDay = {
  [dayKey: string]: {
    [osId: string]: CalendarEvent[]
  }
};

type DayDetails = {
  day: Date;
  osEvents: { [osId: string]: CalendarEvent[] };
} | null;

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Configuración de colores por estado
const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  'BORRADOR': 'outline',     
  'PENDIENTE': 'destructive', 
  'CONFIRMADO': 'default',    
  'EJECUTADO': 'secondary',   
  'CANCELADO': 'destructive'
};

// --- LOGICA DE HEATMAP ---
const getDayLoadLevel = (totalPax: number) => {
    if (totalPax === 0) return '';
    if (totalPax < 50) return 'bg-slate-50/50 hover:bg-slate-100/80'; 
    if (totalPax < 200) return 'bg-orange-50/40 hover:bg-orange-100/60'; 
    return 'bg-rose-50/40 hover:bg-rose-100/60'; 
};

export default function CalendarioServiciosPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');

  // Hook de datos
  const { data: serviceOrders = [], isLoading } = useEventos();

  // 1. Construcción de Eventos
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    serviceOrders.forEach((os: ServiceOrder) => {
      // Normalizamos el estado a mayúsculas
      const statusNormalized = os.status?.toUpperCase() || 'BORRADOR';
      
      if (statusNormalized !== 'CANCELADO' && os.startDate) {
        const eventDate = new Date(os.startDate);
        
        allEvents.push({
          date: eventDate,
          osId: os.id,
          serviceNumber: os.serviceNumber || 'S/N',
          serviceType: os.vertical || 'Servicio',
          horaInicio: format(eventDate, 'HH:mm'), 
          space: os.space || 'Espacio por definir',
          finalClient: os.finalClient || 'Cliente',
          asistentes: os.asistentes || 0,
          status: statusNormalized,
        });
      }
    });

    return allEvents;
  }, [serviceOrders]);

  // 2. Configuración del Calendario
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // 3. Agrupación por Día
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

  const nextMonth = () => setCurrentDate(add(currentDate, { months: 1 }));
  const prevMonth = () => setCurrentDate(sub(currentDate, { months: 1 }));

  if (isLoading) {
    return <LoadingSkeleton title="Cargando Calendario..." />;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <main className="container mx-auto px-4 py-8 h-full flex flex-col">
        {/* HEADER & CONTROLES */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3 text-primary">
              <CalendarIcon className="h-8 w-8" />
              Calendario Operativo
            </h1>
            {/* Texto eliminado por solicitud de usuario */}
          </div>
          
          <div className="flex items-center gap-3 bg-muted/20 p-1 rounded-lg">
            <div className="md:hidden flex border bg-background rounded-md overflow-hidden shadow-sm">
              <Button variant={viewMode === 'agenda' ? 'secondary' : 'ghost'} size="sm" className="rounded-none px-3" onClick={() => setViewMode('agenda')}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" className="rounded-none px-3" onClick={() => setViewMode('grid')}>
                <Grid className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Botón PES */}
            <Link href="/pes">
              <Button variant="secondary" size="sm" className="font-bold text-primary shadow-sm hover:bg-white">
                PES
              </Button>
            </Link>

            <div className="flex items-center bg-background rounded-md shadow-sm border">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="hover:bg-muted">
                <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-base font-semibold w-36 text-center capitalize px-2">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
                </h2>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="hover:bg-muted">
                <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
          </div>
        </div>

        {/* --- VISTA AGENDA (MÓVIL) --- */}
        <div className={cn("md:hidden space-y-4 pb-20", viewMode !== 'agenda' && 'hidden')}>
          {calendarDays
            .filter(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              return eventsByDay[dayKey] && Object.keys(eventsByDay[dayKey]).length > 0 && isSameMonth(day, currentDate);
            })
            .map(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayOsEvents = eventsByDay[dayKey];
              const isToday = isSameDay(day, new Date());
              
              const dailyPax = Object.values(dayOsEvents).flat().reduce((acc, ev) => acc + ev.asistentes, 0);

              return (
                <div key={dayKey} className="space-y-2">
                    {/* Sticky Header para móvil */}
                    <div className={cn("sticky top-16 z-10 py-2 px-3 bg-background/95 backdrop-blur border-b flex justify-between items-center font-medium", isToday ? "text-primary border-primary" : "text-foreground")}>
                        <span>{format(day, 'EEEE d', { locale: es })}</span>
                        {dailyPax > 0 && <span className="text-xs text-muted-foreground font-normal">{dailyPax} pax total</span>}
                    </div>

                    <div className="space-y-2 px-1">
                        {Object.entries(dayOsEvents).map(([osId, osEvents]) => {
                        const firstEvent = osEvents[0];
                        const isDraft = firstEvent.status === 'BORRADOR';

                        return (
                            <Link key={osId} href={`/os?id=${osId}`} className="block">
                                <Card className={cn(
                                    "transition-all hover:shadow-md",
                                    isDraft && "border-dashed opacity-80 bg-muted/20" 
                                )}>
                                <CardContent className="p-3 flex items-start gap-3">
                                    <div className={cn(
                                        "w-1 self-stretch rounded-full",
                                        isDraft ? "bg-muted-foreground/30" : "bg-primary"
                                    )} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-sm truncate">{firstEvent.finalClient}</p>
                                            <Badge variant={statusVariant[firstEvent.status] || 'default'} className="text-[10px] h-5 px-1.5">
                                                {firstEvent.status === 'BORRADOR' ? 'Borrador' : 'Conf.'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">{firstEvent.space}</p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {firstEvent.horaInicio}</span>
                                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {firstEvent.asistentes}</span>
                                        </div>
                                    </div>
                                </CardContent>
                                </Card>
                            </Link>
                        );
                        })}
                    </div>
                </div>
              );
            })}
            
            {/* Empty State Móvil */}
            {calendarDays.filter(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                return eventsByDay[dayKey] && Object.keys(eventsByDay[dayKey]).length > 0 && isSameMonth(day, currentDate);
            }).length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
                    <CalendarIcon className="h-12 w-12 mb-2" />
                    <p>No hay eventos programados este mes.</p>
                </div>
            )}
        </div>

        {/* --- VISTA GRID (DESKTOP) --- */}
        <div className={cn("border rounded-xl shadow-sm bg-card overflow-hidden flex flex-col h-full min-h-[600px]", viewMode === 'agenda' && 'hidden md:flex')}>
          {/* Cabecera Días Semana */}
          <div className="grid grid-cols-7 border-b bg-muted/40 divide-x">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-xs font-semibold uppercase tracking-wider py-2 text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          {/* Rejilla Días */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y flex-1">
            {calendarDays.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayOsEvents = eventsByDay[dayKey] || {};
              const osIds = Object.keys(dayOsEvents);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              
              const dailyTotalPax = Object.values(dayOsEvents).flat().reduce((acc, ev) => acc + ev.asistentes, 0);
              const loadClass = isCurrentMonth ? getDayLoadLevel(dailyTotalPax) : '';

              return (
                <div
                  key={day.toString()}
                  className={cn(
                    'min-h-[140px] p-2 flex flex-col transition-colors duration-200 relative group',
                    loadClass,
                    !isCurrentMonth && 'bg-muted/30 text-muted-foreground/50'
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={cn(
                        'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full', 
                        isToday ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                    )}>
                        {format(day, 'd')}
                    </span>
                    {dailyTotalPax > 0 && isCurrentMonth && (
                        <span className="text-[10px] font-mono font-medium text-muted-foreground/70 bg-white/50 px-1 rounded">
                            {dailyTotalPax}p
                        </span>
                    )}
                  </div>

                  <div className="flex-grow space-y-1.5 overflow-hidden">
                    {osIds.slice(0, 4).map(osId => {
                      const osEvents = dayOsEvents[osId];
                      const firstEvent = osEvents[0];
                      const isDraft = firstEvent.status === 'BORRADOR';

                      return (
                        <Tooltip key={osId}>
                          <TooltipTrigger asChild>
                            <Link href={`/os?id=${osId}`} className="block">
                              <div className={cn(
                                "text-[10px] px-1.5 py-1 rounded border truncate flex items-center gap-1.5 transition-all hover:scale-[1.02]",
                                isDraft 
                                    ? "bg-white/50 border-dashed border-muted-foreground/40 text-muted-foreground" 
                                    : "bg-white border-l-2 border-l-primary shadow-sm border-border text-foreground"
                              )}>
                                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isDraft ? "bg-gray-300" : "bg-emerald-500")} />
                                <span className="font-semibold truncate flex-1">{firstEvent.finalClient}</span>
                                <span className="opacity-70 font-mono tracking-tighter shrink-0">{firstEvent.horaInicio}</span>
                              </div>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="p-0 overflow-hidden border-none shadow-xl">
                            <Card className="w-64 border-0">
                                <CardHeader className={cn("py-3 px-4", isDraft ? "bg-muted" : "bg-primary/10")}>
                                    <CardTitle className="text-sm font-bold flex justify-between items-center">
                                        <span>{firstEvent.serviceNumber}</span>
                                        <Badge variant={statusVariant[firstEvent.status] || 'secondary'} className="text-[10px] h-5">
                                            {firstEvent.status}
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3 text-sm">
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
                    {osIds.length > 4 && (
                      <Button variant="ghost" size="sm" className="w-full h-5 text-[10px] text-muted-foreground hover:text-primary p-0" onClick={() => setDayDetails({ day, osEvents: dayOsEvents })}>
                        + {osIds.length - 4} más
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modal Detalles del Día (Al hacer click en ver más) */}
      <Dialog open={!!dayDetails} onOpenChange={(open) => !open && setDayDetails(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                {dayDetails?.day ? format(dayDetails.day, 'EEEE d MMMM', { locale: es }) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2 mt-2 pr-1">
            {dayDetails && Object.values(dayDetails.osEvents).flat().map((event, index) => (
              <Link key={`${event.osId}-${index}`} href={`/os?id=${event.osId}`} className="block">
                 <div className={cn(
                    "p-3 rounded-lg border transition-colors hover:bg-muted flex gap-3",
                    event.status === 'BORRADOR' ? "border-dashed opacity-80" : "border-l-4 border-l-primary"
                 )}>
                    <div className="flex-1">
                        <div className="flex justify-between">
                            <p className="font-bold text-sm">{event.finalClient}</p>
                            <span className="text-xs font-mono text-muted-foreground">{event.horaInicio}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{event.space}</p>
                    </div>
                    <div className="text-right flex flex-col items-end justify-center min-w-[3rem]">
                        <span className="font-bold text-sm">{event.asistentes}</span>
                        <span className="text-[10px] text-muted-foreground">pax</span>
                    </div>
                 </div>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}