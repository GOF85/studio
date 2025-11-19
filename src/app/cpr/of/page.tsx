
'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { recipeDescriptionGenerator } from '@/ai/flows/recipe-description-generator';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';

import { format, isWithinInterval, startOfDay, endOfDay, addDays, isSameDay, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Save, X, BookHeart, Utensils, Sprout, GlassWater, Percent, PlusCircle, GripVertical, Trash2, Eye, Soup, Info, ChefHat, Package, Factory, Sparkles, TrendingUp, FilePenLine, Link as LinkIcon, Component, MoreHorizontal, Copy, Download, Upload, Menu, AlertTriangle, CheckCircle, RefreshCw, Pencil, ChevronLeft, ChevronRight, Users, ClipboardList, FileText, Printer } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { useDataStore } from '@/hooks/use-data-store';
import { cn } from '@/lib/utils';
import { formatNumber, formatUnit, formatCurrency } from '@/lib/utils';

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

export default function OfPageContent() {
    const { data, isLoaded, loadAllData } = useDataStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [partidaFilter, setPartidaFilter] = useState('all');
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
        setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
    }, []);

    const elaboracionesMap = useMemo(() => {
        if (!isLoaded) return new Map();
        return new Map((data.elaboraciones || []).map(e => [e.id, e]));
    }, [isLoaded, data.elaboraciones]);

    const isOsHito = (hito: ComercialBriefingItem | EntregaHito): hito is ComercialBriefingItem & { serviceOrder: ServiceOrder } => {
        return 'serviceOrder' in hito;
    };
    
    const { necesidades, necesidadesCubiertas } = useMemo(() => {
        if (!isLoaded || !data || !dateRange?.from) return { necesidades: [], necesidadesCubiertas: [], pickingStates: {} };
        
        const {
            ordenesFabricacion, serviceOrders, comercialBriefings, gastronomyOrders, recetas,
            entregas, pedidosEntrega, productosVenta, stockElaboraciones, pickingStates
        } = data;
        
        const rangeStart = startOfDay(dateRange.from);
        const rangeEnd = endOfDay(dateRange.to || dateRange.from);

        const osMap = new Map((serviceOrders || []).map(os => [os.id, os]));
        const entregasMap = new Map((entregas || []).map(e => [e.id, e]));
        const recetasMap = new Map((recetas || []).map(r => [r.id, r]));
        
        const necesidadesAgregadas = new Map<string, NecesidadItem>();

        const calculateNeeds = (
            hitos: (ComercialBriefingItem | EntregaHito)[],
            getOs: (id: string) => ServiceOrder | Entrega | undefined,
            getGastroItems: (id: string) => { id: string; quantity: number }[]
        ) => {
             hitos.forEach(hito => {
                if (!isWithinInterval(new Date(hito.fecha), { start: rangeStart, end: rangeEnd })) return;
                
                const os = getOs(isOsHito(hito) ? (hito as any).osId : hito.osId);
                if (!os || (os as ServiceOrder).status !== 'Confirmado') return;
                
                const fechaKey = format(new Date(hito.fecha), 'yyyy-MM-dd');
                const items = isOsHito(hito) 
                    ? getGastroItems(hito.id)
                    : (hito.items || []).map(item => {
                        const producto = (productosVenta || []).find(p => p.id === item.id);
                        return producto?.recetaId ? { id: producto.recetaId, quantity: item.quantity } : null;
                    }).filter(Boolean) as { id: string; quantity: number }[];


                items.forEach(item => {
                    const receta = recetasMap.get(item.id);

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
                        necesidad.osIDs.add(os.id);
                        if (!necesidad.recetas.includes(receta.nombre)) necesidad.recetas.push(receta.nombre);
                        
                        const desglose = necesidad.desgloseDiario.find(d => d.fecha === fechaKey);
                        if (desglose) desglose.cantidad += cantidadNecesaria;
                        else necesidad.desgloseDiario.push({ fecha: fechaKey, cantidad: cantidadNecesaria });

                        necesidad.desgloseCompleto.push({
                            osId: os.id, osNumber: os.serviceNumber, osSpace: os.space || (hito as EntregaHito).lugarEntrega, hitoId: hito.id,
                            hitoDescripcion: hito.descripcion || `Entrega ${hito.hora}`, fechaHito: hito.fecha, recetaId: receta.id,
                            recetaNombre: receta.nombre, cantidadReceta: item.quantity || 1, cantidadNecesaria
                        });
                    });
                });
            });
        };

        const allHitosCatering = (comercialBriefings || []).flatMap(b => b.items.map(i => ({ ...i, serviceOrder: osMap.get(b.osId)!, osId: b.osId }))).filter(h => h.conGastronomia);
        const allHitosEntregas = (pedidosEntrega || []).flatMap(p => p.hitos.map(h => ({...h, osId: p.osId})));

        calculateNeeds(allHitosCatering, (id) => osMap.get(id), () => []);
        calculateNeeds(allHitosEntregas, (id) => entregasMap.get(id), () => []);

        const stockAsignadoGlobal: Record<string, number> = {};
        Object.values(pickingStates || {}).forEach(state => {
            (state.itemStates || []).forEach(assigned => {
                const of = (ordenesFabricacion || []).find(o => o.id === assigned.ofId);
                if (of) stockAsignadoGlobal[of.elaboracionId] = (stockAsignadoGlobal[of.elaboracionId] || 0) + assigned.quantity;
            });
        });

        const necesidadesNetas: NecesidadItem[] = [];
        const necesidadesCubiertas: NecesidadItem[] = [];

        necesidadesAgregadas.forEach(necesidad => {
            const ofsExistentes = (ordenesFabricacion || []).filter(of => {
                if (of.elaboracionId !== necesidad.id) return false;
                const ofDate = startOfDay(new Date(of.fechaProduccionPrevista));
                return isWithinInterval(ofDate, { start: rangeStart, end: rangeEnd });
            });
            
            const cantidadPlanificada = ofsExistentes.reduce((sum, of) => sum + (of.estado === 'Finalizado' || of.estado === 'Validado' ? (of.cantidadReal || of.cantidadTotal) : of.cantidadTotal), 0);
            const stockDisponible = Math.max(0, (stockElaboraciones?.[necesidad.id]?.cantidadTotal || 0) - (stockAsignadoGlobal[necesidad.id] || 0));
            const stockAUtilizar = Math.min(necesidad.cantidadNecesariaTotal, stockDisponible);
            const cantidadNeta = necesidad.cantidadNecesariaTotal - stockAUtilizar - cantidadPlanificada;

            const itemCompleto = { ...necesidad, stockDisponible: stockAUtilizar, cantidadPlanificada, cantidadNeta };
            if (cantidadNeta > 0.001) necesidadesNetas.push(itemCompleto);
            else necesidadesCubiertas.push(itemCompleto);
        });
        
        return { 
            ordenes: ordenesFabricacion || [], 
            personalCPR: (data.personal || []).filter(p => p.departamento === 'CPR'), 
            necesidades: necesidadesNetas, 
            necesidadesCubiertas, 
        };

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

            let elabItem = allElaboracionesNecesarias.get(necesidad.id);
            if (!elabItem) {
                elabItem = { id: necesidad.id, nombre: necesidad.nombre, partida: elab.partidaProduccion, udTotales: 0, unidad: elab.unidadProduccion, necesidadesPorDia: {}, usadoEn: [] };
                allElaboracionesNecesarias.set(necesidad.id, elabItem);
            }
            elabItem.udTotales += necesidad.cantidadNecesariaTotal;
            necesidad.desgloseDiario.forEach(d => {
                elabItem.necesidadesPorDia[d.fecha] = (elabItem.necesidadesPorDia[d.fecha] || 0) + d.cantidad;
            });

            necesidad.desgloseCompleto.forEach(d => {
                let recetaItem = allRecetasNecesarias.get(d.recetaId);
                const recetaData = (data.recetas || []).find(r => r.id === d.recetaId);
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

            necesidad.osIDs.forEach(id => osIds.add(id));
            necesidad.desgloseCompleto.forEach(d => {
                serviciosSet.add(d.hitoId);
                const os = (data.serviceOrders || []).find(o => o.id === d.osId);
                totalPax += os?.asistentes || 0;
            });
        });
        
        allRecetasNecesarias.forEach(recetaItem => {
             recetaItem.udTotales = Object.values(recetaItem.necesidadesPorDia).reduce((sum, qty) => sum + qty, 0);
             const recetaData = (data.recetas || []).find(r => r.id === recetaItem.id);
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
    }, [necesidades, dateRange, data, elaboracionesMap]);
    
    const { ingredientesMap, articulosErpMap, proveedoresMap } = useMemo(() => {
        if (!isLoaded || !data) return { ingredientesMap: new Map(), articulosErpMap: new Map(), proveedoresMap: new Map() };
        const { ingredientesInternos, articulosERP, proveedores } = data;
        const result = {
            ingredientesMap: new Map((ingredientesInternos || []).map(i => [i.id, i])),
            articulosErpMap: new Map((articulosERP || []).map(a => [a.idreferenciaerp, a])),
            proveedoresMap: new Map((proveedores || []).map(p => [p.IdERP, p]))
        };
        return result;
    }, [isLoaded, data]);
    
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
        if (!data.ordenesFabricacion) return [];
        const result = data.ordenesFabricacion
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
        return result;
    }, [data.ordenesFabricacion, searchTerm, statusFilter, partidaFilter, dateRange]);
    
    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setPartidaFilter('all');
        setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
    };

    const handleDeleteOrder = () => {
        if (!orderToDelete) return;
        const updatedOFs = data.ordenesFabricacion.filter(of => of.id !== orderToDelete);
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

    const numSelected = selectedNecesidades.size;
}

