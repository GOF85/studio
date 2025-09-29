

'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import type { Entrega, PedidoEntrega, ProductoVenta, CategoriaProductoVenta, EntregaHito } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

type AnaliticaItem = {
    os: Entrega;
    costeTotal: number;
    pvpTotal: number;
    pvpIfemaTotal: number;
    costesPorCategoria: { [key: string]: number };
}

export default function AnaliticaEntregasPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [pedidos, setPedidos] = useState<AnaliticaItem[]>([]);
    const [selectedPedidos, setSelectedPedidos] = useState<Set<string>>(new Set());

    useEffect(() => {
        const allEntregas = (JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[]).filter(os => os.vertical === 'Entregas');
        const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const allProductosVenta = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
        
        const productosMap = new Map(allProductosVenta.map(p => [p.id, p]));

        const data: AnaliticaItem[] = allEntregas.map(os => {
            const deliveryOrder = allPedidosEntrega.find(d => d.osId === os.id);
            let costeTotal = 0;
            let pvpTotal = 0;
            let pvpIfemaTotal = 0;
            const costesPorCategoria: { [key: string]: number } = {};

            if (deliveryOrder && deliveryOrder.hitos) {
                deliveryOrder.hitos.forEach(hito => {
                    (hito.items || []).forEach(item => {
                        const producto = productosMap.get(item.id);
                        if (producto) {
                            const costeComponentes = (producto.componentes || []).reduce((sum, comp) => {
                                const costeReal = comp.coste || 0;
                                return sum + (costeReal * comp.cantidad);
                            }, 0);
                            
                            costeTotal += costeComponentes * item.quantity;
                            pvpTotal += producto.pvp * item.quantity;
                            pvpIfemaTotal += (producto.pvpIfema || producto.pvp) * item.quantity;

                            if (producto.categoria) {
                                costesPorCategoria[producto.categoria] = (costesPorCategoria[producto.categoria] || 0) + (costeComponentes * item.quantity);
                            }
                        }
                    });
                });
            }

            return { os, costeTotal, pvpTotal, pvpIfemaTotal, costesPorCategoria };
        });

        setPedidos(data);
        setIsMounted(true);
    }, []);

    const handleSelect = (osId: string) => {
        setSelectedPedidos(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(osId)) {
                newSelection.delete(osId);
            } else {
                newSelection.add(osId);
            }
            return newSelection;
        });
    }
    
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedPedidos(new Set(pedidos.map(p => p.os.id)));
        } else {
            setSelectedPedidos(new Set());
        }
    }
    
    const analisisSeleccion = useMemo(() => {
        const seleccion = pedidos.filter(p => selectedPedidos.has(p.os.id));
        if (seleccion.length === 0) {
            return { pvp: 0, coste: 0, comisionIfema: 0, costesPorCategoria: {} };
        }

        const pvp = seleccion.reduce((sum, item) => sum + (item.os.tarifa === 'IFEMA' ? item.pvpIfemaTotal : item.pvpTotal), 0);
        const coste = seleccion.reduce((sum, item) => sum + item.costeTotal, 0);
        
        const pvpIfema = seleccion.filter(i => i.os.tarifa === 'IFEMA').reduce((sum, item) => sum + item.pvpIfemaTotal, 0);
        const comisionIfema = pvpIfema * 0.1785;
        
        const costesPorCategoria: { [key: string]: number } = {};
        
        seleccion.forEach(item => {
            for (const cat in item.costesPorCategoria) {
                costesPorCategoria[cat] = (costesPorCategoria[cat] || 0) + item.costesPorCategoria[cat];
            }
        });

        return { pvp, coste, comisionIfema, costesPorCategoria };

    }, [pedidos, selectedPedidos]);

    const margenBruto = analisisSeleccion.pvp - analisisSeleccion.coste;
    const margenFinal = margenBruto - analisisSeleccion.comisionIfema;
    const margenPct = analisisSeleccion.pvp > 0 ? (margenFinal / analisisSeleccion.pvp) * 100 : 0;


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Analítica de Rentabilidad..." />;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-8">
                <BarChart3 className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-headline font-bold">Analítica de Rentabilidad de Entregas</h1>
                    <p className="text-muted-foreground">Selecciona pedidos para analizar su rentabilidad conjunta.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Facturación Total (PVP)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(analisisSeleccion.pvp)}</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Coste Total</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(analisisSeleccion.coste)}</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Margen Final</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(margenFinal)}</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Margen % Final</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{margenPct.toFixed(2)}%</div></CardContent>
                </Card>
            </div>
            
            <div className="grid md:grid-cols-[1fr_400px] gap-8 items-start">
                 <Card>
                    <CardHeader><CardTitle>Listado de Pedidos</CardTitle></CardHeader>
                    <CardContent>
                        <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12"><Checkbox onCheckedChange={(checked) => handleSelectAll(Boolean(checked))} checked={selectedPedidos.size === pedidos.length && pedidos.length > 0} /></TableHead>
                                    <TableHead>Nº Pedido</TableHead>
                                    <TableHead>Tarifa</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead className="text-right">Coste</TableHead>
                                    <TableHead className="text-right">PVP</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pedidos.map(p => (
                                    <TableRow key={p.os.id} onClick={() => handleSelect(p.os.id)} className="cursor-pointer">
                                        <TableCell><Checkbox checked={selectedPedidos.has(p.os.id)} /></TableCell>
                                        <TableCell className="font-medium">{p.os.serviceNumber}</TableCell>
                                        <TableCell>{p.os.tarifa}</TableCell>
                                        <TableCell>{p.os.client}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(p.costeTotal)}</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(p.os.tarifa === 'IFEMA' ? p.pvpIfemaTotal : p.pvpTotal)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Análisis de Costes y Margen</CardTitle></CardHeader>
                    <CardContent>
                         <div className="space-y-2">
                            <div className="flex justify-between font-bold text-base">
                                <span>Facturación</span>
                                <span>{formatCurrency(analisisSeleccion.pvp)}</span>
                            </div>
                            <Separator className="my-2"/>
                             <p className="font-semibold text-muted-foreground">Desglose de Costes:</p>
                             {Object.entries(analisisSeleccion.costesPorCategoria).length > 0 ? Object.entries(analisisSeleccion.costesPorCategoria).map(([categoria, coste]) => (
                                <div key={categoria} className="flex justify-between text-sm pl-2">
                                    <span className="">{categoria}</span>
                                    <span>- {formatCurrency(coste)}</span>
                                </div>
                             )) : <p className="text-sm text-muted-foreground text-center py-4">Selecciona pedidos para ver el desglose.</p>}
                            <Separator className="my-2"/>
                            <div className="flex justify-between font-bold text-base">
                                <span>Coste Total</span>
                                <span>- {formatCurrency(analisisSeleccion.coste)}</span>
                            </div>
                            <Separator className="my-2 border-dashed"/>
                            <div className="flex justify-between font-bold text-base">
                                <span>Margen Bruto</span>
                                <span>{formatCurrency(margenBruto)}</span>
                            </div>
                            {analisisSeleccion.comisionIfema > 0 && (
                                <>
                                 <div className="flex justify-between text-sm pl-2">
                                     <span>Comisión IFEMA (17,85%)</span>
                                     <span className="text-destructive">- {formatCurrency(analisisSeleccion.comisionIfema)}</span>
                                 </div>
                                  <Separator className="my-2"/>
                                 <div className="flex justify-between font-bold text-base text-green-600">
                                     <span>Margen Final</span>
                                     <span>{formatCurrency(margenFinal)}</span>
                                 </div>
                                </>
                            )}
                         </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}
