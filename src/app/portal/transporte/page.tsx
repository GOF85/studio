
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TransporteOrder } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Button } from '@/components/ui/button';

export default function TransportePortalPage() {
    const [orders, setOrders] = useState<TransporteOrder[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const allOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
        setOrders(allOrders);
        setIsMounted(true);
    }, []);

    const groupedOrders = useMemo(() => {
        const grouped: { [date: string]: TransporteOrder[] } = {};
        orders.forEach(order => {
            const dateKey = format(new Date(order.fecha), 'yyyy-MM-dd');
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(order);
        });
        return Object.entries(grouped).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
    }, [orders]);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Portal de Transporte..." />;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Truck className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-headline font-bold tracking-tight">Portal de Transporte</h1>
                    <p className="text-lg text-muted-foreground">Listado de entregas y recogidas asignadas.</p>
                </div>
            </div>

            <div className="space-y-6">
                {groupedOrders.length > 0 ? (
                    groupedOrders.map(([date, dailyOrders]) => (
                        <Card key={date}>
                            <CardHeader>
                                <CardTitle className="capitalize flex items-center gap-2"><CalendarIcon size={20} /> {format(new Date(date), 'EEEE, d \'de\' MMMM', {locale: es})}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {dailyOrders.map(order => (
                                    <div key={order.id} className="border p-4 rounded-lg hover:bg-secondary/50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold">{order.lugarEntrega}</p>
                                                <p className="text-sm text-muted-foreground">{order.proveedorNombre} - {order.tipoTransporte}</p>
                                            </div>
                                            <Button onClick={() => router.push(`/portal/albaran/${order.id}`)}>Ver Albarán</Button>
                                        </div>
                                        <div className="text-sm mt-2 grid grid-cols-2 gap-2">
                                            <p><strong>Recogida:</strong> {order.lugarRecogida} a las {order.horaRecogida}</p>
                                            <p><strong>Entrega:</strong> {order.lugarEntrega} a las {order.horaEntrega}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">Sin servicios asignados</h3>
                            <p className="mt-1 text-sm text-muted-foreground">No tienes ninguna entrega o recogida en el sistema.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </main>
    )
}
