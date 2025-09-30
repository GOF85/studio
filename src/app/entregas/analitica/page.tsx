
'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Euro, Package, BookOpen, Users } from 'lucide-react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import type { Entrega, PedidoEntrega, ProductoVenta, CategoriaProductoVenta, EntregaHito, TransporteOrder } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid
} from "recharts"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { GASTO_LABELS } from '@/lib/constants';


type AnaliticaItem = {
    os: Entrega;
    costeTotal: number;
    pvpTotal: number;
    pvpIfemaTotal: number;
    costesPorCategoria: { [key: string]: number };
    productos: {
        id: string;
        nombre: string;
        categoria: CategoriaProductoVenta;
        cantidad: number;
        coste: number;
        pvp: number;
        producidoPorPartner: boolean;
    }[];
}

export default function AnaliticaEntregasPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [allPedidos, setAllPedidos] = useState<AnaliticaItem[]>([]);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [selectedPedidos, setSelectedPedidos] = useState<Set<string>>(new Set());
    const [tarifaFilter, setTarifaFilter] = useState<'all' | 'Empresa' | 'IFEMA'>('all');

    useEffect(() => {
        const allEntregas = (JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[]).filter(os => os.vertical === 'Entregas');
        const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const allProductosVenta = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
        const allTransporteOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];

        const productosMap = new Map(allProductosVenta.map(p => [p.id, p]));

        const data: AnaliticaItem[] = allEntregas.map(os => {
            const deliveryOrder = allPedidosEntrega.find(d => d.osId === os.id);
            let costeTotal = 0;
            let pvpTotal = 0;
            let pvpIfemaTotal = 0;
            const costesPorCategoria: { [key: string]: number } = {};
            const productos: AnaliticaItem['productos'] = [];
            const costePorte = os.tarifa === 'IFEMA' ? 95 : 30;

            if (deliveryOrder && deliveryOrder.hitos) {
                deliveryOrder.hitos.forEach(hito => {
                    const totalPortesHito = (hito.portes || 0) * costePorte;
                    pvpTotal += totalPortesHito;
                    pvpIfemaTotal += totalPortesHito;
                    costesPorCategoria[GASTO_LABELS.transporte] = (costesPorCategoria[GASTO_LABELS.transporte] || 0); // Placeholder, real cost comes from transport orders

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

                            productos.push({
                                id: producto.id,
                                nombre: producto.nombre,
                                categoria: producto.categoria,
                                cantidad: item.quantity,
                                coste: costeComponentes,
                                pvp: os.tarifa === 'IFEMA' ? (producto.pvpIfema || producto.pvp) : producto.pvp,
                                producidoPorPartner: producto.producidoPorPartner
                            });
                        }
                    });
                });
            }

            const transporteOs = allTransporteOrders.filter(t => t.osId === os.id);
            const costeTransporteOs = transporteOs.reduce((sum, t) => sum + t.precio, 0);
            costeTotal += costeTransporteOs;
            costesPorCategoria[GASTO_LABELS.transporte] = (costesPorCategoria[GASTO_LABELS.transporte] || 0) + costeTransporteOs;

            return { os, costeTotal, pvpTotal, pvpIfemaTotal, costesPorCategoria, productos };
        });

        setAllPedidos(data);
        setIsMounted(true);
    }, []);
    
    const pedidosFiltrados = useMemo(() => {
        if (!dateRange?.from) return [];
        const toDate = dateRange.to || dateRange.from;
        return allPedidos.filter(p => {
            const osDate = new Date(p.os.startDate);
            const isInDateRange = osDate >= dateRange.from! && osDate <= toDate;
            const matchesTarifa = tarifaFilter === 'all' || p.os.tarifa === tarifaFilter;
            return isInDateRange && matchesTarifa;
        });
    }, [allPedidos, dateRange, tarifaFilter]);

    useEffect(() => {
        setSelectedPedidos(new Set(pedidosFiltrados.map(p => p.os.id)));
    }, [pedidosFiltrados]);

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
            setSelectedPedidos(new Set(pedidosFiltrados.map(p => p.os.id)));
        } else {
            setSelectedPedidos(new Set());
        }
    }
    
    const analisisSeleccion = useMemo(() => {
        const seleccion = pedidosFiltrados.filter(p => selectedPedidos.has(p.os.id));
        if (seleccion.length === 0) {
            return { pvpBruto: 0, pvpNeto: 0, coste: 0, comisionIfema: 0, costesPorCategoria: {}, productos: [], hitosCount: 0 };
        }
        
        let pvpBruto = 0;
        let pvpNeto = 0;
        
        seleccion.forEach(item => {
            const pvpItemBruto = item.os.tarifa === 'IFEMA' ? item.pvpIfemaTotal : item.pvpTotal;
            pvpBruto += pvpItemBruto;
            const comisionAgenciaTotal = pvpItemBruto * ((item.os.agencyPercentage || 0) / 100) + (item.os.agencyCommissionValue || 0);
            const comisionCanonTotal = pvpItemBruto * ((item.os.spacePercentage || 0) / 100) + (item.os.spaceCommissionValue || 0);
            pvpNeto += pvpItemBruto - comisionAgenciaTotal - comisionCanonTotal;
        });

        const coste = seleccion.reduce((sum, item) => sum + item.costeTotal, 0);
        
        const pvpIfema = seleccion.filter(i => i.os.tarifa === 'IFEMA').reduce((sum, item) => sum + item.pvpIfemaTotal, 0);
        const comisionIfema = pvpIfema * 0.1785;
        
        const costesPorCategoria: { [key: string]: number } = {};
        const productosAgregados: { [key: string]: AnaliticaItem['productos'][0] } = {};
        let hitosCount = 0;
        
        const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];

        seleccion.forEach(item => {
            const pedido = allPedidosEntrega.find(p => p.osId === item.os.id);
            hitosCount += pedido?.hitos.length || 0;

            for (const cat in item.costesPorCategoria) {
                costesPorCategoria[cat] = (costesPorCategoria[cat] || 0) + item.costesPorCategoria[cat];
            }
            item.productos.forEach(prod => {
                if (!productosAgregados[prod.id]) {
                    productosAgregados[prod.id] = { ...prod, cantidad: 0, coste: 0, pvp: 0 };
                }
                productosAgregados[prod.id].cantidad += prod.cantidad;
                productosAgregados[prod.id].coste += prod.coste * prod.cantidad;
                productosAgregados[prod.id].pvp += prod.pvp * prod.cantidad;
            });
        });

        // Add transport PVP to its category
        const pvpTransporte = seleccion.reduce((sum, item) => {
            const costePorte = item.os.tarifa === 'IFEMA' ? 95 : 30;
            const pedido = allPedidosEntrega.find(p => p.osId === item.os.id);
            const portes = pedido?.hitos.reduce((hSum, hito) => hSum + (hito.portes || 0), 0) || 0;
            return sum + (portes * costePorte);
        }, 0);
        
        const pvpPorCategoria: { [key: string]: number } = { [GASTO_LABELS.transporte]: pvpTransporte };

        // Aggregate PVP for other product categories
        Object.values(productosAgregados).forEach(p => {
             pvpPorCategoria[p.categoria] = (pvpPorCategoria[p.categoria] || 0) + p.pvp;
        });


        return { pvpBruto, pvpNeto, coste, comisionIfema, costesPorCategoria, productos: Object.values(productosAgregados), hitosCount, pvpPorCategoria };

    }, [pedidosFiltrados, selectedPedidos]);

    const topProductos = useMemo(() => {
        return analisisSeleccion.productos
            .sort((a,b) => b.cantidad - a.cantidad)
            .slice(0, 5);
    }, [analisisSeleccion.productos]);

    const rentabilidadPorCategoria = useMemo(() => {
        const allCategories = new Set([
            ...Object.keys(analisisSeleccion.costesPorCategoria),
            ...Object.keys(analisisSeleccion.pvpPorCategoria || {})
        ]);

        return Array.from(allCategories).map(cat => {
            const coste = analisisSeleccion.costesPorCategoria[cat] || 0;
            const pvp = (analisisSeleccion.pvpPorCategoria || {})[cat] || 0;
            const margen = pvp - coste;
            const margenPct = pvp > 0 ? (margen / pvp) * 100 : 0;
            return { categoria: cat, pvp, coste, margen, margenPct };
        }).filter(c => c.pvp > 0 || c.coste > 0)
          .sort((a,b) => b.margen - a.margen);
    }, [analisisSeleccion.costesPorCategoria, analisisSeleccion.pvpPorCategoria]);
    
    const partnerAnalysis = useMemo(() => {
        const partnerProducts = analisisSeleccion.productos.filter(p => p.producidoPorPartner);
        const coste = partnerProducts.reduce((sum, p) => sum + p.coste, 0);
        const pvp = partnerProducts.reduce((sum, p) => sum + p.pvp, 0);
        const margen = pvp - coste;
        const margenPct = pvp > 0 ? (margen / pvp) * 100 : 0;
        const top = partnerProducts.sort((a,b) => b.cantidad - a.cantidad).slice(0,5);
        return { coste, pvp, margen, margenPct, top };
    }, [analisisSeleccion.productos]);

    const monthlyData = useMemo(() => {
        const dataByMonth: { [key: string]: { facturacion: number, coste: number, contratos: Set<string>, entregas: number } } = {};
        
        pedidosFiltrados.forEach(item => {
            const month = format(new Date(item.os.startDate), 'yyyy-MM');
            if (!dataByMonth[month]) {
                dataByMonth[month] = { facturacion: 0, coste: 0, contratos: new Set(), entregas: 0 };
            }
            const pvp = item.os.tarifa === 'IFEMA' ? item.pvpIfemaTotal : item.pvpTotal;
            dataByMonth[month].facturacion += pvp;
            dataByMonth[month].coste += item.costeTotal;
            dataByMonth[month].contratos.add(item.os.id);
            
            const pedido = (JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[]).find(p => p.osId === item.os.id);
            dataByMonth[month].entregas += pedido?.hitos.length || 0;
        });

        return Object.entries(dataByMonth).map(([month, data]) => ({
            name: format(new Date(`${month}-02`), 'MMM yy', {locale: es}),
            Facturación: data.facturacion,
            Rentabilidad: data.facturacion - data.coste,
            Contratos: data.contratos.size,
            Entregas: data.entregas,
        })).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    }, [pedidosFiltrados]);

    const setDatePreset = (preset: 'month' | 'year' | 'q1' | 'q2' | 'q3' | 'q4') => {
        const now = new Date();
        switch(preset) {
            case 'month': setDateRange({ from: startOfMonth(now), to: endOfMonth(now) }); break;
            case 'year': setDateRange({ from: startOfYear(now), to: endOfYear(now) }); break;
            case 'q1': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 0, 1)), to: endOfQuarter(new Date(now.getFullYear(), 2, 31)) }); break;
            case 'q2': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 3, 1)), to: endOfQuarter(new Date(now.getFullYear(), 5, 30)) }); break;
            case 'q3': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 6, 1)), to: endOfQuarter(new Date(now.getFullYear(), 8, 30)) }); break;
            case 'q4': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 9, 1)), to: endOfQuarter(new Date(now.getFullYear(), 11, 31)) }); break;
        }
    };
    
    const margenBruto = analisisSeleccion.pvpNeto - analisisSeleccion.coste;
    const margenFinal = margenBruto - analisisSeleccion.comisionIfema;
    const margenPct = analisisSeleccion.pvpNeto > 0 ? (margenFinal / analisisSeleccion.pvpNeto) * 100 : 0;
    const ticketMedioContrato = analisisSeleccion.pvpNeto / (selectedPedidos.size || 1);
    const ticketMedioEntrega = analisisSeleccion.pvpNeto / (analisisSeleccion.hitosCount || 1);


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Analítica de Rentabilidad..." />;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-6">
                <BarChart3 className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-headline font-bold">Analítica de Rentabilidad de Entregas</h1>
                </div>
            </div>
            
            <Card className="mb-6">
                <CardContent className="p-4 flex flex-wrap items-center gap-4 justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-full md:w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
                            </PopoverContent>
                        </Popover>
                        <Button size="sm" variant="outline" onClick={() => setDatePreset('month')}>Mes en curso</Button>
                        <Button size="sm" variant="outline" onClick={() => setDatePreset('year')}>Año en curso</Button>
                        <Button size="sm" variant="outline" onClick={() => setDatePreset('q1')}>Q1</Button>
                        <Button size="sm" variant="outline" onClick={() => setDatePreset('q2')}>Q2</Button>
                        <Button size="sm" variant="outline" onClick={() => setDatePreset('q3')}>Q3</Button>
                        <Button size="sm" variant="outline" onClick={() => setDatePreset('q4')}>Q4</Button>
                    </div>
                    <Select value={tarifaFilter} onValueChange={(value) => setTarifaFilter(value as any)}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Filtrar por tarifa" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las Tarifas</SelectItem>
                            <SelectItem value="Empresa">Empresa</SelectItem>
                            <SelectItem value="IFEMA">IFEMA</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                        <CardTitle className="text-sm font-medium">Facturación</CardTitle>
                        <Euro className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">Bruta: {formatCurrency(analisisSeleccion.pvpBruto)}</p>
                        <div className="text-2xl font-bold">{formatCurrency(analisisSeleccion.pvpNeto)}</div>
                        <p className="text-xs text-muted-foreground">Neto-Neto</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-1">
                        <CardTitle className="text-sm font-medium">Volumen</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">{selectedPedidos.size} <span className="text-xs font-normal text-muted-foreground">contratos</span></div>
                        <div className="text-lg font-bold">{analisisSeleccion.hitosCount} <span className="text-xs font-normal text-muted-foreground">entregas</span></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                        <CardTitle className="text-sm font-medium">Ticket Medio</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">{formatCurrency(ticketMedioContrato)} <span className="text-xs font-normal text-muted-foreground">/ contrato</span></div>
                        <div className="text-lg font-bold">{formatCurrency(ticketMedioEntrega)} <span className="text-xs font-normal text-muted-foreground">/ entrega</span></div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                        <CardTitle className="text-sm font-medium">Margen Final</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className={cn("text-2xl font-bold", margenFinal >= 0 ? "text-green-600" : "text-destructive")}>
                        {formatCurrency(margenFinal)}
                    </div>
                    <p className={cn("text-base font-semibold", margenPct >= 0 ? "text-green-600" : "text-destructive")}>{margenPct.toFixed(2)}%</p>
                 </CardContent>
                 </Card>
            </div>
            
            <Tabs defaultValue="rentabilidad">
                <TabsList className="mb-4">
                    <TabsTrigger value="rentabilidad">Análisis de Rentabilidad</TabsTrigger>
                    <TabsTrigger value="partner">Análisis Partner</TabsTrigger>
                </TabsList>
                <TabsContent value="rentabilidad">
                    <div className="space-y-8">
                         <Card>
                            <CardHeader><CardTitle>Facturación y Rentabilidad Mensual</CardTitle></CardHeader>
                            <CardContent className="pl-0">
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value / 1000}k`}/>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Legend />
                                        <Area type="monotone" dataKey="Facturación" stackId="1" stroke="#8884d8" fill="#8884d8" />
                                        <Area type="monotone" dataKey="Rentabilidad" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        <div className="grid lg:grid-cols-2 gap-4">
                           <Card>
                                <CardHeader><CardTitle>Volumen de Contratos</CardTitle></CardHeader>
                                <CardContent className="pl-0">
                                <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={monthlyData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <Tooltip formatter={(value: number) => formatNumber(value, 0)} />
                                            <Legend />
                                            <Bar dataKey="Contratos" fill="#8884d8" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Volumen de Entregas</CardTitle></CardHeader>
                                <CardContent className="pl-0">
                                <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={monthlyData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <Tooltip formatter={(value: number) => formatNumber(value, 0)} />
                                            <Legend />
                                            <Bar dataKey="Entregas" fill="#82ca9d" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="grid lg:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader><CardTitle>Top 5 Productos más Vendidos</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cantidad Vendida</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {topProductos.map(p => (
                                                <TableRow key={p.id}><TableCell>{p.nombre}</TableCell><TableCell className="text-right font-medium">{p.cantidad}</TableCell></TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Rentabilidad por Categoría</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Categoría</TableHead><TableHead className="text-right">Margen Bruto</TableHead><TableHead className="text-right">Margen %</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {rentabilidadPorCategoria.map(c => (
                                                <TableRow key={c.categoria}><TableCell>{c.categoria}</TableCell><TableCell className="text-right">{formatCurrency(c.margen)}</TableCell><TableCell className={cn("text-right font-medium", c.margenPct < 0 && 'text-destructive')}>{c.margenPct.toFixed(1)}%</TableCell></TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
                  <TabsContent value="partner">
                    <div className="grid md:grid-cols-[1fr_400px] gap-8 items-start">
                        <Card>
                            <CardHeader><CardTitle>Top 5 Productos de Partner más vendidos</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {partnerAnalysis.top.map(p => (
                                            <TableRow key={p.id}><TableCell>{p.nombre}</TableCell><TableCell className="text-right font-medium">{p.cantidad}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Rentabilidad Partner</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between font-semibold"><span>Facturación (PVP)</span><span>{formatCurrency(partnerAnalysis.pvp)}</span></div>
                                <div className="flex justify-between"><span>Coste</span><span>{formatCurrency(partnerAnalysis.coste)}</span></div>
                                <Separator />
                                <div className="flex justify-between font-bold text-lg"><span>Margen Bruto</span><span>{formatCurrency(partnerAnalysis.margen)}</span></div>
                                <div className="flex justify-between font-bold text-lg"><span>Margen %</span><span className={cn(partnerAnalysis.margenPct < 0 && 'text-destructive')}>{partnerAnalysis.margenPct.toFixed(2)}%</span></div>
                            </CardContent>
                        </Card>
                    </div>
                  </TabsContent>
            </Tabs>
            
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Listado de Pedidos en el Periodo</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12"><Checkbox onCheckedChange={handleSelectAll} checked={selectedPedidos.size === pedidosFiltrados.length && pedidosFiltrados.length > 0} /></TableHead>
                                <TableHead>Nº Pedido</TableHead>
                                <TableHead>Tarifa</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead className="text-right">Coste</TableHead>
                                <TableHead className="text-right">PVP</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pedidosFiltrados.map(p => (
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
            
        </main>
    )
}
