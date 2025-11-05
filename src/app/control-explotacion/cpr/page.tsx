

'use client';

import * as React from "react"
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { AreaChart, TrendingUp, TrendingDown, Euro, Calendar as CalendarIcon, BarChart, Info, MessageSquare, Save } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, eachMonthOfInterval, startOfYear, endOfYear, endOfMonth, startOfQuarter, endOfQuarter, subDays, startOfMonth, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bar, XAxis, YAxis, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import Link from "next/link";

import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import type { ServiceOrder, GastronomyOrder, Receta, PersonalMiceOrder, PersonalExterno, PersonalExternoAjuste, CosteFijoCPR, ObjetivoMensualCPR, SolicitudPersonalCPR, CategoriaPersonal, CesionStorage, Personal } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { GASTO_LABELS } from '@/lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatNumber, formatPercentage, calculateHours } from '@/lib/utils';
import type { ObjetivosGasto } from '@/types';


type KpiCardProps = {
    title: string;
    value: string;
    icon: React.ElementType;
    description?: string;
    className?: string;
}

function KpiCard({ title, value, icon: Icon, description, className }: KpiCardProps) {
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-2">
                <CardTitle className="text-xs font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-2">
                <div className="text-xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    )
}

type CostRow = {
  label: string;
  presupuesto: number;
  cierre: number;
  real: number;
  objetivo: number;
  objetivo_pct: number;
  comentario?: string;
  detailType?: string;
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i);


