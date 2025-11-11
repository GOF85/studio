
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import type { Receta, Elaboracion, IngredienteInterno, ArticuloERP, HistoricoPreciosERP } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Combobox } from '@/components/ui/combobox';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type CosteHistoricoPunto = {
    fecha: string;
    coste: number;
    ingredientesModificados: { nombre: string; precioAntiguo: number; precioNuevo: number }[];
};

type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

export default function EvolucionCostesPage() {
    const [allRecetas, setAllRecetas] = useState<Receta[]>([]);
    const [allElaboraciones, setAllElaboraciones] = useState<Map<string, Elaboracion>>(new Map());
    const [allIngredientes, setAllIngredientes] = useState<Map<string, IngredienteConERP>>(new Map());
    const [allArticulosERP, setAllArticulosERP] = useState<Map<string, ArticuloERP>>(new Map());
    const [allHistorico, setAllHistorico] = useState<HistoricoPreciosERP[]>([]);
    
    const [selectedRecetaId, setSelectedRecetaId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setAllRecetas(JSON.parse(localStorage.getItem('recetas') || '[]'));
        setAllElaboraciones(new Map((JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[]).map(e => [e.id, e])));
        
        const erpItems = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
        const erpMap = new Map(erpItems.map(item => [item.idreferenciaerp, item]));
        setAllArticulosERP(erpMap);

        const ingredientes = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
        const ingredientesConErp = ingredients.map(ing => ({ ...ing, erp: erpMap.get(ing.productoERPlinkId) }));
        setAllIngredientes(new Map(ingredientesConErp.map(i => [i.id, i])));

        setAllHistorico(JSON.parse(localStorage.getItem('historicoPreciosERP') || '[]'));
        
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
            .map(h => h.fecha.split('T')[0]))]
            .sort();

        let previousCost = 0;
        const dataPoints: CosteHistoricoPunto[] = [];

        fechasDeCambio.forEach((fechaStr, index) => {
            const fecha = new Date(fechaStr);
            const costeActual = calculateRecetaCost(selectedReceta, fecha);
            
            const prevFecha = index > 0 ? new Date(fechasDeCambio[index - 1]) : new Date('1970-01-01');
            const ingredientesModificados = allRelevantIngERPIds.map(erpId => {
                const precioNuevo = getPrecioHistorico(erpId, fecha);
                const precioAntiguo = getPrecioHistorico(erpId, prevFecha);
                if (Math.abs(precioNuevo - precioAntiguo) > 0.001) {
                    return { nombre: allArticulosERP.get(erpId)?.nombreProductoERP || erpId, precioAntiguo, precioNuevo };
                }
                return null;
            }).filter((i): i is NonNullable<typeof i> => i !== null);


            if(index === 0 || Math.abs(costeActual - previousCost) > 0.001) {
                dataPoints.push({
                    fecha: fechaStr,
                    coste: costeActual,
                    ingredientesModificados,
                });
                previousCost = costeActual;
            }
        });

        return dataPoints;

    }, [selectedReceta, allHistorico, allElaboraciones, allIngredientes, allArticulosERP]);

    const chartData = useMemo(() => {
        return historicalData?.map(d => ({
            fecha: format(new Date(d.fecha), 'dd MMM yy', { locale: es }),
            coste: d.coste,
        }));
    }, [historicalData]);

    return (
        <div>
            <h1 className="text-3xl font-headline font-bold mb-6">Evolución de Costes de Recetas</h1>
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
                                        <Area type="monotone" dataKey="coste" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" />
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
                                        const prevCoste = index > 0 ? historicalData[index - 1].coste : 0;
                                        const variacion = data.coste - prevCoste;
                                        const variacionPct = prevCoste > 0 ? variacion / prevCoste : 0;
                                        return (
                                            <TableRow key={data.fecha}>
                                                <TableCell>{format(new Date(data.fecha), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="text-right font-semibold">{formatCurrency(data.coste)}</TableCell>
                                                <TableCell className={cn("text-right font-mono", variacion > 0 ? 'text-destructive' : 'text-green-600')}>
                                                    {index > 0 && (
                                                        <div className="flex items-center justify-end gap-1">
                                                          {variacion > 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
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
        </div>
    );
}

