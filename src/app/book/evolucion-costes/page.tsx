
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, BarChart, Bar } from 'recharts';
import type { Receta, Elaboracion, IngredienteInterno, ArticuloERP, HistoricoPreciosERP } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Combobox } from '@/components/ui/combobox';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Calendar as CalendarIcon, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type CosteHistoricoPunto = {
    fecha: string;
    coste: number;
    ingredientesModificados: { nombre: string; precioAntiguo: number; precioNuevo: number }[];
};

type VariacionPrecio = {
    id: string;
    ingredienteNombre: string;
    fecha: string;
    precioAnterior: number;
    precioNuevo: number;
    variacion: number;
    variacionPct: number;
    recetasAfectadas: string[];
}

type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

export default function EvolucionCostesPage() {
    const [allRecetas, setAllRecetas] = useState<Receta[]>([]);
    const [allElaboraciones, setAllElaboraciones] = useState<Map<string, Elaboracion>>(new Map());
    const [allIngredientes, setAllIngredientes] = useState<Map<string, IngredienteConERP>>(new Map());
    const [allArticulosERP, setAllArticulosERP] = useState<Map<string, ArticuloERP>>(new Map());
    const [allHistorico, setAllHistorico] = useState<HistoricoPreciosERP[]>([]);
    
    const [selectedRecetaId, setSelectedRecetaId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    useEffect(() => {
        setAllRecetas(JSON.parse(localStorage.getItem('recetas') || '[]'));
        setAllElaboraciones(new Map((JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[]).map(e => [e.id, e])));
        
        const erpItems = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
        const erpMap = new Map(erpItems.map(item => [item.idreferenciaerp, item]));
        setAllArticulosERP(erpMap);

        const ingredientes = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
        const ingredientesConErp = ingredientes.map(ing => ({ ...ing, erp: erpMap.get(ing.productoERPlinkId) }));
        setAllIngredientes(new Map(ingredientesConErp.map(i => [i.id, i])));

        const historicoData = JSON.parse(localStorage.getItem('historicoPreciosERP') || '[]') as HistoricoPreciosERP[];
        historicoData.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        setAllHistorico(historicoData);
        
        setIsMounted(true);
    }, []);

    const recetaOptions = useMemo(() => allRecetas.map(r => ({ label: r.nombre, value: r.id })), [allRecetas]);
    const selectedReceta = useMemo(() => allRecetas.find(r => r.id === selectedRecetaId), [allRecetas, selectedRecetaId]);

    const historicalData = useMemo(() => {
        if (!selectedReceta) return null;

        const getPrecioHistorico = (erpId: string, fecha: Date): number => {
            const relevantPrices = allHistorico
                .filter(h => h.articuloErpId === erpId && new Date(h.fecha) <= fecha)
                .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            return relevantPrices[0]?.precioCalculado ?? allArticulosERP.get(erpId)?.precio ?? 0;
        };

        const calculateElabCost = (elabId: string, fecha: Date): number => {
            const elab = allElaboraciones.get(elabId);
            if (!elab) return 0;

            const elabCost = (elab.componentes || []).reduce((sum, comp) => {
                let componentCost = 0;
                if (comp.tipo === 'ingrediente') {
                    const ingrediente = allIngredientes.get(comp.componenteId);
                    if (ingrediente?.erp) {
                        componentCost = getPrecioHistorico(ingrediente.erp.idreferenciaerp, fecha) * comp.cantidad;
                    }
                } else {
                    componentCost = calculateElabCost(comp.componenteId, fecha) * comp.cantidad;
                }
                return sum + (componentCost * (1 + (comp.merma || 0) / 100));
            }, 0);
            return elab.produccionTotal > 0 ? elabCost / elab.produccionTotal : 0;
        };

        const calculateRecetaCost = (receta: Receta, fecha: Date): number => {
            return (receta.elaboraciones || []).reduce((sum, elabEnReceta) => {
                const elabCost = calculateElabCost(elabEnReceta.elaboracionId, fecha);
                return sum + (elabCost * elabEnReceta.cantidad);
            }, 0);
        };
        
        let allRelevantIngERPIds: string[] = [];
        const getDependencies = (elabId: string) => {
            const elab = allElaboraciones.get(elabId);
            if (!elab) return;
            (elab.componentes || []).forEach(c => {
                if (c.tipo === 'ingrediente') {
                    const ing = allIngredientes.get(c.componenteId);
                    if (ing?.erp) allRelevantIngERPIds.push(ing.erp.idreferenciaerp);
                } else {
                    getDependencies(c.componenteId);
                }
            });
        };
        (selectedReceta.elaboraciones || []).forEach(e => getDependencies(e.elaboracionId));
        allRelevantIngERPIds = [...new Set(allRelevantIngERPIds)];
        
        const fechasDeCambio = [...new Set(allHistorico
            .filter(h => allRelevantIngERPIds.includes(h.articuloErpId))
            .map(h => h.fecha))];
            
        const dataPoints: CosteHistoricoPunto[] = [];
        
        // Add initial state
        const initialCost = calculateRecetaCost(selectedReceta, new Date(fechasDeCambio[0] || '1970-01-01'));
        dataPoints.push({
            fecha: fechasDeCambio[0] || new Date().toISOString(),
            coste: initialCost,
            ingredientesModificados: [], // No previous change to compare to
        });
        
        fechasDeCambio.forEach((fechaISO) => {
            const fecha = new Date(fechaISO);
            const costeActual = calculateRecetaCost(selectedReceta, fecha);
            const fechaAnterior = new Date(fecha.getTime() - 1); // 1 millisecond before
            
            const ingredientesModificados = allRelevantIngERPIds.map(erpId => {
                const precioNuevo = getPrecioHistorico(erpId, fecha);
                const precioAntiguo = getPrecioHistorico(erpId, fechaAnterior);
                if (Math.abs(precioNuevo - precioAntiguo) > 0.001) {
                    return { nombre: allArticulosERP.get(erpId)?.nombreProductoERP || erpId, precioAntiguo, precioNuevo };
                }
                return null;
            }).filter((i): i is NonNullable<typeof i> => i !== null);
            
            if (ingredientesModificados.length > 0) {
                 const lastDataPoint = dataPoints[dataPoints.length - 1];
                 if (!lastDataPoint || Math.abs(costeActual - lastDataPoint.coste) > 0.001) {
                    dataPoints.push({ fecha: fechaISO, coste: costeActual, ingredientesModificados });
                 } else {
                    lastDataPoint.ingredientesModificados.push(...ingredientesModificados);
                 }
            }
        });
        
        return dataPoints.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    }, [selectedReceta, allHistorico, allElaboraciones, allIngredientes, allArticulosERP]);

    const chartData = useMemo(() => {
        if (!historicalData || historicalData.length < 1) return [];

        const dataForChart = historicalData.map(d => ({
            fecha: format(parseISO(d.fecha), 'dd MMM yy', { locale: es }),
            coste: d.coste,
        }));
        
        if (dataForChart.length === 1) {
             return [ dataForChart[0] ];
        }
        
        return dataForChart;
    }, [historicalData]);

    const variacionesIngredientes = useMemo(() => {
        if (!dateRange?.from) return [];
        
        const ingredientesUsados: Map<string, string[]> = new Map();
        allRecetas.forEach(receta => {
            const getIngredientes = (elabId: string) => {
                const elab = allElaboraciones.get(elabId);
                if (!elab) return;
                (elab.componentes || []).forEach(comp => {
                    if (comp.tipo === 'ingrediente') {
                        const ing = allIngredientes.get(comp.componenteId);
                        if(ing?.erp) {
                            const current = ingredientesUsados.get(ing.erp.idreferenciaerp) || [];
                            if (!current.includes(receta.nombre)) {
                                ingredientesUsados.set(ing.erp.idreferenciaerp, [...current, receta.nombre]);
                            }
                        }
                    } else {
                        getIngredientes(comp.componenteId);
                    }
                })
            }
            receta.elaboraciones.forEach(e => getIngredientes(e.elaboracionId));
        });

        const cambios = allHistorico.filter(h => {
            const fecha = new Date(h.fecha);
            const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
            return isWithinInterval(fecha, { start: startOfDay(dateRange.from!), end: to });
        });

        return cambios.map(cambio => {
            const historialArticulo = allHistorico.filter(h => h.articuloErpId === cambio.articuloErpId);
            const cambioIndex = historialArticulo.findIndex(h => h.id === cambio.id);
            const precioAnterior = cambioIndex > 0 ? historialArticulo[cambioIndex - 1].precioCalculado : (allArticulosERP.get(cambio.articuloErpId)?.precio || 0);
            
            const variacion = cambio.precioCalculado - precioAnterior;
            const variacionPct = precioAnterior > 0 ? variacion / precioAnterior : 0;
            
            return {
                id: cambio.id,
                ingredienteNombre: allArticulosERP.get(cambio.articuloErpId)?.nombreProductoERP || cambio.articuloErpId,
                fecha: cambio.fecha,
                precioAnterior,
                precioNuevo: cambio.precioCalculado,
                variacion,
                variacionPct,
                recetasAfectadas: ingredientesUsados.get(cambio.articuloErpId) || []
            }
        }).sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    }, [dateRange, allHistorico, allArticulosERP, allIngredientes, allElaboraciones, allRecetas]);
    
    return (
        <div>
            <h1 className="text-3xl font-headline font-bold mb-6">Evolución de Costes</h1>
            <Tabs defaultValue="receta">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="receta">Evolución por Receta</TabsTrigger>
                    <TabsTrigger value="ingrediente">Evolución por Ingrediente</TabsTrigger>
                </TabsList>
                <TabsContent value="receta" className="mt-4">
                    <div className="max-w-md mb-8">
                        <Combobox 
                            options={recetaOptions}
                            value={selectedRecetaId || ''}
                            onChange={setSelectedRecetaId}
                            placeholder="Selecciona una receta para analizar..."
                        />
                    </div>
                    {selectedReceta && historicalData && (
                        <div className="space-y-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Evolución del Coste de Materia Prima para: {selectedReceta.nombre}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {chartData && chartData.length > 1 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <AreaChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="fecha" />
                                                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                                                <Tooltip formatter={(value: number) => [formatCurrency(value), "Coste"]} />
                                                <Legend />
                                                <Area type="step" dataKey="coste" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-10">No hay suficientes datos históricos para generar un gráfico para esta receta.</p>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Desglose de Cambios de Precio</CardTitle>
                                    <CardDescription>Eventos de cambio de precio que afectaron el coste de esta receta.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead className="text-right">Coste Total Receta</TableHead>
                                                <TableHead className="text-right">Variación</TableHead>
                                                <TableHead>Ingredientes Modificados</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {historicalData.length > 0 ? historicalData.map((data, index) => {
                                                const prevCoste = index > 0 ? historicalData[index - 1].coste : data.coste; // Compare to itself if first
                                                const variacion = data.coste - prevCoste;
                                                const variacionPct = prevCoste > 0 ? variacion / prevCoste : 0;
                                                if (index === 0 && historicalData.length > 1) return null; // Don't show the initial state if there are changes

                                                return (
                                                    <TableRow key={data.fecha}>
                                                        <TableCell>{format(new Date(data.fecha), 'dd/MM/yyyy HH:mm')}</TableCell>
                                                        <TableCell className="text-right font-semibold">{formatCurrency(data.coste)}</TableCell>
                                                        <TableCell className={cn("text-right font-mono", variacion > 0 ? 'text-destructive' : 'text-green-600')}>
                                                            {index > 0 && (
                                                                <div className="flex items-center justify-end gap-1">
                                                                {variacion !== 0 && (variacion > 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/>)}
                                                                {formatCurrency(variacion)} ({formatPercentage(variacionPct)})
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <ul className="text-xs space-y-1">
                                                                {data.ingredientesModificados.map((ing, i) => (
                                                                    <li key={i}>{ing.nombre}: {formatCurrency(ing.precioAntiguo)} &rarr; {formatCurrency(ing.precioNuevo)}</li>
                                                                ))}
                                                            </ul>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            }) : (
                                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay datos históricos de precios para los ingredientes de esta receta.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="ingrediente" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Variación de Precios por Ingrediente</CardTitle>
                            <div className="flex items-center gap-4 pt-4">
                                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.from && range?.to) { setIsDatePickerOpen(false); }}} numberOfMonths={2} locale={es}/>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ingrediente ERP</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead className="text-right">Precio Anterior</TableHead>
                                        <TableHead className="text-right">Precio Nuevo</TableHead>
                                        <TableHead className="text-right">Variación</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {variacionesIngredientes.length > 0 ? variacionesIngredientes.map(v => (
                                        <TableRow key={v.id}>
                                            <TableCell>
                                                 <ShadTooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="font-semibold cursor-help flex items-center gap-2">{v.ingredienteNombre} <Info className="h-4 w-4 text-muted-foreground"/></span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="font-bold">Recetas Afectadas:</p>
                                                        {v.recetasAfectadas.length > 0 ? (
                                                            <ul className="list-disc list-inside text-xs">
                                                                {v.recetasAfectadas.map(r => <li key={r}>{r}</li>)}
                                                            </ul>
                                                        ) : <p className="text-xs italic">No se usa en recetas.</p>}
                                                    </TooltipContent>
                                                </ShadTooltip>
                                            </TableCell>
                                            <TableCell>{format(new Date(v.fecha), 'dd/MM/yyyy HH:mm')}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(v.precioAnterior)}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(v.precioNuevo)}</TableCell>
                                            <TableCell className={cn("text-right font-mono font-bold", v.variacion > 0 ? 'text-destructive' : 'text-green-600')}>
                                                {v.variacion > 0 ? '+' : ''}{formatCurrency(v.variacion)} ({formatPercentage(v.variacionPct)})
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay variaciones de precio en el periodo seleccionado.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                     </Card>
                </TabsContent>
            </Tabs>
        </div>
    );

    