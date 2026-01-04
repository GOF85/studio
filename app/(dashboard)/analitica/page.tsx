'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import SplashScreen from '@/components/layout/splash-screen';
import { BarChart3, Euro, TrendingUp, TrendingDown, ClipboardList, Package, Calendar as CalendarIcon, Factory } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth, isWithinInterval, endOfDay, startOfYear, endOfQuarter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';

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
    color: 'primary' | 'emerald' | 'rose' | 'amber' | 'blue';
    description?: string;
}

function KpiCard({ title, value, icon: Icon, color, description }: KpiCardProps) {
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

        const dateFilter = (dateStr?: string | Date) => dateStr ? isWithinInterval(new Date(dateStr as any), { start: startOfDay(fromDate), end: endOfDay(toDate || fromDate) }) : false;

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
            costeOS += (allPruebasMenu.find((p: any) => p.evento_id === os.id) as any)?.coste_prueba_menu || 0;

            const personalExterno = Array.isArray(allPersonalExterno)
                ? allPersonalExterno.find((p: any) => p.evento_id === os.id)
                : (allPersonalExterno && (allPersonalExterno as any).evento_id === os.id ? allPersonalExterno : undefined);
            if (personalExterno && personalExterno.turnos) {
                const costeTurnos = (personalExterno.turnos as any[]).reduce((s, turno) => {
                    return s + (turno.asignaciones || []).reduce((sA: number, a: any) => {
                        return sA + calculateHours(a.horaEntradaReal || turno.horaEntrada, a.horaSalidaReal || turno.horaSalida) * (turno.precioHora || 0);
                    }, 0);
                }, 0);
                const costeAjustes = ((allAjustesPersonal as Record<string, any[]>)[os.id] || []).reduce((s: number, a: any) => s + (a.importe || 0), 0);
                costeOS += costeTurnos + (costeAjustes as number);
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

    if (isLoading) return <SplashScreen />;

    return (
        <div className="space-y-8">
            {/* Header Premium Sticky */}
            <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                    <div className="flex items-center">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <BarChart3 className="h-5 w-5 text-indigo-500" />
                        </div>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center gap-3">
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
                                        <span>Seleccionar fechas</span>
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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KpiCard title="Facturación Neta" value={formatCurrency(totals.totalFacturacion || 0)} icon={Euro} color="primary" />
                <KpiCard title="Coste Estimado" value={formatCurrency(totals.totalCoste || 0)} icon={TrendingDown} color="rose" />
                <KpiCard title="Rentabilidad" value={formatCurrency(totals.rentabilidad || 0)} icon={TrendingUp} color="emerald" />
                <KpiCard title="Margen Bruto" value={`${(totals.margen || 0).toFixed(1)}%`} icon={TrendingUp} color="emerald" />
                <KpiCard title="Eventos Catering" value={(cateringData?.eventos || 0).toString()} icon={Factory} color="blue" />
                <KpiCard title="Entregas MICE" value={(entregasData?.entregas || 0).toString()} icon={Package} color="amber" />
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Link href="/analitica/catering">
                    <Card className="group bg-card/60 backdrop-blur-md border-border/40 shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden h-full">
                        <CardHeader className="border-b border-border/40 bg-primary/5 group-hover:bg-primary/10 transition-colors">
                            <CardTitle className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-primary/10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                    <ClipboardList className="w-6 h-6 text-primary" />
                                </div>
                                Analítica de Catering
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/analitica/entregas">
                    <Card className="group bg-card/60 backdrop-blur-md border-border/40 shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden h-full">
                        <CardHeader className="border-b border-border/40 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors">
                            <CardTitle className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-amber-500/10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                    <Package className="w-6 h-6 text-amber-500" />
                                </div>
                                Analítica de Entregas
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </Link>
            </div>

            <Card className="bg-card/60 backdrop-blur-md border-border/40 shadow-xl overflow-hidden">
                <CardHeader className="border-b border-border/40 bg-primary/5">
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Rendimiento por Vertical de Negocio
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30 border-border/40">
                                <TableHead className="pl-8">Vertical</TableHead>
                                <TableHead className="text-right">Facturación Neta</TableHead>
                                <TableHead className="text-right">Coste Estimado</TableHead>
                                <TableHead className="text-right">Rentabilidad Bruta</TableHead>
                                <TableHead className="text-right pr-8">Margen</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(cateringVerticalsData).map(([vertical, data]) => (
                                <TableRow key={vertical} className="group hover:bg-primary/5 border-border/40 transition-colors">
                                    <TableCell className="font-semibold pl-8">Catering - {vertical}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(data.facturacion)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(data.coste)}</TableCell>
                                    <TableCell className="text-right font-medium text-emerald-600">{formatCurrency(data.facturacion - data.coste)}</TableCell>
                                    <TableCell className="text-right pr-8 font-bold">{formatPercentage((data.facturacion - data.coste) / (data.facturacion || 1))}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="bg-primary/5 font-bold border-border/40">
                                <TableCell className="pl-8">Total Catering</TableCell>
                                <TableCell className="text-right">{formatCurrency(cateringData?.facturacion || 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(cateringData?.coste || 0)}</TableCell>
                                <TableCell className="text-right text-emerald-600">{formatCurrency(cateringData?.rentabilidad || 0)}</TableCell>
                                <TableCell className="text-right pr-8">{formatPercentage((cateringData?.rentabilidad || 0) / (cateringData?.facturacion || 1))}</TableCell>
                            </TableRow>
                            <TableRow className="group hover:bg-amber-500/5 border-border/40 transition-colors">
                                <TableCell className="font-semibold pl-8">Entregas MICE</TableCell>
                                <TableCell className="text-right">{formatCurrency(entregasData?.facturacion || 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(entregasData?.coste || 0)}</TableCell>
                                <TableCell className="text-right font-medium text-emerald-600">{formatCurrency(entregasData?.rentabilidad || 0)}</TableCell>
                                <TableCell className="text-right pr-8 font-bold">{formatPercentage((entregasData?.rentabilidad || 0) / (entregasData?.facturacion || 1))}</TableCell>
                            </TableRow>
                        </TableBody>
                        <TableFooter className="border-t-4 border-primary/20 bg-primary/5">
                            <TableRow className="hover:bg-primary/10 transition-colors">
                                <TableCell className="font-black text-lg pl-8 py-6">TOTAL CONSOLIDADO</TableCell>
                                <TableCell className="text-right font-black text-lg">{formatCurrency(totals.totalFacturacion)}</TableCell>
                                <TableCell className="text-right font-black text-lg">{formatCurrency(totals.totalCoste)}</TableCell>
                                <TableCell className="text-right font-black text-lg text-emerald-600">{formatCurrency(totals.rentabilidad)}</TableCell>
                                <TableCell className="text-right pr-8 font-black text-lg text-primary">{formatPercentage((totals?.margen || 0) / 100)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
