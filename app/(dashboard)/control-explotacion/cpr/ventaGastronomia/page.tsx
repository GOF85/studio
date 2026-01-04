
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AreaChart, Calendar as CalendarIcon, Info } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ServiceOrder, GastronomyOrder, Receta } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/utils';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

import { useEventos, useGastronomyOrders, useRecetas } from '@/hooks/use-data-queries';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

type VentaDetalle = {
    fecha: string;
    osId: string;
    osNumber: string;
    referencia: string;
    cantidad: number;
    pvpTotal: number;
    costeMPTotal: number;
    margenBruto: number;
};

function VentaGastronomiaPageInner() {
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams() ?? new URLSearchParams();

    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const { data: allServiceOrders = [] } = useEventos();
    const { data: allGastroOrders = [] } = useGastronomyOrders();
    const { data: allRecetas = [] } = useRecetas();

    const detalleVentas = useMemo(() => {
        if (!from || !to || !allServiceOrders.length) return [];

        try {
            const rangeStart = new Date(from);
            const rangeEnd = new Date(to);
            
            const recetasMap = new Map(allRecetas.map(r => [r.id, r]));

            const osIdsEnRango = new Set(
                allServiceOrders
                    .filter(os => {
                        try {
                            const osDate = os.startDate ? new Date(os.startDate) : new Date();
                            return os.status === 'Confirmado' && isWithinInterval(osDate, { start: rangeStart, end: rangeEnd });
                        } catch (e) { return false; }
                    })
                    .map(os => os.id)
            );

            const gastroOrdersEnRango = allGastroOrders.filter(go => osIdsEnRango.has(go.osId));
            
            const ventasDetalladas: VentaDetalle[] = [];
            gastroOrdersEnRango.forEach(order => {
                const os = allServiceOrders.find(o => o.id === order.osId);
                (order.items || []).forEach(item => {
                    if (item.type === 'item') {
                        const receta = recetasMap.get(item.id);
                        if (receta && os) {
                            const pvpTotalItem = (receta.precioVenta || 0) * (item.quantity || 0);
                            const costeMPTotalItem = (receta.costeMateriaPrima || 0) * (item.quantity || 0);
                            ventasDetalladas.push({
                                fecha: os.startDate ? (typeof os.startDate === 'string' ? os.startDate : new Date(os.startDate).toISOString()) : new Date().toISOString(),
                                osId: os?.id || 'N/A',
                                osNumber: os?.serviceNumber || 'N/A',
                                referencia: receta.nombre,
                                cantidad: item.quantity || 0,
                                pvpTotal: pvpTotalItem,
                                costeMPTotal: costeMPTotalItem,
                                margenBruto: pvpTotalItem - costeMPTotalItem,
                            });
                        }
                    }
                });
            });
            
            return ventasDetalladas.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        } catch (error) {
            console.error("Error loading data:", error);
            return [];
        }
    }, [from, to, allServiceOrders, allGastroOrders, allRecetas]);

    useEffect(() => {
        setIsMounted(true);
    }, []);
    
    const dateRangeDisplay = useMemo(() => {
        if (!from || !to) return "Rango de fechas no especificado";
        try {
            return `${format(new Date(from), 'dd/MM/yyyy', { locale: es })} - ${format(new Date(to), 'dd/MM/yyyy', { locale: es })}`;
        } catch (e) {
            return "Fechas inválidas";
        }
    }, [from, to]);
    
    const totals = useMemo(() => {
        return detalleVentas.reduce((acc, venta) => {
            acc.cantidad += venta.cantidad;
            acc.pvpTotal += venta.pvpTotal;
            acc.costeMPTotal += venta.costeMPTotal;
            acc.margenBruto += venta.margenBruto;
            return acc;
        }, { cantidad: 0, pvpTotal: 0, costeMPTotal: 0, margenBruto: 0 });
    }, [detalleVentas]);
    
     const { calendarDays, eventsByDay, monthStart } = useMemo(() => {
        if (!from || !to) return { calendarDays: [], eventsByDay: {}, monthStart: new Date() };

        const rangeStart = new Date(from);
        const rangeEnd = new Date(to);

        const monthStart = startOfMonth(rangeStart);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(endOfMonth(rangeEnd), { weekStartsOn: 1 });
        
        const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
        
        const grouped: Record<string, { totalPVP: number, details: { osNumber: string, referencia: string, cantidad: number }[] }> = {};
        detalleVentas.forEach(venta => {
            const dayKey = format(new Date(venta.fecha), 'yyyy-MM-dd');
            if (!grouped[dayKey]) {
                grouped[dayKey] = { totalPVP: 0, details: [] };
            }
            grouped[dayKey].totalPVP += venta.pvpTotal;
            grouped[dayKey].details.push({ osNumber: venta.osNumber, referencia: venta.referencia, cantidad: venta.cantidad });
        });

        return { calendarDays: days, eventsByDay: grouped, monthStart: rangeStart };
    }, [from, to, detalleVentas]);


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando detalle de ventas..." />;
    }

    return (
        <main>
            <div className="text-sm text-muted-foreground mb-6">
                Mostrando datos para el periodo: <strong>{dateRangeDisplay}</strong>
            </div>

            <Tabs defaultValue="ventas">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="ventas">Ventas</TabsTrigger>
                    <TabsTrigger value="calendario">Calendario</TabsTrigger>
                </TabsList>
                <TabsContent value="ventas">
                    <Card>
                        <CardContent className="pt-6">
                             <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg mb-4 text-sm font-semibold">
                                <span>TOTALES DEL PERIODO</span>
                                <div className="flex items-center gap-6">
                                    <span>PVP Total: <span className="text-primary">{formatCurrency(totals.pvpTotal)}</span></span>
                                    <span>Coste MP: <span>{formatCurrency(totals.costeMPTotal)}</span></span>
                                    <span className={cn(totals.margenBruto < 0 ? 'text-destructive' : 'text-green-600')}>Margen CPR: <span>{formatCurrency(totals.margenBruto)} ({formatPercentage(totals.pvpTotal > 0 ? totals.margenBruto/totals.pvpTotal : 0)})</span></span>
                                </div>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>OS</TableHead>
                                        <TableHead>Referencia</TableHead>
                                        <TableHead className="text-right">Cantidad</TableHead>
                                        <TableHead className="text-right">PVP Total</TableHead>
                                        <TableHead className="text-right">Coste MP Total</TableHead>
                                        <TableHead className="text-right text-green-600">Margen CPR</TableHead>
                                        <TableHead className="text-right text-green-600">Margen CPR (%)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detalleVentas.length > 0 ? detalleVentas.map((venta, i) => (
                                        <TableRow key={`${venta.osId}-${venta.referencia}-${i}`}>
                                            <TableCell>{format(new Date(venta.fecha), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell><Link href={`/os/${venta.osId}/gastronomia`} className="text-primary hover:underline">{venta.osNumber}</Link></TableCell>
                                            <TableCell>{venta.referencia}</TableCell>
                                            <TableCell className="text-right">{venta.cantidad}</TableCell>
                                            <TableCell className="text-right font-semibold">{formatCurrency(venta.pvpTotal)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(venta.costeMPTotal)}</TableCell>
                                            <TableCell className="text-right font-bold text-green-600">{formatCurrency(venta.margenBruto)}</TableCell>
                                            <TableCell className="text-right font-bold text-green-600">
                                                {venta.pvpTotal > 0 ? formatPercentage(venta.margenBruto / venta.pvpTotal) : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={8} className="text-center h-24">No se encontraron datos de venta para este periodo.</TableCell></TableRow>
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
                                        const isCurrentMonth = isWithinInterval(day, { start: startOfDay(new Date(from!)), end: endOfDay(new Date(to!)) });

                                        return (
                                            <div
                                                key={day.toString()}
                                                className={cn('h-28 border-r border-b p-2 flex flex-col', !isCurrentMonth && 'bg-muted/30 text-muted-foreground', 'last:border-r-0')}>
                                                <span className='font-semibold text-xs'>{format(day, 'd')}</span>
                                                {dayEvent && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="mt-1 flex-grow flex items-center justify-center bg-primary/10 rounded-md p-1">
                                                                <p className="text-sm font-bold text-primary text-center">{formatCurrency(dayEvent.totalPVP)}</p>
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

export default function VentaGastronomiaPage() {
    return (
        <Suspense fallback={<div>Cargando ...</div>}>
            <VentaGastronomiaPageInner />
        </Suspense>
    );
}
