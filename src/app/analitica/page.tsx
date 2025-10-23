
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { BarChart3, Euro, TrendingUp, TrendingDown, ClipboardList, Package, Calendar as CalendarIcon, Factory } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Entrega, ServiceOrder, MaterialOrder, GastronomyOrder, TransporteOrder, HieloOrder, DecoracionOrder, AtipicoOrder, PersonalMiceOrder, PersonalExterno, PersonalExternoAjuste, PedidoEntrega, PedidoEntregaItem } from '@/types';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth, isWithinInterval, endOfDay, startOfYear, endOfQuarter, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type KpiCardProps = {
    title: string;
    value: string;
    icon: React.ElementType;
    description?: string;
}

function KpiCard({ title, value, icon: Icon, description }: KpiCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    )
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

export default function AnaliticaDashboardPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    
    // States to hold all data
    const [allServiceOrders, setAllServiceOrders] = useState<ServiceOrder[]>([]);
    const [allEntregas, setAllEntregas] = useState<Entrega[]>([]);
    const [allMaterialOrders, setAllMaterialOrders] = useState<MaterialOrder[]>([]);
    const [allGastroOrders, setAllGastroOrders] = useState<GastronomyOrder[]>([]);
    const [allTransporteOrders, setAllTransporteOrders] = useState<TransporteOrder[]>([]);
    const [allHieloOrders, setAllHieloOrders] = useState<HieloOrder[]>([]);
    const [allDecoracionOrders, setAllDecoracionOrders] = useState<DecoracionOrder[]>([]);
    const [allAtipicoOrders, setAllAtipicoOrders] = useState<AtipicoOrder[]>([]);
    const [allPersonalMiceOrders, setAllPersonalMiceOrders] = useState<PersonalMiceOrder[]>([]);
    const [allPersonalExterno, setAllPersonalExterno] = useState<PersonalExterno[]>([]);
    const [allAjustesPersonal, setAllAjustesPersonal] = useState<Record<string, PersonalExternoAjuste[]>>({});
    const [allPedidosEntrega, setAllPedidosEntrega] = useState<PedidoEntrega[]>([]);
    const [allPersonalEntrega, setAllPersonalEntrega] = useState<PersonalEntrega[]>([]);

    useEffect(() => {
        // Load all data from localStorage once
        setAllServiceOrders(JSON.parse(localStorage.getItem('serviceOrders') || '[]'));
        setAllEntregas(JSON.parse(localStorage.getItem('entregas') || '[]'));
        setAllMaterialOrders(JSON.parse(localStorage.getItem('materialOrders') || '[]'));
        setAllGastroOrders(JSON.parse(localStorage.getItem('gastronomyOrders') || '[]'));
        setAllTransporteOrders(JSON.parse(localStorage.getItem('transporteOrders') || '[]'));
        setAllHieloOrders(JSON.parse(localStorage.getItem('hieloOrders') || '[]'));
        setAllDecoracionOrders(JSON.parse(localStorage.getItem('decoracionOrders') || '[]'));
        setAllAtipicoOrders(JSON.parse(localStorage.getItem('atipicosOrders') || '[]'));
        setAllPersonalMiceOrders(JSON.parse(localStorage.getItem('personalMiceOrders') || '[]'));
        setAllPersonalExterno(JSON.parse(localStorage.getItem('personalExterno') || '[]'));
        setAllAjustesPersonal(JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}'));
        setAllPedidosEntrega(JSON.parse(localStorage.getItem('pedidosEntrega') || '[]'));
        setAllPersonalEntrega(JSON.parse(localStorage.getItem('personalEntrega') || '[]'));
        setIsMounted(true);
    }, []);

    const { cateringData, entregasData, totals } = useMemo(() => {
        const fromDate = dateRange?.from;
        const toDate = dateRange?.to || fromDate;
        if (!fromDate) return { cateringData: null, entregasData: null, totals: {} };
        
        const dateFilter = (dateStr: string) => isWithinInterval(new Date(dateStr), { start: startOfDay(fromDate), end: endOfDay(toDate) });
        
        // --- CATERING CALCULATION ---
        const cateringOrders = allServiceOrders.filter(os => os.vertical !== 'Entregas' && os.status === 'Confirmado' && dateFilter(os.startDate));
        let cateringFacturacion = 0;
        let cateringCoste = 0;
        
        cateringOrders.forEach(os => {
            const comisiones = (os.comisionesAgencia || 0) + (os.comisionesCanon || 0);
            cateringFacturacion += (os.facturacion || 0) - comisiones;

            cateringCoste += allGastroOrders.filter(o => o.osId === os.id).reduce((s, o) => s + (o.total || 0), 0);
            cateringCoste += allMaterialOrders.filter(o => o.osId === os.id).reduce((s, o) => s + o.total, 0);
            cateringCoste += allTransporteOrders.filter(o => o.osId === os.id).reduce((s, o) => s + o.precio, 0);
            cateringCoste += allHieloOrders.filter(o => o.osId === os.id).reduce((s, o) => s + o.total, 0);
            cateringCoste += allDecoracionOrders.filter(o => o.osId === os.id).reduce((s, o) => s + o.precio, 0);
            cateringCoste += allAtipicoOrders.filter(o => o.osId === os.id).reduce((s, o) => s + o.precio, 0);
            cateringCoste += allPersonalMiceOrders.filter(o => o.osId === os.id).reduce((s, o) => s + calculateHours(o.horaEntradaReal || o.horaEntrada, o.horaSalidaReal || o.horaSalida) * (o.precioHora || 0), 0);
            
            const personalExterno = allPersonalExterno.find(p => p.osId === os.id);
            if (personalExterno) {
               const costeTurnos = personalExterno.turnos.reduce((s, turno) => s + (turno.asignaciones || []).reduce((sA, a) => sA + calculateHours(a.horaEntradaReal || turno.horaEntrada, a.horaSalidaReal || turno.horaSalida) * (turno.precioHora || 0), 0), 0);
               const costeAjustes = (allAjustesPersonal[os.id] || []).reduce((s, a) => s + a.importe, 0);
               cateringCoste += costeTurnos + costeAjustes;
            }
        });

        // --- ENTREGAS CALCULATION ---
        const entregaOrders = allEntregas.filter(os => os.vertical === 'Entregas' && os.status === 'Confirmado' && dateFilter(os.startDate));
        let entregasFacturacion = 0;
        let entregasCoste = 0;
        let entregasHitos = 0;
        
        entregaOrders.forEach(os => {
            const pedido = allPedidosEntrega.find(p => p.osId === os.id);
            if (pedido) {
                entregasHitos += pedido.hitos.length;

                const pvpBrutoHitos = pedido.hitos.reduce((sum, hito) => {
                    const pvpProductos = (hito.items || []).reduce((s, i) => s + (i.pvp * i.quantity), 0);
                    const pvpPortes = (hito.portes || 0) * (os.tarifa === 'IFEMA' ? 95 : 30);
                    const horasCamarero = hito.horasCamarero || 0;
                    const horasFacturables = horasCamarero > 0 && horasCamarero < 4 ? 4 : horasCamarero;
                    const pvpCamareroHora = os.tarifa === 'IFEMA' ? 44.50 : 36.50;
                    const pvpCamareros = horasFacturables * pvpCamareroHora;
                    return sum + pvpProductos + pvpPortes + pvpCamareros;
                }, 0);

                const comisiones = (os.comisionesAgencia || 0) + (os.comisionesCanon || 0);
                entregasFacturacion += pvpBrutoHitos - comisiones;

                const costeProductos = pedido.hitos.reduce((sum, hito) => sum + (hito.items || []).reduce((s, i) => s + ((i.coste || 0) * i.quantity), 0), 0);
                const costeTransporte = allTransporteOrders.filter(t => t.osId === os.id).reduce((sum, o) => sum + o.precio, 0);
                const personal = allPersonalEntrega.find(p => p.osId === os.id);
                let costePersonal = 0;
                if(personal) {
                    costePersonal = personal.turnos.reduce((sum, turno) => sum + (turno.asignaciones || []).reduce((s, a) => s + calculateHours(a.horaEntradaReal || turno.horaEntrada, a.horaSalidaReal || turno.horaSalida) * turno.precioHora, 0), 0);
                }
                entregasCoste += costeProductos + costeTransporte + costePersonal;
            }
        });

        const totalFacturacion = cateringFacturacion + entregasFacturacion;
        const totalCoste = cateringCoste + entregasCoste;
        const rentabilidad = totalFacturacion - totalCoste;
        const margen = totalFacturacion > 0 ? (rentabilidad / totalFacturacion) * 100 : 0;
        
        return {
            cateringData: { facturacion: cateringFacturacion, coste: cateringCoste, rentabilidad: cateringFacturacion - cateringCoste, eventos: cateringOrders.length },
            entregasData: { facturacion: entregasFacturacion, coste: entregasCoste, rentabilidad: entregasFacturacion - entregasCoste, entregas: entregasHitos, contratos: entregaOrders.length },
            totals: { totalFacturacion, totalCoste, rentabilidad, margen }
        };

    }, [dateRange, allServiceOrders, allEntregas, allGastroOrders, allMaterialOrders, allTransporteOrders, allHieloOrders, allDecoracionOrders, allAtipicoOrders, allPersonalMiceOrders, allPersonalExterno, allAjustesPersonal, allPedidosEntrega, allPersonalEntrega]);

    const setDatePreset = (preset: 'month' | 'year' | 'q1' | 'q2' | 'q3' | 'q4') => {
        const now = new Date();
        let fromDate, toDate;
        switch(preset) {
            case 'month': fromDate = startOfMonth(now); toDate = endOfMonth(now); break;
            case 'year': fromDate = startOfYear(now); toDate = endOfYear(now); break;
            case 'q1': fromDate = startOfQuarter(new Date(now.getFullYear(), 0, 1)); toDate = endOfQuarter(new Date(now.getFullYear(), 2, 31)); break;
            case 'q2': fromDate = startOfQuarter(new Date(now.getFullYear(), 3, 1)); toDate = endOfQuarter(new Date(now.getFullYear(), 5, 30)); break;
            case 'q3': fromDate = startOfQuarter(new Date(now.getFullYear(), 6, 1)); toDate = endOfQuarter(new Date(now.getFullYear(), 8, 30)); break;
            case 'q4': fromDate = startOfQuarter(new Date(now.getFullYear(), 9, 1)); toDate = endOfQuarter(new Date(now.getFullYear(), 11, 31)); break;
        }
        setDateRange({ from: fromDate, to: toDate });
        setIsDatePickerOpen(false);
    };

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Panel de Analítica..." />;
    }

    return (
        <div className="container mx-auto px-4">
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
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
                <KpiCard title="Facturación Neta Total" value={formatCurrency(totals.totalFacturacion || 0)} icon={Euro} description="Suma de Catering y Entregas" />
                <KpiCard title="Coste Total Estimado" value={formatCurrency(totals.totalCoste || 0)} icon={TrendingDown} description="Estimación de todos los costes directos" />
                <KpiCard title="Rentabilidad Bruta" value={formatCurrency(totals.rentabilidad || 0)} icon={TrendingUp} description="Facturación neta menos costes" />
                <KpiCard title="Margen Bruto" value={`${(totals.margen || 0).toFixed(2)}%`} icon={TrendingUp} description="Porcentaje de rentabilidad" />
                <KpiCard title="Eventos de Catering" value={(cateringData?.eventos || 0).toString()} icon={Factory} description="Nº de OS de catering confirmadas" />
                <KpiCard title="Nº de Entregas MICE" value={(entregasData?.entregas || 0).toString()} icon={Package} description="Nº de hitos de entrega individuales" />
            </div>
            
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Rendimiento por Vertical de Negocio</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vertical</TableHead>
                                <TableHead className="text-right">Facturación Neta</TableHead>
                                <TableHead className="text-right">Coste Estimado</TableHead>
                                <TableHead className="text-right">Rentabilidad Bruta</TableHead>
                                <TableHead className="text-right">Margen</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-semibold">Catering</TableCell>
                                <TableCell className="text-right">{formatCurrency(cateringData?.facturacion || 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(cateringData?.coste || 0)}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(cateringData?.rentabilidad || 0)}</TableCell>
                                <TableCell className="text-right font-bold">{(cateringData?.facturacion || 0) > 0 ? `${((cateringData.rentabilidad / cateringData.facturacion) * 100).toFixed(2)}%` : '0.00%'}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className="font-semibold">Entregas</TableCell>
                                <TableCell className="text-right">{formatCurrency(entregasData?.facturacion || 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(entregasData?.coste || 0)}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(entregasData?.rentabilidad || 0)}</TableCell>
                                <TableCell className="text-right font-bold">{(entregasData?.facturacion || 0) > 0 ? `${((entregasData.rentabilidad / entregasData.facturacion) * 100).toFixed(2)}%` : '0.00%'}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                <Link href="/analitica/catering">
                    <Card className="hover:border-primary hover:shadow-lg transition-all h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><ClipboardList />Analítica de Catering</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Analiza en profundidad la rentabilidad, costes y rendimiento de tus eventos de catering.</p>
                        </CardContent>
                    </Card>
                </Link>
                 <Link href="/analitica/entregas">
                    <Card className="hover:border-primary hover:shadow-lg transition-all h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><Package />Analítica de Entregas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Explora los KPIs, ventas y márgenes de la vertical de negocio de Entregas MICE.</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
