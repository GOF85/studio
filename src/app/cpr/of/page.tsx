

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Factory, Search, RefreshCw, Info, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Layers, Utensils, ClipboardList, FileText, Users, ChefHat } from 'lucide-react';
import type { OrdenFabricacion, PartidaProduccion, ServiceOrder, ComercialBriefing, ComercialBriefingItem, GastronomyOrder, Receta, Elaboracion, ExcedenteProduccion, StockElaboracion, Personal, PickingState } from '@/types';
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
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, addDays, isSameDay, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatNumber, formatUnit, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';


type NecesidadDesgloseItem = {
    osId: string;
    osNumber: string;
    osSpace: string;
    hitoId: string;
    hitoDescripcion: string;
    fechaHito: string;
    recetaId: string;
    recetaNombre: string;
    cantidadReceta: number;
    cantidadNecesaria: number;
};

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


type ReporteProduccionItem = {
    id: string;
    nombre: string;
    partida: string;
    udTotales: number;
    unidad: string;
    necesidadesPorDia: Record<string, number>;
    componentes?: { nombre: string; cantidad: number; unidad: string, cantidadTotal: number }[];
    usadoEn?: { nombre: string; cantidad: number; unidad: string }[];
};
type ReporteResumenPartida = {
    referencias: number;
    unidades: number;
    elaboraciones: number;
}
type ReporteData = {
    fechas: Date[];
    resumen: {
        contratos: number;
        contratosDetalle: string[];
        servicios: number;
        serviciosDetalle: string[];
        comensales: number;
        referencias: number;
        unidades: number;
        elaboraciones: number;
        resumenPorPartida: Record<string, ReporteResumenPartida>;
    };
    referencias: ReporteProduccionItem[];
    elaboraciones: ReporteProduccionItem[];
};


const statusVariant: { [key in OrdenFabricacion['estado']]: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' } = {
  'Pendiente': 'secondary',
  'Asignada': 'default',
  'En Proceso': 'outline',
  'Finalizado': 'success',
  'Incidencia': 'destructive',
  'Validado': 'success',
};

const partidaColorClasses: Record<PartidaProduccion, string> = {
    FRIO: 'bg-green-100/50 hover:bg-green-100/80',
    CALIENTE: 'bg-red-100/50 hover:bg-red-100/80',
    PASTELERIA: 'bg-blue-100/50 hover:bg-blue-100/80',
    EXPEDICION: 'bg-yellow-100/50 hover:bg-yellow-100/80'
};

