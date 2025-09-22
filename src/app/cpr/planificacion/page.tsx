'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DateRange } from 'react-day-picker';
import { addDays, startOfToday } from 'date-fns';
import { ClipboardList, Calendar as CalendarIcon, ChevronsUpDown, Check, PlusCircle, Factory } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';

import type { ServiceOrder, GastronomyOrder, Receta, Elaboracion, ElaboracionEnReceta, UnidadMedida } from '@/types';

type NecesidadElaboracion = {
    elaboracionId: string;
    nombre: string;
    cantidadTotal: number;
    unidad: UnidadMedida;
    osIDs: Set<string>;
};

export default function PlanificacionPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfToday(),
        to: addDays(startOfToday(), 7),
    });
    const [necesidades, setNecesidades] = useState<Map<string, NecesidadElaboracion>>(new Map());
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const calcularNecesidades = useCallback(() => {
        setIsLoading(true);
        if (!dateRange?.from || !dateRange?.to) {
            setNecesidades(new Map());
            setIsLoading(false);
            return;
        }

        const from = dateRange.from;
        const to = dateRange.to;

        // Cargar todos los datos necesarios de localStorage
        const allServiceOrders: ServiceOrder[] = JSON.parse(localStorage.getItem('serviceOrders') || '[]');
        const allGastroOrders: GastronomyOrder[] = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]');
        const allRecetas: Receta[] = JSON.parse(localStorage.getItem('recetas') || '[]');
        const allElaboraciones: Elaboracion[] = JSON.parse(localStorage.getItem('elaboraciones') || '[]');

        const recetasMap = new Map(allRecetas.map(r => [r.id, r]));
        const elaboracionesMap = new Map(allElaboraciones.map(e => [e.id, e]));

        // 1. Filtrar OS confirmadas en el rango de fechas
        const osIdsEnRango = new Set(
            allServiceOrders
                .filter(os => {
                    const osDate = new Date(os.startDate);
                    return os.status === 'Confirmado' && osDate >= from && osDate <= to;
                })
                .map(os => os.id)
        );

        // 2. Obtener los pedidos de gastronomía para esas OS
        const gastroOrdersEnRango = allGastroOrders.filter(go => osIdsEnRango.has(go.osId));

        // 3. Agregar las necesidades de elaboración
        const necesidadesAgregadas = new Map<string, NecesidadElaboracion>();

        gastroOrdersEnRango.forEach(gastroOrder => {
            (gastroOrder.items || []).forEach(item => {
                if (item.type === 'item') {
                    const receta = recetasMap.get(item.id); // El `id` del item es el `id` de la receta
                    if (receta) {
                        receta.elaboraciones.forEach(elabEnReceta => {
                            const elaboracion = elaboracionesMap.get(elabEnReceta.elaboracionId);
                            if (elaboracion) {
                                const cantidadNecesaria = (item.quantity || 0) * elabEnReceta.cantidad;
                                const existing = necesidadesAgregadas.get(elaboracion.id);

                                if (existing) {
                                    existing.cantidadTotal += cantidadNecesaria;
                                    existing.osIDs.add(gastroOrder.osId);
                                } else {
                                    necesidadesAgregadas.set(elaboracion.id, {
                                        elaboracionId: elaboracion.id,
                                        nombre: elaboracion.nombre,
                                        cantidadTotal: cantidadNecesaria,
                                        unidad: elaboracion.unidadProduccion,
                                        osIDs: new Set([gastroOrder.osId]),
                                    });
                                }
                            }
                        });
                    }
                }
            });
        });
        
        setNecesidades(necesidadesAgregadas);
        setSelectedRows(new Set()); // Limpiar selección al recalcular
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
        // TODO: Implementar lógica de generación de OF
        toast({
            title: 'Funcionalidad en desarrollo',
            description: `Se generarían OF para ${selectedRows.size} elaboraciones.`
        });
    }

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Planificación de Producción..." />;
    }

    return (
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
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Calcular Necesidades'}
                </Button>
            </div>

             <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12"><Checkbox 
                                checked={selectedRows.size > 0 && selectedRows.size === necesidades.size}
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
                            <TableHead>Eventos Afectados</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto animate-spin" /></TableCell></TableRow>
                        ) : necesidades.size > 0 ? (
                            Array.from(necesidades.values()).map(elab => (
                                <TableRow key={elab.elaboracionId} onClick={() => handleSelectRow(elab.elaboracionId)} className="cursor-pointer">
                                    <TableCell><Checkbox checked={selectedRows.has(elab.elaboracionId)} /></TableCell>
                                    <TableCell className="font-medium">{elab.nombre}</TableCell>
                                    <TableCell className="text-right font-mono">{elab.cantidadTotal.toFixed(2)}</TableCell>
                                    <TableCell>{elab.unidad}</TableCell>
                                    <TableCell>{elab.osIDs.size}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No se encontraron necesidades para el rango de fechas seleccionado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

        </div>
    );
}
