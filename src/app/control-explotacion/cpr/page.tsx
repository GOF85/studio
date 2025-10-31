

'use client';

import * as React from "react"
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AreaChart, TrendingUp, TrendingDown, Euro, Calendar as CalendarIcon, BarChart, Info, MessageSquare, Save } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, isWithinInterval, startOfDay, endOfDay, startOfYear, endOfYear, endOfMonth, startOfQuarter, endOfQuarter, subDays, startOfMonth, getYear, parseISO, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bar, XAxis, YAxis, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
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
import { GASTO_LABELS } from '@/lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";


type KpiCardProps = {
    title: string;
    value: string;
    icon: React.ElementType;
    description?: string;
    className?: string;
}

function KpiCard({ title, value, icon: Icon, description, className }: KpiCardProps) {
    return (
        <Card className={className}>
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

type CostRow = {
  label: string;
  presupuesto: number;
  cierre: number;
  real: number;
  objetivo: number;
  objetivo_pct: number;
  comentario?: string;
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i);


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
    const [objetivoMes, setObjetivoMes] = useState<Date>(new Date());
    const [availableObjetivoMonths, setAvailableObjetivoMonths] = useState<{label: string, value: string}[]>([]);


    // Estados para datos maestros
    const [allServiceOrders, setAllServiceOrders] = useState<ServiceOrder[]>([]);
    const [allGastroOrders, setAllGastroOrders] = useState<GastronomyOrder[]>([]);
    const [allRecetas, setAllRecetas] = useState<Receta[]>([]);
    const [allPersonalMiceOrders, setAllPersonalMiceOrders] = useState<PersonalMiceOrder[]>([]);
    const [allCostesFijos, setAllCostesFijos] = useState<CosteFijoCPR[]>([]);
    const [allObjetivos, setAllObjetivos] = useState<ObjetivoMensualCPR[]>([]);
    
    // Estados para valores manuales
    const [costePersonalEtt, setCostePersonalEtt] = useState(0);

    const loadData = useCallback(() => {
        setAllServiceOrders(JSON.parse(localStorage.getItem('serviceOrders') || '[]'));
        setAllGastroOrders(JSON.parse(localStorage.getItem('gastronomyOrders') || '[]'));
        setAllRecetas(JSON.parse(localStorage.getItem('recetas') || '[]'));
        setAllPersonalMiceOrders(JSON.parse(localStorage.getItem('personalMiceOrders') || '[]'));
        setAllCostesFijos(JSON.parse(localStorage.getItem('costesFijosCPR') || '[]'));
        const objetivosData = JSON.parse(localStorage.getItem('objetivosCPR') || '[]') as ObjetivoMensualCPR[];
        setAllObjetivos(objetivosData);
        
        const months = objetivosData
            .map(o => o.mes)
            .sort((a,b) => b.localeCompare(a));
        setAvailableObjetivoMonths(months.map(m => ({
            value: m,
            label: format(parseISO(`${m}-02`), 'MMMM yyyy', { locale: es })
        })));

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
        
        const costePersonalMice = personalMiceEnRango
            .filter(o => ['COCINA', 'CPR'].includes(o.centroCoste))
             .reduce((sum, order) => {
                const hours = calculateHours(order.horaEntradaReal || order.horaEntrada, order.horaSalidaReal || order.horaSalida);
                return sum + (hours * (order.precioHora || 0));
            }, 0);

        const costesFijosPeriodo = allCostesFijos.reduce((sum, fijo) => sum + (fijo.importeMensual || 0), 0);

        const mesObjetivoKey = format(objetivoMes, 'yyyy-MM');
        const objetivo = allObjetivos.find(o => o.mes === mesObjetivoKey) || { presupuestoVentas: 0, presupuestoCesionPersonal: 0, presupuestoGastosMP: 0, presupuestoGastosPersonalMice: 0, presupuestoGastosPersonalExterno: 0, presupuestoOtrosGastos: 0 };
        
        const ingresosTotales = ingresosVenta + ingresosCesionPersonal;
        const otrosGastos = costesFijosPeriodo;
        const gastosTotales = costeEscandallo + costePersonalMice + costePersonalEtt + otrosGastos;
        const resultadoExplotacion = ingresosTotales - gastosTotales;

        const kpis = {
            ingresos: ingresosTotales,
            gastos: gastosTotales,
            resultado: resultadoExplotacion,
            margen: ingresosTotales > 0 ? resultadoExplotacion / ingresosTotales : 0,
            costeMPPct: ingresosTotales > 0 ? costeEscandallo / ingresosTotales : 0,
            costePersonalPct: ingresosTotales > 0 ? (costePersonalMice + costePersonalEtt) / ingresosTotales : 0,
            costeOtrosPct: ingresosTotales > 0 ? otrosGastos / ingresosTotales : 0,
        };
        
        return { kpis, objetivo, costeEscandallo, ingresosVenta, ingresosCesionPersonal, costePersonalMice, costesFijosPeriodo, otrosGastos, facturacionNeta: ingresosTotales };

    }, [isMounted, dateRange, allServiceOrders, allGastroOrders, allRecetas, allPersonalMiceOrders, allCostesFijos, allObjetivos, costePersonalEtt, objetivoMes]);

    const dataAcumulada = useMemo(() => {
        if (!isMounted) return [];
        const mesesDelAno = eachMonthOfInterval({ start: startOfYear(new Date()), end: endOfYear(new Date())});

        return mesesDelAno.map(month => {
            const rangeStart = startOfMonth(month);
            const rangeEnd = endOfMonth(month);

            const osIdsEnRango = new Set(
                allServiceOrders.filter(os => {
                    try {
                        const osDate = new Date(os.startDate);
                        return os.status === 'Confirmado' && isWithinInterval(osDate, { start: rangeStart, end: rangeEnd });
                    } catch (e) { return false; }
                }).map(os => os.id)
            );

            const gastroOrdersEnRango = allGastroOrders.filter(go => osIdsEnRango.has(go.osId));
            const recetasMap = new Map(allRecetas.map(r => [r.id, r]));

            const ingresosVenta = gastroOrdersEnRango.reduce((sum, order) => sum + (order.total || 0), 0);
            const costeEscandallo = gastroOrdersEnRango.reduce((sum, order) => {
                 return sum + (order.items || []).reduce((itemSum, item) => {
                    if (item.type === 'item') {
                        const receta = recetasMap.get(item.id);
                        return itemSum + ((receta?.costeMateriaPrima || 0) * (item.quantity || 0));
                    }
                    return itemSum;
                }, 0);
            }, 0);
            
            const personalMiceEnRango = allPersonalMiceOrders.filter(o => osIdsEnRango.has(o.osId));
            const ingresosCesionPersonal = personalMiceEnRango.filter(o => o.centroCoste && !['COCINA', 'CPR'].includes(o.centroCoste)).reduce((sum, order) => sum + (calculateHours(order.horaEntradaReal || order.horaEntrada, order.horaSalidaReal || order.horaSalida) * (order.precioHora || 0)), 0);

            // Nota: Estos costes son simplificaciones para el acumulado.
            const costePersonalMiceMes = allCostesFijos.find(c => c.concepto === 'Personal MICE CPR')?.importeMensual || 0;
            const costePersonalEttMes = allCostesFijos.find(c => c.concepto === 'Personal ETT CPR')?.importeMensual || 0;
            const varios = allCostesFijos.filter(c => c.concepto !== 'Personal MICE CPR' && c.concepto !== 'Personal ETT CPR').reduce((s, c) => s + c.importeMensual, 0);

            const ingresos = ingresosVenta + ingresosCesionPersonal;
            const totalPersonalCPR = costePersonalMiceMes + costePersonalEttMes;
            const totalGastos = costeEscandallo + totalPersonalCPR + varios;
            const resultado = ingresos - totalGastos;

            return {
                mes: format(month, 'MMMM', { locale: es }),
                ingresos,
                consumoMMPP: costeEscandallo,
                personalMICE: costePersonalMiceMes,
                personalETTs: costePersonalEttMes,
                totalPersonalCPR,
                varios,
                resultado,
            }
        });

    }, [isMounted, allServiceOrders, allGastroOrders, allRecetas, allPersonalMiceOrders, allCostesFijos]);


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

    const { kpis, objetivo, costeEscandallo, ingresosVenta, ingresosCesionPersonal, costePersonalMice, costesFijosPeriodo, otrosGastos, facturacionNeta } = dataCalculada;
    
    const tablaExplotacion = [
        { label: "Venta Gastronomía", real: ingresosVenta, ppto: facturacionNeta * ((objetivo.presupuestoVentas || 0) / 100), isGasto: false, detailType: 'ventaGastronomia' },
        { label: "Cesión de Personal", real: ingresosCesionPersonal, ppto: facturacionNeta * ((objetivo.presupuestoCesionPersonal || 0) / 100), isGasto: false },
        { label: "Consumos MP", real: costeEscandallo, ppto: facturacionNeta * ((objetivo.presupuestoGastosMP || 0) / 100), isGasto: true, detailType: 'costeMP' },
        { label: GASTO_LABELS.personalMice, real: costePersonalMice, ppto: facturacionNeta * ((objetivo.presupuestoGastosPersonalMice || 0) / 100), isGasto: true },
        { label: GASTO_LABELS.personalExterno, real: costePersonalEtt, ppto: facturacionNeta * ((objetivo.presupuestoGastosPersonalExterno || 0) / 100), isGasto: true, setter: setCostePersonalEtt },
        { label: "Otros Gastos", real: otrosGastos, ppto: facturacionNeta * ((objetivo.presupuestoOtrosGastos || 0) / 100), isGasto: true },
    ];
    
    const renderCostRow = (row: any, index: number) => {
        const desviacion = row.real - row.ppto;
        const pctSventas = kpis.ingresos > 0 ? row.real / kpis.ingresos : 0;
        return (
            <TooltipProvider key={`${row.label}-${index}`}>
                <TableRow className="hover:bg-muted/50">
                    <TableCell className="p-0 font-medium sticky left-0 bg-background z-10 w-48">
                        <div className="flex items-center gap-2 h-full w-full px-2 py-1">
                            {row.detailType ? (
                                <Link href={`/control-explotacion/cpr/${row.detailType}?from=${dateRange?.from?.toISOString()}&to=${dateRange?.to?.toISOString()}`} className="text-primary hover:underline flex items-center gap-2">
                                    {row.label} <Info size={14}/>
                                </Link>
                            ): row.label}
                        </div>
                    </TableCell>
                    <TableCell className="py-1 px-2 text-right font-mono border-l bg-blue-50/50">{formatCurrency(row.real)}</TableCell>
                    <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-r bg-blue-50/50">{formatPercentage(pctSventas)}</TableCell>
                    
                    <TableCell className="py-1 px-2 text-right font-mono border-l bg-amber-50/50">{formatCurrency(row.ppto)}</TableCell>
                    <TableCell className={cn("py-1 px-2 text-right font-mono border-l", (row.isGasto && desviacion > 0) || (!row.isGasto && desviacion < 0) ? 'text-destructive' : 'text-green-600')}>{formatCurrency(desviacion)}</TableCell>
                    <TableCell className={cn("py-1 px-2 text-right font-mono border-r", (row.isGasto && desviacion > 0) || (!row.isGasto && desviacion < 0) ? 'text-destructive' : 'text-green-600')}>{row.ppto > 0 ? formatPercentage(desviacion / row.ppto) : '-'}</TableCell>
                </TableRow>
            </TooltipProvider>
        )
    };


    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="flex flex-col xl:flex-row gap-4 p-4 justify-between">
                     <div className="flex flex-wrap items-center gap-2">
                         <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-full md:w-[300px] justify-start text-left font-bold text-lg", !dateRange && "text-muted-foreground")}>
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
                     <div className="flex items-center gap-2">
                        <Label className="font-semibold whitespace-nowrap">Objetivos:</Label>
                         <Select onValueChange={(value) => setObjetivoMes(parseISO(`${value}-02`))} value={format(objetivoMes, 'yyyy-MM')}>
                            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {availableObjetivoMonths.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="control-explotacion">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="control-explotacion">Control de Explotación CPR</TabsTrigger>
                    <TabsTrigger value="acumulado-mensual">Acumulado Mensual</TabsTrigger>
                </TabsList>
                <TabsContent value="control-explotacion" className="mt-4">
                    <div className="grid gap-2 grid-cols-3">
                        <KpiCard title="Ingresos Totales" value={formatCurrency(kpis.ingresos)} icon={Euro} className="bg-green-100/60" />
                        <KpiCard title="Gastos Totales" value={formatCurrency(kpis.gastos)} icon={TrendingDown} className="bg-red-100/60"/>
                        <KpiCard title="Resultado Explotación" value={formatCurrency(kpis.resultado)} icon={kpis.resultado >= 0 ? TrendingUp : TrendingDown} className={cn(kpis.resultado >= 0 ? "bg-green-100/60 text-green-800" : "bg-red-100/60 text-red-800")} />
                    </div>
                    
                    <Card className="mt-4">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="p-2 sticky left-0 bg-muted/50 z-10 w-48">Concepto</TableHead>
                                            <TableHead colSpan={2} className="p-2 text-center border-l border-r">REAL</TableHead>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                         <TableHead className="p-2 text-center border-l border-r cursor-help">Objetivos</TableHead>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <div className="p-2 space-y-1 text-xs">
                                                            <p className="font-bold mb-2">Objetivos de Gasto Aplicados ({format(objetivoMes, 'MMMM yyyy', { locale: es })})</p>
                                                            {Object.entries(objetivo).map(([key, value]) => {
                                                                if (key.startsWith('presupuesto')) {
                                                                    const label = key.replace('presupuestoGastos', '').replace('presupuestoVentas', 'Ventas').replace('presupuestoCesionPersonal', 'Cesion Personal');
                                                                    const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
                                                                    return <div key={key} className="flex justify-between gap-4"><span>{formattedLabel}:</span> <span>{formatPercentage(value / 100)}</span></div>
                                                                }
                                                                return null;
                                                            })}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <TableHead colSpan={2} className="p-2 text-center border-l">DESVIACIÓN (REAL vs. OBJ)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                     <TableBody>
                                        <TableRow className="bg-primary/10 hover:bg-primary/10">
                                            <TableCell className="font-bold py-1 px-2">INGRESOS</TableCell>
                                            <TableCell className="text-right font-bold py-1 px-2">{formatCurrency(kpis.ingresos)}</TableCell>
                                            <TableCell className="py-1 px-2"></TableCell>
                                            <TableCell className="text-right font-bold py-1 px-2">{formatCurrency(facturacionNeta * (((objetivo.presupuestoVentas || 0) + (objetivo.presupuestoCesionPersonal || 0)) / 100))}</TableCell>
                                            <TableCell colSpan={2}></TableCell>
                                        </TableRow>
                                        {tablaExplotacion.filter(r => !r.isGasto).map(renderCostRow)}

                                        <TableRow className="bg-destructive/10 hover:bg-destructive/10">
                                            <TableCell className="font-bold py-1 px-2">GASTOS</TableCell>
                                            <TableCell className="text-right font-bold py-1 px-2">{formatCurrency(kpis.gastos)}</TableCell>
                                            <TableCell className="py-1 px-2"></TableCell>
                                            <TableCell className="text-right font-bold py-1 px-2">{formatCurrency(facturacionNeta * (((objetivo.presupuestoGastosMP || 0) + (objetivo.presupuestoGastosPersonalMice || 0) + (objetivo.presupuestoGastosPersonalExterno || 0) + (objetivo.presupuestoOtrosGastos || 0)) / 100))}</TableCell>
                                            <TableCell colSpan={2}></TableCell>
                                        </TableRow>
                                        {tablaExplotacion.filter(r => r.isGasto).map(renderCostRow)}
                                        <TableRow className="bg-primary/20 hover:bg-primary/20 text-base font-bold">
                                            <TableCell className="py-2 px-2">RESULTADO EXPLOTACIÓN</TableCell>
                                            <TableCell className={cn("text-right py-2 px-2", kpis.resultado < 0 ? "text-destructive" : "text-green-600")}>{formatCurrency(kpis.resultado)}</TableCell>
                                            <TableCell colSpan={4}></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="acumulado-mensual" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Acumulado Mensual {getYear(new Date())}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Concepto</TableHead>
                                            {dataAcumulada.map(d => <TableHead key={d.mes} className="text-right capitalize">{d.mes}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="font-bold bg-primary/10">
                                            <TableCell>Ingresos</TableCell>
                                            {dataAcumulada.map(d => <TableCell key={d.mes} className="text-right">{formatCurrency(d.ingresos)}</TableCell>)}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Consumo MMPP</TableCell>
                                            {dataAcumulada.map(d => <TableCell key={d.mes} className="text-right">{formatCurrency(d.consumoMMPP)}</TableCell>)}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Personal MICE</TableCell>
                                            {dataAcumulada.map(d => <TableCell key={d.mes} className="text-right">{formatCurrency(d.personalMICE)}</TableCell>)}
                                        </TableRow>
                                         <TableRow>
                                            <TableCell className="pl-8">Personal ETT's</TableCell>
                                            {dataAcumulada.map(d => <TableCell key={d.mes} className="text-right">{formatCurrency(d.personalETTs)}</TableCell>)}
                                        </TableRow>
                                         <TableRow className="font-semibold bg-muted/40">
                                            <TableCell className="pl-8">Total personal CPR</TableCell>
                                            {dataAcumulada.map(d => <TableCell key={d.mes} className="text-right">{formatCurrency(d.totalPersonalCPR)}</TableCell>)}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="pl-8">Varios</TableCell>
                                            {dataAcumulada.map(d => <TableCell key={d.mes} className="text-right">{formatCurrency(d.varios)}</TableCell>)}
                                        </TableRow>
                                        <TableRow className="font-bold bg-primary/20">
                                            <TableCell>Resultado Mensual CPR</TableCell>
                                            {dataAcumulada.map(d => <TableCell key={d.mes} className={cn("text-right", d.resultado < 0 ? "text-destructive" : "text-green-600")}>{formatCurrency(d.resultado)}</TableCell>)}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


