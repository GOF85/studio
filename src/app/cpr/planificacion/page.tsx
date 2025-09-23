

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { addDays, startOfToday } from 'date-fns';
import { ClipboardList, Calendar as CalendarIcon, Factory, Info, AlertTriangle, PackageCheck } from 'lucide-react';
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

import type { ServiceOrder, GastronomyOrder, Receta, Elaboracion, UnidadMedida, OrdenFabricacion, PartidaProduccion } from '@/types';

type EventoAfectado = {
    osId: string;
    serviceNumber: string;
    serviceType: string;
};

type RecetaNecesidad = {
    recetaNombre: string;
    cantidad: number;
}

type NecesidadPlanificacion = {
    id: string; // elaboracionId para necesidades, ofId para excedentes
    type: 'necesidad' | 'excedente';
    nombre: string;
    cantidad: number; // Cantidad necesaria o cantidad excedente
    unidad: UnidadMedida;
    partidaProduccion?: PartidaProduccion;
    // Para necesidades
    eventos?: EventoAfectado[];
    recetas?: RecetaNecesidad[];
    // Para excedentes
    ofId?: string;
    fechaProduccion?: string;
};


export default function PlanificacionPage() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfToday(),
        to: addDays(startOfToday(), 7),
    });
    const [itemsPlanificacion, setItemsPlanificacion] = useState<NecesidadPlanificacion[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const calcularNecesidades = useCallback(() => {
        setIsLoading(true);
        setItemsPlanificacion([]);
        setSelectedRows(new Set());

        if (!dateRange?.from || !dateRange?.to) {
            setIsLoading(false);
            return;
        }

        const from = dateRange.from;
        const to = dateRange.to;

        const allServiceOrders: ServiceOrder[] = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const allGastroOrders: GastronomyOrder[] = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
        const allRecetas: Receta[] = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
        const allElaboraciones: Elaboracion[] = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        const allOrdenesFabricacion: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        
        const recetasMap = new Map(allRecetas.map(r => [r.id, r]));
        const elaboracionesMap = new Map(allElaboraciones.map(e => [e.id, e]));
        const serviceOrderMap = new Map(allServiceOrders.map(os => [os.id, os]));

        const osIdsEnRango = new Set(
            allServiceOrders
                .filter(os => {
                    try {
                        const osDate = new Date(os.startDate);
                        return os.status === 'Confirmado' && osDate >= from && osDate <= to;
                    } catch(e) { return false; }
                })
                .map(os => os.id)
        );
        
        if (osIdsEnRango.size === 0) {
            setIsLoading(false);
            return;
        }

        const necesidadesBrutas = new Map<string, Omit<NecesidadPlanificacion, 'id' | 'type' | 'cantidad' > & {cantidadTotal: number}>();

        allGastroOrders.filter(go => osIdsEnRango.has(go.osId)).forEach(gastroOrder => {
            const serviceOrder = serviceOrderMap.get(gastroOrder.osId);
            if (!serviceOrder) return;

            (gastroOrder.items || []).forEach(item => {
                if (item.type === 'item') {
                    const receta = recetasMap.get(item.id);
                    if (receta) {
                        receta.elaboraciones.forEach(elabEnReceta => {
                            const elaboracion = elaboracionesMap.get(elabEnReceta.elaboracionId);
                            if (elaboracion) {
                                const cantidadNecesaria = Number(item.quantity || 0) * Number(elabEnReceta.cantidad);
                                if (isNaN(cantidadNecesaria) || cantidadNecesaria <= 0) return;
                                
                                let necesidad = necesidadesBrutas.get(elaboracion.id);
                                if (!necesidad) {
                                    necesidad = {
                                        nombre: elaboracion.nombre,
                                        cantidadTotal: 0,
                                        unidad: elaboracion.unidadProduccion,
                                        partidaProduccion: receta.partidaProduccion,
                                        eventos: [],
                                        recetas: [],
                                    };
                                    necesidadesBrutas.set(elaboracion.id, necesidad);
                                }

                                necesidad.cantidadTotal += cantidadNecesaria;
                                if (!necesidad.eventos!.find(e => e.osId === gastroOrder.osId && e.serviceType === gastroOrder.descripcion)) {
                                    necesidad.eventos!.push({ osId: gastroOrder.osId, serviceNumber: serviceOrder.serviceNumber, serviceType: gastroOrder.descripcion });
                                }
                                const recetaExistente = necesidad.recetas!.find(r => r.recetaNombre === receta.nombre);
                                if (recetaExistente) {
                                    recetaExistente.cantidad += cantidadNecesaria;
                                } else {
                                    necesidad.recetas!.push({ recetaNombre: receta.nombre, cantidad: cantidadNecesaria });
                                }
                            }
                        });
                    }
                }
            });
        });
        
        const ofsRelevantes = allOrdenesFabricacion.filter(of => of.osIDs.some(osId => osIdsEnRango.has(osId)));
        const cantidadesCubiertasPorElaboracion = new Map<string, number>();

        ofsRelevantes.forEach(of => {
            const finishedStates: OrdenFabricacion['estado'][] = ['Finalizado', 'Validado', 'Incidencia'];
            const isFinished = finishedStates.includes(of.estado);
            const cantidadProducida = isFinished && typeof of.cantidadReal === 'number' && of.cantidadReal !== null ? Number(of.cantidadReal) : Number(of.cantidadTotal);
            
            if (!isNaN(cantidadProducida)) {
                const current = cantidadesCubiertasPorElaboracion.get(of.elaboracionId) || 0;
                cantidadesCubiertasPorElaboracion.set(of.elaboracionId, current + cantidadProducida);
            }
        });

        const planificacionFinal: NecesidadPlanificacion[] = [];
        necesidadesBrutas.forEach((necesidad, elabId) => {
            const cantidadCubierta = cantidadesCubiertasPorElaboracion.get(elabId) || 0;
            const diferencia = necesidad.cantidadTotal - cantidadCubierta;

            if (diferencia > 0.001) { // Necesidad Neta
                planificacionFinal.push({ ...necesidad, id: elabId, type: 'necesidad', cantidad: diferencia });
            }
        });
        
        setItemsPlanificacion(planificacionFinal);
        setIsLoading(false);
    }, [dateRange]);

    useEffect(() => {
        setIsMounted(true);
        calcularNecesidades();
    }, [calcularNecesidades]);

    const handleSelectRow = (id: string, type: 'necesidad' | 'excedente') => {
        if (type === 'excedente') {
            toast({ variant: 'destructive', title: "Acción no permitida", description: "No se pueden generar OF a partir de un excedente." });
            return;
        }
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
            const necesidad = itemsPlanificacion.find(item => item.id === elaboracionId && item.type === 'necesidad');
            if(necesidad && necesidad.partidaProduccion) {
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
                    <Button onClick={handleGenerateOF} disabled={selectedRows.size === 0}>
                        <Factory className="mr-2"/> Generar Órdenes de Fabricación ({selectedRows.size})
                    </Button>
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

                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12"><Checkbox 
                                    checked={selectedRows.size > 0 && itemsPlanificacion.filter(i => i.type === 'necesidad').length > 0 && selectedRows.size === itemsPlanificacion.filter(i => i.type === 'necesidad').length}
                                    onCheckedChange={(checked) => {
                                        if(checked) {
                                            setSelectedRows(new Set(itemsPlanificacion.filter(i => i.type === 'necesidad').map(i => i.id)))
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
                            ) : itemsPlanificacion.length > 0 ? (
                                itemsPlanificacion.map(item => (
                                    <TableRow key={item.id} onClick={() => handleSelectRow(item.id, item.type)} className={item.type === 'necesidad' ? 'cursor-pointer' : ''}>
                                        <TableCell>
                                           {item.type === 'necesidad' ? (
                                                <Checkbox checked={selectedRows.has(item.id)} />
                                            ) : (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <PackageCheck className="text-green-600"/>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Este es un lote de excedente.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">{item.nombre}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span>{item.cantidad.toFixed(2)}</span>
                                                </TooltipTrigger>
                                                {item.type === 'necesidad' && (
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
                                                )}
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>{item.unidad}</TableCell>
                                        <TableCell>
                                            {item.type === 'necesidad' ? (
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
                                            ) : (
                                                 <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="outline" size="sm">Utilizar Excedente</Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Confirmar Uso de Excedente</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Vas a utilizar el lote de excedente <strong>{item.ofId}</strong>. Por favor, confirma o ajusta la cantidad real disponible en stock.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="real-quantity">Cantidad Real Disponible</Label>
                                                            <Input id="real-quantity" type="number" defaultValue={item.cantidad.toFixed(2)} />
                                                        </div>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction disabled>Confirmar y Asignar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                 </AlertDialog>
                                            )}
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
            </div>
        </TooltipProvider>
    );
}
