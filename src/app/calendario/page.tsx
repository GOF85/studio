'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameMonth,
  isSameDay,
  add,
  sub,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import type { ServiceOrder, ComercialBriefing, ComercialBriefingItem } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

type CalendarEvent = {
  date: Date;
  serviceNumber: string;
  serviceType: string;
  space: string;
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function CalendarioServiciosPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const serviceOrders: ServiceOrder[] = JSON.parse(localStorage.getItem('serviceOrders') || '[]');
    const briefings: ComercialBriefing[] = JSON.parse(localStorage.getItem('comercialBriefings') || '[]');
    
    const allEvents: CalendarEvent[] = [];
    
    briefings.forEach(briefing => {
      const serviceOrder = serviceOrders.find(os => os.id === briefing.osId);
      if (serviceOrder) {
        briefing.items.forEach(item => {
          allEvents.push({
            date: new Date(item.fecha),
            serviceNumber: serviceOrder.serviceNumber,
            serviceType: item.descripcion,
            space: serviceOrder.space || 'N/A',
          });
        });
      }
    });

    setEvents(allEvents);
    setIsMounted(true);
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Adjust start of week to Monday (iso week)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const eventsByDay = useMemo(() => {
    const grouped: { [key: string]: { serviceNumber: string; serviceType: string; space: string }[] } = {};
    events.forEach(event => {
      const dayKey = format(event.date, 'yyyy-MM-dd');
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      // Evitar duplicados por día y número de servicio
      if (!grouped[dayKey].some(e => e.serviceNumber === event.serviceNumber)) {
        grouped[dayKey].push({
          serviceNumber: event.serviceNumber,
          serviceType: event.serviceType,
          space: event.space
        });
      }
    });
    return grouped;
  }, [events]);

  const nextMonth = () => setCurrentDate(add(currentDate, { months: 1 }));
  const prevMonth = () => setCurrentDate(sub(currentDate, { months: 1 }));

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Calendario..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
              <CalendarIcon />
              Calendario de Servicios
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
          <div className="grid grid-cols-7 grid-rows-5">
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
                    <TooltipProvider delayDuration={100}>
                      {dayEvents.map(event => (
                        <Tooltip key={event.serviceNumber}>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="w-full justify-start truncate cursor-default">
                              {event.serviceNumber}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-bold">{event.serviceType}</p>
                            <p>Espacio: {event.space}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </TooltipProvider>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
