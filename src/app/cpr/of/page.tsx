

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, Search, PlusCircle, Trash2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

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
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

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
    setSelectedRows(new Set());
  };

  const handleSelectRow = (id: string, checked: boolean | 'indeterminate') => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  };
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) {
      const allIds = new Set(filteredAndSortedItems.map(item => item.id));
      setSelectedRows(allIds);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) return;
    
    const updatedOrdenes = ordenes.filter(of => !selectedRows.has(of.id));
    localStorage.setItem('ordenesFabricacion', JSON.stringify(updatedOrdenes));
    setOrdenes(updatedOrdenes);
    setSelectedRows(new Set());
    setShowDeleteConfirm(false);
    toast({
      title: 'Órdenes eliminadas',
      description: `Se han eliminado ${selectedRows.size} órdenes de fabricación.`
    });
  }

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Órdenes de Fabricación..." />;
  }

  const ceilToTwoDecimals = (num?: number | null) => {
    if (num === null || num === undefined) return '-';
    return formatNumber(num, 2);
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
              <Factory />
              Órdenes de Fabricación
            </h1>
          </div>
          <Button asChild>
              <Link href="/cpr/of/nuevo">
                <PlusCircle className="mr-2"/>
                Nueva OF Manual
              </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-4 mb-4">
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
               <Button 
                variant="destructive" 
                disabled={selectedRows.size === 0}
                onClick={() => setShowDeleteConfirm(true)}
              >
                  <Trash2 className="mr-2" />
                  Eliminar Seleccionadas ({selectedRows.size})
              </Button>
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
                <TableHead className="w-12">
                   <Checkbox 
                     checked={selectedRows.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0}
                     onCheckedChange={handleSelectAll}
                   />
                </TableHead>
                <TableHead>Lote / OF</TableHead>
                <TableHead>Elaboración</TableHead>
                <TableHead>Cant. Planificada</TableHead>
                <TableHead>Cant. Producida</TableHead>
                <TableHead>Fecha Prevista</TableHead>
                <TableHead>Fecha Asignación</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedItems.length > 0 ? (
                filteredAndSortedItems.map(of => (
                  <TableRow
                    key={of.id}
                    onClick={() => router.push(`/cpr/of/${of.id}`)}
                    className={cn(
                        "cursor-pointer", 
                        of.partidaAsignada && partidaColorClasses[of.partidaAsignada],
                        selectedRows.has(of.id) && 'bg-primary/10 hover:bg-primary/20'
                    )}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                            checked={selectedRows.has(of.id)}
                            onCheckedChange={(checked) => handleSelectRow(of.id, checked)}
                        />
                    </TableCell>
                    <TableCell className="font-medium">{of.id}</TableCell>
                    <TableCell>{of.elaboracionNombre}</TableCell>
                    <TableCell>{ceilToTwoDecimals(of.cantidadTotal)} {formatUnit(of.unidad)}</TableCell>
                    <TableCell>{ceilToTwoDecimals(of.cantidadReal)} {of.cantidadReal ? formatUnit(of.unidad) : ''}</TableCell>
                    <TableCell>{format(new Date(of.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{of.fechaAsignacion ? format(new Date(of.fechaAsignacion), 'dd/MM/yy HH:mm') : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[of.estado]}>{of.estado}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No se encontraron órdenes de fabricación.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán permanentemente {selectedRows.size} órdenes de fabricación. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteSelected}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

