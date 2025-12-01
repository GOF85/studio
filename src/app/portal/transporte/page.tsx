

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Search, Warehouse, User, Phone, Clock, MapPin, CheckCircle, Building2, ArrowLeft } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TransporteOrder, ServiceOrder, PedidoEntrega, EntregaHito, Entrega, PortalUser, Proveedor } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/providers/auth-provider';
import { logActivity } from '../activity-log/utils';

type OrderWithDetails = TransporteOrder & {
    os?: ServiceOrder | Entrega;
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
    const [searchTerm, setSearchTerm] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);
    const router = useRouter();
    const { user, profile, effectiveRole, hasRole } = useAuth();
    const [proveedorNombre, setProveedorNombre] = useState('');

    const isAdminOrComercial = useMemo(() => {
        return effectiveRole === 'ADMIN' || effectiveRole === 'COMERCIAL';
    }, [effectiveRole]);

    const isReadOnly = useMemo(() => {
        if (!user) return true;
        return isAdminOrComercial;
    }, [user, isAdminOrComercial]);

    const proveedorId = useMemo(() => profile?.proveedor_id, [profile]);

    useEffect(() => {
        const partnerShouldBeDefined = hasRole('PARTNER_TRANSPORTE');
        if (partnerShouldBeDefined && !proveedorId) {
            setOrders([]);
            return;
        }

        const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
        if (proveedorId) {
            const proveedor = allProveedores.find(p => p.id === proveedorId);
            setProveedorNombre(proveedor?.nombreComercial || '');
        }


        const allTransportOrders = (JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[])
            .filter(o => isAdminOrComercial || o.proveedorId === proveedorId);

        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
        const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];

        const serviceOrderMap = new Map(allServiceOrders.map(os => [os.id, os]));
        const entregasMap = new Map(allEntregas.map(e => [e.id, e]));
        const pedidosEntregaMap = new Map(allPedidosEntrega.map(p => [p.osId, p]));

        const ordersWithDetails = allTransportOrders.map(order => {
            const os = serviceOrderMap.get(order.osId) || entregasMap.get(order.osId);
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
    }, [proveedorId, hasRole, isAdminOrComercial]);

    useEffect(() => {
        if (user) {
            const canAccess = hasRole('PARTNER_TRANSPORTE') || isAdminOrComercial;
            if (!canAccess) {
                router.push('/portal');
            }
        }
    }, [user, hasRole, router, isAdminOrComercial]);


    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const statusMatch = showCompleted || order.status !== 'Entregado';

            const searchMatch = searchTerm === '' ||
                (order.os?.serviceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.os?.client || '').toLowerCase().includes(searchTerm.toLowerCase());

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

    const handleStatusChange = (orderId: string, newStatus: TransporteOrder['status']) => {
        if (!user) return;
        const allTransportOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
        const orderIndex = allTransportOrders.findIndex(o => o.id === orderId);

        if (orderIndex !== -1) {
            allTransportOrders[orderIndex].status = newStatus;
            localStorage.setItem('transporteOrders', JSON.stringify(allTransportOrders));

            const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
            setOrders(updatedOrders);

            const activityUser = {
                id: user.id,
                nombre: profile?.nombre_completo || user.email || 'Usuario',
                email: user.email || '',
                roles: [effectiveRole || '']
            };
            logActivity(activityUser as any, `Actualización de Estado`, `El estado del transporte ${orderId} cambió a ${newStatus}.`, orderId);
        }
    }