```
- src/hooks/use-os-data.ts:
```ts


'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ServiceOrder, ComercialBriefing, Espacio } from '@/types';

export function useOsData(osId: string) {
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [briefing, setBriefing] = useState<ComercialBriefing | null>(null);
    const [spaceAddress, setSpaceAddress] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = () => {
            setIsLoading(true);
            if (osId && typeof window !== 'undefined') {
                const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
                const currentOS = allServiceOrders.find(os => os.id === osId);
                setServiceOrder(currentOS || null);

                if (currentOS?.space) {
                    const allEspacios = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
                    const currentSpace = allEspacios.find(e => e.identificacion.nombreEspacio === currentOS.space);
                    setSpaceAddress(currentSpace?.identificacion.calle || '');
                } else {
                    setSpaceAddress('');
                }

                const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
                const currentBriefing = allBriefings.find(b => b.osId === osId);
                setBriefing(currentBriefing || null);
            }
            setIsLoading(false);
        };
        
        loadData();
        
        const handleStorageChange = (e: StorageEvent) => {
            // Re-load if any of the relevant keys change
            if(e.key === 'serviceOrders' || e.key === 'espacios' || e.key === 'comercialBriefings') {
                loadData();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };

    }, [osId]);

    return { serviceOrder, briefing, spaceAddress, isLoading };
}

