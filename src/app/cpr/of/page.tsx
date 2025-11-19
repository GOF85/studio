
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

        calculateNeeds(allHitosCatering, (id) => osMap.get(id), (hitoId) => (gastronomyOrders || []).find(go => go.id === hitoId)?.items || []);
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
            pickingStates: pickingStates || {},
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
        return data.ordenesFabricacion
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

    if (!isLoaded) {
        return <LoadingSkeleton title="Cargando Planificación..." />;
    }
    
    const numSelected = selectedNecesidades.size;
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
        router.replace('/cpr/planificacion');
    }, [router]);
    return null;
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
- src/app/os/personal-externo-db/nuevo/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the unified form page.
export default function NuevoPersonalExternoRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/bd/personal-externo-db/nuevo`);
    }, [router]);
    return null;
}

```
- src/app/os/personal-externo-db/[id]/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the unified form page.
export default function EditarPersonalExternoRedirect({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/bd/personal-externo-db/${params.id}`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/transporte/pedido/page.tsx:
```tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Save, Truck, Calendar as CalendarIcon, X } from 'lucide-react';
import type { ServiceOrder, TipoTransporte, TransporteOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';
import { useOsContext } from '@/app/os/os-context';

const statusOptions: TransporteOrder['status'][] = ['Pendiente', 'Confirmado', 'En Ruta', 'Entregado'];

const transporteOrderSchema = z.object({
  id: z.string(),
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  proveedorId: z.string().min(1, 'Debes seleccionar un proveedor'),
  lugarRecogida: z.string().min(1, 'El lugar de recogida es obligatorio'),
  horaRecogida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  lugarEntrega: z.string().min(1, 'El lugar de entrega es obligatorio'),
  horaEntrega: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  observaciones: z.string().optional(),
  status: z.enum(statusOptions).default('Pendiente'),
});

type TransporteOrderFormValues = z.infer<typeof transporteOrderSchema>;

export default function PedidoTransportePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const orderId = searchParams.get('orderId');
  const isEditing = !!orderId;

  const [isMounted, setIsMounted] = useState(false);
  const [proveedores, setProveedores] = useState<TipoTransporte[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const { serviceOrder, isLoading } = useOsContext(osId);
  const { toast } = useToast();

  const form = useForm<TransporteOrderFormValues>({
    resolver: zodResolver(transporteOrderSchema),
    defaultValues: {
      lugarRecogida: 'Avda. de la Industria, 38, 28108 Alcobendas, Madrid',
      horaRecogida: '09:00',
      horaEntrega: '10:00',
      status: 'Pendiente',
    }
  });

  useEffect(() => {
    const allProveedores = (JSON.parse(localStorage.getItem('tiposTransporte') || '[]') as TipoTransporte[])
        .filter(p => p.tipo === 'Catering');
    setProveedores(allProveedores);

    if (isEditing) {
      const allOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
      const order = allOrders.find(o => o.id === orderId);
      if (order) {
        form.reset({
          ...order,
          observaciones: order.observaciones || '',
          fecha: new Date(order.fecha),
        });
      }
    } else {
      form.reset({
        id: Date.now().toString(),
        fecha: serviceOrder?.startDate ? new Date(serviceOrder.startDate) : new Date(),
        proveedorId: '',
        lugarRecogida: 'Avda. de la Industria, 38, 28108 Alcobendas, Madrid',
        horaRecogida: '09:00',
        lugarEntrega: serviceOrder?.spaceAddress || serviceOrder?.space || '',
        horaEntrega: serviceOrder?.deliveryTime || '10:00',
        observaciones: '',
        status: 'Pendiente',
      })
    }
    
    setIsMounted(true);
  }, [osId, orderId, form, isEditing, serviceOrder]);

  const selectedProviderId = form.watch('proveedorId');
  const selectedProvider = useMemo(() => {
    return proveedores.find(p => p.id === selectedProviderId);
  }, [selectedProviderId, proveedores]);

  const onSubmit = (data: TransporteOrderFormValues) => {
    if (!osId || !selectedProvider) {
      toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos para crear el pedido.' });
      return;
    }

    const allOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    
    const finalOrder: Omit<TransporteOrder, 'id' | 'osId'> = {
      fecha: format(data.fecha, 'yyyy-MM-dd'),
      proveedorId: selectedProvider.id,
      proveedorNombre: selectedProvider.nombreProveedor,
      tipoTransporte: selectedProvider.tipoTransporte,
      precio: selectedProvider.precio,
      lugarRecogida: data.lugarRecogida,
      horaRecogida: data.horaRecogida,
      lugarEntrega: data.lugarEntrega,
      horaEntrega: data.horaEntrega,
      observaciones: data.observaciones || '',
      status: data.status,
    };

    if (isEditing) {
      const index = allOrders.findIndex(o => o.id === orderId);
      if (index !== -1) {
        allOrders[index] = { ...allOrders[index], ...finalOrder };
        toast({ title: "Pedido actualizado" });
      }
    } else {
      allOrders.push({ id: data.id, osId, ...finalOrder });
      toast({ title: "Pedido de transporte creado" });
    }

    localStorage.setItem('transporteOrders', JSON.stringify(allOrders));
    router.push(`/os/${osId}/transporte`);
  };

  if (!isMounted || isLoading) {
    return <LoadingSkeleton title="Cargando Pedido de Transporte..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/os/${osId}/transporte`)} className="mb-2">
                            <ArrowLeft className="mr-2" />
                            Volver al Módulo
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Truck />{isEditing ? 'Editar' : 'Nuevo'} Pedido de Transporte</h1>
                        <p className="text-muted-foreground">Para la OS: {serviceOrder?.serviceNumber}</p>
                    </div>
                     <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => router.push(`/os/${osId}/transporte`)}>
                            <X className="mr-2 h-4 w-4" />
                            Cancelar
                        </Button>
                        <Button type="submit"><Save className="mr-2" /> Guardar Pedido</Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Detalles del Pedido</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                           <FormField control={form.control} name="fecha" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha del Servicio</FormLabel>
                                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setIsCalendarOpen(false);}} initialFocus locale={es} />
                                    </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="proveedorId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proveedor y Tipo de Transporte</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreProveedor} - {p.tipoTransporte}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormItem>
                                <FormLabel>Precio</FormLabel>
                                <FormControl>
                                    <Input value={selectedProvider ? selectedProvider.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : 'N/A'} readOnly />
                                </FormControl>
                            </FormItem>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="lugarRecogida" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Lugar de Recogida</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="horaRecogida" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hora de Recogida</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="lugarEntrega" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Lugar de Entrega</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="horaEntrega" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hora de Entrega</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                         <FormField control={form.control} name="observaciones" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Observaciones para la Carga</FormLabel>
                            <FormControl><Textarea {...field} rows={4} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        {isEditing && 
                             <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        }
                    </CardContent>
                </Card>
            </form>
        </Form>
      </main>
    </>
  );
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
  const { toast } = useToast();
  const { serviceOrder, spaceAddress, isLoading } = useOsData(osId);

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
  
  if (!isMounted || isLoading) {
    return <LoadingSkeleton title="Cargando Módulo de Transporte..." />;
  }

  return (
    <>
      <div className="flex items-start justify-end mb-4">
        <Button asChild>
          <Link href={`/os/${osId}/transporte/pedido`}>
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
                                  <DropdownMenuItem onClick={() => router.push(`/os/${osId}/transporte/pedido?orderId=${order.id}`)}>
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
- src/app/os/gastronomia/[briefingItemId]/layout.tsx:
```tsx

'use client';

import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function PedidoGastronomiaLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando pedido de gastronomía..." />}>
            {children}
        </Suspense>
    )
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
- src/app/os/atipicos/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AtipicosIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/atipicos`);
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
- src/components/debug/performance-monitor.tsx:
```tsx

'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

type PerfLog = {
    context: string;
    step: string;
    time: number;
};

export function PerformanceMonitor() {
    const [log, setLog] = useState<PerfLog[] | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            if (typeof window !== 'undefined' && (window as any).__PERF_LOG) {
                setLog((window as any).__PERF_LOG);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);
    
    if (!log) return null;

    const totalTime = log.reduce((sum, item) => sum + item.time, 0);
    
    if (!isOpen) {
        return (
            <div className="fixed bottom-2 right-2 z-50">
                <Button onClick={() => setIsOpen(true)} size="sm" variant="destructive" className="shadow-lg">
                    Carga: {totalTime.toFixed(2)}ms
                </Button>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <div className="w-full max-w-4xl bg-background rounded-lg shadow-2xl border max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold">Monitor de Rendimiento de Carga</h2>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cerrar</Button>
                </div>
                 <div className="p-4 text-center border-b">
                    <p className="text-sm text-muted-foreground">Tiempo Total de Carga (localStorage)</p>
                    <p className="text-3xl font-bold">{totalTime.toFixed(2)}ms</p>
                </div>
                <div className="overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Contexto</TableHead>
                                <TableHead>Paso</TableHead>
                                <TableHead className="text-right">Tiempo (ms)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {log.map(item => (
                                <TableRow key={`${item.context}-${item.step}`}>
                                    <TableCell className="font-mono text-xs">{item.context}</TableCell>
                                    <TableCell className="font-mono text-xs">{item.step}</TableCell>
                                    <TableCell className="text-right font-mono text-xs font-bold">{item.time.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}

```
```

I have fixed the syntax error in `src/app/cpr/of/page.tsx` by removing the extraneous ``` characters. Please review.
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
- src/app/os/gastronomia/[briefingItemId]/layout.tsx:
```tsx

'use client';

import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function PedidoGastronomiaLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando pedido de gastronomía..." />}>
            {children}
        </Suspense>
    )
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
- src/app/os/atipicos/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AtipicosIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/atipicos`);
    }, [router, params.id]);
    return null;
}

