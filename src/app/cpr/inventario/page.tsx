
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Archive, Search, SlidersHorizontal, FileDown, FileUp, PlusCircle, Activity } from 'lucide-react';
import type { ArticuloERP, StockArticuloUbicacion } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatNumber, formatUnit, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type StockConsolidado = {
    articulo: ArticuloERP;
    stockTotal: number;
    valoracion: number;
};

export default function InventarioPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [stock, setStock] = useState<StockConsolidado[]>([]);

    const loadData = useCallback(() => {
        const allArticulos = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
        const allStockUbicacion = Object.values(JSON.parse(localStorage.getItem('stockArticuloUbicacion') || '{}')) as StockArticuloUbicacion[];
        
        const stockMap = new Map<string, number>();
        allStockUbicacion.forEach(item => {
            const currentStock = stockMap.get(item.articuloErpId) || 0;
            stockMap.set(item.articuloErpId, currentStock + item.stockTeorico);
        });

        const stockConsolidado: StockConsolidado[] = allArticulos.map(articulo => {
            const stockTotal = stockMap.get(articulo.idreferenciaerp) || 0;
            const valoracion = stockTotal * (articulo.precio || 0);
            return { articulo, stockTotal, valoracion };
        }).filter(item => item.stockTotal > 0.001); // Only show items with stock

        setStock(stockConsolidado);
    }, []);

    useEffect(() => {
        loadData();
        setIsMounted(true);
    }, [loadData]);
    
    const filteredStock = useMemo(() => {
        return stock.filter(item => 
            item.articulo.nombreProductoERP.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.articulo.tipo || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [stock, searchTerm]);
    
    const totalValoracion = useMemo(() => {
        return filteredStock.reduce((sum, item) => sum + item.valoracion, 0);
    }, [filteredStock]);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Inventario de Materia Prima..." />;
    }

    return (
        <div>
             <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <Archive />
                        Inventario de Materia Prima (CPR)
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Consulta el stock teórico actual de los ingredientes y consumibles.
                    </p>
                </div>
                 <div className="flex items-center gap-2">
                    <Button variant="outline"><PlusCircle className="mr-2"/>Entrada Compra</Button>
                    <Button><SlidersHorizontal className="mr-2"/>Iniciar Recuento</Button>
                </div>
             </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Stock Teórico Consolidado</CardTitle>
                    <div className="flex justify-between items-center">
                        <Input 
                            placeholder="Buscar producto o categoría..."
                            className="max-w-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                         <div className="text-right">
                            <div className="text-sm font-semibold text-muted-foreground">Valoración Total del Stock</div>
                            <div className="text-2xl font-bold text-primary">{formatCurrency(totalValoracion)}</div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary">
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead className="text-right">Stock Teórico</TableHead>
                                    <TableHead className="text-right">Valoración</TableHead>
                                    <TableHead className="text-right">Stock Mínimo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStock.map(item => {
                                    const porDebajoMinimo = item.stockTotal < (item.articulo.stockMinimo || 0);
                                    return (
                                    <TableRow key={item.articulo.idreferenciaerp} className={porDebajoMinimo ? 'bg-amber-100/50' : ''}>
                                        <TableCell className="font-semibold">{item.articulo.nombreProductoERP}</TableCell>
                                        <TableCell><Badge variant="outline">{item.articulo.tipo}</Badge></TableCell>
                                        <TableCell className="text-right font-mono">{formatNumber(item.stockTotal, 2)} {formatUnit(item.articulo.unidad)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(item.valoracion)}</TableCell>
                                        <TableCell className="text-right font-mono">{item.articulo.stockMinimo ? `${formatNumber(item.articulo.stockMinimo, 2)} ${formatUnit(item.articulo.unidad)}` : '-'}</TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
