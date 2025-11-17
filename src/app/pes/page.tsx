
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, ClipboardList, Star, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { ServiceOrder } from '@/types';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDataStore } from '@/hooks/use-data-store';

export default function PrevisionServiciosPage() {
  const { data, isLoaded, loadAllData } = useDataStore();
  const serviceOrders = data.serviceOrders || [];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!isLoaded) {
      loadAllData();
    }
  }, [isLoaded, loadAllData]);

  const availableMonths = useMemo(() => {
    if (!serviceOrders || serviceOrders.length === 0) return ['all'];
    const months = new Set<string>();
    serviceOrders.forEach(os => {
      try {
        if (os && os.startDate) {
          const month = format(new Date(os.startDate), 'yyyy-MM');
          months.add(month);
        }
      } catch (e) {
        console.error(`Invalid start date for OS ${os.serviceNumber}: ${os.startDate}`);
      }
    });
    return ['all', ...Array.from(months).sort().reverse()];
  }, [serviceOrders]);

  const filteredAndSortedOrders = useMemo(() => {
    if (!serviceOrders || serviceOrders.length === 0) {
      return [];
    }
    
    const today = startOfToday();
    const cateringOrders = serviceOrders.filter(os => os.vertical !== 'Entregas');

    const filtered = cateringOrders.filter(os => {
      if (!os) return false;
      const searchMatch = searchTerm.trim() === '' || 
        (os.serviceNumber && os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (os.client && os.client.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let monthMatch = true;
      if (selectedMonth !== 'all' && os.startDate) {
          try {
              const osMonth = format(new Date(os.startDate), 'yyyy-MM');
              monthMatch = osMonth === selectedMonth;
          } catch(e) {
              monthMatch = false;
          }
      }
      
      let pastEventMatch = true;
      if (!showPastEvents && os.endDate) {
          try {
              pastEventMatch = !isBefore(new Date(os.endDate), today);
          } catch (e) {
              pastEventMatch = true;
          }
      }

      const statusMatch = statusFilter === 'all' || os.status === statusFilter;

      return searchMatch && monthMatch && pastEventMatch && statusMatch;
    });

    return filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  }, [serviceOrders, searchTerm, selectedMonth, showPastEvents, statusFilter]);

  const statusVariant: { [key in ServiceOrder['status']]: 'default' | 'secondary' | 'destructive' } = {
    Borrador: 'secondary',
    Pendiente: 'destructive',
    Confirmado: 'default',
    Anulado: 'destructive'
  };

  const handleDelete = () => {
    if (!orderToDelete) return;
    const updatedOrders = serviceOrders.filter(os => os.id !== orderToDelete);
    localStorage.setItem('serviceOrders', JSON.stringify(updatedOrders));
    loadAllData(); // Re-trigger data loading in zustand store
    toast({ title: 'Orden de Servicio eliminada.' });
    setOrderToDelete(null);
  };
  
  if (!isLoaded) {
    return <LoadingSkeleton title="Cargando Previsión de Servicios..." />;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><ClipboardList />Previsión de Servicios de Catering</h1>
        <Button asChild>
          <Link href="/os/nuevo/info">
            <PlusCircle className="mr-2" />
            Nueva Orden
          </Link>
        </Button>
      </div>

       <div className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
                <Input
                    placeholder="Buscar por Nº de Servicio o Cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue placeholder="Filtrar por mes" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">Todos los meses</SelectItem>
                    {availableMonths.map(month => (
                        <SelectItem key={month} value={month}>
                        {month === 'all' ? 'Todos' : format(new Date(`${month}-02`), 'MMMM yyyy', { locale: es })}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <div className="flex items-center space-x-2 pt-2 sm:pt-0">
                    <Checkbox id="show-past" checked={showPastEvents} onCheckedChange={(checked) => setShowPastEvents(Boolean(checked))} />
                    <label htmlFor="show-past" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Mostrar eventos finalizados
                    </label>
            </div>
            </div>
             <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Estado:</span>
                <Button size="sm" variant={statusFilter === 'all' ? 'default' : 'outline'} onClick={() => setStatusFilter('all')}>Todos</Button>
                <Button size="sm" variant={statusFilter === 'Borrador' ? 'default' : 'outline'} onClick={() => setStatusFilter('Borrador')}>Borrador</Button>
                <Button size="sm" variant={statusFilter === 'Pendiente' ? 'default' : 'outline'} onClick={() => setStatusFilter('Pendiente')}>Pendiente</Button>
                <Button size="sm" variant={statusFilter === 'Confirmado' ? 'default' : 'outline'} onClick={() => setStatusFilter('Confirmado')}>Confirmado</Button>
                <Button size="sm" variant={statusFilter === 'Anulado' ? 'default' : 'outline'} onClick={() => setStatusFilter('Anulado')}>Anulado</Button>
            </div>
      </div>

       <div className="border rounded-lg">
          <Table>
              <TableHeader>
              <TableRow>
                  <TableHead>Nº Servicio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Espacio</TableHead>
                  <TableHead>Asistentes</TableHead>
                  <TableHead>Comercial</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
              {filteredAndSortedOrders.length > 0 ? (
                  filteredAndSortedOrders.map(os => (
                  <TableRow key={os.id} onClick={() => router.push(`/os/${os.id}`)} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            {os.isVip && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Star className="h-4 w-4 text-amber-500 fill-amber-500"/>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Evento VIP</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            <span className="text-primary hover:underline">{os.serviceNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>{os.client}</TableCell>
                      <TableCell>{format(new Date(os.startDate), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{os.space}</TableCell>
                      <TableCell>{os.asistentes}</TableCell>
                      <TableCell>{os.comercial}</TableCell>
                      <TableCell>
                      <Badge variant={statusVariant[os.status]}>
                          {os.status}
                      </Badge>
                      </TableCell>
                       <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                        <span className="sr-only">Abrir menú</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/os/${os.id}`); }}>
                                        <Pencil className="mr-2 h-4 w-4" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setOrderToDelete(os.id); }}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                  </TableRow>
                  ))
              ) : (
                  <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                      No hay órdenes de servicio que coincidan con los filtros.
                  </TableCell>
                  </TableRow>
              )}
              </TableBody>
          </Table>
        </div>
        
        <AlertDialog open={!!orderToDelete} onOpenChange={(open) => setOrderToDelete(open ? orderToDelete : null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción eliminará permanentemente la Orden de Servicio y todos sus datos asociados (briefing, pedidos de material, etc.). Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Sí, eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </main>
  );
}
