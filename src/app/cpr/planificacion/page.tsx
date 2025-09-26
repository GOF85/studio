

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { addDays, startOfToday, eachDayOfInterval, isSameDay, isBefore } from 'date-fns';
import { ClipboardList, Calendar as CalendarIcon, Factory, Info, AlertTriangle, PackageCheck, ChevronRight, ChevronDown, Utensils, Component, Users, FileDigit, Soup, BookOpen } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber, formatUnit } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


import type { ServiceOrder, GastronomyOrder, GastronomyOrderItem, Receta, Elaboracion, UnidadMedida, OrdenFabricacion, PartidaProduccion, ElaboracionEnReceta, ComercialBriefing, ComercialBriefingItem, ExcedenteProduccion, PedidoEntrega, PedidoEntregaItem } from '@/types';

// --- DATA STRUCTURES ---

type EventoAfectado = {
    osId: string;
    serviceNumber: string;
    serviceType: string;
};

type RecetaNecesidad = {
    recetaId: string;
    recetaNombre: string;
    cantidad: number;
}

type Necesidad = {
    id: string; // elaboracionId
    nombre: string;
    cantidad: number;
    unidad: UnidadMedida;
    partidaProduccion?: PartidaProduccion;
    eventos: EventoAfectado[];
    recetas: RecetaNecesidad[];
    type: 'necesidad' | 'excedente';
    loteOrigen?: string;
};

type DesviacionElaboracion = {
    id: string; // of.id
    of: OrdenFabricacion;
    necesidadActual: number;
    diferencia: number;
}

type DesviacionReceta = {
    recetaId: string;
    recetaNombre: string;
    cantidadOriginal: number;
    cantidadActual: number;
    diferenciaUnidades: number;
    elaboraciones: DesviacionElaboracion[];
};

type DesviacionHito = {
    hitoId: string;
    hitoDescripcion: string;
    recetas: DesviacionReceta[];
};

type DesviacionOS = {
    osId: string;
    serviceNumber: string;
    fecha: string;
    espacio: string;
    hitos: DesviacionHito[];
};


// For the detailed recipe view
type RecetaAgregada = {
    id: string;
    nombre: string;
    cantidadTotal: number;
}
type DetalleHito = {
    id: string;
    descripcion: string;
    recetas: {
        id: string;
        nombre: string;
        cantidad: number;
        elaboraciones: {
            id: string;
            nombre: string;
            cantidadPorReceta: number;
            unidad: UnidadMedida;
        }[];
    }[];
}
type DesgloseEventoRecetas = {
    osId: string;
    serviceNumber: string;
    client: string;
    startDate: string;
    hitos: DetalleHito[];
};

// For Production Matrix
type MatrizRow = {
    id: string; // recetaId o elaboracionId
    nombre: string;
    partida?: PartidaProduccion; // solo para elaboraciones
    unidad: UnidadMedida;
    total: number;
    type: 'receta' | 'elaboracion';
    receta?: Receta; // para el tooltip de recetas
    necesidad?: Necesidad; // para el tooltip de elaboraciones
    [day: string]: any; // day-YYYY-MM-DD: number
}
type MatrizHeader = {
    day: Date;
    totalRecetaUnits: number;
    totalElaboracionUnits: number;
    totalPax: number;
    totalContratos: number;
    totalServicios: number;
}

const partidaColorClasses: Record<PartidaProduccion, string> = {
    FRIO: 'bg-green-100/50 hover:bg-green-100/80',
    CALIENTE: 'bg-red-100/50 hover:bg-red-100/80',
    PASTELERIA: 'bg-blue-100/50 hover:bg-blue-100/80',
    EXPEDICION: 'bg-yellow-100/50 hover:bg-yellow-100/80'
};


