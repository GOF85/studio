

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
import { useGastronomyOrders, useComercialBriefings, useEvento } from '@/hooks/use-data-queries';

const statusVariant: { [key in GastronomyOrderStatus]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  Pendiente: 'secondary',
  'En preparación': 'outline',
  Listo: 'default',
  Incidencia: 'destructive',
};

export default function GastronomiaPage() {
  const router = useRouter();
  const params = useParams() ?? {};
  const osId = (params.id as string) || '';
  const { toast } = useToast();

  const { data: evento, isLoading: loadingOS } = useEvento(osId);
  const { data: briefings = [], isLoading: loadingBriefings } = useComercialBriefings(osId);
  const { data: gastronomyOrders = [], isLoading: loadingGastro } = useGastronomyOrders(osId);

  const briefingItemsWithGastro = useMemo(() => {
    const currentBriefing = briefings[0]; // Assuming one briefing per OS for now
    return currentBriefing?.items.filter(item => item.conGastronomia) || [];
  }, [briefings]);

  const sortedGastronomyOrders = useMemo(() => {
    // We show orders that exist in Supabase. 
    // If a briefing item has conGastronomia but no order exists, we might want to show it as "Pending creation"
    // but for now let's just show what's in Supabase.
    return [...gastronomyOrders].sort((a, b) => a.id.localeCompare(b.id));
  }, [gastronomyOrders]);

  if (loadingOS || loadingBriefings || loadingGastro) {
    return <LoadingSkeleton title="Cargando Módulo de Gastronomía..." />;
  }

  return (
    <>
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Utensils /> Gastronomía</h1>
                <p className="text-muted-foreground">Gestión de pedidos gastronómicos para la OS: {evento?.serviceNumber}</p>
            </div>
        </div>

        <Card>
            <CardHeader><CardTitle>Pedidos de Gastronomía Generados</CardTitle></CardHeader>
            <CardContent>
                 <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>ID Pedido</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Estado</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {sortedGastronomyOrders.length > 0 ? (
                            sortedGastronomyOrders.map(order => (
                            <TableRow 
                                key={order.id} 
                                onClick={() => router.push(`/gastronomia/pedido?osId=${osId}&orderId=${order.id}`)} 
                                className={cn(
                                    "cursor-pointer", 
                                    order.id && "hover:bg-muted/50"
                                )}
                            >
                                <TableCell className="font-mono text-xs">{order.id.substring(0, 8)}</TableCell>
                                <TableCell className="min-w-[200px] font-medium">
                                    {order.items?.[0]?.nombre || 'Pedido Gastronómico'}
                                </TableCell>
                                <TableCell>{order.items?.length || 0}</TableCell>
                                <TableCell>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(order.total)}</TableCell>
                                <TableCell>
                                    <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
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

