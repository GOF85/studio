

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Utensils, ArrowLeft } from 'lucide-react';
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
  const [gastronomyItems, setGastronomyItems] = useState<ComercialBriefingItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  const loadAndSyncData = useCallback(() => {
    if (!osId) return;

    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const currentBriefing = allBriefings.find(b => b.osId === osId);
    
    if (!currentBriefing) {
        // If no briefing, create one. This case should ideally be handled when an OS is created.
        const newBriefing: ComercialBriefing = { osId, items: [] };
        allBriefings.push(newBriefing);
        localStorage.setItem('comercialBriefings', JSON.stringify(allBriefings));
        setGastronomyItems([]);
        return;
    }

    const gastronomicHitos = currentBriefing.items.filter(item => item.conGastronomia);
    
    setGastronomyItems(gastronomicHitos);
    
  }, [osId]);

  useEffect(() => {
    loadAndSyncData();
    setIsMounted(true);
    
    const handleStorageChange = () => loadAndSyncData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadAndSyncData]);

  const sortedGastronomyItems = useMemo(() => {
    return [...gastronomyItems]
        .sort((a, b) => {
            const dateA = new Date(a.fecha);
            const dateB = new Date(b.fecha);
            const dateComparison = dateA.getTime() - dateB.getTime();
            if (dateComparison !== 0) return dateComparison;
            return a.horaInicio.localeCompare(b.horaInicio);
    });
  }, [gastronomyItems]);
  
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
                        {sortedGastronomyItems.length > 0 ? (
                            sortedGastronomyItems.map(item => (
                            <TableRow 
                                key={item.id} 
                                onClick={() => router.push(`/os/${osId}/gastronomia/${item.id}`)} 
                                className={cn(
                                    "cursor-pointer", 
                                    item.descripcion.toLowerCase() === 'prueba de menu' && "bg-muted hover:bg-muted/80"
                                )}
                            >
                                <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{item.horaInicio}</TableCell>
                                <TableCell className="min-w-[200px] font-medium">{item.descripcion}</TableCell>
                                <TableCell>{item.asistentes}</TableCell>
                                <TableCell className="min-w-[200px]">{item.comentarios}</TableCell>
                                <TableCell>
                                    <Badge variant={statusVariant[item.status || 'Pendiente']}>{item.status || 'Pendiente'}</Badge>
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
