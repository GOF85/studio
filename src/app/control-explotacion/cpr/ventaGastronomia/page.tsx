
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AreaChart, ArrowLeft } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import type { ServiceOrder, GastronomyOrder, Receta } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

type VentaDetalle = {
    fecha: string;
    osId: string;
    osNumber: string;
    referencia: string;
    cantidad: number;
    pvpTotal: number;
};

export default function VentaGastronomiaPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [detalleVentas, setDetalleVentas] = useState<VentaDetalle[]>([]);
    const router = useRouter();
    const searchParams = useSearchParams();

    const from = searchParams.get('from');
    const to = searchParams.get('to');

    useEffect(() => {
        if (!from || !to) {
            // Handle case where dates are not provided, maybe redirect or show a message
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
        
        const ventasDetalladas: VentaDetalle[] = [];
        gastroOrdersEnRango.forEach(order => {
            const os = allServiceOrders.find(o => o.id === order.osId);
            (order.items || []).forEach(item => {
                if (item.type === 'item') {
                    const receta = recetasMap.get(item.id);
                    if (receta) {
                        const pvpTotalItem = (item.quantity || 0) * (receta.precioVenta || 0);
                        ventasDetalladas.push({
                            fecha: order.fecha,
                            osId: os?.id || 'N/A',
                            osNumber: os?.serviceNumber || 'N/A',
                            referencia: receta.nombre,
                            cantidad: item.quantity || 0,
                            pvpTotal: pvpTotalItem,
                        });
                    }
                }
            });
        });
        
        setDetalleVentas(ventasDetalladas.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
        setIsMounted(true);
    }, [from, to]);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando detalle de ventas..." />;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/control-explotacion/cpr')} className="mb-2">
                        <ArrowLeft className="mr-2" />
                        Volver al Informe
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><AreaChart />Detalle de Venta de Gastronomía</h1>
                    <p className="text-muted-foreground">Desglose de todas las referencias de gastronomía vendidas en el periodo seleccionado.</p>
                </div>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>OS</TableHead>
                                <TableHead>Referencia</TableHead>
                                <TableHead className="text-right">Cantidad</TableHead>
                                <TableHead className="text-right">PVP Total</TableHead>
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
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">No se encontraron datos de venta para este periodo.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </main>
    );
}