```
- src/lib/cpr-nav.ts:
```ts


'use client';

import { LayoutDashboard, Factory, ClipboardList, Package, ListChecks, History, CheckCircle, AlertTriangle, PackagePlus, BarChart3, Printer, ChefHat, BookHeart, Component, Sprout, CheckSquare, TrendingUp, Users, UserCheck, Archive, HistoryIcon, Calculator, Box, Layers, Percent, Target, Banknote, CreditCard } from 'lucide-react';

export const cprNav = [
    { title: 'Dashboard CPR', href: '/cpr/dashboard', icon: LayoutDashboard, description: 'Vista general y KPIs del centro de producción.' },
    { title: 'Planificación y OFs', href: '/cpr/of', icon: Factory, description: 'Agrega necesidades y gestiona las O.F.' },
    { title: 'Taller de Producción', href: '/cpr/produccion', icon: ChefHat, description: 'Interfaz para cocineros en tablets.' },
    { title: 'Inventario de Materia Prima', href: '/cpr/inventario', icon: Archive, description: 'Gestiona el stock teórico y físico de ingredientes.'},
    { title: 'Cierres de Inventario', href: '/cpr/cierres', icon: Calculator, description: 'Realiza y consulta los cierres de inventario mensuales.'},
    { title: 'Movimientos de Inventario', href: '/cpr/inventario/movimientos', icon: HistoryIcon, description: 'Auditoría de todos los ajustes y movimientos de stock.'},
    { title: 'Picking y Logística', href: '/cpr/picking', icon: ListChecks, description: 'Prepara las expediciones para eventos.' },
    { title: 'Control de Calidad', href: '/cpr/calidad', icon: CheckCircle, description: 'Valida las elaboraciones.' },
    { title: 'Solicitudes de Personal', href: '/cpr/solicitud-personal', icon: Users, description: 'Pide personal de apoyo para picos de trabajo.' },
    { title: 'Validación de Horas', href: '/cpr/validacion-horas', icon: UserCheck, description: 'Cierra los turnos del personal de apoyo.'},
    { title: 'Stock Elaboraciones', href: '/cpr/excedentes', icon: PackagePlus, description: 'Consulta el inventario de elaboraciones.' },
    { title: 'Productividad', href: '/cpr/productividad', icon: BarChart3, description: 'Analiza los tiempos de producción.' },
    { title: 'Informe de Picking', href: '/cpr/informe-picking', icon: Printer, description: 'Consulta el picking completo de una OS.' },
    { title: 'Incidencias', href: '/cpr/incidencias', icon: AlertTriangle, description: 'Revisa las incidencias de producción e inventario.' },
];

