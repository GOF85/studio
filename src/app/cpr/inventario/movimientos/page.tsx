
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { StockMovimiento, ArticuloERP, Ubicacion } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency, formatNumber, formatUnit, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function MovimientosStockPage() {
    const [movimientos, setMovimientos] = useState<StockMovimiento[]>([]);
    const [articuloMap, setArticuloMap] = useState<Map<string, ArticuloERP>>(new Map());
    const [ubicacionMap, setUbicacionMap] = useState<Map<string, Ubicacion>>(new Map());
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    useEffect(() => {
        const storedMovimientos = JSON.parse(localStorage.getItem('stockMovimientos') || '[]') as StockMovimiento[];
        setMovimientos(storedMovimientos.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));

        const storedArticulos = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
        setArticuloMap(new Map(storedArticulos.map(a => [a.idreferenciaerp, a])));
        
        const storedUbicaciones = JSON.parse(localStorage.getItem('ubicaciones') || '[]') as Ubicacion[];
        setUbicacionMap(new Map(storedUbicaciones.map(u => [u.id, u])));

        setIsMounted(true);
    }, []);

    const filteredMovimientos = useMemo(() => {
        return movimientos.filter(m => {
            const articulo = articuloMap.get(m.articuloErpId);
            const term = searchTerm.toLowerCase();
            return (
                (articulo?.nombreProductoERP.toLowerCase() || '').includes(term) ||
                (m.concepto || '').toLowerCase().includes(term) ||
                (m.responsable || '').toLowerCase().includes(term)
            );
        });
    }, [movimientos, searchTerm, articuloMap]);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Movimientos de Stock..." />;
    }

    const renderTipoBadge = (tipo: StockMovimiento['tipo']) => {
        switch(tipo) {
            case 'ENTRADA_COMPRA': return <Badge className="bg-blue-500">Entrada Compra</Badge>;
            case 'ENTRADA_AJUSTE': return <Badge className="bg-green-500">Ajuste (+)</Badge>;
            case 'SALIDA_PRODUCCION': return <Badge variant="secondary">Salida Producción</Badge>;
            case 'SALIDA_MERMA': return <Badge variant="destructive">Merma</Badge>;
            case 'SALIDA_AJUSTE': return <Badge variant="destructive">Ajuste (-)</Badge>;
            case 'MOVIMIENTO_SALIDA': return <Badge variant="outline">Movimiento (Salida)</Badge>;
            case 'MOVIMIENTO_ENTRADA': return <Badge variant="outline">Movimiento (Entrada)</Badge>;
            default: return <Badge>{tipo}</Badge>;
        }
    };

    return (
        <div>
             <div className="flex items-center justify-between mb-6">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/cpr/inventario')} className="mb-2">
                        <ArrowLeft className="mr-2" /> Volver al Inventario
                    </Button>
                    <h1 className="text-3xl font-headline font-bold">Historial de Movimientos de Stock</h1>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por artículo, concepto o responsable..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg max-h-[70vh] overflow-y-auto">
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
                                {filteredMovimientos.map(m => {
                                    const articulo = articuloMap.get(m.articuloErpId);
                                    const ubicacionOrigen = m.ubicacionOrigenId ? (ubicacionMap.get(m.ubicacionOrigenId)?.nombre || 'N/A') : 'N/A';
                                    const ubicacionDestino = m.ubicacionDestinoId ? (ubicacionMap.get(m.ubicacionDestinoId)?.nombre || 'N/A') : '';
                                    
                                    let ubicacionDisplay = ubicacionOrigen;
                                    if(m.tipo === 'MOVIMIENTO_SALIDA') ubicacionDisplay = `${ubicacionOrigen} → ${ubicacionDestino}`;
                                    if(m.tipo === 'MOVIMIENTO_ENTRADA') ubicacionDisplay = ubicacionDestino;

                                    return (
                                        <TableRow key={m.id}>
                                            <TableCell className="text-xs">{format(new Date(m.fecha), 'dd/MM/yy HH:mm')}</TableCell>
                                            <TableCell className="font-semibold">{articulo?.nombreProductoERP || 'Desconocido'}</TableCell>
                                            <TableCell>{renderTipoBadge(m.tipo)}</TableCell>
                                            <TableCell>{ubicacionDisplay}</TableCell>
                                            <TableCell className={cn("text-right font-mono", m.cantidad > 0 ? "text-green-600" : "text-destructive")}>
                                                {m.cantidad > 0 ? '+' : ''}{formatNumber(m.cantidad, 3)} {formatUnit(articulo?.unidad || '')}
                                            </TableCell>
                                            <TableCell>{m.concepto}</TableCell>
                                            <TableCell>{m.responsable}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

