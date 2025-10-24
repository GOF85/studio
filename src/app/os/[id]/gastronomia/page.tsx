
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Utensils } from 'lucide-react';
import type { ServiceOrder, ComercialBriefing, GastronomyOrder, GastronomyOrderStatus, ComercialBriefingItem } from '@/types';
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
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';

const statusVariant: { [key in GastronomyOrderStatus]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  Pendiente: 'secondary',
  'En preparación': 'outline',
  Listo: 'default',
  Incidencia: 'destructive',
};

export default function GastronomiaPage() {
  const [gastronomyOrders, setGastronomyOrders] = useState<GastronomyOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  const loadAndSyncData = useCallback(() => {
    if (!osId) return;

    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const currentBriefing = allBriefings.find(b => b.osId === osId);
    
    const briefingItemsWithGastro = currentBriefing?.items.filter(item => item.conGastronomia) || [];
    
    let allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    let osGastroOrders = allGastroOrders.filter(order => order.osId === osId);

    let needsUpdate = false;
    
    briefingItemsWithGastro.forEach(briefingItem => {
        const existingOrder = osGastroOrders.find(o => o.id === briefingItem.id);
        if (!existingOrder) {
            const newOrder: GastronomyOrder = {
                id: briefingItem.id,
                osId: osId,
                status: 'Pendiente',
                descripcion: briefingItem.descripcion,
                fecha: briefingItem.fecha,
                horaInicio: briefingItem.horaInicio,
                asistentes: briefingItem.asistentes,
                comentarios: briefingItem.comentarios,
                sala: briefingItem.sala,
                items: [],
                total: 0,
            };
            osGastroOrders.push(newOrder);
            needsUpdate = true;
        } else {
            const hasChanged = 
              existingOrder.descripcion !== briefingItem.descripcion ||
              existingOrder.fecha !== briefingItem.fecha ||
              existingOrder.horaInicio !== briefingItem.horaInicio ||
              existingOrder.asistentes !== briefingItem.asistentes ||
              existingOrder.comentarios !== briefingItem.comentarios ||
              existingOrder.sala !== briefingItem.sala;

            if (hasChanged) {
                Object.assign(existingOrder, {
                    descripcion: briefingItem.descripcion,
                    fecha: briefingItem.fecha,
                    horaInicio: briefingItem.horaInicio,
                    asistentes: briefingItem.asistentes,
                    comentarios: briefingItem.comentarios,
                    sala: briefingItem.sala,
                });
                needsUpdate = true;
            }
        }
    });

    const briefingItemIds = new Set(briefingItemsWithGastro.map(i => i.id));
    const finalOsGastroOrders = osGastroOrders.filter(order => briefingItemIds.has(order.id));
    if(osGastroOrders.length !== finalOsGastroOrders.length) {
        needsUpdate = true;
    }

    if (needsUpdate) {
        const otherOsGastroOrders = allGastroOrders.filter(order => order.osId !== osId);
        const updatedAllOrders = [...otherOsGastroOrders, ...finalOsGastroOrders];
        localStorage.setItem('gastronomyOrders', JSON.stringify(updatedAllOrders));
        setGastronomyOrders(finalOsGastroOrders);
    } else {
        setGastronomyOrders(osGastroOrders);
    }
    
    setIsMounted(true);
  }, [osId]);

  useEffect(() => {
    loadAndSyncData();
  }, [loadAndSyncData]);

  const sortedGastronomyOrders = useMemo(() => {
    return [...gastronomyOrders]
        .sort((a, b) => {
            const dateA = new Date(a.fecha);
            const dateB = new Date(b.fecha);
            const dateComparison = dateA.getTime() - dateB.getTime();
            if (dateComparison !== 0) return dateComparison;
            return a.horaInicio.localeCompare(b.horaInicio);
    });
  }, [gastronomyOrders]);
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Módulo de Gastronomía..." />;
  }

  return (
    <>
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
                            <TableHead>Asistentes</TableHead>
                            <TableHead>Comentarios</TableHead>
                            <TableHead>Estado</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {sortedGastronomyOrders.length > 0 ? (
                            sortedGastronomyOrders.map(order => (
                            <TableRow 
                                key={order.id} 
                                onClick={() => router.push(`/os/${osId}/gastronomia/${order.id}`)} 
                                className={cn(
                                    "cursor-pointer", 
                                    order.descripcion.toLowerCase() === 'prueba de menu' && "bg-muted hover:bg-muted/80"
                                )}
                            >
                                <TableCell>{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{order.horaInicio}</TableCell>
                                <TableCell className="min-w-[200px] font-medium">{order.descripcion}</TableCell>
                                <TableCell>{order.asistentes}</TableCell>
                                <TableCell className="min-w-[200px]">{order.comentarios}</TableCell>
                                <TableCell>
                                    <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No hay pedidos de gastronomía. Activa la opción "Con gastronomía" en las entregas del briefing comercial.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </>
  );
}
