
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChefHat } from 'lucide-react';
import type { OrdenFabricacion, Personal } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const statusVariant: { [key in OrdenFabricacion['estado']]: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' } = {
  'Pendiente': 'secondary',
  'Asignada': 'default',
  'En Proceso': 'outline',
  'Finalizado': 'success',
  'Incidencia': 'destructive',
  'Validado': 'success',
};

export default function ProduccionPage() {
  const [personalCPR, setPersonalCPR] = useState<Personal[]>([]);
  const [selectedCocinero, setSelectedCocinero] = useState<string | null>(null);
  const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const allPersonal = (JSON.parse(localStorage.getItem('personal') || '[]') as Personal[]).filter(p => p.departamento === 'CPR');
    setPersonalCPR(allPersonal);
    
    const allOFs = (JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[]);
    setOrdenes(allOFs);

    const lastSelected = localStorage.getItem('lastSelectedCocinero');
    if(lastSelected) {
        setSelectedCocinero(lastSelected);
    }
    setIsMounted(true);
  }, []);

  const handleSelectCocinero = (cocinero: string) => {
    setSelectedCocinero(cocinero);
    localStorage.setItem('lastSelectedCocinero', cocinero);
  }

  const filteredOrdenes = useMemo(() => {
    if (!selectedCocinero) return [];
    return ordenes
      .filter(of => of.responsable === selectedCocinero && (of.estado === 'Asignada' || of.estado === 'En Proceso'))
      .sort((a, b) => new Date(a.fechaProduccionPrevista).getTime() - new Date(b.fechaProduccionPrevista).getTime());
  }, [ordenes, selectedCocinero]);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Taller de Producción..." />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col items-center gap-4 mb-8">
        <ChefHat className="h-16 w-16 text-primary" />
        <h1 className="text-4xl font-headline font-bold">Taller de Producción</h1>
        <div className="w-full max-w-sm">
            <Select onValueChange={handleSelectCocinero} value={selectedCocinero || ''}>
                <SelectTrigger className="h-12 text-lg">
                    <SelectValue placeholder="Selecciona tu nombre para empezar..." />
                </SelectTrigger>
                <SelectContent>
                    {personalCPR.map(p => <SelectItem key={p.id} value={p.nombre}>{p.nombre} {p.apellidos}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </div>

      {selectedCocinero && (
         <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Elaboración</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredOrdenes.length > 0 ? (
                        filteredOrdenes.map(of => (
                            <TableRow 
                                key={of.id} 
                                onClick={() => router.push(`/cpr/produccion/${of.id}`)}
                                className={cn("cursor-pointer text-base", of.estado === 'En Proceso' && 'bg-blue-100/50 font-bold')}
                            >
                                <TableCell className="py-4">{of.elaboracionNombre}</TableCell>
                                <TableCell className="py-4">{format(new Date(of.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="py-4">{of.cantidadTotal} {of.unidad}</TableCell>
                                <TableCell className="py-4"><Badge variant={statusVariant[of.estado]}>{of.estado}</Badge></TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-48 text-center text-lg text-muted-foreground">
                                No tienes órdenes de fabricación asignadas.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
         </div>
      )}
    </div>
  );
}
