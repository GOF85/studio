
'use client';

import { useState, useEffect, useMemo } from 'react';
import { History, Search } from 'lucide-react';
import type { StockMovimiento, ArticuloERP, Ubicacion } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatNumber, formatUnit, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function TrazabilidadPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [movimientos, setMovimientos] = useState<StockMovimiento[]>([]);
    const [articulosMap, setArticulosMap] = useState<Map<string, ArticuloERP>>(new Map());
    const [ubicacionesMap, setUbicacionesMap] = useState<Map<string, Ubicacion>>(new Map());

    useEffect(() => {
        const storedMovimientos = (JSON.parse(localStorage.getItem('stockMovimientos') || '[]') as StockMovimiento[])
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        setMovimientos(storedMovimientos);

        const storedArticulos = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
        setArticulosMap(new Map(storedArticulos.map(a => [a.idreferenciaerp, a])));
        
        const storedUbicaciones = JSON.parse(localStorage.getItem('ubicaciones') || '[]') as Ubicacion[];
        setUbicacionesMap(new Map(storedUbicaciones.map(u => [u.id, u])));

        setIsMounted(true);
    }, []);

    const filteredMovimientos = useMemo(() => {
        return movimientos.filter(m => {
            const articulo = articulosMap.get(m.articuloErpId);
            const term = searchTerm.toLowerCase();
            return (
                (articulo?.nombreProductoERP || '').toLowerCase().includes(term) ||
                m.responsable.toLowerCase().includes(term) ||
                m.concepto.toLowerCase().includes(term) ||
                m.tipo.toLowerCase().includes(term)
            );
        });
    }, [movimientos, searchTerm, articulosMap]);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Trazabilidad..." />;
    }

    return (
        <main>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><History />Trazabilidad de Inventario</h1>
            </div>
             <div className="flex gap-4 mb-4">
                <Input
                    placeholder="Buscar por producto, responsable, concepto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-md"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Movimientos de Stock</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg max-h-[70vh] overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary">
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Tipo Movimiento</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                    <TableHead>Ubicación</TableHead>
                                    <TableHead>Responsable</TableHead>
                                    <TableHead>Concepto/Motivo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMovimientos.length > 0 ? filteredMovimientos.map(m => {
                                    const articulo = articulosMap.get(m.articuloErpId);
                                    const ubicacionOrigen = m.ubicacionOrigenId ? ubicacionesMap.get(m.ubicacionOrigenId)?.nombre : '';
                                    const ubicacionDestino = m.ubicacionDestinoId ? ubicacionesMap.get(m.ubicacionDestinoId)?.nombre : '';
                                    let ubicacionDisplay = ubicacionOrigen;
                                    if(m.tipo === 'MOVIMIENTO_SALIDA') ubicacionDisplay = `${ubicacionOrigen} -> ${ubicacionDestino}`;
                                    if(m.tipo === 'MOVIMIENTO_ENTRADA') ubicacionDisplay = `${ubicacionDestino}`;

                                    return (
                                        <TableRow key={m.id}>
                                            <TableCell className="text-xs">{format(new Date(m.fecha), 'dd/MM/yy HH:mm')}</TableCell>
                                            <TableCell className="font-medium">{articulo?.nombreProductoERP || m.articuloErpId}</TableCell>
                                            <TableCell><Badge variant="outline">{m.tipo.replace('_', ' ')}</Badge></TableCell>
                                            <TableCell className={`text-right font-mono ${m.cantidad < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                                {m.cantidad > 0 ? '+' : ''}{formatNumber(m.cantidad, 3)} {formatUnit(articulo?.unidad || '')}
                                            </TableCell>
                                            <TableCell>{ubicacionDisplay}</TableCell>
                                            <TableCell>{m.responsable}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{m.concepto}</TableCell>
                                        </TableRow>
                                    )
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            No hay movimientos de stock registrados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </main>
    )
}

    