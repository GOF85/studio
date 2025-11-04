
'use client';

import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, isWithinInterval, startOfYear, endOfYear, endOfQuarter, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import type { ServiceOrder, PersonalMiceOrder, PersonalExterno, SolicitudPersonalCPR, CategoriaPersonal, Proveedor, Personal } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatNumber, calculateHours } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Users, Clock, Euro, TrendingDown, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';


type AnaliticaData = {
    costeTotal: number;
    costePlanificado: number;
    desviacion: number;
    horasTotales: number;
    numTurnos: number;
    costePorProveedor: { name: string; value: number }[];
    horasPorCategoria: { name: string; value: number }[];
    detallePorTrabajador: { id: string; nombre: string; esExterno: boolean; horas: number; coste: number }[];
}

export default function AnaliticaRrhhPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [proveedorFilter, setProveedorFilter] = useState('all');

    const [allPersonalMice, setAllPersonalMice] = useState<PersonalMiceOrder[]>([]);
    const [allPersonalExterno, setAllPersonalExterno] = useState<PersonalExterno[]>([]);
    const [allSolicitudesCPR, setAllSolicitudesCPR] = useState<SolicitudPersonalCPR[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [personalInterno, setPersonalInterno] = useState<Personal[]>([]);

    useEffect(() => {
        setAllPersonalMice(JSON.parse(localStorage.getItem('personalMiceOrders') || '[]'));
        setAllPersonalExterno(JSON.parse(localStorage.getItem('personalExterno') || '[]'));
        setAllSolicitudesCPR(JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]'));
        setProveedores(JSON.parse(localStorage.getItem('proveedores') || '[]'));
        setPersonalInterno(JSON.parse(localStorage.getItem('personal') || '[]'));
        setIsMounted(true);
    }, []);

    const uniqueProveedores = useMemo(() => {
        const ettIds = new Set(allPersonalExterno.flatMap(p => p.turnos.map(t => t.proveedorId)));
        return proveedores.filter(p => ettIds.has(p.id) && p.tipos.includes('Personal'));
    }, [allPersonalExterno, proveedores]);

    const analiticaData: AnaliticaData = useMemo(() => {
        if (!isMounted || !dateRange?.from) return { costeTotal: 0, costePlanificado: 0, desviacion: 0, horasTotales: 0, numTurnos: 0, costePorProveedor: [], horasPorCategoria: [], detallePorTrabajador: [] };

        const rangeStart = startOfDay(dateRange.from);
        const rangeEnd = endOfDay(dateRange.to || dateRange.from);

        const costePorProveedor: Record<string, number> = {};
        const horasPorCategoria: Record<string, number> = {};
        const detallePorTrabajador: Record<string, { id: string; nombre: string; esExterno: boolean; horas: number; coste: number }> = {};
        let costeTotal = 0, costePlanificado = 0, horasTotales = 0, numTurnos = 0;

        // Personal MICE
        allPersonalMice.forEach(order => {
            const os = JSON.parse(localStorage.getItem('serviceOrders') || '[]').find((so: ServiceOrder) => so.id === order.osId);
            if (!os || !isWithinInterval(new Date(os.startDate), { start: rangeStart, end: rangeEnd })) return;

            const plannedHours = calculateHours(order.horaEntrada, order.horaSalida);
            const realHours = calculateHours(order.horaEntradaReal, order.horaSalidaReal) || plannedHours;
            const costePlanificadoTurno = plannedHours * order.precioHora;
            const costeRealTurno = realHours * order.precioHora;

            costeTotal += costeRealTurno;
            costePlanificado += costePlanificadoTurno;
            horasTotales += realHours;
            numTurnos++;
            
            const trabajador = personalInterno.find(p => p.nombre === order.nombre);
            if(trabajador) {
                if(!detallePorTrabajador[trabajador.id]) detallePorTrabajador[trabajador.id] = { id: trabajador.id, nombre: `${trabajador.nombre} ${trabajador.apellidos}`, esExterno: false, horas: 0, coste: 0 };
                detallePorTrabajador[trabajador.id].horas += realHours;
                detallePorTrabajador[trabajador.id].coste += costeRealTurno;
            }
        });

        // Personal Externo Eventos
        allPersonalExterno.forEach(pedido => {
             const os = JSON.parse(localStorage.getItem('serviceOrders') || '[]').find((so: ServiceOrder) => so.id === pedido.osId);
            if (!os || !isWithinInterval(new Date(os.startDate), { start: rangeStart, end: rangeEnd })) return;
            
            pedido.turnos.forEach(turno => {
                if (proveedorFilter !== 'all' && turno.proveedorId !== proveedorFilter) return;

                const plannedHours = calculateHours(turno.horaEntrada, turno.horaSalida) * (turno.asignaciones?.length || 1);
                const costePlanificadoTurno = plannedHours * turno.precioHora;
                costePlanificado += costePlanificadoTurno;
                
                (turno.asignaciones || []).forEach(asig => {
                    const realHours = calculateHours(asig.horaEntradaReal, asig.horaSalidaReal) || calculateHours(turno.horaEntrada, turno.horaSalida);
                    const costeRealTurno = realHours * turno.precioHora;
                    costeTotal += costeRealTurno;
                    horasTotales += realHours;
                    
                    const prov = proveedores.find(p => p.id === turno.proveedorId);
                    if(prov) costePorProveedor[prov.nombreComercial] = (costePorProveedor[prov.nombreComercial] || 0) + costeRealTurno;
                    
                    horasPorCategoria[turno.categoria] = (horasPorCategoria[turno.categoria] || 0) + realHours;

                    if(!detallePorTrabajador[asig.id]) detallePorTrabajador[asig.id] = { id: asig.id, nombre: asig.nombre, esExterno: true, horas: 0, coste: 0 };
                    detallePorTrabajador[asig.id].horas += realHours;
                    detallePorTrabajador[asig.id].coste += costeRealTurno;
                });
                numTurnos += (turno.asignaciones || []).length || 1;
            });
        });

        // Solicitudes CPR
        allSolicitudesCPR.forEach(solicitud => {
            if (!isWithinInterval(new Date(solicitud.fechaServicio), { start: rangeStart, end: rangeEnd })) return;
            if (solicitud.estado !== 'Cerrado') return;
             if (proveedorFilter !== 'all' && solicitud.proveedorId !== proveedorFilter) return;

            const coste = solicitud.costeImputado || 0;
            const horas = calculateHours(solicitud.horaInicio, solicitud.horaFin) * (solicitud.personalAsignado?.length || 0);

            costeTotal += coste;
            costePlanificado += coste; // No hay distinción en CPR de momento
            horasTotales += horas;
            numTurnos += (solicitud.personalAsignado?.length || 0);
            horasPorCategoria[solicitud.categoria] = (horasPorCategoria[solicitud.categoria] || 0) + horas;
            
            (solicitud.personalAsignado || []).forEach(p => {
                if(!detallePorTrabajador[p.idPersonal]) detallePorTrabajador[p.idPersonal] = { id: p.idPersonal, nombre: p.nombre, esExterno: false, horas: 0, coste: 0 };
                const costeIndividual = coste / (solicitud.personalAsignado?.length || 1);
                detallePorTrabajador[p.idPersonal].horas += horas / (solicitud.personalAsignado?.length || 1);
                detallePorTrabajador[p.idPersonal].coste += costeIndividual;
            })
        });

        return {
            costeTotal,
            costePlanificado,
            desviacion: costeTotal - costePlanificado,
            horasTotales,
            numTurnos,
            costePorProveedor: Object.entries(costePorProveedor).map(([name, value]) => ({ name, value })),
            horasPorCategoria: Object.entries(horasPorCategoria).map(([name, value]) => ({ name, value })),
            detallePorTrabajador: Object.values(detallePorTrabajador).sort((a,b) => b.coste - a.coste),
        };

    }, [isMounted, dateRange, proveedorFilter, allPersonalMice, allPersonalExterno, allSolicitudesCPR, proveedores, personalInterno]);

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
    };

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Analítica de RRHH..." />;
    }

    return (
        <main>
            <Card className="mb-6">
                <CardContent className="p-4 flex flex-col xl:flex-row gap-4">
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
                     <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                         <Select value={proveedorFilter} onValueChange={setProveedorFilter}>
                            <SelectTrigger><div className="flex items-center gap-2 text-xs truncate"><Users /> <SelectValue /></div></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Proveedores ETT</SelectItem>
                                {uniqueProveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreComercial}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
                <KpiCard title="Coste Total Personal" value={formatCurrency(analiticaData.costeTotal)} icon={Euro} description="Suma de costes reales en el periodo." />
                <KpiCard title="Coste Total Planificado" value={formatCurrency(analiticaData.costePlanificado)} icon={Euro} />
                <KpiCard title="Desviación de Coste" value={formatCurrency(analiticaData.desviacion)} icon={analiticaData.desviacion > 0 ? TrendingDown : TrendingUp} description="Real vs. Planificado" className={analiticaData.desviacion > 0 ? 'text-destructive' : 'text-green-600'} />
                <KpiCard title="Horas Totales Trabajadas" value={formatNumber(analiticaData.horasTotales, 2)} icon={Clock} />
                <KpiCard title="Nº Total de Turnos" value={formatNumber(analiticaData.numTurnos, 0)} icon={Users} />
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
                <Card>
                    <CardHeader><CardTitle>Coste Real por Proveedor ETT</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                             <BarChart data={analiticaData.costePorProveedor} layout="vertical" margin={{ left: 100 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                                <YAxis type="category" dataKey="name" width={100} stroke="#888888" fontSize={12} />
                                <Tooltip formatter={(value:any) => formatCurrency(value)} />
                                <Bar dataKey="value" name="Coste" fill="hsl(var(--primary))" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Horas Reales por Categoría Profesional</CardTitle></CardHeader>
                    <CardContent>
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analiticaData.horasPorCategoria} layout="vertical" margin={{ left: 100 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tickFormatter={(value) => `${value}h`} />
                                <YAxis type="category" dataKey="name" width={100} stroke="#888888" fontSize={12} />
                                <Tooltip formatter={(value:any) => `${formatNumber(value, 2)} horas`} />
                                <Bar dataKey="value" name="Horas" fill="hsl(var(--primary))" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader><CardTitle>Detalle por Trabajador</CardTitle></CardHeader>
                <CardContent>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">Horas Trabajadas</TableHead>
                                    <TableHead className="text-right">Coste Imputado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analiticaData.detallePorTrabajador.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell className="font-semibold">{t.nombre}</TableCell>
                                        <TableCell>
                                            <Badge variant={t.esExterno ? 'outline' : 'secondary'}>
                                                {t.esExterno ? 'Externo' : 'MICE'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(t.horas, 2)}h</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(t.coste)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

        </main>
    );
}
