
'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Euro, Users, Building, Briefcase, BookOpen, Ticket } from 'lucide-react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import type { ServiceOrder, Espacio, Personal, ComercialBriefing, GastronomyOrder, MaterialOrder } from '@/types';
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

export default function AnaliticaCateringPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [allPedidos, setAllPedidos] = useState<AnaliticaCateringItem[]>([]);
    const [allEspacios, setAllEspacios] = useState<string[]>([]);
    const [allComerciales, setAllComerciales] = useState<string[]>([]);
    const [allClientes, setAllClientes] = useState<string[]>([]);

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    
    const [espacioFilter, setEspacioFilter] = useState('all');
    const [comercialFilter, setComercialFilter] = useState('all');
    const [clienteFilter, setClienteFilter] = useState('all');
    const [clienteTipoFilter, setClienteTipoFilter] = useState<'all' | 'Empresa' | 'Agencia'>('all');


    useEffect(() => {
        const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.vertical !== 'Entregas' && os.status === 'Confirmado');
        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];

        const data: AnaliticaCateringItem[] = allServiceOrders.map(os => {
            const briefing = allBriefings.find(b => b.osId === os.id);
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
            const matchesTipoCliente = clienteTipoFilter === 'all' || p.os.tipoCliente === clienteTipoFilter;
            return isInDateRange && matchesEspacio && matchesComercial && matchesCliente && matchesTipoCliente;
        });
    }, [allPedidos, dateRange, espacioFilter, comercialFilter, clienteFilter, clienteTipoFilter]);

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
        { title: "Ticket Medio / Servicio", value: formatCurrency(ticketMedioServicio), icon: Ticket },
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


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Analítica de Catering..." />;
    }

    return (
        <main>
            <Card className="mb-6">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.from && range?.to) { setIsDatePickerOpen(false); }}} numberOfMonths={2} locale={es}/>
                        </PopoverContent>
                    </Popover>
                     <Select value={clienteTipoFilter} onValueChange={(value) => setClienteTipoFilter(value as any)}>
                        <SelectTrigger><div className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> <SelectValue /></div></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Tipos de Cliente</SelectItem>
                            <SelectItem value="Empresa">Empresa</SelectItem>
                            <SelectItem value="Agencia">Agencia</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={comercialFilter} onValueChange={setComercialFilter}>
                        <SelectTrigger><div className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> <SelectValue /></div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos los Comerciales</SelectItem>{allComerciales.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={clienteFilter} onValueChange={setClienteFilter}>
                        <SelectTrigger><div className="flex items-center gap-2"><Users className="h-4 w-4" /> <SelectValue /></div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos los Clientes</SelectItem>{allClientes.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={espacioFilter} onValueChange={setEspacioFilter}>
                        <SelectTrigger><div className="flex items-center gap-2"><Building className="h-4 w-4" /> <SelectValue /></div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos los Espacios</SelectItem>{allEspacios.map(e=><SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                    </Select>
                </CardContent>
            </Card>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                {kpis.map(kpi => (
                    <Card key={kpi.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{kpi.title}</CardTitle><kpi.icon className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent><div className={cn("text-2xl font-bold", kpi.title.includes('Rentabilidad') && margenFinal < 0 && "text-destructive", kpi.title.includes('Rentabilidad') && margenFinal > 0 && "text-green-600")}>{kpi.value}</div></CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
                <Card>
                    <CardHeader><CardTitle>Desglose de Costes Agregados</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={analisisCostes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                        const RADIAN = Math.PI / 180;
                                        const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
                                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                        return (
                                        <text x={x} y={y} fill="black" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                                            {`${analisisCostes[index].name} (${formatPercentage(percent)})`}
                                        </text>
                                        );
                                    }}>
                                    {analisisCostes.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Rendimiento por Comercial</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Comercial</TableHead><TableHead className="text-right">Eventos</TableHead><TableHead className="text-right">Facturación</TableHead><TableHead className="text-right">Margen</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {analisisComerciales.map(c => (
                                <TableRow key={c.name}>
                                    <TableCell className="font-medium">{c.name}</TableCell>
                                    <TableCell className="text-right">{c.eventos}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(c.facturacion)}</TableCell>
                                    <TableCell className={cn("text-right font-bold", c.margen < 0 && 'text-destructive')}>{formatPercentage(c.margenPct)}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            
             <div className="mb-8">
                <Card>
                    <CardHeader><CardTitle>Rendimiento por Metre</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Metre</TableHead><TableHead className="text-right">Eventos</TableHead><TableHead className="text-right">Facturación</TableHead><TableHead className="text-right">Margen</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {analisisMetres.map(m => (
                                <TableRow key={m.name}>
                                    <TableCell className="font-medium">{m.name}</TableCell>
                                    <TableCell className="text-right">{m.eventos}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(m.facturacion)}</TableCell>
                                    <TableCell className={cn("text-right font-bold", m.margen < 0 && 'text-destructive')}>{formatPercentage(m.margenPct)}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            
            <Accordion type="single" collapsible className="w-full mt-8">
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
                                                <TableCell className="font-medium"><Link href={`/os/${p.os.id}/cta-explotacion`} className="text-primary hover:underline">{p.os.serviceNumber}</Link></TableCell>
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
        </main>
    )
}

    