export const bookNavLinks = [
    { title: 'Dashboard', path: '/book', icon: BookHeart, exact: true },
    { title: 'Recetas', path: '/book/recetas', icon: BookHeart },
    { title: 'Elaboraciones', path: '/book/elaboraciones', icon: Component },
    { title: 'Ingredientes', path: '/book/ingredientes', icon: ChefHat },
    { title: 'Verificación de Ingredientes', path: '/book/verificacionIngredientes', icon: Shield },
    { title: 'Revisión Gastronómica', path: '/book/revision-ingredientes', icon: CheckSquare },
    { title: 'Evolución de Costes', path: '/book/evolucion-costes', icon: TrendingUp },
    { title: 'Info. Alérgenos', path: '/book/alergenos', icon: Sprout },
    { title: 'Informe Gastronómico', path: '/book/informe', icon: BarChart3, exact: true },
];

    
export const bdNavLinks = [
    { title: 'Personal Interno', href: '/bd/personal', icon: Users },
    { title: 'Personal Externo', href: '/bd/personal-externo-db', icon: UserPlus },
    { title: 'Proveedores', href: '/bd/proveedores', icon: Building },
    { title: 'Catálogo Personal Externo', href: '/bd/tipos-personal', icon: Users },
    { title: 'Espacios', href: '/bd/espacios', icon: Building },
    { title: 'Artículos MICE', href: '/bd/articulos', icon: Package },
    { title: 'Base de Datos ERP', href: '/bd/erp', icon: Database },
    { title: 'Familias ERP', href: '/bd/familiasERP', icon: Layers },
    { title: 'Categorías de Recetas', href: '/bd/categorias-recetas', icon: BookHeart },
    { title: 'Formatos de Expedición', href: '/bd/formatos-expedicion', icon: Box },
    { title: 'Centros y Ubicaciones', href: '/bd/centros', icon: Factory },
    { title: 'Objetivos CPR', href: '/bd/objetivos-cpr', icon: CreditCard },
    { title: 'Administración', href: '/bd/borrar', icon: Trash2 },
];
```
- src/lib/nav-links.ts:
```ts

'use client';

import { ClipboardList, BookHeart, Factory, Settings, Package, Warehouse, Users, Truck, LifeBuoy, BarChart3, Calendar, AreaChart } from 'lucide-react';
import { cprNav, bookNavLinks, bdNavLinks, rrhhNav } from './cpr-nav';

export const mainNav = [
    { title: 'Previsión de Servicios', href: '/pes', icon: ClipboardList, exact: true },
    { title: 'Calendario de Servicios', href: '/calendario', icon: Calendar, exact: true },
    { title: 'Entregas MICE', href: '/entregas', icon: Truck },
    { title: 'Almacén', href: '/almacen', icon: Warehouse },
    { title: 'Analítica', href: '/analitica', icon: BarChart3 },
    { title: 'Control de Explotación', href: '/control-explotacion', icon: AreaChart },
    { title: 'Configuración', href: '/configuracion', icon: Settings },
];

export { cprNav, bookNavLinks, bdNavLinks, rrhhNav };

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
- src/app/os/personal-mice/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Users, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PersonalMiceOrder, ServiceOrder } from '@/types';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const ITEMS_PER_PAGE = 20;

export default function PersonalMicePage() {
  const [orders, setOrders] = useState<PersonalMiceOrder[]>([]);
  const [serviceOrders, setServiceOrders] = useState<Map<string, ServiceOrder>>(new Map());
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');

  useEffect(() => {
    let storedOrders = localStorage.getItem('personalMiceOrders');
    setOrders(storedOrders ? JSON.parse(storedOrders) : []);

    let storedServiceOrders = localStorage.getItem('serviceOrders');
    const osMap = new Map<string, ServiceOrder>();
    if (storedServiceOrders) {
        (JSON.parse(storedServiceOrders) as ServiceOrder[]).forEach(os => osMap.set(os.id, os));
    }
    setServiceOrders(osMap);

    setIsMounted(true);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (osId && order.osId !== osId) return false;
      
      const os = serviceOrders.get(order.osId);
      const searchMatch =
        searchTerm === '' ||
        order.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.dni || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.centroCoste.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (os && os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      let dateMatch = true;
      if (dateRange?.from && os) {
          const osDate = new Date(os.startDate);
          if(dateRange.to) {
              dateMatch = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
          } else {
              dateMatch = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
          }
      }

      return searchMatch && dateMatch;
    });
  }, [orders, searchTerm, serviceOrders, osId, dateRange]);
  
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  const handleDelete = () => {
    if (!orderToDelete) return;
    const updatedData = orders.filter(e => e.id !== orderToDelete);
    localStorage.setItem('personalMiceOrders', JSON.stringify(updatedData));
    setOrders(updatedData);
    toast({ title: 'Asignación eliminada', description: 'El registro se ha eliminado correctamente.' });
    setOrderToDelete(null);
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Personal MICE..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Gestión de Personal MICE</h1>
          <Button onClick={() => router.push(`/os/personal-mice/nuevo`)} disabled={!osId}>
            <PlusCircle className="mr-2" />
            Nueva Asignación
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por nombre, DNI, OS..."
            className="flex-grow max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Popover>
            <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")} </>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Filtrar por fecha de evento...</span>)}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
            </PopoverContent>
          </Popover>
          <Button variant="secondary" onClick={() => { setSearchTerm(''); setDateRange(undefined); setCurrentPage(1); }}>Limpiar Filtros</Button>
        </div>
        
         <div className="flex items-center justify-end gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
          </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Centro Coste</TableHead>
                <TableHead>Tipo Servicio</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>€/hora</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map(item => {
                  const os = serviceOrders.get(item.osId);
                  return (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/os/${item.osId}/personal-mice`)}>
                        <TableCell><Badge variant="outline">{os?.serviceNumber}</Badge></TableCell>
                        <TableCell className="font-medium">{item.nombre}</TableCell>
                        <TableCell>{item.centroCoste}</TableCell>
                        <TableCell>{item.tipoServicio}</TableCell>
                        <TableCell>{item.horaEntrada} - {item.horaSalida}</TableCell>
                        <TableCell>{item.precioHora.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/os/${item.osId}/personal-mice`)} }>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No se encontraron registros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </>
  );
}

```
- src/app/personal/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown } from 'lucide-react';
import type { Personal } from '@/types';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Papa from 'papaparse';

const CSV_HEADERS = ["id", "nombre", "apellido1", "apellido2", "departamento", "categoria", "telefono", "email", "precioHora"];


function PersonalPageContent() {
  const [items, setItems] = useState<Personal[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

  useEffect(() => {
    let storedData = localStorage.getItem('personal');
    setItems(storedData ? JSON.parse(storedData) : []);
    setIsMounted(true);
  }, []);

  const departments = useMemo(() => {
    const allDepartments = new Set(items.map(item => item.departamento));
    return ['all', ...Array.from(allDepartments).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
        const searchMatch = 
          (item.nombreCompleto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.categoria || '').toLowerCase().includes(searchTerm.toLowerCase());
        const departmentMatch = departmentFilter === 'all' || item.departamento === departmentFilter;
        return searchMatch && departmentMatch;
    });
  }, [items, searchTerm, departmentFilter]);

  const handleDelete = () => {
    if (!itemToDelete) return;
    const updatedData = items.filter(i => i.id !== itemToDelete);
    localStorage.setItem('personal', JSON.stringify(updatedData));
    setItems(updatedData);
    toast({ title: 'Empleado eliminado' });
    setItemToDelete(null);
  };
  
    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
        const file = event.target.files?.[0];
        if (!file) {
          setIsImportAlertOpen(false);
          return;
        }

        Papa.parse<any>(file, {
          header: true,
          skipEmptyLines: true,
          delimiter,
          complete: (results) => {
            if (!results.meta.fields || !CSV_HEADERS.every(field => results.meta.fields?.includes(field))) {
                toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.`});
                return;
            }
            
            const importedData: Personal[] = results.data.map(item => {
                const nombre = item.nombre || '';
                const apellido1 = item.apellido1 || '';
                const apellido2 = item.apellido2 || '';

                return {
                    ...item,
                    nombre,
                    apellido1,
                    apellido2,
                    nombreCompleto: `${nombre} ${apellido1} ${apellido2}`.trim(),
                    nombreCompacto: `${nombre} ${apellido1}`.trim(),
                    iniciales: `${nombre[0] || ''}${apellido1[0] || ''}`.toUpperCase(),
                    precioHora: parseFloat(item.precioHora) || 0
                }
            });
            
            localStorage.setItem('personal', JSON.stringify(importedData));
            setItems(importedData);
            toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
            setIsImportAlertOpen(false);
          },
          error: (error) => {
            toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
            setIsImportAlertOpen(false);
          }
        });
        if(event.target) {
            event.target.value = '';
        }
    };
    
    const handleExportCSV = () => {
        if (items.length === 0) {
            toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay registros para exportar.' });
            return;
        }
        
        const dataToExport = items.map(item => ({
            id: item.id,
            nombre: item.nombre,
            apellido1: item.apellido1,
            apellido2: item.apellido2,
            departamento: item.departamento,
            categoria: item.categoria,
            telefono: item.telefono,
            email: item.email,
            precioHora: item.precioHora
        }));

        const csv = Papa.unparse(dataToExport, { columns: CSV_HEADERS });
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `personal.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Exportación completada' });
    };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Personal..." />;
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input 
          placeholder="Buscar por nombre, apellido o categoría..."
          className="flex-grow max-w-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue placeholder="Filtrar por departamento" />
            </SelectTrigger>
            <SelectContent>
                {departments.map(d => <SelectItem key={d} value={d}>{d === 'all' ? 'Todos los Departamentos' : d}</SelectItem>)}
            </SelectContent>
        </Select>
          <div className="flex-grow flex justify-end gap-2">
            <Button onClick={() => router.push('/personal/nuevo')}>
                <PlusCircle className="mr-2" />
                Nuevo
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon"><Menu /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setIsImportAlertOpen(true)}>
                        <FileUp size={16} className="mr-2"/>Importar CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCSV}>
                        <FileDown size={16} className="mr-2"/>Exportar CSV
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre Completo</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-right w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/personal/${item.id}`)}>
                  <TableCell className="font-medium">{item.nombreCompleto}</TableCell>
                  <TableCell>{item.departamento}</TableCell>
                  <TableCell>{item.categoria}</TableCell>
                  <TableCell>{item.telefono}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/personal/${item.id}`)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id)}}>
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No se encontraron empleados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro del empleado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Importar Archivo CSV</AlertDialogTitle>
                    <AlertDialogDescription>
                        Selecciona el tipo de delimitador que utiliza tu archivo CSV. El fichero debe tener cabeceras que coincidan con el modelo de datos.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="!justify-center gap-4">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, fileInputRef.current?.getAttribute('data-delimiter') as ',' | ';')} />
                    <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ','); fileInputRef.current?.click(); }}>Delimitado por Comas (,)</Button>
                    <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ';'); fileInputRef.current?.click(); }}>Delimitado por Punto y Coma (;)</Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

export default function PersonalPage() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando Personal..." />}>
            <PersonalPageContent />
        </Suspense>
    )
}

```
- src/app/personal/nuevo/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, UserPlus } from 'lucide-react';
import type { Personal } from '@/types';
import { DEPARTAMENTOS_PERSONAL } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useLoadingStore } from '@/hooks/use-loading-store';

export const personalFormSchema = z.object({
  id: z.string().min(1, 'El DNI es obligatorio'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido1: z.string().min(1, 'El primer apellido es obligatorio'),
  apellido2: z.string().optional().default(''),
  iniciales: z.string().optional(),
  departamento: z.string().min(1, 'El departamento es obligatorio'),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  telefono: z.string().optional().default(''),
  email: z.string().email('Debe ser un email válido'),
  precioHora: z.coerce.number().min(0, 'El precio por hora no puede ser negativo'),
});

type PersonalFormValues = z.infer<typeof personalFormSchema>;

export default function NuevoPersonalPage() {
  const router = useRouter();
  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalFormSchema),
    defaultValues: {
      precioHora: 0,
      apellido2: '',
      telefono: '',
    },
  });

  function onSubmit(data: PersonalFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    
    const existing = allItems.find(p => p.id.toLowerCase() === data.id.toLowerCase());
    if (existing) {
        toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un empleado con este DNI.' });
        setIsLoading(false);
        return;
    }
    
    const finalData: Personal = {
        ...data,
        nombreCompleto: `${data.nombre} ${data.apellido1} ${data.apellido2 || ''}`.trim(),
        nombreCompacto: `${data.nombre} ${data.apellido1}`,
        iniciales: `${data.nombre[0]}${data.apellido1[0]}`.toUpperCase(),
        email: data.email, // Ensure email is passed
    }

    allItems.push(finalData);
    localStorage.setItem('personal', JSON.stringify(allItems));
    
    toast({ description: 'Nuevo empleado añadido correctamente.' });
    router.push('/personal');
    setIsLoading(false);
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="personal-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <UserPlus className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">Nuevo Empleado</h1>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => router.push('/personal')}> <X className="mr-2"/> Cancelar</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Guardar</span>
                </Button>
              </div>
            </div>
            
            <Card>
              <CardHeader><CardTitle className="text-lg">Información del Empleado</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="nombre" render={({ field }) => (
                    <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="apellido1" render={({ field }) => (
                    <FormItem><FormLabel>Primer Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="apellido2" render={({ field }) => (
                    <FormItem><FormLabel>Segundo Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="departamento" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Departamento</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {DEPARTAMENTOS_PERSONAL.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="categoria" render={({ field }) => (
                        <FormItem><FormLabel>Categoría / Puesto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="precioHora" render={({ field }) => (
                        <FormItem><FormLabel>Precio/Hora</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <FormField control={form.control} name="telefono" render={({ field }) => (
                        <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="id" render={({ field }) => (
                        <FormItem><FormLabel>DNI</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                 </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}

```
- src/app/personal/[id]/page.tsx:
```tsx

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, UserCog, Trash2 } from 'lucide-react';
import type { Personal } from '@/types';
import { DEPARTAMENTOS_PERSONAL } from '@/types';
import { personalFormSchema } from '@/app/personal/nuevo/page';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type PersonalFormValues = z.infer<typeof personalFormSchema>;

const defaultFormValues: PersonalFormValues = {
  id: '',
  nombre: '',
  apellido1: '',
  apellido2: '',
  telefono: '',
  iniciales: '',
  email: '',
  precioHora: 0,
  departamento: '',
  categoria: '',
};

export default function EditarPersonalPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { isLoading, setIsLoading } = useLoadingStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalFormSchema),
    defaultValues,
  });

  useEffect(() => {
    const allItems = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    const item = allItems.find(p => p.id === id);
    if (item) {
      form.reset({
        ...defaultFormValues, // Ensure all fields have a default
        ...item, // Overwrite with existing data
        precioHora: item.precioHora || 0, // Ensure number is not undefined
        apellido2: item.apellido2 || '',
        telefono: item.telefono || '',
        email: item.email || '',
        iniciales: item.iniciales || '',
      });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el empleado.' });
      router.push('/personal');
    }
  }, [id, form, router, toast]);

  function onSubmit(data: PersonalFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    const index = allItems.findIndex(p => p.id === id);

    if (index !== -1) {
       const finalData: Personal = {
        ...data,
        id,
        nombreCompleto: `${data.nombre} ${data.apellido1} ${data.apellido2 || ''}`.trim(),
        nombreCompacto: `${data.nombre} ${data.apellido1}`,
        iniciales: `${data.nombre[0] || ''}${data.apellido1[0] || ''}`.toUpperCase(),
        email: data.email,
        apellidos: `${data.apellido1} ${data.apellido2 || ''}`.trim(),
    }
      allItems[index] = finalData;
      localStorage.setItem('personal', JSON.stringify(allItems));
      toast({ description: 'Empleado actualizado correctamente.' });
    }
    
    router.push('/personal');
    setIsLoading(false);
  }
  
  const handleDelete = () => {
    let allItems = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    const updatedItems = allItems.filter(p => p.id !== id);
    localStorage.setItem('personal', JSON.stringify(updatedItems));
    toast({ title: 'Empleado eliminado' });
    router.push('/personal');
  };

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="personal-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <UserCog className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">Editar Empleado</h1>
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" type="button" onClick={() => router.push('/personal')}> <X className="mr-2"/> Cancelar</Button>
                 <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2"/> Borrar</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Guardar Cambios</span>
                </Button>
              </div>
            </div>
            
            <Card>
              <CardHeader><CardTitle className="text-lg">Información del Empleado</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="nombre" render={({ field }) => (
                    <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="apellido1" render={({ field }) => (
                    <FormItem><FormLabel>Primer Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="apellido2" render={({ field }) => (
                    <FormItem><FormLabel>Segundo Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="departamento" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Departamento</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {DEPARTAMENTOS_PERSONAL.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="categoria" render={({ field }) => (
                        <FormItem><FormLabel>Categoría / Puesto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="precioHora" render={({ field }) => (
                        <FormItem><FormLabel>Precio/Hora</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <FormField control={form.control} name="telefono" render={({ field }) => (
                        <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="id" render={({ field }) => (
                        <FormItem><FormLabel>DNI</FormLabel><FormControl><Input {...field} readOnly /></FormControl><FormMessage /></FormItem>
                    )} />
                 </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente el registro del empleado.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

```
- src/app/produccion/page.tsx:
```tsx

'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main CPR page.
export default function ProduccionRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/cpr');
    }, [router]);
    return null;
}

```
- src/hooks/use-local-storage.ts:
```ts
'use client';

import { useState, useEffect, useCallback } from 'react';

// This hook is currently NOT IN USE. Data management has been centralized in useDataStore.
// It remains for potential future use cases or as a reference.
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        window.dispatchEvent(new StorageEvent('storage', { key }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const refreshValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const item = window.localStorage.getItem(key);
      setStoredValue(item ? JSON.parse(item) : initialValue);
    } catch (error) {
      console.error(error);
      setStoredValue(initialValue);
    }
  }, [key, initialValue]);


  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        refreshValue();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, refreshValue]);

  return [storedValue, setValue, refreshValue] as const;
}

export default useLocalStorage;

```
- src/app/os/personal-mice/layout.tsx:
```tsx
'use client';

import { Users } from 'lucide-react';

export default function PersonalMiceLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
        <div>
             <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Módulo de Personal MICE</h1>
             </div>
            {children}
        </div>
    )
}
```
- src/app/os/personal-externo/layout.tsx:
```tsx
'use client';

import { Users } from 'lucide-react';
import { useOsData } from '../os-context';

export default function PersonalExternoLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsData();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Módulo de Personal Externo</h1>
                   <div className="text-muted-foreground mt-2 space-y-1">
                      <p>OS: {serviceOrder?.serviceNumber} - {serviceOrder?.client}</p>
                  </div>
                </div>
             </div>
            {children}
        </div>
    )
}
```
- src/app/os/transporte/layout.tsx:
```tsx
'use client';

import { Truck } from 'lucide-react';
import { useOsData } from '../os-context';

export default function TransporteLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsData();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Truck />Módulo de Transporte</h1>
                   <div className="text-muted-foreground mt-2 space-y-1">
                      <p>OS: {serviceOrder?.serviceNumber} - {serviceOrder?.client}</p>
                  </div>
                </div>
             </div>
            {children}
        </div>
    )
}
```
- src/app/os/prueba-menu/layout.tsx:
```tsx
'use client';

import { ClipboardCheck } from 'lucide-react';
import { useOsData } from '../os-context';

export default function PruebaMenuLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsData();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><ClipboardCheck />Prueba de Menú</h1>
                   <div className="text-muted-foreground mt-2 space-y-1">
                      <p>OS: {serviceOrder?.serviceNumber} - {serviceOrder?.client}</p>
                  </div>
                </div>
             </div>
            {children}
        </div>
    )
}
```
- src/app/os/hielo/layout.tsx:
```tsx
'use client';

import { Snowflake } from 'lucide-react';
import { useOsData } from '../os-context';

export default function HieloLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsData();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Snowflake />Módulo de Hielo</h1>
                   <div className="text-muted-foreground mt-2 space-y-1">
                      <p>OS: {serviceOrder?.serviceNumber} - {serviceOrder?.client}</p>
                  </div>
                </div>
             </div>
            {children}
        </div>
    )
}
```
- src/app/os/decoracion/layout.tsx:
```tsx
'use client';

import { Flower2 } from 'lucide-react';
import { useOsData } from '../os-context';

export default function DecoracionLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsData();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Flower2 />Módulo de Decoración</h1>
                   <div className="text-muted-foreground mt-2 space-y-1">
                      <p>OS: {serviceOrder?.serviceNumber} - {serviceOrder?.client}</p>
                  </div>
                </div>
             </div>
            {children}
        </div>
    )
}
```
- src/app/os/cta-explotacion/layout.tsx:
```tsx
'use client';

import { Euro } from 'lucide-react';
import { useOsData } from '../os-context';

export default function CtaExplotacionLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsData();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Euro />Cuenta de Explotación</h1>
                   <div className="text-muted-foreground mt-2 space-y-1">
                      <p>OS: {serviceOrder?.serviceNumber} - {serviceOrder?.client}</p>
                  </div>
                </div>
             </div>
            {children}
        </div>
    )
}
```
- src/app/os/comercial/layout.tsx:
```tsx
'use client';

import { Briefcase } from 'lucide-react';
import { useOsData } from '../os-context';

export default function ComercialLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsData();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Briefcase />Módulo Comercial</h1>
                   <div className="text-muted-foreground mt-2 space-y-1">
                      <p>OS: {serviceOrder?.serviceNumber} - {serviceOrder?.client}</p>
                  </div>
                </div>
             </div>
            {children}
        </div>
    )
}
```
- src/app/os/bodega/layout.tsx:
```tsx
'use client';

