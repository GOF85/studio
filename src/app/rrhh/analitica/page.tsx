'use client';

import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, isWithinInterval, startOfYear, endOfYear, endOfQuarter, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import type { ServiceOrder, PersonalMiceOrder, PersonalExterno, SolicitudPersonalCPR, CategoriaPersonal, Proveedor, Personal, PersonalExternoDB } from '@/types';
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
import { Users, Clock, Euro, TrendingDown, TrendingUp, Calendar as CalendarIcon, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


type DetalleTrabajador = {
    id: string; // Composite key
    trabajadorId: string;
    nombre: string;
    esExterno: boolean;
    proveedor: string;
    osNumber: string;
    osId: string;
    fecha: string;
    categoria: string;
    horarioPlanificado: string;
    horarioReal: string;
    horasPlanificadas: number;
    horasReales: number;
    costePlanificado: number;
    costeReal: number;
    rating?: number;
    comentarios?: string;
};

type AnaliticaData = {
    costeTotal: number;
    costePlanificado: number;
    desviacion: number;
    horasTotales: number;
    numTurnos: number;
    costePorProveedor: { name: string; value: number }[];
    horasPorCategoria: { name: string; value: number }[];
    detalleCompleto: DetalleTrabajador[];
}

const StarRating = ({ rating }: { rating: number }) => {
    return (
        <div className="flex">
            {[...Array(5)].map((_, i) => (
                <Star
                    key={i}
                    className={cn(
                        "h-5 w-5",
                        i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-300"
                    )}
                />
            ))}
        </div>
    );
};

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
    const [personalExternoDB, setPersonalExternoDB] = useState<PersonalExternoDB[]>([]);
    const [tiposPersonal, setTiposPersonal] = useState<CategoriaPersonal[]>([]);


    useEffect(() => {
        setAllPersonalMice(JSON.parse(localStorage.getItem('personalMiceOrders') || '[]'));
        setAllPersonalExterno(JSON.parse(localStorage.getItem('personalExterno') || '[]'));
        setAllSolicitudesCPR(JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]'));
        setProveedores(JSON.parse(localStorage.getItem('proveedores') || '[]'));
        setPersonalInterno(JSON.parse(localStorage.getItem('personal') || '[]'));
        setPersonalExternoDB(JSON.parse(localStorage.getItem('personalExternoDB') || '[]'));
        setTiposPersonal(JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[]);
        setIsMounted(true);
    }, []);

    const uniqueProveedores = useMemo(() => {
        const ettIds = new Set(allPersonalExterno.flatMap(p => p.turnos.map(t => t.proveedorId)));
        tiposPersonal.forEach(tp => ettIds.add(tp.proveedorId));
        return proveedores.filter(p => ettIds.has(p.id) && p.tipos.includes('Personal'));
    }, [allPersonalExterno, proveedores, tiposPersonal]);

    const analiticaData: AnaliticaData = useMemo(() => {
        if (!isMounted || !dateRange?.from) return { costeTotal: 0, costePlanificado: 0, desviacion: 0, horasTotales: 0, numTurnos: 0, costePorProveedor: [], horasPorCategoria: [], detalleCompleto: [] };

        const rangeStart = startOfDay(dateRange.from);
        const rangeEnd = endOfDay(dateRange.to || dateRange.from);
        
        const costePorProveedor: Record<string, number> = {};
        const horasPorCategoria: Record<string, number> = {};
        const detalleCompleto: DetalleTrabajador[] = [];

        let costeTotal = 0, costePlanificado = 0, horasTotales = 0, numTurnos = 0;
        
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];


        // Personal MICE
        allPersonalMice.forEach(order => {
            const os = allServiceOrders.find((so: ServiceOrder) => so.id === order.osId);
            if (!os || !isWithinInterval(new Date(os.startDate), { start: rangeStart, end: rangeEnd })) return;
            if (proveedorFilter !== 'all') return;

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
                detalleCompleto.push({
                    id: `${order.id}-mice`, trabajadorId: trabajador.id, nombre: `${trabajador.nombre} ${trabajador.apellidos}`, esExterno: false, proveedor: 'MICE', osNumber: os.serviceNumber, osId: os.id,
                    fecha: os.startDate, categoria: trabajador.categoria, horarioPlanificado: `${order.horaEntrada}-${order.horaSalida}`, horarioReal: `${order.horaEntradaReal}-${order.horaSalidaReal}`,
                    horasPlanificadas: plannedHours, horasReales: realHours, costePlanificado: costePlanificadoTurno, costeReal: costeRealTurno
                });
            }
        });
        
        const tiposPersonalMap = new Map((tiposPersonal || []).map(t => [t.id, t]));


        // Personal Externo Eventos
        allPersonalExterno.forEach(pedido => {
            const os = allServiceOrders.find((so: ServiceOrder) => so.id === pedido.osId);
            if (!os || !isWithinInterval(new Date(os.startDate), { start: rangeStart, end: rangeEnd })) return;
            
            pedido.turnos.forEach(turno => {
                const tipoPersonal = tiposPersonalMap.get(turno.proveedorId);
                if (proveedorFilter !== 'all' && tipoPersonal?.proveedorId !== proveedorFilter) return;

                const plannedHours = calculateHours(turno.horaEntrada, turno.horaSalida);
                const quantity = (turno.asignaciones || []).length > 0 ? turno.asignaciones.length : 1;
                const costePlanificadoTurno = plannedHours * turno.precioHora * quantity;
                costePlanificado += costePlanificadoTurno;
                
                (turno.asignaciones || []).forEach(asig => {
                    numTurnos++;
                    const realHours = calculateHours(asig.horaEntradaReal, asig.horaSalidaReal) || plannedHours;
                    const costeRealTurno = realHours * turno.precioHora;
                    costeTotal += costeRealTurno;
                    horasTotales += realHours;
                    
                    const prov = proveedores.find(p => p.id === tipoPersonal?.proveedorId);
                    if(prov) costePorProveedor[prov.nombreComercial] = (costePorProveedor[prov.nombreComercial] || 0) + costeRealTurno;
                    
                    horasPorCategoria[turno.categoria] = (horasPorCategoria[turno.categoria] || 0) + realHours;
                    
                    detalleCompleto.push({
                         id: `${turno.id}-${asig.id}`, trabajadorId: asig.id, nombre: asig.nombre, esExterno: true, proveedor: prov?.nombreComercial || '', osNumber: os.serviceNumber, osId: os.id,
                        fecha: turno.fecha, categoria: turno.categoria, horarioPlanificado: `${turno.horaEntrada}-${turno.horaSalida}`, horarioReal: `${asig.horaEntradaReal}-${asig.horaSalidaReal}`,
                        horasPlanificadas: plannedHours, horasReales: realHours, costePlanificado: plannedHours * turno.precioHora, costeReal: costeRealTurno, rating: asig.rating, comentarios: asig.comentariosMice
                    });
                });
            });
        });

        // Solicitudes CPR
        allSolicitudesCPR.forEach(solicitud => {
            if (!isWithinInterval(new Date(solicitud.fechaServicio), { start: rangeStart, end: rangeEnd })) return;
            if (solicitud.estado !== 'Cerrado') return;
            
            const tipoPersonal = tiposPersonalMap.get(solicitud.proveedorId || '');
            if (proveedorFilter !== 'all' && tipoPersonal?.proveedorId !== proveedorFilter) return;

            const plannedHours = calculateHours(solicitud.horaInicio, solicitud.horaFin);
            const costePlanificadoTurno = plannedHours * (tipoPersonal?.precioHora || 0);

            (solicitud.personalAsignado || []).forEach(asig => {
                numTurnos++;
                const realHours = calculateHours(asig.horaEntradaReal, asig.horaSalidaReal) || plannedHours;
                const costeRealTurno = realHours * (tipoPersonal?.precioHora || 0);
                
                costeTotal += costeRealTurno;
                costePlanificado += costePlanificadoTurno;
                horasTotales += realHours;
                horasPorCategoria[solicitud.categoria] = (horasPorCategoria[solicitud.categoria] || 0) + realHours;
                
                const prov = proveedores.find(p => p.id === tipoPersonal?.proveedorId);
                if(prov) costePorProveedor[prov.nombreComercial] = (costePorProveedor[prov.nombreComercial] || 0) + costeRealTurno;
                
                detalleCompleto.push({
                     id: `${solicitud.id}-${asig.idPersonal}`, trabajadorId: asig.idPersonal, nombre: asig.nombre, esExterno: true, proveedor: prov?.nombreComercial || 'MICE', osNumber: 'CPR', osId: 'CPR',
                    fecha: solicitud.fechaServicio, categoria: solicitud.categoria, horarioPlanificado: `${solicitud.horaInicio}-${solicitud.horaFin}`, horarioReal: `${asig.horaEntradaReal}-${asig.horaSalidaReal}`,
                    horasPlanificadas: plannedHours, horasReales: realHours, costePlanificado: costePlanificadoTurno, costeReal: costeRealTurno, rating: asig.rating, comentarios: asig.comentariosMice
                });
            });
        });

        return {
            costeTotal,
            costePlanificado,
            desviacion: costeTotal - costePlanificado,
            horasTotales,
            numTurnos,
            costePorProveedor: Object.entries(costePorProveedor).map(([name, value]) => ({ name, value })),
            horasPorCategoria: Object.entries(horasPorCategoria).map(([name, value]) => ({ name, value })),
            detalleCompleto: detalleCompleto.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
        };

    }, [isMounted, dateRange, proveedorFilter, allPersonalMice, allPersonalExterno, allSolicitudesCPR, proveedores, personalInterno, personalExternoDB, tiposPersonal]);
    
    const workerPerformanceSummary = useMemo(() => {
        if (!analiticaData.detalleCompleto) return [];

        const summary = new Map<string, { totalJornadas: number; ratings: number[]; nombre: string }>();

        analiticaData.detalleCompleto.forEach(turno => {
            if (!turno.trabajadorId) return;

            let workerData = summary.get(turno.trabajadorId);
            if (!workerData) {
                workerData = { totalJornadas: 0, ratings: [], nombre: turno.nombre };
                summary.set(turno.trabajadorId, workerData);
            }

            workerData.totalJornadas += 1;
            if (turno.rating) {
                workerData.ratings.push(turno.rating);
            }
        });

        return Array.from(summary.values()).map(worker => {
            const avgRating = worker.ratings.length > 0 ? worker.ratings.reduce((a, b) => a + b, 0) / worker.ratings.length : 0;
            return {
                nombre: worker.nombre,
                totalJornadas: worker.totalJornadas,
                avgRating,
            };
        }).sort((a, b) => b.avgRating - a.avgRating);
    }, [analiticaData.detalleCompleto]);


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
            
            <Tabs defaultValue="resumen">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="resumen">Resumen Gráfico</TabsTrigger>
                    <TabsTrigger value="detalle">Detalle por Trabajador</TabsTrigger>
                    <TabsTrigger value="valoracion">Valoración de Empleados</TabsTrigger>
                </TabsList>
                <TabsContent value="resumen">
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
                </TabsContent>
                 <TabsContent value="detalle">
                     <Card>
                        <CardHeader><CardTitle>Detalle por Trabajador</CardTitle></CardHeader>
                        <CardContent>
                            <div className="border rounded-lg max-h-[60vh] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>OS / Centro</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Horario Plan.</TableHead>
                                            <TableHead>Horario Real</TableHead>
                                            <TableHead className="text-right">H. Plan.</TableHead>
                                            <TableHead className="text-right">H. Reales</TableHead>
                                            <TableHead className="text-right">Coste Plan.</TableHead>
                                            <TableHead className="text-right">Coste Real</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analiticaData.detalleCompleto.map(t => {
                                            const hasDeviation = Math.abs(t.horasReales - t.horasPlanificadas) > 0.1;
                                            return (
                                            <TableRow key={t.id} className={cn(hasDeviation && "bg-amber-50")}>
                                                <TableCell className="font-semibold">{t.nombre}</TableCell>
                                                <TableCell>
                                                    <Badge variant={t.esExterno ? 'outline' : 'secondary'}>
                                                        {t.proveedor}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell><Badge variant="outline">{t.osNumber}</Badge></TableCell>
                                                <TableCell>{format(new Date(t.fecha), 'dd/MM/yy')}</TableCell>
                                                <TableCell>{t.horarioPlanificado}</TableCell>
                                                <TableCell className={cn(hasDeviation && "font-bold text-amber-700")}>{t.horarioReal || '-'}</TableCell>
                                                <TableCell className="text-right font-mono">{formatNumber(t.horasPlanificadas, 2)}h</TableCell>
                                                <TableCell className="text-right font-mono">{formatNumber(t.horasReales, 2)}h</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(t.costePlanificado)}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(t.costeReal)}</TableCell>
                                            </TableRow>
                                        )})}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                 </TabsContent>
                 <TabsContent value="valoracion">
                    <div className="space-y-6">
                        <Card>
                             <CardHeader><CardTitle>Resumen de Rendimiento de Personal Externo</CardTitle></CardHeader>
                             <CardContent>
                                 <div className="border rounded-lg max-h-96 overflow-y-auto">
                                     <Table>
                                         <TableHeader>
                                             <TableRow>
                                                 <TableHead>Nombre</TableHead>
                                                 <TableHead className="text-center">Jornadas Realizadas</TableHead>
                                                 <TableHead>Valoración Media</TableHead>
                                             </TableRow>
                                         </TableHeader>
                                         <TableBody>
                                             {workerPerformanceSummary.map(w => (
                                                 <TableRow key={w.nombre}>
                                                     <TableCell className="font-semibold">{w.nombre}</TableCell>
                                                     <TableCell className="text-center">{w.totalJornadas}</TableCell>
                                                     <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <StarRating rating={w.avgRating} />
                                                            <span className="text-muted-foreground text-sm">({formatNumber(w.avgRating, 2)})</span>
                                                        </div>
                                                     </TableCell>
                                                 </TableRow>
                                             ))}
                                         </TableBody>
                                     </Table>
                                 </div>
                             </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Detalle de Valoraciones</CardTitle></CardHeader>
                            <CardContent>
                                <div className="border rounded-lg max-h-[60vh] overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nombre</TableHead>
                                                <TableHead>OS / Centro</TableHead>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead className="text-center">Valoración</TableHead>
                                                <TableHead>Comentarios</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {analiticaData.detalleCompleto.filter(t => t.rating).map(t => (
                                                <TableRow key={t.id}>
                                                    <TableCell className="font-semibold">{t.nombre}</TableCell>
                                                    <TableCell><Badge variant="outline">{t.osNumber}</Badge></TableCell>
                                                    <TableCell>{format(new Date(t.fecha), 'dd/MM/yy')}</TableCell>
                                                    <TableCell className="text-center font-bold text-lg text-amber-500">
                                                        <div className="flex justify-center">
                                                            {'⭐'.repeat(t.rating || 0)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">{t.comentarios}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                 </TabsContent>
            </Tabs>
        </main>
    );
}
