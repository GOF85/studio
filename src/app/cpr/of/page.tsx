

'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { PlusCircle, Factory, Search, RefreshCw, Info, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Layers, Utensils, ClipboardList, FileText, Users, ChefHat, Printer, MoreHorizontal, Pencil, Trash2, Archive, CheckSquare } from 'lucide-react';
import type { OrdenFabricacion, PartidaProduccion, ServiceOrder, ComercialBriefing, ComercialBriefingItem, GastronomyOrder, Receta, Elaboracion, ExcedenteProduccion, StockElaboracion, Personal, PickingState, LoteAsignado, ArticuloERP, IngredienteInterno, Proveedor, PedidoEntrega, Entrega, ProductoVenta, ComponenteElaboracion } from '@/types';
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
import { format, isWithinInterval, startOfDay, endOfDay, addDays, isSameDay, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatNumber, formatUnit, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { useDataStore } from '@/hooks/use-data-store';


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

type IngredienteDeCompra = {
    erpId: string;
    nombreProducto: string;
    refProveedor: string;
    formatoCompra: string;
    necesidadNeta: number;
    unidadNeta: string;
    unidadConversion: number;
    precioCompra: number;
    descuento: number;
    desgloseUso: { receta: string, elaboracion: string, cantidad: number }[];
};

type ProveedorConLista = Proveedor & {
    listaCompra: IngredienteDeCompra[];
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

function OfPageContent() {
    const { data, isLoaded, loadAllData } = useDataStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [partidaFilter, setPartidaFilter] = useState('all');
    const [partidaInformeFilter, setPartidaInformeFilter] = useState<string>('all');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
    
    const [selectedNecesidades, setSelectedNecesidades] = useState<Set<string>>(new Set());
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [reporteData, setReporteData] = useState<ReporteData | null>(null);

    const [redondearCompra, setRedondearCompra] = useState(false);
    const [pedidoParaImprimir, setPedidoParaImprimir] = useState<ProveedorConLista | null>(null);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);


    const router = useRouter();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        loadAllData();
        setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
    }, [loadAllData]);
    
    const proveedoresMap = useMemo(() => {
        if (!isLoaded || !data?.proveedores) return new Map();
        const map = new Map<string, Proveedor>();
        data.proveedores.forEach(p => {
            if(p.IdERP) map.set(p.IdERP, p);
        });
        return map;
    }, [isLoaded, data?.proveedores]);

    const articulosErpMap = useMemo(() => {
        if (!isLoaded || !data?.ingredientesERP) return new Map();
        return new Map(data.ingredientesERP.map(a => [a.idreferenciaerp, a]));
    }, [isLoaded, data?.ingredientesERP]);

    const ingredientesMap = useMemo(() => {
        if (!isLoaded || !data?.ingredientesInternos) return new Map();
        return new Map(data.ingredientesInternos.map(i => [i.id, i]));
    }, [isLoaded, data?.ingredientesInternos]);

    const elaboracionesMap = useMemo(() => {
        if (!isLoaded || !data?.elaboraciones) return new Map();
        return new Map(data.elaboraciones.map(e => [e.id, e]));
    }, [isLoaded, data?.elaboraciones]);
    
    const { ordenes, personalCPR, serviceOrdersMap, necesidades, necesidadesCubiertas, pickingStates } = useMemo(() => {
        if (!isLoaded || !data) return { ordenes: [], personalCPR: [], elaboracionesMap: new Map(), serviceOrdersMap: new Map(), necesidades: [], necesidadesCubiertas: [], pickingStates: {} };

        const allOFs = data.ordenesFabricacion;
        const allPersonal = data.personal.filter(p => p.departamento === 'CPR');
        const osMap = new Map(data.serviceOrders.map(os => [os.id, os]));
        const allPickingStatesData = data.pickingStates;
        
        const necesidadesAgregadas: Map<string, NecesidadItem> = new Map();

        if (!dateRange?.from) return { ordenes: allOFs, personalCPR: allPersonal, elaboracionesMap, serviceOrdersMap: osMap, necesidades: [], necesidadesCubiertas: [], pickingStates: allPickingStatesData };

        const rangeStart = startOfDay(dateRange.from);
        const rangeEnd = endOfDay(dateRange.to || dateRange.from);

        // --- CATERING ---
        const gastroOrdersInRange = data.gastronomyOrders.filter(order => {
            try {
                const hitoDate = startOfDay(new Date(order.fecha));
                return isWithinInterval(hitoDate, { start: rangeStart, end: rangeEnd });
            } catch (e) { return false; }
        });

        gastroOrdersInRange.forEach(gastroOrder => {
            try {
                const fechaKey = format(new Date(gastroOrder.fecha), 'yyyy-MM-dd');
                const os = osMap.get(gastroOrder.osId);
                const briefing = data.comercialBriefings.find(b => b.osId === gastroOrder.osId);
                if (!os || !briefing || os.status !== 'Confirmado') return;

                (gastroOrder.items || []).forEach(item => {
                    if (item.type !== 'item') return;
                    const receta = data.recetas.find(r => r.id === item.id);
                    if (!receta || !receta.elaboraciones) return;

                    receta.elaboraciones.forEach(elabEnReceta => {
                        const elab = elaboracionesMap.get(elabEnReceta.elaboracionId);
                        if (!elab) return;
                        
                        const id = elab.id;
                        let necesidad = necesidadesAgregadas.get(id);

                        if (!necesidad) {
                            necesidad = {
                                id, nombre: elab.nombre, cantidadNecesariaTotal: 0, unidad: elab.unidadProduccion,
                                osIDs: new Set(), partida: elab.partidaProduccion, tipoExpedicion: elab.tipoExpedicion,
                                stockDisponible: 0, cantidadPlanificada: 0, desgloseDiario: [], cantidadNeta: 0,
                                recetas: [], desgloseCompleto: [],
                            };
                            necesidadesAgregadas.set(id, necesidad);
                        }
                        
                        const cantidadNecesaria = (item.quantity || 1) * elabEnReceta.cantidad;
                        necesidad.cantidadNecesariaTotal += cantidadNecesaria;
                        necesidad.osIDs.add(gastroOrder.osId);
                        
                        if (!necesidad.recetas.includes(receta.nombre)) necesidad.recetas.push(receta.nombre);
                        
                        const desglose = necesidad.desgloseDiario.find(d => d.fecha === fechaKey);
                        if (desglose) desglose.cantidad += cantidadNecesaria;
                        else necesidad.desgloseDiario.push({ fecha: fechaKey, cantidad: cantidadNecesaria });
                        
                        const hito = briefing.items.find(h => h.id === gastroOrder.id);
                        necesidad.desgloseCompleto.push({
                            osId: os.id, osNumber: os.serviceNumber, osSpace: os.space, hitoId: hito?.id || '',
                            hitoDescripcion: hito?.descripcion || '', fechaHito: hito?.fecha || '', recetaId: receta.id,
                            recetaNombre: receta.nombre, cantidadReceta: item.quantity || 1, cantidadNecesaria: cantidadNecesaria
                        });
                    });
                });
            } catch (e) {}
        });

        // --- ENTREGAS ---
        const pedidosEntregaInRange = data.pedidosEntrega.filter(pedido => {
             const os = data.entregas.find(e => e.id === pedido.osId);
             if (!os || os.status !== 'Confirmado') return false;
             return (pedido.hitos || []).some(h => isWithinInterval(new Date(h.fecha), { start: rangeStart, end: rangeEnd }));
        });

        pedidosEntregaInRange.forEach(pedido => {
            const os = data.entregas.find(e => e.id === pedido.osId);
            if (!os) return;

            (pedido.hitos || []).forEach(hito => {
                if (!isWithinInterval(new Date(hito.fecha), { start: rangeStart, end: rangeEnd })) return;
                const fechaKey = format(new Date(hito.fecha), 'yyyy-MM-dd');

                (hito.items || []).forEach(item => {
                    const productoVenta = data.productosVenta.find(p => p.id === item.id);
                    if (productoVenta && productoVenta.recetaId) {
                        const receta = data.recetas.find(r => r.id === productoVenta.recetaId);
                        if (!receta || !receta.elaboraciones) return;

                        receta.elaboraciones.forEach(elabEnReceta => {
                            const elab = elaboracionesMap.get(elabEnReceta.elaboracionId);
                            if (!elab) return;

                            const id = elab.id;
                            let necesidad = necesidadesAgregadas.get(id);

                            if (!necesidad) {
                                necesidad = {
                                    id, nombre: elab.nombre, cantidadNecesariaTotal: 0, unidad: elab.unidadProduccion,
                                    osIDs: new Set(), partida: elab.partidaProduccion, tipoExpedicion: elab.tipoExpedicion,
                                    stockDisponible: 0, cantidadPlanificada: 0, desgloseDiario: [], cantidadNeta: 0,
                                    recetas: [], desgloseCompleto: [],
                                };
                                necesidadesAgregadas.set(id, necesidad);
                            }
                            
                            const cantidadNecesaria = (item.quantity || 1) * elabEnReceta.cantidad;
                            necesidad.cantidadNecesariaTotal += cantidadNecesaria;
                            necesidad.osIDs.add(pedido.osId);
                            
                            if (!necesidad.recetas.includes(receta.nombre)) necesidad.recetas.push(receta.nombre);
                            
                            const desglose = necesidad.desgloseDiario.find(d => d.fecha === fechaKey);
                            if (desglose) desglose.cantidad += cantidadNecesaria;
                            else necesidad.desgloseDiario.push({ fecha: fechaKey, cantidad: cantidadNecesaria });
                            
                            necesidad.desgloseCompleto.push({
                                osId: os.id, osNumber: os.serviceNumber, osSpace: hito.lugarEntrega, hitoId: hito.id,
                                hitoDescripcion: `Entrega ${hito.hora}`, fechaHito: hito.fecha, recetaId: receta.id,
                                recetaNombre: receta.nombre, cantidadReceta: item.quantity || 1, cantidadNecesaria: cantidadNecesaria
                            });
                        });
                    }
                });
            });
        });


        const stockAsignadoGlobal: Record<string, number> = {};
        Object.values(allPickingStatesData).forEach(state => {
            (state.itemStates || []).forEach(assigned => {
                const of = allOFs.find(o => o.id === assigned.ofId);
                if (of) stockAsignadoGlobal[of.elaboracionId] = (stockAsignadoGlobal[of.elaboracionId] || 0) + assigned.quantity;
            });
        });

        const necesidadesNetas: NecesidadItem[] = [];
        const necesidadesCubiertas: NecesidadItem[] = [];

        Array.from(necesidadesAgregadas.values()).forEach(necesidad => {
            const ofsExistentes = allOFs.filter((of: OrdenFabricacion) => {
                if (of.elaboracionId !== necesidad.id) return false;
                try {
                    const ofDate = startOfDay(new Date(of.fechaProduccionPrevista));
                    return isWithinInterval(ofDate, { start: rangeStart, end: rangeEnd });
                } catch(e) { return false; }
            });
            
            const cantidadPlanificada = ofsExistentes.reduce((sum, of) => {
                const isFinalizado = of.estado === 'Finalizado' || of.estado === 'Validado';
                return sum + (isFinalizado && of.cantidadReal ? of.cantidadReal : of.cantidadTotal);
            }, 0);
            
            const stockTotalBruto = data.stockElaboraciones[necesidad.id]?.cantidadTotal || 0;
            const stockAsignado = stockAsignadoGlobal[necesidad.id] || 0;
            const stockDisponible = Math.max(0, stockTotalBruto - stockAsignado);
            
            const stockAUtilizar = Math.min(necesidad.cantidadNecesariaTotal, stockDisponible);
            const cantidadNeta = necesidad.cantidadNecesariaTotal - stockAUtilizar - cantidadPlanificada;

            const itemCompleto = {
                ...necesidad, stockDisponible: stockAUtilizar, cantidadPlanificada, cantidadNeta,
                desgloseDiario: necesidad.desgloseDiario.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
            };

            if (cantidadNeta > 0.001) necesidadesNetas.push(itemCompleto);
            else necesidadesCubiertas.push(itemCompleto);
        });

        return { ordenes: allOFs, personalCPR: allPersonal, elaboracionesMap, serviceOrdersMap: osMap, necesidades: necesidadesNetas, necesidadesCubiertas, pickingStates: allPickingStatesData };
    }, [isLoaded, data, dateRange, elaboracionesMap]);
    
    useEffect(() => {
        if (!necesidades || !dateRange?.from || !dateRange?.to || !data) {
            setReporteData(null);
            return;
        }

        const fechas = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
        const allRecetasNecesarias = new Map<string, ReporteProduccionItem>();
        const allElaboracionesNecesarias = new Map<string, ReporteProduccionItem>();
        
        const osIds = new Set<string>();
        const serviciosSet = new Set<string>();
        let totalPax = 0;

        necesidades.forEach(necesidad => {
            const elab = elaboracionesMap.get(necesidad.id);
            if (!elab) return;

            // Para Resumen de Elaboraciones
            let elabItem = allElaboracionesNecesarias.get(necesidad.id);
            if (!elabItem) {
                elabItem = { id: necesidad.id, nombre: necesidad.nombre, partida: elab.partidaProduccion, udTotales: 0, unidad: elab.unidadProduccion, necesidadesPorDia: {}, usadoEn: [] };
                allElaboracionesNecesarias.set(necesidad.id, elabItem);
            }
            elabItem.udTotales += necesidad.cantidadNecesariaTotal;
            necesidad.desgloseDiario.forEach(d => {
                elabItem.necesidadesPorDia[d.fecha] = (elabItem.necesidadesPorDia[d.fecha] || 0) + d.cantidad;
            });

            // Para Resumen de Recetas (Referencias)
            necesidad.desgloseCompleto.forEach(d => {
                let recetaItem = allRecetasNecesarias.get(d.recetaId);
                const recetaData = data.recetas.find(r => r.id === d.recetaId);
                if (!recetaItem && recetaData) {
                    recetaItem = {
                        id: d.recetaId, nombre: d.recetaNombre, partida: recetaData.partidaProduccion || 'Varios', udTotales: 0,
                        unidad: 'Uds', necesidadesPorDia: {}, componentes: []
                    };
                    allRecetasNecesarias.set(d.recetaId, recetaItem);
                }
                
                if (recetaItem) {
                    recetaItem.necesidadesPorDia[d.fechaHito] = (recetaItem.necesidadesPorDia[d.fechaHito] || 0) + d.cantidadReceta;
                    
                    if (elabItem) {
                        const elabInReceta = recetaData?.elaboraciones.find(e => e.elaboracionId === elabItem!.id);
                        if(elabInReceta && !elabItem.usadoEn?.some(u => u.nombre === recetaData.nombre)) {
                            elabItem.usadoEn?.push({ nombre: recetaData.nombre, cantidad: elabInReceta.cantidad, unidad: elabInReceta.unidad });
                        }
                    }
                }
            });

            // For summary
            necesidad.osIDs.forEach(id => osIds.add(id));
            necesidad.desgloseCompleto.forEach(d => {
                serviciosSet.add(d.hitoId);
                const os = serviceOrdersMap.get(d.osId);
                totalPax += os?.asistentes || 0;
            });
        });
        
        allRecetasNecesarias.forEach(recetaItem => {
             recetaItem.udTotales = Object.values(recetaItem.necesidadesPorDia).reduce((sum, qty) => sum + qty, 0);
             const recetaData = data.recetas.find(r => r.id === recetaItem.id);
             recetaData?.elaboraciones.forEach(e => {
                const elab = elaboracionesMap.get(e.elaboracionId);
                if (elab && !recetaItem.componentes?.some(c => c.nombre === elab.nombre)) {
                    recetaItem.componentes?.push({ nombre: elab.nombre, cantidad: e.cantidad, unidad: elab.unidadProduccion, cantidadTotal: e.cantidad * recetaItem.udTotales });
                }
             });
        });
        
        const resumenPorPartida: Record<string, ReporteResumenPartida> = {};
        allRecetasNecesarias.forEach(item => {
            if (!resumenPorPartida[item.partida]) resumenPorPartida[item.partida] = { referencias: 0, unidades: 0, elaboraciones: 0 };
            resumenPorPartida[item.partida].referencias++;
            resumenPorPartida[item.partida].unidades += item.udTotales;
        });
        allElaboracionesNecesarias.forEach(item => {
            if (!resumenPorPartida[item.partida]) resumenPorPartida[item.partida] = { referencias: 0, unidades: 0, elaboraciones: 0 };
            resumenPorPartida[item.partida].elaboraciones++;
        });

        setReporteData({
            fechas,
            resumen: {
                contratos: osIds.size,
                contratosDetalle: Array.from(osIds),
                servicios: serviciosSet.size,
                serviciosDetalle: Array.from(serviciosSet),
                comensales: totalPax,
                referencias: allRecetasNecesarias.size,
                unidades: Array.from(allRecetasNecesarias.values()).reduce((sum, item) => sum + item.udTotales, 0),
                elaboraciones: allElaboracionesNecesarias.size,
                resumenPorPartida,
            },
            referencias: Array.from(allRecetasNecesarias.values()),
            elaboraciones: Array.from(allElaboracionesNecesarias.values()),
        });

    }, [necesidades, dateRange, serviceOrdersMap, elaboracionesMap, data]);
    
    const listaDeLaCompraPorProveedor = useMemo(() => {
        if (!isLoaded || !data || !necesidades) {
            return [];
        }

        const ingredientesNecesarios = new Map<string, { cantidad: number; desgloseUso: { receta: string; elaboracion: string; cantidad: number }[] }>();

        function getIngredientesRecursivo(elabId: string, cantidadRequerida: number, recetaNombre: string) {
            const elaboracion = elaboracionesMap.get(elabId);
            if (!elaboracion || !elaboracion.componentes) return;

            const ratio = cantidadRequerida / (elaboracion.produccionTotal > 0 ? elaboracion.produccionTotal : 1);
            
            elaboracion.componentes.forEach(comp => {
                const cantidadComponente = comp.cantidad * ratio;
                if (comp.tipo === 'ingrediente') {
                    let ingData = ingredientesNecesarios.get(comp.componenteId);
                    if (!ingData) {
                        ingData = { cantidad: 0, desgloseUso: [] };
                        ingredientesNecesarios.set(comp.componenteId, ingData);
                    }
                    ingData.cantidad += cantidadComponente;
                    ingData.desgloseUso.push({ receta: recetaNombre, elaboracion: elaboracion.nombre, cantidad: cantidadComponente });
                } else if (comp.tipo === 'elaboracion') {
                    getIngredientesRecursivo(comp.componenteId, cantidadComponente, recetaNombre);
                }
            });
        }

        necesidades.forEach(necesidad => {
            if (necesidad.cantidadNeta > 0) {
                getIngredientesRecursivo(necesidad.id, necesidad.cantidadNeta, necesidad.recetas.join(', '));
            }
        });
        
        const compraPorProveedor = new Map<string, ProveedorConLista>();

        ingredientesNecesarios.forEach((datos, ingId) => {
            const ingredienteInterno = ingredientesMap.get(ingId);
            if (!ingredienteInterno || !ingredienteInterno.productoERPlinkId) return;

            const articuloERP = articulosErpMap.get(ingredienteInterno.productoERPlinkId);
            if (!articuloERP || !articuloERP.idProveedor) return;
            
            const proveedor = proveedoresMap.get(articuloERP.idProveedor);
            if (!proveedor) return;

            let proveedorData = compraPorProveedor.get(proveedor.id);
            if (!proveedorData) {
                proveedorData = { ...proveedor, listaCompra: [] };
                compraPorProveedor.set(proveedor.id, proveedorData);
            }

            const ingCompra: IngredienteDeCompra = {
                erpId: articuloERP.idreferenciaerp,
                nombreProducto: articuloERP.nombreProductoERP,
                refProveedor: articuloERP.referenciaProveedor || '',
                formatoCompra: `${articuloERP.unidadConversion} ${formatUnit(articuloERP.unidad)}`,
                necesidadNeta: datos.cantidad,
                unidadNeta: articuloERP.unidad,
                unidadConversion: articuloERP.unidadConversion,
                precioCompra: articuloERP.precioCompra,
                descuento: articuloERP.descuento || 0,
                desgloseUso: datos.desgloseUso.sort((a,b) => b.cantidad - a.cantidad),
            };
            
            const existingItemIndex = proveedorData.listaCompra.findIndex(item => item.erpId === articuloERP.idreferenciaerp);
            if (existingItemIndex > -1) {
                proveedorData.listaCompra[existingItemIndex].necesidadNeta += datos.cantidad;
                proveedorData.listaCompra[existingItemIndex].desgloseUso.push(...datos.desgloseUso);
            } else {
                proveedorData.listaCompra.push(ingCompra);
            }
        });

        return Array.from(compraPorProveedor.values()).sort((a,b) => a.nombreComercial.localeCompare(b.nombreComercial));
    }, [isLoaded, data, necesidades, elaboracionesMap, ingredientesMap, articulosErpMap, proveedoresMap]);


    const flatCompraList = useMemo(() => 
        listaDeLaCompraPorProveedor.flatMap(proveedor => 
            proveedor.listaCompra.map(item => ({
                ...item,
                proveedorNombre: proveedor.nombreComercial,
            }))
        ).sort((a,b) => a.proveedorNombre.localeCompare(b.proveedorNombre) || a.nombreProducto.localeCompare(b.nombreProducto)),
    [listaDeLaCompraPorProveedor]);


    const filteredAndSortedItems = useMemo(() => {
        return ordenes
        .filter(item => {
            const searchMatch = searchTerm === '' || 
                                item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                item.elaboracionNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (item.responsable || '').toLowerCase().includes(searchTerm.toLowerCase());
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
        loadAllData();
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
        
        toast({ title: 'Órdenes de Fabricación Creadas', description: `${nuevasOFs.length} OFs se han añadido a la lista.` });
        
        setSelectedNecesidades(new Set());
        loadAllData();
    };
    
    const handleAssignResponsable = (ofId: string, responsable: string) => {
        let allOFs: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const index = allOFs.findIndex(of => of.id === ofId);
        if(index > -1 && allOFs[index].estado === 'Pendiente') {
            allOFs[index].responsable = responsable;
            allOFs[index].estado = 'Asignada';
            allOFs[index].fechaAsignacion = new Date().toISOString();
            localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
            loadAllData();
            toast({ title: 'Responsable Asignado', description: `Se ha asignado a ${responsable}.`});
        }
    };

    const handleSelectNecesidad = (elabId: string, checked: boolean) => {
        setSelectedNecesidades(prev => {
        const newSelection = new Set(prev);
        if (checked) newSelection.add(elabId);
        else newSelection.delete(elabId);
        return newSelection;
        });
    };

    const getPickingInfo = (ofId: string): { osId: string; containerId: string } | null => {
        for (const osId in pickingStates) {
            const state = pickingStates[osId];
            const found = state.itemStates.find(item => item.ofId === ofId);
            if (found) {
                return { osId, containerId: found.containerId };
            }
        }
        return null;
    };
    
    const handlePrintReport = () => {
        if (!reporteData) return;
        const doc = new jsPDF();
        const tableColumn = ["Proveedor", "Producto (Ref.)", "Cant. a Comprar", "Formato", "Necesidad Neta"];
        const tableRows: (string | number)[][] = [];

        flatCompraList.forEach(item => {
            const cantidadAComprar = redondearCompra 
                ? Math.ceil(item.necesidadNeta / item.unidadConversion) 
                : (item.necesidadNeta / item.unidadConversion);
                
            const row = [
                item.proveedorNombre,
                `${item.nombreProducto} (${item.refProveedor})`,
                redondearCompra ? cantidadAComprar : formatNumber(cantidadAComprar, 2),
                item.formatoCompra,
                `${formatNumber(item.necesidadNeta, 3)} ${formatUnit(item.unidadNeta)}`
            ];
            tableRows.push(row);
        });

        const dateTitle = dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : '';
        const dateTitleEnd = dateRange?.to ? ` - ${format(dateRange.to, 'dd/MM/yyyy')}` : '';

        doc.setFontSize(18);
        doc.text(`Informe de Compra Consolidado`, 14, 22);
        doc.setFontSize(11);
        doc.text(`Periodo: ${dateTitle}${dateTitleEnd}`, 14, 30);
        
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            headStyles: { fillColor: [0, 112, 60] }
        });

        doc.save(`Informe_Compra_${dateTitle}.pdf`);
    };

  if (!isLoaded) {
    return <LoadingSkeleton title="Cargando Planificación y OFs..." />;
  }
  
  const numSelected = selectedNecesidades.size;

  return (
    <>
    <TooltipProvider>
       <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 p-4 border rounded-lg bg-card">
        <div className="flex-grow">
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-full md:w-[450px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
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
        </div>
        <div className="flex justify-end items-center gap-2">
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
      <Tabs defaultValue="generacion-of">
        <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="informe-produccion">Informe de Producción</TabsTrigger>
            <TabsTrigger value="lista-compra">Lista de la Compra</TabsTrigger>
            <TabsTrigger value="generacion-of">Generación de OF</TabsTrigger>
            <TabsTrigger value="creadas">OF Creadas</TabsTrigger>
            <TabsTrigger value="asignacion">Asignación de Órdenes</TabsTrigger>
        </TabsList>
         <TabsContent value="informe-produccion" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                     <CardTitle className="text-lg">Informe de Producción</CardTitle>
                    <CardDescription>Resumen de referencias y elaboraciones para el periodo seleccionado.</CardDescription>
                </div>
                 <Select value={partidaInformeFilter} onValueChange={setPartidaInformeFilter}>
                    <SelectTrigger className="w-full sm:w-[240px]">
                        <SelectValue placeholder="Filtrar por partida" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Partidas</SelectItem>
                        {partidas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                </Select>
            </CardHeader>
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
                                                    <ul className="list-disc pl-4">{(item.componentes || []).map((c, i) => <li key={i}>{c.nombre} ({formatNumber(c.cantidadTotal, 2)} {c.unidad})</li>)}</ul>
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
        <TabsContent value="lista-compra">
             <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Lista de la Compra</CardTitle>
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="sm" onClick={() => setIsReportDialogOpen(true)}>
                                <FileText className="mr-2 h-4 w-4"/> Generar Informe
                            </Button>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="redondear-switch">Redondear al alza</Label>
                                <Switch id="redondear-switch" checked={redondearCompra} onCheckedChange={setRedondearCompra}/>
                            </div>
                        </div>
                    </div>
                    <CardDescription>Materias primas necesarias para cubrir las necesidades de producción del periodo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {listaDeLaCompraPorProveedor.length > 0 ? listaDeLaCompraPorProveedor.map(proveedor => (
                        <Card key={proveedor.id} className="w-full">
                            <CardHeader className="flex-row items-start justify-between pb-2">
                                <div>
                                    <h4 className="font-bold text-lg">{proveedor.nombreComercial}</h4>
                                    <div className="text-xs text-muted-foreground flex gap-4">
                                        <span>{proveedor.nombreEmpresa} ({proveedor.cif})</span>
                                        <span>{proveedor.telefonoContacto}</span>
                                        <span>{proveedor.emailContacto}</span>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => setPedidoParaImprimir(proveedor)}>
                                    <Printer className="mr-2 h-4 w-4"/> Generar Pedido
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto ERP (Ref. Proveedor)</TableHead>
                                            <TableHead className="w-48 text-right">Cant. a Comprar</TableHead>
                                            <TableHead className="w-40 text-right">Formato Compra</TableHead>
                                            <TableHead className="w-40 text-right">Necesidad Neta</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {proveedor.listaCompra.map(item => {
                                            const cantidadAComprar = redondearCompra 
                                                ? Math.ceil(item.necesidadNeta / item.unidadConversion) 
                                                : (item.necesidadNeta / item.unidadConversion);
                                            return (
                                                <TableRow key={item.erpId}>
                                                    <TableCell>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild><span className="font-semibold cursor-help">{item.nombreProducto} <span className="font-normal text-muted-foreground">({item.refProveedor})</span></span></TooltipTrigger>
                                                            <TooltipContent className="p-2 max-w-sm">
                                                                <p className="font-bold mb-1">Destinado a:</p>
                                                                <ul className="list-disc space-y-1 pl-4 text-xs">
                                                                    {item.desgloseUso.map((uso, i) => (
                                                                        <li key={i}>{formatNumber(uso.cantidad, 3)} {formatUnit(item.unidadNeta)} para <strong>{uso.elaboracion}</strong> ({uso.receta})</li>
                                                                    ))}
                                                                </ul>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold font-mono text-primary text-base">{redondearCompra ? cantidadAComprar : formatNumber(cantidadAComprar, 2)}</TableCell>
                                                    <TableCell className="text-right">{item.formatoCompra}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatNumber(item.necesidadNeta, 3)} {formatUnit(item.unidadNeta)}</TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )) : (
                        <div className="text-center text-muted-foreground py-10">No hay ingredientes necesarios para este periodo.</div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="generacion-of">
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2"><ChefHat/>Necesidades de Producción Agregadas</CardTitle>
                    <div className="flex items-center gap-2">
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
             <Card className="mt-4">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">Necesidades Cubiertas</CardTitle>
                    <CardDescription>Elaboraciones cuya producción ya está planificada o cubierta por el stock para el periodo seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="border rounded-lg max-h-96 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-40">Elaboración</TableHead>
                                    <TableHead>Partida</TableHead>
                                    <TableHead className="text-right">Necesidad Total</TableHead>
                                    <TableHead className="text-right">Stock Utilizado</TableHead>
                                    <TableHead className="text-right">Planificado</TableHead>
                                    <TableHead className="text-right font-bold text-green-600">Excedente/Sobrante</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                 {necesidadesCubiertas.length > 0 ? necesidadesCubiertas.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-semibold">{item.nombre}</TableCell>
                                        <TableCell><Badge variant="secondary">{item.partida}</Badge></TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.cantidadNecesariaTotal, 2)} {formatUnit(item.unidad)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.stockDisponible || 0, 2)} {formatUnit(item.unidad)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.cantidadPlanificada || 0, 2)} {formatUnit(item.unidad)}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-green-600">{formatNumber(Math.abs(item.cantidadNeta), 2)} {formatUnit(item.unidad)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No hay necesidades cubiertas para mostrar.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="creadas">
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
                                    placeholder="Buscar por Nº de Lote, Elaboración, Responsable..."
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
                                <TableHead>Responsable</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {filteredAndSortedItems.length > 0 ? (
                                filteredAndSortedItems.map(of => {
                                    const elab = elaboracionesMap.get(of.elaboracionId);
                                    const costeLote = (elab?.costePorUnidad || 0) * (of.cantidadReal || of.cantidadTotal);
                                    const pickingInfo = getPickingInfo(of.id);

                                    const rowContent = (
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
                                            <TableCell>{of.responsable || '-'}</TableCell>
                                            <TableCell>
                                            <Badge variant={statusVariant[of.estado]}>{of.estado}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => router.push(`/cpr/of/${of.id}`)}>
                                                        <Pencil className="mr-2 h-4 w-4" /> Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setOrderToDelete(of.id)}}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );

                                    if(pickingInfo) {
                                        return (
                                            <Tooltip key={of.id}>
                                                <TooltipTrigger asChild>
                                                    {rowContent}
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div>Asignado al contenedor <Badge variant="secondary">{pickingInfo.containerId}</Badge> para la OS <Badge variant="outline">{serviceOrdersMap.get(pickingInfo.osId)?.serviceNumber}</Badge></div>
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    }
                                    return rowContent;
                                })
                            ) : (
                                <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center">
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
        <TabsContent value="asignacion">
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
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Informe Consolidado de Compra</DialogTitle>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Proveedor</TableHead>
                                <TableHead>Producto ERP (Ref.)</TableHead>
                                <TableHead className="text-right">Cant. a Comprar</TableHead>
                                <TableHead>Formato Compra</TableHead>
                                <TableHead className="text-right">Necesidad Neta</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {flatCompraList.map(item => {
                                 const cantidadAComprar = redondearCompra 
                                    ? Math.ceil(item.necesidadNeta / item.unidadConversion) 
                                    : (item.necesidadNeta / item.unidadConversion);
                                return (
                                <TableRow key={`${item.proveedorNombre}-${item.erpId}`}>
                                    <TableCell>{item.proveedorNombre}</TableCell>
                                    <TableCell>
                                        {item.nombreProducto} <span className="text-xs text-muted-foreground">({item.refProveedor})</span>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-primary">{redondearCompra ? cantidadAComprar : formatNumber(cantidadAComprar, 2)}</TableCell>
                                    <TableCell>{item.formatoCompra}</TableCell>
                                    <TableCell className="text-right font-mono">{formatNumber(item.necesidadNeta, 3)} {formatUnit(item.unidadNeta)}</TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>Cerrar</Button>
                    <Button onClick={handlePrintReport}><Printer className="mr-2 h-4 w-4"/>Descargar PDF</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <Dialog open={!!pedidoParaImprimir} onOpenChange={(open) => !open && setPedidoParaImprimir(null)}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Borrador de Pedido para: {pedidoParaImprimir?.nombreComercial}</DialogTitle>
                    <DialogDescription>
                        Este es un prototipo visual. La generación y envío del PDF final se implementará en un futuro.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4 border rounded-lg p-6 bg-white text-black font-sans text-sm">
                    <h2 className="text-2xl font-bold mb-1">Pedido a Proveedor</h2>
                    <p className="font-semibold text-lg text-primary mb-4">{pedidoParaImprimir?.nombreComercial}</p>
                    <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                        <div>
                            <p><strong>De:</strong> MICE CATERING</p>
                            <p>Avda. de la Industria, 38, 28108 Alcobendas, Madrid</p>
                        </div>
                        <div className="text-right">
                             <p><strong>Fecha Pedido:</strong> {format(new Date(), 'dd/MM/yyyy')}</p>
                             <p><strong>Atención:</strong> {pedidoParaImprimir?.nombreComercial} - {pedidoParaImprimir?.telefonoContacto}</p>
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-black">Ref.</TableHead>
                                <TableHead className="text-black">Producto</TableHead>
                                <TableHead className="text-right text-black">Cantidad</TableHead>
                                <TableHead className="text-right text-black">Formato Compra</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(pedidoParaImprimir?.listaCompra || []).map(item => {
                                const cantidadAComprar = redondearCompra 
                                    ? Math.ceil(item.necesidadNeta / item.unidadConversion) 
                                    : (item.necesidadNeta / item.unidadConversion);
                                return (
                                    <TableRow key={item.erpId}>
                                        <TableCell className="font-mono text-xs">{item.refProveedor}</TableCell>
                                        <TableCell>{item.nombreProducto}</TableCell>
                                        <TableCell className="text-right font-bold">{redondearCompra ? cantidadAComprar : formatNumber(cantidadAComprar, 2)}</TableCell>
                                        <TableCell className="text-right">{item.formatoCompra}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setPedidoParaImprimir(null)}>Cerrar</Button>
                    <Button disabled><Printer className="mr-2 h-4 w-4"/>Imprimir (próximamente)</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </TooltipProvider>
    </>
  );
}

export default function OFPage() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando Planificación y OFs..." />}>
            <OfPageContent />
        </Suspense>
    )
}
    

    

    




    

    




    


