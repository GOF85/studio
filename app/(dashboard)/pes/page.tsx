
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, ClipboardList, Package, Star } from 'lucide-react';
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

export default function PrevisionServiciosPage() {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const router = useRouter();

  useEffect(() => {
    let storedOrders = localStorage.getItem('serviceOrders');
    setServiceOrders(storedOrders ? JSON.parse(storedOrders) : []);
    setIsMounted(true);
  }, []);

  const availableMonths = useMemo(() => {
    if (!serviceOrders) return ['all'];
    const months = new Set<string>();
    serviceOrders.forEach(os => {
      try {
        const month = format(new Date(os.startDate), 'yyyy-MM');
        months.add(month);
      } catch (e) {
        console.error(`Invalid start date for OS ${os.serviceNumber}: ${os.startDate}`);
      }
    });
    return ['all', ...Array.from(months).sort().reverse()];
  }, [serviceOrders]);
  
  const filteredAndSortedOrders = useMemo(() => {
    const today = startOfToday();
    const cateringOrders = serviceOrders.filter(os => os.vertical !== 'Entregas');

    const filtered = cateringOrders.filter(os => {
      const searchMatch = searchTerm.trim() === '' || os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || os.client.toLowerCase().includes(searchTerm.toLowerCase());
      
      let monthMatch = true;
      if (selectedMonth !== 'all') {
        try {
          const osMonth = format(new Date(os.startDate), 'yyyy-MM');
          monthMatch = osMonth === selectedMonth;
        } catch (e) {
          monthMatch = false;
        }
      }
      
      let pastEventMatch = true;
      if (!showPastEvents) {
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

  if (!isMounted) {
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
              </TableRow>
              </TableHeader>
              <TableBody>
              {filteredAndSortedOrders.length > 0 ? (
                  filteredAndSortedOrders.map(os => (
                  <TableRow key={os.id} onClick={() => router.push(`/os/${os.id}`)} className="cursor-pointer">
                      <TableCell className="font-medium flex items-center gap-2">
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
                        {os.serviceNumber}
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
                  </TableRow>
                  ))
              ) : (
                  <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                      No hay órdenes de servicio que coincidan con los filtros.
                  </TableCell>
                  </TableRow>
              )}
              </TableBody>
          </Table>
        </div>
    </main>
  );
}