export default function PlanificacionPage() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    
    // Unified state for both needs and surpluses
    const [planificacionItems, setPlanificacionItems] = useState<Necesidad[]>([]);
    const [desviaciones, setDesviaciones] = useState<DesviacionOS[]>([]);
    const [excedentes, setExcedentes] = useState<Necesidad[]>([]);
    
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [partidaFilter, setPartidaFilter] = useState('all');

    // State for detailed view
    const [recetasAgregadas, setRecetasAgregadas] = useState<RecetaAgregada[]>([]);
    const [desgloseEventosRecetas, setDesgloseEventosRecetas] = useState<DesgloseEventoRecetas[]>([]);
    
    // State for Matrix view
    const [matrizData, setMatrizData] = useState<MatrizRow[]>([]);
    const [matrizHeaders, setMatrizHeaders] = useState<MatrizHeader[]>([]);
    const [matrizTotals, setMatrizTotals] = useState({ totalPax: 0, totalContratos: 0, totalServicios: 0 });


    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const partidas: PartidaProduccion[] = ['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION'];

    const calcularNecesidades = useCallback(() => {
        setIsLoading(true);
        // Reset all states
        setPlanificacionItems([]);
        setDesviaciones([]);
        setRecetasAgregadas([]);
        setDesgloseEventosRecetas([]);
        setMatrizData([]);
        setMatrizHeaders([]);
        setSelectedRows(new Set());
        setMatrizTotals({ totalPax: 0, totalContratos: 0, totalServicios: 0 });
        setExcedentes([]);

        if (!dateRange?.from || !dateRange?.to) {
            setIsLoading(false);
            return;
        }
        
        const from = dateRange.from;
        const to = dateRange.to;

        // --- DATA LOADING ---
        const allServiceOrders: ServiceOrder[] = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const allGastroOrders: GastronomyOrder[] = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
        const allBriefings: ComercialBriefing[] = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        const allRecetas: Receta[] = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
        const allElaboraciones: Elaboracion[] = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        const allOrdenesFabricacion: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const allExcedentesData: {[key: string]: ExcedenteProduccion} = JSON.parse(localStorage.getItem('excedentesProduccion') || '{}');
        const allPedidosEntrega: PedidoEntrega[] = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        
        const recetasMap = new Map(allRecetas.map(r => [r.id, r]));
        const elaboracionesMap = new Map(allElaboraciones.map(e => [e.id, e]));
        const serviceOrderMap = new Map(allServiceOrders.map(os => [os.id, os]));

        // --- FILTERING DATA FOR THE DATE RANGE ---
        const osEnRango = allServiceOrders.filter(os => {
            try {
                const osDate = new Date(os.startDate);
                return os.status === 'Confirmado' && osDate >= from && osDate <= to;
            } catch(e) { return false; }
        });
        const osIdsEnRango = new Set(osEnRango.map(os => os.id));
        
        if (osIdsEnRango.size === 0) {
            setIsLoading(false);
            return;
        }
        
        const ofsEnRango = allOrdenesFabricacion.filter(of => of.osIDs.some(osId => osIdsEnRango.has(osId)));
        
        const gastroOrdersEnRango = allGastroOrders.filter(go => osIdsEnRango.has(go.osId));
        const briefingsEnRango = allBriefings.filter(b => osIdsEnRango.has(b.osId));
        const pedidosEntregaEnRango = allPedidosEntrega.filter(pe => osIdsEnRango.has(pe.osId));


        // --- CALCULATIONS ---
        
        const necesidadesPorReceta = new Map<string, { necesidadBruta: number; receta: Receta; necesidadesPorDia: Map<string, number> }>();
        const necesidadesPorElaboracion = new Map<string, { necesidadBruta: number; produccionAcumulada: number; elaboracion: Elaboracion; eventos: EventoAfectado[]; recetas: RecetaNecesidad[]; necesidadesPorDia: Map<string, number>}>();
        
        const desgloseEventosMap: Map<string, DesgloseEventoRecetas> = new Map();
        const agregadoRecetasMap: Map<string, RecetaAgregada> = new Map();

        // 1. Calculate Gross Needs from both Catering and Entregas
        osEnRango.forEach(serviceOrder => {
            const osId = serviceOrder.id;
            const diaKey = format(new Date(serviceOrder.startDate), 'yyyy-MM-dd');

            // --- Catering Flow ---
            if (serviceOrder.vertical !== 'Entregas') {
                const briefing = briefingsEnRango.find(b => b.osId === osId);
                if (briefing) {
                     if (!desgloseEventosMap.has(serviceOrder.id)) {
                        desgloseEventosMap.set(serviceOrder.id, {
                            osId: serviceOrder.id, serviceNumber: serviceOrder.serviceNumber,
                            client: serviceOrder.client, startDate: serviceOrder.startDate, hitos: [],
                        });
                    }
                    const desgloseOS = desgloseEventosMap.get(serviceOrder.id)!;
                    
                    const hitosGastro = briefing.items.filter(i => i.conGastronomia);

                    hitosGastro.forEach(hitoBriefing => {
                        const gastroOrder = gastroOrdersEnRango.find(go => go.id === hitoBriefing.id);
                        if (!gastroOrder) return;
                        
                        const hito: DetalleHito = { id: gastroOrder.id, descripcion: gastroOrder.descripcion, recetas: [] };
                        desgloseOS.hitos.push(hito);
                        
                        (gastroOrder.items || []).forEach(item => {
                            if (item.type === 'item') {
                                const receta = recetasMap.get(item.id);
                                if (receta) {
                                    // Process receta needs
                                    processReceta(receta, item.quantity || 0, serviceOrder, gastroOrder.descripcion, hito, diaKey);
                                }
                            }
                        });
                    });
                }
            } 
            // --- Entregas Flow ---
            else {
                const pedidoEntrega = pedidosEntregaEnRango.find(pe => pe.osId === osId);
                if (pedidoEntrega) {
                    pedidoEntrega.items.forEach(item => {
                        if (item.type === 'receta') {
                            const receta = recetasMap.get(item.id);
                             if (receta) {
                                processReceta(receta, item.quantity, serviceOrder, "Entrega", null, diaKey);
                            }
                        }
                        // TODO: Handle 'pack' type to break down into components for almacén
                    });
                }
            }
        });
        
        function processReceta(receta: Receta, cantidad: number, os: ServiceOrder, hitoDescripcion: string, hitoDetalle: DetalleHito | null, diaKey: string) {
            const cantidadReceta = Number(cantidad || 0);
            let recetaAgregada = agregadoRecetasMap.get(receta.id);
            if (!recetaAgregada) {
                recetaAgregada = { id: receta.id, nombre: receta.nombre, cantidadTotal: 0 };
                agregadoRecetasMap.set(receta.id, recetaAgregada);
            }
            recetaAgregada.cantidadTotal += cantidadReceta;

            if (hitoDetalle) {
                const detalleRecetaEnHito = {
                    id: receta.id, nombre: receta.nombre, cantidad: cantidadReceta, elaboraciones: receta.elaboraciones.map(e => ({
                        id: e.elaboracionId,
                        nombre: e.nombre,
                        cantidadPorReceta: e.cantidad,
                        unidad: elaboracionesMap.get(e.elaboracionId)?.unidadProduccion || 'UNIDAD',
                    }))
                };
                hitoDetalle.recetas.push(detalleRecetaEnHito);
            }

            let registroReceta = necesidadesPorReceta.get(receta.id);
            if (!registroReceta) {
                registroReceta = { necesidadBruta: 0, receta, necesidadesPorDia: new Map() };
                necesidadesPorReceta.set(receta.id, registroReceta);
            }
            registroReceta.necesidadBruta += cantidadReceta;
            const necesidadRecetaDia = registroReceta.necesidadesPorDia.get(diaKey) || 0;
            registroReceta.necesidadesPorDia.set(diaKey, necesidadRecetaDia + cantidadReceta);

            receta.elaboraciones.forEach(elabEnReceta => {
                const elaboracion = elaboracionesMap.get(elabEnReceta.elaboracionId);
                if (elaboracion) {
                    const cantidadNecesaria = cantidadReceta * Number(elabEnReceta.cantidad);
                    if (isNaN(cantidadNecesaria) || cantidadNecesaria <= 0) return;

                    let registro = necesidadesPorElaboracion.get(elaboracion.id);
                    if (!registro) {
                        registro = {
                            necesidadBruta: 0, produccionAcumulada: 0, elaboracion,
                            eventos: [], recetas: [], necesidadesPorDia: new Map(),
                        };
                        necesidadesPorElaboracion.set(elaboracion.id, registro);
                    }
                    registro.necesidadBruta += cantidadNecesaria;
                    
                    const necesidadDiaActual = registro.necesidadesPorDia.get(diaKey) || 0;
                    registro.necesidadesPorDia.set(diaKey, necesidadDiaActual + cantidadNecesaria);
                    
                    if (!registro.eventos.find(e => e.osId === os.id && e.serviceType === hitoDescripcion)) {
                        registro.eventos.push({ osId: os.id, serviceNumber: os.serviceNumber, serviceType: hitoDescripcion });
                    }
                    const recetaExistente = registro.recetas.find(r => r.recetaId === receta.id);
                    if (recetaExistente) recetaExistente.cantidad += cantidadNecesaria;
                    else registro.recetas.push({ recetaId: receta.id, recetaNombre: receta.nombre, cantidad: cantidadNecesaria });
                }
            });
        }
        
        // 2. Calculate Surpluses
        const surplusByElabId = new Map<string, number>();
        Object.values(allExcedentesData).forEach(excedente => {
            const ofOrigen = allOrdenesFabricacion.find(of => of.id === excedente.ofId);
            if (!ofOrigen) return;

            const diasCaducidad = excedente.diasCaducidad ?? 7;
            const fechaCaducidad = addDays(new Date(excedente.fechaProduccion), diasCaducidad);

            if (isBefore(startOfToday(), fechaCaducidad)) { // Only consider non-expired surpluses
                const currentSurplus = surplusByElabId.get(ofOrigen.elaboracionId) || 0;
                surplusByElabId.set(ofOrigen.elaboracionId, currentSurplus + excedente.cantidadAjustada);
            }
        });
        
        // 3. Sum up all existing production for the date range
        ofsEnRango.forEach(of => {
            const registro = necesidadesPorElaboracion.get(of.elaboracionId);
            if (registro) {
                const cantidadProducida = (of.estado === 'Finalizado' || of.estado === 'Validado' || of.estado === 'Incidencia') && of.cantidadReal !== null ? Number(of.cantidadReal) : Number(of.cantidadTotal);
                if (!isNaN(cantidadProducida)) {
                    registro.produccionAcumulada += cantidadProducida;
                }
            }
        });

        // 4. Calculate Net Needs and Final Items List
        const itemsFinales: Necesidad[] = [];
        const excedentesFinales: Necesidad[] = [];

        necesidadesPorElaboracion.forEach((registro, elabId) => {
            const excedenteDisponible = surplusByElabId.get(elabId) || 0;
            const necesidadNeta = registro.necesidadBruta - excedenteDisponible - registro.produccionAcumulada;

            if (necesidadNeta > 0.001) {
                 itemsFinales.push({
                    id: elabId,
                    nombre: registro.elaboracion.nombre,
                    cantidad: necesidadNeta,
                    unidad: registro.elaboracion.unidadProduccion,
                    partidaProduccion: registro.elaboracion.partidaProduccion,
                    eventos: registro.eventos,
                    recetas: registro.recetas,
                    type: 'necesidad',
                });
            }
        });
        
        surplusByElabId.forEach((cantidad, elabId) => {
            const elaboracion = elaboracionesMap.get(elabId);
            if (elaboracion) {
                 excedentesFinales.push({
                    id: elabId,
                    nombre: elaboracion.nombre,
                    cantidad: cantidad,
                    unidad: elaboracion.unidadProduccion,
                    partidaProduccion: elaboracion.partidaProduccion,
                    eventos: [],
                    recetas: [],
                    type: 'excedente',
                 });
            }
        });
        
        // --- DEVIATIONS CALCULATION ---
        const desviacionesAgrupadas: DesviacionOS[] = [];
        const allOFsWithOriginalNeed = allOrdenesFabricacion.filter(of => of.necesidadTotal !== undefined && of.necesidadTotal > 0);

        osEnRango.forEach(os => {
            const osId = os.id;
            const osConDesviacion: DesviacionOS = { osId: os.id, serviceNumber: os.serviceNumber, fecha: os.startDate, espacio: os.space || '', hitos: [] };

            const ofsParaEstaOS = allOFsWithOriginalNeed.filter(of => of.osIDs.includes(osId));
            
            const necesidadesActualesOS = new Map<string, number>(); // elabId -> cantidad
            const briefing = briefingsEnRango.find(b => b.osId === osId);
            briefing?.items.forEach(hito => {
                if (hito.conGastronomia) {
                    const gastroOrder = gastroOrdersEnRango.find(go => go.id === hito.id);
                    gastroOrder?.items?.forEach(item => {
                        const receta = recetasMap.get(item.id);
                        receta?.elaboraciones.forEach(elabEnReceta => {
                            const cantidad = (item.quantity || 0) * elabEnReceta.cantidad;
                            necesidadesActualesOS.set(elabEnReceta.elaboracionId, (necesidadesActualesOS.get(elabEnReceta.elaboracionId) || 0) + cantidad);
                        });
                    });
                }
            });

            ofsParaEstaOS.forEach(of => {
                const necesidadActual = necesidadesActualesOS.get(of.elaboracionId) || 0;
                const diferencia = necesidadActual - (of.necesidadTotal || 0);
                
                if (Math.abs(diferencia) > 0.001) {
                    const desviacionElab: DesviacionElaboracion = { id: of.id, of, necesidadActual: necesidadActual, diferencia };
                    
                    briefing?.items.forEach(hito => {
                        const gastroOrder = gastroOrdersEnRango.find(g => g.id === hito.id);
                        gastroOrder?.items?.forEach(item => {
                            const receta = recetasMap.get(item.id);
                            if (receta && receta.elaboraciones.some(e => e.elaboracionId === of.elaboracionId)) {
                                let hitoDesviacion = osConDesviacion.hitos.find(h => h.hitoId === hito.id);
                                if (!hitoDesviacion) {
                                    hitoDesviacion = { hitoId: hito.id, hitoDescripcion: hito.descripcion, recetas: [] };
                                    osConDesviacion.hitos.push(hitoDesviacion);
                                }
                                let recetaDesviacion = hitoDesviacion.recetas.find(r => r.recetaId === receta.id);
                                if (!recetaDesviacion) {
                                    const elabEnReceta = receta.elaboraciones.find(e => e.elaboracionId === of.elaboracionId)!;
                                    const diffUnidades = diferencia / elabEnReceta.cantidad;
                                    recetaDesviacion = {
                                        recetaId: receta.id, recetaNombre: receta.nombre,
                                        cantidadActual: item.quantity || 0,
                                        cantidadOriginal: (item.quantity || 0) - diffUnidades,
                                        diferenciaUnidades: diffUnidades,
                                        elaboraciones: []
                                    };
                                    hitoDesviacion.recetas.push(recetaDesviacion);
                                }
                                if (!recetaDesviacion.elaboraciones.find(e => e.id === of.id)) {
                                   recetaDesviacion.elaboraciones.push(desviacionElab);
                                }
                            }
                        })
                    })
                }
            });
            if (osConDesviacion.hitos.length > 0) {
                desviacionesAgrupadas.push(osConDesviacion);
            }
        });


        // --- MATRIX CALCULATION ---
        const days = eachDayOfInterval({ start: from, end: to });
        const matrixRows: MatrizRow[] = [];

        necesidadesPorReceta.forEach((registro, recetaId) => {
             const row: MatrizRow = {
                id: recetaId,
                nombre: registro.receta.nombre,
                unidad: 'UNIDAD',
                total: registro.necesidadBruta,
                type: 'receta',
                receta: registro.receta
            };
            days.forEach(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                row[dayKey] = registro.necesidadesPorDia.get(dayKey) || 0;
            });
            matrixRows.push(row);
        });

        necesidadesPorElaboracion.forEach((registro, elabId) => {
            const necesidad = itemsFinales.find(item => item.id === elabId);
            const row: MatrizRow = {
                id: elabId,
                nombre: registro.elaboracion.nombre,
                partida: registro.elaboracion.partidaProduccion,
                unidad: registro.elaboracion.unidadProduccion,
                total: registro.necesidadBruta,
                type: 'elaboracion',
                necesidad: necesidad
            };
            days.forEach(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                row[dayKey] = registro.necesidadesPorDia.get(dayKey) || 0;
            });
            matrixRows.push(row);
        });

        let totalPax = 0;
        let totalServicios = 0;
        
        const matrixHeaders: MatrizHeader[] = days.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            let totalRecetas = 0;
            let totalElaboraciones = 0;
            let paxDia = 0;
            const contratosDia = new Set<string>();
            let serviciosDia = 0;

            const osDelDia = osEnRango.filter(os => isSameDay(new Date(os.startDate), day));
            osDelDia.forEach(os => contratosDia.add(os.id));

            briefingsEnRango.forEach(briefing => {
                briefing.items.forEach(item => {
                    if (isSameDay(new Date(item.fecha), day)) {
                        if (item.conGastronomia) {
                            paxDia += item.asistentes;
                            serviciosDia++;
                        }
                    }
                })
            });
            
            osEnRango.filter(os => os.vertical === 'Entregas' && isSameDay(new Date(os.startDate), day)).forEach(os => {
                serviciosDia++; // Count each delivery as a service
                paxDia += os.asistentes; // Sum assistants for deliveries as well
            });

            matrixRows.forEach(row => {
                const value = row[dayKey] || 0;
                if (row.type === 'receta') {
                    totalRecetas += value;
                } else if (row.type === 'elaboracion') {
                    totalElaboraciones += value;
                }
            });

            totalPax += paxDia;
            totalServicios += serviciosDia;

            return { day, totalRecetaUnits: totalRecetas, totalElaboracionUnits: totalElaboraciones, totalPax: paxDia, totalContratos: contratosDia.size, totalServicios: serviciosDia };
        });

        setMatrizData(matrixRows);
        setMatrizHeaders(matrixHeaders);
        setMatrizTotals({ totalPax, totalContratos: osIdsEnRango.size, totalServicios });


        setPlanificacionItems(itemsFinales);
        setExcedentes(excedentesFinales);
        setDesviaciones(desviacionesAgrupadas);
        setRecetasAgregadas(Array.from(agregadoRecetasMap.values()));
        setDesgloseEventosRecetas(Array.from(desgloseEventosMap.values()));
        setIsLoading(false);
    }, [dateRange]);

    useEffect(() => {
        setIsMounted(true);
        setDateRange({
            from: startOfToday(),
            to: addDays(startOfToday(), 7),
        });
    }, []);

    useEffect(() => {
        if(isMounted) {
            calcularNecesidades();
        }
    }, [isMounted, calcularNecesidades]);

    const handleSelectRow = (id: string) => {
        const item = planificacionItems.find(i => i.id === id);
        if (item?.type !== 'necesidad') return;

        setSelectedRows(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(id)) {
                newSelection.delete(id);
            } else {
                newSelection.add(id);
            }
            return newSelection;
        });
    };
    
    const handleGenerateOF = () => {
        if (selectedRows.size === 0) {
            toast({ variant: 'destructive', title: 'No hay selección', description: 'Selecciona al menos una elaboración para generar una Orden de Fabricación.' });
            return;
        }

        const allOFs: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const lastIdNumber = allOFs.reduce((max, of) => {
            const numPart = of.id.split('-')[2];
            const num = numPart ? parseInt(numPart) : 0;
            return isNaN(num) ? max : Math.max(max, num);
        }, 0);

        let newOFs: OrdenFabricacion[] = [];
        let currentIdNumber = lastIdNumber;

        selectedRows.forEach(elaboracionId => {
            const necesidad = planificacionItems.find(item => item.id === elaboracionId);
            if(necesidad && necesidad.partidaProduccion && necesidad.type === 'necesidad') {
                currentIdNumber++;
                const newOF: OrdenFabricacion = {
                    id: `OF-${new Date().getFullYear()}-${currentIdNumber.toString().padStart(3, '0')}`,
                    fechaCreacion: new Date().toISOString(),
                    fechaProduccionPrevista: dateRange?.from?.toISOString() || new Date().toISOString(),
                    elaboracionId: necesidad.id,
                    elaboracionNombre: necesidad.nombre,
                    cantidadTotal: necesidad.cantidad,
                    necesidadTotal: necesidad.cantidad,
                    unidad: necesidad.unidad,
                    partidaAsignada: necesidad.partidaProduccion,
                    tipoExpedicion: 'REFRIGERADO', // Default
                    estado: 'Pendiente',
                    osIDs: Array.from(new Set(necesidad.eventos!.map(e => e.osId))),
                    incidencia: false,
                    okCalidad: false,
                };
                newOFs.push(newOF);
            }
        });
        
        const updatedOFs = [...allOFs, ...newOFs];
        localStorage.setItem('ordenesFabricacion', JSON.stringify(updatedOFs));

        toast({
            title: 'Órdenes de Fabricación Generadas',
            description: `Se han creado ${newOFs.length} nuevas OF.`,
        });
        
        calcularNecesidades();
    };

    const handleGenerateOfAjuste = (desviacion: DesviacionElaboracion) => {
        if (!dateRange?.from) return;

        const allOFs: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const lastIdNumber = allOFs.reduce((max, of) => {
            const numPart = of.id.split('-')[2];
            const num = numPart ? parseInt(numPart) : 0;
            return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        
        const newOF: OrdenFabricacion = {
            id: `OF-${new Date().getFullYear()}-${(lastIdNumber + 1).toString().padStart(3, '0')}`,
            fechaCreacion: new Date().toISOString(),
            fechaProduccionPrevista: dateRange.from.toISOString(),
            elaboracionId: desviacion.of.elaboracionId,
            elaboracionNombre: desviacion.of.elaboracionNombre,
            cantidadTotal: desviacion.diferencia,
            necesidadTotal: desviacion.diferencia,
            unidad: desviacion.of.unidad,
            partidaAsignada: desviacion.of.partidaAsignada,
            tipoExpedicion: desviacion.of.tipoExpedicion,
            estado: 'Pendiente',
            osIDs: desviacion.of.osIDs,
            incidencia: false,
            okCalidad: false,
        };

        const updatedOFs = [...allOFs, newOF];
        localStorage.setItem('ordenesFabricacion', JSON.stringify(updatedOFs));
        
        toast({ title: 'OF de Ajuste Generada', description: `Se ha creado la OF ${newOF.id} por ${formatNumber(newOF.cantidadTotal,2)} ${newOF.unidad}.`});
        calcularNecesidades();
    };

    const handleMarkAsExcedente = (desviacion: DesviacionElaboracion) => {
        if (Math.abs(desviacion.diferencia) <= 0) return;

        let allExcedentes = JSON.parse(localStorage.getItem('excedentesProduccion') || '{}') as {[key: string]: ExcedenteProduccion};
        let allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];

        const newExcedente: ExcedenteProduccion = {
            ofId: desviacion.of.id,
            fechaProduccion: desviacion.of.fechaFinalizacion || desviacion.of.fechaCreacion,
            cantidadAjustada: Math.abs(desviacion.diferencia),
            motivoAjuste: 'Reducción de necesidad en evento.',
            fechaAjuste: new Date().toISOString(),
        };

        allExcedentes[desviacion.of.id] = newExcedente;
        localStorage.setItem('excedentesProduccion', JSON.stringify(allExcedentes));

        // Actualizar la OF original para marcarla como incidencia
        const ofIndex = allOFs.findIndex(of => of.id === desviacion.of.id);
        if (ofIndex > -1) {
            allOFs[ofIndex] = {
                ...allOFs[ofIndex],
                estado: 'Incidencia',
                incidenciaObservaciones: `Excedente de ${formatNumber(Math.abs(desviacion.diferencia), 2)} ${desviacion.of.unidad} generado por cambio en evento.`
            };
            localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
        }

        toast({ title: 'Excedente Confirmado', description: `Se ha registrado un excedente de ${formatNumber(Math.abs(desviacion.diferencia),2)} ${desviacion.of.unidad}.`});
        calcularNecesidades();
    };
    
    const filteredPlanificacionItems = useMemo(() => {
        if (partidaFilter === 'all') return planificacionItems;
        return planificacionItems.filter(item => item.partidaProduccion === partidaFilter);
    }, [planificacionItems, partidaFilter]);


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Planificación de Producción..." />;
    }

    return (
        <TooltipProvider>
            <div>
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                            <ClipboardList />
                            Planificación de Producción
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-4 mb-6 p-4 border rounded-lg bg-card">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className="w-[300px] justify-start text-left font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                    {format(dateRange.from, "LLL dd, y", {locale: es})} -{" "}
                                    {format(dateRange.to, "LLL dd, y", {locale: es})}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y", {locale: es})
                                )
                                ) : (
                                <span>Elige un rango de fechas</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                                locale={es}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={calcularNecesidades} disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin mr-2"/> : <CalendarIcon className="mr-2" />}
                        {isLoading ? 'Calculando...' : 'Calcular Necesidades'}
                    </Button>
                </div>

                <Tabs defaultValue="matriz-produccion">
                    <div className="flex justify-between items-center">
                        <TabsList>
                            <TabsTrigger value="matriz-produccion">Matriz de Producción</TabsTrigger>
                            <TabsTrigger value="desviaciones" className="relative">
                                Desviaciones
                                {desviaciones.length > 0 && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span></span>}
                            </TabsTrigger>
                            <TabsTrigger value="recetas">Planificación por Recetas</TabsTrigger>
                            <TabsTrigger value="elaboraciones">Planificación de Elaboraciones</TabsTrigger>
                            <TabsTrigger value="excedentes">Excedentes Disponibles</TabsTrigger>
                        </TabsList>
                         <div className="flex-grow text-right">
                           <Button onClick={handleGenerateOF} disabled={selectedRows.size === 0}>
                                <Factory className="mr-2"/> Generar Órdenes de Fabricación ({selectedRows.size})
                           </Button>
                        </div>
                    </div>
                    <TabsContent value="matriz-produccion">
                        <Card className="mt-4">
                             <CardHeader>
                                <CardTitle>Matriz de Producción</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex justify-center items-center h-48"><Loader2 className="mx-auto animate-spin" /></div>
                                ) : matrizHeaders.length > 0 ? (
                                   <div className="overflow-x-auto border rounded-lg">
                                     <Table className="min-w-full">
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="p-1 sticky left-0 bg-muted z-10 w-64">Resumen Diario</TableHead>
                                                <TableHead className="p-1 text-center w-32 sticky left-[256px] bg-muted z-10">TOTAL</TableHead>
                                                {matrizHeaders.map(h => (
                                                    <TableHead key={h.day.toISOString()} className="p-1 text-center border-l">
                                                        <div className="font-bold capitalize">{format(h.day, 'EEE', {locale: es})}</div>
                                                        <div className="text-xs">{format(h.day, 'dd/MM')}</div>
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                            <TableRow>
                                                <TableHead className="p-1 sticky left-0 bg-background z-10"><FileDigit className="inline-block mr-2"/>Nº de Contratos (OS)</TableHead>
                                                <TableCell className="text-center font-bold border-l p-1 sticky left-[256px] bg-background z-10">{formatNumber(matrizTotals.totalContratos)}</TableCell>
                                                {matrizHeaders.map(h => <TableCell key={h.day.toISOString()} className="text-center font-bold border-l p-1">{formatNumber(h.totalContratos)}</TableCell>)}
                                            </TableRow>
                                            <TableRow>
                                                <TableHead className="p-1 sticky left-0 bg-background z-10"><Utensils className="inline-block mr-2"/>Nº de Servicios</TableHead>
                                                <TableCell className="text-center font-bold border-l p-1 sticky left-[256px] bg-background z-10">{formatNumber(matrizTotals.totalServicios)}</TableCell>
                                                {matrizHeaders.map(h => <TableCell key={h.day.toISOString()} className="text-center font-bold border-l p-1">{formatNumber(h.totalServicios)}</TableCell>)}
                                            </TableRow>
                                            <TableRow>
                                                <TableHead className="p-1 sticky left-0 bg-background z-10"><Users className="inline-block mr-2"/>Nº de Asistentes (PAX)</TableHead>
                                                <TableCell className="text-center font-bold border-l p-1 sticky left-[256px] bg-background z-10">{formatNumber(matrizTotals.totalPax)}</TableCell>
                                                {matrizHeaders.map(h => <TableCell key={h.day.toISOString()} className="text-center font-bold border-l p-1">{formatNumber(h.totalPax)}</TableCell>)}
                                            </TableRow>
                                            <TableRow>
                                                <TableHead className="p-1 sticky left-0 bg-background z-10"><BookOpen className="inline-block mr-2"/>Uds. de Receta</TableHead>
                                                <TableCell className="text-center font-bold border-l p-1 sticky left-[256px] bg-background z-10">{formatNumber(matrizHeaders.reduce((acc, h) => acc + h.totalRecetaUnits, 0))}</TableCell>
                                                {matrizHeaders.map(h => <TableCell key={h.day.toISOString()} className="text-center font-bold border-l p-1">{formatNumber(h.totalRecetaUnits)}</TableCell>)}
                                            </TableRow>
                                            <TableRow>
                                                <TableHead className="p-1 sticky left-0 bg-background z-10"><Component className="inline-block mr-2"/>Uds. de Elaboración</TableHead>
                                                <TableCell className="text-center font-bold border-l p-1 sticky left-[256px] bg-background z-10">{formatNumber(matrizHeaders.reduce((acc, h) => acc + h.totalElaboracionUnits, 0), 2)}</TableCell>
                                                {matrizHeaders.map(h => <TableCell key={h.day.toISOString()} className="text-center font-bold border-l p-1">{formatNumber(h.totalElaboracionUnits, 2)}</TableCell>)}
                                            </TableRow>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="p-1 font-semibold sticky left-0 bg-muted z-10">Producto</TableHead>
                                                <TableHead className="p-1 font-semibold text-center w-32 sticky left-[256px] bg-muted z-10">Total</TableHead>
                                                {matrizHeaders.map(h => <TableHead key={h.day.toISOString()} className="p-1 text-center border-l capitalize">{format(h.day, 'EEE dd/MM', {locale: es})}</TableHead>)}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {matrizData.filter(r => r.type === 'receta').length > 0 && (
                                                <TableRow className="bg-primary/10 hover:bg-primary/20"><TableCell colSpan={matrizHeaders.length + 2} className="p-1 font-bold text-primary sticky left-0 z-10">RECETAS</TableCell></TableRow>
                                            )}
                                            {matrizData.filter(r => r.type === 'receta').map(row => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="p-1 font-medium sticky left-0 bg-background z-10">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span>{row.nombre}</span>
                                                            </TooltipTrigger>
                                                            {row.receta && (
                                                                <TooltipContent>
                                                                    <div className="p-1 max-w-xs">
                                                                        <h4 className="font-bold mb-1">Elaboraciones de la receta:</h4>
                                                                        <ul className="list-disc pl-4 text-xs">
                                                                            {row.receta.elaboraciones.map((e: ElaboracionEnReceta) => (
                                                                                <li key={e.id}>{formatNumber(e.cantidad, 2)} {formatUnit(e.unidad)} - {e.nombre}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                </TooltipContent>
                                                            )}
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell className="p-1 text-center font-bold font-mono sticky left-[256px] bg-background z-10">{formatNumber(row.total)} {formatUnit(row.unidad)}</TableCell>
                                                    {matrizHeaders.map(h => (
                                                        <TableCell key={h.day.toISOString()} className={cn("p-1 text-center font-mono border-l", row[format(h.day, 'yyyy-MM-dd')] === 0 && 'bg-slate-50')}>
                                                            {row[format(h.day, 'yyyy-MM-dd')] > 0 ? formatNumber(row[format(h.day, 'yyyy-MM-dd')]) : '-'}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                            {matrizData.filter(r => r.type === 'elaboracion').length > 0 && (
                                                <TableRow className="bg-primary/10 hover:bg-primary/20"><TableCell colSpan={matrizHeaders.length + 2} className="p-1 font-bold text-primary sticky left-0 z-10">ELABORACIONES</TableCell></TableRow>
                                            )}
                                            {matrizData.filter(r => r.type === 'elaboracion').map(row => (
                                                <TableRow key={row.id} className={cn(row.partida && partidaColorClasses[row.partida])}>
                                                    <TableCell className="p-1 font-medium sticky left-0 z-10">
                                                         <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span>{row.nombre}</span>
                                                            </TooltipTrigger>
                                                             {row.necesidad && (
                                                                <TooltipContent>
                                                                    <div className="p-1 max-w-xs">
                                                                        {row.partida && <p className="text-xs font-bold mb-1">Partida: {row.partida}</p>}
                                                                        <h4 className="font-bold mb-1">Necesario para:</h4>
                                                                        <ul className="list-disc pl-4 text-xs">
                                                                            {row.necesidad.recetas.map((r: RecetaNecesidad) => (
                                                                                <li key={r.recetaId}>{r.recetaNombre}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                </TooltipContent>
                                                            )}
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell className="p-1 text-center font-bold font-mono sticky left-[256px] z-10">{formatNumber(row.total, 2)} {formatUnit(row.unidad)}</TableCell>
                                                    {matrizHeaders.map(h => (
                                                        <TableCell key={h.day.toISOString()} className={cn("p-1 text-center font-mono border-l", row[format(h.day, 'yyyy-MM-dd')] === 0 && 'bg-slate-50/50')}>
                                                            {row[format(h.day, 'yyyy-MM-dd')] > 0 ? formatNumber(row[format(h.day, 'yyyy-MM-dd')], 2) : '-'}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                   </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">No hay datos para el rango de fechas seleccionado.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="desviaciones">
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-amber-500" />Panel de Desviaciones</CardTitle>
                                <CardDescription>Aquí aparecen las Órdenes de Fabricación que no coinciden con las necesidades actuales de los eventos. Esto puede ocurrir si se modificó un evento después de generar la producción.</CardDescription>
                            </CardHeader>
                            <CardContent>
                               {isLoading ? <div className="flex justify-center items-center h-24"><Loader2 className="mx-auto animate-spin" /></div> 
                               : desviaciones.length > 0 ? (
                                <div className="space-y-4">
                                {desviaciones.map(os => (
                                    <Collapsible key={os.osId} className="border rounded-lg p-3">
                                        <CollapsibleTrigger className="w-full flex justify-between items-center group">
                                            <div className="font-semibold">{os.serviceNumber} - {format(new Date(os.fecha), 'dd/MM/yyyy')} - {os.espacio}</div>
                                            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180"/>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="pt-3 space-y-2">
                                            {os.hitos.map(hito => (
                                                <div key={hito.hitoId} className="border rounded-md p-2 bg-background">
                                                    <h4 className="font-semibold text-sm">{hito.hitoDescripcion}</h4>
                                                     {hito.recetas.map(receta => (
                                                        <div key={receta.recetaId} className="pl-4 mt-1">
                                                            <div>
                                                                <span className="text-sm text-muted-foreground">{receta.recetaNombre}</span>
                                                                <Badge variant="secondary" className={cn("ml-2", receta.diferenciaUnidades > 0 ? 'text-orange-600' : 'text-blue-600')}>{receta.diferenciaUnidades > 0 ? '+' : ''}{formatNumber(receta.diferenciaUnidades, 2)} uds.</Badge>
                                                            </div>
                                                            <Table>
                                                                <TableHeader><TableRow><TableHead className="h-8">OF</TableHead><TableHead className="h-8">Elaboración</TableHead><TableHead className="h-8">Cant. Original</TableHead><TableHead className="h-8">Cant. Nueva</TableHead><TableHead className="h-8">Desviación</TableHead><TableHead className="h-8">Estado OF</TableHead><TableHead className="h-8">Acciones</TableHead></TableRow></TableHeader>
                                                                <TableBody>
                                                                    {receta.elaboraciones.map(d => (
                                                                        <TableRow key={d.id}>
                                                                            <TableCell>{d.of.id}</TableCell>
                                                                            <TableCell>{d.of.elaboracionNombre}</TableCell>
                                                                            <TableCell>{formatNumber(d.of.necesidadTotal || 0, 2)}</TableCell>
                                                                            <TableCell>{formatNumber(d.necesidadActual, 2)}</TableCell>
                                                                            <TableCell className={cn("font-bold", d.diferencia > 0 ? 'text-orange-600' : 'text-blue-600')}>
                                                                                {d.diferencia > 0 ? '+' : ''}{formatNumber(d.diferencia, 2)}
                                                                            </TableCell>
                                                                             <TableCell><Badge variant="outline">{d.of.estado}</Badge></TableCell>
                                                                            <TableCell>
                                                                                 {d.diferencia > 0 
                                                                                    ? <Button size="sm" variant="outline" onClick={() => handleGenerateOfAjuste(d)}>Generar OF de Ajuste</Button> 
                                                                                    : <Button size="sm" variant="outline" onClick={() => handleMarkAsExcedente(d)}>Marcar como Excedente</Button>}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </CollapsibleContent>
                                    </Collapsible>
                                ))}
                                </div>
                               ) : <p className="text-center text-muted-foreground py-8">No se han encontrado desviaciones.</p>}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="recetas">
                        <div className="mt-4 space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Resumen Agregado de Recetas</CardTitle>
                                    <CardDescription>Total de recetas completas a producir en el período seleccionado.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <Table>
                                        <TableHeader><TableRow><TableHead>Receta</TableHead><TableHead className="text-right">Cantidad Total</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                             {isLoading ? (
                                                <TableRow><TableCell colSpan={2} className="h-24 text-center"><Loader2 className="mx-auto animate-spin" /></TableCell></TableRow>
                                            ) : recetasAgregadas.length > 0 ? (
                                                recetasAgregadas.map(receta => (
                                                    <TableRow key={receta.id}>
                                                        <TableCell className="font-medium">{receta.nombre}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatNumber(receta.cantidadTotal)}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow><TableCell colSpan={2} className="h-24 text-center">No hay recetas planificadas para este período.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                             <Card>
                                <CardHeader>
                                    <CardTitle>Desglose por Evento</CardTitle>
                                    <CardDescription>Vista jerárquica de las necesidades por evento, hito y receta.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {isLoading ? (
                                        <div className="flex justify-center items-center h-24"><Loader2 className="mx-auto animate-spin" /></div>
                                    ) : desgloseEventosRecetas.length > 0 ? (
                                        desgloseEventosRecetas.map(os => (
                                            <Collapsible key={os.osId} className="border rounded-lg p-4 bg-card">
                                                <CollapsibleTrigger className="w-full flex justify-between items-center group">
                                                    <div className="text-left">
                                                        <h4 className="font-bold text-lg">{os.serviceNumber} - {os.client}</h4>
                                                        <p className="text-sm text-muted-foreground">{format(new Date(os.startDate), 'PPP', { locale: es })}</p>
                                                    </div>
                                                    <ChevronDown className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="pt-4 space-y-3">
                                                    {os.hitos.map(hito => (
                                                         <Collapsible key={hito.id} className="border rounded-md p-3 bg-background">
                                                            <CollapsibleTrigger className="w-full flex justify-between items-center text-left group">
                                                                <div className="flex items-center gap-2">
                                                                    <Utensils className="h-4 w-4" />
                                                                    <span className="font-semibold">{hito.descripcion}</span>
                                                                </div>
                                                                <ChevronDown className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                                            </CollapsibleTrigger>
                                                            <CollapsibleContent className="pt-3">
                                                                <Table>
                                                                    <TableHeader><TableRow><TableHead>Receta</TableHead><TableHead>Cantidad</TableHead><TableHead>Elaboraciones</TableHead></TableRow></TableHeader>
                                                                    <TableBody>
                                                                        {hito.recetas.map(receta => (
                                                                            <TableRow key={receta.id}>
                                                                                <TableCell className="font-medium">{receta.nombre}</TableCell>
                                                                                <TableCell>{formatNumber(receta.cantidad)}</TableCell>
                                                                                <TableCell>
                                                                                    <ul className="list-disc pl-5 text-xs text-muted-foreground">
                                                                                        {receta.elaboraciones.map(elab => (
                                                                                            <li key={elab.id}>{formatNumber(elab.cantidadPorReceta, 2)} {formatUnit(elab.unidad)} - {elab.nombre}</li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </CollapsibleContent>
                                                         </Collapsible>
                                                    ))}
                                                </CollapsibleContent>
                                            </Collapsible>
                                        ))
                                    ) : (
                                        <p className="text-center text-muted-foreground py-8">No hay eventos con necesidades de producción en el rango de fechas seleccionado.</p>
                                    )}
                                </CardContent>
                             </Card>
                        </div>
                    </TabsContent>
                    <TabsContent value="elaboraciones">
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>Planificación de Elaboraciones</CardTitle>
                                <div className="flex justify-between items-center">
                                    <div></div>
                                     <Select value={partidaFilter} onValueChange={setPartidaFilter}>
                                        <SelectTrigger className="w-[240px]">
                                            <SelectValue placeholder="Filtrar por partida" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas las Partidas</SelectItem>
                                            {partidas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12"><Checkbox 
                                                    checked={selectedRows.size > 0 && filteredPlanificacionItems.filter(i => i.type === 'necesidad').length > 0 && selectedRows.size === filteredPlanificacionItems.filter(i => i.type === 'necesidad').length}
                                                    onCheckedChange={(checked) => {
                                                        const needItems = filteredPlanificacionItems.filter(i => i.type === 'necesidad').map(i => i.id);
                                                        if(checked) {
                                                            setSelectedRows(new Set(needItems))
                                                        } else {
                                                            setSelectedRows(new Set())
                                                        }
                                                    }}
                                                /></TableHead>
                                                <TableHead>Elaboración</TableHead>
                                                <TableHead className="text-right">Cantidad</TableHead>
                                                <TableHead>Unidad</TableHead>
                                                <TableHead className="flex items-center gap-1.5">Detalles <Info size={14}/></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading ? (
                                                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto animate-spin" /></TableCell></TableRow>
                                            ) : filteredPlanificacionItems.length > 0 ? (
                                                filteredPlanificacionItems.map(item => (
                                                    <TableRow 
                                                        key={item.id} 
                                                        onClick={() => handleSelectRow(item.id)} 
                                                        className={cn(
                                                            'cursor-pointer', 
                                                            item.type === 'excedente' && 'bg-green-100/50 hover:bg-green-100/60 cursor-default',
                                                            item.type === 'necesidad' && item.partidaProduccion && partidaColorClasses[item.partidaProduccion]
                                                        )}
                                                    >
                                                        <TableCell>
                                                          {item.type === 'necesidad' ? (
                                                            <Checkbox checked={selectedRows.has(item.id)} />
                                                          ) : (
                                                            <Tooltip>
                                                              <TooltipTrigger><PackageCheck className="text-green-600"/></TooltipTrigger>
                                                              <TooltipContent><p>Excedente disponible</p></TooltipContent>
                                                            </Tooltip>
                                                          )}
                                                        </TableCell>
                                                        <TableCell className="font-medium">{item.nombre}</TableCell>
                                                        <TableCell className={cn("text-right font-mono", item.type === 'excedente' && 'text-green-600')}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span>{item.type === 'excedente' && '+ '}{formatNumber(item.cantidad, 2)}</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <div className="p-1">
                                                                        <h4 className="font-bold mb-2 text-center">Desglose por Receta</h4>
                                                                        {item.recetas!.map((r, i) => (
                                                                            <div key={i} className="flex justify-between gap-4 text-xs">
                                                                                <span>{r.recetaNombre}:</span>
                                                                                <span className="font-semibold">{formatNumber(r.cantidad, 2)} {formatUnit(item.unidad)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell>{formatUnit(item.unidad)}</TableCell>
                                                        <TableCell>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="flex items-center gap-1.5">{item.eventos!.length} evento(s) <Info size={14}/></span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <div className="p-1">
                                                                        <h4 className="font-bold mb-2 text-center">Eventos Implicados</h4>
                                                                        {item.eventos!.map((e, i) => (
                                                                            <div key={i} className="text-xs">{e.serviceNumber} - {e.serviceType}</div>
                                                                        ))}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center">
                                                        No se encontraron necesidades para el rango de fechas seleccionado o ya están todas cubiertas.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="excedentes">
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>Excedentes de Producción Disponibles</CardTitle>
                                <CardDescription>Sobrantes de producciones anteriores que pueden ser utilizados para cubrir nuevas necesidades.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Elaboración</TableHead>
                                            <TableHead className="text-right">Cantidad Disponible</TableHead>
                                            <TableHead>Unidad</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto animate-spin" /></TableCell></TableRow>
                                        ) : excedentes.length > 0 ? (
                                            excedentes.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">{item.nombre}</TableCell>
                                                    <TableCell className="text-right font-mono text-green-600">+{formatNumber(item.cantidad, 2)}</TableCell>
                                                    <TableCell>{formatUnit(item.unidad)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay excedentes disponibles.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </TooltipProvider>
    );
}

