
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

type DetalleIngreso = CesionStorage & {
    costeReal: number;
};

export default function CesionIngresoPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [detalles, setDetalles] = useState<DetalleIngreso[]>([]);
    const searchParams = useSearchParams();

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
            .filter(c => c.fecha && isWithinInterval(new Date(c.fecha), { start: rangeStart, end: rangeEnd }));
            
        const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
        const personalMap = new Map(allPersonal.map(p => [p.nombreCompleto, p]));

        const ingresosDetallados: DetalleIngreso[] = allCesiones
            .filter(c => {
                const p = personalMap.get(c.nombre);
                return p && p.departamento === 'CPR' && c.centroCoste !== 'CPR';
            })
            .map(c => {
                const horasReales = calculateHours(c.horaEntradaReal, c.horaSalidaReal) || calculateHours(c.horaEntrada, c.horaSalida);
                return {
                    ...c,
                    costeReal: horasReales * c.precioHora,
                }
            });
        
        setDetalles(ingresosDetallados.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
        setIsMounted(true);
    }, [from, to]);
    
    const dateRangeDisplay = useMemo(() => {
        if (!from || !to) return "Rango de fechas no especificado";
        return `${format(parseISO(from), 'dd/MM/yyyy')} - ${format(parseISO(to), 'dd/MM/yyyy')}`;
    }, [from, to]);
    
    const totalCosteReal = useMemo(() => {
        return detalles.reduce((sum, item) => sum + item.costeReal, 0);
    }, [detalles]);

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
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Empleado</TableHead>
                                <TableHead>Dpto. Destino</TableHead>
                                <TableHead>Horas Reales</TableHead>
                                <TableHead className="text-right">Coste / Ingreso</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {detalles.length > 0 ? detalles.map((item, i) => (
                                <TableRow key={item.id}>
                                    <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{item.nombre}</TableCell>
                                    <TableCell>{item.centroCoste}</TableCell>
                                    <TableCell>{formatNumber(calculateHours(item.horaEntradaReal, item.horaSalidaReal) || calculateHours(item.horaEntrada, item.horaSalida), 2)}h</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(item.costeReal)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">No se encontraron datos para este periodo.</TableCell></TableRow>
                            )}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={4} className="text-right font-bold">TOTAL</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(totalCosteReal)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
        </main>
    );
}
