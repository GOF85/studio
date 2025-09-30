
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
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
import type { TransporteOrder } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function CalendarView({ orders, onOrderClick }: { orders: TransporteOrder[], onOrderClick: (id: string) => void }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const groupedOrders = useMemo(() => {
        const grouped: { [date: string]: TransporteOrder[] } = {};
        orders.forEach(order => {
            const dateKey = format(new Date(order.fecha), 'yyyy-MM-dd');
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(order);
        });
        return grouped;
    }, [orders]);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const nextMonth = () => setCurrentDate(add(currentDate, { months: 1 }));
    const prevMonth = () => setCurrentDate(sub(currentDate, { months: 1 }));

    return (
        <TooltipProvider>
            <div className="flex items-center justify-center gap-4 mb-6">
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
                        const dayEvents = groupedOrders[dayKey] || [];
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
                                {dayEvents.map(order => (
                                    <Tooltip key={order.id}>
                                        <TooltipTrigger asChild>
                                             <Badge 
                                                variant="outline" 
                                                className="w-full justify-start truncate cursor-pointer bg-white"
                                                onClick={() => onOrderClick(order.id)}
                                            >
                                                {order.horaEntrega} - {order.lugarEntrega}
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p><strong>Recogida:</strong> {order.lugarRecogida} ({order.horaRecogida})</p>
                                            <p><strong>Entrega:</strong> {order.lugarEntrega} ({order.horaEntrega})</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </TooltipProvider>
    );
}

function ListView({ orders, onOrderClick }: { orders: TransporteOrder[], onOrderClick: (id: string) => void }) {
     const groupedOrders = useMemo(() => {
        const grouped: { [date: string]: TransporteOrder[] } = {};
        orders.forEach(order => {
            const dateKey = format(new Date(order.fecha), 'yyyy-MM-dd');
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(order);
        });
        return Object.entries(grouped).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
    }, [orders]);

    return (
         <div className="space-y-6">
            {groupedOrders.length > 0 ? (
                groupedOrders.map(([date, dailyOrders]) => (
                    <Card key={date}>
                        <CardHeader>
                            <CardTitle className="capitalize flex items-center gap-2"><CalendarIcon size={20} /> {format(new Date(date), 'EEEE, d \'de\' MMMM', {locale: es})}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {dailyOrders.map(order => (
                                <div key={order.id} className="border p-4 rounded-lg hover:bg-secondary/50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold">{order.lugarEntrega}</p>
                                            <p className="text-sm text-muted-foreground">{order.proveedorNombre} - {order.tipoTransporte}</p>
                                        </div>
                                        <Button onClick={() => onOrderClick(order.id)}>Ver Albarán</Button>
                                    </div>
                                    <div className="text-sm mt-2 grid grid-cols-2 gap-2">
                                        <p><strong>Recogida:</strong> {order.lugarRecogida} a las {order.horaRecogida}</p>
                                        <p><strong>Entrega:</strong> {order.lugarEntrega} a las {order.horaEntrega}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))
            ) : (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Sin servicios asignados</h3>
                        <p className="mt-1 text-sm text-muted-foreground">No tienes ninguna entrega o recogida en el sistema.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}


export default function TransportePortalPage() {
    const [orders, setOrders] = useState<TransporteOrder[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const allOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
        setOrders(allOrders);
        setIsMounted(true);
    }, []);

    const handleOrderClick = (id: string) => {
        router.push(`/portal/albaran/${id}`);
    }

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Portal de Transporte..." />;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Truck className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-headline font-bold tracking-tight">Portal de Transporte</h1>
                    <p className="text-lg text-muted-foreground">Listado de entregas y recogidas asignadas.</p>
                </div>
            </div>

            <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-sm mx-auto mb-6">
                    <TabsTrigger value="list">Lista</TabsTrigger>
                    <TabsTrigger value="calendar">Calendario</TabsTrigger>
                </TabsList>
                <TabsContent value="list">
                   <ListView orders={orders} onOrderClick={handleOrderClick} />
                </TabsContent>
                <TabsContent value="calendar">
                    <CalendarView orders={orders} onOrderClick={handleOrderClick}/>
                </TabsContent>
            </Tabs>
        </main>
    )
}
