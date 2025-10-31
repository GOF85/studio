
'use client';

import * as React from "react"
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AreaChart, TrendingUp, TrendingDown, Euro, Calendar as CalendarIcon, BarChart, Info, MessageSquare, Save } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, isWithinInterval, startOfDay, endOfDay, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subDays, startOfMonth, getMonth, getYear, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import Link from "next/link";

import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import type { ServiceOrder, GastronomyOrder, Receta, PersonalMiceOrder, PersonalExterno, PersonalExternoAjuste, CosteFijoCPR, ObjetivoMensualCPR } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn, formatCurrency, formatPercentage, calculateHours } from '@/lib/utils';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { GASTO_LABELS } from '@/lib/constants';

type KpiCardProps = {
    title: string;
    value: string;
    icon: React.ElementType;
    description?: string;
}

function KpiCard({ title, value, icon: Icon, description }: KpiCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-2">
                <CardTitle className="text-xs font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-2">
                <div className="text-xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    )
}

export default function CprControlExplotacionPage() {
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        if (from && to) {
            try {
                return { from: parseISO(from), to: parseISO(to) };
            } catch (e) {
                console.error("Invalid date format in URL", e);
            }
        }
        return { from: startOfMonth(new Date()), to: endOfMonth(new Date()) };
    });
    
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Estados para datos maestros
    const [allServiceOrders, setAllServiceOrders] = useState<ServiceOrder[]>([]);
    const [allGastroOrders, setAllGastroOrders] = useState<GastronomyOrder[]>([]);
    const [allRecetas, setAllRecetas] = useState<Receta[]>([]);
    const [allPersonalMiceOrders, setAllPersonalMiceOrders] = useState<PersonalMiceOrder[]>([]);
    const [allCostesFijos, setAllCostesFijos] = useState<CosteFijoCPR[]>([]);
    const [allObjetivos, setAllObjetivos] = useState<ObjetivoMensualCPR[]>([]);
    
    // Estados para valores manuales
    const [costePersonalMice, setCostePersonalMice] = useState(0);
    const [costePersonalEtt, setCostePersonalEtt] = useState(0);
    const [otrosGastos, setOtrosGastos] = useState(0);

    const loadData = useCallback(() => {
        setAllServiceOrders(JSON.parse(localStorage.getItem('serviceOrders') || '[]'));
        setAllGastroOrders(JSON.parse(localStorage.getItem('gastronomyOrders') || '[]'));
        setAllRecetas(JSON.parse(localStorage.getItem('recetas') || '[]'));
        setAllPersonalMiceOrders(JSON.parse(localStorage.getItem('personalMiceOrders') || '[]'));
        setAllCostesFijos(JSON.parse(localStorage.getItem('costesFijosCPR') || '[]'));
        setAllObjetivos(JSON.parse(localStorage.getItem('objetivosCPR') || '[]'));
        setIsMounted(true);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (dateRange?.from) {
            params.set('from', dateRange.from.toISOString().split('T')[0]);
        } else {
            params.delete('from');
        }
        if (dateRange?.to) {
            params.set('to', dateRange.to.toISOString().split('T')[0]);
        } else {
            params.delete('to');
        }
        router.replace(`${window.location.pathname}?${params.toString()}`);
    }, [dateRange, router]);

    const dataCalculada = useMemo(() => {
        if (!isMounted || !dateRange?.from) return null;

        const rangeStart = startOfDay(dateRange.from);
        const rangeEnd = endOfDay(dateRange.to || dateRange.from);
        
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
        const recetasMap = new Map(allRecetas.map(r => [r.id, r]));

        const ingresosVenta = gastroOrdersEnRango.reduce((sum, order) => {
            const orderTotal = (order.items || []).reduce((itemSum, item) => {
                if (item.type === 'item') {
                    const receta = recetasMap.get(item.id);
                    if (receta) {
                        return itemSum + ((receta.precioVenta || 0) * (item.quantity || 0));
                    }
                }
                return itemSum;
            }, 0);
            return sum + orderTotal;
        }, 0);
        
        const costeEscandallo = gastroOrdersEnRango.reduce((sum, order) => {
             const orderTotal = (order.items || []).reduce((itemSum, item) => {
                if (item.type === 'item') {
                    const receta = recetasMap.get(item.id);
                    if (receta) {
                        const costeTotalItem = (receta.costeMateriaPrima || 0) * (item.quantity || 0);
                        return itemSum + costeTotalItem;
                    }
                }
                return itemSum;
            }, 0);
            return sum + orderTotal;
        }, 0);
        
        const personalMiceEnRango = allPersonalMiceOrders.filter(o => osIdsEnRango.has(o.osId));
        const ingresosCesionPersonal = personalMiceEnRango
            .filter(o => o.centroCoste && !['COCINA', 'CPR'].includes(o.centroCoste))
            .reduce((sum, order) => {
                const hours = calculateHours(order.horaEntradaReal || order.horaEntrada, order.horaSalidaReal || order.horaSalida);
                return sum + (hours * (order.precioHora || 0));
            }, 0);

        const costesFijosPeriodo = allCostesFijos.reduce((sum, fijo) => sum + (fijo.importeMensual || 0), 0);

        const mesObjetivo = format(dateRange.from, 'yyyy-MM');
        const objetivo = allObjetivos.find(o => o.mes === mesObjetivo) || { presupuestoVentas: 0, presupuestoGastosMP: 0, presupuestoGastosPersonal: 0};
        
        const ingresosTotales = ingresosVenta + ingresosCesionPersonal;
        const gastosTotales = costeEscandallo + costePersonalMice + costePersonalEtt + costesFijosPeriodo + otrosGastos;
        const resultadoExplotacion = ingresosTotales - gastosTotales;

        const kpis = {
            ingresos: ingresosTotales,
            gastos: gastosTotales,
            resultado: resultadoExplotacion,
            margen: ingresosTotales > 0 ? resultadoExplotacion / ingresosTotales : 0,
            costeMPPct: ingresosTotales > 0 ? costeEscandallo / ingresosTotales : 0,
            costePersonalPct: ingresosTotales > 0 ? (costePersonalMice + costePersonalEtt) / ingresosTotales : 0,
        };
        
        return { kpis, objetivo, costeEscandallo, ingresosVenta, ingresosCesionPersonal, costesFijosPeriodo };

    }, [isMounted, dateRange, allServiceOrders, allGastroOrders, allRecetas, allPersonalMiceOrders, allCostesFijos, allObjetivos, costePersonalMice, costePersonalEtt, otrosGastos]);

    const setDatePreset = (preset: 'month' | 'year' | 'q1' | 'q2' | 'q3' | 'q4') => {
        const now = new Date();
        let fromDate, toDate;
        switch(preset) {
            case 'month': fromDate = startOfMonth(now); toDate = endOfMonth(now); break;
            case 'year': fromDate = startOfYear(now); toDate = endOfYear(now); break;
            case 'q1': fromDate = startOfQuarter(new Date(now.getFullYear(), 0, 1)); toDate = endOfQuarter(new Date(now.getFullYear(), 2, 31)); break;
            case 'q2': fromDate = startOfQuarter(new Date(now.getFullYear(), 3, 1)); toDate = endOfQuarter(new Date(now.getFullYear(), 5, 30)); break;
            case 'q3': fromDate = startOfQuarter(new Date(now.getFullYear(), 6, 1)); toDate = endOfQuarter(new Date(now.getFullYear(), 8, 30)); break;
            case 'q4': fromDate = startOfQuarter(new Date(now.getFullYear(), 9, 1)); toDate = endOfQuarter(new Date(now.getFullYear(), 11, 31)); break;
        }
        setDateRange({ from: fromDate, to: toDate });
        setIsDatePickerOpen(false);
    };

    if (!isMounted || !dataCalculada) {
        return <LoadingSkeleton title="Calculando rentabilidad del CPR..." />;
    }

    const { kpis, objetivo, costeEscandallo, ingresosVenta, ingresosCesionPersonal, costesFijosPeriodo } = dataCalculada;

    const tablaExplotacion = [
        { label: "Venta Gastronomía a Eventos", real: ingresosVenta, ppto: objetivo.presupuestoVentas, hasDetail: true, detailType: 'ventaGastronomia' },
        { label: "Cesión de Personal a otros Dptos.", real: ingresosCesionPersonal, ppto: 0 },
        { label: "Coste de MP según Escandallo", real: costeEscandallo, ppto: objetivo.presupuestoGastosMP, isGasto: true, hasDetail: true, detailType: 'costeMP' },
        { label: "Personal MICE (CPR)", real: costePersonalMice, ppto: objetivo.presupuestoGastosPersonal, isGasto: true, isManual: true, setter: setCostePersonalMice }
    ];
    
    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="flex flex-col xl:flex-row gap-4 p-4">
                     <div className="flex flex-wrap items-center gap-2">
                         <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-full md:w-[260px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.from && range?.to) { setIsDatePickerOpen(false); }}} numberOfMonths={2} locale={es}/>
                            </PopoverContent>
                        </Popover>
                         <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('month')}>Mes</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('year')}>Año</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q1')}>Q1</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q2')}>Q2</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q3')}>Q3</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q4')}>Q4</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <KpiCard title="Ingresos Totales" value={formatCurrency(kpis.ingresos)} icon={Euro} />
                <KpiCard title="Gastos Totales" value={formatCurrency(kpis.gastos)} icon={TrendingDown} />
                <KpiCard title="Resultado Explotación" value={formatCurrency(kpis.resultado)} icon={kpis.resultado >= 0 ? TrendingUp : TrendingDown} />
                <KpiCard title="Margen s/Ventas" value={formatPercentage(kpis.margen)} icon={AreaChart} />
                <KpiCard title="% Coste MP" value={formatPercentage(kpis.costeMPPct)} icon={AreaChart} />
                <KpiCard title="% Coste Personal" value={formatPercentage(kpis.costePersonalPct)} icon={AreaChart} />
            </div>
            
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="py-1 px-2">Concepto</TableHead>
                                    <TableHead className="text-right py-1 px-2">REAL</TableHead>
                                    <TableHead className="text-right py-1 px-2">PPTO.</TableHead>
                                    <TableHead className="text-right py-1 px-2">DESV. (€)</TableHead>
                                    <TableHead className="text-right py-1 px-2">DESV. (%)</TableHead>
                                    <TableHead className="text-right py-1 px-2">% s/ Ventas</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="bg-primary/10 hover:bg-primary/10">
                                    <TableCell className="font-bold py-1 px-2">INGRESOS</TableCell>
                                    <TableCell className="text-right font-bold py-1 px-2">{formatCurrency(kpis.ingresos)}</TableCell>
                                    <TableCell className="text-right font-bold py-1 px-2">{formatCurrency(objetivo.presupuestoVentas)}</TableCell>
                                    <TableCell colSpan={3}></TableCell>
                                </TableRow>
                                {tablaExplotacion.filter(r => !r.isGasto).map(row => {
                                    const desviacion = row.real - row.ppto;
                                    const pctSventas = kpis.ingresos > 0 ? row.real / kpis.ingresos : 0;
                                    return (
                                    <TableRow key={row.label}>
                                        <TableCell className="pl-8 flex items-center gap-2 py-1 px-2">
                                            {row.hasDetail && dateRange?.from && dateRange.to && (
                                                <Link href={`/control-explotacion/cpr/${row.detailType}?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`}>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6"><Info className="h-4 w-4" /></Button>
                                                </Link>
                                            )}
                                            {row.label}
                                        </TableCell>
                                        <TableCell className="text-right py-1 px-2">{formatCurrency(row.real)}</TableCell>
                                        <TableCell className="text-right py-1 px-2">{formatCurrency(row.ppto)}</TableCell>
                                        <TableCell className={cn("text-right py-1 px-2", desviacion < 0 && 'text-destructive')}>{formatCurrency(desviacion)}</TableCell>
                                        <TableCell className={cn("text-right py-1 px-2", desviacion < 0 && 'text-destructive')}>{row.ppto > 0 ? formatPercentage(desviacion / row.ppto) : '-'}</TableCell>
                                        <TableCell className="text-right py-1 px-2">{formatPercentage(pctSventas)}</TableCell>
                                    </TableRow>
                                )})}

                                <TableRow className="bg-destructive/10 hover:bg-destructive/10">
                                    <TableCell className="font-bold py-1 px-2">GASTOS</TableCell>
                                    <TableCell className="text-right font-bold py-1 px-2">{formatCurrency(kpis.gastos)}</TableCell>
                                    <TableCell className="text-right font-bold py-1 px-2">{formatCurrency(objetivo.presupuestoGastosMP + objetivo.presupuestoGastosPersonal)}</TableCell>
                                    <TableCell colSpan={3}></TableCell>
                                </TableRow>
                                {tablaExplotacion.filter(r => r.isGasto).map(row => {
                                    const desviacion = row.real - row.ppto;
                                    const pctSventas = kpis.ingresos > 0 ? row.real / kpis.ingresos : 0;
                                    return (
                                    <TableRow key={row.label}>
                                        <TableCell className="pl-8 flex items-center gap-2 py-1 px-2">
                                        {row.hasDetail && dateRange?.from && dateRange.to && (
                                            <Link href={`/control-explotacion/cpr/${row.detailType}?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`}>
                                                <Button variant="ghost" size="icon" className="h-6 w-6"><Info className="h-4 w-4" /></Button>
                                            </Link>
                                        )}
                                        {row.label}</TableCell>
                                        <TableCell className="text-right py-1 px-2">
                                            {row.isManual ? (
                                                <Input type="number" value={row.real} onChange={e => row.setter?.(parseFloat(e.target.value) || 0)} className="h-7 text-right"/>
                                            ) : formatCurrency(row.real)}
                                        </TableCell>
                                        <TableCell className="text-right py-1 px-2">{formatCurrency(row.ppto)}</TableCell>
                                        <TableCell className={cn("text-right py-1 px-2", desviacion > 0 && 'text-destructive')}>{formatCurrency(desviacion)}</TableCell>
                                        <TableCell className={cn("text-right py-1 px-2", desviacion > 0 && 'text-destructive')}>{row.ppto > 0 ? formatPercentage(desviacion / row.ppto) : '-'}</TableCell>
                                        <TableCell className="text-right py-1 px-2">{formatPercentage(pctSventas)}</TableCell>
                                    </TableRow>
                                )})}
                                <TableRow className="bg-primary/20 hover:bg-primary/20 text-base font-bold">
                                    <TableCell className="py-2 px-2">RESULTADO EXPLOTACIÓN</TableCell>
                                    <TableCell className="text-right py-2 px-2">{formatCurrency(kpis.resultado)}</TableCell>
                                    <TableCell colSpan={4}></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
