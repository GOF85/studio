
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Search, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TransporteOrder, ServiceOrder } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type OrderWithOS = TransporteOrder & {
    os?: ServiceOrder;
};

const statusVariant: { [key in TransporteOrder['status']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  Pendiente: 'secondary',
  Confirmado: 'default',
  'En Ruta': 'outline',
  Entregado: 'outline',
};

export default function TransportePortalPage() {
    const [orders, setOrders] = useState<OrderWithOS[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const allTransportOrders = (JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[]);
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const serviceOrderMap = new Map(allServiceOrders.map(os => [os.id, os]));

        const ordersWithOs = allTransportOrders.map(order => ({
            ...order,
            os: serviceOrderMap.get(order.osId),
        }));

        setOrders(ordersWithOs);
        setIsMounted(true);
    }, []);

    const filteredAndGroupedOrders = useMemo(() => {
        const filtered = orders.filter(order => {
            const statusMatch = showCompleted || order.status !== 'Entregado';
            
            const searchMatch = searchTerm === '' ||
                order.lugarEntrega.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.os?.serviceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.os?.client || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.proveedorNombre.toLowerCase().includes(searchTerm.toLowerCase());

            return statusMatch && searchMatch;
        });

        const grouped: { [date: string]: OrderWithOS[] } = {};
        filtered.forEach(order => {
            const dateKey = format(new Date(order.fecha), 'yyyy-MM-dd');
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(order);
        });

        return Object.entries(grouped).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
    }, [orders, searchTerm, showCompleted]);
    
    const handleOrderClick = (id: string) => {
        router.push(`/portal/albaran/${id}`);
    }

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

             <div className="flex flex-col gap-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por OS, cliente, dirección..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="show-completed" checked={showCompleted} onCheckedChange={setShowCompleted} />
                    <Label htmlFor="show-completed">Mostrar entregas realizadas</Label>
                </div>
            </div>

            <div className="space-y-4">
                {filteredAndGroupedOrders.length > 0 ? (
                    <Accordion type="multiple" defaultValue={filteredAndGroupedOrders.map(([date]) => date)} className="w-full space-y-4">
                        {filteredAndGroupedOrders.map(([date, dailyOrders]) => (
                             <Card key={date}>
                                <AccordionItem value={date} className="border-none">
                                    <AccordionTrigger className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="text-left">
                                                <h3 className="text-lg font-bold capitalize">{format(new Date(date), 'EEEE, d \'de\' MMMM', {locale: es})}</h3>
                                                <p className="text-sm text-muted-foreground">{dailyOrders.length} servicio(s) asignado(s)</p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="border-t p-4 space-y-4">
                                            {dailyOrders.map(order => (
                                                <div key={order.id} className="border p-4 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => handleOrderClick(order.id)}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-bold">{order.lugarEntrega}</p>
                                                            <p className="text-sm text-muted-foreground">{order.os?.client} (OS: {order.os?.serviceNumber})</p>
                                                        </div>
                                                        <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                                                    </div>
                                                    <div className="text-sm mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                                                        <div className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> <strong>Recogida:</strong> {order.horaRecogida}</div>
                                                        <div className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> <strong>Entrega:</strong> {order.horaEntrega}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                             </Card>
                        ))}
                    </Accordion>
                ) : (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">Sin servicios para mostrar</h3>
                            <p className="mt-1 text-sm text-muted-foreground">No hay entregas que coincidan con los filtros actuales.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </main>
    );
}
