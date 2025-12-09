
'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Hand, Users, Building, Briefcase, BookOpen, Ticket, HandCoins, BarChart3, TrendingUp, TrendingDown, Euro } from 'lucide-react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import type { ServiceOrder, Espacio, Personal, ComercialBriefing, GastronomyOrder, MaterialOrder, ComercialBriefingItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatPercentage, formatNumber, calculateHours } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, isWithinInterval, endOfDay, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import Link from 'next/link';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Lazy load recharts components
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from '@/lib/recharts-lazy';

type AnaliticaCateringItem = {
    os: ServiceOrder;
    costeTotal: number;
    pvpFinal: number;
    numHitos: number;
    costesPorPartida: Record<string, number>;
};

const COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#AF19FF', '#FF6666', '#A0E7E5', '#B4F8C8', '#FBE7C6'];
const RENTABILIDAD_COLORS = {
    'Más rentables': '#22c55e', // green-500
    '38% - 40%': '#84cc16',      // lime-500
    '30% - 38%': '#facc15',      // yellow-400
    'Menos rentables': '#ef4444', // red-500
};

const calculateAllCosts = (osId: string): Record<string, number> => {
    const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    // Add other order types as needed...
    
    const costes: Record<string, number> = {};
    
    costes['Gastronomía'] = allGastroOrders.filter(o => o.osId === osId).reduce((sum, o) => sum + (o.total || 0), 0);
    costes['Bodega'] = allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bodega').reduce((sum, o) => sum + o.total, 0);
    costes['Bio'] = allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bio').reduce((sum, o) => sum + o.total, 0);
    costes['Almacén'] = allMaterialOrders.filter(o => o.osId === osId && o.type === 'Almacen').reduce((sum, o) => sum + o.total, 0);
    costes['Alquiler'] = allMaterialOrders.filter(o => o.osId === osId && o.type === 'Alquiler').reduce((sum, o) => sum + o.total, 0);

    return costes;
};

type MonthlyData = {
  month: string;
  numContratos: number;
  pax: number;
  asistentesHitos: number;
  facturacion: number;
  costes: Record<string, number>;
  rentabilidad: number;
  ingresosPorPax: number;
};

function KpiCard({ title, value, icon: Icon }: { title: string, value: string, icon: React.ElementType }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-2">
                <CardTitle className="text-xs font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-2">
                <div className="text-xl font-bold">{value}</div>
            </CardContent>
        </Card>
    )
}

