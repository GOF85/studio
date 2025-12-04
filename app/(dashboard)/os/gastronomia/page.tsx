

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Utensils, ArrowLeft } from 'lucide-react';
import type { ServiceOrder, ComercialBriefing, GastronomyOrder, GastronomyOrderStatus } from '@/types';
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
                return { ...existingOrder, ...briefingItem, osId };
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
    const finalOrders: GastronomyOrder[] = syncedOrders.filter(order => briefingItemIds.has(order.id)) as unknown as GastronomyOrder[];
    if (osGastroOrders.length !== finalOrders.length) {
        needsUpdate = true;
    }

    const otherOsGastroOrders = allGastroOrders.filter(order => order.osId !== osId);
    
    if (needsUpdate) {
        const updatedAllOrders = [...otherOsGastroOrders, ...finalOrders];
        localStorage.setItem('gastronomyOrders', JSON.stringify(updatedAllOrders));
        setGastronomyOrders(finalOrders);
    } else {
        setGastronomyOrders(osGastroOrders);
    }

  }, [osId, toast]);

  useEffect(() => {
    if (osId) {
      loadAndSyncOrders();
    }
    setIsMounted(true);
  }, [osId, loadAndSyncOrders]);

  const sortedGastronomyOrders = useMemo(() => {
    return [...gastronomyOrders].sort((a, b) => {
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
                                onClick={() => router.push(`/gastronomia/pedido?osId=${osId}&briefingItemId=${order.id}`)} 
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
