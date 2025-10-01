

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Search, Warehouse, User, Phone, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TransporteOrder, ServiceOrder, PedidoEntrega, EntregaHito } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import Link from 'next/link';

type OrderWithDetails = TransporteOrder & {
    os?: ServiceOrder;
    hitos: (EntregaHito & { expedicionNumero: string })[];
};

const statusVariant: { [key in TransporteOrder['status']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  Pendiente: 'secondary',
  Confirmado: 'default',
  'En Ruta': 'outline',
  Entregado: 'outline',
};

const statusRowClass: Record<string, string> = {
  'En Ruta': 'bg-blue-50 hover:bg-blue-100/80',
  'Entregado': 'bg-green-50 hover:bg-green-100/80',
};


export default function TransportePortalPage() {
    const [orders, setOrders] = useState<OrderWithDetails[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const allTransportOrders = (JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[]);
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];

        const serviceOrderMap = new Map(allServiceOrders.map(os => [os.id, os]));
        const pedidosEntregaMap = new Map(allPedidosEntrega.map(p => [p.osId, p]));

        const ordersWithDetails = allTransportOrders.map(order => {
            const os = serviceOrderMap.get(order.osId);
            const pedidoEntrega = pedidosEntregaMap.get(order.osId);
            
            const hitosDetails = (order.hitosIds || []).map(hitoId => {
                const hito = pedidoEntrega?.hitos.find(h => h.id === hitoId);
                const hitoIndex = pedidoEntrega?.hitos.findIndex(h => h.id === hitoId) ?? -1;
                const expedicionNumero = os ? `${os.serviceNumber}.${(hitoIndex + 1).toString().padStart(2, '0')}` : hitoId;
                return hito ? { ...hito, expedicionNumero } : null;
            }).filter(Boolean) as (EntregaHito & { expedicionNumero: string })[];

            return {
                ...order,
                os,
                hitos: hitosDetails,
            };
        });

        setOrders(ordersWithDetails);
        setIsMounted(true);
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const statusMatch = showCompleted || order.status !== 'Entregado';
            
            const searchMatch = searchTerm === '' ||
                order.lugarEntrega.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.os?.serviceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.os?.client || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.proveedorNombre.toLowerCase().includes(searchTerm.toLowerCase());

            return statusMatch && searchMatch;
        });
    }, [orders, searchTerm, showCompleted]);
    
    const groupedOrdersForList = useMemo(() => {
        const grouped: { [date: string]: OrderWithDetails[] } = {};
        filteredOrders.forEach(order => {
            const dateKey = format(new Date(order.fecha), 'yyyy-MM-dd');
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(order);
        });
        return Object.entries(grouped).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
    }, [filteredOrders]);
    
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

             <div className="flex flex-col gap-4 my-6">
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
                    <Switch id="show-completed-list" checked={showCompleted} onCheckedChange={setShowCompleted} />
                    <Label htmlFor="show-completed-list">Mostrar entregas realizadas</Label>
                </div>
            </div>
            <div className="space-y-4">
                {groupedOrdersForList.length > 0 ? (
                    groupedOrdersForList.map(([date, dailyOrders]) => (
                        <div key={date}>
                            <h3 className="text-xl font-bold capitalize mb-3">{format(new Date(date), 'EEEE, d \'de\' MMMM', {locale: es})}</h3>
                            <div className="space-y-3">
                                {dailyOrders.map(order => (
                                    <div key={order.id} className={cn("border p-4 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer", statusRowClass[order.status])} onClick={() => handleOrderClick(order.id)}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="font-bold text-lg flex items-center gap-2">
                                                    <MapPin className="h-5 w-5 text-primary" />
                                                    {order.lugarEntrega}
                                                </p>
                                                <p className="text-sm text-muted-foreground">{order.os?.client} (OS: {order.os?.serviceNumber})</p>
                                            </div>
                                            <Badge variant={statusVariant[order.status]} className="text-base px-3 py-1">{order.status}</Badge>
                                        </div>
                                        <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-muted-foreground">
                                            <div className="flex items-center gap-2"><Warehouse className="h-4 w-4" /> <strong>Recogida:</strong> {order.lugarRecogida}</div>
                                            <div className="flex items-center gap-2"><User className="h-4 w-4" /> <strong>Contacto:</strong> {order.hitos[0]?.contacto || order.os?.contact}</div>
                                            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> <strong>Horas:</strong> {order.horaRecogida} &rarr; {order.horaEntrega}</div>
                                            <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> <strong>Teléfono:</strong> {order.hitos[0]?.telefono || order.os?.phone}</div>
                                        </div>
                                         {order.hitos.length > 0 && (
                                            <div className="mt-3 pt-3 border-t">
                                                <h4 className="font-semibold text-xs mb-1">Entregas Incluidas:</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {order.hitos.map(hito => (
                                                        <Badge key={hito.id} variant="outline">{hito.expedicionNumero} - {hito.lugarEntrega}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                         )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
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