export default function CprControlExplotacionPage() {
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        if (from && to) {
            try {
                return { from: parseISO(from), to: parseISO(to) };
            } catch (e) {
                console.error("Invalid date format in URL", e);
            }
        }
        return { from: startOfMonth(new Date()), to: endOfMonth(new Date()) };
    });
    
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [objetivoMes, setObjetivoMes] = useState<Date>(startOfMonth(new Date()));
    const [availableObjetivoMonths, setAvailableObjetivoMonths] = useState<{label: string, value: string}[]>([]);


    // Estados para datos maestros
    const [allServiceOrders, setAllServiceOrders] = useState<ServiceOrder[]>([]);
    const [allGastroOrders, setAllGastroOrders] = useState<GastronomyOrder[]>([]);
    const [allRecetas, setAllRecetas] = useState<Receta[]>([]);
    const [allCostesFijos, setAllCostesFijos] = useState<CosteFijoCPR[]>([]);
    const [allObjetivos, setAllObjetivos] = useState<ObjetivoMensualCPR[]>([]);
    const [allSolicitudesPersonalCPR, setAllSolicitudesPersonalCPR] = useState<SolicitudPersonalCPR[]>([]);
    const [allCesionesPersonal, setAllCesionesPersonal] = useState<CesionStorage[]>([]);
    const [personalMap, setPersonalMap] = useState<Map<string, Personal>>(new Map());
    const [personalInterno, setPersonalInterno] = useState<Personal[]>([]);
    
    // Estados para valores manuales
    const [realCostInputs, setRealCostInputs] = useState<Record<string, number | undefined>>({});
    const [comentarios, setComentarios] = useState<Record<string, string>>({});
    const [editingComment, setEditingComment] = useState<{label: string, text: string} | null>(null);

    const osId = searchParams.get('osId');

    const loadData = useCallback(() => {
        setAllServiceOrders(JSON.parse(localStorage.getItem('serviceOrders') || '[]'));
        setAllGastroOrders(JSON.parse(localStorage.getItem('gastronomyOrders') || '[]'));
        setAllRecetas(JSON.parse(localStorage.getItem('recetas') || '[]'));
        setAllCostesFijos(JSON.parse(localStorage.getItem('costesFijosCPR') || '[]'));
        setAllSolicitudesPersonalCPR(JSON.parse(localStorage.getItem('solicitudesPersonalCPR') || '[]'));
        setAllCesionesPersonal(JSON.parse(localStorage.getItem('cesionesPersonal') || '[]'));

        const personalData = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
        setPersonalMap(new Map(personalData.map(p => [p.nombreCompleto, p])));
        setPersonalInterno(personalData);


        const objetivosData = JSON.parse(localStorage.getItem('objetivosCPR') || '[]') as ObjetivoMensualCPR[];
        setAllObjetivos(objetivosData);
        
        const months = objetivosData
            .map(o => o.mes)
            .sort((a,b) => b.localeCompare(a));
        setAvailableObjetivoMonths(months.map(m => ({
            value: m,
            label: format(parseISO(`${m}-02`), 'MMMM yyyy', { locale: es })
        })));
        
        const storedComentarios = osId ? (JSON.parse(localStorage.getItem('ctaComentarios') || '{}')[osId] || {}) : {};
        setComentarios(storedComentarios);
        
        // Load real costs from localStorage for persistence
        const storedRealCosts = osId ? (JSON.parse(localStorage.getItem('ctaRealCosts') || '{}')[osId] || {}) : {};
        setRealCostInputs(storedRealCosts);

        setIsMounted(true);
    }, [osId]);


    useEffect(() => {
        loadData();
    }, [loadData]);
    
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (dateRange?.from) {
            params.set('from', dateRange.from.toISOString().split('T')[0]);
        } else {
            params.delete('from');
        }
        if (dateRange?.to) {
            params.set('to', dateRange.to.toISOString().split('T')[0]);
        } else {
            params.delete('to');
        }
        router.replace(`${window.location.pathname}?${params.toString()}`);
    }, [dateRange, router]);

    const dataCalculada = useMemo(() => {
        if (!isMounted || !dateRange?.from) return null;

        const rangeStart = startOfDay(dateRange.from);
        const rangeEnd = endOfDay(dateRange.to || dateRange.from);
        
        const osIdsEnRango = new Set(
            allServiceOrders
                .filter(os => {
                    try {
                        const osDate = new Date(os.startDate);
                        return os.status === 'Confirmado' && isWithinInterval(osDate, { start: rangeStart, end: rangeEnd });
                    } catch (e) { return false; }
                })
                .map(os => os.id)
        );

        const gastroOrdersEnRango = allGastroOrders.filter(go => osIdsEnRango.has(go.osId));
        const recetasMap = new Map(allRecetas.map(r => [r.id, r]));

        const ingresosVenta = gastroOrdersEnRango.reduce((sum, order) => {
            const orderTotal = (order.items || []).reduce((itemSum, item) => {
                if (item.type === 'item') {
                    const receta = recetasMap.get(item.id);
                    if (receta) {
                        return itemSum + ((receta.precioVenta || 0) * (item.quantity || 0));
                    }
                }
                return itemSum;
            }, 0);
            return sum + orderTotal;
        }, 0);
        
        const costeEscandallo = gastroOrdersEnRango.reduce((sum, order) => {
             const orderTotal = (order.items || []).reduce((itemSum, item) => {
                if (item.type === 'item') {
                    const receta = recetasMap.get(item.id);
                    if (receta) {
                        const costeTotalItem = (receta.costeMateriaPrima || 0) * (item.quantity || 0);
                        return itemSum + costeTotalItem;
                    }
                }
                return itemSum;
            }, 0);
            return sum + orderTotal;
        }, 0);
        
        const cesionesEnRango = allCesionesPersonal.filter(c => {
          if (!c.fecha) return false;
          try {
            const fechaCesion = new Date(c.fecha.replace(/-/g, '/'));
            return isWithinInterval(fechaCesion, { start: rangeStart, end: rangeEnd });
          } catch(e) {
            return false;
          }
        });

        let ingresosCesionPersonalPlanificado = 0, ingresosCesionPersonalCierre = 0;
        let gastosCesionPersonalPlanificado = 0, gastosCesionPersonalCierre = 0;
        
        cesionesEnRango.forEach(c => {
            const personalInfo = personalMap.get(c.nombre);
            if (!personalInfo) return;

            const costePlanificado = calculateHours(c.horaEntrada, c.horaSalida) * c.precioHora;
            const costeReal = (calculateHours(c.horaEntradaReal, c.horaSalidaReal) || calculateHours(c.horaEntrada, c.horaSalida)) * c.precioHora;

            if (personalInfo.departamento === 'CPR' && c.centroCoste !== 'CPR') {
                ingresosCesionPersonalPlanificado += costePlanificado;
                ingresosCesionPersonalCierre += costeReal;
            } else if (personalInfo.departamento !== 'CPR' && c.centroCoste === 'CPR') {
                gastosCesionPersonalPlanificado += costePlanificado;
                gastosCesionPersonalCierre += costeReal;
            }
        });
        
        const tiposPersonalMap = new Map((JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[]).map(t => [t.id, t]));
        const solicitudesPersonalEnRango = allSolicitudesPersonalCPR.filter(solicitud => {
            try {
                const fechaServicio = new Date(solicitud.fechaServicio);
                return isWithinInterval(fechaServicio, { start: rangeStart, end: rangeEnd });
            } catch(e) { return false; }
        });
        
        const costePersonalSolicitadoPlanificado = solicitudesPersonalEnRango.reduce((sum, s) => {
            const horas = calculateHours(s.horaInicio, s.horaFin);
            const tipo = tiposPersonalMap.get(s.proveedorId || '');
            const precioHora = tipo?.precioHora || 0;
            return sum + (horas * precioHora * s.cantidad);
        }, 0);

        const costePersonalSolicitadoCierre = solicitudesPersonalEnRango.filter(s => s.estado === 'Cerrado').reduce((sum, s) => {
            const tipo = tiposPersonalMap.get(s.proveedorId || '');
            const precioHora = tipo?.precioHora || 0;
            const horasReales = s.personalAsignado && s.personalAsignado.length > 0
                ? s.personalAsignado.reduce((hSum, pa) => hSum + calculateHours(pa.horaEntradaReal, pa.horaSalidaReal), 0)
                : calculateHours(s.horaInicio, s.horaFin) * s.cantidad;
            return sum + (horasReales * precioHora);
        }, 0);


        const ingresosTotales = ingresosVenta + ingresosCesionPersonalCierre;
        const otrosGastos = allCostesFijos.reduce((sum, fijo) => sum + (fijo.importeMensual || 0), 0);
        const gastosTotales = costeEscandallo + gastosCesionPersonalCierre + otrosGastos + costePersonalSolicitadoCierre;
        const resultadoExplotacion = ingresosTotales - gastosTotales;

        const kpis = {
            ingresos: ingresosTotales,
            gastos: gastosTotales,
            resultado: resultadoExplotacion,
            margen: ingresosTotales > 0 ? resultadoExplotacion / ingresosTotales : 0,
        };
        
        return { kpis, objetivo: allObjetivos.find(o => o.mes === format(objetivoMes, 'yyyy-MM')) || {}, costeEscandallo, ingresosVenta, ingresosCesionPersonalPlanificado, ingresosCesionPersonalCierre, gastosCesionPersonalPlanificado, gastosCesionPersonalCierre, costesFijosPeriodo: otrosGastos, facturacionNeta: ingresosTotales, costePersonalSolicitadoPlanificado, costePersonalSolicitadoCierre };

    }, [isMounted, dateRange, allServiceOrders, allGastroOrders, allRecetas, allCostesFijos, allObjetivos, allSolicitudesPersonalCPR, objetivoMes, allCesionesPersonal, personalMap]);

    const dataAcumulada = useMemo(() => {
        if (!isMounted) return [];
        const mesesDelAno = eachMonthOfInterval({ start: startOfYear(new Date()), end: endOfYear(new Date())});
        const personalMapLocal = new Map((personalInterno || []).map(p => [p.nombreCompleto, p]));

        return mesesDelAno.map(month => {
            const rangeStart = startOfMonth(month);
            const rangeEnd = endOfMonth(month);

            const osIdsEnRango = new Set(
                allServiceOrders.filter(os => {
                    try {
                        const osDate = new Date(os.startDate);
                        return os.status === 'Confirmado' && isWithinInterval(osDate, { start: rangeStart, end: rangeEnd });
                    } catch (e) { return false; }
                }).map(os => os.id)
            );

            const gastroOrdersEnRango = allGastroOrders.filter(go => osIdsEnRango.has(go.osId));
            const recetasMap = new Map(allRecetas.map(r => [r.id, r]));

            const ingresosVenta = gastroOrdersEnRango.reduce((sum, order) => sum + (order.total || 0), 0);
            const costeEscandallo = gastroOrdersEnRango.reduce((sum, order) => {
                 return sum + (order.items || []).reduce((itemSum, item) => {
                    if (item.type === 'item') {
                        const receta = recetasMap.get(item.id);
                        return itemSum + ((receta?.costeMateriaPrima || 0) * (item.quantity || 0));
                    }
                    return itemSum;
                }, 0);
            }, 0);
            
            const cesionesEnRango = allCesionesPersonal.filter(c => {
                if (!c.fecha) return false;
                try {
                    const fechaCesion = new Date(c.fecha.replace(/-/g, '/'));
                    return isWithinInterval(fechaCesion, { start: rangeStart, end: rangeEnd });
                } catch(e) {
                    return false;
                }
            });

            const ingresosCesionPersonal = cesionesEnRango.filter(c => personalMapLocal.get(c.nombre)?.departamento === 'CPR' && c.centroCoste !== 'CPR').reduce((sum, c) => sum + ((calculateHours(c.horaEntradaReal, c.horaSalidaReal) || calculateHours(c.horaEntrada, c.horaSalida)) * c.precioHora), 0);
            const gastosCesionPersonal = cesionesEnRango.filter(c => c.centroCoste === 'CPR' && personalMapLocal.get(c.nombre)?.departamento !== 'CPR').reduce((sum, c) => sum + ((calculateHours(c.horaEntradaReal, c.horaSalidaReal) || calculateHours(c.horaEntrada, c.horaSalida)) * c.precioHora), 0);
            
            const solicitudesPersonalEnRango = allSolicitudesPersonalCPR.filter(solicitud => {
                 try {
                    const fechaServicio = new Date(solicitud.fechaServicio);
                    return solicitud.estado === 'Cerrado' && isWithinInterval(fechaServicio, { start: rangeStart, end: rangeEnd });
                } catch (e) {
                    return false;
                }
            });
            const tiposPersonalMap = new Map((JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[]).map(t => [t.id, t]));
            const costePersonalSolicitado = solicitudesPersonalEnRango.reduce((sum, s) => {
                const tipo = tiposPersonalMap.get(s.proveedorId || '');
                const precioHora = tipo?.precioHora || 0;
                if (s.personalAsignado && s.personalAsignado.length > 0) {
                     const horasReales = s.personalAsignado.reduce((hSum, pa) => hSum + calculateHours(pa.horaEntradaReal, pa.horaSalidaReal), 0);
                     return sum + (horasReales * precioHora);
                }
                return sum + (calculateHours(s.horaInicio, s.horaFin) * precioHora * s.cantidad);
            }, 0);


            const varios = allCostesFijos.reduce((s, c) => s + c.importeMensual, 0);

            const ingresos = ingresosVenta + ingresosCesionPersonal;
            const totalGastos = costeEscandallo + gastosCesionPersonal + costePersonalSolicitado + varios;
            const resultado = ingresos - totalGastos;

            return {
                mes: format(month, 'MMMM', { locale: es }),
                ingresos,
                consumoMMPP: costeEscandallo,
                cesionesGasto: gastosCesionPersonal,
                personalSolicitado: costePersonalSolicitado,
                totalPersonalCPR: gastosCesionPersonal + costePersonalSolicitado,
                varios,
                resultado,
            }
        });

    }, [isMounted, allServiceOrders, allGastroOrders, allRecetas, allCostesFijos, allSolicitudesPersonalCPR, allCesionesPersonal, personalInterno]);


    const setDatePreset = (preset: 'month' | 'year' | 'q1' | 'q2' | 'q3' | 'q4') => {
        const now = new Date();
        let fromDate, toDate;
        switch(preset) {
            case 'month': fromDate = startOfMonth(now); toDate = endOfMonth(now); break;
            case 'year': fromDate = startOfYear(now); toDate = endOfYear(now); break;
            case 'q1': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 0, 1)), to: endOfQuarter(new Date(now.getFullYear(), 2, 31)) }); break;
            case 'q2': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 3, 1)), to: endOfQuarter(new Date(now.getFullYear(), 5, 30)) }); break;
            case 'q3': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 6, 1)), to: endOfQuarter(new Date(now.getFullYear(), 8, 30)) }); break;
            case 'q4': setDateRange({ from: startOfQuarter(new Date(now.getFullYear(), 9, 1)), to: endOfQuarter(new Date(now.getFullYear(), 11, 31)) }); break;
        }
        if (fromDate && toDate) {
            setDateRange({ from: fromDate, to: toDate });
        }
        setIsDatePickerOpen(false);
    };

    const handleRealCostInputChange = (label: string, value: string) => {
        const numericValue = value === '' ? undefined : parseFloat(value) || 0;
        setRealCostInputs(prev => ({...prev, [label]: numericValue}));
    }

    const handleSaveRealCost = (label: string, value: string) => {
        if (!osId) return;
        const numericValue = value === '' ? undefined : parseFloat(value) || 0;
        const allCosts = JSON.parse(localStorage.getItem('ctaRealCosts') || '{}');
        if (!allCosts[osId]) {
        allCosts[osId] = {};
        }
        allCosts[osId][label] = numericValue;
        localStorage.setItem('ctaRealCosts', JSON.stringify(allCosts));
        toast({ title: "Coste Real Guardado", description: "El valor se ha guardado localmente."});
    };
    
    const handleSaveComentario = () => {
        if (!editingComment || !osId) return;
        const newComentarios = { ...comentarios, [editingComment.label]: editingComment.text };
        setComentarios(newComentarios);
        
        const allComentarios = JSON.parse(localStorage.getItem('ctaComentarios') || '{}');
        allComentarios[osId] = newComentarios;
        localStorage.setItem('ctaComentarios', JSON.stringify(allComentarios));
        
        setEditingComment(null);
        toast({ title: "Comentario guardado" });
    };

    if (!isMounted || !dataCalculada) {
        return <LoadingSkeleton title="Calculando rentabilidad del CPR..." />;
    }

    const { kpis, objetivo, costeEscandallo, ingresosVenta, ingresosCesionPersonalPlanificado, ingresosCesionPersonalCierre, gastosCesionPersonalPlanificado, gastosCesionPersonalCierre, costesFijosPeriodo, facturacionNeta, costePersonalSolicitadoPlanificado, costePersonalSolicitadoCierre } = dataCalculada;
    
    const tablaExplotacion: CostRow[] = [
        { label: "Venta Gastronomía", presupuesto: ingresosVenta, cierre: ingresosVenta, real: realCostInputs['Venta Gastronomía'] ?? ingresosVenta, objetivo: facturacionNeta * ((objetivo.presupuestoVentas || 0) / 100), objetivo_pct: (objetivo.presupuestoVentas || 0) / 100, comentario: comentarios['Venta Gastronomía'], detailType: 'ventaGastronomia' },
        { label: "Cesión de Personal", presupuesto: ingresosCesionPersonalPlanificado, cierre: ingresosCesionPersonalCierre, real: realCostInputs['Cesión de Personal'] ?? ingresosCesionPersonalCierre, objetivo: facturacionNeta * ((objetivo.presupuestoCesionPersonal || 0) / 100), objetivo_pct: (objetivo.presupuestoCesionPersonal || 0) / 100, comentario: comentarios['Cesión de Personal'] },
        { label: GASTO_LABELS.gastronomia, presupuesto: costeEscandallo, cierre: costeEscandallo, real: realCostInputs[GASTO_LABELS.gastronomia] ?? costeEscandallo, objetivo: facturacionNeta * ((objetivo.presupuestoGastosMP || 0) / 100), objetivo_pct: (objetivo.presupuestoGastosMP || 0) / 100, comentario: comentarios[GASTO_LABELS.gastronomia], detailType: 'costeMP' },
        { label: "Personal Cedido a CPR", presupuesto: gastosCesionPersonalPlanificado, cierre: gastosCesionPersonalCierre, real: realCostInputs["Personal Cedido a CPR"] ?? gastosCesionPersonalCierre, objetivo: 0, objetivo_pct: 0, comentario: comentarios["Personal Cedido a CPR"]},
        { label: GASTO_LABELS.personalSolicitadoCpr, presupuesto: costePersonalSolicitadoPlanificado, cierre: costePersonalSolicitadoCierre, real: realCostInputs[GASTO_LABELS.personalSolicitadoCpr] ?? costePersonalSolicitadoCierre, objetivo: facturacionNeta * ((objetivo.presupuestoPersonalSolicitadoCpr || 0) / 100), objetivo_pct: (objetivo.presupuestoPersonalSolicitadoCpr || 0) / 100, comentario: comentarios[GASTO_LABELS.personalSolicitadoCpr], detailType: 'personalApoyo' },
        { label: "Otros Gastos", presupuesto: costesFijosPeriodo, cierre: costesFijosPeriodo, real: realCostInputs['Otros Gastos'] ?? costesFijosPeriodo, objetivo: facturacionNeta * ((objetivo.presupuestoOtrosGastos || 0) / 100), objetivo_pct: (objetivo.presupuestoOtrosGastos || 0) / 100, comentario: comentarios['Otros Gastos'] },
    ];
    const ingresos = tablaExplotacion.filter(r => ["Venta Gastronomía", "Cesión de Personal"].includes(r.label));
    const gastos = tablaExplotacion.filter(r => !["Venta Gastronomía", "Cesión de Personal"].includes(r.label));

    const totalRealIngresos = ingresos.reduce((sum, r) => sum + r.real, 0);
    const totalRealGastos = gastos.reduce((sum, r) => sum + r.real, 0);
    const rentabilidadReal = totalRealIngresos - totalRealGastos;

    const renderCostRow = (row: CostRow, index: number) => {
        const pctSFactPresupuesto = facturacionNeta > 0 ? row.presupuesto / facturacionNeta : 0;
        const pctSFactCierre = facturacionNeta > 0 ? row.cierre / facturacionNeta : 0;
        const pctSFactReal = facturacionNeta > 0 ? row.real / facturacionNeta : 0;
        const desviacion = row.objetivo - row.real;
        const desviacionPct = row.objetivo > 0 ? desviacion / row.objetivo : 0;
        
        return (
             <TableRow key={`${row.label}-${index}`}>
                <TableCell className="p-0 font-medium sticky left-0 bg-background z-10 w-48">
                    <div className="flex items-center gap-2 h-full w-full px-2 py-1">
                        {row.detailType ? (
                            <Link href={`/control-explotacion/cpr/${row.detailType}?from=${dateRange?.from?.toISOString()}&to=${dateRange?.to?.toISOString()}`} className="text-primary hover:underline flex items-center gap-2">
                                {row.label} <Info size={14}/>
                            </Link>
                        ): row.label}
                    </div>
                </TableCell>
                <TableCell className="py-1 px-2 text-right font-mono border-l bg-blue-50/50">{formatCurrency(row.presupuesto)}</TableCell>
                <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-r bg-blue-50/50">{formatPercentage(pctSFactPresupuesto)}</TableCell>
                
                <TableCell className="py-1 px-2 text-right font-mono border-l bg-amber-50/50">{formatCurrency(row.cierre)}</TableCell>
                <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-r bg-amber-50/50">{formatPercentage(pctSFactCierre)}</TableCell>

                <TableCell className="py-1 px-2 text-right border-l bg-green-50/50">
                    <Input
                        type="number"
                        step="0.01"
                        placeholder={formatNumber(row.cierre, 2)}
                        value={realCostInputs[row.label] === undefined ? '' : realCostInputs[row.label]}
                        onChange={(e) => handleRealCostInputChange(row.label, e.target.value)}
                        onBlur={(e) => handleSaveRealCost(row.label, e.target.value)}
                        className="h-7 text-right w-28 ml-auto"
                    />
                </TableCell>
                <TableCell className={cn("py-1 px-2 text-right font-mono border-r bg-green-50/50", pctSFactReal > row.objetivo_pct && row.objetivo_pct > 0 && "text-destructive font-bold")}>{formatPercentage(pctSFactReal)}</TableCell>
                
                <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-l">{formatCurrency(row.objetivo)}</TableCell>
                <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-r">{formatPercentage(row.objetivo_pct)}</TableCell>
                
                <TableCell className={cn("py-1 px-2 text-right font-mono border-l", desviacion < 0 && "text-destructive font-bold", desviacion > 0 && "text-green-600 font-bold")}>{formatCurrency(desviacion)}</TableCell>
                <TableCell className={cn("py-1 px-2 text-right font-mono border-r", desviacion < 0 && "text-destructive font-bold", desviacion > 0 && "text-green-600 font-bold")}>{formatPercentage(desviacionPct)}</TableCell>
            </TableRow>
        )
    };
    
    const renderSummaryRow = (label: string, value: number, isSubtotal: boolean = false) => {
        return (
            <TableRow className={cn(isSubtotal ? "bg-muted hover:bg-muted" : "bg-primary/10 hover:bg-primary/10")}>
                <TableCell className="font-bold py-2 px-2 text-black sticky left-0 bg-inherit z-10">{label}</TableCell>
                <TableCell className="text-right font-bold py-2 px-2 text-black">{formatCurrency(value)}</TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
            </TableRow>
        )
    };

    const renderFinalRow = (label: string, value: number) => {
        return (
            <TableRow className="bg-primary/20 hover:bg-primary/20">
                <TableCell className="font-bold py-2 px-2 text-base text-black sticky left-0 bg-inherit z-10">{label}</TableCell>
                <TableCell className={cn("text-right font-bold py-2 px-2 text-base", value < 0 ? 'text-destructive' : 'text-green-600')}>{formatCurrency(value)}</TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
                <TableCell className="border-l py-2 px-2"></TableCell>
                <TableCell className="border-r py-2 px-2"></TableCell>
            </TableRow>
        )
    }

    return (
        <div className="space-y-4">
             <Card>
                 <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                     <div className="flex flex-wrap items-center gap-2">
                         <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-full md:w-[300px] justify-start text-left font-bold text-lg", !dateRange && "text-muted-foreground")}>
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
                     <div className="flex items-center gap-2">
                        <Label className="font-semibold whitespace-nowrap">Objetivos:</Label>
                         <Select onValueChange={(value) => setObjetivoMes(parseISO(`${value}-02`))} value={format(objetivoMes, 'yyyy-MM')}>
                            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {availableObjetivoMonths.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <TooltipProvider>
                <Tabs defaultValue="control-explotacion">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="control-explotacion">Control de Explotación CPR</TabsTrigger>
                        <TabsTrigger value="acumulado-mensual">Acumulado Mensual</TabsTrigger>
                    </TabsList>
                    <TabsContent value="control-explotacion" className="mt-4">
                        <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-7 mb-6">
                            <KpiCard title="Ingresos Totales" value={formatCurrency(kpis.ingresos)} icon={Euro} className="bg-green-100/60" />
                            <KpiCard title="Gastos Totales" value={formatCurrency(kpis.gastos)} icon={TrendingDown} className="bg-red-100/60"/>
                            <KpiCard title="RESULTADO" value={formatCurrency(kpis.resultado)} icon={kpis.resultado >= 0 ? TrendingUp : TrendingDown} className={cn(kpis.resultado >= 0 ? "bg-green-100/60 text-green-800" : "bg-red-100/60 text-red-800")} />
                             <KpiCard title="Margen Bruto" value={formatPercentage(kpis.margen)} icon={kpis.margen >= 0 ? TrendingUp : TrendingDown} className={cn(kpis.margen >= 0 ? "bg-green-100/60 text-green-800" : "bg-red-100/60 text-red-800")} />
                        </div>
                        
                        <Card className="mt-4">
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="p-2 sticky left-0 bg-muted/50 z-10 w-48">Partida</TableHead>
                                                <TableHead colSpan={2} className="p-2 text-center border-l border-r">Presupuesto</TableHead>
                                                <TableHead colSpan={2} className="p-2 text-center border-l border-r">
                                                    Cierre
                                                    <Tooltip><TooltipTrigger asChild><span className="ml-1.5 cursor-help"><Info className="h-3 w-3 inline text-muted-foreground"/></span></TooltipTrigger><TooltipContent><p>Presupuesto menos devoluciones y mermas.</p></TooltipContent></Tooltip>
                                                </TableHead>
                                                <TableHead colSpan={2} className="p-2 text-center border-l border-r">
                                                    Real
                                                </TableHead>
                                                <TableHead colSpan={2} className="p-2 text-center border-l border-r">Objetivo</TableHead>
                                                <TableHead colSpan={2} className="p-2 text-center border-l">Desviación (Real vs. Obj.)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                         <TableBody>
                                            {renderSummaryRow('INGRESOS', totalRealIngresos, true)}
                                            {ingresos.map(renderCostRow)}
                                            {renderSummaryRow('GASTOS', totalRealGastos, true)}
                                            {gastos.map(renderCostRow)}
                                            {renderFinalRow('RESULTADO', rentabilidadReal)}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="acumulado-mensual" className="mt-4 space-y-4">
                        <Card>
                            <CardHeader><CardTitle>Acumulado Mensual {getYear(new Date())} (€)</CardTitle></CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Concepto</TableHead>
                                                {dataAcumulada.map(d => <TableHead key={d.mes} className="text-right capitalize">{d.mes}</TableHead>)}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow className="font-bold bg-primary/10">
                                                <TableCell className="text-black">Ingresos</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatCurrency(m.ingresos)}</TableCell>)}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="pl-8">Consumos MP</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatCurrency(m.consumoMMPP)}</TableCell>)}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="pl-8">Cesiones de Personal (Gasto)</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatCurrency(m.cesionesGasto)}</TableCell>)}
                                            </TableRow>
                                             <TableRow>
                                                <TableCell className="pl-8">Personal de Apoyo CPR</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatCurrency(m.personalSolicitado)}</TableCell>)}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="pl-8">Varios (Costes Fijos)</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatCurrency(m.varios)}</TableCell>)}
                                            </TableRow>
                                            <TableRow className="font-bold bg-primary/20">
                                                <TableCell className="text-black">RESULTADO</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className={cn("text-right", m.resultado < 0 ? "text-destructive" : "text-green-600")}>{formatCurrency(m.resultado)}</TableCell>)}
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Acumulado Mensual {getYear(new Date())} (%)</CardTitle></CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>% sobre Ingresos</TableHead>
                                                {dataAcumulada.map(d => <TableHead key={d.mes} className="text-right capitalize">{d.mes}</TableHead>)}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                             <TableRow>
                                                <TableCell className="pl-8">Consumos MP</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatPercentage(m.ingresos > 0 ? m.consumoMMPP / m.ingresos : 0)}</TableCell>)}
                                            </TableRow>
                                             <TableRow>
                                                <TableCell className="pl-8">Personal Cedido</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatPercentage(m.ingresos > 0 ? m.cesionesGasto / m.ingresos : 0)}</TableCell>)}
                                            </TableRow>
                                             <TableRow>
                                                <TableCell className="pl-8">Personal de Apoyo CPR</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatPercentage(m.ingresos > 0 ? m.personalSolicitado / m.ingresos : 0)}</TableCell>)}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="pl-8">Varios (Costes Fijos)</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className="text-right">{formatPercentage(m.ingresos > 0 ? m.varios / m.ingresos : 0)}</TableCell>)}
                                            </TableRow>
                                            <TableRow className="font-bold bg-primary/20">
                                                <TableCell className="text-black">RESULTADO</TableCell>
                                                {dataAcumulada.map(m => <TableCell key={m.mes} className={cn("text-right", m.resultado < 0 ? "text-destructive" : "text-green-600")}>{formatPercentage(m.ingresos > 0 ? m.resultado / m.ingresos : 0)}</TableCell>)}
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </TooltipProvider>
        </div>
    );
}

    

    

    
