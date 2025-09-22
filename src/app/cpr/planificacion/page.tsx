'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { addDays, startOfToday } from 'date-fns';
import { ClipboardList, Calendar as CalendarIcon, Factory, Info, AlertTriangle } from 'lucide-react';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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

type NecesidadElaboracion = {
    elaboracionId: string;
    nombre: string;
    cantidadTotal: number;
    unidad: UnidadMedida;
    eventos: EventoAfectado[];
    recetas: RecetaNecesidad[];
    partidaProduccion: PartidaProduccion;
};

export default function PlanificacionPage() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfToday(),
        to: addDays(startOfToday(), 7),
    });
    const [necesidades, setNecesidades] = useState<Map<string, NecesidadElaboracion>>(new Map());
    const [incidencias, setIncidencias] = useState<OrdenFabricacion[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const calcularNecesidades = useCallback(() => {
        setIsLoading(true);

        const allOrdenesFabricacion: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        setIncidencias(allOrdenesFabricacion.filter(of => of.estado === 'Incidencia'));

        if (!dateRange?.from || !dateRange?.to) {
            setNecesidades(new Map());
            setIsLoading(false);
            return;
        }

        const from = dateRange.from;
        const to = dateRange.to;

        const allServiceOrders: ServiceOrder[] = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const allGastroOrders: GastronomyOrder[] = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
        const allRecetas: Receta[] = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
        const allElaboraciones: Elaboracion[] = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        

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
            setNecesidades(new Map());
            setIsLoading(false);
            return;
        }

        const gastroOrdersEnRango = allGastroOrders.filter(go => osIdsEnRango.has(go.osId));

        const necesidadesBrutas = new Map<string, NecesidadElaboracion>();

        gastroOrdersEnRango.forEach(gastroOrder => {
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
                                if (isNaN(cantidadNecesaria)) return;
                                
                                const existing = necesidadesBrutas.get(elaboracion.id);

                                if (existing) {
                                    existing.cantidadTotal += cantidadNecesaria;
                                    const eventoExistente = existing.eventos.find(e => e.osId === gastroOrder.osId && e.serviceType === gastroOrder.descripcion);
                                    if (!eventoExistente) {
                                        existing.eventos.push({ osId: gastroOrder.osId, serviceNumber: serviceOrder.serviceNumber, serviceType: gastroOrder.descripcion });
                                    }
                                    const recetaExistente = existing.recetas.find(r => r.recetaNombre === receta.nombre);
                                    if (recetaExistente) {
                                        recetaExistente.cantidad += cantidadNecesaria;
                                    } else {
                                        existing.recetas.push({ recetaNombre: receta.nombre, cantidad: cantidadNecesaria });
                                    }
                                } else {
                                    necesidadesBrutas.set(elaboracion.id, {
                                        elaboracionId: elaboracion.id,
                                        nombre: elaboracion.nombre,
                                        cantidadTotal: cantidadNecesaria,
                                        unidad: elaboracion.unidadProduccion,
                                        partidaProduccion: receta.partidaProduccion,
                                        eventos: [{ osId: gastroOrder.osId, serviceNumber: serviceOrder.serviceNumber, serviceType: gastroOrder.descripcion }],
                                        recetas: [{ recetaNombre: receta.nombre, cantidad: cantidadNecesaria }],
                                    });
                                }
                            }
                        });
                    }
                }
            });
        });
        
        const ofsRelevantes = allOrdenesFabricacion.filter(of => 
            of.osIDs.some(osId => osIdsEnRango.has(osId))
        );

        const cantidadesCubiertasPorElaboracion = new Map<string, number>();
        ofsRelevantes.forEach(of => {
            const isFinished = ['Finalizado', 'Validado', 'Incidencia'].includes(of.estado);
            const cantidadACubrir = isFinished && typeof of.cantidadReal === 'number' ? Number(of.cantidadReal) : Number(of.cantidadTotal);
            if (!isNaN(cantidadACubrir)) {
                cantidadesCubiertasPorElaboracion.set(of.elaboracionId, (cantidadesCubiertasPorElaboracion.get(of.elaboracionId) || 0) + cantidadACubrir);
            }
        });

        const necesidadesNetas = new Map<string, NecesidadElaboracion>();
        necesidadesBrutas.forEach((necesidad, elabId) => {
            const cantidadCubierta = cantidadesCubiertasPorElaboracion.get(elabId) || 0;
            const necesidadNeta = necesidad.cantidadTotal - cantidadCubierta;

            if (necesidadNeta > 0.001) { // Use a small epsilon to avoid floating point issues
                necesidadesNetas.set(elabId, { ...necesidad, cantidadTotal: necesidadNeta });
            }
        });
        
        setNecesidades(necesidadesNetas);
        setSelectedRows(new Set());
        setIsLoading(false);
    }, [dateRange]);

    useEffect(() => {
        setIsMounted(true);
        calcularNecesidades();
    }, [calcularNecesidades]);

    const handleSelectRow = (elaboracionId: string) => {
        setSelectedRows(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(elaboracionId)) {
                newSelection.delete(elaboracionId);
            } else {
                newSelection.add(elaboracionId);
            }
            return newSelection;
        });
    };
    
    const handleGenerateOF = () => {
        if (selectedRows.size === 0) {
            toast({
                variant: 'destructive',
                title: 'No hay selección',
                description: 'Selecciona al menos una elaboración para generar una Orden de Fabricación.'
            });
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
            const necesidad = necesidades.get(elaboracionId);
            if(necesidad) {
                currentIdNumber++;
                const newOF: OrdenFabricacion = {
                    id: `OF-${new Date().getFullYear()}-${currentIdNumber.toString().padStart(3, '0')}`,
                    fechaCreacion: new Date().toISOString(),
                    fechaProduccionPrevista: dateRange?.from?.toISOString() || new Date().toISOString(),
                    elaboracionId: necesidad.elaboracionId,
                    elaboracionNombre: necesidad.nombre,
                    cantidadTotal: necesidad.cantidadTotal,
                    unidad: necesidad.unidad,
                    partidaAsignada: necesidad.partidaProduccion,
                    estado: 'Pendiente',
                    osIDs: Array.from(new Set(necesidad.eventos.map(e => e.osId))),
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
        
        // Recalcular necesidades para actualizar la tabla
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
                        {isLoading ? 'Calculando...' : 'Calcular Necesidades'}
                    </Button>
                </div>

                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12"><Checkbox 
                                    checked={selectedRows.size > 0 && necesidades.size > 0 && selectedRows.size === necesidades.size}
                                    onCheckedChange={(checked) => {
                                        if(checked) {
                                            setSelectedRows(new Set(Array.from(necesidades.keys())))
                                        } else {
                                            setSelectedRows(new Set())
                                        }
                                    }}
                                /></TableHead>
                                <TableHead>Elaboración</TableHead>
                                <TableHead className="text-right">Cantidad Total Necesaria</TableHead>
                                <TableHead>Unidad</TableHead>
                                <TableHead className="flex items-center gap-1.5">Eventos Afectados <Info size={14}/></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Calculando...</TableCell></TableRow>
                            ) : necesidades.size > 0 ? (
                                Array.from(necesidades.values()).map(elab => (
                                    <TableRow key={elab.elaboracionId} onClick={() => handleSelectRow(elab.elaboracionId)} className="cursor-pointer">
                                        <TableCell><Checkbox checked={selectedRows.has(elab.elaboracionId)} /></TableCell>
                                        <TableCell className="font-medium">{elab.nombre}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span>{elab.cantidadTotal.toFixed(2)}</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div className="p-1">
                                                        <h4 className="font-bold mb-2 text-center">Desglose por Receta</h4>
                                                        {elab.recetas.map((r, i) => (
                                                            <div key={i} className="flex justify-between gap-4 text-xs">
                                                                <span>{r.recetaNombre}:</span>
                                                                <span className="font-semibold">{r.cantidad.toFixed(2)} {elab.unidad}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>{elab.unidad}</TableCell>
                                        <TableCell>
                                             <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="flex items-center gap-1.5">{elab.eventos.length} <Info size={14}/></span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div className="p-1">
                                                        <h4 className="font-bold mb-2 text-center">Eventos Implicados</h4>
                                                        {elab.eventos.map((e, i) => (
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

                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-destructive"><AlertTriangle/>Informe de Incidencias</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Lote / OF</TableHead>
                                        <TableHead>Elaboración</TableHead>
                                        <TableHead>Fecha Prevista</TableHead>
                                        <TableHead>Responsable</TableHead>
                                        <TableHead>Observaciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {incidencias.length > 0 ? (
                                        incidencias.map(incidencia => (
                                            <TableRow key={incidencia.id} className="cursor-pointer hover:bg-destructive/10" onClick={() => router.push(`/cpr/of/${incidencia.id}`)}>
                                                <TableCell className="font-mono">{incidencia.id}</TableCell>
                                                <TableCell>{incidencia.elaboracionNombre}</TableCell>
                                                <TableCell>{format(new Date(incidencia.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell>{incidencia.responsable}</TableCell>
                                                <TableCell className="max-w-xs truncate">{incidencia.incidenciaObservaciones}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No hay incidencias registradas.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </TooltipProvider>
    );
}
