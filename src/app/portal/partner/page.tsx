
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, Calendar as CalendarIcon, MessageSquare, Edit, Users, PlusCircle, Trash2, MapPin, Clock, Phone, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Building2 } from 'lucide-react';
import { format, isSameMonth, isSameDay, add, sub, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfToday, isWithinInterval, endOfDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatUnit } from '@/lib/utils';
import type { PedidoPartner, PedidoEntrega, ProductoVenta, Entrega, Proveedor } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from '@/components/ui/calendar';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/providers/auth-provider';
import { logActivity } from '../activity-log/utils';


type SimplifiedPedidoPartnerStatus = 'Pendiente' | 'Aceptado';

type PedidoPartnerConEstado = PedidoPartner & {
    expedicionNumero: string;
    status: SimplifiedPedidoPartnerStatus;
    comentarios?: string;
}

const statusVariant: { [key in SimplifiedPedidoPartnerStatus]: 'success' | 'secondary' } = {
    'Pendiente': 'secondary',
    'Aceptado': 'success',
};

const statusRowClass: { [key in SimplifiedPedidoPartnerStatus]?: string } = {
    'Aceptado': 'bg-green-100/60 hover:bg-green-100/80',
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

type DayDetails = {
    day: Date;
    events: PedidoPartnerConEstado[];
} | null;


function CommentDialog({ pedido, onSave, isReadOnly }: { pedido: PedidoPartnerConEstado; onSave: (id: string, comment: string) => void; isReadOnly: boolean; }) {
    const [comment, setComment] = useState(pedido.comentarios || '');
    const [isOpen, setIsOpen] = useState(false);

    const handleSave = () => {
        onSave(pedido.id, comment);
        setIsOpen(false);
    }
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isReadOnly}>
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Comentarios para: {pedido.elaboracionNombre}</DialogTitle>
                </DialogHeader>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={5} placeholder="Añade aquí cualquier nota relevante sobre la producción o entrega de este artículo..." />
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Comentario</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function PartnerPortalPage() {
    const [pedidos, setPedidos] = useState<PedidoPartnerConEstado[]>([]);
    const { toast } = useToast();
    const { user, profile, effectiveRole, hasRole } = useAuth();
    const router = useRouter();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);

    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);

    const isAdminOrComercial = useMemo(() => {
        return effectiveRole === 'ADMIN' || effectiveRole === 'COMERCIAL';
    }, [effectiveRole]);

    const isReadOnly = useMemo(() => {
        if (!user) return true;
        return isAdminOrComercial;
    }, [user, isAdminOrComercial]);

    const proveedorId = useMemo(() => profile?.proveedor_id, [profile]);

    const loadData = useCallback(() => {
        const partnerShouldBeDefined = hasRole('PARTNER_GASTRONOMIA');
        if (partnerShouldBeDefined && !proveedorId) {
            setPedidos([]);
            return;
        }

        const allEntregas = (JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[]).filter(os => os.status === 'Confirmado');
        const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const allProductosVenta = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];

        const osMap = new Map(allEntregas.map(os => [os.id, os]));
        const productosMap = new Map(allProductosVenta.map(p => [p.id, p]));
        const partnerStatusData = JSON.parse(localStorage.getItem('partnerPedidosStatus') || '{}') as Record<string, { status: SimplifiedPedidoPartnerStatus; comentarios?: string }>;

        const partnerPedidos: PedidoPartnerConEstado[] = [];

        allPedidosEntrega.forEach(pedido => {
            const os = osMap.get(pedido.osId);
            if (!os) return;

            (pedido.hitos || []).forEach((hito, hitoIndex) => {
                (hito.items || []).forEach(item => {
                    const producto = productosMap.get(item.id);
                    const shouldInclude = producto && producto.producidoPorPartner && (!proveedorId || producto.partnerId === proveedorId);

                    if (shouldInclude) {
                        const id = `${hito.id}-${item.id}`;
                        const statusInfo = partnerStatusData[id] || { status: 'Pendiente' };
                        const expedicionNumero = `${os.serviceNumber}.${(hitoIndex + 1).toString().padStart(2, '0')}`;
                        partnerPedidos.push({
                            id,
                            osId: pedido.osId,
                            serviceNumber: os.serviceNumber,
                            expedicionNumero,
                            cliente: os.client,
                            fechaEntrega: hito.fecha,
                            horaEntrega: hito.hora,
                            elaboracionId: producto.id,
                            elaboracionNombre: producto.nombre,
                            cantidad: item.quantity,
                            unidad: 'UD',
                            status: statusInfo.status,
                            comentarios: statusInfo.comentarios,
                        });
                    }
                });
            });
        });

        setPedidos(partnerPedidos);
    }, [proveedorId, hasRole]);

    useEffect(() => {
        if (user) {
            const canAccess = hasRole('PARTNER_GASTRONOMIA') || isAdminOrComercial;
            if (!canAccess) {
                router.push('/portal');
            }
        }
    }, [user, hasRole, router, isAdminOrComercial]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAccept = (pedido: PedidoPartnerConEstado) => {
        if (!user) return;
        const partnerStatusData = JSON.parse(localStorage.getItem('partnerPedidosStatus') || '{}');
        if (!partnerStatusData[pedido.id]) {
            partnerStatusData[pedido.id] = {};
        }
        partnerStatusData[pedido.id].status = 'Aceptado';
        localStorage.setItem('partnerPedidosStatus', JSON.stringify(partnerStatusData));

        const activityUser = {
            id: user.id,
            nombre: profile?.nombre_completo || user.email || 'Usuario',
            email: user.email || '',
            roles: [effectiveRole || '']
        };
        logActivity(activityUser as any, 'Aceptar Pedido', `Aceptado: ${pedido.cantidad} x ${pedido.elaboracionNombre}`, pedido.expedicionNumero);
        loadData();
        toast({ title: 'Pedido Aceptado', description: `El pedido ha sido marcado como "Aceptado".` });
    };

    const handleSaveComment = (pedidoId: string, comment: string) => {
        if (!user) return;
        const partnerStatusData = JSON.parse(localStorage.getItem('partnerPedidosStatus') || '{}');
        if (!partnerStatusData[pedidoId]) {
            partnerStatusData[pedidoId] = { status: 'Pendiente' };
        }
        partnerStatusData[pedidoId].comentarios = comment;
        localStorage.setItem('partnerPedidosStatus', JSON.stringify(partnerStatusData));
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (pedido) {
            const activityUser = {
                id: user.id,
                nombre: profile?.nombre_completo || user.email || 'Usuario',
                email: user.email || '',
                roles: [effectiveRole || '']
            };
            logActivity(activityUser as any, 'Añadir Comentario', `Comentario en ${pedido.elaboracionNombre}: "${comment}"`, pedido.expedicionNumero);
        }
        loadData();
        toast({ title: 'Comentario guardado' });
    };

    const filteredPedidos = useMemo(() => {
        const today = startOfToday();
        return pedidos.filter(p => {
            const deliveryDate = new Date(p.fechaEntrega);

            const isPast = isBefore(deliveryDate, today);
            if (!showCompleted && isPast) {
                return false;
            }

            let dateMatch = true;
            if (dateRange?.from) {
                if (dateRange.to) {
                    dateMatch = isWithinInterval(deliveryDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
                } else {
                    dateMatch = isSameDay(deliveryDate, dateRange.from);
                }
            }

            return dateMatch;
        });
    }, [pedidos, showCompleted, dateRange]);


    const pedidosAgrupadosPorDia = useMemo(() => {
        const groupedByDay: { [date: string]: { [location: string]: PedidoPartnerConEstado[] } } = {};

        filteredPedidos.forEach(turno => {
            const dateKey = format(new Date(turno.fechaEntrega), 'yyyy-MM-dd');
            if (!groupedByDay[dateKey]) {
                groupedByDay[dateKey] = {};
            }
            const locationKey = 'CPR MICE'; // Hardcoded for now
            if (!groupedByDay[dateKey][locationKey]) {
                groupedByDay[dateKey][locationKey] = [];
            }
            groupedByDay[dateKey][locationKey].push(turno);
        });

        return Object.entries(groupedByDay)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, locations]) => {
                const allAccepted = Object.values(locations).flat().every(p => p.status === 'Aceptado');
                const earliestTime = Object.values(locations).flat().reduce((earliest, p) => p.horaEntrega < earliest ? p.horaEntrega : earliest, '23:59');

                const groupedByExpedicion: { [key: string]: PedidoPartnerConEstado[] } = {};
                Object.values(locations).flat().forEach(pedido => {
                    if (!groupedByExpedicion[pedido.expedicionNumero]) {
                        groupedByExpedicion[pedido.expedicionNumero] = [];
                    }
                    groupedByExpedicion[pedido.expedicionNumero].push(pedido);
                });

                const expediciones = Object.entries(groupedByExpedicion).map(([expedicionNumero, pedidos]) => ({
                    numero: expedicionNumero,
                    pedidos: pedidos.sort((a, b) => a.elaboracionNombre.localeCompare(b.elaboracionNombre)),
                })).sort((a, b) => a.numero.localeCompare(b.numero));


                return { date, expediciones, allAccepted, earliestTime };
            });
    }, [filteredPedidos]);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStartDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEndDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: calStartDate, end: calEndDate });

    const eventsByDay = useMemo(() => {
        const grouped: { [dayKey: string]: PedidoPartnerConEstado[] } = {};
        pedidos.forEach(event => {
            const dayKey = format(new Date(event.fechaEntrega), 'yyyy-MM-dd');
            if (!grouped[dayKey]) grouped[dayKey] = [];
            grouped[dayKey].push(event);
        });
        return grouped;
    }, [pedidos]);

    const nextMonth = () => setCurrentDate(add(currentDate, { months: 1 }));
    const prevMonth = () => setCurrentDate(sub(currentDate, { months: 1 }));