export default function AnaliticaCateringPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [allPedidos, setAllPedidos] = useState<AnaliticaCateringItem[]>([]);
    const [allBriefings, setAllBriefings] = useState<ComercialBriefing[]>([]);
    const [allEspacios, setAllEspacios] = useState<string[]>([]);
    const [allComerciales, setAllComerciales] = useState<string[]>([]);
    const [allClientes, setAllClientes] = useState<string[]>([]);
    const [allMetres, setAllMetres] = useState<string[]>([]);

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    
    const [espacioFilter, setEspacioFilter] = useState('all');
    const [comercialFilter, setComercialFilter] = useState('all');
    const [clienteFilter, setClienteFilter] = useState('all');
    const [metreFilter, setMetreFilter] = useState('all');
    const [clienteTipoFilter, setClienteTipoFilter] = useState<'all' | 'Empresa' | 'Agencia'>('all');


    useEffect(() => {
        const serviceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.vertical !== 'Entregas' && os.status === 'Confirmado');
        const briefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        setAllBriefings(briefings);

        const data: AnaliticaCateringItem[] = serviceOrders.map(os => {
            const briefing = briefings.find(b => b.osId === os.id);
            const numHitos = briefing?.items.length || 0;
            const costesPorPartida = calculateAllCosts(os.id);
            const costeTotal = Object.values(costesPorPartida).reduce((sum, cost) => sum + cost, 0);
            
            const facturacionBruta = os.facturacion || 0;
            const comisiones = (os.comisionesAgencia || 0) + (os.comisionesCanon || 0);

            return { os, costeTotal, pvpFinal: facturacionBruta - comisiones, numHitos, costesPorPartida };
        });

        setAllPedidos(data);
        
        const espacios = new Set(data.map(p => p.os.space).filter(Boolean));
        setAllEspacios(Array.from(espacios));
        
        const comerciales = new Set(data.map(p => p.os.comercial).filter(Boolean));
        setAllComerciales(Array.from(comerciales));
        
        const clientes = new Set(data.map(p => p.os.client).filter(Boolean));
        setAllClientes(Array.from(clientes));

        const metres = new Set(data.map(p => p.os.respMetre).filter(Boolean));
        setAllMetres(Array.from(metres));

        setIsMounted(true);
    }, []);
    
    const pedidosFiltrados = useMemo(() => {
        if (!dateRange?.from) return [];
        const toDate = dateRange.to || dateRange.from;
        return allPedidos.filter(p => {
            const osDate = new Date(p.os.startDate);
            const isInDateRange = isWithinInterval(osDate, { start: dateRange.from!, end: endOfDay(toDate) });
            const matchesEspacio = espacioFilter === 'all' || p.os.space === espacioFilter;
            const matchesComercial = comercialFilter === 'all' || p.os.comercial === comercialFilter;
            const matchesCliente = clienteFilter === 'all' || p.os.client === clienteFilter;
            const matchesMetre = metreFilter === 'all' || p.os.respMetre === metreFilter;
            const matchesTipoCliente = clienteTipoFilter === 'all' || p.os.tipoCliente === clienteTipoFilter;
            return isInDateRange && matchesEspacio && matchesComercial && matchesCliente && matchesMetre && matchesTipoCliente;
        });
    }, [allPedidos, dateRange, espacioFilter, comercialFilter, clienteFilter, metreFilter, clienteTipoFilter]);

    const analisisGlobal = useMemo(() => {
        if (pedidosFiltrados.length === 0) return { pvpNeto: 0, costeTotal: 0, numEventos: 0, numServicios: 0, numPruebasMenu: 0, paxTotalesOS: 0, paxTotalesHitos: 0 };
        
        const pvpNeto = pedidosFiltrados.reduce((sum, p) => sum + p.pvpFinal, 0);
        const costeTotal = pedidosFiltrados.reduce((sum, p) => sum + p.costeTotal, 0);
        const paxTotalesOS = pedidosFiltrados.reduce((sum, p) => sum + (p.os.asistentes || 0), 0);

        let numServicios = 0;
        let numPruebasMenu = 0;
        let paxTotalesHitos = 0;

        pedidosFiltrados.forEach(p => {
            const briefing = allBriefings.find(b => b.osId === p.os.id);
            if (briefing) {
                briefing.items.forEach(item => {
                    paxTotalesHitos += item.asistentes || 0;
                    if (item.descripcion.toLowerCase() === 'prueba de menu') {
                        numPruebasMenu++;
                    } else {
                        numServicios++;
                    }
                });
            }
        });

        return { pvpNeto, costeTotal, numEventos: pedidosFiltrados.length, numServicios, numPruebasMenu, paxTotalesOS, paxTotalesHitos };
    }, [pedidosFiltrados, allBriefings]);
    
    const margenFinal = analisisGlobal.pvpNeto - analisisGlobal.costeTotal;
    const margenPct = analisisGlobal.pvpNeto > 0 ? (margenFinal / analisisGlobal.pvpNeto) : 0;
    const ticketMedioEvento = analisisGlobal.numEventos > 0 ? analisisGlobal.pvpNeto / analisisGlobal.numEventos : 0;
    const ticketMedioServicio = (analisisGlobal.numServicios + analisisGlobal.numPruebasMenu) > 0 ? analisisGlobal.pvpNeto / (analisisGlobal.numServicios + analisisGlobal.numPruebasMenu) : 0;
    const ticketMedioEventoAsistente = analisisGlobal.paxTotalesOS > 0 ? analisisGlobal.pvpNeto / analisisGlobal.paxTotalesOS : 0;
    const ticketMedioServicioAsistente = analisisGlobal.paxTotalesHitos > 0 ? analisisGlobal.pvpNeto / analisisGlobal.paxTotalesHitos : 0;

    const kpis = [
        { title: "Nº de Eventos", value: formatNumber(analisisGlobal.numEventos, 0), icon: BookOpen },
        { title: "Nº de Servicios", value: formatNumber(analisisGlobal.numServicios, 0), icon: Hand },
        { title: "Pruebas de Menu", value: formatNumber(analisisGlobal.numPruebasMenu, 0), icon: Hand },
        { title: "Asistentes OS", value: formatNumber(analisisGlobal.paxTotalesOS, 0), icon: Users },
        { title: "Asistentes Servicios", value: formatNumber(analisisGlobal.paxTotalesHitos, 0), icon: Users },
        { title: "Facturación Neta", value: formatCurrency(analisisGlobal.pvpNeto), icon: Euro },
        { title: "Coste Directo Total", value: formatCurrency(analisisGlobal.costeTotal), icon: TrendingDown },
        { title: "Rentabilidad Bruta", value: formatCurrency(margenFinal), icon: TrendingUp },
        { title: "Margen Bruto (%)", value: formatPercentage(margenPct), icon: Euro },
        { title: "Ticket Medio / Evento", value: formatCurrency(ticketMedioEvento), icon: Ticket },
        { title: "Ticket Medio / Servicio", value: formatCurrency(ticketMedioServicio), icon: HandCoins },
        { title: "Ticket Medio / Evento / Pax", value: formatCurrency(ticketMedioEventoAsistente), icon: HandCoins },
        { title: "Ticket Medio / Servicio / Pax", value: formatCurrency(ticketMedioServicioAsistente), icon: HandCoins },
    ];

    const analisisComerciales = useMemo(() => {
        const porComercial: Record<string, { facturacion: number; coste: number; eventos: AnaliticaCateringItem[] }> = {};
        pedidosFiltrados.forEach(p => {
            const comercial = p.os.comercial || 'Sin Asignar';
            if (!porComercial[comercial]) porComercial[comercial] = { facturacion: 0, coste: 0, eventos: [] };
            porComercial[comercial].facturacion += p.pvpFinal;
            porComercial[comercial].coste += p.costeTotal;
            porComercial[comercial].eventos.push(p);
        });
        return Object.entries(porComercial).map(([name, data]) => ({
            name, ...data, margen: data.facturacion - data.coste, margenPct: data.facturacion > 0 ? (data.facturacion - data.coste) / data.facturacion : 0
        })).sort((a, b) => b.margen - a.margen);
    }, [pedidosFiltrados]);
    
    const analisisMetres = useMemo(() => {
        const porMetre: Record<string, { facturacion: number; coste: number; eventos: AnaliticaCateringItem[] }> = {};
        pedidosFiltrados.forEach(p => {
            const metre = p.os.respMetre || 'Sin Asignar';
            if (!porMetre[metre]) porMetre[metre] = { facturacion: 0, coste: 0, eventos: [] };
            porMetre[metre].facturacion += p.pvpFinal;
            porMetre[metre].coste += p.costeTotal;
            porMetre[metre].eventos.push(p);
        });
        return Object.entries(porMetre).map(([name, data]) => ({
            name, ...data, margen: data.facturacion - data.coste, margenPct: data.facturacion > 0 ? (data.facturacion - data.coste) / data.facturacion : 0
        })).sort((a, b) => b.margen - a.margen);
    }, [pedidosFiltrados]);

    const analisisClientes = useMemo(() => {
        const porCliente: Record<string, { facturacion: number; coste: number; eventos: AnaliticaCateringItem[] }> = {};
        pedidosFiltrados.forEach(p => {
            const cliente = p.os.client || 'Sin Cliente';
            if (!porCliente[cliente]) porCliente[cliente] = { facturacion: 0, coste: 0, eventos: [] };
            porCliente[cliente].facturacion += p.pvpFinal;
            porCliente[cliente].coste += p.costeTotal;
            porCliente[cliente].eventos.push(p);
        });
        return Object.entries(porCliente).map(([name, data]) => ({
            name, ...data, margen: data.facturacion - data.coste, margenPct: data.facturacion > 0 ? (data.facturacion - data.coste) / data.facturacion : 0
        })).sort((a, b) => b.facturacion - a.facturacion);
    }, [pedidosFiltrados]);

    const analisisEspacios = useMemo(() => {
        const porEspacio: Record<string, { facturacion: number; coste: number; eventos: AnaliticaCateringItem[] }> = {};
        pedidosFiltrados.forEach(p => {
            const espacio = p.os.space || 'Sin Espacio';
            if (!porEspacio[espacio]) porEspacio[espacio] = { facturacion: 0, coste: 0, eventos: [] };
            porEspacio[espacio].facturacion += p.pvpFinal;
            porEspacio[espacio].coste += p.costeTotal;
            porEspacio[espacio].eventos.push(p);
        });
        return Object.entries(porEspacio).map(([name, data]) => ({
            name, ...data, margen: data.facturacion - data.coste, margenPct: data.facturacion > 0 ? (data.facturacion - data.coste) / data.facturacion : 0
        })).sort((a, b) => b.facturacion - a.facturacion);
    }, [pedidosFiltrados]);

    const analisisTipoServicio = useMemo(() => {
        const porTipo: Record<string, { count: number; facturacion: number; costeAsignado: number }> = {};

        pedidosFiltrados.forEach(p => {
            const briefing = allBriefings.find(b => b.osId === p.os.id);
            if (!briefing || briefing.items.length === 0) return;

            const facturacionTotalOS = briefing.items.reduce((sum, item) => sum + (item.asistentes || 0) * (item.precioUnitario || 0) + (item.importeFijo || 0), 0);
            
            briefing.items.forEach(item => {
                const tipo = item.descripcion || 'Sin Descripción';
                if (!porTipo[tipo]) porTipo[tipo] = { count: 0, facturacion: 0, costeAsignado: 0 };

                const facturacionHito = (item.asistentes || 0) * (item.precioUnitario || 0) + (item.importeFijo || 0);
                const pesoHito = facturacionTotalOS > 0 ? facturacionHito / facturacionTotalOS : 0;
                
                porTipo[tipo].count += 1;
                porTipo[tipo].facturacion += facturacionHito;
                porTipo[tipo].costeAsignado += p.costeTotal * pesoHito;
            });
        });

        return Object.entries(porTipo).map(([name, data]) => {
            const margen = data.facturacion - data.costeAsignado;
            const margenPct = data.facturacion > 0 ? margen / data.facturacion : 0;
            return { name, ...data, margen, margenPct };
        }).sort((a, b) => b.facturacion - a.facturacion);
    }, [pedidosFiltrados, allBriefings]);

    const analisisAgregado = useMemo(() => {
        const byMonth: Record<string, MonthlyData> = {};

        pedidosFiltrados.forEach(p => {
            const month = format(new Date(p.os.startDate), 'yyyy-MM');
            if (!byMonth[month]) {
                byMonth[month] = {
                    month: format(new Date(p.os.startDate), 'MMM', { locale: es }),
                    numContratos: 0, pax: 0, asistentesHitos: 0, facturacion: 0, costes: {}, rentabilidad: 0, ingresosPorPax: 0
                };
            }

            const data = byMonth[month];
            data.numContratos += 1;
            data.pax += p.os.asistentes || 0;
            const briefing = allBriefings.find(b => b.osId === p.os.id);
            data.asistentesHitos += briefing?.items.reduce((sum, item) => sum + (item.asistentes || 0), 0) || 0;
            data.facturacion += p.pvpFinal;
            for (const partida in p.costesPorPartida) {
                data.costes[partida] = (data.costes[partida] || 0) + p.costesPorPartida[partida];
            }
        });

        Object.values(byMonth).forEach(data => {
            const totalCostes = Object.values(data.costes).reduce((s, c) => s + c, 0);
            data.rentabilidad = data.facturacion - totalCostes;
            data.ingresosPorPax = data.pax > 0 ? data.facturacion / data.pax : 0;
        });
        
        return Object.values(byMonth).sort((a,b) => new Date(Object.keys(byMonth).find(key => byMonth[key] === a)!).getTime() - new Date(Object.keys(byMonth).find(key => byMonth[key] === b)!).getTime());
    }, [pedidosFiltrados, allBriefings]);

    const partidasCostes = useMemo(() => {
        const set = new Set<string>();
        pedidosFiltrados.forEach(p => {
            Object.keys(p.costesPorPartida).forEach(key => set.add(key));
        });
        return Array.from(set);
    }, [pedidosFiltrados]);

    const rentabilidadPorEvento = useMemo(() => {
        const eventosConRentabilidad = pedidosFiltrados.map(p => {
            const rentabilidad = p.pvpFinal > 0 ? (p.pvpFinal - p.costeTotal) / p.pvpFinal : 0;
            return { ...p, rentabilidad };
        });

        const categorias = {
            'Más rentables': eventosConRentabilidad.filter(p => p.rentabilidad > 0.4),
            '38% - 40%': eventosConRentabilidad.filter(p => p.rentabilidad >= 0.38 && p.rentabilidad <= 0.4),
            '30% - 38%': eventosConRentabilidad.filter(p => p.rentabilidad >= 0.3 && p.rentabilidad < 0.38),
            'Menos rentables': eventosConRentabilidad.filter(p => p.rentabilidad < 0.3),
        };
        
        for (const cat in categorias) {
            (categorias as any)[cat].sort((a:any, b:any) => b.rentabilidad - a.rentabilidad);
        }

        return categorias;
    }, [pedidosFiltrados]);

    const dataGraficoRentabilidad = useMemo(() => {
        return Object.entries(rentabilidadPorEvento).map(([name, value]) => ({
            name,
            value: value.length,
        })).filter(item => item.value > 0);
    }, [rentabilidadPorEvento]);

    const objetivoGasto = { 'Almacén': 0.0523, 'Alquiler': 0.0378, 'Bodega': 0.0392, 'Consumibles': 0.0067, 'Decoración': 0.0073, 'Gastronomía': 0.233, 'Hielo': 0.0026, 'Otros gastos': 0.01, 'Personal MICE': 0.0563, 'Personal externo': 0.1241, 'Prueba de menú': 0, 'Rentabilidad': 0.4041 };
    
    const analisisDesviaciones = useMemo(() => {
        const totalCostes: Record<string, number> = {};
        let totalFacturacion = 0;

        analisisAgregado.forEach(monthData => {
            totalFacturacion += monthData.facturacion;
            for(const partida in monthData.costes) {
                totalCostes[partida] = (totalCostes[partida] || 0) + monthData.costes[partida];
            }
        });
        
        return Object.entries(totalCostes).map(([partida, costeReal]) => {
            const costeObjetivo = totalFacturacion * ((objetivoGasto as any)[partida] || 0);
            return {
                name: partida,
                desviacion: costeReal - costeObjetivo
            }
        });

    }, [analisisAgregado, objetivoGasto]);
    
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
        setIsDatePickerOpen(false);
    };


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Analítica de Catering..." />;
    }

    return (
        <main>
            <Card className="mb-6">
                <CardContent className="p-4 flex flex-col xl:flex-row gap-4">
                     <div className="flex flex-wrap items-center gap-2">
                         <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-full md:w-[260px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.from && range?.to) { setIsDatePickerOpen(false); }}} numberOfMonths={2} locale={es}/>
                            </PopoverContent>
                        </Popover>
                         <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('month')}>Mes</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('year')}>Año</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q1')}>Q1</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q2')}>Q2</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q3')}>Q3</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q4')}>Q4</Button>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 flex-1">
                        <Select value={clienteTipoFilter} onValueChange={(value) => setClienteTipoFilter(value as any)}>
                            <SelectTrigger><div className="flex items-center gap-2 text-xs truncate"><Briefcase /> <SelectValue /></div></SelectTrigger>
                            <SelectContent><SelectItem value="all">Todos los Tipos</SelectItem><SelectItem value="Empresa">Empresa</SelectItem><SelectItem value="Agencia">Agencia</SelectItem></SelectContent>
                        </Select>
                        <Select value={comercialFilter} onValueChange={setComercialFilter}>
                            <SelectTrigger><div className="flex items-center gap-2 text-xs truncate"><Briefcase /> <SelectValue /></div></SelectTrigger>
                            <SelectContent><SelectItem value="all">Todos los Comerciales</SelectItem>{allComerciales.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={metreFilter} onValueChange={setMetreFilter}>
                            <SelectTrigger><div className="flex items-center gap-2 text-xs truncate"><Users /> <SelectValue /></div></SelectTrigger>
                            <SelectContent><SelectItem value="all">Todos los Metres</SelectItem>{allMetres.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={clienteFilter} onValueChange={setClienteFilter}>
                            <SelectTrigger><div className="flex items-center gap-2 text-xs truncate"><Users /> <SelectValue /></div></SelectTrigger>
                            <SelectContent><SelectItem value="all">Todos los Clientes</SelectItem>{allClientes.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                         <Select value={espacioFilter} onValueChange={setEspacioFilter}>
                            <SelectTrigger><div className="flex items-center gap-2 text-xs truncate"><Building /> <SelectValue /></div></SelectTrigger>
                            <SelectContent><SelectItem value="all">Todos los Espacios</SelectItem>{allEspacios.map(e=><SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

             <Tabs defaultValue="analisis">
                <TabsList className="grid w-full grid-cols-8 mb-4">
                    <TabsTrigger value="analisis">Análisis</TabsTrigger>
                    <TabsTrigger value="agregado">Vista Agregada</TabsTrigger>
                    <TabsTrigger value="rentabilidad">Rentabilidad por Evento</TabsTrigger>
                    <TabsTrigger value="comercial"><Briefcase className="mr-2 h-4 w-4"/>Por Comercial</TabsTrigger>
                    <TabsTrigger value="metre"><Users className="mr-2 h-4 w-4"/>Por Metre</TabsTrigger>
                    <TabsTrigger value="cliente"><Users className="mr-2 h-4 w-4"/>Por Cliente</TabsTrigger>
                    <TabsTrigger value="espacio"><Building className="mr-2 h-4 w-4"/>Por Espacio</TabsTrigger>
                    <TabsTrigger value="tipo_servicio"><Hand className="mr-2 h-4 w-4"/>Por Tipo de Servicio</TabsTrigger>
                </TabsList>
                <TabsContent value="analisis" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2">
                        {kpis.map(kpi => <KpiCard key={kpi.title} title={kpi.title} value={kpi.value} icon={kpi.icon} />)}
                    </div>
                    
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1" className="border-none">
                            <Card>
                                <AccordionTrigger className="py-2 px-4">
                                    <CardTitle>Listado de Órdenes de Servicio en el Periodo ({pedidosFiltrados.length})</CardTitle>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <CardContent className="pt-2">
                                        <div className="border rounded-lg max-h-96 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nº OS</TableHead>
                                                    <TableHead>Cliente</TableHead>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead className="text-right">PVP Neto</TableHead>
                                                    <TableHead className="text-right">Coste Total</TableHead>
                                                    <TableHead className="text-right">Margen</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {pedidosFiltrados.map(p => (
                                                    <TableRow key={p.os.id} className="cursor-pointer">
                                                        <TableCell className="font-medium"><Link href={`/os/${p.os.id}/cta-explotacion`} className="text-primary hover:underline font-mono text-xs">{p.os.serviceNumber}</Link></TableCell>
                                                        <TableCell>{p.os.client}</TableCell>
                                                        <TableCell>{format(new Date(p.os.startDate), 'dd/MM/yyyy')}</TableCell>
                                                        <TableCell className="text-right">{formatCurrency(p.pvpFinal)}</TableCell>
                                                        <TableCell className="text-right">{formatCurrency(p.costeTotal)}</TableCell>
                                                        <TableCell className={cn("text-right font-bold", p.pvpFinal - p.costeTotal < 0 && 'text-destructive')}>{formatPercentage((p.pvpFinal - p.costeTotal) / p.pvpFinal)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        </div>
                                    </CardContent>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                    </Accordion>
                </TabsContent>
                <TabsContent value="agregado" className="space-y-4">
                    <div className="grid lg:grid-cols-2 gap-4 items-start">
                        <Card>
                            <CardHeader><CardTitle>Vista Agregada Mensual (€)</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Concepto</TableHead>
                                            {analisisAgregado.map(m => <TableHead key={m.month} className="text-right">{m.month}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow><TableCell className="font-bold">Nº Contratos</TableCell>{analisisAgregado.map(m => <TableCell key={m.month} className="text-right">{m.numContratos}</TableCell>)}</TableRow>
                                        <TableRow><TableCell className="font-bold">PAX</TableCell>{analisisAgregado.map(m => <TableCell key={m.month} className="text-right">{m.pax}</TableCell>)}</TableRow>
                                        <TableRow><TableCell className="font-bold">Facturación</TableCell>{analisisAgregado.map(m => <TableCell key={m.month} className="text-right">{formatCurrency(m.facturacion)}</TableCell>)}</TableRow>
                                        <TableRow className="bg-muted/30"><TableCell colSpan={analisisAgregado.length + 1} className="font-bold pl-8">Costes</TableCell></TableRow>
                                        {partidasCostes.map(partida => (
                                            <TableRow key={partida}>
                                                <TableCell className="pl-8">{partida}</TableCell>
                                                {analisisAgregado.map(m => <TableCell key={m.month} className="text-right">{formatCurrency(m.costes[partida] || 0)}</TableCell>)}
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-muted/30"><TableCell colSpan={analisisAgregado.length + 1}></TableCell></TableRow>
                                        <TableRow><TableCell className="font-bold">Rentabilidad</TableCell>{analisisAgregado.map(m => <TableCell key={m.month} className={cn("text-right font-bold", m.rentabilidad < 0 ? 'text-destructive':'text-green-600')}>{formatCurrency(m.rentabilidad)}</TableCell>)}</TableRow>
                                        <TableRow><TableCell className="font-bold">Ingresos / PAX</TableCell>{analisisAgregado.map(m => <TableCell key={m.month} className="text-right">{formatCurrency(m.ingresosPorPax)}</TableCell>)}</TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Desviación de Costes vs Objetivo</CardTitle></CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={analisisDesviaciones} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                                        <YAxis type="category" dataKey="name" width={100} fontSize={12} />
                                        <Tooltip formatter={(value:any) => formatCurrency(value)} />
                                        <Bar dataKey="desviacion" name="Desviación">
                                            {analisisDesviaciones.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.desviacion > 0 ? '#ef4444' : '#22c55e'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                    
                    <Card>
                        <CardHeader><CardTitle>Vista Agregada Mensual (%)</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>%</TableHead>
                                        <TableHead>Objetivo</TableHead>
                                        {analisisAgregado.map(m => <TableHead key={m.month} className="text-right">{m.month}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {partidasCostes.map(partida => {
                                        const objetivo = (objetivoGasto as any)[partida] || 0;
                                        return (
                                            <TableRow key={partida}>
                                                <TableCell>{partida}</TableCell>
                                                <TableCell>{formatPercentage(objetivo)}</TableCell>
                                                {analisisAgregado.map(m => {
                                                    const realPct = m.facturacion > 0 ? (m.costes[partida] || 0) / m.facturacion : 0;
                                                    return (
                                                        <TableCell key={m.month} className={cn("text-right", realPct > objetivo ? 'text-destructive font-semibold' : 'text-green-600')}>
                                                            {formatPercentage(realPct)}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        )
                                    })}
                                    <TableRow className="font-bold bg-muted/30">
                                        <TableCell>Rentabilidad</TableCell>
                                        <TableCell>{formatPercentage(objetivoGasto['Rentabilidad'] || 0)}</TableCell>
                                        {analisisAgregado.map(m => {
                                             const rentabilidadPct = m.facturacion > 0 ? m.rentabilidad / m.facturacion : 0;
                                             return (
                                                 <TableCell key={m.month} className={cn("text-right", rentabilidadPct < objetivoGasto['Rentabilidad'] ? 'text-destructive' : 'text-green-600')}>
                                                     {formatPercentage(rentabilidadPct)}
                                                 </TableCell>
                                             )
                                        })}
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                </TabsContent>
                 <TabsContent value="rentabilidad" className="space-y-4">
                     <div className="grid lg:grid-cols-5 gap-8 items-start">
                        <div className="lg:col-span-2">
                             <Card>
                                <CardHeader><CardTitle>Distribución de Rentabilidad por Evento</CardTitle></CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie data={dataGraficoRentabilidad} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${formatPercentage(percent)})`} >
                                            {dataGraficoRentabilidad.map((entry) => (
                                                <Cell key={`cell-${entry.name}`} fill={RENTABILIDAD_COLORS[entry.name as keyof typeof RENTABILIDAD_COLORS]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value, name) => [`${value} eventos`, name]}/>
                                    </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(rentabilidadPorEvento).map(([categoria, eventos]) => {
                                if (eventos.length === 0) return null;
                                const colorClass = categoria === 'Más rentables' ? 'bg-green-100 border-green-200' : categoria === 'Menos rentables' ? 'bg-red-100 border-red-200' : categoria === '30% - 38%' ? 'bg-yellow-100 border-yellow-200' : 'bg-lime-100 border-lime-200';
                                return (
                                <Card key={categoria} className={colorClass}>
                                    <CardHeader className="py-3 px-4">
                                        <CardTitle className="text-base">{categoria} ({formatPercentage(eventos.length / pedidosFiltrados.length)})</CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-2 pt-0 max-h-80 overflow-y-auto">
                                        <Table>
                                            <TableBody>
                                                {eventos.map(p => (
                                                    <TableRow key={p.os.id}>
                                                        <TableCell className="p-1"><Link href={`/os/${p.os.id}/cta-explotacion`} className="text-primary hover:underline font-mono text-xs">{p.os.serviceNumber}</Link></TableCell>
                                                        <TableCell className="text-right p-1 font-semibold">{formatPercentage(p.rentabilidad)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )})}
                        </div>
                    </div>
                </TabsContent>
                 <TabsContent value="comercial" className="space-y-4">
                     <Card>
                        <CardHeader><CardTitle>Rendimiento por Comercial</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-[1fr_auto] gap-8">
                                <ResponsiveContainer width="100%" height={analisisComerciales.length * 60}>
                                    <BarChart data={analisisComerciales} layout="vertical" margin={{ left: 100 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                                        <YAxis type="category" dataKey="name" width={100} stroke="#888888" fontSize={12} />
                                        <Tooltip formatter={(value:any) => formatCurrency(value)} />
                                        <Legend />
                                        <Bar dataKey="facturacion" name="Facturación" fill="#8884d8" />
                                        <Bar dataKey="margen" name="Margen Bruto" fill="#82ca9d" />
                                    </BarChart>
                                </ResponsiveContainer>
                                 <Accordion type="single" collapsible className="w-full max-w-lg">
                                    {analisisComerciales.map(c => (
                                        <AccordionItem key={c.name} value={c.name}>
                                            <AccordionTrigger className="font-semibold">{c.name}</AccordionTrigger>
                                            <AccordionContent>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Nº OS</TableHead>
                                                            <TableHead>Cliente</TableHead>
                                                            <TableHead className="text-right">Margen</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {c.eventos.map(p => (
                                                            <TableRow key={p.os.id}>
                                                                <TableCell><Link href={`/os/${p.os.id}/cta-explotacion`} className="text-primary hover:underline font-mono text-xs">{p.os.serviceNumber}</Link></TableCell>
                                                                <TableCell>{p.os.client}</TableCell>
                                                                <TableCell className={cn("text-right font-bold", p.pvpFinal - p.costeTotal < 0 && 'text-destructive')}>{formatPercentage((p.pvpFinal - p.costeTotal) / p.pvpFinal)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="metre" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Rendimiento por Metre</CardTitle></CardHeader>
                         <CardContent>
                             <div className="grid md:grid-cols-[1fr_auto] gap-8">
                                <ResponsiveContainer width="100%" height={analisisMetres.length * 60}>
                                    <BarChart data={analisisMetres} layout="vertical" margin={{ left: 100 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                                        <YAxis type="category" dataKey="name" width={100} stroke="#888888" fontSize={12} />
                                        <Tooltip formatter={(value:any) => formatCurrency(value)} />
                                        <Legend />
                                        <Bar dataKey="facturacion" name="Facturación" fill="#8884d8" />
                                        <Bar dataKey="margen" name="Margen Bruto" fill="#82ca9d" />
                                    </BarChart>
                                </ResponsiveContainer>
                                <Accordion type="single" collapsible className="w-full max-w-lg">
                                    {analisisMetres.map(m => (
                                        <AccordionItem key={m.name} value={m.name}>
                                            <AccordionTrigger className="font-semibold">{m.name}</AccordionTrigger>
                                            <AccordionContent>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Nº OS</TableHead>
                                                            <TableHead>Cliente</TableHead>
                                                            <TableHead className="text-right">Margen</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {m.eventos.map(p => (
                                                            <TableRow key={p.os.id}>
                                                                <TableCell><Link href={`/os/${p.os.id}/cta-explotacion`} className="text-primary hover:underline font-mono text-xs">{p.os.serviceNumber}</Link></TableCell>
                                                                <TableCell>{p.os.client}</TableCell>
                                                                <TableCell className={cn("text-right font-bold", p.pvpFinal - p.costeTotal < 0 && 'text-destructive')}>{formatPercentage((p.pvpFinal - p.costeTotal) / p.pvpFinal)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="cliente" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Rendimiento por Cliente</CardTitle></CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                {analisisClientes.map(c => (
                                    <AccordionItem key={c.name} value={c.name}>
                                        <AccordionTrigger className="font-semibold">{c.name}</AccordionTrigger>
                                        <AccordionContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Nº OS</TableHead>
                                                        <TableHead>Fecha</TableHead>
                                                        <TableHead className="text-right">Facturación</TableHead>
                                                        <TableHead className="text-right">Margen</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {c.eventos.map(p => (
                                                        <TableRow key={p.os.id}>
                                                            <TableCell><Link href={`/os/${p.os.id}/cta-explotacion`} className="text-primary hover:underline font-mono text-xs">{p.os.serviceNumber}</Link></TableCell>
                                                            <TableCell>{format(new Date(p.os.startDate), 'dd/MM/yyyy')}</TableCell>
                                                            <TableCell className="text-right">{formatCurrency(p.pvpFinal)}</TableCell>
                                                            <TableCell className={cn("text-right font-bold", p.pvpFinal - p.costeTotal < 0 && 'text-destructive')}>{formatPercentage((p.pvpFinal - p.costeTotal) / p.pvpFinal)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="espacio" className="space-y-4">
                     <Card>
                        <CardHeader><CardTitle>Rendimiento por Espacio</CardTitle></CardHeader>
                        <CardContent>
                             <Accordion type="single" collapsible className="w-full">
                                {analisisEspacios.map(e => (
                                    <AccordionItem key={e.name} value={e.name}>
                                        <AccordionTrigger className="font-semibold">{e.name}</AccordionTrigger>
                                        <AccordionContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Nº OS</TableHead>
                                                        <TableHead>Cliente</TableHead>
                                                        <TableHead className="text-right">Facturación</TableHead>
                                                        <TableHead className="text-right">Margen</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {e.eventos.map(p => (
                                                        <TableRow key={p.os.id}>
                                                            <TableCell><Link href={`/os/${p.os.id}/cta-explotacion`} className="text-primary hover:underline font-mono text-xs">{p.os.serviceNumber}</Link></TableCell>
                                                            <TableCell>{p.os.client}</TableCell>
                                                            <TableCell className="text-right">{formatCurrency(p.pvpFinal)}</TableCell>
                                                            <TableCell className={cn("text-right font-bold", p.pvpFinal - p.costeTotal < 0 && 'text-destructive')}>{formatPercentage((p.pvpFinal - p.costeTotal) / p.pvpFinal)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="tipo_servicio" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Rentabilidad por Tipo de Servicio</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tipo de Servicio</TableHead>
                                        <TableHead className="text-right">Nº de Ventas</TableHead>
                                        <TableHead className="text-right">Facturación Total</TableHead>
                                        <TableHead className="text-right">Coste Asignado</TableHead>
                                        <TableHead className="text-right">Margen Bruto</TableHead>
                                        <TableHead className="text-right">Margen %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analisisTipoServicio.map(s => (
                                        <TableRow key={s.name}>
                                            <TableCell className="font-semibold">{s.name}</TableCell>
                                            <TableCell className="text-right">{s.count}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(s.facturacion)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(s.costeAsignado)}</TableCell>
                                            <TableCell className={cn("text-right font-bold", s.margen < 0 ? "text-destructive" : "text-green-600")}>{formatCurrency(s.margen)}</TableCell>
                                            <TableCell className={cn("text-right font-bold", s.margenPct < 0 ? "text-destructive" : "text-green-600")}>{formatPercentage(s.margenPct)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </main>
    )
}
    

    

    
