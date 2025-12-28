'use client';

import { ChefHat, Info } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { formatNumber, formatUnit } from '@/lib/utils';
import type { NecesidadItem } from '@/hooks/use-cpr-of-logic';

interface OfNeedsTableProps {
    type: 'netas' | 'cubiertas';
    necesidades: NecesidadItem[];
    necesidadesCubiertas: NecesidadItem[];
    selectedNecesidades: Set<string>;
    handleSelectNecesidad: (id: string, checked: boolean) => void;
    setSelectedNecesidades: (ids: Set<string>) => void;
    handleGenerateOFs: () => void;
}

export function OfNeedsTable({
    type,
    necesidades,
    necesidadesCubiertas,
    selectedNecesidades,
    handleSelectNecesidad,
    setSelectedNecesidades,
    handleGenerateOFs
}: OfNeedsTableProps) {
    if (type === 'cubiertas') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">Necesidades Cubiertas</CardTitle>
                    <CardDescription>Elaboraciones cuya producción ya está planificada o cubierta por el stock para el periodo seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-40">Elaboración</TableHead>
                                    <TableHead>Partida</TableHead>
                                    <TableHead className="text-right">Necesidad Total</TableHead>
                                    <TableHead className="text-right">Stock Utilizado</TableHead>
                                    <TableHead className="text-right">Planificado</TableHead>
                                    <TableHead className="text-right font-bold text-green-600">Excedente/Sobrante</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {necesidadesCubiertas.length > 0 ? necesidadesCubiertas.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-semibold">{item.nombre}</TableCell>
                                        <TableCell><Badge variant="secondary">{item.partida}</Badge></TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.cantidadNecesariaTotal, 2)} {formatUnit(item.unidad)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.stockDisponible || 0, 2)} {formatUnit(item.unidad)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.cantidadPlanificada || 0, 2)} {formatUnit(item.unidad)}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-green-600">{formatNumber(Math.abs(item.cantidadNeta), 2)} {formatUnit(item.unidad)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No hay necesidades cubiertas para mostrar.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2"><ChefHat />Necesidades de Producción Agregadas</CardTitle>
                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={handleGenerateOFs} disabled={selectedNecesidades.size === 0}>
                            Generar OF para la selección ({selectedNecesidades.size})
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox onCheckedChange={(checked) => {
                                            const allIds = new Set(necesidades.map(i => i.id));
                                            setSelectedNecesidades(checked ? allIds : new Set());
                                        }} />
                                    </TableHead>
                                    <TableHead className="min-w-40">Elaboración</TableHead>
                                    <TableHead>Partida</TableHead>
                                    <TableHead className="text-right">Necesidad Total</TableHead>
                                    <TableHead className="text-right">Stock Disp.</TableHead>
                                    <TableHead className="text-right">Planificado</TableHead>
                                    <TableHead className="text-right font-bold text-primary">Necesidad Neta</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {necesidades.length > 0 ? necesidades.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Checkbox 
                                                checked={selectedNecesidades.has(item.id)} 
                                                onCheckedChange={(checked) => handleSelectNecesidad(item.id, !!checked)} 
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="font-semibold cursor-help flex items-center gap-2">
                                                        <Info className="h-4 w-4 text-muted-foreground" />
                                                        <span>{item.nombre}</span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="p-2 max-w-md">
                                                    <div className="space-y-1">
                                                        <p className="font-bold mb-1">Referencias que requieren esta elaboración:</p>
                                                        {item.desgloseCompleto.map((d, i) => (
                                                            <p key={i} className="text-xs">
                                                                {format(new Date(d.fechaHito), 'dd/MM')}: {d.cantidadReceta} x "{d.recetaNombre}" &rarr; {formatNumber(d.cantidadNecesaria, 2)} {formatUnit(item.unidad)}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell><Badge variant="secondary">{item.partida}</Badge></TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.cantidadNecesariaTotal, 2)} {formatUnit(item.unidad)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.stockDisponible || 0, 2)} {formatUnit(item.unidad)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.cantidadPlanificada || 0, 2)} {formatUnit(item.unidad)}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-primary">{formatNumber(item.cantidadNeta, 2)} {formatUnit(item.unidad)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No hay necesidades de producción en el rango de fechas seleccionado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
