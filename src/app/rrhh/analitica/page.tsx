
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, isWithinInterval, startOfYear, endOfYear, endOfQuarter, subDays, startOfDay, parseISO, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import type { ServiceOrder, PersonalMiceOrder, PersonalExterno, SolicitudPersonalCPR, CategoriaPersonal, Proveedor, Personal, PersonalExternoDB } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Users, Clock, Euro, TrendingDown, TrendingUp, Calendar as CalendarIcon, Star, Printer, Shuffle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Input } from '@/components/ui/input';

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
    desviacionCoste: number;
    horasTotales: number;
    horasPlanificadas: number;
    desviacionHoras: number;
    numTurnos: number;
    costePorProveedor: { name: string; value: number }[];
    horasPorCategoria: { name: string; value: number }[];
    detalleCompleto: DetalleTrabajador[];
}


export default function AnaliticaRrhhPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [proveedorFilter, setProveedorFilter] = useState('all');
    const [osFilter, setOsFilter] = useState('');

    const [allPersonalMice, setAllPersonalMice] = useState<PersonalMiceOrder[]>([]);
    const [allPersonalExterno, setAllPersonalExterno] = useState<PersonalExterno[]>([]);
    const [allSolicitudesCPR, setAllSolicitudesCPR] = useState<SolicitudPersonalCPR[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [personalInterno, setPersonalInterno] = useState<Personal[]>([]);
    const [personalExternoDB, setPersonalExternoDB] = useState<PersonalExternoDB[]>([]);
    const [tiposPersonal, setTiposPersonal] = useState<CategoriaPersonal[]>([]);

    const [selectedWorkerForModal, setSelectedWorkerForModal] = useState<{ id: string, nombre: string } | null>(null);


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
    
    const calculateHours = (start?: string, end?: string): number => {
        if (!start || !end) return 0;
        try {
            const startTime = new Date(`1970-01-01T${start}:00`);
            const endTime = new Date(`1970-01-01T${end}:00`);
            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 0;
            const diff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            return diff > 0 ? diff : 0;
        } catch (e) {
            return 0;
        }
    }

    const analiticaData: AnaliticaData = useMemo(() => {
        if (!isMounted || !dateRange?.from) return { costeTotal: 0, costePlanificado: 0, desviacionCoste: 0, horasTotales: 0, horasPlanificadas: 0, desviacionHoras: 0, numTurnos: 0, costePorProveedor: [], horasPorCategoria: [], detalleCompleto: [] };

        const rangeStart = startOfDay(dateRange.from);
        const rangeEnd = endOfDay(dateRange.to || dateRange.from);
        
        const costePorProveedor: Record<string, number> = {};
        const horasPorCategoria: Record<string, number> = {};
        const detalleCompleto: DetalleTrabajador[] = [];

        let costeTotal = 0, costePlanificado = 0, horasTotales = 0, horasPlanificadas = 0, numTurnos = 0;
        
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];

        // Personal MICE
        allPersonalMice.forEach(order => {
            const os = allServiceOrders.find((so: ServiceOrder) => so.id === order.osId);
            if (!os || !isWithinInterval(new Date(os.startDate), { start: rangeStart, end: rangeEnd })) return;
            if (proveedorFilter !== 'all') return; // MICE staff is not external
            if (osFilter && !(os.serviceNumber.toLowerCase().includes(osFilter.toLowerCase()) || os.client.toLowerCase().includes(osFilter.toLowerCase()))) return;


            const plannedHours = calculateHours(order.horaEntrada, order.horaSalida);
            const realHours = calculateHours(order.horaEntradaReal, order.horaSalidaReal) || plannedHours;
            const costePlanificadoTurno = plannedHours * order.precioHora;
            const costeRealTurno = realHours * order.precioHora;

            costeTotal += costeRealTurno;
            costePlanificado += costePlanificadoTurno;
            horasTotales += realHours;
            horasPlanificadas += plannedHours;
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
             if (osFilter && !(os.serviceNumber.toLowerCase().includes(osFilter.toLowerCase()) || os.client.toLowerCase().includes(osFilter.toLowerCase()))) return;
            
            pedido.turnos.forEach(turno => {
                const tipoPersonal = tiposPersonalMap.get(turno.proveedorId);
                if (proveedorFilter !== 'all' && tipoPersonal?.proveedorId !== proveedorFilter) return;

                const plannedHours = calculateHours(turno.horaEntrada, turno.horaSalida);
                
                (turno.asignaciones || []).forEach(asig => {
                    numTurnos++;
                    const realHours = calculateHours(asig.horaEntradaReal, asig.horaSalidaReal) || plannedHours;
                    const costeRealTurno = realHours * turno.precioHora;
                    const costePlanificadoTurno = plannedHours * turno.precioHora;

                    costeTotal += costeRealTurno;
                    costePlanificado += costePlanificadoTurno;
                    horasTotales += realHours;
                    horasPlanificadas += plannedHours;
                    
                    const prov = proveedores.find(p => p.id === tipoPersonal?.proveedorId);
                    if(prov) costePorProveedor[prov.nombreComercial] = (costePorProveedor[prov.nombreComercial] || 0) + costeRealTurno;
                    
                    horasPorCategoria[turno.categoria] = (horasPorCategoria[turno.categoria] || 0) + realHours;
                    
                    detalleCompleto.push({
                         id: `${turno.id}-${asig.id}`, trabajadorId: asig.id, nombre: asig.nombre, esExterno: true, proveedor: prov?.nombreComercial || '', osNumber: os.serviceNumber, osId: os.id,
                        fecha: turno.fecha, categoria: turno.categoria, horarioPlanificado: `${turno.horaEntrada}-${turno.horaSalida}`, horarioReal: `${asig.horaEntradaReal}-${asig.horaSalidaReal}`,
                        horasPlanificadas: plannedHours, horasReales: realHours, costePlanificado: costePlanificadoTurno, costeReal: costeRealTurno, rating: asig.rating, comentarios: asig.comentariosMice
                    });
                });
            });
        });

        // Solicitudes CPR
        allSolicitudesCPR.forEach(solicitud => {
            if (!isWithinInterval(new Date(solicitud.fechaServicio), { start: rangeStart, end: rangeEnd })) return;
            if (solicitud.estado !== 'Cerrado') return;
            if (osFilter && !'cpr'.includes(osFilter.toLowerCase())) return;
            
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
                horasPlanificadas += plannedHours;
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
            desviacionCoste: costeTotal - costePlanificado,
            horasTotales,
            horasPlanificadas,
            desviacionHoras: horasTotales - horasPlanificadas,
            numTurnos,
            costePorProveedor: Object.entries(costePorProveedor).map(([name, value]) => ({ name, value })),
            horasPorCategoria: Object.entries(horasPorCategoria).map(([name, value]) => ({ name, value })),
            detalleCompleto: detalleCompleto.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
        };

    }, [isMounted, dateRange, proveedorFilter, osFilter, allPersonalMice, allPersonalExterno, allSolicitudesCPR, proveedores, personalInterno, personalExternoDB, tiposPersonal]);
    
    const { workerPerformanceSummary, performanceTotals } = useMemo(() => {
        if (!analiticaData.detalleCompleto) return { workerPerformanceSummary: [], performanceTotals: { totalJornadas: 0, totalHorasReales: 0, totalCosteReal: 0, mediaValoracion: 0 }};

        const summary = new Map<string, { totalJornadas: number; totalHoras: number; totalCoste: number; ratings: number[]; nombre: string, proveedor: string; }>();

        analiticaData.detalleCompleto.forEach(turno => {
            if (!turno.trabajadorId || !turno.esExterno) return;

            let workerData = summary.get(turno.trabajadorId);
            if (!workerData) {
                workerData = { totalJornadas: 0, totalHoras: 0, totalCoste: 0, ratings: [], nombre: turno.nombre, proveedor: turno.proveedor };
                summary.set(turno.trabajadorId, workerData);
            }

            workerData.totalJornadas += 1;
            workerData.totalHoras += turno.horasReales;
            workerData.totalCoste += turno.costeReal;
            if (turno.rating) {
                workerData.ratings.push(turno.rating);
            }
        });

        const performanceArray = Array.from(summary.entries()).map(([id, worker]) => {
            const avgRating = worker.ratings.length > 0 ? worker.ratings.reduce((a, b) => a + b, 0) / worker.ratings.length : 0;
            return {
                id,
                nombre: worker.nombre,
                proveedor: worker.proveedor,
                totalJornadas: worker.totalJornadas,
                totalHoras: worker.totalHoras,
                totalCoste: worker.totalCoste,
                avgRating,
            };
        }).sort((a, b) => b.totalJornadas - a.totalJornadas);
        
        const totals = performanceArray.reduce((acc, worker) => {
            acc.totalJornadas += worker.totalJornadas;
            acc.totalHorasReales += worker.totalHoras;
            acc.totalCosteReal += worker.totalCoste;
            return acc;
        }, { totalJornadas: 0, totalHorasReales: 0, totalCosteReal: 0 });

        const allRatings = performanceArray.flatMap(w => w.avgRating > 0 ? w.avgRating : []);
        const mediaValoracion = allRatings.length > 0 ? allRatings.reduce((a,b) => a+b, 0) / allRatings.length : 0;


        return { workerPerformanceSummary: performanceArray, performanceTotals: { ...totals, mediaValoracion } };
    }, [analiticaData.detalleCompleto]);
    
    const selectedWorkerDetails = useMemo(() => {
        if (!selectedWorkerForModal) return null;
        return {
            ...selectedWorkerForModal,
            turnos: analiticaData.detalleCompleto.filter(t => t.trabajadorId === selectedWorkerForModal.id)
        }
    }, [selectedWorkerForModal, analiticaData.detalleCompleto]);
    
    const handlePrintWorkerHistory = () => {
        if (!selectedWorkerDetails || !selectedWorkerDetails.nombre) return;

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`Historial de Servicios: ${selectedWorkerDetails.nombre}`, 14, 22);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Periodo: ${dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : ''} - ${dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy') : ''}`, 14, 30);
        
        autoTable(doc, {
            startY: 40,
            head: [['Fecha', 'OS/Centro', 'Horario Real', 'Horas', 'Coste', 'Valoración', 'Comentarios']],
            body: selectedWorkerDetails.turnos.map(t => [
                format(new Date(t.fecha), 'dd/MM/yy'),
                t.osNumber,
                t.horarioReal || '-',
                formatNumber(t.horasReales, 2) + 'h',
                formatCurrency(t.costeReal),
                '⭐'.repeat(t.rating || 0),
                t.comentarios || '-'
            ]),
            headStyles: { fillColor: [34, 197, 94] },
            columnStyles: { 6: { cellWidth: 'auto' }}
        });

        doc.save(`Historial_${selectedWorkerDetails.nombre.replace(/\s/g, '_')}.pdf`);
    };

    const setDatePreset = (preset: 'month' | 'year') => {
        const now = new Date();
        let fromDate, toDate;
        switch(preset) {
            case 'month': fromDate = startOfMonth(now); toDate = endOfMonth(now); break;
            case 'year': fromDate = startOfYear(now); toDate = endOfYear(now); break;
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
                         <Input
                            placeholder="Buscar por OS / Centro..."
                            value={osFilter}
                            onChange={(e) => setOsFilter(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>
            <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-7 mb-6">
                <KpiCard title="Coste Total Personal" value={formatCurrency(analiticaData.costeTotal)} icon={Euro} description="Suma de costes reales en el periodo." />
                <KpiCard title="Coste / Hora Medio" value={formatCurrency(analiticaData.horasTotales > 0 ? analiticaData.costeTotal / analiticaData.horasTotales : 0)} icon={Shuffle} description="Coste real total / Horas reales totales." />
                <KpiCard title="Horas Totales Trabajadas" value={formatNumber(analiticaData.horasTotales, 2)} icon={Clock} description="Suma de todas las horas reales trabajadas."/>
                <KpiCard title="Nº Total de Turnos" value={formatNumber(analiticaData.numTurnos, 0)} icon={Users} description="Número total de jornadas individuales."/>
                <KpiCard title="Desviación de Coste" value={formatCurrency(analiticaData.desviacionCoste)} icon={analiticaData.desviacionCoste > 0 ? TrendingDown : TrendingUp} className={analiticaData.desviacionCoste > 0 ? 'text-destructive' : 'text-green-600'} description="Coste Real vs. Planificado."/>
                <KpiCard title="Desviación de Horas" value={formatNumber(analiticaData.desviacionHoras, 2) + 'h'} icon={analiticaData.desviacionHoras > 0 ? TrendingDown : TrendingUp} className={analiticaData.desviacionHoras > 0 ? 'text-destructive' : 'text-green-600'} description="Horas Reales vs. Planificadas."/>
                <KpiCard title="Valoración Media" value={formatNumber(performanceTotals.mediaValoracion, 2)} icon={Star} description="Valoración media de todo el personal externo."/>
            </div>
            
            <Tabs defaultValue="resumen">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="resumen">Resumen Gráfico</TabsTrigger>
                    <TabsTrigger value="detalle">Detalle por Turno</TabsTrigger>
                    <TabsTrigger value="valoracion">Rendimiento de Empleados</TabsTrigger>
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
                        <CardHeader><CardTitle>Detalle por Turno</CardTitle></CardHeader>
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
                            <CardHeader>
                                <CardTitle>Resumen Global del Personal Externo</CardTitle>
                                <CardDescription>Totales para todos los trabajadores externos en el periodo seleccionado.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                <TableBody>
                                <TableRow>
                                    <TableHead className="font-bold">Total Jornadas</TableHead>
                                    <TableCell>{performanceTotals.totalJornadas}</TableCell>
                                    <TableHead className="font-bold">Total Horas Reales</TableHead>
                                    <TableCell>{formatNumber(performanceTotals.totalHorasReales, 2)}h</TableCell>
                                    <TableHead className="font-bold">Coste Real Total</TableHead>
                                    <TableCell>{formatCurrency(performanceTotals.totalCosteReal)}</TableCell>
                                    <TableHead className="font-bold">Valoración Media</TableHead>
                                    <TableCell className="flex items-center gap-2">
                                        <StarRating rating={performanceTotals.mediaValoracion} /> ({formatNumber(performanceTotals.mediaValoracion, 2)})
                                    </TableCell>
                                </TableRow>
                                </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Resumen de Rendimiento por Trabajador Externo</CardTitle></CardHeader>
                             <CardContent>
                                 <div className="border rounded-lg max-h-96 overflow-y-auto">
                                     <Table>
                                         <TableHeader>
                                             <TableRow>
                                                 <TableHead>Nombre</TableHead>
                                                 <TableHead>ETT</TableHead>
                                                 <TableHead className="text-center">Jornadas Realizadas</TableHead>
                                                 <TableHead>Valoración Media</TableHead>
                                             </TableRow>
                                         </TableHeader>
                                         <TableBody>
                                             {workerPerformanceSummary.map(w => (
                                                 <TableRow key={w.id} onClick={() => setSelectedWorkerForModal({ id: w.id, nombre: w.nombre })} className="cursor-pointer hover:bg-muted/50">
                                                     <TableCell className="font-semibold">{w.nombre}</TableCell>
                                                     <TableCell><Badge variant="secondary">{w.proveedor}</Badge></TableCell>
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
                                                            <StarRating rating={t.rating || 0} />
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
             <Dialog open={!!selectedWorkerForModal} onOpenChange={() => setSelectedWorkerForModal(null)}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader className="flex-row justify-between items-center">
                        <DialogTitle>Historial de Servicios: {selectedWorkerForModal?.nombre}</DialogTitle>
                         <Button variant="outline" size="sm" onClick={handlePrintWorkerHistory}>
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir Historial
                        </Button>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>OS / Centro</TableHead>
                                    <TableHead>Horario Real</TableHead>
                                    <TableHead>Horas</TableHead>
                                    <TableHead>Coste</TableHead>
                                    <TableHead>Valoración</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedWorkerDetails?.turnos.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell>{format(new Date(t.fecha), 'dd/MM/yy')}</TableCell>
                                        <TableCell><Badge variant="outline">{t.osNumber}</Badge></TableCell>
                                        <TableCell>{t.horarioReal}</TableCell>
                                        <TableCell>{formatNumber(t.horasReales, 2)}h</TableCell>
                                        <TableCell>{formatCurrency(t.costeReal)}</TableCell>
                                        <TableCell><StarRating rating={t.rating || 0} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </main>
    );
}
