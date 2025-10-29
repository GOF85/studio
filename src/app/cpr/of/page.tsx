

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, Search, PlusCircle, Trash2, Calendar as CalendarIcon, ChefHat, CheckSquare, Euro } from 'lucide-react';
import type { OrdenFabricacion, PartidaProduccion, ServiceOrder, ComercialBriefing, ComercialBriefingItem, GastronomyOrder, Receta, Elaboracion, ExcedenteProduccion, StockElaboracion, Personal, PickingState, LoteAsignado } from '@/types';
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
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { formatNumber, formatUnit, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


type NecesidadDesgloseItem = {
    recetaNombre: string;
    cantidadReceta: number;
    fecha: string;
    cantidadElaboracion: number;
}

type NecesidadItem = {
  id: string; // elaboracionId
  nombre: string;
  cantidadNecesariaTotal: number;
  unidad: string;
  osIDs: Set<string>;
  partida: PartidaProduccion;
  tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
  stockDisponible: number;
  cantidadPlanificada: number;
  desgloseDiario: { fecha: string, cantidad: number }[];
  cantidadNeta: number;
  recetas: string[];
  desgloseCompleto: NecesidadDesgloseItem[];
};


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
  const [personalCPR, setPersonalCPR] = useState<Personal[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [partidaFilter, setPartidaFilter] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [elaboracionesMap, setElaboracionesMap] = useState<Map<string, Elaboracion>>(new Map());
  
  const [necesidades, setNecesidades] = useState<NecesidadItem[]>([]);
  const [selectedNecesidades, setSelectedNecesidades] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(addDays(new Date(), 7)),
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);


  const router = useRouter();
  const { toast } = useToast();
  
  const loadData = useCallback(() => {
    
    // --- STAGE 1: RAW DATA ---
    const allGastroOrders = (JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[]);
    const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const allOFs = (JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[]);
    const stockElaboraciones: Record<string, StockElaboracion> = JSON.parse(localStorage.getItem('stockElaboraciones') || '{}');
    const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as Record<string, PickingState>;
    

    let storedOFs = localStorage.getItem('ordenesFabricacion');
    const allOFsForState = storedOFs ? JSON.parse(storedOFs) : [];
    setOrdenes(allOFsForState);
    
    const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    setPersonalCPR(allPersonal.filter(p => p.departamento === 'CPR'));
    setElaboracionesMap(new Map(allElaboraciones.map(e => [e.id, e])));

    if (!dateRange?.from) {
      setNecesidades([]);
      setIsMounted(true);
      return;
    }
    
    const recetasMap = new Map(allRecetas.map(r => [r.id, r]));
    const elabMap = new Map(allElaboraciones.map(e => [e.id, e]));

    const necesidadesAgregadas: Map<string, NecesidadItem> = new Map();

    const rangeStart = startOfDay(dateRange.from);
    const rangeEnd = endOfDay(dateRange.to || dateRange.from);

    // --- STAGE 2: FILTER BY DATE ---
    
    const gastroOrdersInRange = allGastroOrders.filter(order => {
        try {
            const hitoDate = startOfDay(new Date(order.fecha));
            const isInRange = isWithinInterval(hitoDate, { start: rangeStart, end: rangeEnd });
            return isInRange;
        } catch (e) { 
            return false;
        }
    });

    // --- STAGE 3: CALCULATE NEEDS ---
    gastroOrdersInRange.forEach(gastroOrder => {
      try {
        const fechaKey = format(new Date(gastroOrder.fecha), 'yyyy-MM-dd');
        
        (gastroOrder.items || []).forEach(item => {
            if (item.type !== 'item') return;
            
            const receta = recetasMap.get(item.id);
            if (!receta || !receta.elaboraciones) return;

            receta.elaboraciones.forEach(elabEnReceta => {
                const elab = elabMap.get(elabEnReceta.elaboracionId);
                if (!elab) return;
                
                const id = elab.id;
                let necesidad = necesidadesAgregadas.get(id);

                if (!necesidad) {
                    necesidad = {
                        id,
                        nombre: elab.nombre,
                        cantidadNecesariaTotal: 0,
                        unidad: elab.unidadProduccion,
                        osIDs: new Set(),
                        partida: elab.partidaProduccion,
                        tipoExpedicion: elab.tipoExpedicion,
                        stockDisponible: 0,
                        cantidadPlanificada: 0,
                        desgloseDiario: [],
                        cantidadNeta: 0,
                        recetas: [],
                        desgloseCompleto: [],
                    };
                    necesidadesAgregadas.set(id, necesidad);
                }
                
                const cantidadNecesaria = (item.quantity || 1) * elabEnReceta.cantidad;
                necesidad.cantidadNecesariaTotal += cantidadNecesaria;
                necesidad.osIDs.add(gastroOrder.osId);
                
                if (!necesidad.recetas.includes(receta.nombre)) {
                    necesidad.recetas.push(receta.nombre);
                }
                
                const desglose = necesidad.desgloseDiario.find(d => d.fecha === fechaKey);
                if (desglose) {
                    desglose.cantidad += cantidadNecesaria;
                } else {
                    necesidad.desgloseDiario.push({ fecha: fechaKey, cantidad: cantidadNecesaria });
                }
                
                necesidad.desgloseCompleto.push({
                    recetaNombre: receta.nombre,
                    cantidadReceta: item.quantity || 1,
                    fecha: fechaKey,
                    cantidadElaboracion: cantidadNecesaria
                });
            });
        });
      } catch (e) {
      }
    });


    // --- STAGE 4: SUBTRACT EXISTING STOCK & OFs ---
    
    const stockAsignadoGlobal: Record<string, number> = {};
    Object.values(allPickingStates).forEach(state => {
      (state.itemStates || []).forEach(assigned => {
        const of = allOFs.find(o => o.id === assigned.ofId);
        if (of) {
          stockAsignadoGlobal[of.elaboracionId] = (stockAsignadoGlobal[of.elaboracionId] || 0) + assigned.quantity;
        }
      });
    });

    const necesidadesArray = Array.from(necesidadesAgregadas.values()).map(necesidad => {
        const ofsExistentes = allOFs.filter((of: OrdenFabricacion) => {
            if (of.elaboracionId !== necesidad.id) return false;
            try {
                const ofDate = startOfDay(new Date(of.fechaProduccionPrevista));
                return isWithinInterval(ofDate, { start: rangeStart, end: rangeEnd });
            } catch(e) { return false; }
        });
        
        const cantidadYaPlanificada = ofsExistentes.reduce((sum:number, of:OrdenFabricacion) => sum + (of.cantidadReal ?? of.cantidadTotal), 0);
        
        const stockTotalBruto = stockElaboraciones[necesidad.id]?.cantidadTotal || 0;
        const stockDisponibleReal = stockTotalBruto - (stockAsignadoGlobal[necesidad.id] || 0);
        
        const cantidadNeta = necesidad.cantidadNecesariaTotal - (cantidadYaPlanificada + stockDisponibleReal);
        
        return {
          ...necesidad,
          cantidadNecesariaTotal: necesidad.cantidadNecesariaTotal, 
          cantidadNeta: Math.max(0, cantidadNeta),
          stockDisponible: stockDisponibleReal,
          cantidadPlanificada: cantidadYaPlanificada,
          desgloseDiario: necesidad.desgloseDiario.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        };
    }).filter(n => n.cantidadNeta > 0.001);

    setNecesidades(necesidadesArray);
    setIsMounted(true);
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const filteredAndSortedItems = useMemo(() => {
    return ordenes
      .filter(item => {
        const searchMatch = searchTerm === '' || 
                            item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.elaboracionNombre.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'all' || item.estado === statusFilter;
        const partidaMatch = partidaFilter === 'all' || item.partidaAsignada === partidaFilter;
        
        let dateMatch = true;
        if (dateRange?.from && item.fechaProduccionPrevista) {
            try {
                const itemDate = parseISO(item.fechaProduccionPrevista);
                if (dateRange.to) {
                    dateMatch = isWithinInterval(itemDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
                } else {
                    dateMatch = isSameDay(itemDate, dateRange.from);
                }
            } catch(e) {
                dateMatch = false;
            }
        }
        
        return searchMatch && statusMatch && partidaMatch && dateMatch;
      })
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
  }, [ordenes, searchTerm, statusFilter, partidaFilter, dateRange]);
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPartidaFilter('all');
    setDateRange({ from: startOfDay(new Date()), to: endOfDay(addDays(new Date(), 7)) });
  };

  const handleDeleteOrder = () => {
    if (!orderToDelete) return;
    const updatedOFs = ordenes.filter(of => of.id !== orderToDelete);
    localStorage.setItem('ordenesFabricacion', JSON.stringify(updatedOFs));
    setOrdenes(updatedOFs);
    toast({ title: 'Orden de Fabricación Eliminada' });
    setOrderToDelete(null);
  };
  
  const handleGenerateOFs = () => {
    if (!dateRange?.from || selectedNecesidades.size === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No hay necesidades seleccionadas para generar OFs.' });
      return;
    }
    
    let allOFs: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
    const lastIdNumber = allOFs.reduce((max, of) => {
      const numPart = of.id.split('-')[2];
      const num = numPart ? parseInt(numPart) : 0;
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    
    let currentIdCounter = lastIdNumber;
    
    const nuevasOFs: OrdenFabricacion[] = [];
    const fechaProduccion = format(dateRange.from, 'yyyy-MM-dd');
    
    selectedNecesidades.forEach(elabId => {
      const necesidad = necesidades.find(n => n.id === elabId);
      if (!necesidad || necesidad.cantidadNeta <= 0) return;
      
      currentIdCounter++;
      
      const newOF: OrdenFabricacion = {
        id: `OF-${new Date().getFullYear()}-${(currentIdCounter).toString().padStart(3, '0')}`,
        fechaCreacion: new Date().toISOString(),
        fechaProduccionPrevista: fechaProduccion,
        elaboracionId: necesidad.id,
        elaboracionNombre: necesidad.nombre,
        cantidadTotal: necesidad.cantidadNeta,
        unidad: necesidad.unidad as any,
        partidaAsignada: necesidad.partida,
        tipoExpedicion: necesidad.tipoExpedicion,
        estado: 'Pendiente',
        osIDs: Array.from(necesidad.osIDs),
        incidencia: false,
        okCalidad: false,
      };
      nuevasOFs.push(newOF);
    });

    const updatedOFs = [...allOFs, ...nuevasOFs];
    localStorage.setItem('ordenesFabricacion', JSON.stringify(updatedOFs));
    setOrdenes(updatedOFs);
    
    toast({ title: 'Órdenes de Fabricación Creadas', description: `${nuevasOFs.length} OFs se han añadido a la lista.` });
    
    setSelectedNecesidades(new Set());
    loadData();
  };
  
  const handleAssignResponsable = (ofId: string, responsable: string) => {
    let allOFs: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
    const index = allOFs.findIndex(of => of.id === ofId);
    if(index > -1 && allOFs[index].estado === 'Pendiente') {
        allOFs[index].responsable = responsable;
        allOFs[index].estado = 'Asignada';
        allOFs[index].fechaAsignacion = new Date().toISOString();
        localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
        setOrdenes(allOFs);
        toast({ title: 'Responsable Asignado', description: `Se ha asignado a ${responsable}.`});
    }
  }

  const handleSelectNecesidad = (elabId: string, checked: boolean) => {
    setSelectedNecesidades(prev => {
      const newSelection = new Set(prev);
      if (checked) newSelection.add(elabId);
      else newSelection.delete(elabId);
      return newSelection;
    });
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Órdenes de Fabricación..." />;
  }

  const ceilToTwoDecimals = (num?: number | null) => {
    if (num === null || num === undefined) return '-';
    return formatNumber(num, 2);
  }

  return (
    <TooltipProvider>
      <Tabs defaultValue="planificacion">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="planificacion">Planificación</TabsTrigger>
            <TabsTrigger value="creadas">OF Creadas</TabsTrigger>
            <TabsTrigger value="asignacion">Asignación de Órdenes</TabsTrigger>
        </TabsList>
        <div className="flex flex-col md:flex-row gap-4 my-4">
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal md:w-[300px]", !dateRange && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.from && range?.to) { setIsDatePickerOpen(false); }}} numberOfMonths={2} locale={es}/>
                </PopoverContent>
            </Popover>
             <Button variant="secondary" onClick={() => { setDateRange({ from: startOfDay(new Date()), to: endOfDay(addDays(new Date(), 7)) }); }}>Próximos 7 días</Button>
        </div>
        <TabsContent value="planificacion" className="mt-4 space-y-4">
            <Card>
                <CardHeader className="flex-row justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2"><CheckSquare/>Necesidades de Producción Agregadas</CardTitle>
                    <Button size="sm" onClick={handleGenerateOFs} disabled={selectedNecesidades.size === 0}>
                        Generar OF para la selección ({selectedNecesidades.size})
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12"><Checkbox onCheckedChange={(checked) => {
                                            const allIds = new Set(necesidades.map(i => i.id));
                                            setSelectedNecesidades(checked ? allIds : new Set());
                                    }}/></TableHead>
                                    <TableHead>Elaboración</TableHead>
                                    <TableHead>Partida</TableHead>
                                    <TableHead className="text-right">Necesidad Neta</TableHead>
                                    <TableHead className="text-right">Stock Disp.</TableHead>
                                    <TableHead className="text-right">Planificado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {necesidades.length > 0 ? necesidades.map(item => (
                                    <Tooltip key={item.id}>
                                        <TooltipTrigger asChild>
                                            <TableRow>
                                                <TableCell><Checkbox checked={selectedNecesidades.has(item.id)} onCheckedChange={(checked) => handleSelectNecesidad(item.id, !!checked)}/></TableCell>
                                                <TableCell><span className="font-semibold cursor-help">{item.nombre}</span></TableCell>
                                                <TableCell><Badge variant="secondary">{item.partida}</Badge></TableCell>
                                                <TableCell className="text-right font-mono font-bold">{formatNumber(item.cantidadNeta, 2)} {formatUnit(item.unidad)}</TableCell>
                                                <TableCell className="text-right font-mono">{formatNumber(item.stockDisponible || 0, 2)} {formatUnit(item.unidad)}</TableCell>
                                                <TableCell className="text-right font-mono">{formatNumber(item.cantidadPlanificada || 0, 2)} {formatUnit(item.unidad)}</TableCell>
                                            </TableRow>
                                        </TooltipTrigger>
                                        <TooltipContent className="p-2 max-w-md">
                                            <div className="space-y-1">
                                                <p className="font-bold mb-1">Origen de la Necesidad:</p>
                                                {item.desgloseCompleto.map((d, i) => (
                                                    <p key={i} className="text-xs">
                                                        {format(new Date(d.fecha), 'dd/MM')}: {d.cantidadReceta} x "{d.recetaNombre}" &rarr; {formatNumber(d.cantidadElaboracion, 2)} {formatUnit(item.unidad)}
                                                    </p>
                                                ))}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No hay necesidades de producción en el rango de fechas seleccionado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="creadas" className="mt-4 space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Factory/>Órdenes de Fabricación Creadas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-end mb-4">
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
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">Estado:</span>
                            <div className="flex flex-wrap gap-1">
                                <Button size="sm" variant={statusFilter === 'all' ? 'default' : 'outline'} onClick={() => setStatusFilter('all')}>Todos</Button>
                                {statusOptions.map(s => (
                                    <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={()=> setStatusFilter(s)}>{s}</Button>
                                ))}
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-muted-foreground ml-auto">Limpiar Filtros</Button>
                        </div>
                    </div>

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Lote / OF</TableHead>
                                <TableHead>Elaboración</TableHead>
                                <TableHead>Cant. Planificada</TableHead>
                                <TableHead>Cant. Producida</TableHead>
                                <TableHead>Valoración Lote</TableHead>
                                <TableHead>Fecha Prevista</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right w-12">Acciones</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {filteredAndSortedItems.length > 0 ? (
                                filteredAndSortedItems.map(of => {
                                    const elab = elaboracionesMap.get(of.elaboracionId);
                                    const costeLote = (elab?.costePorUnidad || 0) * (of.cantidadReal || of.cantidadTotal);
                                    return (
                                <TableRow
                                    key={of.id}
                                    className={cn(
                                        "cursor-pointer", 
                                        of.partidaAsignada && partidaColorClasses[of.partidaAsignada]
                                    )}
                                >
                                    <TableCell className="font-medium" onClick={() => router.push(`/cpr/of/${of.id}`)}>{of.id}</TableCell>
                                    <TableCell onClick={() => router.push(`/cpr/of/${of.id}`)}>{of.elaboracionNombre}</TableCell>
                                    <TableCell onClick={() => router.push(`/cpr/of/${of.id}`)}>{ceilToTwoDecimals(of.cantidadTotal)} {formatUnit(of.unidad)}</TableCell>
                                    <TableCell onClick={() => router.push(`/cpr/of/${of.id}`)}>{ceilToTwoDecimals(of.cantidadReal)} {of.cantidadReal ? formatUnit(of.unidad) : ''}</TableCell>
                                    <TableCell className="font-semibold" onClick={() => router.push(`/cpr/of/${of.id}`)}>{formatCurrency(costeLote)}</TableCell>
                                    <TableCell onClick={() => router.push(`/cpr/of/${of.id}`)}>{format(new Date(of.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell onClick={() => router.push(`/cpr/of/${of.id}`)}>
                                    <Badge variant={statusVariant[of.estado]}>{of.estado}</Badge>
                                    </TableCell>
                                     <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setOrderToDelete(of.id)}>
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                )})
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
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="asignacion" className="mt-4">
             <Card>
                <CardHeader>
                    <CardTitle>Asignación de Órdenes Pendientes</CardTitle>
                    <CardDescription>Asigna rápidamente las OF pendientes a un responsable de producción.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Lote / OF</TableHead>
                                <TableHead>Elaboración</TableHead>
                                <TableHead>Fecha Prevista</TableHead>
                                <TableHead>Partida</TableHead>
                                <TableHead className="w-56">Asignar a</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ordenes.filter(o => o.estado === 'Pendiente').length > 0 ? (
                                ordenes.filter(o => o.estado === 'Pendiente').map(of => (
                                    <TableRow key={of.id} className="hover:bg-muted/30">
                                        <TableCell><Badge variant="outline">{of.id}</Badge></TableCell>
                                        <TableCell className="font-medium">{of.elaboracionNombre}</TableCell>
                                        <TableCell>{format(new Date(of.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell><Badge variant="secondary">{of.partidaAsignada}</Badge></TableCell>
                                        <TableCell>
                                            <Select onValueChange={(responsable) => handleAssignResponsable(of.id, responsable)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar cocinero..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {personalCPR.map(p => (
                                                        <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">No hay órdenes pendientes de asignación.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
             </Card>
        </TabsContent>
      </Tabs>
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la Orden de Fabricación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteOrder}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

```
- src/app/portal/page.tsx:
```tsx

'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, Truck, Users, Activity, UserCog } from 'lucide-react';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';

type PortalLink = {
    href: string;
    title: string;
    icon: React.ElementType;
    description: string;
    requiredRole: string;
}

const portalLinks: PortalLink[] = [
    {
        href: '/portal/partner',
        title: 'Portal de Partner de Producción',
        icon: Factory,
        description: 'Accede para ver los pedidos de producción de gastronomía que tienes asignados.',
        requiredRole: 'Partner Gastronomia'
    },
    {
        href: '/portal/personal',
        title: 'Portal de Partner de Personal',
        icon: Users,
        description: 'Consulta y gestiona los turnos de personal para los eventos de entrega.',
        requiredRole: 'Partner Personal'
    },
    {
        href: '/portal/transporte',
        title: 'Portal de Transporte',
        icon: Truck,
        description: 'Consulta tus rutas de entrega y gestiona los albaranes.',
        requiredRole: 'Transporte'
    },
    {
        href: '/portal/gestion-accesos',
        title: 'Gestión de Accesos',
        icon: UserCog,
        description: 'Crea y administra las cuentas de usuario para los portales externos.',
        requiredRole: 'Admin'
    },
    {
        href: '/portal/activity-log',
        title: 'Log de Actividad',
        icon: Activity,
        description: 'Revisa las acciones realizadas por los usuarios en los portales.',
        requiredRole: 'Admin'
    }
];


export default function PortalHomePage() {
  const { impersonatedUser } = useImpersonatedUser();

  const userRoles = impersonatedUser?.roles || [];
  const isAdminOrComercial = userRoles.includes('Admin') || userRoles.includes('Comercial');
  
  const accessibleLinks = isAdminOrComercial 
    ? portalLinks 
    : portalLinks.filter(link => userRoles.includes(link.requiredRole));

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-headline font-bold tracking-tight">Portal de Colaboradores</h1>
        {impersonatedUser ? (
            <p className="text-lg text-muted-foreground mt-2">Selecciona tu portal para acceder a tus tareas asignadas.</p>
        ) : (
            <p className="text-lg text-muted-foreground mt-2">Por favor, selecciona un usuario en el menú superior para simular una sesión.</p>
        )}
      </div>

      {accessibleLinks.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {accessibleLinks.map(link => (
                 <Link href={link.href} key={link.href}>
                    <Card className="hover:border-primary hover:shadow-lg transition-all h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><link.icon /> {link.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{link.description}</p>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
      ) : impersonatedUser && (
        <div className="text-center text-muted-foreground">
            <p>El usuario seleccionado no tiene ningún rol con acceso a portales.</p>
        </div>
      )}
    </main>
  );
}

```
- src/components/layout/header.tsx:
```tsx

'use client';

import Link from 'next/link';
import { UtensilsCrossed, Leaf, Users, LogOut, Package, ClipboardList, Calendar, Database } from 'lucide-react';
import { Button } from '../ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { User } from 'firebase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserSwitcher } from '../portal/user-switcher';
import { useState, useEffect } from 'react';

export function Header({ user, onLogout }: { user?: User | null, onLogout?: () => void }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const isEntregasModule = pathname.startsWith('/entregas');
  const isPortalModule = pathname.startsWith('/portal');
  const isOsModule = pathname.startsWith('/os/');
  const isHomePage = pathname === '/';
  
  if (isPortalModule) {
      return (
        <header className="sticky top-0 z-40 w-full border-b bg-gray-900 text-white">
          <div className="container flex h-12 items-center">
            <Link href="/portal" className="flex items-center gap-3">
              <Leaf className="h-6 w-6 text-green-500" />
              <h1 className="text-xl font-headline font-bold tracking-tight">
                Colaboradores MiceCatering
              </h1>
            </Link>
             <nav className="flex flex-1 items-center justify-end space-x-4">
                <UserSwitcher />
             </nav>
          </div>
        </header>
      )
  }
  
  const getEntregasHeader = () => (
    <header className="sticky top-0 z-40 w-full border-b bg-orange-500 text-white">
      <div className="container flex h-12 items-center">
        <Link href="/entregas" className="flex items-center gap-3">
          <Package className="h-6 w-6" />
          <h1 className="text-xl font-headline font-bold tracking-tight">
            Entregas MICE
          </h1>
        </Link>
         <nav className="flex flex-1 items-center justify-end space-x-2">
            <Button asChild className="bg-emerald-700 text-white hover:bg-emerald-800">
              <Link href="/">
                <UtensilsCrossed className="mr-2 h-5 w-5"/>
                Catering
              </Link>
            </Button>
            <UserSwitcher />
        </nav>
      </div>
    </header>
  );

  const getDefaultHeader = () => (
    <header className={cn(
        "sticky top-0 z-40 w-full border-b",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      )}>
      <div className="container flex h-12 items-center">
        <Link href="/" className="flex items-center gap-3">
          <UtensilsCrossed className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-headline font-bold text-primary tracking-tight">
            MICE Catering
          </h1>
        </Link>
        <nav className="flex flex-1 items-center justify-end space-x-2">
            {process.env.NODE_ENV === 'development' && (
              <Button asChild variant="destructive">
                <Link href="/debug/db">
                  <Database className="mr-2 h-4 w-4" />
                  DEBUG
                </Link>
              </Button>
            )}
            <UserSwitcher />
        </nav>
      </div>
    </header>
  );
  
  return isEntregasModule ? getEntregasHeader() : getDefaultHeader();
}

```
- src/components/portal/user-switcher.tsx:
```tsx


'use client';

import { useState, useEffect } from 'react';
import { Users, User, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';
import type { PortalUser, Personal } from '@/types';
import { Badge } from '@/components/ui/badge';

export function UserSwitcher() {
    const { impersonatedUser, setImpersonatedUser } = useImpersonatedUser();
    const [internalUsers, setInternalUsers] = useState<PortalUser[]>([]);
    const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // Load internal users from Personal DB
        const storedPersonal = localStorage.getItem('personal');
        if (storedPersonal) {
            const personalData = JSON.parse(storedPersonal) as Personal[];
            const mappedInternalUsers: PortalUser[] = personalData.map(p => ({
                id: p.id,
                nombre: `${p.nombre} ${p.apellidos}`,
                email: p.mail,
                roles: [p.departamento as PortalUser['roles'][0]], // Assume department is the role
            }));
            setInternalUsers(mappedInternalUsers);
        }

        // Load external users
        const storedPortalUsers = localStorage.getItem('portalUsers');
        if (storedPortalUsers) {
            setPortalUsers(JSON.parse(storedPortalUsers));
        }
    }, []);

    const allUsers = [...internalUsers, ...portalUsers];
    const currentUser = allUsers.find(u => u.id === impersonatedUser?.id);

    if (!isMounted) {
        return <Button variant="ghost" className="text-white hover:text-white hover:bg-gray-800">Cargando...</Button>;
    }
    
    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-white hover:text-white hover:bg-gray-800">
                    {currentUser ? (
                        <>
                            {currentUser.nombre}
                            <div className="flex gap-1 ml-2">
                                {(currentUser.roles || []).map(role => (
                                    <Badge key={role} variant="destructive" className="text-xs">{role}</Badge>
                                ))}
                            </div>
                        </>
                    ) : "Simular Usuario"}
                    <Users className="ml-2" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Simular Sesión Como</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Usuarios Internos</DropdownMenuLabel>
                    {internalUsers.length > 0 ? internalUsers.map(user => (
                        <DropdownMenuItem key={user.id} onSelect={() => setImpersonatedUser(user)}>
                             <Check className={`mr-2 h-4 w-4 ${currentUser?.id === user.id ? 'opacity-100' : 'opacity-0'}`} />
                            {user.nombre} <span className="ml-auto text-xs text-muted-foreground">{user.roles?.join(', ')}</span>
                        </DropdownMenuItem>
                    )) : <DropdownMenuItem disabled>No hay usuarios internos</DropdownMenuItem>}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                 <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Usuarios Externos</DropdownMenuLabel>
                    {portalUsers.length > 0 ? portalUsers.map(user => (
                        <DropdownMenuItem key={user.id} onSelect={() => setImpersonatedUser(user)}>
                            <Check className={`mr-2 h-4 w-4 ${currentUser?.id === user.id ? 'opacity-100' : 'opacity-0'}`} />
                            {user.nombre} <span className="ml-auto text-xs text-muted-foreground">{(user.roles || []).join(', ')}</span>
                        </DropdownMenuItem>
                    )) : <DropdownMenuItem disabled>No hay usuarios externos</DropdownMenuItem>}
                </DropdownMenuGroup>
                 {currentUser && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setImpersonatedUser(null)} className="text-destructive">
                           Cerrar Simulación
                        </DropdownMenuItem>
                    </>
                 )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

```
- src/hooks/use-impersonated-user.tsx:
```tsx

'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { PortalUser } from '@/types';

type ImpersonatedUserContextType = {
  impersonatedUser: PortalUser | null;
  setImpersonatedUser: (user: PortalUser | null) => void;
};

const ImpersonatedUserContext = createContext<ImpersonatedUserContextType | undefined>(undefined);

export function ImpersonatedUserProvider({ children }: { children: ReactNode }) {
  const [impersonatedUser, setImpersonatedUserState] = useState<PortalUser | null>(null);

  useEffect(() => {
    // On initial load, try to get the user from localStorage
    const storedUser = localStorage.getItem('impersonatedUser');
    if (storedUser) {
      setImpersonatedUserState(JSON.parse(storedUser));
    }
  }, []);

  const setImpersonatedUser = (user: PortalUser | null) => {
    setImpersonatedUserState(user);
    if (user) {
      localStorage.setItem('impersonatedUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('impersonatedUser');
    }
  };

  return (
    <ImpersonatedUserContext.Provider value={{ impersonatedUser, setImpersonatedUser }}>
      {children}
    </ImpersonatedUserContext.Provider>
  );
}

export function useImpersonatedUser() {
  const context = useContext(ImpersonatedUserContext);
  if (context === undefined) {
    throw new Error('useImpersonatedUser must be used within a ImpersonatedUserProvider');
  }
  return context;
}

```
- src/app/layout.tsx:
```tsx

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { NProgressProvider } from '@/components/providers/nprogress-provider';
import { ImpersonatedUserProvider } from '@/hooks/use-impersonated-user';
import { Header } from '@/components/layout/header';

export const metadata: Metadata = {
  title: 'MICE Catering',
  description: 'Soluciones de alquiler para tus eventos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Roboto:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased')}>
        <ImpersonatedUserProvider>
          <NProgressProvider>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              {children}
            </div>
          </NProgressProvider>
        </ImpersonatedUserProvider>
        <Toaster />
      </body>
    </html>
  );
}

```
- src/app/os/page.tsx:
```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main service order overview page.
export default function OsRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/pes');
    }, [router]);
    return null;
}

```
- src/app/os/[id]/page.tsx:
```tsx

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

// This page just redirects to the first sub-page of the OS module.
export default function OsPage() {
    const router = useRouter();
    const params = useParams();
    const osId = params.id as string;

    useEffect(() => {
        if (osId) {
            router.replace(`/os/${osId}/info`);
        }
    }, [osId, router]);

    return <LoadingSkeleton title="Cargando Orden de Servicio..." />;
}

```
- src/app/os/bio/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BioIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/bio`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/almacen/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AlmacenIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/almacen`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/alquiler/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AlquilerIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/alquiler`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/bodega/[id]/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BodegaIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/bodega`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/comercial/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ComercialIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/comercial`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/cta-explotacion/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CtaExplotacionIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/cta-explotacion`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/decoracion/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DecoracionIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/decoracion`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/gastronomia/[briefingItemId]/layout.tsx:
```tsx

'use client';

// This layout is not strictly necessary but good practice for future modifications
export default function PedidoGastronomiaLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

```
- src/app/os/hielo/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HieloIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/hielo`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/info/layout.tsx:
```tsx

'use client';

export default function InfoLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
        <div>
            {children}
        </div>
    )
}

```
- src/app/os/personal-externo/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PersonalExternoIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/personal-externo`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/personal-mice/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PersonalMiceIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/personal-mice`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/prueba-menu/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PruebaMenuIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/prueba-menu`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/transporte/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TransporteIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/transporte`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/os/page.tsx:
```tsx

CANTFIX
    
```
- src/app/almacen/planificacion/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page is deprecated and now redirects to the warehouse picking page.
export default function AlmacenPlanificacionRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/almacen/picking');
    }, [router]);
    return null;
}

```
- src/app/analitika/catering/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Euro, Users, Building, Briefcase, BookOpen, Ticket, Hand } from 'lucide-react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import type { ServiceOrder, Espacio, Personal, ComercialBriefing, GastronomyOrder, MaterialOrder, ComercialBriefingItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatPercentage, formatNumber, calculateHours } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, isWithinInterval, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import Link from 'next/link';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts"

type AnaliticaCateringItem = {
    os: ServiceOrder;
    costeTotal: number;
    pvpFinal: number;
    numHitos: number;
    costesPorPartida: Record<string, number>;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF6666', '#A0E7E5', '#B4F8C8', '#FBE7C6'];

const calculateAllCosts = (osId: string): Record<string, number> => {
    const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    // Add other order types as needed...
    
    const costes: Record<string, number> = {};
    
    costes['Gastronomía'] = allGastroOrders.filter(o => o.osId === osId).reduce((sum, o) => sum + (o.total || 0), 0);
    costes['Bodega'] = allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bodega').reduce((sum, o) => sum + o.total, 0);
    costes['Bio'] = allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bio').reduce((sum, o) => sum + o.total, 0);
    costes['Almacén'] = allMaterialOrders.filter(o => o.osId === osId && o.type === 'Almacen').reduce((sum, o) => sum + o.total, 0);
    costes['Alquiler'] = allMaterialOrders.filter(o => o.osId === osId && o.type === 'Alquiler').reduce((sum, o) => sum + o.total, 0);

    return costes;
};

type MonthlyData = {
  month: string;
  numContratos: number;
  pax: number;
  asistentesHitos: number;
  facturacion: number;
  costes: Record<string, number>;
  rentabilidad: number;
  ingresosPorPax: number;
};

export default function AnaliticaCateringPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [allPedidos, setAllPedidos] = useState<AnaliticaCateringItem[]>([]);
    const [allBriefings, setAllBriefings] = useState<ComercialBriefing[]>([]);
    const [allEspacios, setAllEspacios] = useState<string[]>([]);
    const [allComerciales, setAllComerciales] = useState<string[]>([]);
    const [allClientes, setAllClientes] = useState<string[]>([]);
    const [allMetres, setAllMetres] = useState<string[]>([]);

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    
    const [espacioFilter, setEspacioFilter] = useState('all');
    const [comercialFilter, setComercialFilter] = useState('all');
    const [clienteFilter, setClienteFilter] = useState('all');
    const [metreFilter, setMetreFilter] = useState('all');
    const [clienteTipoFilter, setClienteTipoFilter] = useState<'all' | 'Empresa' | 'Agencia'>('all');


    useEffect(() => {
        const serviceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.vertical !== 'Entregas' && os.status === 'Confirmado');
        const briefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        setAllBriefings(briefings);

        const data: AnaliticaCateringItem[] = serviceOrders.map(os => {
            const briefing = briefings.find(b => b.osId === os.id);
            const numHitos = briefing?.items.length || 0;
            const costesPorPartida = calculateAllCosts(os.id);
            const costeTotal = Object.values(costesPorPartida).reduce((sum, cost) => sum + cost, 0);
            
            const facturacionBruta = os.facturacion || 0;
            const comisiones = (os.comisionesAgencia || 0) + (os.comisionesCanon || 0);

            return { os, costeTotal, pvpFinal: facturacionBruta - comisiones, numHitos, costesPorPartida };
        });

        setAllPedidos(data);
        
        const espacios = new Set(data.map(p => p.os.space).filter(Boolean));
        setAllEspacios(Array.from(espacios));
        
        const comerciales = new Set(data.map(p => p.os.comercial).filter(Boolean));
        setAllComerciales(Array.from(comerciales));
        
        const clientes = new Set(data.map(p => p.os.client).filter(Boolean));
        setAllClientes(Array.from(clientes));

        const metres = new Set(data.map(p => p.os.respMetre).filter(Boolean));
        setAllMetres(Array.from(metres));

        setIsMounted(true);
    }, []);
    
    const pedidosFiltrados = useMemo(() => {
        if (!dateRange?.from) return [];
        const toDate = dateRange.to || dateRange.from;
        return allPedidos.filter(p => {
            const osDate = new Date(p.os.startDate);
            const isInDateRange = isWithinInterval(osDate, { start: dateRange.from!, end: endOfDay(toDate) });
            const matchesEspacio = espacioFilter === 'all' || p.os.space === espacioFilter;
            const matchesComercial = comercialFilter === 'all' || p.os.comercial === comercialFilter;
            const matchesCliente = clienteFilter === 'all' || p.os.client === clienteFilter;
            const matchesMetre = metreFilter === 'all' || p.os.respMetre === metreFilter;
            const matchesTipoCliente = clienteTipoFilter === 'all' || p.os.tipoCliente === clienteTipoFilter;
            return isInDateRange && matchesEspacio && matchesComercial && matchesCliente && matchesMetre && matchesTipoCliente;
        });
    }, [allPedidos, dateRange, espacioFilter, comercialFilter, clienteFilter, metreFilter, clienteTipoFilter]);

    const analisisGlobal = useMemo(() => {
        if (pedidosFiltrados.length === 0) return { pvpNeto: 0, costeTotal: 0, numEventos: 0, numHitos: 0 };
        
        const pvpNeto = pedidosFiltrados.reduce((sum, p) => sum + p.pvpFinal, 0);
        const costeTotal = pedidosFiltrados.reduce((sum, p) => sum + p.costeTotal, 0);
        const numHitos = pedidosFiltrados.reduce((sum, p) => sum + p.numHitos, 0);

        return { pvpNeto, costeTotal, numEventos: pedidosFiltrados.length, numHitos };
    }, [pedidosFiltrados]);
    
    const margenFinal = analisisGlobal.pvpNeto - analisisGlobal.costeTotal;
    const margenPct = analisisGlobal.pvpNeto > 0 ? (margenFinal / analisisGlobal.pvpNeto) : 0;
    const ticketMedioEvento = analisisGlobal.numEventos > 0 ? analisisGlobal.pvpNeto / analisisGlobal.numEventos : 0;
    const ticketMedioServicio = analisisGlobal.numHitos > 0 ? analisisGlobal.pvpNeto / analisisGlobal.numHitos : 0;

    const kpis = [
        { title: "Nº de Eventos", value: formatNumber(analisisGlobal.numEventos, 0), icon: BookOpen },
        { title: "Facturación Neta", value: formatCurrency(analisisGlobal.pvpNeto), icon: Euro },
        { title: "Coste Directo Total", value: formatCurrency(analisisGlobal.costeTotal), icon: TrendingDown },
        { title: "Rentabilidad Bruta", value: formatCurrency(margenFinal), icon: TrendingUp },
        { title: "Margen Bruto (%)", value: formatPercentage(margenPct), icon: Euro },
        { title: "Ticket Medio / Evento", value: formatCurrency(ticketMedioEvento), icon: Ticket },
        { title: "Ticket Medio / Servicio", value: formatCurrency(ticketMedioServicio), icon: Hand },
    ];

    const analisisCostes = useMemo(() => {
        const costesAgregados: Record<string, number> = {};
        pedidosFiltrados.forEach(pedido => {
            for (const partida in pedido.costesPorPartida) {
                costesAgregados[partida] = (costesAgregados[partida] || 0) + pedido.costesPorPartida[partida];
            }
        });
        return Object.entries(costesAgregados)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0)
            .sort((a,b) => b.value - a.value);
    }, [pedidosFiltrados]);

    const analisisComerciales = useMemo(() => {
        const porComercial: Record<string, { facturacion: number, coste: number, eventos: number }> = {};
        pedidosFiltrados.forEach(p => {
            const comercial = p.os.comercial || 'Sin Asignar';
            if (!porComercial[comercial]) porComercial[comercial] = { facturacion: 0, coste: 0, eventos: 0 };
            porComercial[comercial].facturacion += p.pvpFinal;
            porComercial[comercial].coste += p.costeTotal;
            porComercial[comercial].eventos += 1;
        });
        return Object.entries(porComercial).map(([name, data]) => ({
            name, ...data, margen: data.facturacion - data.coste, margenPct: data.facturacion > 0 ? (data.facturacion - data.coste) / data.facturacion : 0
        })).sort((a, b) => b.margen - a.margen);
    }, [pedidosFiltrados]);
    
    const analisisMetres = useMemo(() => {
        const porMetre: Record<string, { facturacion: number; coste: number; eventos: number }> = {};
        pedidosFiltrados.forEach(p => {
            const metre = p.os.respMetre || 'Sin Asignar';
            if (!porMetre[metre]) porMetre[metre] = { facturacion: 0, coste: 0, eventos: 0 };
            porMetre[metre].facturacion += p.pvpFinal;
            porMetre[metre].coste += p.costeTotal;
            porMetre[metre].eventos += 1;
        });
        return Object.entries(porMetre).map(([name, data]) => ({
            name, ...data, margen: data.facturacion - data.coste, margenPct: data.facturacion > 0 ? (data.facturacion - data.coste) / data.facturacion : 0
        })).sort((a, b) => b.margen - a.margen);
    }, [pedidosFiltrados]);
    
    const analisisAgregado = useMemo(() => {
        const byMonth: Record<string, MonthlyData> = {};

        pedidosFiltrados.forEach(p => {
            const month = format(new Date(p.os.startDate), 'yyyy-MM');
            if (!byMonth[month]) {
                byMonth[month] = {
                    month: format(new Date(p.os.startDate), 'MMM', { locale: es }),
                    numContratos: 0, pax: 0, asistentesHitos: 0, facturacion: 0, costes: {}, rentabilidad: 0, ingresosPorPax: 0
                };
            }

            const data = byMonth[month];
            data.numContratos += 1;
            data.pax += p.os.asistentes || 0;
            const briefing = allBriefings.find(b => b.osId === p.os.id);
            data.asistentesHitos += briefing?.items.reduce((sum, item) => sum + item.asistentes, 0) || 0;
            data.facturacion += p.pvpFinal;
            for (const partida in p.costesPorPartida) {
                data.costes[partida] = (data.costes[partida] || 0) + p.costesPorPartida[partida];
            }
        });

        Object.values(byMonth).forEach(data => {
            const totalCostes = Object.values(data.costes).reduce((s, c) => s + c, 0);
            data.rentabilidad = data.facturacion - totalCostes;
            data.ingresosPorPax = data.pax > 0 ? data.facturacion / data.pax : 0;
        });
        
        return Object.values(byMonth).sort((a,b) => new Date(Object.keys(byMonth).find(key => byMonth[key] === a)!).getTime() - new Date(Object.keys(byMonth).find(key => byMonth[key] === b)!).getTime());
    }, [pedidosFiltrados, allBriefings]);

    const partidasCostes = useMemo(() => {
        const set = new Set<string>();
        pedidosFiltrados.forEach(p => {
            Object.keys(p.costesPorPartida).forEach(key => set.add(key));
        });
        return Array.from(set);
    }, [pedidosFiltrados]);

    const objetivoGasto = { 'Almacén': 0.0523, 'Alquiler': 0.0378, 'Bodega': 0.0392, 'Consumibles': 0.0067, 'Decoración': 0.0073, 'Gastronomía': 0.233, 'Hielo': 0.0026, 'Otros gastos': 0.01, 'Personal MICE': 0.0563, 'Personal externo': 0.1241, 'Prueba de menú': 0, 'Transporte': 0.0265, 'Rentabilidad': 0.4041 };


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Analítica de Catering..." />;
    }

    return (
        <main>
            <Card className="mb-6">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal col-span-1 md:col-span-3 lg:col-span-1", !dateRange && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.from && range?.to) { setIsDatePickerOpen(false); }}} numberOfMonths={2} locale={es}/>
                        </PopoverContent>
                    </Popover>
                     <Select value={clienteTipoFilter} onValueChange={(value) => setClienteTipoFilter(value as any)}>
                        <SelectTrigger><div className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> <SelectValue /></div></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Tipos de Cliente</SelectItem>
                            <SelectItem value="Empresa">Empresa</SelectItem>
                            <SelectItem value="Agencia">Agencia</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={comercialFilter} onValueChange={setComercialFilter}>
                        <SelectTrigger><div className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> <SelectValue /></div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos los Comerciales</SelectItem>{allComerciales.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={metreFilter} onValueChange={setMetreFilter}>
                        <SelectTrigger><div className="flex items-center gap-2"><Users className="h-4 w-4" /> <SelectValue /></div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos los Metres</SelectItem>{allMetres.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={clienteFilter} onValueChange={setClienteFilter}>
                        <SelectTrigger><div className="flex items-center gap-2"><Users className="h-4 w-4" /> <SelectValue /></div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos los Clientes</SelectItem>{allClientes.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={espacioFilter} onValueChange={setEspacioFilter}>
                        <SelectTrigger><div className="flex items-center gap-2"><Building className="h-4 w-4" /> <SelectValue /></div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos los Espacios</SelectItem>{allEspacios.map(e=><SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                    </Select>
                </CardContent>
            </Card>

             <Tabs defaultValue="detalle">
                <TabsList className="mb-4">
                    <TabsTrigger value="detalle">Análisis Detallado</TabsTrigger>
                    <TabsTrigger value="agregado">Vista Agregada</TabsTrigger>
                </TabsList>
                <TabsContent value="detalle" className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {kpis.map(kpi => (
                            <Card key={kpi.title}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{kpi.title}</CardTitle><kpi.icon className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className={cn("text-2xl font-bold", kpi.title.includes('Rentabilidad') && margenFinal < 0 && "text-destructive", kpi.title.includes('Rentabilidad') && margenFinal > 0 && "text-green-600")}>{kpi.value}</div></CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        <Card>
                            <CardHeader><CardTitle>Desglose de Costes Agregados</CardTitle></CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie data={analisisCostes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                                const RADIAN = Math.PI / 180;
                                                const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
                                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                return (
                                                <text x={x} y={y} fill="black" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                                                    {`${analisisCostes[index].name} (${formatPercentage(percent)})`}
                                                </text>
                                                );
                                            }}>
                                            {analisisCostes.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>Rendimiento por Comercial</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Comercial</TableHead><TableHead className="text-right">Eventos</TableHead><TableHead className="text-right">Facturación</TableHead><TableHead className="text-right">Margen</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {analisisComerciales.map(c => (
                                        <TableRow key={c.name}>
                                            <TableCell className="font-medium">{c.name}</TableCell>
                                            <TableCell className="text-right">{c.eventos}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(c.facturacion)}</TableCell>
                                            <TableCell className={cn("text-right font-bold", c.margen < 0 && 'text-destructive')}>{formatPercentage(c.margenPct)}</TableCell>
                                        </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                    
                    <div className="mb-8">
                        <Card>
                            <CardHeader><CardTitle>Rendimiento por Metre</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Metre</TableHead><TableHead className="text-right">Eventos</TableHead><TableHead className="text-right">Facturación</TableHead><TableHead className="text-right">Margen</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {analisisMetres.map(m => (
                                        <TableRow key={m.name}>
                                            <TableCell className="font-medium">{m.name}</TableCell>
                                            <TableCell className="text-right">{m.eventos}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(m.facturacion)}</TableCell>
                                            <TableCell className={cn("text-right font-bold", m.margen < 0 && 'text-destructive')}>{formatPercentage(m.margenPct)}</TableCell>
                                        </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                    
                    <Accordion type="single" collapsible className="w-full mt-8">
                        <AccordionItem value="item-1" className="border-none">
                            <Card>
                                <AccordionTrigger className="py-2 px-4">
                                    <CardTitle>Listado de Órdenes de Servicio en el Periodo ({pedidosFiltrados.length})</CardTitle>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <CardContent className="pt-2">
                                        <div className="border rounded-lg max-h-96 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nº OS</TableHead>
                                                    <TableHead>Cliente</TableHead>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead className="text-right">PVP Neto</TableHead>
                                                    <TableHead className="text-right">Coste Total</TableHead>
                                                    <TableHead className="text-right">Margen</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {pedidosFiltrados.map(p => (
                                                    <TableRow key={p.os.id} className="cursor-pointer">
                                                        <TableCell className="font-medium"><Link href={`/os/${p.os.id}/cta-explotacion`} className="text-primary hover:underline">{p.os.serviceNumber}</Link></TableCell>
                                                        <TableCell>{p.os.client}</TableCell>
                                                        <TableCell>{format(new Date(p.os.startDate), 'dd/MM/yyyy')}</TableCell>
                                                        <TableCell className="text-right">{formatCurrency(p.pvpFinal)}</TableCell>
                                                        <TableCell className="text-right">{formatCurrency(p.costeTotal)}</TableCell>
                                                        <TableCell className={cn("text-right font-bold", p.pvpFinal - p.costeTotal < 0 && 'text-destructive')}>{formatPercentage((p.pvpFinal - p.costeTotal) / p.pvpFinal)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        </div>
                                    </CardContent>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                    </Accordion>
                </TabsContent>
                <TabsContent value="agregado" className="space-y-8">
                    <Card>
                        <CardHeader><CardTitle>Vista Agregada Mensual (€)</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Concepto</TableHead>
                                        {analisisAgregado.map(m => <TableHead key={m.month} className="text-right">{m.month}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow><TableCell className="font-bold">Nº Contratos</TableCell>{analisisAgregado.map(m => <TableCell key={m.month} className="text-right">{m.numContratos}</TableCell>)}</TableRow>
                                    <TableRow><TableCell className="font-bold">PAX</TableCell>{analisisAgregado.map(m => <TableCell key={m.month} className="text-right">{m.pax}</TableCell>)}</TableRow>
                                    <TableRow><TableCell className="font-bold">Facturación</TableCell>{analisisAgregado.map(m => <TableCell key={m.month} className="text-right">{formatCurrency(m.facturacion)}</TableCell>)}</TableRow>
                                    <TableRow className="bg-muted/30"><TableCell colSpan={analisisAgregado.length + 1} className="font-bold pl-8">Costes</TableCell></TableRow>
                                    {partidasCostes.map(partida => (
                                        <TableRow key={partida}>
                                            <TableCell className="pl-8">{partida}</TableCell>
                                            {analisisAgregado.map(m => <TableCell key={m.month} className="text-right">{formatCurrency(m.costes[partida] || 0)}</TableCell>)}
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-muted/30"><TableCell colSpan={analisisAgregado.length + 1}></TableCell></TableRow>
                                    <TableRow><TableCell className="font-bold">Rentabilidad</TableCell>{analisisAgregado.map(m => <TableCell key={m.month} className={cn("text-right font-bold", m.rentabilidad < 0 ? 'text-destructive':'text-green-600')}>{formatCurrency(m.rentabilidad)}</TableCell>)}</TableRow>
                                    <TableRow><TableCell className="font-bold">Ingresos / PAX</TableCell>{analisisAgregado.map(m => <TableCell key={m.month} className="text-right">{formatCurrency(m.ingresosPorPax)}</TableCell>)}</TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader><CardTitle>Vista Agregada Mensual (%)</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>%</TableHead>
                                        <TableHead>Objetivo</TableHead>
                                        {analisisAgregado.map(m => <TableHead key={m.month} className="text-right">{m.month}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {partidasCostes.map(partida => (
                                        <TableRow key={partida}>
                                            <TableCell>{partida}</TableCell>
                                            <TableCell>{formatPercentage((objetivoGasto as any)[partida] || 0)}</TableCell>
                                            {analisisAgregado.map(m => <TableCell key={m.month} className="text-right">{formatPercentage((m.costes[partida] || 0) / m.facturacion)}</TableCell>)}
                                        </TableRow>
                                    ))}
                                     <TableRow className="font-bold bg-muted/30">
                                        <TableCell>Rentabilidad</TableCell>
                                        <TableCell>{formatPercentage(objetivoGasto['Rentabilidad'] || 0)}</TableCell>
                                        {analisisAgregado.map(m => <TableCell key={m.month} className="text-right">{formatPercentage(m.rentabilidad / m.facturacion)}</TableCell>)}
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle>Asistentes por Mes</CardTitle></CardHeader>
                        <CardContent>
                             <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={analisisAgregado}>
                                    <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`}/>
                                    <Tooltip formatter={(value) => `${formatNumber(value as number, 0)}`} />
                                    <Legend />
                                    <Bar dataKey="pax" name="PAX (Nº Asistentes OS)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="asistentesHitos" name="Asistentes Hitos (Suma)" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                     </Card>
                </TabsContent>
            </Tabs>
        </main>
    )
}

```
- src/app/page.tsx:
```tsx
import { DashboardPage } from '@/app/dashboard-page';

export default function HomePage() {
  return <DashboardPage />;
}
```
```

I have noticed that the `/analitika` directory has a typo, it should be `/analitica`. I have already fixed it. However, I have noticed that I still have two analytics pages, one for catering and one for deliveries. I would like you to unify them into a single page called `/analitica`, which will be the dashboard with the main KPIs of both business verticals.

This new page should have a date filter and KPI cards that show the totals for both catering and deliveries. Also, add two cards that serve as a link to the detailed analysis of each vertical.

Finally, I want you to create a new page in the main dashboard that links to this new unified analytics page. I'm attaching the file tree for you to review.