const partidaColorCircles: Record<PartidaProduccion, string> = {
    FRIO: 'bg-green-500',
    CALIENTE: 'bg-red-500',
    PASTELERIA: 'bg-blue-500',
    EXPEDICION: 'bg-yellow-500'
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
  const [partidaInformeFilter, setPartidaInformeFilter] = useState<string>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [elaboracionesMap, setElaboracionesMap] = useState<Map<string, Elaboracion>>(new Map());
  
  const [necesidades, setNecesidades] = useState<NecesidadItem[]>([]);
  const [selectedNecesidades, setSelectedNecesidades] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [reporteData, setReporteData] = useState<ReporteData | null>(null);


  const router = useRouter();
  const { toast } = useToast();
  
  const loadData = useCallback(() => {
    
    // --- STAGE 1: RAW DATA ---
    const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.status === 'Confirmado');
    const allGastroOrders = (JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[]);
    const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const allOFs = (JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[]);
    const stockElaboraciones: Record<string, StockElaboracion> = JSON.parse(localStorage.getItem('stockElaboraciones') || '{}');
    const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as Record<string, PickingState>;
    
    setOrdenes(allOFs);
    
    const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    setPersonalCPR(allPersonal.filter(p => p.departamento === 'CPR'));
    const elabMap = new Map(allElaboraciones.map(e => [e.id, e]));
    setElaboracionesMap(elabMap);

    if (!dateRange?.from) {
      setNecesidades([]);
      setIsMounted(true);
      return;
    }
    
    const osMap = new Map(allServiceOrders.map(os => [os.id, os]));
    const recetasMap = new Map(allRecetas.map(r => [r.id, r]));
    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const briefingsMap = new Map(allBriefings.map(b => [b.osId, b]));

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
        const os = osMap.get(gastroOrder.osId);
        const briefing = briefingsMap.get(gastroOrder.osId);
        if(!os || !briefing) return;
        
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
                
                const hito = briefing.items.find(h => h.id === gastroOrder.id);
                necesidad.desgloseCompleto.push({
                    osId: os.id,
                    osNumber: os.serviceNumber,
                    osSpace: os.space,
                    hitoId: hito?.id || '',
                    hitoDescripcion: hito?.descripcion || '',
                    fechaHito: hito?.fecha || '',
                    recetaId: receta.id,
                    recetaNombre: receta.nombre,
                    cantidadReceta: item.quantity || 1,
                    cantidadNecesaria: cantidadNecesaria
                });
            });
        });
      } catch (e) {
      }
    });


    // --- STAGE 4: CALCULATE NET NEEDS ---
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
        
        const cantidadPlanificada = ofsExistentes.reduce((sum, of) => {
          const isFinalizado = of.estado === 'Finalizado' || of.estado === 'Validado';
          return sum + (isFinalizado && of.cantidadReal ? of.cantidadReal : of.cantidadTotal)
        }, 0);
        
        const stockTotalBruto = stockElaboraciones[necesidad.id]?.cantidadTotal || 0;
        const stockAsignado = stockAsignadoGlobal[necesidad.id] || 0;
        const stockDisponible = Math.max(0, stockTotalBruto - stockAsignado);
        
        const stockAUtilizar = Math.min(necesidad.cantidadNecesariaTotal, stockDisponible);
        const cantidadNeta = necesidad.cantidadNecesariaTotal - stockAUtilizar - cantidadPlanificada;

        return {
          ...necesidad,
          stockDisponible: stockAUtilizar,
          cantidadPlanificada,
          cantidadNeta,
          desgloseDiario: necesidad.desgloseDiario.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        };
    }).filter(n => n.cantidadNeta > 0.001);

    setNecesidades(necesidadesArray);

    // --- STAGE 5: CALCULATE REPORT DATA ---
    if (dateRange.from && dateRange.to) {
      const fechasDelRango = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      const recetasInforme: Map<string, ReporteProduccionItem> = new Map();
      const elaboracionesInforme: Map<string, ReporteProduccionItem> = new Map();
      
      const resumenPorPartida: Record<string, ReporteResumenPartida> = {
          'FRIO': { referencias: 0, unidades: 0, elaboraciones: 0 },
          'CALIENTE': { referencias: 0, unidades: 0, elaboraciones: 0 },
          'PASTELERIA': { referencias: 0, unidades: 0, elaboraciones: 0 },
          'EXPEDICION': { referencias: 0, unidades: 0, elaboraciones: 0 },
      };

      const osDetailsSet = new Set<string>();
      const serviciosCount: Record<string, number> = {};

      gastroOrdersInRange.forEach(order => {
          const os = osMap.get(order.osId);
          if (!os) return;

          osDetailsSet.add(`${format(new Date(os.startDate), 'dd/MM/yy')} / ${os.serviceNumber} / ${os.space}`);
          serviciosCount[order.descripcion] = (serviciosCount[order.descripcion] || 0) + 1;
          const fechaKey = format(new Date(order.fecha), 'yyyy-MM-dd');

          (order.items || []).forEach(item => {
              if (item.type !== 'item') return;
              
              const receta = recetasMap.get(item.id);
              if (!receta) return;

              let recetaItem = recetasInforme.get(receta.id);
              if (!recetaItem) {
                  const componentes = receta.elaboraciones.map(e => {
                      const elabInfo = elabMap.get(e.elaboracionId);
                      const cantidadTotal = e.cantidad * (item.quantity || 0)
                      return { nombre: elabInfo?.nombre || '?', cantidad: e.cantidad, unidad: elabInfo?.unidadProduccion || '?', cantidadTotal };
                  })
                  recetaItem = { id: receta.id, nombre: receta.nombre, partida: receta.partidaProduccion || 'N/A', udTotales: 0, unidad: 'Uds', necesidadesPorDia: {}, componentes };
                  recetasInforme.set(receta.id, recetaItem);
                  if(receta.partidaProduccion && resumenPorPartida[receta.partidaProduccion]){
                      resumenPorPartida[receta.partidaProduccion].referencias++;
                  }
              }
              const cantidadReceta = item.quantity || 0;
              recetaItem.udTotales += cantidadReceta;
               if(receta.partidaProduccion && resumenPorPartida[receta.partidaProduccion]){
                  resumenPorPartida[receta.partidaProduccion].unidades += cantidadReceta;
              }


              recetaItem.componentes?.forEach(c => {
                  const elabReceta = receta.elaboraciones.find(e => elabMap.get(e.elaboracionId)?.nombre === c.nombre);
                  if(elabReceta) {
                      c.cantidadTotal += cantidadReceta * elabReceta.cantidad;
                  }
              });

               if(!recetaItem.necesidadesPorDia[fechaKey]) recetaItem.necesidadesPorDia[fechaKey] = 0;
              recetaItem.necesidadesPorDia[fechaKey] += cantidadReceta;

              (receta.elaboraciones || []).forEach(elabEnReceta => {
                  const elab = elabMap.get(elabEnReceta.elaboracionId);
                  if (!elab) return;

                  let elabItem = elaboracionesInforme.get(elab.id);
                  if (!elabItem) {
                      elabItem = { id: elab.id, nombre: elab.nombre, partida: elab.partidaProduccion, udTotales: 0, unidad: elab.unidadProduccion, necesidadesPorDia: {}, usadoEn: [] };
                      elaboracionesInforme.set(elab.id, elabItem);
                      if(elab.partidaProduccion && resumenPorPartida[elab.partidaProduccion]){
                          resumenPorPartida[elab.partidaProduccion].elaboraciones++;
                      }
                  }
                  const elabInReceta = elabItem.usadoEn?.find(r => r.nombre === receta.nombre);
                  if(!elabInReceta) {
                       elabItem.usadoEn?.push({ nombre: receta.nombre, cantidad: elabEnReceta.cantidad, unidad: elab.unidadProduccion });
                  }
                  const cantidadElab = cantidadReceta * elabEnReceta.cantidad;
                  elabItem.udTotales += cantidadElab;
                   if(!elabItem.necesidadesPorDia[fechaKey]) elabItem.necesidadesPorDia[fechaKey] = 0;
                  elabItem.necesidadesPorDia[fechaKey] += cantidadElab;
              });
          });
      });
      
      const finalResumen = {
          contratos: osDetailsSet.size,
          contratosDetalle: Array.from(osDetailsSet),
          servicios: Object.values(serviciosCount).reduce((sum, count) => sum + count, 0),
          serviciosDetalle: Object.entries(serviciosCount).map(([tipo, count]) => `${count} x ${tipo}`),
          comensales: allServiceOrders
                        .filter(os => isWithinInterval(new Date(os.startDate), { start: rangeStart, end: rangeEnd }))
                        .reduce((sum, os) => sum + (os.asistentes || 0), 0),
          referencias: recetasInforme.size,
          unidades: Array.from(recetasInforme.values()).reduce((sum, item) => sum + item.udTotales, 0),
          elaboraciones: elaboracionesInforme.size,
          resumenPorPartida,
      };

      setReporteData({
          fechas: fechasDelRango,
          resumen: finalResumen,
          referencias: Array.from(recetasInforme.values()).sort((a,b) => a.nombre.localeCompare(b.nombre)),
          elaboraciones: Array.from(elaboracionesInforme.values()).sort((a,b) => a.nombre.localeCompare(b.nombre)),
      });
    }


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
            try {
                const itemDate = (item.estado === 'Pendiente' || item.estado === 'Asignada') 
                    ? parseISO(item.fechaProduccionPrevista)
                    : item.fechaFinalizacion ? parseISO(item.fechaFinalizacion) : parseISO(item.fechaProduccionPrevista);
                
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
    setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
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

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4 mb-4 p-4 border rounded-lg bg-card">
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                  <Button id="date" variant={"outline"} className={cn("w-[380px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Elige un rango</span>)}
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 flex" align="start">
                  <div className="p-2 border-r">
                    <div className="flex flex-col gap-1">
                        <Button variant="outline" size="sm" onClick={() => {setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }); setIsDatePickerOpen(false);}}>Esta semana</Button>
                        <Button variant="outline" size="sm" onClick={() => {const nextWeekStart = startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 }); setDateRange({ from: nextWeekStart, to: endOfWeek(nextWeekStart, { weekStartsOn: 1 }) }); setIsDatePickerOpen(false);}}>Próxima semana</Button>
                        <Button variant="outline" size="sm" onClick={() => {setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }); setIsDatePickerOpen(false);}}>Este mes</Button>
                    </div>
                  </div>
                  <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={(range) => { setDateRange(range); if (range?.from && range?.to) { setIsDatePickerOpen(false); }}}
                      numberOfMonths={2}
                      locale={es}
                  />
              </PopoverContent>
          </Popover>
          <Select value={partidaInformeFilter} onValueChange={setPartidaInformeFilter}>
              <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Filtrar por partida" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">Todas las Partidas</SelectItem>
                  {partidas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
          </Select>
          <div className="flex-grow flex justify-end items-center gap-2">
              <Button variant="secondary" onClick={handleClearFilters}>Limpiar Filtros</Button>
          </div>
      </div>
      <Tabs defaultValue="planificacion">
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tabla-necesidades">Tabla Necesidades</TabsTrigger>
            <TabsTrigger value="planificacion">Planificación</TabsTrigger>
            <TabsTrigger value="creadas">OF Creadas</TabsTrigger>
            <TabsTrigger value="asignacion">Asignación de Órdenes</TabsTrigger>
        </TabsList>
        <TabsContent value="tabla-necesidades" className="mt-4">
             <Card>
                <CardContent className="p-2">
                    {reporteData && (
                        <div className="text-xs font-medium bg-muted/70 p-2 mt-2 rounded-md space-y-1.5">
                            <div className="flex items-center justify-around">
                                <Tooltip>
                                    <TooltipTrigger asChild><div className="flex items-center space-x-1.5 cursor-pointer"><ClipboardList className="h-4 w-4 text-muted-foreground"/><span className="font-bold">{reporteData.resumen.contratos}</span><span className="text-muted-foreground">Contratos</span></div></TooltipTrigger>
                                    <TooltipContent><div className="p-2 space-y-1 text-sm">{reporteData.resumen.contratosDetalle.map((d, i) => <p key={i}>{d}</p>)}</div></TooltipContent>
                                </Tooltip>
                                <Separator orientation="vertical" className="h-4"/>
                                <Tooltip>
                                    <TooltipTrigger asChild><div className="flex items-center space-x-1.5 cursor-pointer"><FileText className="h-4 w-4 text-muted-foreground"/><span className="font-bold">{reporteData.resumen.servicios}</span><span className="text-muted-foreground">Servicios</span></div></TooltipTrigger>
                                    <TooltipContent><div className="p-2 space-y-1 text-sm">{reporteData.resumen.serviciosDetalle.map((d, i) => <p key={i}>{d}</p>)}</div></TooltipContent>
                                </Tooltip>
                                <Separator orientation="vertical" className="h-4"/>
                                <div className="flex items-center space-x-1.5"><Users className="h-4 w-4 text-muted-foreground"/><span className="font-bold">{formatNumber(reporteData.resumen.comensales,0)}</span><span className="text-muted-foreground">Comensales</span></div>
                                <Separator orientation="vertical" className="h-4"/>
                                <div className="flex items-center space-x-1.5"><Layers className="h-4 w-4 text-muted-foreground"/><span className="font-bold">{reporteData.resumen.referencias}</span><span className="text-muted-foreground">Referencias</span></div>
                                <Separator orientation="vertical" className="h-4"/>
                                <div className="flex items-center space-x-1.5"><Utensils className="h-4 w-4 text-muted-foreground"/><span className="font-bold">{formatNumber(reporteData.resumen.unidades,0)}</span><span className="text-muted-foreground">Uds. Ref.</span></div>
                                <Separator orientation="vertical" className="h-4"/>
                                <div className="flex items-center space-x-1.5"><ChefHat className="h-4 w-4 text-muted-foreground"/><span className="font-bold">{reporteData.resumen.elaboraciones}</span><span className="text-muted-foreground">Elaboraciones</span></div>
                            </div>
                            <Separator className="my-1.5"/>
                            <div className="flex items-center gap-3 justify-center">
                                {partidas.map(p => {
                                    const data = reporteData.resumen.resumenPorPartida[p];
                                    if (!data || (data.referencias === 0 && data.unidades === 0 && data.elaboraciones === 0)) return null;
                                    return (
                                        <div key={p} className="flex items-center gap-2">
                                            <div className={cn("h-2.5 w-2.5 rounded-full", partidaColorCircles[p])}/>
                                            <span className="font-bold">{p}:</span>
                                            <span className="text-muted-foreground">Ref:</span><span className="font-semibold">{data.referencias}</span>
                                            <span className="text-muted-foreground">Uds:</span><span className="font-semibold">{formatNumber(data.unidades,0)}</span>
                                            <span className="text-muted-foreground">Elab:</span><span className="font-semibold">{data.elaboraciones}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardContent>
                    {reporteData && (
                        <div className="border rounded-lg overflow-x-auto max-h-[70vh]">
                            <Table className="text-[10px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="sticky left-0 bg-secondary/80 backdrop-blur-sm p-1 w-10 text-center uppercase">Partida</TableHead>
                                        <TableHead className="sticky left-10 bg-secondary/80 backdrop-blur-sm min-w-48 p-1 uppercase">Referencia / Elaboración</TableHead>
                                        <TableHead className="text-right p-1 uppercase">Total</TableHead>
                                        {reporteData.fechas.map(fecha => (
                                            <TableHead key={fecha.toISOString()} className="text-center p-1 min-w-16">
                                                <div className="capitalize font-normal">{format(fecha, 'EEE', {locale: es})}</div>
                                                <div className="font-bold">{format(fecha, 'dd/MM')}</div>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="bg-muted hover:bg-muted"><TableCell colSpan={3 + reporteData.fechas.length} className="p-1 font-bold text-center">REFERENCIAS</TableCell>
                                    </TableRow>
                                    {reporteData.referencias.filter(item => partidaInformeFilter === 'all' || item.partida === partidaInformeFilter).map(item => (
                                        <TableRow key={item.id} className={cn(partidaColorClasses[item.partida as PartidaProduccion] || '')}>
                                            <TableCell className="sticky left-0 bg-inherit p-1 font-semibold text-center">
                                                <Badge variant="outline" className="bg-white/80 w-full text-[9px] justify-center px-0.5">
                                                    <div className={cn("h-1.5 w-1.5 rounded-full mr-1", partidaColorCircles[item.partida as PartidaProduccion])}/>{item.partida}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="sticky left-10 bg-inherit font-semibold p-1">
                                                <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help">{item.nombre}</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div className="p-1 max-w-xs text-xs">
                                                        <p className="font-bold">Elaboraciones que la componen:</p>
                                                        <ul className="list-disc pl-4">{(item.componentes || []).map((c, i) => <li key={i}>{c.nombre} ({formatNumber(c.cantidadTotal,2)} {c.unidad})</li>)}</ul>
                                                    </div>
                                                </TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell className="text-right p-1 font-bold font-mono">{formatNumber(item.udTotales, 2)} {item.unidad}</TableCell>
                                            {reporteData.fechas.map(fecha => {
                                                const fechaKey = format(fecha, 'yyyy-MM-dd');
                                                return <TableCell key={`${item.id}-${fechaKey}`} className="text-center p-1 font-mono">{item.necesidadesPorDia[fechaKey] ? formatNumber(item.necesidadesPorDia[fechaKey], 2) : '-'}</TableCell>
                                            })}
                                        </TableRow>
                                    ))}
                                        <TableRow className="bg-muted hover:bg-muted"><TableCell colSpan={3 + reporteData.fechas.length} className="p-1 font-bold text-center">ELABORACIONES</TableCell></TableRow>
                                    {reporteData.elaboraciones.filter(item => partidaInformeFilter === 'all' || item.partida === partidaInformeFilter).map(item => (
                                            <TableRow key={item.id} className={cn(partidaColorClasses[item.partida as PartidaProduccion] || '')}>
                                            <TableCell className="sticky left-0 bg-inherit p-1 font-semibold text-center">
                                                <Badge variant="outline" className="bg-white/80 w-full text-[9px] justify-center px-0.5">
                                                    <div className={cn("h-1.5 w-1.5 rounded-full mr-1", partidaColorCircles[item.partida as PartidaProduccion])}/>{item.partida}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="sticky left-10 bg-inherit font-semibold p-1">
                                                <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help">{item.nombre}</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div className="p-1 max-w-xs text-xs">
                                                        <p className="font-bold">Usado en:</p>
                                                        <ul className="list-disc pl-4">{(item.usadoEn || []).map((r, i) => <li key={i}>{r.nombre} ({r.cantidad} {r.unidad})</li>)}</ul>
                                                    </div>
                                                </TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell className="text-right p-1 font-bold font-mono">{formatNumber(item.udTotales, 2)} {formatUnit(item.unidad)}</TableCell>
                                            {reporteData.fechas.map(fecha => {
                                                const fechaKey = format(fecha, 'yyyy-MM-dd');
                                                return <TableCell key={`${item.id}-${fechaKey}`} className="text-center p-1 font-mono">{item.necesidadesPorDia[fechaKey] ? formatNumber(item.necesidadesPorDia[fechaKey], 2) : '-'}</TableCell>
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
              </Card>
        </TabsContent>
        <TabsContent value="planificacion" className="mt-4 space-y-4">
            <Card>
                <CardHeader className="flex-row justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2"><ChefHat/>Necesidades de Producción Agregadas</CardTitle>
                    <div className="flex items-center gap-2">
                         <Button onClick={loadData} variant="outline" size="icon">
                           <RefreshCw className="h-4 w-4" />
                       </Button>
                        <Button size="sm" onClick={handleGenerateOFs} disabled={selectedNecesidades.size === 0}>
                            Generar OF para la selección ({selectedNecesidades.size})
                        </Button>
                    </div>
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
                                    <TableHead className="min-w-40">Elaboración</TableHead>
                                    <TableHead>Partida</TableHead>
                                    <TableHead className="text-right">Necesidad Total</TableHead>
                                    <TableHead className="text-right">Stock Disp.</TableHead>
                                    <TableHead className="text-right">Planificado</TableHead>
                                    <TableHead className="text-right font-bold text-primary">Necesidad Neta</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {necesidades.length > 0 ? necesidades.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell><Checkbox checked={selectedNecesidades.has(item.id)} onCheckedChange={(checked) => handleSelectNecesidad(item.id, !!checked)}/></TableCell>
                                    <TableCell>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="font-semibold cursor-help flex items-center gap-2">
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                            <span>{item.nombre}</span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="p-2 max-w-md">
                                            <div className="space-y-1">
                                                <p className="font-bold mb-1">Referencias que requieren esta elaboración:</p>
                                                {item.desgloseCompleto.map((d, i) => (
                                                    <p key={i} className="text-xs">
                                                        {format(new Date(d.fechaHito), 'dd/MM')}: {d.cantidadReceta} x "{d.recetaNombre}" &rarr; {formatNumber(d.cantidadNecesaria, 2)} {formatUnit(item.unidad)}
                                                    </p>
                                                ))}
                                            </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TableCell>
                                    <TableCell><Badge variant="secondary">{item.partida}</Badge></TableCell>
                                    <TableCell className="text-right font-mono">{formatNumber(item.cantidadNecesariaTotal, 2)} {formatUnit(item.unidad)}</TableCell>
                                    <TableCell className="text-right font-mono">{formatNumber(item.stockDisponible || 0, 2)} {formatUnit(item.unidad)}</TableCell>
                                    <TableCell className="text-right font-mono">{formatNumber(item.cantidadPlanificada || 0, 2)} {formatUnit(item.unidad)}</TableCell>
                                    <TableCell className="text-right font-mono font-bold text-primary">{formatNumber(item.cantidadNeta, 2)} {formatUnit(item.unidad)}</TableCell>
                                </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
                    <div className="flex items-center justify-between mb-4">
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
                            
                             <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-[240px]">
                                    <SelectValue placeholder="Filtrar por estado" />
                                </SelectTrigger>
                                <SelectContent>
                                     <SelectItem value="all">Todos los Estados</SelectItem>
                                    {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <Button asChild>
                            <Link href="/cpr/of/nuevo">
                                <PlusCircle className="mr-2"/>
                                Nueva OF Manual
                            </Link>
                        </Button>
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
                                    onClick={() => router.push(`/cpr/of/${of.id}`)}
                                >
                                    <TableCell className="font-medium">{of.id}</TableCell>
                                    <TableCell>{of.elaboracionNombre}</TableCell>
                                    <TableCell>{formatNumber(of.cantidadTotal, 2)} {formatUnit(of.unidad)}</TableCell>
                                    <TableCell>{of.cantidadReal ? `${formatNumber(of.cantidadReal, 2)} ${formatUnit(of.unidad)}` : '-'}</TableCell>
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
      <div className="container flex h-14 items-center">
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
- src/components/os/layout/os-header-content.tsx:
```tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { ServiceOrder } from '@/types';
import { ObjectiveDisplay } from '@/components/os/objective-display';
import { Briefcase, Utensils, Wine, Leaf, Warehouse, Archive, Truck, Snowflake, Euro, FilePlus, Users, UserPlus, Flower2, ClipboardCheck, PanelLeft, Building, FileText, Star, Menu, ClipboardList, Calendar, LayoutDashboard, Phone, ChevronRight, FilePenLine } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { navLinks } from './os-nav-links';


const getInitials = (name: string) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

export function OsHeaderContent({ osId }: { osId: string }) {
    const pathname = usePathname();
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [updateKey, setUpdateKey] = useState(Date.now());

    useEffect(() => {
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const currentOS = allServiceOrders.find(os => os.id === osId);
        setServiceOrder(currentOS || null);

        const handleStorageChange = () => {
            setUpdateKey(Date.now());
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [osId, updateKey]);
    
    const {currentModule, isSubPage} = useMemo(() => {
        const pathSegments = pathname.split('/').filter(Boolean); // e.g., ['os', '123', 'gastronomia', '456']
        const osIndex = pathSegments.indexOf('os');
        const moduleSegment = pathSegments[osIndex + 2];
        const subPageSegment = pathSegments[osIndex + 3];

        const module = navLinks.find(link => link.path === moduleSegment);
        
        if (module) {
            return { currentModule: module, isSubPage: !!subPageSegment };
        }

        if (moduleSegment === 'info' || !moduleSegment) {
            return { currentModule: { title: 'Información OS', icon: FileText, path: 'info'}, isSubPage: false};
        }

        return { currentModule: { title: 'Panel de Control', icon: LayoutDashboard, path: '' }, isSubPage: false };
    }, [pathname]);

    if (!serviceOrder) {
        return (
             <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-32" />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Skeleton className="h-6 w-36" />
                </div>
                 <div className="flex justify-between items-center text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md h-9">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-5 w-1/4" />
                </div>
             </div>
        );
    }
    
    const durationDays = serviceOrder.startDate && serviceOrder.endDate ? differenceInDays(new Date(serviceOrder.endDate), new Date(serviceOrder.startDate)) + 1 : 0;
    
    const responsables = [
        {label: 'Comercial', name: serviceOrder.comercial},
        {label: 'Metre', name: serviceOrder.respMetre},
        {label: 'PM', name: serviceOrder.respProjectManager},
        {label: 'Pase', name: serviceOrder.respPase},
    ].filter(r => r.name);

    return (
        <TooltipProvider>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Link href={`/os/${osId}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <ClipboardList className="h-5 w-5"/>
                        <span>{serviceOrder.serviceNumber}</span>
                    </Link>
                    {currentModule && (
                        <>
                         <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                         <Link href={`/os/${osId}/${currentModule.path}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                            <currentModule.icon className="h-5 w-5"/>
                            <span>{currentModule.title}</span>
                         </Link>
                        </>
                    )}
                    {isSubPage && (
                         <>
                             <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                             <span className="flex items-center gap-2 font-bold text-primary">
                                 <FilePenLine className="h-5 w-5"/>
                                 <span>Edición</span>
                             </span>
                         </>
                    )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {(currentModule?.moduleName) && <ObjectiveDisplay osId={osId} moduleName={currentModule.moduleName} updateKey={updateKey} />}
                  {serviceOrder.isVip && <Badge variant="default" className="bg-amber-400 text-black hover:bg-amber-500"><Star className="h-4 w-4 mr-1"/> VIP</Badge>}
                </div>
              </div>
               <div className="flex justify-between items-center text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md">
                    <div className="flex items-center gap-3">
                       {responsables.map(resp => (
                           <Tooltip key={resp.label}>
                                <TooltipTrigger className="flex items-center gap-2 cursor-default">
                                    <span className="font-semibold">{resp.label}:</span>
                                    <Avatar className="h-6 w-6 text-xs">
                                        <AvatarFallback>{getInitials(resp.name || '')}</AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{resp.name}</p>
                                </TooltipContent>
                            </Tooltip>
                       ))}
                    </div>
                    <div className="flex items-center gap-4">
                        {serviceOrder.startDate && serviceOrder.endDate && (
                            <div className="flex items-center gap-2 font-semibold">
                                <Calendar className="h-4 w-4"/>
                                <span>{format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')} - {format(new Date(serviceOrder.endDate), 'dd/MM/yyyy')}</span>
                                {durationDays > 0 && <Badge variant="outline">{durationDays} día{durationDays > 1 && 's'}</Badge>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
```
- src/components/os/layout/os-nav-links.ts:
```ts


'use client';
import { Briefcase, Utensils, Wine, Leaf, Warehouse, Archive, Truck, Snowflake, Euro, FilePlus, Users, UserPlus, Flower2, ClipboardCheck, Info, FileText } from 'lucide-react';

export const navLinks = [
    { path: 'info', title: 'Información OS', icon: FileText },
    { path: 'comercial', title: 'Comercial', icon: Briefcase },
    { path: 'gastronomia', title: 'Gastronomía', icon: Utensils, moduleName: 'gastronomia' },
    { path: 'bodega', title: 'Bebida', icon: Wine, moduleName: 'bodega' },
    { path: 'hielo', title: 'Hielo', icon: Snowflake, moduleName: 'hielo' },
    { path: 'bio', title: 'Bio (Consumibles)', icon: Leaf, moduleName: 'consumibles' },
    { path: 'almacen', title: 'Almacén', icon: Warehouse, moduleName: 'almacen' },
    { path: 'alquiler', title: 'Alquiler', icon: Archive, moduleName: 'alquiler' },
    { path: 'decoracion', title: 'Decoración', icon: Flower2, moduleName: 'decoracion' },
    { path: 'atipicos', title: 'Atípicos', icon: FilePlus, moduleName: 'atipicos' },
    { path: 'personal-mice', title: 'Personal MICE', icon: Users, moduleName: 'personalMice' },
    { path: 'personal-externo', title: 'Personal Externo', icon: UserPlus, moduleName: 'personalExterno' },
    { path: 'transporte', title: 'Transporte', icon: Truck, moduleName: 'transporte' },
    { path: 'prueba-menu', title: 'Prueba de Menu', icon: ClipboardCheck, moduleName: 'costePruebaMenu' },
    { path: 'cta-explotacion', title: 'Cta. Explotación', icon: Euro },
];

```
- src/app/os/almacen/layout.tsx:
```tsx
'use client';

export default function AlmacenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

```
- src/app/os/alquiler/layout.tsx:
```tsx
'use client';

export default function AlquilerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

```
- src/app/os/atipicos/layout.tsx:
```tsx
'use client';

export default function AtipicosLayout({
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
- src/app/os/bio/layout.tsx:
```tsx
'use client';

export default function BioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

```
- src/app/os/bodega/layout.tsx:
```tsx
'use client';

export default function BodegaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

```
- src/app/os/comercial/layout.tsx:
```tsx
'use client';

export default function ComercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

```
- src/app/os/cta-explotacion/layout.tsx:
```tsx
'use client';

export default function CtaExplotacionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

```
- src/app/os/decoracion/layout.tsx:
```tsx
'use client';

export default function DecoracionLayout({
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
- src/app/os/gastronomia/layout.tsx:
```tsx

'use client';

export default function GastronomiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}

```
- src/app/os/hielo/layout.tsx:
```tsx
'use client';

export default function HieloLayout({
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
- src/app/os/prueba-menu/layout.tsx:
```tsx
'use client';

export default function PruebaMenuLayout({
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
- src/app/os/transporte/layout.tsx:
```tsx
'use client';

export default function TransporteLayout({
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
- src/components/layout/loading-page.tsx:
```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="space-y-4 text-center">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    </div>
  );
}

```
```

In []:
¡Uf! Tienes toda la razón, ese error es frustrante y es otro despiste mío. He vuelto a usar un componente sin asegurarme de que estuviera importado. El `Separator` es un componente de la UI y necesita su propia declaración `import`.

Para arreglarlo, he añadido la importación de `Separator` al archivo `src/app/cpr/of/page.tsx`.

Agradezco de nuevo tu paciencia mientras corrijo estos errores básicos.

<changes>
  <description>Se importa el componente `Separator` que faltaba en `src/app/cpr/of/page.tsx` para solucionar un error de renderizado.</description>
  <change>
    <file>src/app/cpr/of/page.tsx</file>
    <content><![CDATA[

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Factory, Search, RefreshCw, Info, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Layers, Utensils, ClipboardList, FileText, Users, ChefHat } from 'lucide-react';
import type { OrdenFabricacion, PartidaProduccion, ServiceOrder, ComercialBriefing, ComercialBriefingItem, GastronomyOrder, Receta, Elaboracion, ExcedenteProduccion, StockElaboracion, Personal, PickingState } from '@/types';
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
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, addDays, isSameDay, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatNumber, formatUnit, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';


type NecesidadDesgloseItem = {
    osId: string;
    osNumber: string;
    osSpace: string;
    hitoId: string;
    hitoDescripcion: string;
    fechaHito: string;
    recetaId: string;
    recetaNombre: string;
    cantidadReceta: number;
    cantidadNecesaria: number;
};

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


type ReporteProduccionItem = {
    id: string;
    nombre: string;
    partida: string;
    udTotales: number;
    unidad: string;
    necesidadesPorDia: Record<string, number>;
    componentes?: { nombre: string; cantidad: number; unidad: string, cantidadTotal: number }[];
    usadoEn?: { nombre: string; cantidad: number; unidad: string }[];
};
type ReporteResumenPartida = {
    referencias: number;
    unidades: number;
    elaboraciones: number;
}
type ReporteData = {
    fechas: Date[];
    resumen: {
        contratos: number;
        contratosDetalle: string[];
        servicios: number;
        serviciosDetalle: string[];
        comensales: number;
        referencias: number;
        unidades: number;
        elaboraciones: number;
        resumenPorPartida: Record<string, ReporteResumenPartida>;
    };
    referencias: ReporteProduccionItem[];
    elaboraciones: ReporteProduccionItem[];
};


const statusVariant: { [key in OrdenFabricacion['estado']]: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' } = {
  'Pendiente': 'secondary',
  'Asignada': 'default',
  'En Proceso': 'outline',
  'Finalizado': 'success',
  'Incidencia': 'destructive',
  'Validado': 'success',
};

const partidaColorClasses: Record<PartidaProduccion, string> = {
    FRIO: 'bg-green-100/50 hover:bg-green-100/80',
    CALIENTE: 'bg-red-100/50 hover:bg-red-100/80',
    PASTELERIA: 'bg-blue-100/50 hover:bg-blue-100/80',
    EXPEDICION: 'bg-yellow-100/50 hover:bg-yellow-100/80'
};

const partidaColorCircles: Record<PartidaProduccion, string> = {
    FRIO: 'bg-green-500',
    CALIENTE: 'bg-red-500',
    PASTELERIA: 'bg-blue-500',
    EXPEDICION: 'bg-yellow-500'
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
  const [partidaInformeFilter, setPartidaInformeFilter] = useState<string>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [elaboracionesMap, setElaboracionesMap] = useState<Map<string, Elaboracion>>(new Map());
  
  const [necesidades, setNecesidades] = useState<NecesidadItem[]>([]);
  const [selectedNecesidades, setSelectedNecesidades] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [reporteData, setReporteData] = useState<ReporteData | null>(null);


  const router = useRouter();
  const { toast } = useToast();
  
  const loadData = useCallback(() => {
    
    // --- STAGE 1: RAW DATA ---
    const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.status === 'Confirmado');
    const allGastroOrders = (JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[]);
    const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const allOFs = (JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[]);
    const stockElaboraciones: Record<string, StockElaboracion> = JSON.parse(localStorage.getItem('stockElaboraciones') || '{}');
    const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as Record<string, PickingState>;
    
    setOrdenes(allOFs);
    
    const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    setPersonalCPR(allPersonal.filter(p => p.departamento === 'CPR'));
    const elabMap = new Map(allElaboraciones.map(e => [e.id, e]));
    setElaboracionesMap(elabMap);

    if (!dateRange?.from) {
      setNecesidades([]);
      setIsMounted(true);
      return;
    }
    
    const osMap = new Map(allServiceOrders.map(os => [os.id, os]));
    const recetasMap = new Map(allRecetas.map(r => [r.id, r]));
    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const briefingsMap = new Map(allBriefings.map(b => [b.osId, b]));

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
        const os = osMap.get(gastroOrder.osId);
        const briefing = briefingsMap.get(gastroOrder.osId);
        if(!os || !briefing) return;
        
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
                
                const hito = briefing.items.find(h => h.id === gastroOrder.id);
                necesidad.desgloseCompleto.push({
                    osId: os.id,
                    osNumber: os.serviceNumber,
                    osSpace: os.space,
                    hitoId: hito?.id || '',
                    hitoDescripcion: hito?.descripcion || '',
                    fechaHito: hito?.fecha || '',
                    recetaId: receta.id,
                    recetaNombre: receta.nombre,
                    cantidadReceta: item.quantity || 1,
                    cantidadNecesaria: cantidadNecesaria
                });
            });
        });
      } catch (e) {
      }
    });


    // --- STAGE 4: CALCULATE NET NEEDS ---
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
        
        const cantidadPlanificada = ofsExistentes.reduce((sum, of) => {
          const isFinalizado = of.estado === 'Finalizado' || of.estado === 'Validado';
          return sum + (isFinalizado && of.cantidadReal ? of.cantidadReal : of.cantidadTotal)
        }, 0);
        
        const stockTotalBruto = stockElaboraciones[necesidad.id]?.cantidadTotal || 0;
        const stockAsignado = stockAsignadoGlobal[necesidad.id] || 0;
        const stockDisponible = Math.max(0, stockTotalBruto - stockAsignado);
        
        const stockAUtilizar = Math.min(necesidad.cantidadNecesariaTotal, stockDisponible);
        const cantidadNeta = necesidad.cantidadNecesariaTotal - stockAUtilizar - cantidadPlanificada;

        return {
          ...necesidad,
          stockDisponible: stockAUtilizar,
          cantidadPlanificada,
          cantidadNeta,
          desgloseDiario: necesidad.desgloseDiario.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        };
    }).filter(n => n.cantidadNeta > 0.001);

    setNecesidades(necesidadesArray);

    // --- STAGE 5: CALCULATE REPORT DATA ---
    if (dateRange.from && dateRange.to) {
      const fechasDelRango = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      const recetasInforme: Map<string, ReporteProduccionItem> = new Map();
      const elaboracionesInforme: Map<string, ReporteProduccionItem> = new Map();
      
      const resumenPorPartida: Record<string, ReporteResumenPartida> = {
          'FRIO': { referencias: 0, unidades: 0, elaboraciones: 0 },
          'CALIENTE': { referencias: 0, unidades: 0, elaboraciones: 0 },
          'PASTELERIA': { referencias: 0, unidades: 0, elaboraciones: 0 },
          'EXPEDICION': { referencias: 0, unidades: 0, elaboraciones: 0 },
      };

      const osDetailsSet = new Set<string>();
      const serviciosCount: Record<string, number> = {};

      gastroOrdersInRange.forEach(order => {
          const os = osMap.get(order.osId);
          if (!os) return;

          osDetailsSet.add(`${format(new Date(os.startDate), 'dd/MM/yy')} / ${os.serviceNumber} / ${os.space}`);
          serviciosCount[order.descripcion] = (serviciosCount[order.descripcion] || 0) + 1;
          const fechaKey = format(new Date(order.fecha), 'yyyy-MM-dd');

          (order.items || []).forEach(item => {
              if (item.type !== 'item') return;
              
              const receta = recetasMap.get(item.id);
              if (!receta) return;

              let recetaItem = recetasInforme.get(receta.id);
              if (!recetaItem) {
                  const componentes = receta.elaboraciones.map(e => {
                      const elabInfo = elabMap.get(e.elaboracionId);
                      const cantidadTotal = e.cantidad * (item.quantity || 0)
                      return { nombre: elabInfo?.nombre || '?', cantidad: e.cantidad, unidad: elabInfo?.unidadProduccion || '?', cantidadTotal };
                  })
                  recetaItem = { id: receta.id, nombre: receta.nombre, partida: receta.partidaProduccion || 'N/A', udTotales: 0, unidad: 'Uds', necesidadesPorDia: {}, componentes };
                  recetasInforme.set(receta.id, recetaItem);
                  if(receta.partidaProduccion && resumenPorPartida[receta.partidaProduccion]){
                      resumenPorPartida[receta.partidaProduccion].referencias++;
                  }
              }
              const cantidadReceta = item.quantity || 0;
              recetaItem.udTotales += cantidadReceta;
               if(receta.partidaProduccion && resumenPorPartida[receta.partidaProduccion]){
                  resumenPorPartida[receta.partidaProduccion].unidades += cantidadReceta;
              }


              recetaItem.componentes?.forEach(c => {
                  const elabReceta = receta.elaboraciones.find(e => elabMap.get(e.elaboracionId)?.nombre === c.nombre);
                  if(elabReceta) {
                      c.cantidadTotal += cantidadReceta * elabReceta.cantidad;
                  }
              });

               if(!recetaItem.necesidadesPorDia[fechaKey]) recetaItem.necesidadesPorDia[fechaKey] = 0;
              recetaItem.necesidadesPorDia[fechaKey] += cantidadReceta;

              (receta.elaboraciones || []).forEach(elabEnReceta => {
                  const elab = elabMap.get(elabEnReceta.elaboracionId);
                  if (!elab) return;

                  let elabItem = elaboracionesInforme.get(elab.id);
                  if (!elabItem) {
                      elabItem = { id: elab.id, nombre: elab.nombre, partida: elab.partidaProduccion, udTotales: 0, unidad: elab.unidadProduccion, necesidadesPorDia: {}, usadoEn: [] };
                      elaboracionesInforme.set(elab.id, elabItem);
                      if(elab.partidaProduccion && resumenPorPartida[elab.partidaProduccion]){
                          resumenPorPartida[elab.partidaProduccion].elaboraciones++;
                      }
                  }
                  const elabInReceta = elabItem.usadoEn?.find(r => r.nombre === receta.nombre);
                  if(!elabInReceta) {
                       elabItem.usadoEn?.push({ nombre: receta.nombre, cantidad: elabEnReceta.cantidad, unidad: elab.unidadProduccion });
                  }
                  const cantidadElab = cantidadReceta * elabEnReceta.cantidad;
                  elabItem.udTotales += cantidadElab;
                   if(!elabItem.necesidadesPorDia[fechaKey]) elabItem.necesidadesPorDia[fechaKey] = 0;
                  elabItem.necesidadesPorDia[fechaKey] += cantidadElab;
              });
          });
      });
      
      const finalResumen = {
          contratos: osDetailsSet.size,
          contratosDetalle: Array.from(osDetailsSet),
          servicios: Object.values(serviciosCount).reduce((sum, count) => sum + count, 0),
          serviciosDetalle: Object.entries(serviciosCount).map(([tipo, count]) => `${count} x ${tipo}`),
          comensales: allServiceOrders
                        .filter(os => isWithinInterval(new Date(os.startDate), { start: rangeStart, end: rangeEnd }))
                        .reduce((sum, os) => sum + (os.asistentes || 0), 0),
          referencias: recetasInforme.size,
          unidades: Array.from(recetasInforme.values()).reduce((sum, item) => sum + item.udTotales, 0),
          elaboraciones: elaboracionesInforme.size,
          resumenPorPartida,
      };

      setReporteData({
          fechas: fechasDelRango,
          resumen: finalResumen,
          referencias: Array.from(recetasInforme.values()).sort((a,b) => a.nombre.localeCompare(b.nombre)),
          elaboraciones: Array.from(elaboracionesInforme.values()).sort((a,b) => a.nombre.localeCompare(b.nombre)),
      });
    }


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
            try {
                const itemDate = (item.estado === 'Pendiente' || item.estado === 'Asignada') 
                    ? parseISO(item.fechaProduccionPrevista)
                    : item.fechaFinalizacion ? parseISO(item.fechaFinalizacion) : parseISO(item.fechaProduccionPrevista);
                
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
    setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
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

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4 mb-4 p-4 border rounded-lg bg-card">
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button id="date" variant={"outline"} className={cn("w-[380px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Elige un rango</span>)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 flex" align="start">
            <div className="p-2 border-r">
              <div className="flex flex-col gap-1">
                  <Button variant="outline" size="sm" onClick={() => {setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }); setIsDatePickerOpen(false);}}>Esta semana</Button>
                  <Button variant="outline" size="sm" onClick={() => {const nextWeekStart = startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 }); setDateRange({ from: nextWeekStart, to: endOfWeek(nextWeekStart, { weekStartsOn: 1 }) }); setIsDatePickerOpen(false);}}>Próxima semana</Button>
                  <Button variant="outline" size="sm" onClick={() => {setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }); setIsDatePickerOpen(false);}}>Este mes</Button>
              </div>
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(range) => { setDateRange(range); if (range?.from && range?.to) { setIsDatePickerOpen(false); }}}
              numberOfMonths={2}
              locale={es}
            />
          </PopoverContent>
        </Popover>
        <div className="flex-grow flex justify-end items-center gap-2">
            <Select value={partidaFilter} onValueChange={setPartidaFilter}>
                <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue placeholder="Filtrar por partida" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas las Partidas</SelectItem>
                    {partidas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
            </Select>
            <Button variant="secondary" onClick={handleClearFilters}>Limpiar Filtros</Button>
        </div>
      </div>
      <Tabs defaultValue="planificacion">
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tabla-necesidades">Tabla Necesidades</TabsTrigger>
            <TabsTrigger value="planificacion">Planificación</TabsTrigger>
            <TabsTrigger value="creadas">OF Creadas</TabsTrigger>
            <TabsTrigger value="asignacion">Asignación de Órdenes</TabsTrigger>
        </TabsList>
        <TabsContent value="tabla-necesidades" className="mt-4">
          <Card>
            <CardContent className="p-2">
                 {reporteData && (
                     <div className="text-xs font-medium bg-muted/70 p-2 mt-2 rounded-md space-y-1.5">
                        <div className="flex items-center justify-around">
                            <Tooltip>
                                <TooltipTrigger asChild><div className="flex items-center space-x-1.5 cursor-pointer"><ClipboardList className="h-4 w-4 text-muted-foreground"/><span className="font-bold">{reporteData.resumen.contratos}</span><span className="text-muted-foreground">Contratos</span></div></TooltipTrigger>
                                <TooltipContent><div className="p-2 space-y-1 text-sm">{reporteData.resumen.contratosDetalle.map((d, i) => <p key={i}>{d}</p>)}</div></TooltipContent>
                            </Tooltip>
                            <Separator orientation="vertical" className="h-4"/>
                            <Tooltip>
                                <TooltipTrigger asChild><div className="flex items-center space-x-1.5 cursor-pointer"><FileText className="h-4 w-4 text-muted-foreground"/><span className="font-bold">{reporteData.resumen.servicios}</span><span className="text-muted-foreground">Servicios</span></div></TooltipTrigger>
                                <TooltipContent><div className="p-2 space-y-1 text-sm">{reporteData.resumen.serviciosDetalle.map((d, i) => <p key={i}>{d}</p>)}</div></TooltipContent>
                            </Tooltip>
                            <Separator orientation="vertical" className="h-4"/>
                            <div className="flex items-center space-x-1.5"><Users className="h-4 w-4 text-muted-foreground"/><span className="font-bold">{formatNumber(reporteData.resumen.comensales,0)}</span><span className="text-muted-foreground">Comensales</span></div>
                            <Separator orientation="vertical" className="h-4"/>
                            <div className="flex items-center space-x-1.5"><Layers className="h-4 w-4 text-muted-foreground"/><span className="font-bold">{reporteData.resumen.referencias}</span><span className="text-muted-foreground">Referencias</span></div>
                            <Separator orientation="vertical" className="h-4"/>
                            <div className="flex items-center space-x-1.5"><Utensils className="h-4 w-4 text-muted-foreground"/><span className="font-bold">{formatNumber(reporteData.resumen.unidades,0)}</span><span className="text-muted-foreground">Uds. Ref.</span></div>
                            <Separator orientation="vertical" className="h-4"/>
                            <div className="flex items-center space-x-1.5"><ChefHat className="h-4 w-4 text-muted-foreground"/><span className="font-bold">{reporteData.resumen.elaboraciones}</span><span className="text-muted-foreground">Elaboraciones</span></div>
                        </div>
                        <Separator className="my-1.5"/>
                        <div className="flex items-center gap-3 justify-center">
                            {partidas.map(p => {
                                const data = reporteData.resumen.resumenPorPartida[p];
                                if (!data || (data.referencias === 0 && data.unidades === 0 && data.elaboraciones === 0)) return null;
                                return (
                                    <div key={p} className="flex items-center gap-2">
                                        <div className={cn("h-2.5 w-2.5 rounded-full", partidaColorCircles[p])}/>
                                        <span className="font-bold">{p}:</span>
                                        <span className="text-muted-foreground">Ref:</span><span className="font-semibold">{data.referencias}</span>
                                        <span className="text-muted-foreground">Uds:</span><span className="font-semibold">{formatNumber(data.unidades,0)}</span>
                                        <span className="text-muted-foreground">Elab:</span><span className="font-semibold">{data.elaboraciones}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                 )}
            </CardContent>
            <CardContent>
                {reporteData && (
                    <div className="border rounded-lg overflow-x-auto max-h-[70vh]">
                        <Table className="text-[10px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-secondary/80 backdrop-blur-sm p-1 w-10 text-center uppercase">Partida</TableHead>
                                    <TableHead className="sticky left-10 bg-secondary/80 backdrop-blur-sm min-w-48 p-1 uppercase">Referencia / Elaboración</TableHead>
                                    <TableHead className="text-right p-1 uppercase">Total</TableHead>
                                    {reporteData.fechas.map(fecha => (
                                        <TableHead key={fecha.toISOString()} className="text-center p-1 min-w-16">
                                            <div className="capitalize font-normal">{format(fecha, 'EEE', {locale: es})}</div>
                                            <div className="font-bold">{format(fecha, 'dd/MM')}</div>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="bg-muted hover:bg-muted"><TableCell colSpan={3 + reporteData.fechas.length} className="p-1 font-bold text-center">REFERENCIAS</TableCell>
                                </TableRow>
                                {reporteData.referencias.filter(item => partidaInformeFilter === 'all' || item.partida === partidaInformeFilter).map(item => (
                                    <TableRow key={item.id} className={cn(partidaColorClasses[item.partida as PartidaProduccion] || '')}>
                                        <TableCell className="sticky left-0 bg-inherit p-1 font-semibold text-center">
                                            <Badge variant="outline" className="bg-white/80 w-full text-[9px] justify-center px-0.5">
                                                <div className={cn("h-1.5 w-1.5 rounded-full mr-1", partidaColorCircles[item.partida as PartidaProduccion])}/>{item.partida}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="sticky left-10 bg-inherit font-semibold p-1">
                                            <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="cursor-help">{item.nombre}</span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="p-1 max-w-xs text-xs">
                                                    <p className="font-bold">Elaboraciones que la componen:</p>
                                                    <ul className="list-disc pl-4">{(item.componentes || []).map((c, i) => <li key={i}>{c.nombre} ({formatNumber(c.cantidadTotal,2)} {c.unidad})</li>)}</ul>
                                                </div>
                                            </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell className="text-right p-1 font-bold font-mono">{formatNumber(item.udTotales, 2)} {item.unidad}</TableCell>
                                        {reporteData.fechas.map(fecha => {
                                            const fechaKey = format(fecha, 'yyyy-MM-dd');
                                            return <TableCell key={`${item.id}-${fechaKey}`} className="text-center p-1 font-mono">{item.necesidadesPorDia[fechaKey] ? formatNumber(item.necesidadesPorDia[fechaKey], 2) : '-'}</TableCell>
                                        })}
                                    </TableRow>
                                ))}
                                    <TableRow className="bg-muted hover:bg-muted"><TableCell colSpan={3 + reporteData.fechas.length} className="p-1 font-bold text-center">ELABORACIONES</TableCell></TableRow>
                                {reporteData.elaboraciones.filter(item => partidaInformeFilter === 'all' || item.partida === partidaInformeFilter).map(item => (
                                        <TableRow key={item.id} className={cn(partidaColorClasses[item.partida as PartidaProduccion] || '')}>
                                        <TableCell className="sticky left-0 bg-inherit p-1 font-semibold text-center">
                                            <Badge variant="outline" className="bg-white/80 w-full text-[9px] justify-center px-0.5">
                                                <div className={cn("h-1.5 w-1.5 rounded-full mr-1", partidaColorCircles[item.partida as PartidaProduccion])}/>{item.partida}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="sticky left-10 bg-inherit font-semibold p-1">
                                            <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="cursor-help">{item.nombre}</span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="p-1 max-w-xs text-xs">
                                                    <p className="font-bold">Usado en:</p>
                                                    <ul className="list-disc pl-4">{(item.usadoEn || []).map((r, i) => <li key={i}>{r.nombre} ({r.cantidad} {r.unidad})</li>)}</ul>
                                                </div>
                                            </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell className="text-right p-1 font-bold font-mono">{formatNumber(item.udTotales, 2)} {formatUnit(item.unidad)}</TableCell>
                                        {reporteData.fechas.map(fecha => {
                                            const fechaKey = format(fecha, 'yyyy-MM-dd');
                                            return <TableCell key={`${item.id}-${fechaKey}`} className="text-center p-1 font-mono">{item.necesidadesPorDia[fechaKey] ? formatNumber(item.necesidadesPorDia[fechaKey], 2) : '-'}</TableCell>
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="planificacion" className="mt-4 space-y-4">
            <Card>
                <CardHeader className="flex-row justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2"><ChefHat/>Necesidades de Producción Agregadas</CardTitle>
                    <div className="flex items-center gap-2">
                         <Button onClick={loadData} variant="outline" size="icon">
                           <RefreshCw className="h-4 w-4" />
                       </Button>
                        <Button size="sm" onClick={handleGenerateOFs} disabled={selectedNecesidades.size === 0}>
                            Generar OF para la selección ({selectedNecesidades.size})
                        </Button>
                    </div>
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
                                    <TableHead className="min-w-40">Elaboración</TableHead>
                                    <TableHead>Partida</TableHead>
                                    <TableHead className="text-right">Necesidad Total</TableHead>
                                    <TableHead className="text-right">Stock Disp.</TableHead>
                                    <TableHead className="text-right">Planificado</TableHead>
                                    <TableHead className="text-right font-bold text-primary">Necesidad Neta</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {necesidades.length > 0 ? necesidades.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell><Checkbox checked={selectedNecesidades.has(item.id)} onCheckedChange={(checked) => handleSelectNecesidad(item.id, !!checked)}/></TableCell>
                                    <TableCell>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="font-semibold cursor-help flex items-center gap-2">
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                            <span>{item.nombre}</span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="p-2 max-w-md">
                                            <div className="space-y-1">
                                                <p className="font-bold mb-1">Referencias que requieren esta elaboración:</p>
                                                {item.desgloseCompleto.map((d, i) => (
                                                    <p key={i} className="text-xs">
                                                        {format(new Date(d.fechaHito), 'dd/MM')}: {d.cantidadReceta} x "{d.recetaNombre}" &rarr; {formatNumber(d.cantidadNecesaria, 2)} {formatUnit(item.unidad)}
                                                    </p>
                                                ))}
                                            </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TableCell>
                                    <TableCell><Badge variant="secondary">{item.partida}</Badge></TableCell>
                                    <TableCell className="text-right font-mono">{formatNumber(item.cantidadNecesariaTotal, 2)} {formatUnit(item.unidad)}</TableCell>
                                    <TableCell className="text-right font-mono">{formatNumber(item.stockDisponible || 0, 2)} {formatUnit(item.unidad)}</TableCell>
                                    <TableCell className="text-right font-mono">{formatNumber(item.cantidadPlanificada || 0, 2)} {formatUnit(item.unidad)}</TableCell>
                                    <TableCell className="text-right font-mono font-bold text-primary">{formatNumber(item.cantidadNeta, 2)} {formatUnit(item.unidad)}</TableCell>
                                </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
                    <div className="flex items-center justify-between mb-4">
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
                            
                             <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-[240px]">
                                    <SelectValue placeholder="Filtrar por estado" />
                                </SelectTrigger>
                                <SelectContent>
                                     <SelectItem value="all">Todos los Estados</SelectItem>
                                    {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <Button asChild>
                            <Link href="/cpr/of/nuevo">
                                <PlusCircle className="mr-2"/>
                                Nueva OF Manual
                            </Link>
                        </Button>
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
                                    onClick={() => router.push(`/cpr/of/${of.id}`)}
                                >
                                    <TableCell className="font-medium">{of.id}</TableCell>
                                    <TableCell>{of.elaboracionNombre}</TableCell>
                                    <TableCell>{formatNumber(of.cantidadTotal, 2)} {formatUnit(of.unidad)}</TableCell>
                                    <TableCell>{of.cantidadReal ? `${formatNumber(of.cantidadReal, 2)} ${formatUnit(of.unidad)}` : '-'}</TableCell>
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
