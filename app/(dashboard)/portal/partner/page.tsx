
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
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
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
import { useEntregas, usePedidosEntrega, useArticulos } from '@/hooks/use-data-queries';
import { useUpdatePartnerStatus } from '@/hooks/mutations/use-pedidos-entrega-mutations';


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
    const [isMounted, setIsMounted] = useState(false);
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

    const { data: allEntregasData, isLoading: loadingEntregas } = useEntregas();
    const { data: allPedidosData, isLoading: loadingPedidos } = usePedidosEntrega();
    const { data: allArticulosData, isLoading: loadingArticulos } = useArticulos();
    const { mutateAsync: updatePartnerStatus } = useUpdatePartnerStatus();

    const loadData = useCallback(() => {
        if (loadingEntregas || loadingPedidos || loadingArticulos || !allEntregasData || !allPedidosData || !allArticulosData) return;

        const partnerShouldBeDefined = hasRole('PARTNER_GASTRONOMIA');
        if (partnerShouldBeDefined && !proveedorId) {
            setPedidos([]);
            setIsMounted(true);
            return;
        }

        const allEntregas = allEntregasData.filter(os => os.status === 'Confirmado');
        const allPedidosEntrega = allPedidosData;
        const allProductosVenta = allArticulosData;

        const osMap = new Map(allEntregas.map(os => [os.id, os]));
        const productosMap = new Map(allProductosVenta.map(p => [p.id, p]));

        const partnerPedidos: PedidoPartnerConEstado[] = [];

        allPedidosEntrega.forEach(pedido => {
            const os = osMap.get(pedido.osId);
            if (!os) return;

            (pedido.hitos || []).forEach((hito: any, hitoIndex: number) => {
                (hito.articulos || []).forEach((item: any) => {
                    const producto = productosMap.get(item.id);
                    const shouldInclude = producto && producto.producidoPorPartner && (!proveedorId || producto.partnerId === proveedorId);

                    if (shouldInclude) {
                        const id = `${hito.id}-${item.id}`;
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
                            cantidad: item.cantidad,
                            unidad: 'UD',
                            status: (item.statusPartner || 'Pendiente') as SimplifiedPedidoPartnerStatus,
                            comentarios: item.comentariosPartner || '',
                            hitoId: hito.id,
                            articuloId: item.id
                        } as any);
                    }
                });
            });
        });

        setPedidos(partnerPedidos);
        setIsMounted(true);
    }, [proveedorId, hasRole, allEntregasData, allPedidosData, allArticulosData, loadingEntregas, loadingPedidos, loadingArticulos]);

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

    const handleAccept = async (pedido: PedidoPartnerConEstado) => {
        if (!user) return;
        
        try {
            await updatePartnerStatus({
                osId: pedido.osId,
                hitoId: (pedido as any).hitoId,
                articuloId: (pedido as any).articuloId,
                status: 'Aceptado',
                comentarios: pedido.comentarios
            });

            const activityUser = {
                id: user.id,
                nombre: profile?.nombre_completo || user.email || 'Usuario',
                email: user.email || '',
                roles: [effectiveRole || '']
            };
            logActivity(activityUser as any, 'Aceptar Pedido', `Aceptado: ${pedido.cantidad} x ${pedido.elaboracionNombre}`, pedido.expedicionNumero);
            toast({ title: 'Pedido Aceptado', description: `El pedido ha sido marcado como "Aceptado".` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo aceptar el pedido.' });
        }
    };

    const handleSaveComment = async (pedidoId: string, comment: string) => {
        if (!user) return;
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (!pedido) return;

        try {
            await updatePartnerStatus({
                osId: pedido.osId,
                hitoId: (pedido as any).hitoId,
                articuloId: (pedido as any).articuloId,
                status: pedido.status,
                comentarios: comment
            });

            const activityUser = {
                id: user.id,
                nombre: profile?.nombre_completo || user.email || 'Usuario',
                email: user.email || '',
                roles: [effectiveRole || '']
            };
            logActivity(activityUser as any, 'Añadir Comentario', `Comentario en ${pedido.elaboracionNombre}: "${comment}"`, pedido.expedicionNumero);
            toast({ title: 'Comentario guardado' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el comentario.' });
        }
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


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Portal de Partner..." />;
    }

    if (hasRole('PARTNER_GASTRONOMIA') && !proveedorId) {
        return (
            <main className="container mx-auto px-4 py-16">
                <Card className="max-w-xl mx-auto">
                    <CardHeader><CardTitle>Acceso Restringido</CardTitle></CardHeader>
                    <CardContent><p>Este usuario no está asociado a ningún partner de producción. Por favor, contacta con el administrador.</p></CardContent>
                </Card>
            </main>
        )
    }

    return (
        <TooltipProvider>
            <main className="container mx-auto px-4 py-8">
                <Tabs defaultValue="lista">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="lista">Lista de Producción</TabsTrigger>
                        <TabsTrigger value="calendario">Calendario</TabsTrigger>
                    </TabsList>
                    <TabsContent value="lista" className="mt-6">
                        <div className="flex items-center space-x-4 mb-4">
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if (range?.from && range?.to) { setIsDatePickerOpen(false) } }} numberOfMonths={2} locale={es} />
                                </PopoverContent>
                            </Popover>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="show-completed" checked={showCompleted} onCheckedChange={(checked) => setShowCompleted(Boolean(checked))} />
                                <Label htmlFor="show-completed">Mostrar pedidos aceptados</Label>
                            </div>
                        </div>
                        {pedidosAgrupadosPorDia.length > 0 ? (
                            <Accordion type="multiple" className="w-full space-y-4">
                                {pedidosAgrupadosPorDia.map(({ date, expediciones, allAccepted, earliestTime }) => (
                                    <AccordionItem value={date} key={date} className="border-none">
                                        <Card className={cn(allAccepted && 'bg-green-100/60')}>
                                            <AccordionTrigger className="p-4 hover:no-underline">
                                                <div className="flex items-center gap-3 w-full">
                                                    {allAccepted ? <CheckCircle className="h-6 w-6 text-green-600" /> : <CalendarIcon className="h-6 w-6" />}
                                                    <div className="text-left">
                                                        <h3 className="text-xl font-bold capitalize">{format(new Date(date), 'EEEE, d \'de\' MMMM', { locale: es })}</h3>
                                                        <p className="text-sm text-muted-foreground">{expediciones.flatMap(e => e.pedidos).length} elaboraciones requeridas</p>
                                                    </div>
                                                    <div className="flex-grow flex items-center justify-end gap-2 text-sm font-semibold text-primary mr-4">
                                                        <Clock className="h-4 w-4" />
                                                        <span>Hora Límite Entrega en CPR: {earliestTime}</span>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="border-t px-4 pb-4 space-y-4">
                                                    {expediciones.map(({ numero, pedidos }) => (
                                                        <div key={numero} className="pt-4">
                                                            <h4 className="font-bold mb-2">Nº Expedición: <Badge>{numero}</Badge></h4>
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>Elaboración</TableHead>
                                                                        <TableHead className="text-right">Cantidad</TableHead>
                                                                        <TableHead>Estado</TableHead>
                                                                        <TableHead>Comentarios</TableHead>
                                                                        <TableHead className="text-right w-12"></TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {pedidos.map(pedido => (
                                                                        <TableRow key={pedido.id} className={cn("transition-colors", statusRowClass[pedido.status])}>
                                                                            <TableCell className="font-semibold">{pedido.elaboracionNombre}</TableCell>
                                                                            <TableCell className="text-right font-mono">{pedido.cantidad.toFixed(2)} {formatUnit(pedido.unidad)}</TableCell>
                                                                            <TableCell>
                                                                                {pedido.status === 'Pendiente' ? (
                                                                                    <Button size="sm" onClick={() => handleAccept(pedido)} disabled={isReadOnly}>Aceptar Pedido</Button>
                                                                                ) : (
                                                                                    <Badge variant={statusVariant[pedido.status]}>{pedido.status}</Badge>
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell className="text-xs text-muted-foreground">{pedido.comentarios}</TableCell>
                                                                            <TableCell className="text-right">
                                                                                <CommentDialog pedido={pedido} onSave={handleSaveComment} isReadOnly={isReadOnly} />
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </Card>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        ) : (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <Factory className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <h3 className="mt-4 text-lg font-semibold">Todo al día</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">No hay pedidos de producción pendientes que coincidan con los filtros.</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                    <TabsContent value="calendario" className="mt-6">
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                            <h2 className="text-xl font-semibold w-40 text-center capitalize">{format(currentDate, 'MMMM yyyy', { locale: es })}</h2>
                            <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                        <div className="border rounded-lg">
                            <div className="grid grid-cols-7 border-b">
                                {WEEKDAYS.map(day => (
                                    <div key={day} className="text-center font-bold p-2 text-xs text-muted-foreground">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 auto-rows-fr">
                                {calendarDays.map((day) => {
                                    const dayKey = format(day, 'yyyy-MM-dd');
                                    const dayEvents = eventsByDay[dayKey] || [];
                                    const isCurrentMonth = isSameMonth(day, currentDate);
                                    const isToday = isSameDay(day, new Date());

                                    return (
                                        <div
                                            key={day.toString()}
                                            className={cn(
                                                'h-20 border-r border-b p-1 flex flex-col',
                                                !isCurrentMonth && 'bg-muted/50 text-muted-foreground',
                                                'last:border-r-0',
                                                dayEvents.length > 0 && 'cursor-pointer hover:bg-secondary'
                                            )}
                                            onClick={() => dayEvents.length > 0 && setDayDetails({ day, events: dayEvents })}
                                        >
                                            <span className={cn('font-semibold text-xs', isToday && 'text-primary font-bold flex items-center justify-center h-5 w-5 rounded-full bg-primary/20')}>
                                                {format(day, 'd')}
                                            </span>
                                            {dayEvents.length > 0 && (
                                                <div className="mt-1 flex justify-center">
                                                    <span className="h-2 w-2 rounded-full bg-primary"></span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            <Dialog open={!!dayDetails} onOpenChange={(open) => !open && setDayDetails(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Producción para el {dayDetails?.day ? format(dayDetails.day, 'PPP', { locale: es }) : ''}</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
                        {dayDetails && dayDetails.events.map((event) => (
                            <div key={event.id} className="block p-3 hover:bg-muted rounded-md">
                                <p className="font-bold text-primary">{event.elaboracionNombre}</p>
                                <p>Pedido: {event.serviceNumber} ({event.cliente})</p>
                                <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4">
                                    <span><span className="font-semibold">Cantidad:</span> {event.cantidad.toFixed(2)} {formatUnit(event.unidad)}</span>
                                    <span><span className="font-semibold">Hora Límite:</span> {event.horaEntrega}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
}




