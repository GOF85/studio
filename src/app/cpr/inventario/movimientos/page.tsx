

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { StockMovimiento, ArticuloERP, Ubicacion } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatNumber, formatUnit } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function MovimientosStockPage() {
    const [movimientos, setMovimientos] = useState<StockMovimiento[]>([]);
    const [articuloMap, setArticuloMap] = useState<Map<string, ArticuloERP>>(new Map());
    const [ubicacionesMap, setUbicacionesMap] = useState<Map<string, Ubicacion>>(new Map());
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    useEffect(() => {
        const storedMovimientos = (JSON.parse(localStorage.getItem('stockMovimientos') || '[]') as StockMovimiento[])
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        setMovimientos(storedMovimientos);

        const storedArticulos = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
        setArticuloMap(new Map(storedArticulos.map(a => [a.idreferenciaerp, a])));
        
        const storedUbicaciones = JSON.parse(localStorage.getItem('ubicaciones') || '[]') as Ubicacion[];
        setUbicacionesMap(new Map(storedUbicaciones.map(u => [u.id, u])));

        setIsMounted(true);
    }, []);

    const filteredMovimientos = useMemo(() => {
        return movimientos.filter(m => {
            const articulo = articuloMap.get(m.articuloErpId);
            const term = searchTerm.toLowerCase();
            return (
                (articulo?.nombreProductoERP || '').toLowerCase().includes(term) ||
                (m.responsable || '').toLowerCase().includes(term) ||
                (m.concepto || '').toLowerCase().includes(term) ||
                m.tipo.toLowerCase().includes(term)
            );
        });
    }, [movimientos, searchTerm, articuloMap]);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Movimientos de Stock..." />;
    }
    
    const getShortName = (fullName?: string) => {
        if (!fullName) return '';
        const parts = fullName.split(' ');
        return `${parts[0]} ${parts.length > 1 ? parts[1] : ''}`.trim();
    }

    return (
        <main>
            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por artículo, responsable, concepto..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="border-t rounded-lg max-h-[70vh] overflow-y-auto">
                        <TooltipProvider>
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary">
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Artículo</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Ubicación</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                    <TableHead>Concepto / Motivo</TableHead>
                                    <TableHead>Responsable</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMovimientos.length > 0 ? filteredMovimientos.map(m => {
                                    const articulo = articuloMap.get(m.articuloErpId);
                                    const ubicacionOrigen = m.ubicacionOrigenId ? (ubicacionesMap.get(m.ubicacionOrigenId)?.nombre || 'N/A') : 'N/A';
                                    const ubicacionDestino = m.ubicacionDestinoId ? (ubicacionesMap.get(m.ubicacionDestinoId)?.nombre || 'N/A') : '';
                                    
                                    let ubicacionDisplay = ubicacionOrigen;
                                    if(m.tipo === 'MOVIMIENTO_SALIDA') ubicacionDisplay = `${ubicacionOrigen} → ${ubicacionDestino}`;
                                    if(m.tipo === 'MOVIMIENTO_ENTRADA') ubicacionDisplay = `${ubicacionDestino}`;
                                    
                                     const renderTipoBadge = (tipo: StockMovimiento['tipo']) => {
                                        switch(tipo) {
                                            case 'ENTRADA_COMPRA': return <Badge className="bg-blue-500 hover:bg-blue-600">Entrada Compra</Badge>;
                                            case 'ENTRADA_AJUSTE': return <Badge className="bg-green-500 hover:bg-green-600">(+)</Badge>;
                                            case 'SALIDA_PRODUCCION': return <Badge variant="secondary">Salida Producción</Badge>;
                                            case 'SALIDA_MERMA': return <Badge variant="destructive">Merma</Badge>;
                                            case 'SALIDA_AJUSTE': return <Badge variant="destructive">(-)</Badge>;
                                            case 'MOVIMIENTO_SALIDA': return <Badge variant="outline">Movimiento (Salida)</Badge>;
                                            case 'MOVIMIENTO_ENTRADA': return <Badge variant="outline">Movimiento (Entrada)</Badge>;
                                            default: return <Badge>{tipo}</Badge>;
                                        }
                                    };

                                    return (
                                        <TableRow key={m.id}>
                                            <TableCell className="text-xs">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-help">{format(new Date(m.fecha), 'dd/MM/yy')}</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <div className="p-1 text-sm">
                                                            <p>Stock previo: <strong>{formatNumber(m.stockPrevio || 0, 3)} {formatUnit(articulo?.unidad || '')}</strong></p>
                                                            <p>Stock final: <strong>{formatNumber(m.stockFinal || 0, 3)} {formatUnit(articulo?.unidad || '')}</strong></p>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell className="font-semibold">{articulo?.nombreProductoERP || m.articuloErpId}</TableCell>
                                            <TableCell>{renderTipoBadge(m.tipo)}</TableCell>
                                            <TableCell>{ubicacionDisplay}</TableCell>
                                            <TableCell className={`text-right font-mono ${m.cantidad < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                                {m.cantidad > 0 ? '+' : ''}{formatNumber(m.cantidad, 3)} {formatUnit(articulo?.unidad || '')}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{m.concepto}</TableCell>
                                            <TableCell>{getShortName(m.responsable)}</TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            No hay movimientos de stock registrados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        </TooltipProvider>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
