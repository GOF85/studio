'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Search } from 'lucide-react';
import type { OrdenFabricacion } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const statusVariant: { [key in OrdenFabricacion['estado']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  'Pendiente': 'secondary',
  'En Proceso': 'outline',
  'Finalizado': 'default',
  'Incidencia': 'destructive',
  'Validado': 'default',
};

export default function CalidadPage() {
  const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrdenFabricacion['estado'] | 'all'>('Finalizado');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let storedData = localStorage.getItem('ordenesFabricacion');
    if (storedData) {
        setOrdenes(JSON.parse(storedData));
    }
    setIsMounted(true);
  }, []);
  
  const handleValidate = (ofId: string) => {
    const updatedOrdenes = ordenes.map(of => {
        if (of.id === ofId) {
            return { ...of, estado: 'Validado' as const };
        }
        return of;
    });
    setOrdenes(updatedOrdenes);
    localStorage.setItem('ordenesFabricacion', JSON.stringify(updatedOrdenes));
    toast({ title: 'Lote Validado', description: `La OF ${ofId} ha sido marcada como validada.` });
  };


  const filteredItems = useMemo(() => {
    return ordenes.filter(item => {
      const searchMatch = searchTerm === '' || 
                          item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.elaboracionNombre.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === 'all' || item.estado === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [ordenes, searchTerm, statusFilter]);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Control de Calidad..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
            <CheckCircle />
            Control de Calidad
          </h1>
          <p className="text-muted-foreground mt-1">Valida las elaboraciones producidas antes de que pasen a logística.</p>
        </div>
      </div>

       <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por Nº de Lote o Elaboración..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
         <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
            <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                {Object.keys(statusVariant).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lote / OF</TableHead>
              <TableHead>Elaboración</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Fecha Producción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map(of => (
                <TableRow
                  key={of.id}
                >
                  <TableCell className="font-medium cursor-pointer" onClick={() => router.push(`/cpr/of/${of.id}`)}>{of.id}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => router.push(`/cpr/of/${of.id}`)}>{of.elaboracionNombre}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => router.push(`/cpr/of/${of.id}`)}>{of.cantidadReal || of.cantidadTotal} {of.unidad}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => router.push(`/cpr/of/${of.id}`)}>{format(new Date(of.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => router.push(`/cpr/of/${of.id}`)}>
                    <Badge variant={statusVariant[of.estado]}>{of.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={of.estado !== 'Finalizado'}
                        onClick={() => handleValidate(of.id)}
                    >
                        Validar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No hay órdenes de fabricación con los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
