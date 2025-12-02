'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { ChevronLeft, ChevronRight, Package, Users, Clock } from 'lucide-react';
import type { Entrega, EntregaHito } from '@/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type CalendarEvent = {
  date: Date;
  osId: string;
  serviceNumber: string;
  horaInicio: string;
  space: string;
  finalClient: string;
  asistentes: number;
  status: Entrega['status'];
};

type EventsByDay = {
    [dayKey: string]: CalendarEvent[]
};

type DayDetails = {
    day: Date;
    events: CalendarEvent[];
} | null;

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const statusVariant: { [key in Entrega['status']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Borrador: 'secondary',
  Confirmado: 'default',
  Enviado: 'outline',
  Entregado: 'outline'
};

export default function CalendarioEntregasPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);


  useEffect(() => {
    const serviceOrders: Entrega[] = (JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[]);
    const allPedidos = (JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as {osId: string, hitos: EntregaHito[]}[]);
    
    const allEvents: CalendarEvent[] = [];
    
    serviceOrders.forEach(os => {
        const pedido = allPedidos.find(p => p.osId === os.id);
        if (pedido && pedido.hitos) {
            pedido.hitos.forEach(hito => {
                 allEvents.push({
                    date: new Date(hito.fecha),
                    osId: os.id,
                    serviceNumber: os.serviceNumber,
                    horaInicio: hito.hora,
                    space: hito.lugarEntrega || os.spaceAddress,
                    finalClient: os.finalClient || os.client,
                    asistentes: os.asistentes,
                    status: os.status,
                });
            })
        }
    });

    setEvents(allEvents);
    setIsMounted(true);
  }, []);

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
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(event);
    });
    return grouped;
  }, [events]);

  const nextMonth = () => setCurrentDate(add(currentDate, { months: 1 }));
  const prevMonth = () => setCurrentDate(sub(currentDate, { months: 1 }));

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Calendario de Entregas..." />;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
              <Package />
              Calendario de Entregas
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold w-40 text-center capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h2>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="border rounded-lg">
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
              const dayEvents = eventsByDay[dayKey] || [];
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
                      {dayEvents.slice(0, 3).map((event, index) => {
                         return (
                            <Tooltip key={`${event.osId}-${index}`}>
                                <TooltipTrigger asChild>
                                <Link href={`/entregas/pedido/${event.osId}`}>
                                    <Badge variant={statusVariant[event.status]} className="w-full justify-start truncate cursor-pointer">
                                    {event.serviceNumber} - {event.horaInicio}
                                    </Badge>
                                </Link>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <div className="space-y-2">
                                        <p className="font-bold">{event.finalClient}</p>
                                        <p className="text-sm text-muted-foreground">{event.space}</p>
                                        <p className="flex items-center gap-1 text-muted-foreground text-sm"><Users className="h-3 w-3"/>{event.asistentes} asistentes</p>
                                    </div>
                                </TooltipContent>
                          </Tooltip>
                         )
                      })}
                      {dayEvents.length > 3 && (
                         <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setDayDetails({ day, events: dayEvents })}>
                            ... y {dayEvents.length - 3} más
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
                    <DialogTitle>Entregas para el {dayDetails?.day ? format(dayDetails.day, 'PPP', { locale: es }) : ''}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    {dayDetails && dayDetails.events.map((event, index) => (
                         <Link key={`${event.osId}-${index}`} href={`/entregas/pedido/${event.osId}`} className="block p-3 hover:bg-muted rounded-md">
                            <p className="font-bold text-primary">{event.serviceNumber}</p>
                            <p>{event.finalClient}</p>
                            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4">
                                <span className="flex items-center gap-1.5"><Clock className="h-3 w-3"/>{event.horaInicio}</span>
                                <span className="flex items-center gap-1.5"><Users className="h-3 w-3"/>{event.asistentes} asistentes</span>
                                <span className="flex items-center gap-1.5">{event.space}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    </TooltipProvider>
  );
}
