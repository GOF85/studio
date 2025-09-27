
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Factory, Calendar as CalendarIcon, Utensils, MessageSquare, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatUnit } from '@/lib/utils';
import type { PedidoPartner, PedidoEntrega, ProductoVenta, PedidoPartnerStatus } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type PedidoPartnerConEstado = PedidoPartner & {
    status: PedidoPartnerStatus;
    comentarios?: string;
}

const statusVariant: { [key in PedidoPartnerStatus]: 'default' | 'secondary' | 'outline' } = {
  'Pendiente': 'secondary',
  'En Producción': 'outline',
  'Listo para Entrega': 'default',
};

const statusRowClass: { [key in PedidoPartnerStatus]?: string } = {
  'En Producción': 'bg-yellow-50 hover:bg-yellow-100/80',
  'Listo para Entrega': 'bg-green-50 hover:bg-green-100/80',
};


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

    const loadData = useCallback(() => {
        const allEntregas = (JSON.parse(localStorage.getItem('entregas') || '[]') as PedidoEntrega[]).filter(os => os.status === 'Confirmado');
        const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const allProductosVenta = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
        
        const osMap = new Map(allEntregas.map(os => [os.id, os]));
        const productosMap = new Map(allProductosVenta.map(p => [p.id, p]));
        const partnerStatusData = JSON.parse(localStorage.getItem('partnerPedidosStatus') || '{}') as Record<string, { status: PedidoPartnerStatus; comentarios?: string }>;


        const partnerPedidos: PedidoPartnerConEstado[] = [];

        allPedidosEntrega.forEach(pedido => {
            const os = osMap.get(pedido.osId);
            if (!os) return;
            
            pedido.items.forEach(item => {
                const producto = productosMap.get(item.id);
                if (producto && producto.producidoPorPartner) {
                     const id = `${pedido.osId}-${item.id}`;
                     const statusInfo = partnerStatusData[id] || { status: 'Pendiente' };
                     partnerPedidos.push({
                        id,
                        osId: pedido.osId,
                        serviceNumber: os.serviceNumber,
                        cliente: os.client,
                        fechaEntrega: os.startDate,
                        horaEntrega: os.deliveryTime || '12:00',
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
        
        setPedidos(partnerPedidos);
        setIsMounted(true);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleStatusChange = (pedidoId: string, newStatus: PedidoPartnerStatus) => {
        const partnerStatusData = JSON.parse(localStorage.getItem('partnerPedidosStatus') || '{}');
        if (!partnerStatusData[pedidoId]) {
            partnerStatusData[pedidoId] = {};
        }
        partnerStatusData[pedidoId].status = newStatus;
        localStorage.setItem('partnerPedidosStatus', JSON.stringify(partnerStatusData));
        loadData(); // Recargar datos para reflejar el cambio
        toast({ title: 'Estado actualizado', description: `El estado del pedido ha sido cambiado a "${newStatus}".` });
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

    const pedidosAgrupados = useMemo(() => {
        const grouped: { [key: string]: PedidoPartnerConEstado[] } = {};
        pedidos.forEach(pedido => {
            const dateKey = format(new Date(pedido.fechaEntrega), 'yyyy-MM-dd');
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(pedido);
        });
        return Object.entries(grouped).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
    }, [pedidos]);


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Portal de Partner..." />;
    }

    return (
         <main className="container mx-auto px-4 py-8">
             <div className="flex items-center gap-4 border-b pb-4 mb-8">
                <Factory className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-headline font-bold tracking-tight">Portal de Partner de Producción</h1>
                    <p className="text-lg text-muted-foreground">Listado de elaboraciones de "Entregas" pendientes de producir.</p>
                </div>
            </div>
            
            {pedidosAgrupados.length > 0 ? (
                <Accordion type="multiple" defaultValue={pedidosAgrupados.map(([date]) => date)} className="w-full space-y-4">
                    {pedidosAgrupados.map(([date, dailyPedidos]) => (
                        <Card key={date}>
                             <AccordionItem value={date} className="border-none">
                                <AccordionTrigger className="p-4">
                                    <div className="flex items-center gap-3">
                                        <CalendarIcon className="h-6 w-6"/>
                                        <div className="text-left">
                                            <h3 className="text-xl font-bold capitalize">{format(new Date(date), 'EEEE, d \'de\' MMMM', {locale: es})}</h3>
                                            <p className="text-sm text-muted-foreground">{dailyPedidos.length} elaboraciones requeridas</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="border-t">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Elaboración</TableHead>
                                                    <TableHead className="text-right">Cantidad</TableHead>
                                                    <TableHead>Origen (OS - Cliente)</TableHead>
                                                    <TableHead>Hora Límite Entrega en CPR</TableHead>
                                                    <TableHead>Estado</TableHead>
                                                    <TableHead className="text-right">Comentarios</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {dailyPedidos.map(pedido => (
                                                    <TableRow key={pedido.id} className={cn(statusRowClass[pedido.status])}>
                                                        <TableCell className="font-semibold">{pedido.elaboracionNombre}</TableCell>
                                                        <TableCell className="text-right font-mono">{pedido.cantidad.toFixed(2)} {formatUnit(pedido.unidad)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary">{pedido.serviceNumber}</Badge>
                                                            <span className="text-sm text-muted-foreground ml-2">{pedido.cliente}</span>
                                                        </TableCell>
                                                        <TableCell>{pedido.horaEntrega}</TableCell>
                                                         <TableCell>
                                                            <Select value={pedido.status} onValueChange={(value: PedidoPartnerStatus) => handleStatusChange(pedido.id, value)}>
                                                                <SelectTrigger className="w-40 h-8 text-xs">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {Object.keys(statusVariant).map(s => (
                                                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end">
                                                                {pedido.comentarios && <MessageSquare className="h-4 w-4 text-muted-foreground mr-2" />}
                                                                <CommentDialog pedido={pedido} onSave={handleSaveComment} />
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
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

         </main>
    );
}
