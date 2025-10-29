

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
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


type NecesidadItem = {
  id: string; // elaboracionId
  nombre: string;
  cantidad: number;
  unidad: string;
  osIDs: Set<string>;
  partida: PartidaProduccion;
  tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
  stockDisponible?: number;
  cantidadPlanificada?: number;
  desgloseDiario: { fecha: string, cantidad: number }[];
  recetas: string[];
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
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
                        cantidad: 0,
                        unidad: elab.unidadProduccion,
                        osIDs: new Set(),
                        partida: elab.partidaProduccion,
                        tipoExpedicion: elab.tipoExpedicion,
                        desgloseDiario: [],
                        recetas: [],
                    };
                    necesidadesAgregadas.set(id, necesidad);
                }
                
                const cantidadNecesaria = (item.quantity || 1) * elabEnReceta.cantidad;
                necesidad.cantidad += cantidadNecesaria;
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
            const ofDate = startOfDay(new Date(of.fechaProduccionPrevista));
            return of.elaboracionId === necesidad.id && isWithinInterval(ofDate, { start: rangeStart, end: rangeEnd });
        });
        
        const cantidadYaPlanificada = ofsExistentes.reduce((sum:number, of:OrdenFabricacion) => sum + (of.cantidadTotal || 0), 0);
        
        const stockTotalBruto = stockElaboraciones[necesidad.id]?.cantidadTotal || 0;
        const stockYaAsignado = stockAsignadoGlobal[necesidad.id] || 0;
        const stockDisponibleReal = stockTotalBruto - stockYaAsignado;
        
        const cantidadNeta = necesidad.cantidad - (cantidadYaPlanificada + stockDisponibleReal);
        
        return {
          ...necesidad,
          cantidad: Math.max(0, cantidadNeta), // No mostrar cantidades negativas
          stockDisponible: stockDisponibleReal,
          cantidadPlanificada: cantidadYaPlanificada,
          desgloseDiario: necesidad.desgloseDiario.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        };
    }).filter(n => n.cantidad > 0.001);

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
        if (dateRange?.from) {
            const itemDate = parseISO(item.fechaProduccionPrevista);
            if (dateRange.to) {
                dateMatch = isWithinInterval(itemDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
            } else {
                dateMatch = isSameDay(itemDate, dateRange.from);
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
    setSelectedRows(new Set());
    setDateRange({ from: startOfDay(new Date()), to: endOfDay(addDays(new Date(), 7)) });
  };

  const handleSelectRow = (id: string, checked: boolean | 'indeterminate') => {
    const newSelected = new Set(selectedRows);
    if (checked) newSelected.add(id);
    else newSelected.delete(id);
    setSelectedRows(newSelected);
  };
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) setSelectedRows(new Set(filteredAndSortedItems.map(item => item.id)));
    else setSelectedRows(new Set());
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
      if (!necesidad || necesidad.cantidad <= 0) return;
      
      currentIdCounter++;
      
      const newOF: OrdenFabricacion = {
        id: `OF-${new Date().getFullYear()}-${(currentIdCounter).toString().padStart(3, '0')}`,
        fechaCreacion: new Date().toISOString(),
        fechaProduccionPrevista: fechaProduccion,
        elaboracionId: necesidad.id,
        elaboracionNombre: necesidad.nombre,
        cantidadTotal: necesidad.cantidad,
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
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="planificacion">Planificación y Creación</TabsTrigger>
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
                                    <TableHead className="text-right">Cant. Necesaria</TableHead>
                                    <TableHead className="text-right">Stock Disp.</TableHead>
                                    <TableHead className="text-right">Planificado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {necesidades.length > 0 ? necesidades.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell><Checkbox checked={selectedNecesidades.has(item.id)} onCheckedChange={(checked) => handleSelectNecesidad(item.id, !!checked)}/></TableCell>
                                        <TableCell>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="font-semibold cursor-help">{item.nombre}</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Requerido por: {item.recetas.join(', ')}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell><Badge variant="secondary">{item.partida}</Badge></TableCell>
                                        <TableCell className="text-right font-mono">
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <span className="cursor-help font-bold">{formatNumber(item.cantidad, 2)} {formatUnit(item.unidad)}</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div className="p-1 text-xs">
                                                        <p className="font-bold mb-1">Desglose por día:</p>
                                                        {item.desgloseDiario.map(d => (
                                                            <p key={d.fecha}>{format(new Date(d.fecha), 'dd/MM')}: {formatNumber(d.cantidad, 2)} {formatUnit(item.unidad)}</p>
                                                        ))}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.stockDisponible || 0, 2)} {formatUnit(item.unidad)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.cantidadPlanificada || 0, 2)} {formatUnit(item.unidad)}</TableCell>
                                    </TableRow>
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
                            <TableHead>Valoración Lote</TableHead>
                            <TableHead>Fecha Prevista</TableHead>
                            <TableHead>Estado</TableHead>
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
                                <TableCell className="font-semibold">{formatCurrency(costeLote)}</TableCell>
                                <TableCell>{format(new Date(of.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>
                                <Badge variant={statusVariant[of.estado]}>{of.estado}</Badge>
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
    </TooltipProvider>
  )
}
