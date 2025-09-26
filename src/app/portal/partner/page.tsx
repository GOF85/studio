'use client';

import { useState, useEffect, useMemo } from 'react';
import { Factory, Calendar as CalendarIcon, ChevronDown, Utensils } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatUnit } from '@/lib/utils';
import type { PedidoPartner, ServiceOrder, PedidoEntrega, Receta, Elaboracion } from '@/types';


export default function PartnerPortalPage() {
    const [pedidos, setPedidos] = useState<PedidoPartner[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
        const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        
        const osMap = new Map(allServiceOrders.map(os => [os.id, os]));
        const recetasMap = new Map(allRecetas.map(r => [r.id, r]));
        const elabMap = new Map(allElaboraciones.map(e => [e.id, e]));

        const partnerPedidos: PedidoPartner[] = [];

        allPedidosEntrega.forEach(pedido => {
            const os = osMap.get(pedido.osId);
            if (!os || os.vertical !== 'Entregas') return;
            
            pedido.items.forEach(item => {
                if (item.type === 'receta') {
                    const receta = recetasMap.get(item.id);
                    receta?.elaboraciones.forEach(elabEnReceta => {
                        const elaboracion = elabMap.get(elabEnReceta.elaboracionId);
                        // TODO: Implementar el campo 'producidoPor' en la elaboración/receta.
                        // Por ahora, para la demo, simularemos que todas las de "Entregas" son del partner.
                        if (elaboracion) {
                             partnerPedidos.push({
                                id: `${pedido.osId}-${item.id}-${elabEnReceta.id}`,
                                osId: pedido.osId,
                                serviceNumber: os.serviceNumber,
                                cliente: os.client,
                                fechaEntrega: os.startDate,
                                horaEntrega: os.deliveryTime || '12:00',
                                elaboracionId: elaboracion.id,
                                elaboracionNombre: elaboracion.nombre,
                                cantidad: item.quantity * elabEnReceta.cantidad,
                                unidad: elaboracion.unidadProduccion,
                                status: 'Pendiente',
                            });
                        }
                    });
                }
            });
        });
        
        setPedidos(partnerPedidos);
        setIsMounted(true);
    }, []);

    const pedidosAgrupados = useMemo(() => {
        const grouped: { [key: string]: PedidoPartner[] } = {};
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
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {dailyPedidos.map(pedido => (
                                                    <TableRow key={pedido.id}>
                                                        <TableCell className="font-semibold">{pedido.elaboracionNombre}</TableCell>
                                                        <TableCell className="text-right font-mono">{pedido.cantidad.toFixed(2)} {formatUnit(pedido.unidad)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary">{pedido.serviceNumber}</Badge>
                                                            <span className="text-sm text-muted-foreground ml-2">{pedido.cliente}</span>
                                                        </TableCell>
                                                        <TableCell>{pedido.horaEntrega}</TableCell>
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
