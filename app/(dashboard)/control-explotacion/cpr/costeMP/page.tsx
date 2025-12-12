
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TrendingDown, ArrowLeft } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ServiceOrder, GastronomyOrder, Receta } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { formatCurrency, formatNumber } from '@/lib/utils';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type CosteMPDetalle = {
    fecha: string;
    osId: string;
    osNumber: string;
    referencia: string;
    cantidad: number;
    costeMPTotal: number;
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function CosteMPPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [detalleCostes, setDetalleCostes] = useState<CosteMPDetalle[]>([]);
    const router = useRouter();
    const searchParams = useSearchParams();

    const from = searchParams.get('from');
    const to = searchParams.get('to');

    useEffect(() => {
        if (!from || !to) {
            setIsMounted(true);
            return;
        }

        const rangeStart = new Date(from);
        const rangeEnd = new Date(to);
        
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
        const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
        const recetasMap = new Map(allRecetas.map(r => [r.id, r]));

        const osIdsEnRango = new Set(
            allServiceOrders
                .filter(os => {
                    try {
                        const osDate = new Date(os.startDate);
                        return os.status === 'Confirmado' && isWithinInterval(osDate, { start: rangeStart, end: rangeEnd });
                    } catch (e) { return false; }
                })
                .map(os => os.id)
        );

        const gastroOrdersEnRango = allGastroOrders.filter(go => osIdsEnRango.has(go.osId));
        
        const costesMPDetallados: CosteMPDetalle[] = [];
        gastroOrdersEnRango.forEach(order => {
            const os = allServiceOrders.find(o => o.id === order.osId);
            (order.items || []).forEach(item => {
                if (item.type === 'item') {
                    const receta = recetasMap.get(item.id);
                    if (receta) {
                        const costeTotalItem = (receta.costeMateriaPrima || 0) * (item.quantity || 0);
                        costesMPDetallados.push({
                            fecha: os?.startDate || new Date().toISOString(),
                            osId: os?.id || 'N/A',
                            osNumber: os?.serviceNumber || 'N/A',
                            referencia: receta.nombre,
                            cantidad: item.quantity || 0,
                            costeMPTotal: costeTotalItem,
                        });
                    }
                }
            });
        });
        
        setDetalleCostes(costesMPDetallados.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
        setIsMounted(true);
    }, [from, to]);
    
    const dateRangeDisplay = useMemo(() => {
        if (!from || !to) return "Rango de fechas no especificado";
        try {
            return `${format(new Date(from), 'dd/MM/yyyy', { locale: es })} - ${format(new Date(to), 'dd/MM/yyyy', { locale: es })}`;
        } catch (e) {
            return "Fechas inválidas";
        }
    }, [from, to]);
    
    const totals = useMemo(() => {
        return detalleCostes.reduce((acc, coste) => {
            acc.cantidad += coste.cantidad;
            acc.costeMPTotal += coste.costeMPTotal;
            return acc;
        }, { cantidad: 0, costeMPTotal: 0 });
    }, [detalleCostes]);
    
    const { calendarDays, eventsByDay } = useMemo(() => {
        if (!from || !to) return { calendarDays: [], eventsByDay: {} };

        const rangeStart = new Date(from);
        const rangeEnd = new Date(to);

        const monthStart = startOfMonth(rangeStart);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(endOfMonth(rangeEnd), { weekStartsOn: 1 });
        
        const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
        
        const grouped: Record<string, { totalCoste: number, details: { osNumber: string, referencia: string, cantidad: number }[] }> = {};
        detalleCostes.forEach(coste => {
            const dayKey = format(new Date(coste.fecha), 'yyyy-MM-dd');
            if (!grouped[dayKey]) {
                grouped[dayKey] = { totalCoste: 0, details: [] };
            }
            grouped[dayKey].totalCoste += coste.costeMPTotal;
            grouped[dayKey].details.push({ osNumber: coste.osNumber, referencia: coste.referencia, cantidad: coste.cantidad });
        });

        return { calendarDays: days, eventsByDay: grouped };
    }, [from, to, detalleCostes]);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando detalle de costes..." />;
    }

    return (
        <main>
            <div className="text-sm text-muted-foreground mb-6">
                Mostrando datos para el periodo: <strong>{dateRangeDisplay}</strong>
            </div>

            <Tabs defaultValue="costes">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="costes">Costes</TabsTrigger>
                    <TabsTrigger value="calendario">Calendario</TabsTrigger>
                </TabsList>
                <TabsContent value="costes">
                     <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg mb-4 text-sm font-semibold">
                                <span>TOTALES DEL PERIODO</span>
                                <div className="flex items-center gap-6">
                                    <span>Coste MP Total: <span className="text-primary">{formatCurrency(totals.costeMPTotal)}</span></span>
                                </div>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>OS</TableHead>
                                        <TableHead>Referencia</TableHead>
                                        <TableHead className="text-right">Cantidad</TableHead>
                                        <TableHead className="text-right">Coste MP Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detalleCostes.length > 0 ? detalleCostes.map((coste, i) => (
                                        <TableRow key={`${coste.osId}-${coste.referencia}-${i}`}>
                                            <TableCell>{format(new Date(coste.fecha), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell><Link href={`/os/${coste.osId}/gastronomia`} className="text-primary hover:underline">{coste.osNumber}</Link></TableCell>
                                            <TableCell>{coste.referencia}</TableCell>
                                            <TableCell className="text-right">{coste.cantidad}</TableCell>
                                            <TableCell className="text-right font-semibold">{formatCurrency(coste.costeMPTotal)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24">No se encontraron datos de costes para este periodo.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="calendario">
                     <TooltipProvider>
                        <Card>
                             <CardContent className="pt-6">
                                <div className="border rounded-lg">
                                    <div className="grid grid-cols-7 border-b">
                                        {WEEKDAYS.map(day => (
                                        <div key={day} className="text-center font-bold p-2 text-xs text-muted-foreground">
                                            {day}
                                        </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 auto-rows-fr">
                                        {calendarDays.map((day) => {
                                        const dayKey = format(day, 'yyyy-MM-dd');
                                        const dayEvent = eventsByDay[dayKey];
                                        const isCurrentMonth = isWithinInterval(day, { start: new Date(from!), end: new Date(to!) });

                                        return (
                                            <div
                                                key={day.toString()}
                                                className={cn('h-28 border-r border-b p-2 flex flex-col', !isCurrentMonth && 'bg-muted/30 text-muted-foreground', 'last:border-r-0')}>
                                                <span className='font-semibold text-xs'>{format(day, 'd')}</span>
                                                {dayEvent && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="mt-1 flex-grow flex items-center justify-center bg-amber-100/50 rounded-md p-1 cursor-default">
                                                                <p className="text-sm font-bold text-amber-700 text-center">{formatCurrency(dayEvent.totalCoste)}</p>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <div className="p-1 max-w-xs text-xs space-y-1">
                                                                {dayEvent.details.map((d, i) => (
                                                                    <p key={i}><strong>{d.osNumber}:</strong> {d.referencia} (x{d.cantidad})</p>
                                                                ))}
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        );
                                        })}
                                    </div>
                                </div>
                             </CardContent>
                        </Card>
                    </TooltipProvider>
                </TabsContent>
            </Tabs>
        </main>
    );
}
