'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Euro, Users, BookOpen, Clock, Calendar as CalendarIcon, Hand, PieChart as PieChartIcon, ClipboardList } from 'lucide-react';
import SplashScreen from '@/components/layout/splash-screen';
import type { Entrega, ComercialBriefing, GastronomyOrder, MaterialOrder } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatNumber, formatPercentage, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter, isWithinInterval, endOfDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
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
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
} from "@/lib/recharts-lazy"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import Link from 'next/link';
import { useEventos, useComercialBriefings, useGastronomyOrders, useMaterialOrders } from '@/hooks/use-data-queries';

type AnaliticaCateringItem = {
    os: Entrega;
    costeTotal: number;
    pvpFinal: number;
    numHitos: number;
    costesPorPartida: { [key: string]: number };
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function KpiCard({ title, value, icon: Icon, color = 'primary', description }: { title: string, value: string, icon: any, color?: 'primary' | 'emerald' | 'rose' | 'amber' | 'blue', description?: string }) {
    const colorClasses = {
        primary: "text-indigo-600 bg-indigo-50 border-indigo-100",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
        rose: "text-rose-600 bg-rose-50 border-rose-100",
        amber: "text-amber-600 bg-amber-50 border-amber-100",
        blue: "text-blue-600 bg-blue-50 border-blue-100"
    };

    const iconColorClasses = {
        primary: "text-indigo-600",
        emerald: "text-emerald-600",
        rose: "text-rose-600",
        amber: "text-amber-600",
        blue: "text-blue-600"
    };

    return (
        <Card className="bg-card/60 backdrop-blur-md border-border/40 shadow-xl hover:-translate-y-1 transition-all duration-500 group overflow-hidden relative">
            <div className={cn("absolute top-0 left-0 w-1 h-full",
                color === 'primary' ? 'bg-indigo-500' :
                    color === 'emerald' ? 'bg-emerald-500' :
                        color === 'rose' ? 'bg-rose-500' :
                            color === 'amber' ? 'bg-amber-500' : 'bg-blue-500'
            )} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <div className={cn("p-2 rounded-xl transition-colors duration-500", colorClasses[color])}>
                    <Icon className={cn("h-4 w-4", iconColorClasses[color])} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tracking-tight">{value}</div>
            </CardContent>
        </Card>
    );
}

export default function AnaliticaCateringPage() {
    const [isMounted, setIsMounted] = useState(false);

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Filtros
    const [espacioFilter, setEspacioFilter] = useState('all');
    const [comercialFilter, setComercialFilter] = useState('all');
    const [clienteFilter, setClienteFilter] = useState('all');
    const [metreFilter, setMetreFilter] = useState('all');
    const [clienteTipoFilter, setClienteTipoFilter] = useState('all');

    // Data Hooks
    const { data: serviceOrders = [], isLoading: loadingOrders } = useEventos();
    const { data: comercialBriefings = [], isLoading: loadingBriefings } = useComercialBriefings();
    const { data: gastronomyOrders = [], isLoading: loadingGastro } = useGastronomyOrders();
    const { data: materialOrders = [], isLoading: loadingMaterial } = useMaterialOrders();

    const isLoaded = !loadingOrders && !loadingBriefings && !loadingGastro && !loadingMaterial;

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Procesamiento de datos centralizado
    const allPedidosData = useMemo(() => {
        if (!isLoaded) return [];

        const filteredOrders = serviceOrders.filter(os => os.vertical !== 'Entregas' && os.status === 'Confirmado');

        return filteredOrders.map(os => {
            const briefing = comercialBriefings.find(b => b.osId === os.id);
            const numHitos = briefing?.items.length || 0;

            // Cálculo manual de costes para este OS
            const costesPorPartida: { [key: string]: number } = {};

            gastronomyOrders.filter(g => g.osId === os.id).forEach((g: any) => {
                const partida = g.partida || 'Gastronomía';
                costesPorPartida[partida] = (costesPorPartida[partida] || 0) + (g.total || 0);
            });

            materialOrders.filter(m => m.osId === os.id).forEach((m: any) => {
                const partida = m.partida || 'Material';
                costesPorPartida[partida] = (costesPorPartida[partida] || 0) + (m.total || 0);
            });

            const costeTotal = Object.values(costesPorPartida).reduce((sum, cost) => sum + cost, 0);
            const facturacionBruta = os.facturacion || 0;
            const comisiones = (os.comisionesAgencia || 0) + (os.comisionesCanon || 0);

            return { os, costeTotal, pvpFinal: facturacionBruta - comisiones, numHitos, costesPorPartida };
        });
    }, [isLoaded, serviceOrders, comercialBriefings, gastronomyOrders, materialOrders]);

    const lists = useMemo(() => {
        const espacios = new Set(allPedidosData.map(p => p.os.space).filter(Boolean));
        const comerciales = new Set(allPedidosData.map(p => p.os.comercial).filter(Boolean));
        const clientes = new Set(allPedidosData.map(p => p.os.client).filter(Boolean));
        const metres = new Set(allPedidosData.map(p => p.os.respMetre).filter(Boolean));

        return {
            espacios: Array.from(espacios).sort(),
            comerciales: Array.from(comerciales).sort(),
            clientes: Array.from(clientes).sort(),
            metres: Array.from(metres).sort()
        };
    }, [allPedidosData]);

    const pedidosFiltrados = useMemo(() => {
        if (!dateRange?.from) return [];
        const fromDate = startOfDay(dateRange.from);
        const toDate = endOfDay(dateRange.to || dateRange.from);

        return allPedidosData.filter(p => {
            const osDate = new Date(p.os.startDate || '');
            const isInDateRange = isWithinInterval(osDate, { start: fromDate, end: toDate });
            const matchesEspacio = espacioFilter === 'all' || p.os.space === espacioFilter;
            const matchesComercial = comercialFilter === 'all' || p.os.comercial === comercialFilter;
            const matchesCliente = clienteFilter === 'all' || p.os.client === clienteFilter;
            const matchesMetre = metreFilter === 'all' || p.os.respMetre === metreFilter;
            const matchesTipoCliente = clienteTipoFilter === 'all' || p.os.tipoCliente === clienteTipoFilter;
            return isInDateRange && matchesEspacio && matchesComercial && matchesCliente && matchesMetre && matchesTipoCliente;
        });
    }, [allPedidosData, dateRange, espacioFilter, comercialFilter, clienteFilter, metreFilter, clienteTipoFilter]);

    const analisisGlobal = useMemo(() => {
        if (pedidosFiltrados.length === 0) return { pvpNeto: 0, costeTotal: 0, numEventos: 0, numServicios: 0, numPruebasMenu: 0, paxTotalesOS: 0, paxTotalesHitos: 0 };

        const pvpNeto = pedidosFiltrados.reduce((sum, p) => sum + p.pvpFinal, 0);
        const costeTotal = pedidosFiltrados.reduce((sum, p) => sum + p.costeTotal, 0);
        const paxTotalesOS = pedidosFiltrados.reduce((sum, p) => sum + (p.os.asistentes || 0), 0);

        let numServicios = 0;
        let numPruebasMenu = 0;
        let paxTotalesHitos = 0;

        pedidosFiltrados.forEach(p => {
            const briefing = comercialBriefings.find(b => b.osId === p.os.id);
            if (briefing) {
                briefing.items.forEach(item => {
                    paxTotalesHitos += item.asistentes || 0;
                    if (item.descripcion.toLowerCase().includes('prueba')) {
                        numPruebasMenu++;
                    } else {
                        numServicios++;
                    }
                });
            }
        });

        return { pvpNeto, costeTotal, numEventos: pedidosFiltrados.length, numServicios, numPruebasMenu, paxTotalesOS, paxTotalesHitos };
    }, [pedidosFiltrados, comercialBriefings]);

    const facturacionPorEspacioData = useMemo(() => {
        const bySpace: { [key: string]: number } = {};
        pedidosFiltrados.forEach(p => {
            const s = p.os.space || 'Otros';
            bySpace[s] = (bySpace[s] || 0) + p.pvpFinal;
        });
        return Object.entries(bySpace).map(([name, value]) => ({ name, value }));
    }, [pedidosFiltrados]);

    const facturacionPorComercialData = useMemo(() => {
        const byCom: { [key: string]: number } = {};
        pedidosFiltrados.forEach(p => {
            const c = p.os.comercial || 'Sin Asignar';
            byCom[c] = (byCom[c] || 0) + p.pvpFinal;
        });
        return Object.entries(byCom).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [pedidosFiltrados]);

    const margenFinal = analisisGlobal.pvpNeto - analisisGlobal.costeTotal;
    const margenPct = analisisGlobal.pvpNeto > 0 ? (margenFinal / analisisGlobal.pvpNeto) : 0;

    if (!isMounted || !isLoaded) return <SplashScreen />;

    return (
        <div className="space-y-8">
            {/* Header Premium Sticky */}
            <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                    <div className="flex items-center">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <ClipboardList className="h-5 w-5 text-indigo-500" />
                        </div>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center gap-3">
                        <Select value={espacioFilter} onValueChange={setEspacioFilter}>
                        <SelectTrigger className="h-8 w-[140px] text-[10px] font-black uppercase tracking-widest bg-background/50 border-border/40">
                            <SelectValue placeholder="Espacio" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Espacios</SelectItem>
                            {lists.espacios.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={comercialFilter} onValueChange={setComercialFilter}>
                        <SelectTrigger className="h-8 w-[140px] text-[10px] font-black uppercase tracking-widest bg-background/50 border-border/40">
                            <SelectValue placeholder="Comercial" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Comerciales</SelectItem>
                            {lists.comerciales.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("h-8 text-[10px] font-black uppercase tracking-widest border-border/40 bg-background/50 hover:bg-indigo-500/5", !dateRange && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "d LLL", { locale: es })} - {format(dateRange.to, "d LLL, yyyy", { locale: es })}
                                        </>
                                    ) : (
                                        format(dateRange.from, "d LLL, yyyy", { locale: es })
                                    )
                                ) : (
                                    <span>Fechas</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl border-border/40 shadow-2xl" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={(r) => { setDateRange(r); if (r?.from && r?.to) setIsDatePickerOpen(false); }}
                                numberOfMonths={2}
                                locale={es}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="Facturación Neta" value={formatCurrency(analisisGlobal.pvpNeto)} icon={Euro} color="primary" />
                <KpiCard title="Coste Directo" value={formatCurrency(analisisGlobal.costeTotal)} icon={TrendingDown} color="rose" />
                <KpiCard title="Rentabilidad" value={formatCurrency(margenFinal)} icon={TrendingUp} color="emerald" />
                <KpiCard title="Margen %" value={formatPercentage(margenPct)} icon={TrendingUp} color="emerald" />
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-muted/50 border border-border/40 rounded-full h-11 p-1">
                    <TabsTrigger value="overview" className="rounded-full px-6">Resumen General</TabsTrigger>
                    <TabsTrigger value="details" className="rounded-full px-6">Detalle por OS</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid lg:grid-cols-2 gap-6">
                        <Card className="bg-card/60 backdrop-blur-md border-border/40">
                            <CardHeader className="bg-primary/5 border-b border-border/40">
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-primary" /> Distribución de Facturación por Espacio</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={facturacionPorEspacioData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label
                                        >
                                            {COLORS.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/60 backdrop-blur-md border-border/40">
                            <CardHeader className="bg-amber-500/5 border-b border-border/40">
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Users className="w-5 h-5 text-amber-500" /> Facturación por Comercial</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={facturacionPorComercialData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={10} />
                                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} fontSize={10} />
                                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                        <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-6">
                    <Card className="bg-card/60 backdrop-blur-md border-border/40 overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b border-border/40 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Listado de Órdenes de Servicio ({pedidosFiltrados.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="text-[10px] font-black uppercase tracking-widest border-border/40">
                                        <TableHead>Número OS</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Espacio</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead className="text-right">PVP Neto</TableHead>
                                        <TableHead className="text-right">Coste Directo</TableHead>
                                        <TableHead className="text-right pr-6">Margen %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pedidosFiltrados.map((p) => {
                                        const margin = p.pvpFinal - p.costeTotal;
                                        const marginPct = p.pvpFinal > 0 ? margin / p.pvpFinal : 0;
                                        const osDate = new Date(p.os.startDate || '');
                                        return (
                                            <TableRow key={p.os.id} className="border-border/40 hover:bg-primary/5 transition-colors group">
                                                <TableCell className="font-mono text-xs font-bold text-primary">
                                                    <Link href={`/os/${p.os.id}/cta-explotacion`}>{p.os.serviceNumber}</Link>
                                                </TableCell>
                                                <TableCell className="text-xs font-semibold uppercase truncate max-w-[150px]">{p.os.client}</TableCell>
                                                <TableCell className="text-xs">{p.os.space}</TableCell>
                                                <TableCell className="text-xs">{format(osDate, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="text-right text-xs font-bold">{formatCurrency(p.pvpFinal)}</TableCell>
                                                <TableCell className="text-right text-xs font-bold">{formatCurrency(p.costeTotal)}</TableCell>
                                                <TableCell className={cn("text-right pr-6 text-xs font-black", marginPct < 0 ? 'text-destructive' : 'text-emerald-600')}>
                                                    {formatPercentage(marginPct)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
