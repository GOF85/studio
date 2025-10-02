'use client';

import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { format, formatDistance, parseISO, startOfToday, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart3, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';
import type { OrdenFabricacion } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

type OfConTiempos = OrdenFabricacion & {
    tiempoAsignacion?: string;
    tiempoProduccion?: string;
};

type DatosResponsable = {
    nombre: string;
    ofs: OfConTiempos[];
    incidencias: OrdenFabricacion[];
};

export default function ProductividadPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(startOfToday(), 7),
        to: startOfToday(),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [allOFs, setAllOFs] = useState<OrdenFabricacion[]>([]);
    const [responsableFilter, setResponsableFilter] = useState('all');

    useEffect(() => {
        const storedOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        setAllOFs(storedOFs);
        setIsMounted(true);
    }, []);

    const reporteData = useMemo(() => {
        if (!dateRange?.from) return [];

        const ofsEnRango = allOFs.filter(of => {
            const fechaFin = of.fechaFinalizacion ? parseISO(of.fechaFinalizacion) : null;
            return fechaFin && fechaFin >= dateRange.from! && fechaFin <= (dateRange.to || dateRange.from);
        });

        const ofsFiltradasPorResponsable = responsableFilter === 'all'
            ? ofsEnRango
            : ofsEnRango.filter(of => of.responsable === responsableFilter);

        const porResponsable = new Map<string, DatosResponsable>();

        ofsFiltradasPorResponsable.forEach(of => {
            if (of.responsable) {
                if (!porResponsable.has(of.responsable)) {
                    porResponsable.set(of.responsable, { nombre: of.responsable, ofs: [], incidencias: [] });
                }
                const data = porResponsable.get(of.responsable)!;
                
                if (of.estado === 'Finalizado' || of.estado === 'Validado') {
                     const ofConTiempos: OfConTiempos = { ...of };
                    if (of.fechaAsignacion && of.fechaInicioProduccion) {
                        ofConTiempos.tiempoAsignacion = formatDistance(parseISO(of.fechaInicioProduccion), parseISO(of.fechaAsignacion), { locale: es });
                    }
                    if (of.fechaInicioProduccion && of.fechaFinalizacion) {
                        ofConTiempos.tiempoProduccion = formatDistance(parseISO(of.fechaFinalizacion), parseISO(of.fechaInicioProduccion), { locale: es });
                    }
                    data.ofs.push(ofConTiempos);
                }
                
                if (of.estado === 'Incidencia') {
                    data.incidencias.push(of);
                }
            }
        });
        return Array.from(porResponsable.values());

    }, [allOFs, dateRange, responsableFilter]);


    const responsablesUnicos = useMemo(() => {
        const responsables = new Set<string>();
        allOFs.forEach(of => {
            if (of.responsable) responsables.add(of.responsable);
        });
        return Array.from(responsables).sort();
    }, [allOFs]);

    const handleClearFilters = () => {
        setDateRange({ from: subDays(startOfToday(), 7), to: startOfToday() });
        setResponsableFilter('all');
    }

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Informe de Productividad..." />;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <BarChart3 />
                        Informe de Productividad
                    </h1>
                    <p className="text-muted-foreground mt-1">Analiza los tiempos de producción y las incidencias por responsable.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 border rounded-lg bg-card">
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className="w-full md:w-[300px] justify-start text-left font-normal"
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                {format(dateRange.from, "LLL dd, y", {locale: es})} -{" "}
                                {format(dateRange.to, "LLL dd, y", {locale: es})}
                                </>
                            ) : (
                                format(dateRange.from, "LLL dd, y", {locale: es})
                            )
                            ) : (
                            <span>Elige un rango de fechas</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={(range) => {
                                setDateRange(range);
                                if (range?.from && range?.to) {
                                    setIsDatePickerOpen(false);
                                }
                            }}
                            numberOfMonths={2}
                            locale={es}
                        />
                    </PopoverContent>
                </Popover>
                 <Select value={responsableFilter} onValueChange={setResponsableFilter}>
                    <SelectTrigger className="w-full md:w-[240px]">
                        <SelectValue placeholder="Filtrar por responsable" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los responsables</SelectItem>
                        {responsablesUnicos.map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Button variant="secondary" onClick={handleClearFilters}>Limpiar Filtros</Button>
            </div>
            
            <div className="space-y-8">
                {reporteData.length === 0 ? (
                     <Card>
                        <CardContent className="py-10 text-center text-muted-foreground">
                            No hay datos de producción finalizados para los filtros seleccionados.
                        </CardContent>
                    </Card>
                ) : reporteData.map(responsable => (
                    <Card key={responsable.nombre}>
                        <CardHeader>
                            <CardTitle>{responsable.nombre}</CardTitle>
                            <CardDescription>Resumen de actividad en el periodo seleccionado.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <h4 className="font-semibold mb-2">Órdenes de Fabricación Completadas</h4>
                            {responsable.ofs.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>OF</TableHead>
                                            <TableHead>Elaboración</TableHead>
                                            <TableHead>Tiempo Asignación-Inicio</TableHead>
                                            <TableHead>Tiempo de Producción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {responsable.ofs.map(of => (
                                            <TableRow key={of.id}>
                                                <TableCell><Badge variant="secondary">{of.id}</Badge></TableCell>
                                                <TableCell>{of.elaboracionNombre}</TableCell>
                                                <TableCell>{of.tiempoAsignacion || '-'}</TableCell>
                                                <TableCell>{of.tiempoProduccion || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : <p className="text-sm text-muted-foreground">Sin órdenes de fabricación completadas en este periodo.</p>}
                            
                            {responsable.incidencias.length > 0 && (
                                <>
                                    <Separator className="my-6" />
                                    <h4 className="font-semibold mb-2 text-destructive flex items-center gap-2"><AlertTriangle size={16}/>Incidencias Registradas</h4>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>OF</TableHead><TableHead>Elaboración</TableHead><TableHead>Observaciones</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {responsable.incidencias.map(inc => (
                                                <TableRow key={inc.id} className="bg-destructive/5">
                                                    <TableCell><Badge variant="destructive">{inc.id}</Badge></TableCell>
                                                    <TableCell>{inc.elaboracionNombre}</TableCell>
                                                    <TableCell>{inc.incidenciaObservaciones}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

        </div>
    );
}
