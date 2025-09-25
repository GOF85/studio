

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, Search, PlusCircle } from 'lucide-react';
import type { OrdenFabricacion, PartidaProduccion } from '@/types';
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
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { formatNumber, formatUnit } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const statusVariant: { [key in OrdenFabricacion['estado']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  'Pendiente': 'secondary',
  'Asignada': 'secondary',
  'En Proceso': 'outline',
  'Finalizado': 'default',
  'Incidencia': 'destructive',
  'Validado': 'default',
};

const partidaColorClasses: Record<PartidaProduccion, string> = {
    FRIO: 'bg-green-100/50 hover:bg-green-100/80',
    CALIENTE: 'bg-red-100/50 hover:bg-red-100/80',
    PASTELERIA: 'bg-blue-100/50 hover:bg-blue-100/80',
    EXPEDICION: 'bg-yellow-100/50 hover:bg-yellow-100/80'
};

const partidas: PartidaProduccion[] = ['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION'];
const statusOptions = Object.keys(statusVariant) as OrdenFabricacion['estado'][];

export default function OfPage() {
  const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Pendiente');
  const [partidaFilter, setPartidaFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    let storedData = localStorage.getItem('ordenesFabricacion');
    setOrdenes(storedData ? JSON.parse(storedData) : []);
    setIsMounted(true);
  }, []);

  const filteredAndSortedItems = useMemo(() => {
    const statusOrder: OrdenFabricacion['estado'][] = ['Pendiente', 'Asignada', 'En Proceso', 'Finalizado', 'Validado', 'Incidencia'];
    
    return ordenes
      .filter(item => {
        const searchMatch = searchTerm === '' || 
                            item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.elaboracionNombre.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'all' || item.estado === statusFilter;
        const partidaMatch = partidaFilter === 'all' || item.partidaAsignada === partidaFilter;
        return searchMatch && statusMatch && partidaMatch;
      })
      .sort((a, b) => {
        // Prioritize 'Pendiente' status
        if (a.estado === 'Pendiente' && b.estado !== 'Pendiente') return -1;
        if (a.estado !== 'Pendiente' && b.estado === 'Pendiente') return 1;

        // Then sort by date descending
        const dateA = parseISO(a.fechaProduccionPrevista);
        const dateB = parseISO(b.fechaProduccionPrevista);
        return dateB.getTime() - dateA.getTime();
      });
  }, [ordenes, searchTerm, statusFilter, partidaFilter]);
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('Pendiente');
    setPartidaFilter('all');
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Órdenes de Fabricación..." />;
  }

  const ceilToTwoDecimals = (num?: number | null) => {
    if (num === null || num === undefined) return '-';
    return formatNumber(num, 2);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
            <Factory />
            Órdenes de Fabricación
          </h1>
          <p className="text-muted-foreground mt-1">Gestiona el estado y la asignación de la producción.</p>
        </div>
         <Button asChild>
            <Link href="/cpr/of/nuevo">
              <PlusCircle className="mr-2"/>
              Nueva OF Manual
            </Link>
        </Button>
      </div>

       <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
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
             <Select value={partidaFilter} onValueChange={setPartidaFilter}>
                <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue placeholder="Filtrar por partida" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas las Partidas</SelectItem>
                    {partidas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
        <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Estado:</span>
            <div className="flex flex-wrap gap-1">
                <Button variant={statusFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('all')}>Todos</Button>
                {statusOptions.map(s => (
                    <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>{s}</Button>
                ))}
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-muted-foreground ml-auto">Limpiar Filtros</Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lote / OF</TableHead>
              <TableHead>Elaboración</TableHead>
              <TableHead>Cant. Planificada</TableHead>
              <TableHead>Cant. Producida</TableHead>
              <TableHead>Partida</TableHead>
              <TableHead>Fecha Prevista</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedItems.length > 0 ? (
              filteredAndSortedItems.map(of => (
                <TableRow
                  key={of.id}
                  onClick={() => router.push(`/cpr/of/${of.id}`)}
                  className={cn("cursor-pointer", partidaColorClasses[of.partidaAsignada])}
                >
                  <TableCell className="font-medium">{of.id}</TableCell>
                  <TableCell>{of.elaboracionNombre}</TableCell>
                  <TableCell>{ceilToTwoDecimals(of.cantidadTotal)} {formatUnit(of.unidad)}</TableCell>
                  <TableCell>{ceilToTwoDecimals(of.cantidadReal)} {of.cantidadReal ? formatUnit(of.unidad) : ''}</TableCell>
                  <TableCell><Badge variant="secondary">{of.partidaAsignada}</Badge></TableCell>
                  <TableCell>{format(new Date(of.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[of.estado]}>{of.estado}</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No se encontraron órdenes de fabricación.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
