'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Search } from 'lucide-react';
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

const partidas: PartidaProduccion[] = ['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION'];

export default function IncidenciasPage() {
  const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [partidaFilter, setPartidaFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    let storedData = localStorage.getItem('ordenesFabricacion');
    if (storedData) {
        const allOFs = JSON.parse(storedData) as OrdenFabricacion[];
        setOrdenes(allOFs.filter(of => of.estado === 'Incidencia'));
    }
    setIsMounted(true);
  }, []);

  const filteredItems = useMemo(() => {
    return ordenes.filter(item => {
      const searchMatch = searchTerm === '' || 
                          item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.elaboracionNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.responsable || '').toLowerCase().includes(searchTerm.toLowerCase());
      const partidaMatch = partidaFilter === 'all' || item.partidaAsignada === partidaFilter;
      return searchMatch && partidaMatch;
    });
  }, [ordenes, searchTerm, partidaFilter]);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Informe de Incidencias..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
            <AlertTriangle className="text-destructive" />
            Informe de Incidencias
          </h1>
          <p className="text-muted-foreground mt-1">Revisa los lotes que han sido marcados con incidencias durante la producción.</p>
        </div>
      </div>

       <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por Lote, Elaboración o Responsable..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
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
              <TableHead>Fecha Prevista</TableHead>
              <TableHead>Partida</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Observaciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map(of => (
                <TableRow
                  key={of.id}
                  onClick={() => router.push(`/cpr/of/${of.id}`)}
                  className="cursor-pointer hover:bg-destructive/10"
                >
                  <TableCell className="font-medium font-mono">{of.id}</TableCell>
                  <TableCell>{of.elaboracionNombre}</TableCell>
                  <TableCell>{format(new Date(of.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                  <TableCell><Badge variant="secondary">{of.partidaAsignada}</Badge></TableCell>
                  <TableCell>{of.responsable}</TableCell>
                  <TableCell className="max-w-xs truncate">{of.incidenciaObservaciones}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No hay incidencias registradas con los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
