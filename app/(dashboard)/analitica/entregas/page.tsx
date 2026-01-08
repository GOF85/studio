'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Euro, Package, BookOpen, Users, Wallet, Ship, Ticket, Truck, UserCheck, Clock, Pencil, MessageSquare, AlertTriangle, LifeBuoy, ClipboardCheck, Calendar as CalendarIcon, Hand } from 'lucide-react';
import SplashScreen from '@/components/layout/splash-screen';
import type { Entrega, PedidoEntrega, ProductoVenta, CategoriaProductoVenta, EntregaHito, TransporteOrder, ProveedorTransporte, PersonalEntrega, PersonalEntregaTurno, AsignacionPersonal, PersonalExternoAjuste, Proveedor, CategoriaPersonal } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, formatNumber, formatPercentage, cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
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
import { GASTO_LABELS } from '@/lib/constants';
import Link from 'next/link';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import {
    useEntregas,
    usePedidosEntrega,
    useTransporteOrders,
    usePersonalEntrega,
    usePersonalExternoAjustes,
    useTiposPersonal,
    useProveedores,
    useArticulos,
    useTiposTransporte,
    useProveedoresTransporte,
} from '@/hooks/use-data-queries';

// Definición de tipo para la data de analítica
interface AnaliticaItem {
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
        partnerId?: string;
    }[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type KpiCardProps = {
    title: string;
    value: string;
    icon: React.ElementType;
    color?: 'primary' | 'emerald' | 'rose' | 'amber' | 'blue';
    description?: string;
}

function KpiCard({ title, value, icon: Icon, color = 'primary', description }: KpiCardProps) {
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
                {description && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

const calculateHours = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    try {
        const startTime = new Date(`1970-01-01T${start}:00`);
        const endTime = new Date(`1970-01-01T${end}:00`);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 0;
        const diff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        return diff > 0 ? diff : 0;
    } catch (e) {
        return 0;
    }
}

export default function AnaliticaEntregasPage() {
    const [isMounted, setIsMounted] = useState(false);

    // Filtros y selección
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [selectedPedidos, setSelectedPedidos] = useState<Set<string>>(new Set());
    const [tarifaFilter, setTarifaFilter] = useState<'all' | 'Empresa' | 'IFEMA'>('all');
    const [transporteProviderFilter, setTransporteProviderFilter] = useState('all');
    const [personalProviderFilter, setPersonalProviderFilter] = useState('all');
    const [partnerProviderFilter, setPartnerProviderFilter] = useState('all');

    // Hooks de datos
    const { data: entregas = [], isLoading: loadingEntregas } = useEntregas();
    const { data: pedidosEntrega = [], isLoading: loadingPedidos } = usePedidosEntrega();
    const { data: transporteOrders = [], isLoading: loadingTransporte } = useTransporteOrders();
    const { data: personalEntrega = [], isLoading: loadingPersonal } = usePersonalEntrega();
    const { data: personalExternoAjustes = [], isLoading: loadingAjustes } = usePersonalExternoAjustes();
    const { data: categoriasPersonal = [], isLoading: loadingCategorias } = useTiposPersonal();
    const { data: proveedores = [], isLoading: loadingProveedores } = useProveedores();
    const { data: articulos = [], isLoading: loadingArticulos } = useArticulos();
    const { data: tiposTransporte = [], isLoading: loadingTiposTransporte } = useProveedoresTransporte();

    const isLoadingData = loadingEntregas || loadingPedidos || loadingTransporte || loadingPersonal || loadingAjustes || loadingCategorias || loadingProveedores || loadingArticulos || loadingTiposTransporte;

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Datos procesados mediante useMemo para evitar bucles infinitos de re-renderizado
    const allPedidosData = useMemo(() => {
        if (isLoadingData) return [];

        const filteredEntregas = entregas.filter(os => os.vertical === 'Entregas');
        const productosMap = new Map(articulos.map(p => [p.id, p]));
        const adjustmentsByOsId: Record<string, PersonalExternoAjuste[]> = {};

        personalExternoAjustes.forEach(ajuste => {
            const osId = (ajuste as any).evento_id || (ajuste as any).osId;
            if (osId) {
                if (!adjustmentsByOsId[osId]) adjustmentsByOsId[osId] = [];
                adjustmentsByOsId[osId].push(ajuste);
            }
        });

        return filteredEntregas.map(os => {
            const deliveryOrder = pedidosEntrega.find(d => d.osId === os.id);
            let costeTotal = 0;
            let pvpTotal = 0;
            let pvpIfemaTotal = 0;
            const costesPorCategoria: { [key: string]: number } = {};
            const productos: AnaliticaItem['productos'] = [];
            const costePorte = os.tarifa === 'IFEMA' ? 95 : 30;

            if (deliveryOrder && deliveryOrder.hitos) {
                deliveryOrder.hitos.forEach((hito: EntregaHito) => {
                    const totalPortesHito = (hito.portes || 0) * costePorte;
                    pvpTotal += totalPortesHito;
                    pvpIfemaTotal += totalPortesHito;

                    const horasCamarero = hito.horasCamarero || 0;
                    if (horasCamarero > 0) {
                        const horasFacturables = horasCamarero > 0 && horasCamarero < 4 ? 4 : horasCamarero;
                        const pvpCamareroHora = os.tarifa === 'IFEMA' ? 44.50 : 36.50;
                        const costeCamareroHora = 17.50;
                        const pvpServicioCamarero = horasFacturables * pvpCamareroHora;
                        const costeServicioCamarero = horasCamarero * costeCamareroHora;

                        pvpTotal += pvpServicioCamarero;
                        pvpIfemaTotal += pvpServicioCamarero;
                        costeTotal += costeServicioCamarero;
                        costesPorCategoria['Personal'] = (costesPorCategoria['Personal'] || 0) + costeServicioCamarero;
                    }

                    (hito.items || []).forEach((item: any) => {
                        const producto = productosMap.get(item.id);
                        if (producto) {
                            const costeComponentes = ((producto as any).componentes || []).reduce((sum: number, comp: any) => {
                                const costeReal = comp.coste || 0;
                                return sum + (costeReal * comp.cantidad);
                            }, 0);

                            const totalCosteItem = costeComponentes * item.quantity;
                            costeTotal += totalCosteItem;

                            const pvpUnitario = (producto as any).pvp || 0;
                            const pvpIfemaUnitario = (producto as any).pvpIfema || pvpUnitario;

                            pvpTotal += pvpUnitario * item.quantity;
                            pvpIfemaTotal += pvpIfemaUnitario * item.quantity;

                            if (producto.categoria) {
                                (costesPorCategoria as any)[producto.categoria] = (costesPorCategoria[producto.categoria] || 0) + totalCosteItem;
                            }

                            productos.push({
                                id: producto.id,
                                nombre: producto.nombre,
                                categoria: producto.categoria as any,
                                cantidad: item.quantity,
                                coste: costeComponentes,
                                pvp: os.tarifa === 'IFEMA' ? pvpIfemaUnitario : pvpUnitario,
                                producidoPorPartner: (producto as any).producidoPorPartner,
                                partnerId: (producto as any).partnerId
                            });
                        }
                    });
                });
            }

            const transporteOs = transporteOrders.filter(t => t.osId === os.id);
            const costeTransporteOs = transporteOs.reduce((sum, t) => sum + t.precio, 0);
            costeTotal += costeTransporteOs;
            costesPorCategoria[GASTO_LABELS.transporte] = (costesPorCategoria[GASTO_LABELS.transporte] || 0) + costeTransporteOs;

            const personalOs = personalEntrega.find(p => p.osId === os.id);
            if (personalOs) {
                const costePersonalOs = personalOs.turnos.reduce((sum: number, turno: any) => {
                    const horas = calculateHours(turno.horaEntrada, turno.horaSalida);
                    return sum + horas * (turno.precioHora || 0);
                }, 0);
                const ajustes = (adjustmentsByOsId[os.id] || []).reduce((sum: number, aj: any) => sum + aj.importe, 0);
                costesPorCategoria['Personal'] = (costesPorCategoria['Personal'] || 0) + costePersonalOs + ajustes;
                costeTotal += costePersonalOs + ajustes;
            }

            return { os, costeTotal, pvpTotal, pvpIfemaTotal, costesPorCategoria, productos };
        });
    }, [isLoadingData, entregas, pedidosEntrega, articulos, transporteOrders, personalEntrega, personalExternoAjustes]);

    const pedidosFiltrados = useMemo(() => {
        if (!dateRange?.from) return [];
        const fromDate = startOfDay(dateRange.from);
        const toDate = endOfDay(dateRange.to || dateRange.from);

        return allPedidosData.filter(p => {
            const osDate = p.os?.startDate ? new Date(p.os.startDate) : undefined;
            const isInDateRange = osDate ? isWithinInterval(osDate, { start: fromDate, end: toDate }) : false;
            const matchesTarifa = tarifaFilter === 'all' || p.os.tarifa === tarifaFilter;
            return isInDateRange && matchesTarifa;
        });
    }, [allPedidosData, dateRange, tarifaFilter]);

    // Sincronizar selección inicial
    useEffect(() => {
        if (pedidosFiltrados.length > 0 && selectedPedidos.size === 0) {
            setSelectedPedidos(new Set(pedidosFiltrados.map(p => p.os.id)));
        }
    }, [pedidosFiltrados]);

    const handleSelect = (osId: string) => {
        setSelectedPedidos(prev => {
            const next = new Set(prev);
            if (next.has(osId)) next.delete(osId);
            else next.add(osId);
            return next;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedPedidos(new Set(pedidosFiltrados.map(p => p.os.id)));
        } else {
            setSelectedPedidos(new Set());
        }
    };

    const analisisSeleccion = useMemo(() => {
        const seleccion = pedidosFiltrados.filter(p => selectedPedidos.has(p.os.id));
        const pvpTotal = seleccion.reduce((sum, p) => sum + (p.os.tarifa === 'IFEMA' ? p.pvpIfemaTotal : p.pvpTotal), 0);
        const costeTotal = seleccion.reduce((sum, p) => sum + p.costeTotal, 0);
        const margen = pvpTotal - costeTotal;
        const margenPct = pvpTotal > 0 ? (margen / pvpTotal) : 0;

        const categoriasAgregadas: { [key: string]: { name: string; coste: number } } = {};
        const productosAgregados: { [key: string]: AnaliticaItem['productos'][0] } = {};

        seleccion.forEach(p => {
            Object.entries(p.costesPorCategoria).forEach(([cat, val]) => {
                const label = cat;
                if (!categoriasAgregadas[label]) categoriasAgregadas[label] = { name: label, coste: 0 };
                categoriasAgregadas[label].coste += val;
            });

            p.productos.forEach(prod => {
                if (!productosAgregados[prod.id]) {
                    productosAgregados[prod.id] = { ...prod };
                } else {
                    productosAgregados[prod.id].cantidad += prod.cantidad;
                }
            });
        });

        // Crear una copia para evitar mutaciones directas en el original durante el sort
        const categorias = Object.values(categoriasAgregadas);
        const productos = Object.values(productosAgregados);

        return {
            pvpTotal,
            costeTotal,
            margen,
            margenPct,
            numPedidos: seleccion.length,
            categorias,
            productos
        };
    }, [pedidosFiltrados, selectedPedidos]);

    const topProductos = useMemo(() => {
        return [...analisisSeleccion.productos]
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 5);
    }, [analisisSeleccion.productos]);

    const topCategorias = useMemo(() => {
        return [...analisisSeleccion.categorias]
            .sort((a, b) => b.coste - a.coste)
            .slice(0, 5);
    }, [analisisSeleccion.categorias]);

    const transportAnalysis = useMemo(() => {
        const transportOrdersSelected = transporteOrders.filter(t => selectedPedidos.has(t.osId || ''));
        const totalTransporte = transportOrdersSelected.reduce((sum, t) => sum + (t.precio || 0), 0);

        const byProvider: { [key: string]: { name: string; coste: number; count: number; id: string } } = {};
        transportOrdersSelected.forEach(t => {
            const providerName = (t as any).proveedorNombre || 'Otros';
            const providerId = (t as any).tipoTransporte || 'other';
            if (!byProvider[providerId]) byProvider[providerId] = { name: providerName, coste: 0, count: 0, id: providerId };
            byProvider[providerId].coste += (t.precio || 0);
            byProvider[providerId].count++;
        });

        const providersList = Object.values(byProvider);
        const filteredProviders = transporteProviderFilter === 'all'
            ? providersList
            : providersList.filter(p => p.id === transporteProviderFilter);

        return {
            totalTransporte,
            providersList,
            filteredProviders
        };
    }, [selectedPedidos, transporteOrders, transporteProviderFilter]);

    const personalAnalysis = useMemo(() => {
        const selectedOsIds = Array.from(selectedPedidos);
        let totalPersonal = 0;
        const byCategory: { [key: string]: { name: string; coste: number; count: number; id: string } } = {};

        selectedOsIds.forEach(osId => {
            const personal = personalEntrega.find(p => p.osId === osId);
            if (personal) {
                personal.turnos.forEach((turno: any) => {
                    const horas = calculateHours(turno.horaEntrada, turno.horaSalida);
                    const cost = horas * (turno.precioHora || 0);
                    totalPersonal += cost;

                    const catId = turno.categoriaId || 'other';
                    const catName = turno.categoriaNombre || 'Sin Categoría';
                    if (!byCategory[catId]) byCategory[catId] = { name: catName, coste: 0, count: 0, id: catId };
                    byCategory[catId].coste += cost;
                    byCategory[catId].count++;
                });
            }
            const ajustes = (personalExternoAjustes as any[]).filter(aj => aj.osId === osId).reduce((sum, aj) => sum + (aj.importe || 0), 0);
            totalPersonal += ajustes;
            if (ajustes !== 0) {
                if (!byCategory['adjustments']) byCategory['adjustments'] = { name: 'Ajustes', coste: 0, count: 0, id: 'adjustments' };
                byCategory['adjustments'].coste += ajustes;
            }
        });

        const categoriesList = Object.values(byCategory);
        const filteredCategories = personalProviderFilter === 'all'
            ? categoriesList
            : categoriesList.filter(c => c.id === personalProviderFilter);

        return {
            totalPersonal,
            categoriesList,
            filteredCategories
        };
    }, [selectedPedidos, personalEntrega, personalExternoAjustes, personalProviderFilter]);

    const partnerAnalysis = useMemo(() => {
        const partnerProducts = analisisSeleccion.productos.filter(p => p.producidoPorPartner);
        const partnerIds = Array.from(new Set(partnerProducts.map(p => p.partnerId).filter(Boolean)));

        const byPartner: { [key: string]: { name: string; count: number; value: number; id: string } } = {};
        partnerProducts.forEach(p => {
            const pid = p.partnerId!;
            const partner = proveedores.find(pr => pr.id === pid);
            const pName = partner?.nombre || 'Desconocido';
            if (!byPartner[pid]) byPartner[pid] = { name: pName, count: 0, value: 0, id: pid };
            byPartner[pid].count += p.cantidad;
            byPartner[pid].value += p.coste * p.cantidad;
        });

        const partnersList = Object.values(byPartner);
        const top = [...partnerProducts].sort((a, b) => b.cantidad - a.cantidad);

        const filteredPartners = partnerProviderFilter === 'all'
            ? partnersList
            : partnersList.filter(p => p.id === partnerProviderFilter);

        return {
            partnersList,
            top,
            filteredPartners
        };
    }, [analisisSeleccion.productos, partnerProviderFilter, proveedores]);

    const setDatePreset = (preset: 'month' | 'year' | 'q1' | 'q2' | 'q3' | 'q4') => {
        const now = new Date();
        let from, to;
        switch (preset) {
            case 'month': from = startOfMonth(now); to = endOfMonth(now); break;
            case 'year': from = startOfYear(now); to = endOfYear(now); break;
            case 'q1': from = startOfQuarter(new Date(now.getFullYear(), 0, 1)); to = endOfQuarter(new Date(now.getFullYear(), 2, 31)); break;
            case 'q2': from = startOfQuarter(new Date(now.getFullYear(), 3, 1)); to = endOfQuarter(new Date(now.getFullYear(), 5, 30)); break;
            case 'q3': from = startOfQuarter(new Date(now.getFullYear(), 6, 1)); to = endOfQuarter(new Date(now.getFullYear(), 8, 30)); break;
            case 'q4': from = startOfQuarter(new Date(now.getFullYear(), 9, 1)); to = endOfQuarter(new Date(now.getFullYear(), 11, 31)); break;
        }
        setDateRange({ from, to });
        setIsDatePickerOpen(false);
    };

    if (!isMounted || isLoadingData) return <SplashScreen />;

    return (
        <div className="space-y-8">
            {/* Header Premium Sticky */}
            <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                    <div className="flex items-center">
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <Package className="h-5 w-5 text-amber-500" />
                        </div>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center gap-3">
                        <Select value={tarifaFilter} onValueChange={(v: any) => setTarifaFilter(v)}>
                            <SelectTrigger className="h-8 w-[140px] text-[10px] font-black uppercase tracking-widest bg-background/50 border-border/40">
                                <SelectValue placeholder="Tarifa" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                <SelectItem value="Empresa">Empresa</SelectItem>
                                <SelectItem value="IFEMA">IFEMA</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="hidden lg:flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/40">
                            <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest rounded-lg h-7 px-3" onClick={() => setDatePreset('month')}>Mes</Button>
                            <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest rounded-lg h-7 px-3" onClick={() => setDatePreset('year')}>Año</Button>
                            <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest rounded-lg h-7 px-3" onClick={() => setDatePreset('q1')}>Q1</Button>
                            <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest rounded-lg h-7 px-3" onClick={() => setDatePreset('q2')}>Q2</Button>
                            <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest rounded-lg h-7 px-3" onClick={() => setDatePreset('q3')}>Q3</Button>
                            <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest rounded-lg h-7 px-3" onClick={() => setDatePreset('q4')}>Q4</Button>
                        </div>
                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className={cn("h-8 text-[10px] font-black uppercase tracking-widest border-border/40 bg-background/50 hover:bg-amber-500/5", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-amber-500" />
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
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                    locale={es}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="Facturación Bruta" value={formatCurrency(analisisSeleccion.pvpTotal)} icon={Euro} color="primary" />
                <KpiCard title="Coste Directo" value={formatCurrency(analisisSeleccion.costeTotal)} icon={TrendingDown} color="rose" />
                <KpiCard title="Margen Bruto" value={formatCurrency(analisisSeleccion.margen)} icon={TrendingUp} color="emerald" />
                <KpiCard title="Margen %" value={formatPercentage(analisisSeleccion.margenPct)} icon={TrendingUp} color="emerald" />
            </div>

            <Tabs defaultValue="analisis" className="space-y-6">
                <TabsList className="bg-muted/50 border border-border/40 rounded-full h-11 p-1">
                    <TabsTrigger value="analisis" className="rounded-full px-6">Análisis General</TabsTrigger>
                    <TabsTrigger value="transporte" className="rounded-full px-6">Transporte</TabsTrigger>
                    <TabsTrigger value="personal" className="rounded-full px-6">Personal</TabsTrigger>
                    <TabsTrigger value="partners" className="rounded-full px-6">Partners</TabsTrigger>
                </TabsList>

                <TabsContent value="analisis" className="space-y-6">
                    <div className="grid lg:grid-cols-2 gap-6">
                        <Card className="bg-card/60 backdrop-blur-md border-border/40 overflow-hidden">
                            <CardHeader className="border-b border-border/40 bg-primary/5">
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                    Distribución de Costes
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie data={analisisSeleccion.categorias} dataKey="coste" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry) => `${entry.name} (${formatPercentage(entry.coste / (analisisSeleccion.costeTotal || 1))})`}>
                                            {analisisSeleccion.categorias.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/60 backdrop-blur-md border-border/40 overflow-hidden">
                            <CardHeader className="border-b border-border/40 bg-amber-500/5">
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <Package className="w-5 h-5 text-amber-500" />
                                    Top 5 Productos (Cantidad)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={topProductos} layout="vertical" margin={{ left: 50 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="nombre" type="category" width={120} fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Bar dataKey="cantidad" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="bg-card/60 backdrop-blur-md border-border/40 overflow-hidden">
                        <CardHeader className="border-b border-border/40 bg-primary/5 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-primary" />
                                Desglose por OS ({pedidosFiltrados.length})
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Checkbox checked={selectedPedidos.size === pedidosFiltrados.length} onCheckedChange={handleSelectAll} className="rounded-md" />
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground leading-none">Seleccionar Todos</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-border/40 font-black uppercase text-[10px] tracking-widest">
                                        <TableHead className="w-12 text-center"></TableHead>
                                        <TableHead>Número OS</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead className="text-right">PVP Total</TableHead>
                                        <TableHead className="text-right">Coste Total</TableHead>
                                        <TableHead className="text-right pr-6">Margen %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pedidosFiltrados.map((p) => {
                                        const isSelected = selectedPedidos.has(p.os.id);
                                        const pvp = p.os.tarifa === 'IFEMA' ? p.pvpIfemaTotal : p.pvpTotal;
                                        const margin = pvp - p.costeTotal;
                                        const marginPct = pvp > 0 ? margin / pvp : 0;

                                        return (
                                            <TableRow key={p.os.id} className={cn("border-border/40 hover:bg-primary/5 transition-colors cursor-pointer", !isSelected && "opacity-60")}>
                                                <TableCell className="text-center" onClick={(e) => { e.stopPropagation(); handleSelect(p.os.id); }}>
                                                    <Checkbox checked={isSelected} onCheckedChange={() => handleSelect(p.os.id)} />
                                                </TableCell>
                                                <TableCell className="font-mono text-xs font-bold text-primary">
                                                    <Link href={`/os/${p.os.serviceNumber}/cta-explotacion`}>{p.os.serviceNumber}</Link>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium uppercase tracking-tight">{p.os.client}</TableCell>
                                                <TableCell className="text-xs font-medium">{p.os?.startDate ? format(new Date(p.os.startDate), 'dd MMM yyyy', { locale: es }) : 'N/A'}</TableCell>
                                                <TableCell className="text-right text-xs font-bold">{formatCurrency(pvp)}</TableCell>
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

                <TabsContent value="transporte" className="space-y-6">
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-4">
                            <KpiCard title="Total Transporte" value={formatCurrency(transportAnalysis.totalTransporte)} icon={Truck} color="blue" />
                            <Card className="bg-card/60 backdrop-blur-md border-border/40 overflow-hidden">
                                <CardHeader className="border-b border-border/40 bg-blue-500/5">
                                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-blue-600">Filtro por Proveedor</CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 space-y-1">
                                    <Button variant={transporteProviderFilter === 'all' ? 'secondary' : 'ghost'} className="w-full justify-start rounded-xl px-4 text-xs font-bold uppercase tracking-widest" onClick={() => setTransporteProviderFilter('all')}>Todos los proveedores</Button>
                                    {tiposTransporte.map((t: any) => (
                                        <Button key={t.id} variant={transporteProviderFilter === t.id ? 'secondary' : 'ghost'} className="w-full justify-start rounded-xl px-4 text-xs font-bold uppercase tracking-widest truncate" onClick={() => setTransporteProviderFilter(t.id)}>{t.nombre || t.nombreProveedor || 'Desconocido'}</Button>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-2">
                            <Card className="bg-card/60 backdrop-blur-md border-border/40 overflow-hidden h-full">
                                <CardHeader className="border-b border-border/40 bg-blue-500/5 flex flex-row items-center justify-between">
                                    <CardTitle className="text-xs font-black uppercase tracking-widest text-blue-600">Resumen por Proveedor</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent border-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                <TableHead>Proveedor</TableHead>
                                                <TableHead className="text-center">Servicios</TableHead>
                                                <TableHead className="text-right pr-6">Coste Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transportAnalysis.filteredProviders.map(p => (
                                                <TableRow key={p.id} className="border-border/40 hover:bg-blue-500/5 transition-colors">
                                                    <TableCell className="text-xs font-bold uppercase tracking-tight">{p.name}</TableCell>
                                                    <TableCell className="text-center font-mono font-bold">{p.count}</TableCell>
                                                    <TableCell className="text-right pr-6 text-xs font-black">{formatCurrency(p.coste)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="personal" className="space-y-6">
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-4">
                            <KpiCard title="Total Personal" value={formatCurrency(personalAnalysis.totalPersonal)} icon={UserCheck} color="emerald" />
                            <Card className="bg-card/60 backdrop-blur-md border-border/40 overflow-hidden">
                                <CardHeader className="border-b border-border/40 bg-emerald-500/5">
                                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-emerald-600">Filtro por Categoría</CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 space-y-1">
                                    <Button variant={personalProviderFilter === 'all' ? 'secondary' : 'ghost'} className="w-full justify-start rounded-xl px-4 text-xs font-bold uppercase tracking-widest" onClick={() => setPersonalProviderFilter('all')}>Todas las categorías</Button>
                                    {categoriasPersonal.map((c: any) => (
                                        <Button key={c.id} variant={personalProviderFilter === c.id ? 'secondary' : 'ghost'} className="w-full justify-start rounded-xl px-4 text-xs font-bold uppercase tracking-widest truncate" onClick={() => setPersonalProviderFilter(c.id)}>{c.nombre || c.categoria || 'Sin Nombre'}</Button>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-2">
                            <Card className="bg-card/60 backdrop-blur-md border-border/40 overflow-hidden h-full">
                                <CardHeader className="border-b border-border/40 bg-emerald-500/5 flex flex-row items-center justify-between">
                                    <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-600">Resumen por Categoría / Ajustes</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent border-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                <TableHead>Categoría / Concepto</TableHead>
                                                <TableHead className="text-center">Turnos</TableHead>
                                                <TableHead className="text-right pr-6">Coste Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {personalAnalysis.filteredCategories.map(c => (
                                                <TableRow key={c.id} className="border-border/40 hover:bg-emerald-500/5 transition-colors">
                                                    <TableCell className="text-xs font-bold uppercase tracking-tight">{c.name}</TableCell>
                                                    <TableCell className="text-center font-mono font-bold">{c.id === 'adjustments' ? '-' : c.count}</TableCell>
                                                    <TableCell className="text-right pr-6 text-xs font-black">{formatCurrency(c.coste)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="partners" className="space-y-6">
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-4">
                            <Card className="bg-card/60 backdrop-blur-md border-border/40 overflow-hidden">
                                <CardHeader className="border-b border-border/40 bg-amber-500/5">
                                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-amber-600">Filtro por Partner</CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 space-y-1">
                                    <Button variant={partnerProviderFilter === 'all' ? 'secondary' : 'ghost'} className="w-full justify-start rounded-xl px-4 text-xs font-bold uppercase tracking-widest" onClick={() => setPartnerProviderFilter('all')}>Todos los partners</Button>
                                    {partnerAnalysis.partnersList.map(p => (
                                        <Button key={p.id} variant={partnerProviderFilter === p.id ? 'secondary' : 'ghost'} className="w-full justify-start rounded-xl px-4 text-xs font-bold uppercase tracking-widest truncate" onClick={() => setPartnerProviderFilter(p.id)}>{p.name}</Button>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-2">
                            <Card className="bg-card/60 backdrop-blur-md border-border/40 overflow-hidden h-full">
                                <CardHeader className="border-b border-border/40 bg-amber-500/5 flex flex-row items-center justify-between">
                                    <CardTitle className="text-xs font-black uppercase tracking-widest text-amber-600">Rendimiento por Partner</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent border-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                <TableHead>Partner</TableHead>
                                                <TableHead className="text-center">Unidades</TableHead>
                                                <TableHead className="text-right pr-6">Volumen Compra</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {partnerAnalysis.filteredPartners.map(p => (
                                                <TableRow key={p.id} className="border-border/40 hover:bg-amber-500/5 transition-colors">
                                                    <TableCell className="text-xs font-bold uppercase tracking-tight">{p.name}</TableCell>
                                                    <TableCell className="text-center font-mono font-bold">{p.count}</TableCell>
                                                    <TableCell className="text-right pr-6 text-xs font-black">{formatCurrency(p.value)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
