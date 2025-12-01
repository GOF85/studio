
'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Euro, Users, Building, Briefcase, BookOpen, Ticket, Hand } from 'lucide-react';
import type { ServiceOrder, Espacio, Personal, ComercialBriefing, GastronomyOrder, MaterialOrder, ComercialBriefingItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatPercentage, formatNumber, calculateHours } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, isWithinInterval, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import Link from 'next/link';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts"

type AnaliticaCateringItem = {
    os: ServiceOrder;
    costeTotal: number;
    pvpFinal: number;
    numHitos: number;
    costesPorPartida: Record<string, number>;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF6666', '#A0E7E5', '#B4F8C8', '#FBE7C6'];

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

export default function AnaliticaCateringPage() {
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
        if (pedidosFiltrados.length === 0) return { pvpNeto: 0, costeTotal: 0, numEventos: 0, numHitos: 0 };
        
        const pvpNeto = pedidosFiltrados.reduce((sum, p) => sum + p.pvpFinal, 0);
        const costeTotal = pedidosFiltrados.reduce((sum, p) => sum + p.costeTotal, 0);
        const numHitos = pedidosFiltrados.reduce((sum, p) => sum + p.numHitos, 0);

        return { pvpNeto, costeTotal, numEventos: pedidosFiltrados.length, numHitos };
    }, [pedidosFiltrados]);
    
    const margenFinal = analisisGlobal.pvpNeto - analisisGlobal.costeTotal;
    const margenPct = analisisGlobal.pvpNeto > 0 ? (margenFinal / analisisGlobal.pvpNeto) : 0;
    const ticketMedioEvento = analisisGlobal.numEventos > 0 ? analisisGlobal.pvpNeto / analisisGlobal.numEventos : 0;
    const ticketMedioServicio = analisisGlobal.numHitos > 0 ? analisisGlobal.pvpNeto / analisisGlobal.numHitos : 0;

    const kpis = [
        { title: "Nº de Eventos", value: formatNumber(analisisGlobal.numEventos, 0), icon: BookOpen },
        { title: "Facturación Neta", value: formatCurrency(analisisGlobal.pvpNeto), icon: Euro },
        { title: "Coste Directo Total", value: formatCurrency(analisisGlobal.costeTotal), icon: TrendingDown },
        { title: "Rentabilidad Bruta", value: formatCurrency(margenFinal), icon: TrendingUp },
        { title: "Margen Bruto (%)", value: formatPercentage(margenPct), icon: Euro },
        { title: "Ticket Medio / Evento", value: formatCurrency(ticketMedioEvento), icon: Ticket },
        { title: "Ticket Medio / Servicio", value: formatCurrency(ticketMedioServicio), icon: Hand },
    ];

    const analisisCostes = useMemo(() => {
        const costesAgregados: Record<string, number> = {};
        pedidosFiltrados.forEach(pedido => {
            for (const partida in pedido.costesPorPartida) {
                costesAgregados[partida] = (costesAgregados[partida] || 0) + pedido.costesPorPartida[partida];
            }
        });
        return Object.entries(costesAgregados)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0)
            .sort((a,b) => b.value - a.value);
    }, [pedidosFiltrados]);

    const analisisComerciales = useMemo(() => {
        const porComercial: Record<string, { facturacion: number, coste: number, eventos: number }> = {};
        pedidosFiltrados.forEach(p => {
            const comercial = p.os.comercial || 'Sin Asignar';
            if (!porComercial[comercial]) porComercial[comercial] = { facturacion: 0, coste: 0, eventos: 0 };
            porComercial[comercial].facturacion += p.pvpFinal;
            porComercial[comercial].coste += p.costeTotal;
            porComercial[comercial].eventos += 1;
        });
        return Object.entries(porComercial).map(([name, data]) => ({
            name, ...data, margen: data.facturacion - data.coste, margenPct: data.facturacion > 0 ? (data.facturacion - data.coste) / data.facturacion : 0
        })).sort((a, b) => b.margen - a.margen);
    }, [pedidosFiltrados]);
    
    const analisisMetres = useMemo(() => {
        const porMetre: Record<string, { facturacion: number; coste: number; eventos: number }> = {};
        pedidosFiltrados.forEach(p => {
            const metre = p.os.respMetre || 'Sin Asignar';
            if (!porMetre[metre]) porMetre[metre] = { facturacion: 0, coste: 0, eventos: 0 };
            porMetre[metre].facturacion += p.pvpFinal;
            porMetre[metre].coste += p.costeTotal;
            porMetre[metre].eventos += 1;
        });
        return Object.entries(porMetre).map(([name, data]) => ({
            name, ...data, margen: data.facturacion - data.coste, margenPct: data.facturacion > 0 ? (data.facturacion - data.coste) / data.facturacion : 0
        })).sort((a, b) => b.margen - a.margen);
    }, [pedidosFiltrados]);
    
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
            data.asistentesHitos += briefing?.items.reduce((sum, item) => sum + item.asistentes, 0) || 0;
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

    const objetivoGasto = { 'Almacén': 0.0523, 'Alquiler': 0.0378, 'Bodega': 0.0392, 'Consumibles': 0.0067, 'Decoración': 0.0073, 'Gastronomía': 0.233, 'Hielo': 0.0026, 'Otros gastos': 0.01, 'Personal MICE': 0.0563, 'Personal externo': 0.1241, 'Prueba de menú': 0, 'Transporte': 0.0265, 'Rentabilidad': 0.4041 };


