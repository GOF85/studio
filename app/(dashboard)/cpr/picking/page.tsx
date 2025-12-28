

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, ListChecks, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, UtensilsCrossed, RefreshCw } from 'lucide-react';
import type { ServiceOrder, PickingState, PedidoEntrega, ProductoVenta, EntregaHito, ComercialBriefing, ComercialBriefingItem, Receta, OrdenFabricacion, GastronomyOrder } from '@/types';
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
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useEventos, useComercialBriefings, useGastronomyOrders, useRecetas } from '@/hooks/use-data-queries';
import { useCprPickingStates, useCprOrdenesFabricacion } from '@/hooks/use-cpr-data';


const ITEMS_PER_PAGE = 20;

type HitoDePicking = ComercialBriefingItem & {
    serviceOrder: ServiceOrder;
    expedicion: string;
    pickingStatus: PickingState['status'];
};

export default function PickingPage() {
  const router = useRouter();
  const { toast } = useToast();

  const { data: serviceOrders = [], isLoading: isLoadingOS } = useEventos();
  const { data: briefings = [], isLoading: isLoadingBriefings } = useComercialBriefings();
  const { data: pickingStates = {} as Record<string, PickingState>, isLoading: isLoadingPicking } = useCprPickingStates();
  const { data: gastronomyOrders = [], isLoading: isLoadingGastro } = useGastronomyOrders();
  const { data: recetas = [], isLoading: isLoadingRecetas } = useRecetas();
  const { data: ordenesFabricacion = [], isLoading: isLoadingOFs } = useCprOrdenesFabricacion();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);

  const allHitos = useMemo(() => {
    const osMap = new Map(serviceOrders.filter(os => os.vertical !== 'Entregas').map(os => [os.id, os]));
    const hitosDePicking: HitoDePicking[] = [];

    briefings.forEach(briefing => {
        const serviceOrder = osMap.get(briefing.osId);
        if (serviceOrder && briefing.items) {
            briefing.items.forEach((hito, index) => {
                const pickingState = pickingStates[hito.id];
                hitosDePicking.push({
                    ...hito,
                    serviceOrder,
                    expedicion: `${serviceOrder.serviceNumber}.${(index + 1).toString().padStart(2, '0')}`,
                    pickingStatus: pickingState?.status || 'Pendiente',
                });
            });
        }
    });
      
    return hitosDePicking.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [serviceOrders, briefings, pickingStates]);

  const progressMap = useMemo(() => {
    const newProgressMap = new Map<string, { checked: number; total: number; percentage: number; isComplete: boolean; }>();
    const ofsMap = new Map(ordenesFabricacion.map(of => [of.id, of]));

    allHitos.forEach(hito => {
      let progress = { checked: 0, total: 0, percentage: 100, isComplete: true };
      
      if (hito.conGastronomia) {
          const gastroOrder = gastronomyOrders.find(go => go.id === hito.id);
          const gastroItems = gastroOrder?.items?.filter(item => item.type === 'item') || [];

          const elaboracionesNecesarias = new Set<string>();
          gastroItems.forEach(item => {
              const receta = recetas.find(r => r.id === item.id);
              if (receta) {
                  (receta.elaboraciones || []).forEach(elab => {
                      elaboracionesNecesarias.add(elab.elaboracionId);
                  });
              }
          });

          const totalItems = elaboracionesNecesarias.size;

          if (totalItems === 0) {
              progress = { checked: 0, total: 0, percentage: 100, isComplete: true };
          } else {
              const hitoPickingState = pickingStates[hito.id];
              const elaboracionesAsignadas = new Set<string>();

              if (hitoPickingState?.itemStates) {
                  hitoPickingState.itemStates.forEach(assignedLote => {
                      const of = ofsMap.get(assignedLote.ofId);
                      if (of && elaboracionesNecesarias.has(of.elaboracionId)) {
                          elaboracionesAsignadas.add(of.elaboracionId);
                      }
                  });
              }
              
              const checkedCount = elaboracionesAsignadas.size;
              const percentage = totalItems > 0 ? (checkedCount / totalItems) * 100 : 100;
              
              progress = {
                  checked: checkedCount,
                  total: totalItems,
                  percentage: percentage,
                  isComplete: checkedCount >= totalItems,
              };
          }
      }
      newProgressMap.set(hito.id, progress);
    });

    return newProgressMap;
  }, [allHitos, pickingStates, gastronomyOrders, recetas, ordenesFabricacion]);

  const filteredHitos = useMemo(() => {
    return allHitos.filter(hito => {
      const searchMatch = 
        hito.expedicion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hito.serviceOrder.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hito.serviceOrder.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (hito.serviceOrder.finalClient || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        hito.descripcion.toLowerCase().includes(searchTerm.toLowerCase());

      let dateMatch = true;
      if(dateRange?.from) {
        const hitoDate = new Date(hito.fecha);
        if (dateRange.to) {
            dateMatch = isWithinInterval(hitoDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
        } else {
            dateMatch = isWithinInterval(hitoDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
        }
      }

      return searchMatch && dateMatch;
    });
  }, [allHitos, searchTerm, dateRange]);

  const { incompleteHitos, completeHitos } = useMemo(() => {
    const incomplete: typeof filteredHitos = [];
    const complete: typeof filteredHitos = [];

    filteredHitos.forEach(hito => {
      const progress = progressMap.get(hito.id);
      if (progress?.isComplete) {
        complete.push(hito);
      } else {
        incomplete.push(hito);
      }
    });

    return { incompleteHitos: incomplete, completeHitos: complete };
  }, [filteredHitos, progressMap]);

  const paginatedHitos = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return incompleteHitos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [incompleteHitos, currentPage]);

  const totalPages = Math.ceil(incompleteHitos.length / ITEMS_PER_PAGE);

  const handleRefresh = () => {
    toast({ title: "Datos actualizados", description: "El estado de todos los pickings ha sido recalculado." });
  };

  if (isLoadingOS || isLoadingBriefings || isLoadingPicking || isLoadingGastro || isLoadingRecetas || isLoadingOFs) {
    return <LoadingSkeleton title="Cargando Picking y Logística..." />;
  }

  return (
    <main>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
              placeholder="Buscar por expedición, cliente, OS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
          />
          <Popover>
            <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-full md:w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => { setSearchTerm(''); setDateRange(undefined); setCurrentPage(1); }}>Limpiar Filtros</Button>
            <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar
            </Button>
          </div>
       </div>

        <div className="flex items-center justify-end gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
        </div>

      <Card className="mb-8">
        <CardHeader>
            <CardTitle>Servicios Pendientes de Picking</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="border rounded-lg">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Servicio (Hito)</TableHead>
                    <TableHead>Nº Servicio (OS)</TableHead>
                    <TableHead>Espacio - Cliente</TableHead>
                    <TableHead>Fecha Servicio</TableHead>
                    <TableHead>Estado Picking</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedHitos.length > 0 ? (
                    paginatedHitos.map(hito => {
                        const progress = progressMap.get(hito.id);
                        const isDisabled = !hito.conGastronomia;
                        return (
                            <TableRow 
                                key={hito.id} 
                                onClick={() => !isDisabled && router.push(`/cpr/picking/${hito.serviceOrder.id}?hitoId=${hito.id}`)}
                                className={cn(isDisabled ? 'bg-secondary/50 text-muted-foreground cursor-not-allowed' : 'cursor-pointer')}
                            >
                                <TableCell className="font-medium flex items-center gap-2">
                                    {isDisabled && <UtensilsCrossed className="h-4 w-4" />}
                                    {hito.descripcion}
                                </TableCell>
                                <TableCell><Badge variant="outline">{hito.serviceOrder.serviceNumber}</Badge></TableCell>
                                <TableCell>{hito.serviceOrder.space}{hito.serviceOrder.finalClient && ` (${hito.serviceOrder.finalClient})`}</TableCell>
                                <TableCell>{format(new Date(hito.fecha), 'dd/MM/yyyy')} {hito.horaInicio}</TableCell>
                                <TableCell>
                                {isDisabled ? (
                                        <Badge variant="secondary">No Aplica</Badge>
                                ) : progress ? (
                                        <div className="flex items-center gap-2">
                                            <Progress value={progress.percentage} className="w-40" />
                                            <span className="text-sm text-muted-foreground">{progress.checked} / {progress.total}</span>
                                        </div>
                                    ) : <div className="h-4 w-40 bg-muted rounded-full animate-pulse"/>}
                                </TableCell>
                            </TableRow>
                        )
                    })
                    ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                        No hay servicios pendientes que coincidan con los filtros.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Servicios Completados</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="border rounded-lg max-h-96 overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Servicio (Hito)</TableHead>
                        <TableHead>Nº Servicio (OS)</TableHead>
                        <TableHead>Fecha Servicio</TableHead>
                        <TableHead>Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {completeHitos.length > 0 ? (
                            completeHitos.map(hito => (
                                <TableRow key={hito.id} onClick={() => router.push(`/cpr/picking/${hito.serviceOrder.id}?hitoId=${hito.id}`)} className="cursor-pointer bg-green-50/50 hover:bg-green-100/50">
                                    <TableCell className="font-medium">{hito.descripcion}</TableCell>
                                    <TableCell><Badge variant="outline">{hito.serviceOrder.serviceNumber}</Badge></TableCell>
                                    <TableCell>{format(new Date(hito.fecha), 'dd/MM/yyyy')} {hito.horaInicio}</TableCell>
                                    <TableCell><Badge variant="success">Completo</Badge></TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                No hay servicios completados que coincidan con los filtros.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </main>
  );
}
