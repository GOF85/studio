
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

import { useEffect, useState, useMemo } from 'react';
import type { ServiceOrder, ComercialBriefing } from '@/types';

export function useOsData(osId: string) {
    const [isLoading, setIsLoading] = useState(true);
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [briefing, setBriefing] = useState<ComercialBriefing | null>(null);
    const [spaceAddress, setSpaceAddress] = useState<string>('');

    useEffect(() => {
        setIsLoading(true);
        try {
            if (!osId) {
                console.error("No OS ID provided to useOsData hook");
                return;
            };

            const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
            const currentOS = allServiceOrders.find(os => os.id === osId);
            setServiceOrder(currentOS || null);

            if (currentOS?.space) {
                const allEspacios = JSON.parse(localStorage.getItem('espacios') || '[]') as { identificacion: { nombreEspacio: string; calle: string } }[];
                const currentSpace = allEspacios.find(e => e.identificacion.nombreEspacio === currentOS.space);
                setSpaceAddress(currentSpace?.identificacion.calle || '');
            }

            const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
            const currentBriefing = allBriefings.find(b => b.osId === osId);
            setBriefing(currentBriefing || null);

        } catch (error) {
            console.error("Failed to load OS data", error);
        } finally {
            setIsLoading(false);
        }
    }, [osId]);

    return { isLoading, serviceOrder, briefing, spaceAddress };
}

```
- src/components/os/info-form.tsx:
```tsx

'use client';

