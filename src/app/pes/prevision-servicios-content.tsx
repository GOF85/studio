
'use client';
console.log(`[DEBUG] Module loaded: prevision-servicios-content.tsx at ${new Date().toLocaleTimeString()}`);

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, ClipboardList, AlertTriangle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { format, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useDataStore } from '@/hooks/use-data-store';

const statusVariant: { [key in ServiceOrder['status']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Borrador: 'secondary',
  Pendiente: 'outline',
  Confirmado: 'default',
  Anulado: 'destructive'
};

export function PrevisionServiciosContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showPastEvents, setShowPastEvents] = useState(false);
  const { data, isLoaded } = useDataStore();

  const serviceOrders = useMemo(() => data.serviceOrders || [], [data.serviceOrders]);

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
    
    const filtered = serviceOrders.filter(os => {
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

      return os.vertical !== 'Entregas' && searchMatch && monthMatch && pastEventMatch;
    });

    return filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  }, [serviceOrders, searchTerm, selectedMonth, showPastEvents]);

  if (!isLoaded) {
    return <LoadingSkeleton title="Cargando Previsión..." />;
  }
  
  return (
    <main>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
          <ClipboardList />
          Previsión de Servicios
        </h1>
        <Button asChild>
          <Link href="/os/nuevo/info">
            <PlusCircle className="mr-2" />
            Nueva Orden
          </Link>
        </Button>
      </div>

       <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
                placeholder="Buscar por Nº de OS o Cliente..."
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
                <label
                    htmlFor="show-past"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Mostrar eventos finalizados
                </label>
            </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Servicio</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha Inicio</TableHead>
              <TableHead>Fecha Fin</TableHead>
              <TableHead>Nº Asistentes</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedOrders.length > 0 ? (
              filteredAndSortedOrders.map(os => (
                <TableRow key={os.id}>
                  <TableCell className="font-medium">
                    <Link href={`/os/${os.id}`} className="text-primary hover:underline">
                      {os.serviceNumber}
                       {os.isVip && <AlertTriangle className="inline-block w-4 h-4 ml-2 text-yellow-500" />}
                    </Link>
                  </TableCell>
                  <TableCell>{os.client}</TableCell>
                  <TableCell>{format(new Date(os.startDate), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{format(new Date(os.endDate), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{os.asistentes}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[os.status]}>
                      {os.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No hay órdenes de servicio que coincidan con los filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </