
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
import type { ServiceOrder, ComercialBriefing } from '@/types';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { useEventos } from '@/hooks/use-data-queries';

type CalendarEvent = {
  date: Date;
  osId: string;
  serviceNumber: string;
  serviceType: string;
  horaInicio: string;
  space: string;
  finalClient: string;
  asistentes: number;
  status: ServiceOrder['status'];
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

const statusVariant: { [key in ServiceOrder['status']]: 'default' | 'secondary' | 'destructive' } = {
  Borrador: 'secondary',
  Pendiente: 'destructive',
  Confirmado: 'default',
  Anulado: 'destructive'
};

export default function CalendarioServiciosPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');

  // Use React Query hook for eventos
  const { data: serviceOrders = [], isLoading } = useEventos();

  // Build events from service orders directly (no briefings dependency for now)
  // TODO: Add useComercialBriefings hook when available
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    // For now, create calendar events directly from service orders
    serviceOrders.forEach((os: ServiceOrder) => {
      if (os.status !== 'Anulado' && os.startDate) {
        allEvents.push({
          date: new Date(os.startDate),
          osId: os.id,
          serviceNumber: os.serviceNumber,
          serviceType: os.vertical || 'Servicio',
          horaInicio: '09:00', // Default time
          space: os.space || 'N/A',
          finalClient: os.finalClient || '',
          asistentes: os.asistentes || 0,
          status: os.status,
        });
      }
    });

    return allEvents;
  }, [serviceOrders]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const eventsByDay = useMemo(() => {
    const grouped: EventsByDay = {};
    events.forEach(event => {
      const dayKey = format(event.date, 'yyyy-MM-dd');
      if (!grouped[dayKey]) {
        grouped[dayKey] = {};
      }
      if (!grouped[dayKey][event.osId]) {
        grouped[dayKey][event.osId] = [];
      }
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
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
              <CalendarIcon />
              Calendario de Servicios
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="md:hidden flex border rounded-lg overflow-hidden">
              <Button variant={viewMode === 'agenda' ? 'secondary' : 'ghost'} size="sm" className="rounded-none" onClick={() => setViewMode('agenda')}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" className="rounded-none" onClick={() => setViewMode('grid')}>
                <Grid className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg md:text-xl font-semibold w-32 md:w-40 text-center capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h2>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Agenda View */}
        <div className={cn("md:hidden space-y-2", viewMode !== 'agenda' && 'hidden')}>
          {calendarDays
            .filter(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              return eventsByDay[dayKey] && Object.keys(eventsByDay[dayKey]).length > 0 && isSameMonth(day, currentDate);
            })
            .map(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayOsEvents = eventsByDay[dayKey];
              const isToday = isSameDay(day, new Date());
              return (
                <Card key={dayKey} className={cn(isToday && "border-primary")}>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className={cn("text-sm font-medium", isToday && "text-primary")}>
                      {format(day, 'EEEE d', { locale: es })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 pt-0 space-y-1">
                    {Object.entries(dayOsEvents).map(([osId, osEvents]) => {
                      const firstEvent = osEvents[0];
                      return (
                        <Link key={osId} href={`/os?id=${osId}`} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{firstEvent.serviceNumber}</p>
                            <p className="text-xs text-muted-foreground truncate">{firstEvent.space}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant={statusVariant[firstEvent.status]} className="text-[10px]">{firstEvent.asistentes} pax</Badge>
                          </div>
                        </Link>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          {calendarDays.filter(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            return eventsByDay[dayKey] && Object.keys(eventsByDay[dayKey]).length > 0 && isSameMonth(day, currentDate);
          }).length === 0 && (
              <p className="text-center text-muted-foreground py-8">No hay eventos este mes.</p>
            )}
        </div>

        {/* Desktop Grid View (also shown on mobile if grid mode selected) */}
        <div className={cn("border rounded-lg", viewMode === 'agenda' && 'hidden md:block')}>
          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center font-bold p-3 text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr">
            {calendarDays.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayOsEvents = eventsByDay[dayKey] || {};
              const osIds = Object.keys(dayOsEvents);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toString()}
                  className={cn(
                    'h-40 border-r border-b p-2 flex flex-col',
                    !isCurrentMonth && 'bg-muted/50 text-muted-foreground',
                    'last:border-r-0'
                  )}
                >
                  <span className={cn('font-semibold', isToday && 'text-primary font-bold flex items-center justify-center h-7 w-7 rounded-full bg-primary/20')}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex-grow overflow-y-auto mt-1 space-y-1">
                    {osIds.slice(0, 3).map(osId => {
                      const osEvents = dayOsEvents[osId];
                      const firstEvent = osEvents[0];
                      return (
                        <Tooltip key={osId}>
                          <TooltipTrigger asChild>
                            <Link href={`/os?id=${osId}`}>
                              <Badge variant={statusVariant[firstEvent.status]} className="w-full justify-start truncate cursor-pointer">
                                {firstEvent.serviceNumber}
                              </Badge>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-2">
                              <p className="font-bold">{firstEvent.space}{firstEvent.finalClient && ` - ${firstEvent.finalClient}`}</p>
                              {osEvents.slice(0, 3).map((event, index) => (
                                <div key={`${event.osId}-${index}`} className="text-sm">
                                  <p className="font-medium flex items-center gap-1.5"><Clock className="h-3 w-3" />{event.horaInicio} - {event.serviceType}</p>
                                  <p className="flex items-center gap-1 text-muted-foreground pl-5"><Users className="h-3 w-3" />{event.asistentes} asistentes</p>
                                </div>
                              ))}
                              {osEvents.length > 3 && (
                                <p className="text-xs text-muted-foreground mt-1">...y {osEvents.length - 3} más</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                    {osIds.length > 3 && (
                      <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setDayDetails({ day, osEvents: dayOsEvents })}>
                        ... y {osIds.length - 3} más
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Dialog open={!!dayDetails} onOpenChange={(open) => !open && setDayDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Servicios para el {dayDetails?.day ? format(dayDetails.day, 'PPP', { locale: es }) : ''}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {dayDetails && Object.values(dayDetails.osEvents).flat().map((event, index) => (
              <Link key={`${event.osId}-${index}`} href={`/os?id=${event.osId}`} className="block p-3 hover:bg-muted rounded-md">
                <p className="font-bold text-primary">{event.serviceNumber}</p>
                <p>{event.space}{event.finalClient && ` - ${event.finalClient}`}</p>
                <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4">
                  <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{event.horaInicio} - {event.serviceType}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.asistentes} asistentes</span>
                </div>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