import { useForm, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { FormField, FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';
import type { ServiceOrder, Personal, Espacio } from '@/types';
import { useMemo, useState, useEffect } from 'react';
import { Phone, Mail } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useOsData } from '@/hooks/use-os-data';
import { useDataStore } from '@/hooks/use-data-store';

const ClienteTitle = () => {
    const { watch } = useFormContext();
    const client = watch('client');
    const finalClient = watch('finalClient');
    return (
        <div className="flex w-full items-center justify-between p-4">
            <h3 className="text-lg font-semibold">Cliente</h3>
            {(client || finalClient) && (
                 <span className="text-lg font-bold text-primary text-right">
                    {client}{finalClient && ` / ${finalClient}`}
                </span>
            )}
        </div>
    )
};

const ClientInfo = () => {
    const { control } = useFormContext();
    return (
        <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 pt-2">
                 <FormField control={control} name="client" render={({ field }) => (
                    <FormItem><FormLabel>Cliente</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={control} name="tipoCliente" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo Cliente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Empresa">Empresa</SelectItem>
                            <SelectItem value="Agencia">Agencia</SelectItem>
                            <SelectItem value="Particular">Particular</SelectItem>
                        </SelectContent>
                    </Select>
                    </FormItem>
                )} />
                 <FormField control={control} name="finalClient" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cliente Final</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                )} />
                <FormField control={control} name="contact" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contacto Principal</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono Principal</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                 <FormField control={control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email Principal</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={control} name="direccionPrincipal" render={({ field }) => (
                    <FormItem className="col-span-full"><FormLabel>Dirección Principal de Entrega</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
            </div>
        </AccordionContent>
    );
};

const EspacioTitle = () => {
    const { watch } = useFormContext();
    const space = watch('space');
    const spaceAddress = watch('spaceAddress');
    
    return (
        <div className="flex w-full items-center justify-between p-4">
            <h3 className="text-lg font-semibold">Espacio</h3>
            {space && (
                <span className="text-base font-semibold text-primary text-right">
                    {space} {spaceAddress && <span className="font-normal text-muted-foreground">({spaceAddress})</span>}
                </span>
            )}
        </div>
    );
};

const ResponsablesTitle = () => {
  const metre = useWatch({ name: 'respMetre' });
  const pase = useWatch({ name: 'respPase' });

  return (
    <div className="flex w-full items-center justify-between p-4">
        <h3 className="text-lg font-semibold">Responsables</h3>
        {(metre || pase) && (
            <div className="text-right">
                {metre && <p className="text-sm"><span className="font-semibold text-muted-foreground">Metre:</span> <span className="font-semibold text-primary">{metre}</span></p>}
                {pase && <p className="text-sm"><span className="font-semibold text-muted-foreground">Pase:</span> <span className="font-semibold text-primary">{pase}</span></p>}
            </div>
        )}
    </div>
  );
};

export const FinancialTitle = () => {
    const { watch } = useFormContext();
    const facturacion = watch('facturacion');
    const comisionesAgencia = watch('comisionesAgencia');
    const comisionesCanon = watch('comisionesCanon');
    
    const facturacionNeta = facturacion - (comisionesAgencia || 0) - (comisionesCanon || 0);

    return (
         <div className="flex w-full items-center justify-between p-4">
            <h3 className="text-lg font-semibold">Información Financiera</h3>
            <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">Bruto: {formatCurrency(facturacion)}</p>
                <p className="text-2xl font-bold text-green-600">Neto: {formatCurrency(facturacionNeta)}</p>
            </div>
        </div>
    )
}

export function InfoForm({ form }: { form: any }) {
    const { control, watch, setValue } = form;
    const { data, isLoaded } = useDataStore();
    const [personal, setPersonal] = useState<Personal[]>([]);
    const [espacios, setEspacios] = useState<Espacio[]>([]);
    
    const getFullName = (p: Personal) => `${p.nombre} ${p.apellido1} ${p.apellido2 || ''}`.trim();

    const personalSala = useMemo(() => personal.filter(p => p.departamento === 'Sala' && p.nombre && p.apellido1), [personal]);
    const personalPase = useMemo(() => personal.filter(p => p.departamento === 'Pase' && p.nombre && p.apellido1), [personal]);
    const personalCPR = useMemo(() => personal.filter(p => p.departamento === 'CPR' && p.nombre && p.apellido1), [personal]);
    const personalComercial = useMemo(() => personal.filter(p => p.departamento === 'Comercial' && p.nombre && p.apellido1), [personal]);
    const personalCocina = useMemo(() => personal.filter(p => p.departamento === 'COCINA' && p.nombre && p.apellido1), [personal]);
    const personalRRHH = useMemo(() => personal.filter(p => p.departamento === 'RRHH' && p.nombre && p.apellido1), [personal]);
    const personalOperaciones = useMemo(() => personal.filter(p => p.departamento === 'Operaciones' && p.nombre && p.apellido1), [personal]);
    const validEspacios = useMemo(() => espacios.filter(e => e.identificacion.nombreEspacio), [espacios]);
    const espacioOptions = useMemo(() => validEspacios.map(e => ({label: e.identificacion.nombreEspacio, value: e.identificacion.nombreEspacio})), [validEspacios]);

    const handlePersonalChange = (name: string, phoneField: keyof any, mailField: keyof any) => {
        const person = personal.find(p => getFullName(p) === name);
        setValue(phoneField, person?.telefono || '', { shouldDirty: true });
        setValue(mailField, person?.email || '', { shouldDirty: true });
    }

    const handleEspacioChange = (name: string) => {
        const espacio = espacios.find(e => e.identificacion.nombreEspacio === name);
        setValue('spaceAddress', espacio?.identificacion.calle || '', { shouldDirty: true });
        setValue('spaceContact', espacio?.contactos[0]?.nombre || '', { shouldDirty: true });
        setValue('spacePhone', espacio?.contactos[0]?.telefono || '', { shouldDirty: true });
        setValue('spaceMail', espacio?.contactos[0]?.email || '', { shouldDirty: true });
    }

    useEffect(() => {
        if (!isLoaded) return;
        setPersonal(data.personal || []);
        setEspacios(data.espacios || []);
    }, [isLoaded, data]);

    return (
         <Accordion type="multiple" defaultValue={['cliente', 'espacio']} className="w-full space-y-3 pt-3">
            <AccordionItem value="cliente" className="border-none">
            <Card>
                <AccordionTrigger className="p-0"><ClienteTitle /></AccordionTrigger>
                <ClientInfo />
            </Card>
            </AccordionItem>
            <AccordionItem value="espacio" className="border-none">
            <Card>
                <AccordionTrigger className="p-0"><EspacioTitle /></AccordionTrigger>
                <AccordionContent>
                <div className="space-y-4 px-4 pb-4">
                    <FormField control={control} name="space" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Espacio</FormLabel>
                            <Combobox
                                options={espacioOptions}
                                value={field.value || ''}
                                onChange={(value) => { field.onChange(value); handleEspacioChange(value); }}
                                placeholder="Busca o selecciona un espacio..."
                            />
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={control} name="spaceAddress" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Dirección</FormLabel>
                            <FormControl><Input {...field} placeholder="Dirección del espacio" /></FormControl>
                        </FormItem>
                    )} />
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormField control={control} name="spaceContact" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Contacto Espacio</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                        )} />
                        <FormField control={control} name="spacePhone" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tlf. Espacio</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                        )} />
                        <FormField control={control} name="spaceMail" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email Espacio</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={control} name="plane" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Plano</FormLabel>
                            <FormControl><Input placeholder="Enlazar aquí..." {...field} /></FormControl>
                        </FormItem>
                        )} />
                    </div>
                </div>
                </AccordionContent>
            </Card>
            </AccordionItem>
            <AccordionItem value="responsables" className="border-none">
                <Card>
                <AccordionTrigger className="p-0"><ResponsablesTitle /></AccordionTrigger>
                <AccordionContent>
                <div className="space-y-4 px-4 pb-4">
                    {[
                        ['respMetre', 'respMetrePhone', 'respMetreMail', 'Resp. Metre', personalSala], 
                        ['respPase', 'respPasePhone', 'respPaseMail', 'Resp. Pase', personalPase], 
                        ['respCocinaPase', 'respCocinaPasePhone', 'respCocinaPaseMail', 'Resp. Cocina Pase', personalCocina], 
                        ['respCocinaCPR', 'respCocinaCPRPhone', 'respCocinaCPRMail', 'Resp. Cocina CPR', personalCPR],
                        ['respProjectManager', 'respProjectManagerPhone', 'respProjectManagerMail', 'Resp. Project Manager', personalOperaciones],
                    ].map(([name, phone, mail, label, personalList]) => (
                    <div key={name as string} className="grid items-center grid-cols-[1fr_1.5fr_1.5fr] gap-4">
                            <FormLabel>{label as string}</FormLabel>
                            <FormField control={control} name={name as any} render={({ field }) => (
                                <FormItem>
                                    <Combobox options={(personalList as Personal[]).map(p => ({ label: getFullName(p), value: getFullName(p) }))}
                                        value={field.value}
                                        onChange={(value) => { field.onChange(value); handlePersonalChange(value, phone as any, mail as any); }}
                                        placeholder="Seleccionar..." />
                                </FormItem>
                            )}/>
                            <div className="flex gap-2 items-center text-sm text-muted-foreground"><Phone className="h-4 w-4"/> {watch(phone as any) || '-'} <Separator orientation="vertical" className="h-4"/> <Mail className="h-4 w-4"/> {watch(mail as any) || '-'}</div>
                    </div>
                    ))}
                    <Separator />
                    <div className="grid items-center grid-cols-[1fr_1.5fr_1.5fr] gap-4">
                        <FormField control={control} name="comercialAsiste" render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-2">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="comercial-asiste" /></FormControl>
                                <FormLabel htmlFor="comercial-asiste">Comercial asiste al evento</FormLabel>
                            </FormItem>
                        )} />
                        <FormField control={control} name="comercial" render={({ field }) => (
                            <FormItem>
                                <Combobox options={(personalComercial as Personal[]).map(p => ({ label: getFullName(p), value: getFullName(p) }))}
                                value={field.value}
                                onChange={(value) => { field.onChange(value); handlePersonalChange(value, 'comercialPhone', 'comercialMail'); }}
                                placeholder="Seleccionar comercial..." />
                            </FormItem>
                        )}/>
                        <div className="flex gap-2 items-center text-sm text-muted-foreground"><Phone className="h-4 w-4"/> {watch('comercialPhone') || '-'} <Separator orientation="vertical" className="h-4"/> <Mail className="h-4 w-4"/> {watch('comercialMail') || '-'}</div>
                    </div>
                    <Separator />
                    <div className="grid items-center grid-cols-[1fr_1.5fr_1.5fr] gap-4">
                        <FormField control={control} name="rrhhAsiste" render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-2">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="rrhh-asiste" /></FormControl>
                                <FormLabel htmlFor="rrhh-asiste">RRHH asiste al evento</FormLabel>
                            </FormItem>
                        )}/>
                        <FormField control={control} name="respRRHH" render={({ field }) => (
                            <FormItem>
                                <Combobox options={(personalRRHH as Personal[]).map(p => ({ label: getFullName(p), value: getFullName(p) }))}
                                value={field.value}
                                onChange={(value) => { field.onChange(value); handlePersonalChange(value, 'respRRHHPhone', 'respRRHHMail'); }}
                                placeholder="Seleccionar responsable RRHH..." />
                            </FormItem>
                        )}/>
                        <div className="flex gap-2 items-center text-sm text-muted-foreground"><Phone className="h-4 w-4"/> {watch('respRRHHPhone') || '-'} <Separator orientation="vertical" className="h-4"/> <Mail className="h-4 w-4"/> {watch('respRRHHMail') || '-'}</div>
                    </div>
                </div>
                </AccordionContent>
                </Card>
            </AccordionItem>
            
            <AccordionItem value="comentarios" className="border-none">
                <Card>
                <AccordionTrigger className="p-4"><h3 className="text-lg font-semibold">Comentarios Generales</h3></AccordionTrigger>
                <AccordionContent>
                    <div className="px-4 pb-4">
                    <FormField control={control} name="comments" render={({ field }) => (
                        <FormItem><FormControl><Textarea {...field} rows={6} /></FormControl></FormItem>
                    )} />
                    </div>
                </AccordionContent>
                </Card>
            </AccordionItem>
         </Accordion>
    );
}

