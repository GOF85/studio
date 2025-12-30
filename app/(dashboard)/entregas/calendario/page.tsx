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
import { ChevronLeft, ChevronRight, Package, Users, Clock, Calendar as CalendarIcon, Plus } from 'lucide-react';
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
import { useEntregas } from '@/hooks/use-data-queries';

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
  Pendiente: 'outline',
  Confirmado: 'default',
  Entregado: 'default',
  Enviado: 'default',
  Anulado: 'destructive'
};

export default function CalendarioEntregasPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);

  const { data: allEntregasData, isLoading: loadingEntregas } = useEntregas();

  useEffect(() => {
    if (loadingEntregas || !allEntregasData) return;

    const serviceOrders = allEntregasData;
    const allEvents: CalendarEvent[] = [];
    
    serviceOrders.forEach(os => {
        const hitos = (os as any).hitos || [];
        hitos.forEach((hito: any, index: number) => {
            const hitoIndex = (index + 1).toString().padStart(2, '0');
            allEvents.push({
                date: new Date(hito.fecha),
                osId: os.numero_expediente || os.id,
                serviceNumber: `${os.numero_expediente}.${hitoIndex}`,
                horaInicio: hito.hora,
                space: hito.lugarEntrega || (os as any).spaceAddress || '',
                finalClient: (os as any).finalClient || (os as any).client || '',
                asistentes: (os as any).asistentes || 0,
                status: (os.estado === 'CONFIRMADO' ? 'Confirmado' : 
                         os.estado === 'CANCELADO' ? 'Anulado' : 
                         os.estado === 'EJECUTADO' ? 'Entregado' : 'Borrador') as any,
            });
        });
    });

    setEvents(allEvents);
    setIsMounted(true);
  }, [allEntregasData, loadingEntregas]);

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

  if (!isMounted || loadingEntregas) {
    return <LoadingSkeleton title="Calendario de Entregas" />;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <main className="min-h-screen bg-background/30 pb-20">
        {/* Header Premium Sticky */}
        <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                <div className="flex items-center">
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <CalendarIcon className="h-5 w-5 text-amber-500" />
                    </div>
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-4">
                <div className="flex items-center bg-background/50 border border-border/40 rounded-lg p-0.5">
                    <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7 hover:bg-amber-500/10 hover:text-amber-600">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-[11px] font-black uppercase tracking-widest px-4 min-w-[140px] text-center">
                        {format(currentDate, 'MMMM yyyy', { locale: es })}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7 hover:bg-amber-500/10 hover:text-amber-600">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="h-4 w-[1px] bg-border/40 mx-1" />

                <Button size="sm" asChild className="h-8 rounded-lg font-black px-4 bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20 transition-all active:scale-95 text-[10px] uppercase tracking-widest">
                    <Link href="/entregas/pedido/nuevo">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Nuevo Pedido
                    </Link>
                </Button>
            </div>
        </div>
    </div>

        <div className="max-w-[1600px] mx-auto px-4">
            <div className="bg-background/40 backdrop-blur-sm border border-border/40 rounded-xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-7 border-b border-border/40 bg-muted/30">
                    {WEEKDAYS.map(day => (
                    <div key={day} className="text-center font-black p-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
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
                            'h-44 border-r border-b border-border/40 p-2 flex flex-col transition-colors hover:bg-amber-500/[0.02]',
                            !isCurrentMonth && 'bg-muted/20 text-muted-foreground/40',
                            'last:border-r-0'
                        )}
                        >
                        <div className="flex justify-between items-start mb-2">
                            <span className={cn(
                                'text-[11px] font-black p-1.5 rounded-lg min-w-[28px] text-center', 
                                isToday ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-muted-foreground'
                            )}>
                                {format(day, 'd')}
                            </span>
                            {dayEvents.length > 0 && (
                                <Badge variant="outline" className="h-4 px-1 text-[9px] font-black border-amber-500/20 bg-amber-500/5 text-amber-600">
                                    {dayEvents.length}
                                </Badge>
                            )}
                        </div>
                        <div className="flex-grow overflow-y-auto space-y-1 custom-scrollbar">
                            {dayEvents.slice(0, 4).map((event, index) => {
                                return (
                                    <Tooltip key={`${event.osId}-${index}`}>
                                        <TooltipTrigger asChild>
                                        <Link href={`/entregas/pedido/${event.osId}`}>
                                            <div className={cn(
                                                "group relative flex flex-col p-1.5 rounded-lg border border-border/40 bg-background/50 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all cursor-pointer",
                                                event.status === 'Anulado' && "opacity-50 grayscale"
                                            )}>
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-[9px] font-black uppercase tracking-tighter truncate max-w-[70%]">
                                                        {event.serviceNumber}
                                                    </span>
                                                    <span className="text-[8px] font-medium text-muted-foreground">
                                                        {event.horaInicio}
                                                    </span>
                                                </div>
                                                <span className="text-[8px] text-muted-foreground truncate group-hover:text-amber-700">
                                                    {event.finalClient}
                                                </span>
                                            </div>
                                        </Link>
                                        </TooltipTrigger>
                                        <TooltipContent className="p-3 rounded-xl border-border/40 shadow-2xl backdrop-blur-xl bg-background/95">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between gap-4">
                                                    <p className="text-[11px] font-black uppercase tracking-widest">{event.serviceNumber}</p>
                                                    <Badge variant={statusVariant[event.status]} className="text-[8px] font-black uppercase px-1.5 h-4">
                                                        {event.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-[10px] font-bold text-amber-600">{event.finalClient}</p>
                                                <div className="h-[1px] bg-border/40" />
                                                <p className="text-[9px] text-muted-foreground leading-relaxed">{event.space}</p>
                                                <div className="flex items-center gap-3 pt-1">
                                                    <p className="flex items-center gap-1 text-muted-foreground text-[9px] font-medium">
                                                        <Clock className="h-3 w-3 text-amber-500"/>
                                                        {event.horaInicio}
                                                    </p>
                                                    <p className="flex items-center gap-1 text-muted-foreground text-[9px] font-medium">
                                                        <Users className="h-3 w-3 text-amber-500"/>
                                                        {event.asistentes}
                                                    </p>
                                                </div>
                                            </div>
                                        </TooltipContent>
                                </Tooltip>
                                )
                            })}
                            {dayEvents.length > 4 && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full h-6 text-[9px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-500/10" 
                                    onClick={() => setDayDetails({ day, events: dayEvents })}
                                >
                                    + {dayEvents.length - 4} más
                                </Button>
                            )}
                        </div>
                        </div>
                    );
                    })}
                </div>
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