```
- src/components/layout/sidebar.tsx:
```tsx

'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { mainNav, cprNav, rrhhNav, bookNavLinks, bdNavLinks } from "@/lib/nav-links";
import { ScrollArea } from "../ui/scroll-area";
import { useImpersonatedUser } from "@/hooks/use-impersonated-user";
import { useMemo } from "react";

export function Sidebar({ onLinkClick }: { onLinkClick?: () => void }) {
    const pathname = usePathname();
    const { impersonatedUser } = useImpersonatedUser();
    
    const navSections = useMemo(() => {
        const isAdmin = impersonatedUser?.roles.includes('Admin');
        
        const sections = [
            { title: "General", links: mainNav },
            { title: "CPR", links: cprNav },
            { title: "RRHH", links: rrhhNav.filter(item => !item.adminOnly || isAdmin) },
            { title: "Bases de Datos", links: bdNavLinks },
            { title: "Book Gastronómico", links: bookNavLinks },
        ];

        return sections.filter(section => section.links.length > 0);

    }, [impersonatedUser]);

    return (
        <ScrollArea className="h-full py-6 pr-6">
            <div className="space-y-4">
                {navSections.map(section => (
                    <div key={section.title}>
                        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                            {section.title}
                        </h2>
                        <div className="space-y-1">
                             {section.links.map((item, index) => {
                                const isActive = item.exact 
                                    ? pathname === item.href || (item.href === '/pes' && pathname === '/')
                                    : pathname.startsWith(item.href);
                                
                                return (
                                <Link
                                    key={`${item.href}-${index}`}
                                    href={item.href}
                                    onClick={onLinkClick}
                                >
                                    <span
                                        className={cn(
                                            "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                            isActive ? "bg-accent" : "transparent"
                                        )}
                                    >
                                        <item.icon className="mr-2 h-4 w-4" />
                                        <span>{item.title}</span>
                                    </span>
                                </Link>
                            )})}
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}

```
- src/app/layout.tsx:
```tsx

'use client';

import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { NProgressProvider } from '@/components/providers/nprogress-provider';
import { ImpersonatedUserProvider } from '@/hooks/use-impersonated-user';
import { Header } from '@/components/layout/header';
import { Suspense, useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { useDataStore } from '@/hooks/use-data-store';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { PerformanceMonitor } from '@/components/debug/performance-monitor';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isLoaded, loadAllData } = useDataStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // This effect runs once on initial client-side mount and triggers the global data load.
    loadAllData();
  }, [loadAllData]);


  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <title>MICE Catering</title>
        <meta name="description" content="Soluciones de alquiler para tus eventos" />
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
                <Header onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
                 {!isLoaded ? (
                  <LoadingSkeleton title="Cargando datos de la aplicación..." />
                ) : (
                <div className="flex-1">
                  <div className="container mx-auto">
                    <div className="grid lg:grid-cols-[250px_1fr] gap-12">
                      <aside className="hidden w-[250px] flex-col lg:flex sticky top-14 h-[calc(100vh-3.5rem)]">
                        <Sidebar />
                      </aside>
                      <main className="py-6">
                        <Suspense>
                          {children}
                        </Suspense>
                      </main>
                    </div>
                  </div>
                </div>
                )}
              </div>
              {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
            </NProgressProvider>
          </ImpersonatedUserProvider>
        <Toaster />
      </body>
    </html>
  );
}

```
- src/components/layout/header.tsx:
```tsx

'use client';

import Link from 'next/link';
import { UtensilsCrossed, Package, Menu } from 'lucide-react';
import { Button } from '../ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserSwitcher } from '@/components/portal/user-switcher';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Sidebar } from './sidebar';

interface HeaderProps {
    onSidebarToggle?: () => void;
}

export function Header({ onSidebarToggle }: HeaderProps) {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const isEntregasModule = pathname.startsWith('/entregas');
  const isPortalModule = pathname.startsWith('/portal');

   if (isPortalModule) {
      return (
        <header className="sticky top-0 z-40 w-full border-b bg-gray-900 text-white">
          <div className="container flex h-12 items-center">
            <Link href="/portal" className="flex items-center gap-3">
              <Package className="h-6 w-6 text-orange-500" />
              <h1 className="text-xl font-headline font-bold tracking-tight">
                Portal de Colaboradores
              </h1>
            </Link>
             <nav className="flex flex-1 items-center justify-end space-x-4">
                <UserSwitcher />
             </nav>
          </div>
        </header>
      )
  }

  return (
    <header className={cn(
        "sticky top-0 z-40 w-full border-b",
        isEntregasModule ? "theme-orange bg-background" : "bg-background"
      )}>
      <div className="container flex h-14 items-center">
        <div className="lg:hidden mr-4">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <Sidebar onLinkClick={() => setIsSheetOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
        <Link href="/" className="flex items-center gap-3">
            {isEntregasModule ? <Package className="h-6 w-6 text-primary" /> : <UtensilsCrossed className="h-6 w-6 text-primary" />}
            <h1 className="text-xl font-headline font-bold text-primary tracking-tight">
                {isEntregasModule ? "Entregas MICE" : "MICE Catering"}
            </h1>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2">
            <UserSwitcher />
        </div>
      </div>
    </header>
  );
}

```
- src/app/os/layout.tsx:
```tsx

'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { ServiceOrder, Entrega } from '@/types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectiveDisplay } from '@/components/os/objective-display';
import { OsContextProvider, useOsContext } from './os-context';
import { Briefcase, Utensils, Wine, Leaf, Warehouse, Archive, Truck, Snowflake, Euro, FilePlus, Users, UserPlus, Flower2, ClipboardCheck, PanelLeft, Building, FileText, Star, Menu, ClipboardList, Calendar, LayoutDashboard, Phone, ChevronRight, FilePenLine, Package } from 'lucide-react';
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
import { useDataStore } from '@/hooks/use-data-store';


type NavLink = {
    path: string;
    title: string;
    icon: LucideIcon;
    moduleName?: Parameters<typeof ObjectiveDisplay>[0]['moduleName'];
    vertical: 'Catering' | 'Entregas' | 'Ambos';
}

const navLinks: NavLink[] = [
    { path: 'info', title: 'Información OS', icon: FileText, vertical: 'Ambos' },
    { path: 'comercial', title: 'Comercial', icon: Briefcase, vertical: 'Catering' },
    { path: 'gastronomia', title: 'Gastronomía', icon: Utensils, moduleName: 'gastronomia', vertical: 'Catering' },
    { path: 'bodega', title: 'Bebida', icon: Wine, moduleName: 'bodega', vertical: 'Catering' },
    { path: 'hielo', title: 'Hielo', icon: Snowflake, moduleName: 'hielo', vertical: 'Catering' },
    { path: 'bio', title: 'Bio (Consumibles)', icon: Leaf, moduleName: 'consumibles', vertical: 'Catering' },
    { path: 'almacen', title: 'Almacén', icon: Warehouse, moduleName: 'almacen', vertical: 'Catering' },
    { path: 'alquiler', title: 'Alquiler', icon: Archive, moduleName: 'alquiler', vertical: 'Catering' },
    { path: 'decoracion', title: 'Decoración', icon: Flower2, moduleName: 'decoracion', vertical: 'Catering' },
    { path: 'atipicos', title: 'Atípicos', icon: FilePlus, moduleName: 'atipicos', vertical: 'Catering' },
    { path: 'personal-mice', title: 'Personal MICE', icon: Users, moduleName: 'personalMice', vertical: 'Catering' },
    { path: 'personal-externo', title: 'Personal Externo', icon: UserPlus, moduleName: 'personalExterno', vertical: 'Catering' },
    { path: 'transporte', title: 'Transporte', icon: Truck, moduleName: 'transporte', vertical: 'Catering' },
    { path: 'prueba-menu', title: 'Prueba de Menu', icon: ClipboardCheck, moduleName: 'costePruebaMenu', vertical: 'Catering' },
    { path: 'cta-explotacion', title: 'Cta. Explotación', icon: Euro, vertical: 'Catering' },
    { path: 'pedido-entrega', title: 'Confección Entrega', icon: Package, vertical: 'Entregas' },
];

const getInitials = (name: string) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function OsHeaderContent({ osId }: { osId: string;}) {
    const pathname = usePathname();
    const { serviceOrder, isLoading } = useOsContext();
    const [updateKey, setUpdateKey] = useState(Date.now());

    useEffect(() => {
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
            return { currentModule: { title: 'Información OS', icon: FileText, path: 'info', vertical: 'Ambos' }, isSubPage: false};
        }

        return { currentModule: { title: 'Panel de Control', icon: LayoutDashboard, path: '', vertical: 'Ambos' }, isSubPage: false };
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

export default function OSDetailsLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const osId = params.id as string;
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    
    const { serviceOrder, isLoading } = useOsContext(osId);

    const dashboardHref = serviceOrder?.vertical === 'Entregas' ? `/entregas/pedido/${osId}` : `/os/${osId}`;

    const filteredNavLinks = useMemo(() => {
        if (!serviceOrder) return [];
        return navLinks.filter(link => link.vertical === 'Ambos' || link.vertical === serviceOrder.vertical);
    }, [serviceOrder]);


    return (
      <OsContextProvider osId={osId}>
        <div className="container mx-auto">
            <div className="sticky top-[56px] z-30 bg-background/95 backdrop-blur-sm py-2 border-b">
                <div className="flex items-center gap-4">
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline">
                                <Menu className="h-5 w-5 mr-2" />
                                Módulos
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[250px] sm:w-[280px] p-0">
                            <SheetHeader className="p-4 border-b">
                                <SheetTitle>Módulos de la OS</SheetTitle>
                            </SheetHeader>
                            <ScrollArea className="h-full p-4">
                                <nav className="grid items-start gap-1 pb-4">
                                    <Link href={dashboardHref} onClick={() => setIsSheetOpen(false)}>
                                        <span className={cn("group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname === `/os/${osId}` ? "bg-accent" : "transparent")}>
                                            <LayoutDashboard className="mr-2 h-4 w-4" />
                                            <span>Panel de Control</span>
                                        </span>
                                    </Link>
                                    {filteredNavLinks.map((item, index) => {
                                        const href = `/os/${osId}/${item.path}`;
                                        return (
                                            <Link key={index} href={href} onClick={() => setIsSheetOpen(false)}>
                                                <span className={cn("group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname.startsWith(href) ? "bg-accent" : "transparent")}>
                                                    <item.icon className="mr-2 h-4 w-4" />
                                                    <span>{item.title}</span>
                                                </span>
                                            </Link>
                                        )
                                    })}
                                </nav>
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                    <div className="flex-grow">
                        <OsHeaderContent osId={osId} />
                    </div>
                </div>
            </div>
            <main className="py-8">
                {children}
            </main>
        </div>
      </OsContextProvider>
    );
}

```