```
- src/hooks/use-impersonated-user.tsx:
```tsx
'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { PortalUser, Personal } from '@/types';
import { usePathname } from 'next/navigation';

type ImpersonatedUserContextType = {
  impersonatedUser: PortalUser | null;
  setImpersonatedUser: (user: PortalUser | null) => void;
};

const ImpersonatedUserContext = createContext<ImpersonatedUserContextType | undefined>(undefined);

export function ImpersonatedUserProvider({ children }: { children: ReactNode }) {
  const [impersonatedUser, setImpersonatedUserState] = useState<PortalUser | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // On initial load, try to get the user from localStorage
    const storedUser = localStorage.getItem('impersonatedUser');
    if (storedUser) {
      try {
        setImpersonatedUserState(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse impersonated user from localStorage", e);
        localStorage.removeItem('impersonatedUser');
      }
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
  
  useEffect(() => {
    // If user navigates away from portal, clear impersonation
    if (impersonatedUser && !pathname.startsWith('/portal') && !pathname.startsWith('/rrhh')) {
        const isAdminOrComercial = impersonatedUser.roles.includes('Admin') || impersonatedUser.roles.includes('Comercial');
        if (!isAdminOrComercial) {
            // setImpersonatedUser(null);
        }
    }
  }, [pathname, impersonatedUser]);

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
- src/hooks/use-loading-store.ts:
```ts
import { create } from 'zustand';

type LoadingState = {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
};

export const useLoadingStore = create<LoadingState>()((set) => ({
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
}));

```
- src/hooks/use-sidebar-store.ts:
```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type SidebarState = {
  isCollapsed: boolean;
  toggleSidebar: () => void;
};

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      isCollapsed: false,
      toggleSidebar: () => set({ isCollapsed: !get().isCollapsed }),
    }),
    {
      name: 'sidebar-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);

```
- src/hooks/use-toast.ts:
```ts
"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 2000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })
  
  // Auto-dismiss after a delay
  setTimeout(() => {
    dismiss()
  }, props.duration || 3000); // Changed to 3000ms for a better user experience


  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }

```
- src/lib/bd-nav.ts:
```ts
'use client';

import { Database, Users, Package, Building, Layers, Box, Percent, Target, Factory, CreditCard, Banknote, Trash2, UserPlus, MapPin, History } from 'lucide-react';

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
- src/lib/cpr-nav.ts:
```ts
'use client';

import { LayoutDashboard, Factory, ClipboardList, Package, ListChecks, History, CheckCircle, AlertTriangle, PackagePlus, BarChart3, Printer, ChefHat, BookHeart, Component, Sprout, CheckSquare, Shield, TrendingUp, Users, UserCheck, Archive, HistoryIcon, Calculator } from 'lucide-react';

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

    
```
- src/lib/data.ts:
```ts
import type { CateringItem } from '@/types';

export const CATERING_ITEMS: CateringItem[] = [
  { itemCode: 'PLT01', description: 'Plato de cena', price: 0.5, stock: 500, imageUrl: 'https://picsum.photos/seed/plates/400/300', imageHint: 'white plates', category: 'BODEGA' },
  { itemCode: 'GLS01', description: 'Copa de vino', price: 0.4, stock: 450, imageUrl: 'https://picsum.photos/seed/glasses/400/300', imageHint: 'wine glasses', category: 'BODEGA' },
  { itemCode: 'CUT01', description: 'Juego de cubiertos', price: 0.75, stock: 400, imageUrl: 'https://picsum.photos/seed/cutlery/400/300', imageHint: 'silver cutlery', category: 'BODEGA' },
  { itemCode: 'TBL01', description: 'Mesa redonda (8p)', price: 10, stock: 50, imageUrl: 'https://picsum.photos/seed/tables/400/300', imageHint: 'banquet table', category: 'BODEGA' },
  { itemCode: 'CHR01', description: 'Silla plegable blanca', price: 1.5, stock: 300, imageUrl: 'https://picsum.photos/seed/chairs/400/300', imageHint: 'white chair', category: 'BODEGA' },
  { itemCode: 'LIN01', description: 'Mantel blanco', price: 5, stock: 100, imageUrl: 'https://picsum.photos/seed/linens/400/300', imageHint: 'white linen', category: 'BODEGA' },
  { itemCode: 'SRV01', description: 'Bandeja para servir', price: 2, stock: 80, imageUrl: 'https://picsum.photos/seed/serving/400/300', imageHint: 'serving tray', category: 'BODEGA' },
  { itemCode: 'HTR01', description: 'Calentador de patio', price: 50, stock: 20, imageUrl: 'https://picsum.photos/seed/heater/400/300', imageHint: 'patio heater', category: 'BODEGA' },
  { itemCode: 'PLT02', description: 'Plato de postre', price: 0.4, stock: 500, imageUrl: 'https://picsum.photos/seed/dessertplate/400/300', imageHint: 'dessert plates', category: 'BODEGA' },
  { itemCode: 'GLS02', description: 'Vaso de agua', price: 0.3, stock: 600, imageUrl: 'https://picsum.photos/seed/waterglass/400/300', imageHint: 'water glasses', category: 'BODEGA' },
  { itemCode: 'TBL02', description: 'Mesa rectangular', price: 12, stock: 40, imageUrl: 'https://picsum.photos/seed/recttable/400/300', imageHint: 'long table', category: 'BODEGA' },
];

```
- src/lib/fonts.ts:
```ts
import { Open_Sans, Roboto } from 'next/font/google';

export const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-headline',
});

export const roboto = Roboto({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-body',
});
```
- src/lib/nav-links.ts:
```ts
'use client';

import {
    ClipboardList,
    BookHeart,
    Factory,
    Settings,
    Package,
    Warehouse,
    Users,
    Truck,
    LifeBuoy,
    BarChart3,
    Calendar,
    AreaChart,
    Database,
    UserPlus,
    Shuffle,
    UserCheck,
    LayoutDashboard,
    Component,
    Sprout,
    CheckSquare,
    TrendingUp,
    Printer,
    ListChecks,
    AlertTriangle,
    History,
    HistoryIcon,
    Calculator,
    Box,
    Layers,
    Percent,
    Target,
    Banknote,
    CreditCard,
    CheckCircle,
    Archive,
    ChefHat,
    PackagePlus,
    Shield,
    Building,
    Trash2,
    Wine,
    Leaf,
    Snowflake,
    FilePlus,
    Flower2,
    ClipboardCheck,
    FilePenLine,
    Menu,
    FileUp,
    FileDown,
    MoreHorizontal,
    Pencil,
    Copy,
    RefreshCw,
    Euro,
    BrainCircuit,
    Link as LinkIcon,
    MapPin,
    CircleX,
    PanelLeft,
    ChevronRight,
    Star
} from 'lucide-react';

export const mainNav = [
    { title: 'Previsión de Servicios', href: '/pes', icon: ClipboardList, exact: true },
    { title: 'Calendario de Servicios', href: '/calendario', icon: Calendar, exact: true },
    { title: 'Entregas MICE', href: '/entregas', icon: Truck },
    { title: 'Almacén', href: '/almacen', icon: Warehouse },
    { title: 'Analítica', href: '/analitica', icon: BarChart3 },
    { title: 'Control de Explotación', href: '/control-explotacion', icon: AreaChart },
    { title: 'Configuración', href: '/configuracion', icon: Settings },
];

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

export const rrhhNav = [
    { title: 'Dashboard RRHH', href: '/rrhh', icon: LayoutDashboard, description: 'Vista general y accesos directos del módulo de RRHH.' },
    { title: 'Solicitudes de Personal', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona las necesidades de personal para Eventos y CPR.' },
    { title: 'Cesiones de Personal', href: '/rrhh/cesiones', icon: Shuffle, description: 'Gestiona la asignación de personal interno entre departamentos.' },
    { title: 'Validación de Horas (Cesiones)', href: '/rrhh/validacion-cesiones', icon: UserCheck, description: 'Valida las horas reales del personal interno cedido.' },
    { title: 'Base de Datos de Personal', href: '/bd/personal', icon: Users, description: 'Administra los empleados internos.', adminOnly: true },
    { title: 'Base de Datos de ETTs', href: '/bd/personal-externo-db', icon: UserPlus, description: 'Administra los trabajadores externos.', adminOnly: true },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
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
- src/lib/placeholder-images.json:
```json
{
  "placeholderImages": [
    { "id": "plates", "description": "Dinner plates", "imageUrl": "https://picsum.photos/seed/plates/400/300", "imageHint": "white plates", "category": "Vajilla" },
    { "id": "glasses", "description": "Wine glasses", "imageUrl": "https://picsum.photos/seed/glasses/400/300", "imageHint": "wine glasses", "category": "Cristalería" },
    { "id": "cutlery", "description": "Silverware set", "imageUrl": "https://picsum.photos/seed/cutlery/400/300", "imageHint": "silver cutlery", "category": "Cubertería" },
    { "id": "tables", "description": "Round banquet table", "imageUrl": "https://picsum.photos/seed/tables/400/300", "imageHint": "banquet table", "category": "Mobiliario" },
    { "id": "chairs", "description": "White folding chair", "imageUrl": "https://picsum.photos/seed/chairs/400/300", "imageHint": "white chair", "category": "Mobiliario" },
    { "id": "linens", "description": "White tablecloth", "imageUrl": "https://picsum.photos/seed/linens/400/300", "imageHint": "white linen", "category": "Mantelería" },
    { "id": "serving", "description": "Serving tray", "imageUrl": "https://picsum.photos/seed/serving/400/300", "imageHint": "serving tray", "category": "Servicio" },
    { "id": "heater", "description": "Patio heater", "imageUrl": "https://picsum.photos/seed/heater/400/300", "imageHint": "patio heater", "category": "Equipamiento" },
    { "id": "dessertplate", "description": "Dessert plates", "imageUrl": "https://picsum.photos/seed/dessertplate/400/300", "imageHint": "dessert plates", "category": "Vajilla" },
    { "id": "waterglass", "description": "Water glasses", "imageUrl": "https://picsum.photos/seed/waterglass/400/300", "imageHint": "water glasses", "category": "Cristalería" },
    { "id": "recttable", "description": "Long table", "imageUrl": "https://picsum.photos/seed/recttable/400/300", "imageHint": "long table", "category": "Mobiliario" }
  ]
}
```
- src/lib/placeholder-images.ts:
```ts
import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  category: string;
};

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;
```
- src/lib/rrhh-nav.ts:
```ts
'use client';

import { Users, ClipboardList, BarChart3, UserPlus, Shuffle, UserCheck, LayoutDashboard } from 'lucide-react';

export const rrhhNav = [
    { title: 'Dashboard RRHH', href: '/rrhh', icon: LayoutDashboard, description: 'Vista general y accesos directos del módulo de RRHH.' },
    { title: 'Solicitudes de Personal', href: '/rrhh/solicitudes', icon: ClipboardList, description: 'Gestiona las necesidades de personal para Eventos y CPR.' },
    { title: 'Cesiones de Personal', href: '/rrhh/cesiones', icon: Shuffle, description: 'Gestiona la asignación de personal interno entre departamentos.' },
    { title: 'Validación de Horas (Cesiones)', href: '/rrhh/validacion-cesiones', icon: UserCheck, description: 'Valida las horas reales del personal interno cedido.' },
    { title: 'Base de Datos de Personal', href: '/bd/personal', icon: Users, description: 'Administra los empleados internos.', adminOnly: true },
    { title: 'Base de Datos de ETTs', href: '/bd/personal-externo-db', icon: UserPlus, description: 'Administra los trabajadores externos.', adminOnly: true },
    { title: 'Analítica de RRHH', href: '/rrhh/analitica', icon: BarChart3, description: 'Analiza costes, horas y productividad del personal.' },
];
```
- src/lib/utils.ts:
```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { parse, differenceInMinutes } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || isNaN(value)) {
    return (0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  }
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function formatNumber(value: number, decimals: number = 2) {
    if (isNaN(value)) return '0';
    return value.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatUnit(unit: string) {
    const unitMap: Record<string, string> = {
        'KG': 'kg',
        'L': 'l',
        'UD': 'ud',
    }
    return unitMap[unit] || unit;
}

export function formatPercentage(value: number) {
  if (isNaN(value)) return '0,00%';
  return `${(value * 100).toFixed(2)}%`.replace('.',',');
}

export function calculateHours(start?: string, end?: string): number {
    if (!start || !end) return 0;
    try {
        const startTime = parse(start, 'HH:mm', new Date());
        const endTime = parse(end, 'HH:mm', new Date());

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            console.error('Invalid time format for calculating hours:', { start, end });
            return 0;
        }
        
        if (endTime < startTime) {
            endTime.setDate(endTime.getDate() + 1);
        }

        const diff = differenceInMinutes(endTime, startTime);
        return diff > 0 ? diff / 60 : 0;
    } catch (e) {
        console.error("Error calculating hours:", e);
        return 0;
    }
}

export function formatDuration(hours: number) {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
```
- src/app/produccion/page.tsx:
```tsx

'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main OS page as transport is managed within an OS.
export default function ProduccionRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/cpr/produccion');
    }, [router]);
    return null;
}

```
- src/app/transporte/page.tsx:
```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main OS page as transport is managed within an OS.
export default function TransporteRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/pes');
    }, [router]);
    return null;
}
```
- src/app/os/transporte/page.tsx:
```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, Truck, Phone, Building } from 'lucide-react';
import type { TransporteOrder, ServiceOrder, Espacio } from '@/types';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency } from '@/lib/utils';
import { useOsData } from '../os-context';

const statusVariant: { [key in TransporteOrder['status']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  Pendiente: 'secondary',
  Confirmado: 'default',
  'En Ruta': 'outline',
  Entregado: 'outline',
};

export default function TransportePage() {
  const [transporteOrders, setTransporteOrders] = useState<TransporteOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { serviceOrder, spaceAddress, isLoading: isOsDataLoading } = useOsData(osId);
  const { toast } = useToast();

  useEffect(() => {
    if (!osId) return;

    const allTransporteOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    const relatedOrders = allTransporteOrders.filter(order => order.osId === osId);
    setTransporteOrders(relatedOrders);

    setIsMounted(true);
  }, [osId, router, toast]);

  const totalAmount = useMemo(() => {
    return transporteOrders.reduce((sum, order) => sum + order.precio, 0);
  }, [transporteOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    const updatedOrders = allOrders.filter((o: TransporteOrder) => o.id !== orderToDelete);
    localStorage.setItem('transporteOrders', JSON.stringify(updatedOrders));
    setTransporteOrders(updatedOrders.filter((o: TransporteOrder) => o.osId === osId));
    
    toast({ title: 'Pedido de transporte eliminado' });
    setOrderToDelete(null);
  };
  
  if (!isMounted || isOsDataLoading) {
    return <LoadingSkeleton title="Cargando Módulo de Transporte..." />;
  }

  return (
    <>
      <div className="flex items-start justify-end mb-4">
        <Button asChild>
          <Link href={`/os/transporte/pedido?osId=${osId}`}>
            <PlusCircle className="mr-2" />
            Nuevo Pedido de Transporte
          </Link>
        </Button>
      </div>

      <Card>
          <CardHeader><CardTitle>Pedidos de Transporte Realizados</CardTitle></CardHeader>
          <CardContent>
               <div className="border rounded-lg">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Recogida</TableHead>
                          <TableHead>Entrega</TableHead>
                          <TableHead>Importe</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {transporteOrders.length > 0 ? (
                          transporteOrders.map(order => (
                          <TableRow key={order.id}>
                              <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{order.proveedorNombre}</TableCell>
                              <TableCell>{order.tipoTransporte}</TableCell>
                              <TableCell>{order.lugarRecogida} a las {order.horaRecogida}</TableCell>
                              <TableCell>{order.lugarEntrega} a las {order.horaEntrega}</TableCell>
                              <TableCell>{formatCurrency(order.precio)}</TableCell>
                              <TableCell>
                              <Badge variant={statusVariant[order.status]}>
                                  {order.status}
                              </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Abrir menú</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/os/transporte/pedido?osId=${osId}&orderId=${order.id}`)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => setOrderToDelete(order.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                  </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                              </TableCell>
                          </TableRow>
                          ))
                      ) : (
                          <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center">
                              No hay pedidos de transporte para esta Orden de Servicio.
                          </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </div>
              {transporteOrders.length > 0 && (
                  <div className="flex justify-end mt-4 text-xl font-bold">
                      Importe Total: {formatCurrency(totalAmount)}
                  </div>
              )}
          </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido de transporte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```
- src/app/pes/page.tsx:
```tsx
'use client';

import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { PrevisionServiciosContent } from '@/components/pes/prevision-servicios-content';

export default function PrevisionServiciosPage() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando Previsión de Servicios..." />}>
            <PrevisionServiciosContent />
        </Suspense>
    );
}
```
- src/components/pes/prevision-servicios-content.tsx:
```tsx
'use client';

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
import { useDataStore } from '@/hooks/use-data-store';
import { LoadingSkeleton } from '../layout/loading-skeleton';

