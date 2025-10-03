
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Factory, Calendar as CalendarIcon, MessageSquare, Edit, Users, PlusCircle, Trash2, MapPin, Clock, Phone, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { format, isSameMonth, isSameDay, add, sub, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatUnit } from '@/lib/utils';
import type { PedidoPartner, PedidoEntrega, ProductoVenta, Entrega } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from '@/components/ui/calendar';
import Link from 'next/link';


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


function CommentDialog({ pedido, onSave }: { pedido: PedidoPartnerConEstado; onSave: (id: string, comment: string) => void; }) {
    const [comment, setComment] = useState(pedido.comentarios || '');
    const [isOpen, setIsOpen] = useState(false);

    const handleSave = () => {
        onSave(pedido.id, comment);
        setIsOpen(false);
    }
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                   <Edit className="h-4 w-4"/>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Comentarios para: {pedido.elaboracionNombre}</DialogTitle>
                </DialogHeader>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={5} placeholder="Añade aquí cualquier nota relevante sobre la producción o entrega de este artículo..."/>
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

    // State for Calendar View
    const [currentDate, setCurrentDate] = useState(new Date());
    const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);

    const loadData = useCallback(() => {
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
                    if (producto && producto.producidoPorPartner) {
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
                            unidad: 'UNIDAD',
                            status: statusInfo.status,
                            comentarios: statusInfo.comentarios,
                        });
                    }
                });
            });
        });
        
        setPedidos(partnerPedidos);
        setIsMounted(true);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleAccept = (pedidoId: string) => {
        const partnerStatusData = JSON.parse(localStorage.getItem('partnerPedidosStatus') || '{}');
        if (!partnerStatusData[pedidoId]) {
            partnerStatusData[pedidoId] = {};
        }
        partnerStatusData[pedidoId].status = 'Aceptado';
        localStorage.setItem('partnerPedidosStatus', JSON.stringify(partnerStatusData));
        loadData(); // Recargar datos para reflejar el cambio
        toast({ title: 'Pedido Aceptado', description: `El pedido ha sido marcado como "Aceptado".` });
    };

    const handleSaveComment = (pedidoId: string, comment: string) => {
        const partnerStatusData = JSON.parse(localStorage.getItem('partnerPedidosStatus') || '{}');
        if (!partnerStatusData[pedidoId]) {
            partnerStatusData[pedidoId] = { status: 'Pendiente' };
        }
        partnerStatusData[pedidoId].comentarios = comment;
        localStorage.setItem('partnerPedidosStatus', JSON.stringify(partnerStatusData));
        loadData();
        toast({ title: 'Comentario guardado' });
    };

    const pedidosAgrupadosPorDia = useMemo(() => {
        const grouped: { [key: string]: PedidoPartnerConEstado[] } = {};
        pedidos.forEach(pedido => {
            const dateKey = format(new Date(pedido.fechaEntrega), 'yyyy-MM-dd');
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(pedido);
        });
        return Object.entries(grouped)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, dailyPedidos]) => {
                const allAccepted = dailyPedidos.every(p => p.status === 'Aceptado');
                const earliestTime = dailyPedidos.reduce((earliest, p) => p.horaEntrega < earliest ? p.horaEntrega : earliest, '23:59');
                
                const groupedByExpedicion: { [key: string]: PedidoPartnerConEstado[] } = {};
                dailyPedidos.forEach(pedido => {
                    if(!groupedByExpedicion[pedido.expedicionNumero]) {
                        groupedByExpedicion[pedido.expedicionNumero] = [];
                    }
                    groupedByExpedicion[pedido.expedicionNumero].push(pedido);
                });

                const expediciones = Object.entries(groupedByExpedicion).map(([expedicionNumero, pedidos]) => ({
                    numero: expedicionNumero,
                    pedidos: pedidos.sort((a,b) => a.elaboracionNombre.localeCompare(b.elaboracionNombre)),
                })).sort((a,b) => a.numero.localeCompare(b.numero));


                return { date, expediciones, allAccepted, earliestTime };
            });
    }, [pedidos]);

    // --- Calendar Logic ---
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

    return (
        <TooltipProvider>
         <main className="container mx-auto px-4 py-8">
             <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Factory className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-headline font-bold tracking-tight">Portal de Partner de Producción</h1>
                    <p className="text-lg text-muted-foreground">Listado de elaboraciones de "Entregas" pendientes de producir.</p>
                </div>
            </div>

            <Tabs defaultValue="lista">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="lista">Lista de Producción</TabsTrigger>
                    <TabsTrigger value="calendario">Calendario</TabsTrigger>
                </TabsList>
                <TabsContent value="lista" className="mt-6">
                    {pedidosAgrupadosPorDia.length > 0 ? (
                        <Accordion type="multiple" defaultValue={pedidosAgrupadosPorDia.filter(g => !g.allAccepted).map(g => g.date)} className="w-full space-y-4">
                            {pedidosAgrupadosPorDia.map(({ date, expediciones, allAccepted, earliestTime }) => (
                                <Card key={date} className={cn(allAccepted && 'bg-green-100/60')}>
                                    <AccordionItem value={date} className="border-none">
                                        <AccordionTrigger className="p-4 hover:no-underline">
                                            <div className="flex items-center gap-3 w-full">
                                                {allAccepted ? <CheckCircle className="h-6 w-6 text-green-600"/> : <CalendarIcon className="h-6 w-6"/>}
                                                <div className="text-left">
                                                    <h3 className="text-xl font-bold capitalize">{format(new Date(date), 'EEEE, d \'de\' MMMM', {locale: es})}</h3>
                                                    <p className="text-sm text-muted-foreground">{expediciones.flatMap(e => e.pedidos).length} elaboraciones requeridas</p>
                                                </div>
                                                <div className="flex-grow flex items-center justify-end gap-2 text-sm font-semibold text-primary mr-4">
                                                    <Clock className="h-4 w-4"/>
                                                    <span>Hora Límite Entrega en CPR: {earliestTime}</span>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="border-t px-4 pb-4 space-y-4">
                                                {expediciones.map(({numero, pedidos}) => (
                                                    <div key={numero} className="pt-4">
                                                        <h4 className="font-bold mb-2">Nº Expedición: <Badge>{numero}</Badge></h4>
                                                         <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Elaboración</TableHead>
                                                                    <TableHead className="text-right">Cantidad</TableHead>
                                                                    <TableHead>Estado</TableHead>
                                                                    <TableHead className="text-right">Comentarios</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {pedidos.map(pedido => (
                                                                    <TableRow key={pedido.id} className={cn("transition-colors", statusRowClass[pedido.status], pedido.comentarios && 'border-l-4 border-l-blue-400 bg-blue-50/50 hover:bg-blue-50/80')}>
                                                                        <TableCell className="font-semibold">{pedido.elaboracionNombre}</TableCell>
                                                                        <TableCell className="text-right font-mono">{pedido.cantidad.toFixed(2)} {formatUnit(pedido.unidad)}</TableCell>
                                                                        <TableCell>
                                                                            {pedido.status === 'Pendiente' ? (
                                                                                <Button size="sm" onClick={() => handleAccept(pedido.id)}>Aceptar Pedido</Button>
                                                                            ) : (
                                                                                <Badge variant={statusVariant[pedido.status]}>{pedido.status}</Badge>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <div><CommentDialog pedido={pedido} onSave={handleSaveComment} /></div>
                                                                                </TooltipTrigger>
                                                                                {pedido.comentarios && <TooltipContent><p className="max-w-xs">{pedido.comentarios}</p></TooltipContent>}
                                                                            </Tooltip>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
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
                                <Utensils className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">Todo al día</h3>
                                <p className="mt-1 text-sm text-muted-foreground">No hay pedidos de producción pendientes.</p>
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
