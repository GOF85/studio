
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Clock, Users } from 'lucide-react';
import type { ServiceOrder, ComercialBriefing, ComercialBriefingItem, Vertical } from '@/types';
import { Header } from '@/components/layout/header';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { VERTICALES } from '@/types';

export default function PesPage() {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [briefings, setBriefings] = useState<ComercialBriefing[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showPastEvents, setShowPastEvents] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedOrders = localStorage.getItem('serviceOrders');
    setServiceOrders(storedOrders ? JSON.parse(storedOrders) : []);
    const storedBriefings = localStorage.getItem('comercialBriefings');
    setBriefings(storedBriefings ? JSON.parse(storedBriefings) : []);
    setIsMounted(true);
  }, []);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    serviceOrders.forEach(os => {
      try {
        const month = format(new Date(os.startDate), 'yyyy-MM');
        months.add(month);
      } catch (e) {
        console.error(`Invalid start date for OS ${os.serviceNumber}: ${os.startDate}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [serviceOrders]);

  const briefingsMap = useMemo(() => {
    const map = new Map<string, ComercialBriefingItem[]>();
    briefings.forEach(briefing => {
      const sortedItems = [...briefing.items].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
      map.set(briefing.osId, sortedItems);
    });
    return map;
  }, [briefings]);
  
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
              pastEventMatch = true; // if date is invalid, better to show it
          }
      }

      return searchMatch && monthMatch && pastEventMatch;
    });

    return filtered.sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());

  }, [serviceOrders, searchTerm, selectedMonth, showPastEvents]);
  
  const statusVariant: { [key in ServiceOrder['status']]: 'default' | 'secondary' | 'destructive' } = {
    Borrador: 'secondary',
    Pendiente: 'destructive',
    Confirmado: 'default',
  };


  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Previsión de Servicios..." />;
  }

  return (
    <TooltipProvider>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-headline font-bold">Previsión de Servicios</h1>
          <Button asChild>
            <Link href="/os">
              <PlusCircle className="mr-2" />
              Nueva Orden
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input
            placeholder="Buscar por Nº Servicio o Cliente..."
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
                  {format(new Date(`${month}-02`), 'MMMM yyyy', { locale: es })}
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

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Servicio</TableHead>
                <TableHead>Espacio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vertical</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Fecha Fin</TableHead>
                <TableHead>Asistentes</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedOrders.length > 0 ? (
                filteredAndSortedOrders.map(os => {
                  const osBriefingItems = briefingsMap.get(os.id);
                  return (
                  <TableRow key={os.id} onClick={() => router.push(`/os?id=${os.id}`)} className="cursor-pointer">
                    <TableCell className="font-medium">
                       <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{os.serviceNumber}</span>
                        </TooltipTrigger>
                        {osBriefingItems && osBriefingItems.length > 0 && (
                          <TooltipContent>
                            <div className="space-y-2 p-2 max-w-xs">
                              <h4 className="font-bold">{os.finalClient || os.client}</h4>
                              {osBriefingItems.map(item => (
                                <div key={item.id} className="text-sm">
                                  <p className="font-medium flex items-center gap-1.5"><Clock className="h-3 w-3"/>{format(new Date(item.fecha), 'dd/MM/yy')} {item.horaInicio} - {item.descripcion}</p>
                                  <p className="flex items-center gap-1 text-muted-foreground pl-5"><Users className="h-3 w-3"/>{item.asistentes} asistentes</p>
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TableCell>
                    <TableCell>{os.space}</TableCell>
                    <TableCell>{os.client}</TableCell>
                    <TableCell>{os.vertical}</TableCell>
                    <TableCell>{format(new Date(os.startDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{format(new Date(os.endDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{os.asistentes}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[os.status]}>
                        {os.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No hay órdenes de servicio que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </TooltipProvider>
  );
}
