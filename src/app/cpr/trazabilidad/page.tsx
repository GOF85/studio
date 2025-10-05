

'use client';

import { useState, useMemo, useEffect } from 'react';
import { History, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { OrdenFabricacion } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';

const ITEMS_PER_PAGE = 20;

const statusVariant: { [key in OrdenFabricacion['estado']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  'Pendiente': 'secondary',
  'Asignada': 'secondary',
  'En Proceso': 'outline',
  'Finalizado': 'default',
  'Incidencia': 'destructive',
  'Validado': 'default',
};

export default function TrazabilidadPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [allOFs, setAllOFs] = useState<OrdenFabricacion[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  
  useEffect(() => {
    const storedOFs: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]');
    const sortedOFs = storedOFs.sort((a, b) => {
        const dateA = new Date(a.fechaFinalizacion || a.fechaCreacion);
        const dateB = new Date(b.fechaFinalizacion || b.fechaCreacion);
        return dateB.getTime() - dateA.getTime();
    });
    setAllOFs(sortedOFs);
  }, []);

  const filteredItems = useMemo(() => {
    return allOFs.filter(item => {
      const term = searchTerm.toLowerCase();
      return (
        item.id.toLowerCase().includes(term) ||
        item.elaboracionNombre.toLowerCase().includes(term) ||
        (item.responsable || '').toLowerCase().includes(term)
      );
    });
  }, [allOFs, searchTerm]);
  
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };


  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
            <History />
            Trazabilidad de Lotes
          </h1>
          <p className="text-muted-foreground mt-1">Busca un lote (OF) o navega por el historial de producción.</p>
        </div>
      </div>

       <div className="flex flex-col md:flex-row gap-4 mb-4">
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
      </div>
      
      <div className="flex items-center justify-end gap-2 mb-4">
        <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages || 1}</span>
        <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lote / OF</TableHead>
              <TableHead>Elaboración</TableHead>
              <TableHead>Fecha Prod.</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Responsable</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map(of => (
                <TableRow
                  key={of.id}
                  onClick={() => router.push(`/cpr/of/${of.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium font-mono">{of.id}</TableCell>
                  <TableCell>{of.elaboracionNombre}</TableCell>
                  <TableCell>{format(new Date(of.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                   <TableCell>
                    <Badge variant={statusVariant[of.estado]}>{of.estado}</Badge>
                  </TableCell>
                  <TableCell>{of.responsable}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
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
