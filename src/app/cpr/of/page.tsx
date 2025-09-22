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
import { format } from 'date-fns';

const statusVariant: { [key in OrdenFabricacion['estado']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  'Pendiente': 'secondary',
  'Asignada': 'secondary',
  'En Proceso': 'outline',
  'Finalizado': 'default',
  'Incidencia': 'destructive',
  'Validado': 'default',
};

const partidas: PartidaProduccion[] = ['FRIO', 'CALIENTE', 'PASTELERIA'];

export default function OfPage() {
  const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [partidaFilter, setPartidaFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    // Cargar datos de prueba si no existen
    let storedData = localStorage.getItem('ordenesFabricacion');
    if (!storedData || JSON.parse(storedData).length === 0) {
        const dummyData: OrdenFabricacion[] = [
            { id: 'OF-2024-001', fechaCreacion: new Date().toISOString(), fechaProduccionPrevista: new Date().toISOString(), elaboracionId: 'elab-1', elaboracionNombre: 'Salsa Boloñesa Clásica', cantidadTotal: 15, unidad: 'KILO', partidaAsignada: 'CALIENTE', estado: 'Pendiente', osIDs: ['OS-2024-001'] },
            { id: 'OF-2024-002', fechaCreacion: new Date().toISOString(), fechaProduccionPrevista: new Date().toISOString(), elaboracionId: 'elab-2', elaboracionNombre: 'Bechamel Ligera', cantidadTotal: 8, unidad: 'LITRO', partidaAsignada: 'CALIENTE', estado: 'En Proceso', responsable: 'Ana López', osIDs: ['OS-2024-001'] },
        ];
        storedData = JSON.stringify(dummyData);
        localStorage.setItem('ordenesFabricacion', storedData);
        setOrdenes(dummyData);
    } else {
        setOrdenes(JSON.parse(storedData));
    }
    setIsMounted(true);
  }, []);

  const filteredItems = useMemo(() => {
    return ordenes.filter(item => {
      const searchMatch = searchTerm === '' || 
                          item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.elaboracionNombre.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === 'all' || item.estado === statusFilter;
      const partidaMatch = partidaFilter === 'all' || item.partidaAsignada === partidaFilter;
      return searchMatch && statusMatch && partidaMatch;
    });
  }, [ordenes, searchTerm, statusFilter, partidaFilter]);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Órdenes de Fabricación..." />;
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
         <Button onClick={() => {}} disabled>
            <PlusCircle className="mr-2"/>
            Nueva OF Manual
        </Button>
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
         <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                {Object.keys(statusVariant).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
        </Select>
        <Select value={partidaFilter} onValueChange={setPartidaFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filtrar por partida" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todas las Partidas</SelectItem>
                {partidas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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
              <TableHead>Partida</TableHead>
              <TableHead>Fecha Prevista</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map(of => (
                <TableRow
                  key={of.id}
                  onClick={() => router.push(`/cpr/of/${of.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{of.id}</TableCell>
                  <TableCell>{of.elaboracionNombre}</TableCell>
                  <TableCell>{of.cantidadTotal} {of.unidad}</TableCell>
                  <TableCell><Badge variant="secondary">{of.partidaAsignada}</Badge></TableCell>
                  <TableCell>{format(new Date(of.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[of.estado]}>{of.estado}</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
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
