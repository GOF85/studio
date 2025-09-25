'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { addDays, startOfToday, eachDayOfInterval, isSameDay } from 'date-fns';
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


import type { ServiceOrder, GastronomyOrder, GastronomyOrderItem, Receta, Elaboracion, UnidadMedida, OrdenFabricacion, PartidaProduccion, ElaboracionEnReceta, ComercialBriefing, ComercialBriefingItem } from '@/types';

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

        // --- CALCULATIONS ---
        
        const necesidadesPorReceta = new Map<string, { necesidadBruta: number; receta: Receta; necesidadesPorDia: Map<string, number> }>();
        const necesidadesPorElaboracion = new Map<string, { necesidadBruta: number; produccionAcumulada: number; elaboracion: Elaboracion; eventos: EventoAfectado[]; recetas: RecetaNecesidad[]; necesidadesPorDia: Map<string, number>}>();
        
        const desgloseEventosMap: Map<string, DesgloseEventoRecetas> = new Map();
        const agregadoRecetasMap: Map<string, RecetaAgregada> = new Map();


        briefingsEnRango.forEach(briefing => {
            const serviceOrder = serviceOrderMap.get(briefing.osId);
            if (!serviceOrder) return;

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
                            const cantidadReceta = Number(item.quantity || 0);
                            let recetaAgregada = agregadoRecetasMap.get(receta.id);
                            if (!recetaAgregada) {
                                recetaAgregada = { id: receta.id, nombre: receta.nombre, cantidadTotal: 0 };
                                agregadoRecetasMap.set(receta.id, recetaAgregada);
                            }
                            recetaAgregada.cantidadTotal += cantidadReceta;

                            const detalleRecetaEnHito = {
                                id: receta.id, nombre: receta.nombre, cantidad: cantidadReceta, elaboraciones: receta.elaboraciones.map(e => ({
                                    id: e.elaboracionId,
                                    nombre: e.nombre,
                                    cantidadPorReceta: e.cantidad,
                                    unidad: elaboracionesMap.get(e.elaboracionId)?.unidadProduccion || 'UNIDAD',
                                }))
                            };
                            hito.recetas.push(detalleRecetaEnHito);

                            // --- Populate recipe needs for matrix ---
                            const diaKey = format(new Date(serviceOrder.startDate), 'yyyy-MM-dd');
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
                                    
                                    if (!registro.eventos!.find(e => e.osId === gastroOrder.osId && e.serviceType === gastroOrder.descripcion)) {
                                        registro.eventos!.push({ osId: gastroOrder.osId, serviceNumber: serviceOrder.serviceNumber, serviceType: gastroOrder.descripcion });
                                    }
                                    const recetaExistente = registro.recetas.find(r => r.recetaId === receta.id);
                                    if (recetaExistente) recetaExistente.cantidad += cantidadNecesaria;
                                    else registro.recetas.push({ recetaId: receta.id, recetaNombre: receta.nombre, cantidad: cantidadNecesaria });
                                }
                            });
                        }
                    }
                });
            });
        });
        
        const ofsProducidasEnRango = allOrdenesFabricacion.filter(of => {
             const fechaProduccion = of.fechaFinalizacion || of.fechaCreacion;
             try {
                const ofDate = new Date(fechaProduccion);
                return ofDate >= from && ofDate <= to;
             } catch(e) { return false; }
        });

        // Sumar producción
        ofsProducidasEnRango.forEach(of => {
            const registro = necesidadesPorElaboracion.get(of.elaboracionId);
            if (registro) {
                const cantidadProducida = (of.estado === 'Finalizado' || of.estado === 'Validado' || of.estado === 'Incidencia') && of.cantidadReal !== null ? Number(of.cantidadReal) : Number(of.cantidadTotal);
                if (!isNaN(cantidadProducida)) {
                    registro.produccionAcumulada += cantidadProducida;
                }
            }
        });

        const itemsFinales: Necesidad[] = [];
        necesidadesPorElaboracion.forEach((registro, elabId) => {
            const diferencia = registro.necesidadBruta - registro.produccionAcumulada;
            
            if (Math.abs(diferencia) > 0.001) { 
                 itemsFinales.push({
                    id: elabId,
                    nombre: registro.elaboracion.nombre,
                    cantidad: Math.abs(diferencia),
                    unidad: registro.elaboracion.unidadProduccion,
                    partidaProduccion: registro.elaboracion.partidaProduccion,
                    eventos: registro.eventos,
                    recetas: registro.recetas,
                    type: diferencia > 0 ? 'necesidad' : 'excedente',
                    loteOrigen: diferencia < 0 ? ofsEnRango.find(of => of.elaboracionId === elabId)?.id : undefined
                });
            }
        });

        // Detectar desviaciones y agruparlas
        const desviacionesAgrupadas: DesviacionOS[] = [];
        const desviacionesMap = new Map<string, DesviacionOS>();

        osEnRango.forEach(os => {
            const ofsDeLaOS = ofsEnRango.filter(of => of.osIDs.includes(os.id));
            if (ofsDeLaOS.length === 0) return;

            let osConDesviacion: DesviacionOS | undefined;
            const hitosConDesviacion = new Map<string, DesviacionHito>();
            
            const gastroOrdersDeLaOS = gastroOrdersEnRango.filter(g => g.osId === os.id);
            const briefingDeLaOS = briefingsEnRango.find(b => b.osId === os.id);

            ofsDeLaOS.forEach(of => {
                const necesidadRegistro = necesidadesPorElaboracion.get(of.elaboracionId);
                const necesidadActualOS = necesidadRegistro?.necesidadBruta || 0;

                const necesidadOriginalOF = of.necesidadTotal || 0;
                const diferencia = necesidadActualOS - necesidadOriginalOF;

                if (Math.abs(diferencia) > 0.001) {
                    if (!osConDesviacion) {
                        osConDesviacion = { osId: os.id, serviceNumber: os.serviceNumber, hitos: [] };
                        desviacionesMap.set(os.id, osConDesviacion);
                    }
                    
                    // Find which Hito and Receta this OF deviation belongs to
                    briefingDeLaOS?.items.forEach(hito => {
                        const gastroOrder = gastroOrdersDeLaOS.find(go => go.id === hito.id);
                        gastroOrder?.items?.forEach(gastroItem => {
                            if (gastroItem.type === 'item') {
                                const receta = recetasMap.get(gastroItem.id);
                                if (receta && receta.elaboraciones.some(e => e.elaboracionId === of.elaboracionId)) {
                                    
                                    let hitoDesviacion = hitosConDesviacion.get(gastroOrder.id);
                                    if (!hitoDesviacion) {
                                        hitoDesviacion = { hitoId: gastroOrder.id, hitoDescripcion: gastroOrder.descripcion, recetas: [] };
                                        hitosConDesviacion.set(gastroOrder.id, hitoDesviacion);
                                    }

                                    let recetaDesviacion = hitoDesviacion.recetas.find(r => r.recetaId === receta.id);
                                    if (!recetaDesviacion) {
                                        const originalGastroOrder = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]').find((go: GastronomyOrder) => go.id === hito.id);
                                        const originalItem = originalGastroOrder?.items?.find((i: GastronomyOrderItem) => i.id === receta.id);
                                        const cantidadOriginal = originalItem?.quantity || 0;
                                        const cantidadActual = gastroItem.quantity || 0;
                                        
                                        recetaDesviacion = { 
                                            recetaId: receta.id, 
                                            recetaNombre: receta.nombre, 
                                            cantidadOriginal: cantidadOriginal,
                                            cantidadActual: cantidadActual,
                                            diferenciaUnidades: cantidadActual - cantidadOriginal,
                                            elaboraciones: [] 
                                        };
                                        hitoDesviacion.recetas.push(recetaDesviacion);
                                    }

                                    recetaDesviacion.elaboraciones.push({
                                        id: of.id,
                                        of: of,
                                        necesidadActual: necesidadActualOS,
                                        diferencia: diferencia
                                    });
                                }
                            }
                        });
                    });
                }
            });

            if (osConDesviacion) {
                osConDesviacion.hitos = Array.from(hitosConDesviacion.values());
                desviacionesAgrupadas.push(osConDesviacion);
            }
        });
        
        // --- MATRIX CALCULATION ---
        const days = eachDayOfInterval({ start: from, end: to });
        const matrixRows: MatrizRow[] = [];

        // Add recipes to matrix
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

        // Add elaborations to matrix
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
        setDesviaciones(desviacionesAgrupadas);
        setRecetasAgregadas(Array.from(agregadoRecetasMap.values()));
        setDesgloseEventosRecetas(Array.from(desgloseEventosMap.values()));
        setIsLoading(false);
    }, [dateRange]);

    useEffect(() => {
        setIsMounted(true);
        // Set initial date range only on client to avoid hydration errors
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
        if (item?.type !== 'necesidad') return; // Only allow selecting needs

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
                    necesidadTotal: necesidad.cantidad, // Guardamos la necesidad en el momento de la creación
                    unidad: necesidad.unidad,
                    partidaAsignada: necesidad.partidaProduccion,
                    tipoExpedicion: 'REFRIGERADO', // Default, should be on elaboracion
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
            osIDs: desviacion.of.osIDs, // Asign to same events
            incidencia: false,
            okCalidad: false,
        };

        const updatedOFs = [...allOFs, newOF];
        localStorage.setItem('ordenesFabricacion', JSON.stringify(updatedOFs));
        
        toast({ title: 'OF de Ajuste Generada', description: `Se ha creado la OF ${newOF.id} por ${formatNumber(newOF.cantidadTotal,2)} ${newOF.unidad}.`});
        calcularNecesidades(); // Recalculate everything
    };

    const handleMarkAsExcedente = (desviacion: DesviacionElaboracion) => {
        // This is a conceptual action for now. We remove it from the list.
        // A full implementation would create a record in an 'excedentes' table.
        const updatedOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const index = updatedOFs.findIndex(of => of.id === desviacion.of.id);
        if (index !== -1) {
            updatedOFs[index].necesidadTotal = desviacion.necesidadActual; // Update original OF need
            localStorage.setItem('ordenesFabricacion', JSON.stringify(updatedOFs));
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
                                            <div className="font-semibold">{os.serviceNumber}</div>
                                            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180"/>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="pt-3 space-y-2">
                                            {os.hitos.map(hito => (
                                                <div key={hito.hitoId} className="border rounded-md p-2 bg-background">
                                                    <h4 className="font-semibold text-sm">{hito.hitoDescripcion}</h4>
                                                     {hito.recetas.map(receta => (
                                                        <div key={receta.recetaId} className="pl-4 mt-1">
                                                            <p className="text-sm text-muted-foreground">{receta.recetaNombre} <Badge variant="secondary" className={cn(receta.diferenciaUnidades > 0 ? 'text-orange-600' : 'text-blue-600')}>{receta.diferenciaUnidades > 0 ? '+' : ''}{receta.diferenciaUnidades} uds.</Badge></p>
                                                            <Table>
                                                                <TableHeader><TableRow><TableHead className="h-8">Elaboración</TableHead><TableHead className="h-8">Cant. Original</TableHead><TableHead className="h-8">Cant. Nueva</TableHead><TableHead className="h-8">Desviación</TableHead><TableHead className="h-8">Acciones</TableHead></TableRow></TableHeader>
                                                                <TableBody>
                                                                    {receta.elaboraciones.map(d => (
                                                                        <TableRow key={d.id}>
                                                                            <TableCell>{d.of.elaboracionNombre}</TableCell>
                                                                            <TableCell>{formatNumber(d.of.necesidadTotal || 0, 2)}</TableCell>
                                                                            <TableCell>{formatNumber(d.necesidadActual, 2)}</TableCell>
                                                                            <TableCell className={cn("font-bold", d.diferencia > 0 ? 'text-orange-600' : 'text-blue-600')}>
                                                                                {d.diferencia > 0 ? '+' : ''}{formatNumber(d.diferencia, 2)}
                                                                            </TableCell>
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
                </Tabs>
            </div>
        </TooltipProvider>
    );
}
