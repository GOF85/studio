

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, ListChecks, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, UtensilsCrossed, RefreshCw } from 'lucide-react';
import type { ServiceOrder, PickingEntregaState, PedidoEntrega, ProductoVenta, EntregaHito, ComercialBriefing, ComercialBriefingItem, Receta, OrdenFabricacion, GastronomyOrder } from '@/types';
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
import { statusVariant } from '@/app/cpr/picking/[id]/page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';


const ITEMS_PER_PAGE = 20;

type HitoDePicking = ComercialBriefingItem & {
    serviceOrder: ServiceOrder;
    expedicion: string;
    pickingStatus: PickingEntregaState['status'];
};

export default function PickingPage() {
  const [hitos, setHitos] = useState<HitoDePicking[]>([]);
  const [pickingStates, setPickingStates] = useState<Record<string, PickingEntregaState>>({});
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.vertical !== 'Entregas');
    const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as Record<string, PickingEntregaState>;
    setPickingStates(allPickingStates);
    
    const allBriefings = (JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[]);
    
    const osMap = new Map(allServiceOrders.map(os => [os.id, os]));
    const hitosDePicking: HitoDePicking[] = [];

    allBriefings.forEach(briefing => {
        const serviceOrder = osMap.get(briefing.osId);
        if (serviceOrder && briefing.items) {
            briefing.items.forEach((hito, index) => {
                const pickingState = allPickingStates[hito.id];
                hitosDePicking.push({
                    ...hito,
                    serviceOrder,
                    expedicion: `${serviceOrder.serviceNumber}.${(index + 1).toString().padStart(2, '0')}`,
                    pickingStatus: pickingState?.status || 'Pendiente',
                });
            });
        }
    });
      
    setHitos(hitosDePicking.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
    setIsMounted(true);

    const handleStorageChange = () => {
        const updatedStates = JSON.parse(localStorage.getItem('pickingStates') || '{}');
        setPickingStates(updatedStates);
        setUpdateTrigger(Date.now());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };

  }, [updateTrigger]);
  
  const getPickingProgress = useCallback((hito: HitoDePicking) => {
    // Si no tiene gastronomía, está 100% completo por definición.
    if (!hito.conGastronomia) {
        return { checked: 0, total: 0, percentage: 100, isComplete: true };
    }

    // 1. Identificar todas las elaboraciones únicas necesarias
    const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const gastroOrder = (JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[]).find(go => go.id === hito.id);
    const gastroItems = gastroOrder?.items?.filter(item => item.type === 'item') || [];

    const elaboracionesNecesarias = new Set<string>();
    gastroItems.forEach(item => {
        const receta = allRecetas.find(r => r.id === item.id);
        if (receta) {
            (receta.elaboraciones || []).forEach(elab => {
                elaboracionesNecesarias.add(elab.elaboracionId);
            });
        }
    });

    const totalItems = elaboracionesNecesarias.size;

    // Si no se necesitan elaboraciones, está completo.
    if (totalItems === 0) {
        return { checked: 0, total: 0, percentage: 100, isComplete: true };
    }
    
    // 2. Identificar las elaboraciones únicas que ya han sido asignadas
    const state = pickingStates[hito.id];
    if (!state || !state.itemStates) {
        return { checked: 0, total: totalItems, percentage: 0, isComplete: false };
    }

    const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
    const ofsMap = new Map(allOFs.map(of => [of.id, of]));

    const elaboracionesAsignadas = new Set<string>();
    state.itemStates.forEach(assignedLote => {
        const of = ofsMap.get(assignedLote.ofId);
        if (of && elaboracionesNecesarias.has(of.elaboracionId)) {
            elaboracionesAsignadas.add(of.elaboracionId);
        }
    });
    
    const checkedCount = elaboracionesAsignadas.size;
    const percentage = totalItems > 0 ? (checkedCount / totalItems) * 100 : 100;
    
    return {
      checked: checkedCount,
      total: totalItems,
      percentage: percentage,
      isComplete: checkedCount >= totalItems,
    };
  }, [pickingStates]);

  const filteredHitos = useMemo(() => {
    return hitos.map(hito => ({
      ...hito,
      progress: getPickingProgress(hito),
    })).filter(hito => {
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
  }, [hitos, searchTerm, dateRange, getPickingProgress]);

  const { incompleteHitos, completeHitos } = useMemo(() => {
    const incomplete: typeof filteredHitos = [];
    const complete: typeof filteredHitos = [];

    filteredHitos.forEach(hito => {
      if (hito.progress.isComplete) {
        complete.push(hito);
      } else {
        incomplete.push(hito);
      }
    });

    return { incompleteHitos: incomplete, completeHitos: complete };
  }, [filteredHitos]);

  const paginatedHitos = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return incompleteHitos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [incompleteHitos, currentPage]);

  const totalPages = Math.ceil(incompleteHitos.length / ITEMS_PER_PAGE);


  const handleRefresh = () => {
    setUpdateTrigger(Date.now());
    toast({ title: "Datos actualizados", description: "El estado de todos los pickings ha sido recalculado." });
  };

  if (!isMounted) {
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
                        const progress = hito.progress;
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
                                ) : (
                                        <div className="flex items-center gap-2">
                                            <Progress value={progress.percentage} className="w-40" />
                                            <span className="text-sm text-muted-foreground">{progress.checked} / {progress.total}</span>
                                        </div>
                                    )}
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
