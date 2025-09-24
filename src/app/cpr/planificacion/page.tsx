

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { addDays, startOfToday, eachDayOfInterval, isSameDay } from 'date-fns';
import { ClipboardList, Calendar as CalendarIcon, Factory, Info, AlertTriangle, PackageCheck, ChevronRight, ChevronDown, Utensils, Component, Users, FileDigit } from 'lucide-react';
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

import type { ServiceOrder, GastronomyOrder, Receta, Elaboracion, UnidadMedida, OrdenFabricacion, PartidaProduccion } from '@/types';

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
    id: string; // elaboracionId
    nombre: string;
    partida: PartidaProduccion;
    unidad: UnidadMedida;
    total: number;
    [day: string]: any; // day-YYYY-MM-DD: number
}
type MatrizHeader = {
    day: Date;
    totalPax: number;
    totalOs: number;
    totalUnits: number;
}


export default function PlanificacionPage() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    
    // Unified state for both needs and surpluses
    const [planificacionItems, setPlanificacionItems] = useState<Necesidad[]>([]);
    
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

    // State for detailed view
    const [recetasAgregadas, setRecetasAgregadas] = useState<RecetaAgregada[]>([]);
    const [desgloseEventosRecetas, setDesgloseEventosRecetas] = useState<DesgloseEventoRecetas[]>([]);
    
    // State for Matrix view
    const [matrizData, setMatrizData] = useState<MatrizRow[]>([]);
    const [matrizHeaders, setMatrizHeaders] = useState<MatrizHeader[]>([]);


    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const calcularNecesidades = useCallback(() => {
        setIsLoading(true);
        setPlanificacionItems([]);
        setRecetasAgregadas([]);
        setDesgloseEventosRecetas([]);
        setMatrizData([]);
        setMatrizHeaders([]);
        setSelectedRows(new Set());

        if (!dateRange?.from || !dateRange?.to) {
            setIsLoading(false);
            return;
        }
        
        const from = dateRange.from;
        const to = dateRange.to;

        // --- DATA LOADING ---
        const allServiceOrders: ServiceOrder[] = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const allGastroOrders: GastronomyOrder[] = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
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

        // --- CALCULATIONS ---
        
        const necesidadesPorElaboracion = new Map<string, {
            necesidadBruta: number;
            produccionAcumulada: number;
            elaboracion: Elaboracion;
            eventos: EventoAfectado[];
            recetas: RecetaNecesidad[];
            necesidadesPorDia: Map<string, number>; // key: YYYY-MM-DD
        }>();
        
        const desgloseEventosMap: Map<string, DesgloseEventoRecetas> = new Map();
        const agregadoRecetasMap: Map<string, RecetaAgregada> = new Map();


        gastroOrdersEnRango.forEach(gastroOrder => {
            const serviceOrder = serviceOrderMap.get(gastroOrder.osId);
            if (!serviceOrder) return;
            
            if (!desgloseEventosMap.has(serviceOrder.id)) {
                desgloseEventosMap.set(serviceOrder.id, {
                    osId: serviceOrder.id, serviceNumber: serviceOrder.serviceNumber,
                    client: serviceOrder.client, startDate: serviceOrder.startDate, hitos: [],
                });
            }
            const desgloseOS = desgloseEventosMap.get(serviceOrder.id)!;
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
                                
                                const diaKey = format(new Date(serviceOrder.startDate), 'yyyy-MM-dd');
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

        // Sumar producción
        ofsEnRango.forEach(of => {
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
        
        // --- MATRIX CALCULATION ---
        const days = eachDayOfInterval({ start: from, end: to });
        const matrixRows: MatrizRow[] = [];
        
        necesidadesPorElaboracion.forEach((registro, elabId) => {
            const row: MatrizRow = {
                id: elabId,
                nombre: registro.elaboracion.nombre,
                partida: registro.elaboracion.partidaProduccion,
                unidad: registro.elaboracion.unidadProduccion,
                total: registro.necesidadBruta,
            };
            days.forEach(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                row[dayKey] = registro.necesidadesPorDia.get(dayKey) || 0;
            });
            matrixRows.push(row);
        });

        const matrixHeaders: MatrizHeader[] = days.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const osDelDia = new Set<string>();
            let paxTotal = 0;
            let unidadesTotales = 0;

            osEnRango.forEach(os => {
                if (isSameDay(new Date(os.startDate), day)) {
                    osDelDia.add(os.id);
                    paxTotal += os.asistentes;
                }
            });
            
            matrixRows.forEach(row => {
                unidadesTotales += row[dayKey];
            });

            return { day, totalPax: paxTotal, totalOs: osDelDia.size, totalUnits: unidadesTotales };
        });

        setMatrizData(matrixRows);
        setMatrizHeaders(matrixHeaders);

        setPlanificacionItems(itemsFinales);
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
                    unidad: necesidad.unidad,
                    partidaAsignada: necesidad.partidaProduccion,
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
    }

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Planificación de Producción..." />;
    }

    return (
        <TooltipProvider>
            <div>
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font.headline font-bold flex items-center gap-3">
                            <ClipboardList />
                            Planificación de Producción
                        </h1>
                        <p className="text-muted-foreground mt-1">Agrega las necesidades de elaboración para los eventos confirmados.</p>
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
                                <CardDescription>Vista de producción diaria por elaboración, similar a un Excel.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="flex justify-center items-center h-48"><Loader2 className="mx-auto animate-spin" /></div>
                                ) : matrizHeaders.length > 0 ? (
                                   <div className="overflow-x-auto border rounded-lg">
                                     <Table className="min-w-full">
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="p-2 font-semibold text-center sticky left-0 bg-muted z-10" colSpan={3}>Resumen Diario</TableHead>
                                                {matrizHeaders.map(h => (
                                                    <TableHead key={h.day.toISOString()} className="p-2 text-center border-l">
                                                        <div className="font-bold">{format(h.day, 'EEE', {locale: es})}</div>
                                                        <div className="text-xs">{format(h.day, 'dd/MM')}</div>
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                            <TableRow>
                                                <TableHead className="p-2 sticky left-0 bg-background z-10" colSpan={3}><Users className="inline-block mr-2"/>Comensales</TableHead>
                                                {matrizHeaders.map(h => <TableCell key={h.day.toISOString()} className="text-center font-bold border-l">{h.totalPax}</TableCell>)}
                                            </TableRow>
                                             <TableRow>
                                                <TableHead className="p-2 sticky left-0 bg-background z-10" colSpan={3}><FileDigit className="inline-block mr-2"/>Contratos (OS)</TableHead>
                                                {matrizHeaders.map(h => <TableCell key={h.day.toISOString()} className="text-center font-bold border-l">{h.totalOs}</TableCell>)}
                                            </TableRow>
                                             <TableRow>
                                                <TableHead className="p-2 sticky left-0 bg-background z-10" colSpan={3}><Component className="inline-block mr-2"/>Unidades Totales</TableHead>
                                                {matrizHeaders.map(h => <TableCell key={h.day.toISOString()} className="text-center font-bold border-l">{h.totalUnits.toFixed(2)}</TableCell>)}
                                            </TableRow>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="p-2 font-semibold sticky left-0 bg-muted z-10">Elaboración</TableHead>
                                                <TableHead className="p-2 font-semibold w-24 sticky left-[200px] bg-muted z-10">Partida</TableHead>
                                                <TableHead className="p-2 font-semibold text-center w-32 sticky left-[300px] bg-muted z-10">Total</TableHead>
                                                {matrizHeaders.map(h => <TableHead key={h.day.toISOString()} className="p-2 text-center border-l">{format(h.day, 'EEE dd/MM', {locale: es})}</TableHead>)}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {matrizData.map(row => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="p-2 font-medium sticky left-0 bg-background z-10">{row.nombre}</TableCell>
                                                    <TableCell className="p-2 sticky left-[200px] bg-background z-10"><Badge variant="outline">{row.partida}</Badge></TableCell>
                                                    <TableCell className="p-2 text-center font-bold font-mono sticky left-[300px] bg-background z-10">{row.total.toFixed(2)} {row.unidad}</TableCell>
                                                    {matrizHeaders.map(h => (
                                                        <TableCell key={h.day.toISOString()} className={cn("p-2 text-center font-mono border-l", row[format(h.day, 'yyyy-MM-dd')] === 0 && 'bg-slate-50')}>
                                                            {row[format(h.day, 'yyyy-MM-dd')] > 0 ? row[format(h.day, 'yyyy-MM-dd')].toFixed(2) : '-'}
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
                                                        <TableCell className="text-right font-mono">{receta.cantidadTotal}</TableCell>
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
                                                                                <TableCell>{receta.cantidad}</TableCell>
                                                                                <TableCell>
                                                                                    <ul className="list-disc pl-5 text-xs text-muted-foreground">
                                                                                        {receta.elaboraciones.map(elab => (
                                                                                            <li key={elab.id}>{elab.cantidadPorReceta.toFixed(2)} {elab.unidad} - {elab.nombre}</li>
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
                                <CardDescription>Vista consolidada de todas las elaboraciones necesarias para producir. Selecciona las filas para generar Órdenes de Fabricación.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12"><Checkbox 
                                                    checked={selectedRows.size > 0 && planificacionItems.filter(i => i.type === 'necesidad').length > 0 && selectedRows.size === planificacionItems.filter(i => i.type === 'necesidad').length}
                                                    onCheckedChange={(checked) => {
                                                        const needItems = planificacionItems.filter(i => i.type === 'necesidad').map(i => i.id);
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
                                            ) : planificacionItems.length > 0 ? (
                                                planificacionItems.map(item => (
                                                    <TableRow 
                                                        key={item.id} 
                                                        onClick={() => handleSelectRow(item.id)} 
                                                        className={cn('cursor-pointer', item.type === 'excedente' && 'bg-green-100/50 hover:bg-green-100/60 cursor-default')}
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
                                                                    <span>{item.type === 'excedente' && '+ '}{item.cantidad.toFixed(2)}</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <div className="p-1">
                                                                        <h4 className="font-bold mb-2 text-center">Desglose por Receta</h4>
                                                                        {item.recetas!.map((r, i) => (
                                                                            <div key={i} className="flex justify-between gap-4 text-xs">
                                                                                <span>{r.recetaNombre}:</span>
                                                                                <span className="font-semibold">{r.cantidad.toFixed(2)} {item.unidad}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell>{item.unidad}</TableCell>
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
