
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, add, sub, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import type { Entrega, PedidoEntrega, EntregaHito } from '@/types';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

type PedidoConHoras = {
    os: Entrega;
    totalHoras: number;
    numEntregas: number;
};

export default function GestionPersonalPage() {
    const [pedidos, setPedidos] = useState<PedidoConHoras[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const router = useRouter();

    useEffect(() => {
        const allEntregas = (JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[]).filter(os => os.vertical === 'Entregas' && os.status === 'Confirmado');
        const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        
        const pedidosData = allEntregas.map(os => {
            const pedido = allPedidosEntrega.find(p => p.osId === os.id);
            const totalHoras = pedido?.hitos.reduce((sum, hito) => sum + (hito.horasCamarero || 0), 0) || 0;
            const numEntregas = pedido?.hitos.filter(h => h.horasCamarero && h.horasCamarero > 0).length || 0;
            return { os, totalHoras, numEntregas };
        }).filter(p => p.totalHoras > 0);

        setPedidos(pedidosData);
        setIsMounted(true);
    }, []);

    const monthStart = startOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(add(monthStart, { months: 1, days: -1 }), { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const pedidosPorDia = useMemo(() => {
        const grouped: { [dayKey: string]: PedidoConHoras[] } = {};
        pedidos.forEach(p => {
            const dayKey = format(new Date(p.os.startDate), 'yyyy-MM-dd');
            if (!grouped[dayKey]) {
                grouped[dayKey] = [];
            }
            grouped[dayKey].push(p);
        });
        return grouped;
    }, [pedidos]);

    const nextMonth = () => setCurrentDate(add(currentDate, { months: 1 }));
    const prevMonth = () => setCurrentDate(sub(currentDate, { months: 1 }));

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Gestión de Personal..." />;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Users className="w-10 h-10 text-primary" />
                    <div>
                        <h1 className="text-3xl font-headline font-bold">Gestión de Personal para Entregas</h1>
                        <p className="text-muted-foreground">Planifica y asigna el personal para los servicios de entrega.</p>
                    </div>
                </div>
            </div>

             <div className="flex items-center justify-center gap-4 mb-6">
                <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                <h2 className="text-xl font-semibold w-48 text-center capitalize">{format(currentDate, 'MMMM yyyy', { locale: es })}</h2>
                <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            
             <div className="border rounded-lg">
                <div className="grid grid-cols-7 border-b">
                    {WEEKDAYS.map(day => (
                        <div key={day} className="text-center font-bold p-2 text-xs text-muted-foreground">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-[140px]">
                    {calendarDays.map(day => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const dayPedidos = pedidosPorDia[dayKey] || [];
                        const isToday = isSameDay(day, new Date());
                        
                        return (
                            <div key={day.toString()} className={cn('h-full border-r border-b p-1 flex flex-col', !isSameMonth(day, currentDate) && 'bg-muted/30')}>
                                <span className={cn('font-semibold text-xs', isToday && 'text-primary font-bold')}>{format(day, 'd')}</span>
                                <div className="flex-grow overflow-y-auto mt-1 space-y-1">
                                    {dayPedidos.map(p => (
                                        <Link key={p.os.id} href={`/entregas/gestion-personal/${p.os.id}`}>
                                            <Badge className="w-full justify-start truncate cursor-pointer text-xs leading-tight h-auto py-1">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{p.os.serviceNumber}</span>
                                                    <span className="font-normal">{p.os.client}</span>
                                                    <span className="font-normal text-muted-foreground">{p.numEntregas} entregas / {p.totalHoras}h</span>
                                                </div>
                                            </Badge>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
             </div>
        </main>
    );
}
