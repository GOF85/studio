

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ServiceOrder, CesionStorage, Personal } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { formatCurrency, formatNumber, calculateHours } from '@/lib/utils';
import Link from 'next/link';
import { MessageSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type DetalleIngreso = CesionStorage & {
    costeReal: number;
    costePlanificado: number;
};

export default function CesionIngresoPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [detalles, setDetalles] = useState<DetalleIngreso[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const searchParams = useSearchParams() ?? new URLSearchParams();

    const from = searchParams.get('from');
    const to = searchParams.get('to');

    useEffect(() => {
        if (!from || !to) {
            setIsMounted(true);
            return;
        }

        const rangeStart = startOfDay(parseISO(from));
        const rangeEnd = endOfDay(parseISO(to));
        
        const allCesiones = (JSON.parse(localStorage.getItem('cesionesPersonal') || '[]') as CesionStorage[])
            .filter(c => {
                if (!c.fecha) return false;
                try {
                    const [year, month, day] = c.fecha.split('-').map(Number);
                    const fechaCesion = new Date(year, month - 1, day);
                    return isWithinInterval(fechaCesion, { start: rangeStart, end: rangeEnd });
                } catch(e) { return false; }
            });
            
        const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
        const personalMap = new Map(allPersonal.map(p => [p.nombreCompleto, p]));

        const ingresosDetallados: DetalleIngreso[] = allCesiones
            .filter(c => {
                const p = personalMap.get(c.nombre);
                return p && p.departamento === 'CPR' && c.centroCoste !== 'CPR';
            })
            .map(c => {
                const horasReales = calculateHours(c.horaEntradaReal, c.horaSalidaReal) || calculateHours(c.horaEntrada, c.horaSalida);
                const horasPlanificadas = calculateHours(c.horaEntrada, c.horaSalida);
                return {
                    ...c,
                    costeReal: horasReales * c.precioHora,
                    costePlanificado: horasPlanificadas * c.precioHora,
                }
            });
        
        setDetalles(ingresosDetallados.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
        setIsMounted(true);
    }, [from, to]);
    
    const uniqueDepartments = useMemo(() => {
        const departments = new Set<string>();
        detalles.forEach(d => departments.add(d.centroCoste));
        return ['all', ...Array.from(departments).sort()];
    }, [detalles]);

    const filteredDetails = useMemo(() => {
        return detalles.filter(item => {
            const term = searchTerm.toLowerCase();
            const searchMatch = item.nombre.toLowerCase().includes(term);
            const departmentMatch = departmentFilter === 'all' || item.centroCoste === departmentFilter;
            return searchMatch && departmentMatch;
        });
    }, [detalles, searchTerm, departmentFilter]);
    
    const dateRangeDisplay = useMemo(() => {
        if (!from || !to) return "Rango de fechas no especificado";
        return `${format(parseISO(from), 'dd/MM/yyyy')} - ${format(parseISO(to), 'dd/MM/yyyy')}`;
    }, [from, to]);
    
    const { totalCosteReal, totalCostePlanificado } = useMemo(() => {
        return filteredDetails.reduce((acc, item) => {
            acc.totalCosteReal += item.costeReal;
            acc.totalCostePlanificado += item.costePlanificado;
            return acc;
        }, { totalCosteReal: 0, totalCostePlanificado: 0 });
    }, [filteredDetails]);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando detalle de ingresos por cesión..." />;
    }

    return (
        <main>
            <div className="text-sm text-muted-foreground mb-6">
                Mostrando datos para el periodo: <strong>{dateRangeDisplay}</strong>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Detalle de Ingresos por Cesión de Personal de CPR</CardTitle>
                    <CardDescription>Desglose de los ingresos generados por personal de CPR que ha trabajado para otros departamentos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 mb-4">
                        <div className="relative flex-grow max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar por empleado..."
                                className="pl-8 w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                            <SelectTrigger className="w-[240px]">
                                <SelectValue placeholder="Filtrar por dpto. destino" />
                            </SelectTrigger>
                            <SelectContent>
                                {uniqueDepartments.map(d => <SelectItem key={d} value={d}>{d === 'all' ? 'Todos los Dptos.' : d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant="secondary" onClick={() => { setSearchTerm(''); setDepartmentFilter('all'); }}>Limpiar</Button>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Empleado</TableHead>
                                <TableHead>Dpto. Destino</TableHead>
                                <TableHead>Horario Plan.</TableHead>
                                <TableHead>Horario Real</TableHead>
                                <TableHead className="text-right">Coste/Ingreso Plan.</TableHead>
                                <TableHead className="text-right">Coste/Ingreso Real</TableHead>
                                <TableHead className="text-center w-24">Comentarios</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDetails.length > 0 ? filteredDetails.map((item, i) => (
                                <TableRow key={item.id}>
                                    <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{item.nombre}</TableCell>
                                    <TableCell>{item.centroCoste}</TableCell>
                                    <TableCell>{item.horaEntrada}-{item.horaSalida} ({formatNumber(calculateHours(item.horaEntrada, item.horaSalida), 2)}h)</TableCell>
                                    <TableCell>{item.horaEntradaReal}-{item.horaSalidaReal} ({formatNumber(calculateHours(item.horaEntradaReal, item.horaSalidaReal), 2)}h)</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.costePlanificado)}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(item.costeReal)}</TableCell>
                                    <TableCell className="text-center">
                                        {item.comentarios && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MessageSquare className="h-5 w-5" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Comentario de la Cesión</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="py-4">
                                                        <p className="text-sm text-muted-foreground bg-secondary p-4 rounded-md">{item.comentarios}</p>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={8} className="text-center h-24">No se encontraron datos para este periodo.</TableCell></TableRow>
                            )}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={5} className="text-right font-bold">TOTALES</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(totalCostePlanificado)}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(totalCosteReal)}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
        </main>
    );
}
