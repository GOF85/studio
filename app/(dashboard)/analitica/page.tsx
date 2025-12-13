'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { BarChart3, Euro, TrendingUp, TrendingDown, ClipboardList, Package, Calendar as CalendarIcon, Factory } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth, isWithinInterval, endOfDay, startOfYear, endOfQuarter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Import React Query hooks
import {
    useEventos,
    useEntregas,
    useMaterialOrders,
    useGastronomyOrders,
    useTransporteOrders,
    useHieloOrders,
    useDecoracionOrders,
    useAtipicoOrders,
    usePersonalMiceOrders,
    usePersonalExterno,
    usePersonalExternoAjustes,
    usePedidosEntrega,
    usePersonalEntrega,
    usePruebasMenu,
} from '@/hooks/use-data-queries';

type KpiCardProps = {
    title: string;
    value: string;
    icon: React.ElementType;
    description?: string;
}

function KpiCard({ title, value, icon: Icon, description }: KpiCardProps) {
    return (
        <Card className="p-3">
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{title}</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold leading-none">{value}</span>
                    </div>
                </div>
            </div>
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
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Load all data with React Query
    const { data: allServiceOrders = [], isLoading: loadingEventos } = useEventos();
    const { data: allEntregas = [], isLoading: loadingEntregas } = useEntregas();
    const { data: allMaterialOrders = [], isLoading: loadingMaterial } = useMaterialOrders();
    const { data: allGastroOrders = [], isLoading: loadingGastro } = useGastronomyOrders();
    const { data: allTransporteOrders = [], isLoading: loadingTransporte } = useTransporteOrders();
    const { data: allHieloOrders = [], isLoading: loadingHielo } = useHieloOrders();
    const { data: allDecoracionOrders = [], isLoading: loadingDecoracion } = useDecoracionOrders();
    const { data: allAtipicoOrders = [], isLoading: loadingAtipicos } = useAtipicoOrders();
    const { data: allPersonalMiceOrders = [], isLoading: loadingPersonalMice } = usePersonalMiceOrders();
    const { data: allPersonalExterno = [], isLoading: loadingPersonalExterno } = usePersonalExterno();
    const { data: allAjustesPersonal = {}, isLoading: loadingAjustes } = usePersonalExternoAjustes();
    const { data: allPedidosEntrega = [], isLoading: loadingPedidosEntrega } = usePedidosEntrega();
    const { data: allPersonalEntrega = [], isLoading: loadingPersonalEntrega } = usePersonalEntrega();
    const { data: allPruebasMenu = [], isLoading: loadingPruebas } = usePruebasMenu();

    const isLoading = loadingEventos || loadingEntregas || loadingMaterial || loadingGastro ||
        loadingTransporte || loadingHielo || loadingDecoracion || loadingAtipicos ||
        loadingPersonalMice || loadingPersonalExterno || loadingAjustes ||
        loadingPedidosEntrega || loadingPersonalEntrega || loadingPruebas;

    const { cateringData, entregasData, totals, cateringVerticalsData } = useMemo(() => {
        const fromDate = dateRange?.from;
        const toDate = dateRange?.to || fromDate;
        if (!fromDate) return { cateringData: null, entregasData: null, totals: {}, cateringVerticalsData: {} };

        const dateFilter = (dateStr: string) => isWithinInterval(new Date(dateStr), { start: startOfDay(fromDate), end: endOfDay(toDate || fromDate) });

        // --- CATERING CALCULATION ---
        const cateringOrders = allServiceOrders.filter(os => os.vertical !== 'Entregas' && os.status === 'Confirmado' && dateFilter(os.startDate));
        let cateringFacturacion = 0;
        let cateringCoste = 0;

        const verticalsData: Record<string, { facturacion: number; coste: number }> = {
            Recurrente: { facturacion: 0, coste: 0 },
            'Grandes Eventos': { facturacion: 0, coste: 0 },
            'Gran Cuenta': { facturacion: 0, coste: 0 },
        };

        cateringOrders.forEach((os: any) => {
            const comisiones = (os.comisionesAgencia || 0) + (os.comisionesCanon || 0);
            const facturacionOS = (os.facturacion || 0) - comisiones;
            cateringFacturacion += facturacionOS;

            let costeOS = 0;
            costeOS += allGastroOrders.filter(o => o.osId === os.id).reduce((s, o) => s + (o.total || 0), 0);
            costeOS += allMaterialOrders.filter((o: any) => o.evento_id === os.id).reduce((s: number, o: any) => s + (o.total || 0), 0);
            costeOS += allTransporteOrders.filter((o: any) => o.evento_id === os.id).reduce((s: number, o: any) => s + (o.precio || 0), 0);
            costeOS += allHieloOrders.filter((o: any) => o.evento_id === os.id).reduce((s: number, o: any) => s + (o.total || 0), 0);
            costeOS += allDecoracionOrders.filter((o: any) => o.evento_id === os.id).reduce((s: number, o: any) => s + (o.precio || 0), 0);
            costeOS += allAtipicoOrders.filter((o: any) => o.evento_id === os.id).reduce((s: number, o: any) => s + (o.precio || 0), 0);
            costeOS += allPersonalMiceOrders.filter((o: any) => o.evento_id === os.id).reduce((s: number, o: any) => {
                return s + calculateHours(o.hora_entrada_real || o.hora_entrada, o.hora_salida_real || o.hora_salida) * (o.precio_hora || 0);
            }, 0);
            costeOS += (allPruebasMenu.find((p: any) => p.evento_id === os.id)?.coste_prueba_menu || 0);

            const personalExterno = allPersonalExterno.find((p: any) => p.evento_id === os.id);
            if (personalExterno && personalExterno.turnos) {
                const costeTurnos = (personalExterno.turnos as any[]).reduce((s, turno) => {
                    return s + (turno.asignaciones || []).reduce((sA: number, a: any) => {
                        return sA + calculateHours(a.horaEntradaReal || turno.horaEntrada, a.horaSalidaReal || turno.horaSalida) * (turno.precioHora || 0);
                    }, 0);
                }, 0);
                const costeAjustes = ((allAjustesPersonal as Record<string, any[]>)[os.id] || []).reduce((s: number, a: any) => s + (a.importe || 0), 0);
                costeOS += costeTurnos + costeAjustes;
            }
            cateringCoste += costeOS;

            if (os.cateringVertical) {
                const verticalKey = os.cateringVertical as string;
                const verticalEntry = verticalsData[verticalKey];
                if (verticalEntry) {
                    verticalEntry.facturacion += facturacionOS;
                    verticalEntry.coste += costeOS;
                }
            }
        });

        // --- ENTREGAS CALCULATION ---
        const entregaOrders = allEntregas.filter((os: any) => os.vertical === 'Entregas' && os.estado === 'CONFIRMADO' && dateFilter(os.fecha_inicio));
        let entregasFacturacion = 0;
        let entregasCoste = 0;
        let entregasHitos = 0;

        entregaOrders.forEach((os: any) => {
            const pedido = allPedidosEntrega.find((p: any) => p.entrega_id === os.id);
            if (pedido && pedido.hitos) {
                const hitos = Array.isArray(pedido.hitos) ? pedido.hitos : [];
                entregasHitos += hitos.length;

                const pvpBrutoHitos = hitos.reduce((sum: number, hito: any) => {
                    const pvpProductos = (hito.items || []).reduce((s: number, i: any) => s + ((i.pvp || 0) * (i.quantity || 0)), 0);
                    const pvpPortes = (hito.portes || 0) * (os.tarifa === 'IFEMA' ? 95 : 30);
                    const horasCamarero = hito.horasCamarero || 0;
                    const horasFacturables = horasCamarero > 0 && horasCamarero < 4 ? 4 : horasCamarero;
                    const pvpCamareroHora = os.tarifa === 'IFEMA' ? 44.50 : 36.50;
                    const pvpCamareros = horasFacturables * pvpCamareroHora;
                    return sum + pvpProductos + pvpPortes + pvpCamareros;
                }, 0);

                const comisiones = (os.comisiones_agencia || 0) + (os.comisiones_canon || 0);
                entregasFacturacion += pvpBrutoHitos - comisiones;

                const costeProductos = hitos.reduce((sum: number, hito: any) => {
                    return sum + (hito.items || []).reduce((s: number, i: any) => s + ((i.coste || 0) * (i.quantity || 0)), 0);
                }, 0);
                const costeTransporte = allTransporteOrders.filter((t: any) => t.evento_id === os.id).reduce((sum: number, o: any) => sum + (o.precio || 0), 0);
                const personal = allPersonalEntrega.find((p: any) => p.entrega_id === os.id);
                let costePersonal = 0;
                if (personal && personal.turnos) {
                    costePersonal = (personal.turnos as any[]).reduce((sum, turno) => {
                        return sum + (turno.asignaciones || []).reduce((s: number, a: any) => {
                            return s + calculateHours(a.horaEntradaReal || turno.horaEntrada, a.horaSalidaReal || turno.horaSalida) * (turno.precioHora || 0);
                        }, 0);
                    }, 0);
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
            totals: { totalFacturacion, totalCoste, rentabilidad, margen },
            cateringVerticalsData: verticalsData,
        };

    }, [dateRange, allServiceOrders, allEntregas, allGastroOrders, allMaterialOrders, allTransporteOrders, allHieloOrders, allDecoracionOrders, allAtipicoOrders, allPersonalMiceOrders, allPersonalExterno, allAjustesPersonal, allPedidosEntrega, allPersonalEntrega, allPruebasMenu]);

    const setDatePreset = (preset: 'month' | 'year' | 'q1' | 'q2' | 'q3' | 'q4') => {
        const now = new Date();
        let fromDate, toDate;
        switch (preset) {
            case 'month': fromDate = startOfMonth(now); toDate = endOfMonth(now); break;
            case 'year': fromDate = startOfYear(now); toDate = new Date(now.getFullYear(), 11, 31); break;
            case 'q1': fromDate = new Date(now.getFullYear(), 0, 1); toDate = new Date(now.getFullYear(), 2, 31); break;
            case 'q2': fromDate = new Date(now.getFullYear(), 3, 1); toDate = new Date(now.getFullYear(), 5, 30); break;
            case 'q3': fromDate = new Date(now.getFullYear(), 6, 1); toDate = new Date(now.getFullYear(), 8, 30); break;
            case 'q4': fromDate = new Date(now.getFullYear(), 9, 1); toDate = new Date(now.getFullYear(), 11, 31); break;
        }
        setDateRange({ from: fromDate, to: toDate });
        setIsDatePickerOpen(false);
    };

    if (isLoading) {
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
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if (range?.from && range?.to) { setIsDatePickerOpen(false); } }} numberOfMonths={2} locale={es} />
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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4 mb-6">
                <KpiCard title="Facturación Neta Total" value={formatCurrency(totals.totalFacturacion || 0)} icon={Euro} description="Suma de Catering y Entregas" />
                <KpiCard title="Coste Total Estimado" value={formatCurrency(totals.totalCoste || 0)} icon={TrendingDown} description="Estimación de todos los costes directos" />
                <KpiCard title="Rentabilidad Bruta" value={formatCurrency(totals.rentabilidad || 0)} icon={TrendingUp} description="Facturación neta menos costes" />
                <KpiCard title="Margen Bruto" value={`${(totals.margen || 0).toFixed(2)}%`} icon={TrendingUp} description="Porcentaje de rentabilidad" />
                <KpiCard title="Eventos de Catering" value={(cateringData?.eventos || 0).toString()} icon={Factory} description="Nº de OS de catering confirmadas" />
                <KpiCard title="Nº de Entregas MICE" value={(entregasData?.entregas || 0).toString()} icon={Package} description="Nº de hitos de entrega individuales" />
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
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

            <Card>
                <CardHeader>
                    <CardTitle>Rendimiento por Vertical de Negocio</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table className="min-w-[600px]">
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
                            {Object.entries(cateringVerticalsData).map(([vertical, data]) => (
                                <TableRow key={vertical}>
                                    <TableCell className="font-semibold pl-8">Catering - {vertical}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(data.facturacion)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(data.coste)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(data.facturacion - data.coste)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatPercentage((data.facturacion - data.coste) / (data.facturacion || 1))}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="bg-muted/50 font-bold">
                                <TableCell>Total Catering</TableCell>
                                <TableCell className="text-right">{formatCurrency(cateringData?.facturacion || 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(cateringData?.coste || 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(cateringData?.rentabilidad || 0)}</TableCell>
                                <TableCell className="text-right">{formatPercentage((cateringData?.rentabilidad || 0) / (cateringData?.facturacion || 1))}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-semibold">Entregas</TableCell>
                                <TableCell className="text-right">{formatCurrency(entregasData?.facturacion || 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(entregasData?.coste || 0)}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(entregasData?.rentabilidad || 0)}</TableCell>
                                <TableCell className="text-right font-bold">{formatPercentage((entregasData?.rentabilidad || 0) / (entregasData?.facturacion || 1))}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    );
}
