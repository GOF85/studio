'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Utensils, ArrowLeft, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { ServiceOrder, ComercialBriefing, ComercialBriefingItem, GastronomyOrder, GastronomyOrderStatus } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const statusVariant: { [key in GastronomyOrderStatus]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  Pendiente: 'secondary',
  'En preparación': 'outline',
  Listo: 'default',
  Incidencia: 'destructive',
};

const statusOptions: GastronomyOrderStatus[] = ['Pendiente', 'En preparación', 'Listo', 'Incidencia'];

export default function GastronomiaPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [gastronomyOrders, setGastronomyOrders] = useState<GastronomyOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const { toast } = useToast();

  const loadAndSyncOrders = useCallback(() => {
    if (!osId) return;

    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const currentBriefing = allBriefings.find(b => b.osId === osId);
    const briefingItemsWithGastro = currentBriefing?.items.filter(item => item.conGastronomia) || [];
    
    let allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    let osGastroOrders = allGastroOrders.filter(order => order.osId === osId);

    let needsUpdate = false;
    
    // Sync: Add new orders from briefing, update existing ones
    const syncedOrders = briefingItemsWithGastro.map(briefingItem => {
        const existingOrder = osGastroOrders.find(o => o.id === briefingItem.id);
        if (existingOrder) {
            // Update if data differs, but keep status
            if (JSON.stringify({ ...existingOrder, status: null }) !== JSON.stringify({ ...briefingItem, osId, status: null })) {
                needsUpdate = true;
                return { ...briefingItem, osId, status: existingOrder.status };
            }
            return existingOrder;
        } else {
            // Add new order
            needsUpdate = true;
            return { ...briefingItem, osId, status: 'Pendiente' as GastronomyOrderStatus };
        }
    });

    // Sync: Remove orders that are no longer in the briefing
    const briefingItemIds = new Set(briefingItemsWithGastro.map(i => i.id));
    const finalOrders = syncedOrders.filter(order => briefingItemIds.has(order.id));
    if (osGastroOrders.length !== finalOrders.length) {
        needsUpdate = true;
    }

    const otherOsGastroOrders = allGastroOrders.filter(order => order.osId !== osId);
    
    if (needsUpdate) {
        localStorage.setItem('gastronomyOrders', JSON.stringify([...otherOsGastroOrders, ...finalOrders]));
        setGastronomyOrders(finalOrders);
        toast({ title: "Sincronizado", description: "Los pedidos de gastronomía se han actualizado desde el briefing comercial." });
    } else {
        setGastronomyOrders(osGastroOrders);
    }

  }, [osId, toast]);

  useEffect(() => {
    setIsMounted(true);
    if (osId) {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allServiceOrders.find(os => os.id === osId);
      setServiceOrder(currentOS || null);
      loadAndSyncOrders();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
      router.push('/pes');
    }
  }, [osId, router, toast, loadAndSyncOrders]);

  const handleStatusChange = (orderId: string, newStatus: GastronomyOrderStatus) => {
    const updatedOrders = gastronomyOrders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    setGastronomyOrders(updatedOrders);
    
    const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    const otherOsOrders = allGastroOrders.filter(o => o.osId !== osId);
    localStorage.setItem('gastronomyOrders', JSON.stringify([...otherOsOrders, ...updatedOrders]));

    toast({ title: 'Estado actualizado' });
  };
  
  if (!isMounted || !serviceOrder) {
    return null; // or a loading skeleton
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div>
                <Button variant="ghost" size="sm" onClick={() => router.push(`/os?id=${osId}`)} className="mb-2">
                    <ArrowLeft className="mr-2" />
                    Volver a la OS
                </Button>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Utensils />Módulo de Gastronomía</h1>
                <p className="text-muted-foreground">OS: {serviceOrder.serviceNumber} - {serviceOrder.client}</p>
            </div>
            <Button onClick={loadAndSyncOrders}>
                Sincronizar con Briefing
            </Button>
        </div>

        <Card>
            <CardHeader><CardTitle>Pedidos de Gastronomía Generados</CardTitle></CardHeader>
            <CardContent>
                 <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Hora</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Sala</TableHead>
                            <TableHead>Asistentes</TableHead>
                            <TableHead>Bebidas</TableHead>
                            <TableHead>Mat. Bebida</TableHead>
                            <TableHead>Mat. Gastro</TableHead>
                            <TableHead>Mantelería</TableHead>
                            <TableHead>Comentarios</TableHead>
                            <TableHead>Estado</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {gastronomyOrders.length > 0 ? (
                            gastronomyOrders.map(order => (
                            <TableRow key={order.id}>
                                <TableCell>{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{order.horaInicio}</TableCell>
                                <TableCell className="min-w-[200px] font-medium">{order.descripcion}</TableCell>
                                <TableCell>{order.sala}</TableCell>
                                <TableCell>{order.asistentes}</TableCell>
                                <TableCell>{order.bebidas}</TableCell>
                                <TableCell>{order.matBebida}</TableCell>
                                <TableCell>{order.materialGastro}</TableCell>
                                <TableCell>{order.manteleria}</TableCell>
                                <TableCell className="min-w-[200px]">{order.comentarios}</TableCell>
                                <TableCell>
                                    <Select value={order.status} onValueChange={(value: GastronomyOrderStatus) => handleStatusChange(order.id, value)}>
                                        <SelectTrigger className="w-[150px]">
                                            <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map(status => (
                                                <SelectItem key={status} value={status}>
                                                    <Badge variant={statusVariant[status]}>{status}</Badge>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={11} className="h-24 text-center">
                                No hay pedidos de gastronomía. Activa la opción "Con gastronomía" en los hitos del briefing comercial.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </main>
    </>
  );
}
