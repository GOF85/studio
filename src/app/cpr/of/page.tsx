

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Factory, Search, RefreshCw, Info, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Layers, Utensils, ClipboardList, FileText, Users, ChefHat, Printer } from 'lucide-react';
import type { OrdenFabricacion, PartidaProduccion, ServiceOrder, ComercialBriefing, ComercialBriefingItem, GastronomyOrder, Receta, Elaboracion, ExcedenteProduccion, StockElaboracion, Personal, PickingState, LoteAsignado, ArticuloERP, IngredienteInterno, Proveedor } from '@/types';
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

export default function OfPage() {
    const isLoaded = useDataStore(s => s.isLoaded);
    const loadAllData = useDataStore(s => s.loadAllData);
    const ordenesFabricacion = useDataStore(s => s.data.ordenesFabricacion);
    const personal = useDataStore(s => s.data.personal);
    const elaboraciones = useDataStore(s => s.data.elaboraciones);
    const serviceOrders = useDataStore(s => s.data.serviceOrders);
    const pickingStatesData = useDataStore(s => s.data.pickingStates);
    const gastronomyOrders = useDataStore(s => s.data.gastronomyOrders);
    const comercialBriefings = useDataStore(s => s.data.comercialBriefings);
    const recetas = useDataStore(s => s.data.recetas);
    const stockElaboraciones = useDataStore(s => s.data.stockElaboraciones);
    const ingredientesInternos = useDataStore(s => s.data.ingredientesInternos);
    const ingredientesERP = useDataStore(s => s.data.ingredientesERP);
    const proveedores = useDataStore(s => s.data.proveedores);

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

    useEffect(() => {
        loadAllData();
        setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) });
    }, [loadAllData]);

    const rangeStart = useMemo(() => startOfDay(dateRange?.from || new Date()), [dateRange]);
    const rangeEnd = useMemo(() => endOfDay(dateRange?.to || dateRange?.from || new Date()), [dateRange]);

    const gastroOrdersInRange = useMemo(() => {
        return gastronomyOrders.filter(order => {
            try {
                const hitoDate = startOfDay(new Date(order.fecha));
                return isWithinInterval(hitoDate, { start: rangeStart, end: rangeEnd });
            } catch (e) { return false; }
        });
    }, [gastronomyOrders, rangeStart, rangeEnd]);

    const necesidadesAgregadas = useMemo(() => {
        const elabMap = new Map(elaboraciones.map(e => [e.id, e]));
        const osMap = new Map(serviceOrders.map(os => [os.id, os]));
        const necesidadesMap: Map<string, NecesidadItem> = new Map();

        gastroOrdersInRange.forEach(gastroOrder => {
            try {
                const fechaKey = format(new Date(gastroOrder.fecha), 'yyyy-MM-dd');
                const os = osMap.get(gastroOrder.osId);
                const briefing = comercialBriefings.find(b => b.osId === gastroOrder.osId);
                if (!os || !briefing) return;

                (gastroOrder.items || []).forEach(item => {
                    if (item.type !== 'item') return;
                    const receta = recetas.find(r => r.id === item.id);
                    if (!receta || !receta.elaboraciones) return;

                    receta.elaboraciones.forEach(elabEnReceta => {
                        const elab = elabMap.get(elabEnReceta.elaboracionId);
                        if (!elab) return;

                        const id = elab.id;
                        let necesidad = necesidadesMap.get(id);

                        if (!necesidad) {
                            necesidad = {
                                id, nombre: elab.nombre, cantidadNecesariaTotal: 0, unidad: elab.unidadProduccion,
                                osIDs: new Set(), partida: elab.partidaProduccion, tipoExpedicion: elab.tipoExpedicion,
                                stockDisponible: 0, cantidadPlanificada: 0, desgloseDiario: [], cantidadNeta: 0,
                                recetas: [], desgloseCompleto: [],
                            };
                            necesidadesMap.set(id, necesidad);
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
            } catch (e) { }
        });
        return necesidadesMap;
    }, [gastroOrdersInRange, elaboraciones, serviceOrders, comercialBriefings, recetas]);

    const stockAsignadoGlobal = useMemo(() => {
        const stock: Record<string, number> = {};
        Object.values(pickingStatesData).forEach(state => {
            (state.itemStates || []).forEach(assigned => {
                const of = ordenesFabricacion.find(o => o.id === assigned.ofId);
                if (of) stock[of.elaboracionId] = (stock[of.elaboracionId] || 0) + assigned.quantity;
            });
        });
        return stock;
    }, [pickingStatesData, ordenesFabricacion]);

    const { ordenes, personalCPR, elaboracionesMap, serviceOrdersMap, necesidades, necesidadesCubiertas, pickingStates } = useMemo(() => {
        if (!isLoaded) return { ordenes: [], personalCPR: [], elaboracionesMap: new Map(), serviceOrdersMap: new Map(), necesidades: [], necesidadesCubiertas: [], pickingStates: {} };

        const allOFs = ordenesFabricacion;
        const allPersonal = personal.filter(p => p.departamento === 'CPR');
        const elabMap = new Map(elaboraciones.map(e => [e.id, e]));
        const osMap = new Map(serviceOrders.map(os => [os.id, os]));

        const necesidadesNetas: NecesidadItem[] = [];
        const necesidadesCubiertasList: NecesidadItem[] = [];

        Array.from(necesidadesAgregadas.values()).forEach(necesidad => {
            const ofsExistentes = allOFs.filter((of: OrdenFabricacion) => {
                if (of.elaboracionId !== necesidad.id) return false;
                try {
                    const ofDate = startOfDay(new Date(of.fechaProduccionPrevista));
                    return isWithinInterval(ofDate, { start: rangeStart, end: rangeEnd });
                } catch (e) { return false; }
            });

            const cantidadPlanificada = ofsExistentes.reduce((sum, of) => {
                const isFinalizado = of.estado === 'Finalizado' || of.estado === 'Validado';
                return sum + (isFinalizado && of.cantidadReal ? of.cantidadReal : of.cantidadTotal);
            }, 0);

            const stockTotalBruto = stockElaboraciones[necesidad.id]?.cantidadTotal || 0;
            const stockAsignado = stockAsignadoGlobal[necesidad.id] || 0;
            const stockDisponible = Math.max(0, stockTotalBruto - stockAsignado);

            const stockAUtilizar = Math.min(necesidad.cantidadNecesariaTotal, stockDisponible);
            const cantidadNeta = necesidad.cantidadNecesariaTotal - stockAUtilizar - cantidadPlanificada;

            const itemCompleto = {
                ...necesidad, stockDisponible: stockAUtilizar, cantidadPlanificada, cantidadNeta,
                desgloseDiario: necesidad.desgloseDiario.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
            };

            if (cantidadNeta > 0.001) necesidadesNetas.push(itemCompleto);
            else necesidadesCubiertasList.push(itemCompleto);
        });

        return { ordenes: allOFs, personalCPR: allPersonal, elaboracionesMap: elabMap, serviceOrdersMap: osMap, necesidades: necesidadesNetas, necesidadesCubiertas: necesidadesCubiertasList, pickingStates: pickingStatesData };
    }, [isLoaded, ordenesFabricacion, personal, elaboraciones, serviceOrders, pickingStatesData, necesidadesAgregadas, stockElaboraciones, stockAsignadoGlobal, rangeStart, rangeEnd]);


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
                    } catch (e) {
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
        loadAllData(); // Changed from loadData to loadAllData
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
        loadAllData(); // Changed from loadData to loadAllData
    };

    const handleAssignResponsable = (ofId: string, responsable: string) => {
        let allOFs: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const index = allOFs.findIndex(of => of.id === ofId);
        if (index > -1 && allOFs[index].estado === 'Pendiente') {
            allOFs[index].responsable = responsable;
            allOFs[index].estado = 'Asignada';
            allOFs[index].fechaAsignacion = new Date().toISOString();
            localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
            loadAllData(); // Changed from loadData to loadAllData
            toast({ title: 'Responsable Asignado', description: `Se ha asignado a ${responsable}.` });
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

    const listaDeLaCompra = useMemo(() => {
        if (!necesidades || necesidades.length === 0) return [];

        const elabMap = new Map(elaboraciones.map(e => [e.id, e]));
        const ingMap = new Map(ingredientesInternos.map(i => [i.id, i]));
        const erpMap = new Map(ingredientesERP.map(a => [a.idreferenciaerp, a]));
        const proveedoresMap = new Map(proveedores.map(p => [p.IdERP, p]));

        const ingredientesNecesarios = new Map<string, { cantidad: number, desgloseUso: { receta: string, elaboracion: string, cantidad: number }[] }>();

        function getIngredientesRecursivo(elabId: string, cantidadRequerida: number, recetaNombre: string) {
            const elaboracion = elabMap.get(elabId);
            if (!elaboracion) return;

            const ratio = cantidadRequerida / elaboracion.produccionTotal;

            (elaboracion.componentes || []).forEach(comp => {
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
            necesidad.desgloseCompleto.forEach(desglose => {
                getIngredientesRecursivo(necesidad.id, desglose.cantidadNecesaria, desglose.recetaNombre);
            })
        });

        const compraPorProveedor = new Map<string, ProveedorConLista>();

        ingredientesNecesarios.forEach((data, ingId) => {
            const ingredienteInterno = ingMap.get(ingId);
            if (!ingredienteInterno) return;

            const articuloERP = erpMap.get(ingredienteInterno.productoERPlinkId);
            if (!articuloERP) return;

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
                necesidadNeta: data.cantidad,
                unidadNeta: articuloERP.unidad,
                unidadConversion: articuloERP.unidadConversion,
                precioCompra: articuloERP.precioCompra,
                descuento: articuloERP.descuento || 0,
                desgloseUso: data.desgloseUso.sort((a, b) => b.cantidad - a.cantidad),
            };

            const existingItemIndex = proveedorData.listaCompra.findIndex(item => item.erpId === articuloERP.idreferenciaerp);
            if (existingItemIndex > -1) {
                proveedorData.listaCompra[existingItemIndex].necesidadNeta += data.cantidad;
                proveedorData.listaCompra[existingItemIndex].desgloseUso.push(...data.desgloseUso);
            } else {
                proveedorData.listaCompra.push(ingCompra);
            }
        });

        return Array.from(compraPorProveedor.values()).sort((a, b) => a.nombreComercial.localeCompare(b.nombreComercial));

    }, [necesidades, elaboraciones, ingredientesInternos, ingredientesERP, proveedores]);

    const flatCompraList = useMemo(() => {
        return listaDeLaCompra.flatMap(proveedor =>
            proveedor.listaCompra.map(item => ({
                ...item,
                proveedorNombre: proveedor.nombreComercial,
            }))
        ).sort((a, b) => a.proveedorNombre.localeCompare(b.proveedorNombre) || a.nombreProducto.localeCompare(b.nombreProducto));
    }, [listaDeLaCompra]);

    const handlePrintReport = () => {
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





