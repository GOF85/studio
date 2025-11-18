

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
import { useOsContext } from '../../os-context';

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
        setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
    }, []);

    const elaboracionesMap = useMemo(() => {
        if (!isLoaded) return new Map();
        return new Map(data.elaboraciones.map(e => [e.id, e]));
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

        const osMap = new Map(serviceOrders.map(os => [os.id, os]));
        const entregasMap = new Map(entregas.map(e => [e.id, e]));
        const recetasMap = new Map(recetas.map(r => [r.id, r]));
        
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
                const items = isOsHito(hito) ? getGastroItems(hito.id) : hito.items;

                items.forEach(item => {
                    const receta = isOsHito(hito) 
                        ? recetasMap.get(item.id) 
                        : recetasMap.get(productosVenta.find(p => p.id === item.id)?.recetaId || '');

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

        const allHitosCatering = comercialBriefings.flatMap(b => b.items.map(i => ({ ...i, serviceOrder: osMap.get(b.osId)!, osId: b.osId }))).filter(h => h.conGastronomia);
        const allHitosEntregas = pedidosEntrega.flatMap(p => p.hitos.map(h => ({...h, osId: p.osId})));

        calculateNeeds(allHitosCatering, (id) => osMap.get(id), (hitoId) => gastronomyOrders.find(go => go.id === hitoId)?.items || []);
        calculateNeeds(allHitosEntregas, (id) => entregasMap.get(id), () => []);

        const stockAsignadoGlobal: Record<string, number> = {};
        Object.values(pickingStates).forEach(state => {
            (state.itemStates || []).forEach(assigned => {
                const of = ordenesFabricacion.find(o => o.id === assigned.ofId);
                if (of) stockAsignadoGlobal[of.elaboracionId] = (stockAsignadoGlobal[of.elaboracionId] || 0) + assigned.quantity;
            });
        });

        const necesidadesNetas: NecesidadItem[] = [];
        const necesidadesCubiertas: NecesidadItem[] = [];

        necesidadesAgregadas.forEach(necesidad => {
            const ofsExistentes = ordenesFabricacion.filter(of => {
                if (of.elaboracionId !== necesidad.id) return false;
                const ofDate = startOfDay(new Date(of.fechaProduccionPrevista));
                return isWithinInterval(ofDate, { start: rangeStart, end: rangeEnd });
            });
            
            const cantidadPlanificada = ofsExistentes.reduce((sum, of) => sum + (of.estado === 'Finalizado' || of.estado === 'Validado' ? (of.cantidadReal || of.cantidadTotal) : of.cantidadTotal), 0);
            const stockDisponible = Math.max(0, (stockElaboraciones[necesidad.id]?.cantidadTotal || 0) - (stockAsignadoGlobal[necesidad.id] || 0));
            const stockAUtilizar = Math.min(necesidad.cantidadNecesariaTotal, stockDisponible);
            const cantidadNeta = necesidad.cantidadNecesariaTotal - stockAUtilizar - cantidadPlanificada;

            const itemCompleto = { ...necesidad, stockDisponible: stockAUtilizar, cantidadPlanificada, cantidadNeta };
            if (cantidadNeta > 0.001) necesidadesNetas.push(itemCompleto);
            else necesidadesCubiertas.push(itemCompleto);
        });

        return { 
            ordenes: ordenesFabricacion, 
            personalCPR: data.personal.filter(p => p.departamento === 'CPR'), 
            necesidades: necesidadesNetas, 
            necesidadesCubiertas, 
            pickingStates,
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

            necesidad.osIDs.forEach(id => osIds.add(id));
            necesidad.desgloseCompleto.forEach(d => {
                serviciosSet.add(d.hitoId);
                const os = data.serviceOrders.find(o => o.id === d.osId);
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

    }, [necesidades, dateRange, data, elaboracionesMap]);
    
    const { ingredientesMap, articulosErpMap, proveedoresMap } = useMemo(() => {
        if (!isLoaded || !data) return { ingredientesMap: new Map(), articulosErpMap: new Map(), proveedoresMap: new Map() };
        const { ingredientesInternos, articulosERP, proveedores } = data;
        return {
            ingredientesMap: new Map(ingredientesInternos.map(i => [i.id, i])),
            articulosErpMap: new Map(articulosERP.map(a => [a.idreferenciaerp, a])),
            proveedoresMap: new Map(proveedores.map(p => [p.IdERP, p]))
        };
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
    return <LoadingSkeleton title="Cargando Planificación y OFs..." />;
  }
  
  const numSelected = selectedNecesidades.size;
}
