
'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Euro, Users, Building, Briefcase } from 'lucide-react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import type { ServiceOrder, Espacio, Personal } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
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

type AnaliticaCateringItem = {
    os: ServiceOrder;
    costeTotal: number;
    pvpFinal: number;
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
    const [selectedPedidos, setSelectedPedidos] = useState<Set<string>>(new Set());
    
    // Filtros
    const [espacioFilter, setEspacioFilter] = useState('all');
    const [comercialFilter, setComercialFilter] = useState('all');
    const [clienteFilter, setClienteFilter] = useState('all');


    useEffect(() => {
        const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.vertical !== 'Entregas' && os.status === 'Confirmado');
        
        const data: AnaliticaCateringItem[] = allServiceOrders.map(os => {
            const facturacionBruta = os.facturacion || 0;
            const comisiones = (os.comisionesAgencia || 0) + (os.comisionesCanon || 0);
            
            // Simplified cost calculation for this view. A full CtaExplotacion would be needed for perfect accuracy.
            const costeGastronomia = (JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as any[]).filter(o => o.osId === os.id).reduce((s,o) => s + (o.total || 0), 0);
            const costeMaterial = (JSON.parse(localStorage.getItem('materialOrders') || '[]') as any[]).filter(o => o.osId === os.id).reduce((s,o) => s + o.total, 0);
            const costeHielo = (JSON.parse(localStorage.getItem('hieloOrders') || '[]') as any[]).filter(o => o.osId === os.id).reduce((s,o) => s + o.total, 0);
            const costeTransporte = (JSON.parse(localStorage.getItem('transporteOrders') || '[]') as any[]).filter(o => o.osId === os.id).reduce((s,o) => s + o.precio, 0);
            const costeDecoracion = (JSON.parse(localStorage.getItem('decoracionOrders') || '[]') as any[]).filter(o => o.osId === os.id).reduce((s,o) => s + o.precio, 0);
            const costeAtipicos = (JSON.parse(localStorage.getItem('atipicosOrders') || '[]') as any[]).filter(o => o.osId === os.id).reduce((s,o) => s + o.precio, 0);
            
            const costeTotal = costeGastronomia + costeMaterial + costeHielo + costeTransporte + costeDecoracion + costeAtipicos;

            return { os, costeTotal, pvpFinal: facturacionBruta - comisiones };
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
            return isInDateRange && matchesEspacio && matchesComercial && matchesCliente;
        });
    }, [allPedidos, dateRange, espacioFilter, comercialFilter, clienteFilter]);


    useEffect(() => {
        setSelectedPedidos(new Set(pedidosFiltrados.map(p => p.os.id)));
    }, [pedidosFiltrados]);

    const handleSelect = (osId: string) => {
        setSelectedPedidos(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(osId)) newSelection.delete(osId);
            else newSelection.add(osId);
            return newSelection;
        });
    }
    
    const handleSelectAll = (checked: boolean) => {
        setSelectedPedidos(checked ? new Set(pedidosFiltrados.map(p => p.os.id)) : new Set());
    }
    
    const analisisSeleccion = useMemo(() => {
        const seleccion = pedidosFiltrados.filter(p => selectedPedidos.has(p.os.id));
        if (seleccion.length === 0) return { pvpNeto: 0, costeTotal: 0 };
        
        const pvpNeto = seleccion.reduce((sum, p) => sum + p.pvpFinal, 0);
        const costeTotal = seleccion.reduce((sum, p) => sum + p.costeTotal, 0);

        return { pvpNeto, costeTotal };
    }, [pedidosFiltrados, selectedPedidos]);
    
    const margenFinal = analisisSeleccion.pvpNeto - analisisSeleccion.costeTotal;
    const margenPct = analisisSeleccion.pvpNeto > 0 ? (margenFinal / analisisSeleccion.pvpNeto) * 100 : 0;


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Analítica de Catering..." />;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-6">
                <h1 className="text-3xl font-headline font-bold">Analítica de Rentabilidad de Catering</h1>
            </div>
            
            <Card className="mb-6">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <Select value={comercialFilter} onValueChange={setComercialFilter}>
                        <SelectTrigger><div className="flex items-center gap-2"><Briefcase/> <SelectValue /></div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos los Comerciales</SelectItem>{allComerciales.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={clienteFilter} onValueChange={setClienteFilter}>
                        <SelectTrigger><div className="flex items-center gap-2"><Users/> <SelectValue /></div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos los Clientes</SelectItem>{allClientes.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={espacioFilter} onValueChange={setEspacioFilter}>
                        <SelectTrigger><div className="flex items-center gap-2"><Building/> <SelectValue /></div></SelectTrigger>
                        <SelectContent><SelectItem value="all">Todos los Espacios</SelectItem>{allEspacios.map(e=><SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Facturación Neta</CardTitle><Euro className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(analisisSeleccion.pvpNeto)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Costes Directos</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(analisisSeleccion.costeTotal)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Rentabilidad Bruta</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className={cn("text-2xl font-bold", margenFinal >= 0 ? "text-green-600" : "text-destructive")}>{formatCurrency(margenFinal)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Margen Bruto (%)</CardTitle><Euro className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className={cn("text-2xl font-bold", margenPct >= 20 ? "text-green-600" : "text-amber-600")}>{formatPercentage(margenPct / 100)}</div></CardContent>
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
                                            <TableHead className="w-12"><Checkbox onCheckedChange={handleSelectAll} checked={selectedPedidos.size === pedidosFiltrados.length && pedidosFiltrados.length > 0} /></TableHead>
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
                                            <TableRow key={p.os.id} onClick={() => handleSelect(p.os.id)} className="cursor-pointer">
                                                <TableCell><Checkbox checked={selectedPedidos.has(p.os.id)} /></TableCell>
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

    