const statusVariant: { [key in ServiceOrder['status']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Borrador: 'secondary',
  Pendiente: 'outline',
  Confirmado: 'default',
  Anulado: 'destructive'
};

export function PrevisionServiciosContent() {
  const { data, isLoaded } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showPastEvents, setShowPastEvents] = useState(false);
  
  const serviceOrders = data.serviceOrders || [];

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
        </Table>
      </div>
    </main>
  );
}
```
- src/components/portal/feedback-dialog.tsx:
```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Input } from '../ui/input';
import type { SolicitudPersonalCPR } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface FeedbackDialogProps {
  initialRating?: number;
  initialComment?: string;
  initialHoraEntrada?: string;
  initialHoraSalida?: string;
  workerName: string;
  turnoInfo?: SolicitudPersonalCPR | null;
  onSave: (feedback: { rating: number; comment: string; horaEntradaReal?: string, horaSalidaReal?: string }) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  saveButtonText?: string;
}

export function FeedbackDialog({
  initialRating,
  initialComment,
  initialHoraEntrada,
  initialHoraSalida,
  workerName,
  turnoInfo,
  onSave,
  trigger,
  open,
  onOpenChange,
  title = "Valoración",
  description = "Deja una valoración y comentarios sobre el desempeño.",
  saveButtonText = "Guardar Valoración"
}: FeedbackDialogProps) {
    const [rating, setRating] = useState(initialRating || 3);
    const [comment, setComment] = useState(initialComment || '');
    const [horaEntrada, setHoraEntrada] = useState(initialHoraEntrada || '');
    const [horaSalida, setHoraSalida] = useState(initialHoraSalida || '');
    
    useEffect(() => {
        if(open) {
            setRating(initialRating || 3);
            setComment(initialComment || '');
            setHoraEntrada(initialHoraEntrada || '');
            setHoraSalida(initialHoraSalida || '');
        }
    }, [open, initialRating, initialComment, initialHoraEntrada, initialHoraSalida]);

    const handleSave = () => {
        onSave({ rating, comment, horaEntradaReal: horaEntrada, horaSalidaReal: horaSalida });
        if (onOpenChange) {
          onOpenChange(false);
        }
    };
    
    const dialogContent = (
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
                 <div className="text-sm p-2 bg-secondary rounded-md">
                    <p><strong>Trabajador:</strong> {workerName}</p>
                    {turnoInfo && (
                        <>
                        <p><strong>Categoría:</strong> {turnoInfo.categoria} ({turnoInfo.partida})</p>
                        <p><strong>Fecha y Hora (Plan):</strong> {format(new Date(turnoInfo.fechaServicio), 'dd/MM/yyyy')} de {turnoInfo.horaInicio} a {turnoInfo.horaFin}</p>
                        </>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label>Hora Entrada Real</Label>
                          <Input type="time" value={horaEntrada} onChange={e => setHoraEntrada(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Hora Salida Real</Label>
                        <Input type="time" value={horaSalida} onChange={e => setHoraSalida(e.target.value)} />
                      </div>
                </div>
                <div className="space-y-2">
                    <Label>Desempeño (1-5)</Label>
                    <div className="flex items-center gap-4 pt-2">
                        <span className="text-sm text-muted-foreground">Bajo</span>
                        <Slider value={[rating]} onValueChange={(value) => setRating(value[0])} max={5} min={1} step={1} />
                        <span className="text-sm text-muted-foreground">Alto</span>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Comentarios Internos MICE</Label>
                    <Textarea 
                        value={comment} 
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                        placeholder="Añade aquí comentarios internos sobre el desempeño..."
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => onOpenChange?.(false)}>Cancelar</Button>
                <Button onClick={handleSave}>{saveButtonText}</Button>
            </DialogFooter>
        </DialogContent>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            {open && dialogContent}
        </Dialog>
    );
}
```