'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

        const dateFilter = (dateStr: string) => isWithinInterval(new Date(dateStr), { start: startOfDay(fromDate), end: endOfDay(toDate) });

        // --- CATERING CALCULATION ---
        const cateringOrders = allServiceOrders.filter(os => os.vertical !== 'Entregas' && os.status === 'Confirmado' && dateFilter(os.startDate));
        let cateringFacturacion = 0;
        let cateringCoste = 0;

        const verticalsData: Record<string, { facturacion: number; coste: number }> = {
            Recurrente: { facturacion: 0, coste: 0 },
            'Grandes Eventos': { facturacion: 0, coste: 0 },
            'Gran Cuenta': { facturacion: 0, coste: 0 },
        };

        cateringOrders.forEach(os => {
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
                const costeAjustes = (allAjustesPersonal[os.id] || []).reduce((s: number, a: any) => s + (a.importe || 0), 0);
                costeOS += costeTurnos + costeAjustes;
            }
            cateringCoste += costeOS;

            if (os.cateringVertical && verticalsData[os.cateringVertical]) {
                verticalsData[os.cateringVertical].facturacion += facturacionOS;
                verticalsData[os.cateringVertical].coste += costeOS;
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