import { Wine } from 'lucide-react';
import { useOsData } from '../os-context';

export default function BodegaLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsData();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Wine />Módulo de Bodega</h1>
                   <div className="text-muted-foreground mt-2 space-y-1">
                      <p>OS: {serviceOrder?.serviceNumber} - {serviceOrder?.client}</p>
                  </div>
                </div>
             </div>
            {children}
        </div>
    )
}
```
- src/app/os/bio/layout.tsx:
```tsx
'use client';

import { Leaf } from 'lucide-react';
import { useOsData } from '../os-context';

export default function BioLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsData();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Leaf />Módulo de Bio (Consumibles)</h1>
                   <div className="text-muted-foreground mt-2 space-y-1">
                      <p>OS: {serviceOrder?.serviceNumber} - {serviceOrder?.client}</p>
                  </div>
                </div>
             </div>
            {children}
        </div>
    )
}
```
- src/app/os/alquiler/layout.tsx:
```tsx
'use client';

import { Archive } from 'lucide-react';
import { useOsData } from '../os-context';

export default function AlquilerLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsData();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Archive />Módulo de Alquiler</h1>
                   <div className="text-muted-foreground mt-2 space-y-1">
                      <p>OS: {serviceOrder?.serviceNumber} - {serviceOrder?.client}</p>
                  </div>
                </div>
             </div>
            {children}
        </div>
    )
}
```
- src/app/os/almacen/layout.tsx:
```tsx
'use client';

import { Warehouse } from 'lucide-react';
import { useOsData } from '../os-context';

export default function AlmacenLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsData();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Warehouse />Módulo de Almacén</h1>
                   <div className="text-muted-foreground mt-2 space-y-1">
                      <p>OS: {serviceOrder?.serviceNumber} - {serviceOrder?.client}</p>
                  </div>
                </div>
             </div>
            {children}
        </div>
    )
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