

'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Euro, Package, BookOpen, Users, Wallet, Ship, Ticket, Truck, UserCheck, Clock, Pencil, MessageSquare, AlertTriangle } from 'lucide-react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import type { Entrega, PedidoEntrega, ProductoVenta, CategoriaProductoVenta, EntregaHito, TransporteOrder, ProveedorTransporte, PersonalEntrega, PersonalEntregaTurno, AsignacionPersonal, PersonalExternoAjuste, Proveedor, CategoriaPersonal } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter, isWithinInterval, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
} from "recharts"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { GASTO_LABELS } from '@/lib/constants';
import Link from 'next/link';


type AnaliticaItem = {
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
    }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

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
    const [allPedidos, setAllPedidos] = useState<AnaliticaItem[]>([]);
    const [allTransporte, setAllTransporte] = useState<TransporteOrder[]>([]);
    const [proveedoresTransporte, setProveedoresTransporte] = useState<ProveedorTransporte[]>([]);
    const [allPersonal, setAllPersonal] = useState<PersonalEntrega[]>([]);
    const [allAjustesPersonal, setAllAjustesPersonal] = useState<Record<string, PersonalExternoAjuste[]>>({});
    const [proveedoresPersonal, setProveedoresPersonal] = useState<CategoriaPersonal[]>([]);
    const [allProveedores, setAllProveedores] = useState<Proveedor[]>([]);


    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [selectedPedidos, setSelectedPedidos] = useState<Set<string>>(new Set());
    const [tarifaFilter, setTarifaFilter] = useState<'all' | 'Empresa' | 'IFEMA'>('all');
    const [transporteProviderFilter, setTransporteProviderFilter] = useState('all');
    const [personalProviderFilter, setPersonalProviderFilter] = useState('all');

    useEffect(() => {
        const allEntregas = (JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[]).filter(os => os.vertical === 'Entregas');
        const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const allProductosVenta = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
        const allTransporteOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
        const allProveedoresTransporte = JSON.parse(localStorage.getItem('proveedoresTransporte') || '[]') as ProveedorTransporte[];
        const allPersonalData = JSON.parse(localStorage.getItem('personalEntrega') || '[]') as PersonalEntrega[];
        const allAjustesData = JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}');
        const allProveedoresPersonalData = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
        const proveedoresData = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
        setAllProveedores(proveedoresData);

        setAllTransporte(allTransporteOrders);
        setProveedoresTransporte(allProveedoresTransporte);
        setAllPersonal(allPersonalData);
        setAllAjustesPersonal(allAjustesData);
        setProveedoresPersonal(allProveedoresPersonalData);

        const productosMap = new Map(allProductosVenta.map(p => [p.id, p]));

        const data: AnaliticaItem[] = allEntregas.map(os => {
            const deliveryOrder = allPedidosEntrega.find(d => d.osId === os.id);
            let costeTotal = 0;
            let pvpTotal = 0;
            let pvpIfemaTotal = 0;
            const costesPorCategoria: { [key: string]: number } = {};
            const productos: AnaliticaItem['productos'] = [];
            const costePorte = os.tarifa === 'IFEMA' ? 95 : 30;

            if (deliveryOrder && deliveryOrder.hitos) {
                deliveryOrder.hitos.forEach(hito => {
                    const totalPortesHito = (hito.portes || 0) * costePorte;
                    pvpTotal += totalPortesHito;
                    pvpIfemaTotal += totalPortesHito;

                    const horasCamarero = hito.horasCamarero || 0;
                    if(horasCamarero > 0) {
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

                    (hito.items || []).forEach(item => {
                        const producto = productosMap.get(item.id);
                        if (producto) {
                            const costeComponentes = (producto.componentes || []).reduce((sum, comp) => {
                                const costeReal = comp.coste || 0;
                                return sum + (costeReal * comp.cantidad);
                            }, 0);
                            
                            costeTotal += costeComponentes * item.quantity;
                            pvpTotal += producto.pvp * item.quantity;
                            pvpIfemaTotal += (producto.pvpIfema || producto.pvp) * item.quantity;

                            if (producto.categoria) {
                                costesPorCategoria[producto.categoria] = (costesPorCategoria[producto.categoria] || 0) + (costeComponentes * item.quantity);
                            }

                            productos.push({
                                id: producto.id,
                                nombre: producto.nombre,
                                categoria: producto.categoria,
                                cantidad: item.quantity,
                                coste: costeComponentes,
                                pvp: os.tarifa === 'IFEMA' ? (producto.pvpIfema || producto.pvp) : producto.pvp,
                                producidoPorPartner: producto.producidoPorPartner
                            });
                        }
                    });
                });
            }

            const transporteOs = allTransporteOrders.filter(t => t.osId === os.id);
            const costeTransporteOs = transporteOs.reduce((sum, t) => sum + t.precio, 0);
            costeTotal += costeTransporteOs;
            costesPorCategoria[GASTO_LABELS.transporte] = (costesPorCategoria[GASTO_LABELS.transporte] || 0) + costeTransporteOs;
            
            const personalOs = allPersonalData.find(p => p.osId === os.id);
            if (personalOs) {
                const costePersonalOs = personalOs.turnos.reduce((sum, turno) => {
                    const horas = calculateHours(turno.horaEntradaReal || turno.horaEntrada, turno.horaSalidaReal || turno.horaSalida);
                    return sum + horas * (turno.precioHora || 0);
                }, 0);
                const ajustes = (allAjustesData[os.id] || []).reduce((sum, aj) => sum + aj.ajuste, 0);
                costesPorCategoria['Personal'] = (costesPorCategoria['Personal'] || 0) + costePersonalOs + ajustes;
                costeTotal += costePersonalOs + ajustes;
            }


            return { os, costeTotal, pvpTotal, pvpIfemaTotal, costesPorCategoria, productos };
        });

        setAllPedidos(data);
        setIsMounted(true);
    }, []);
    
    const pedidosFiltrados = useMemo(() => {
    if (!dateRange?.from) return [];
        const toDate = dateRange.to || dateRange.from;
        return allPedidos.filter(p => {
            const osDate = new Date(p.os.startDate);
            const isInDateRange = isWithinInterval(osDate, { start: dateRange.from!, end: endOfDay(toDate) });
            const matchesTarifa = tarifaFilter === 'all' || p.os.tarifa === tarifaFilter;
            return isInDateRange && matchesTarifa;
        });
    }, [allPedidos, dateRange, tarifaFilter]);


    useEffect(() => {
        setSelectedPedidos(new Set(pedidosFiltrados.map(p => p.os.id)));
    }, [pedidosFiltrados]);

    const handleSelect = (osId: string) => {
        setSelectedPedidos(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(osId)) {
                newSelection.delete(osId);
            } else {
                newSelection.add(osId);
            }
            return newSelection;
        });
    }
    
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedPedidos(new Set(pedidosFiltrados.map(p => p.os.id)));
        } else {
            setSelectedPedidos(new Set());
        }
    }
    
    const analisisSeleccion = useMemo(() => {
        const seleccion = pedidosFiltrados.filter(p => selectedPedidos.has(p.os.id));
        if (seleccion.length === 0) {
            return { pvpBruto: 0, pvpNeto: 0, costeProductos: 0, costeTransporte: 0, costePersonal: 0, comisionAgencia: 0, comisionCanon: 0, costesPorCategoria: {}, productos: [], hitosCount: 0, pvpPorCategoria: {} };
        }
        
        let pvpBruto = 0;
        let pvpNeto = 0;
        let comisionAgencia = 0;
        let comisionCanon = 0;
        
        seleccion.forEach(item => {
            const pvpItemBruto = item.os.tarifa === 'IFEMA' ? item.pvpIfemaTotal : item.pvpTotal;
            pvpBruto += pvpItemBruto;
            const comisionAgenciaTotal = pvpItemBruto * ((item.os.agencyPercentage || 0) / 100) + (item.os.agencyCommissionValue || 0);
            const comisionCanonTotal = pvpItemBruto * ((item.os.spacePercentage || 0) / 100) + (item.os.spaceCommissionValue || 0);
            comisionAgencia += comisionAgenciaTotal;
            comisionCanon += comisionCanonTotal;
            pvpNeto += pvpItemBruto - comisionAgenciaTotal - comisionCanonTotal;
        });
        
        const costesPorCategoria: { [key: string]: number } = {};
        const productosAgregados: { [key: string]: AnaliticaItem['productos'][0] } = {};
        let hitosCount = 0;
        
        const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];

        seleccion.forEach(item => {
            const pedido = allPedidosEntrega.find(p => p.osId === item.os.id);
            hitosCount += pedido?.hitos.length || 0;

            for (const cat in item.costesPorCategoria) {
                costesPorCategoria[cat] = (costesPorCategoria[cat] || 0) + item.costesPorCategoria[cat];
            }
            item.productos.forEach(prod => {
                if (!productosAgregados[prod.id]) {
                    productosAgregados[prod.id] = { ...prod, cantidad: 0, coste: 0, pvp: 0 };
                }
                productosAgregados[prod.id].cantidad += prod.cantidad;
                productosAgregados[prod.id].coste += prod.coste * prod.cantidad;
                productosAgregados[prod.id].pvp += prod.pvp * prod.cantidad;
            });
        });
        
        const costeTransporte = costesPorCategoria[GASTO_LABELS.transporte] || 0;
        const costePersonal = costesPorCategoria['Personal'] || 0;
        const costeProductos = Object.entries(costesPorCategoria).reduce((sum, [cat, val]) => {
            return (cat === GASTO_LABELS.transporte || cat === 'Personal') ? sum : sum + val;
        }, 0);
        
        const pvpTransporte = seleccion.reduce((sum, item) => {
            const costePorte = item.os.tarifa === 'IFEMA' ? 95 : 30;
            const pedido = allPedidosEntrega.find(p => p.osId === item.os.id);
            const portes = pedido?.hitos.reduce((hSum, hito) => hSum + (hito.portes || 0), 0) || 0;
            return sum + (portes * costePorte);
        }, 0);

        const pvpCamareros = seleccion.reduce((sum, item) => {
            const pvpCamareroHora = item.os.tarifa === 'IFEMA' ? 44.50 : 36.50;
            const pedido = allPedidosEntrega.find(p => p.osId === item.os.id);
            const horas = pedido?.hitos.reduce((hSum, hito) => {
                const h = hito.horasCamarero || 0;
                return hSum + (h > 0 && h < 4 ? 4 : h);
            }, 0) || 0;
            return sum + (horas * pvpCamareroHora);
        }, 0);
        
        const pvpPorCategoria: { [key: string]: number } = { 
            [GASTO_LABELS.transporte]: pvpTransporte,
            'Personal': pvpCamareros
        };

        Object.values(productosAgregados).forEach(p => {
             pvpPorCategoria[p.categoria] = (pvpPorCategoria[p.categoria] || 0) + p.pvp;
        });

        return { pvpBruto, pvpNeto, costeProductos, costeTransporte, costePersonal, comisionAgencia, comisionCanon, costesPorCategoria, productos: Object.values(productosAgregados), hitosCount, pvpPorCategoria };

    }, [pedidosFiltrados, selectedPedidos]);
    
    const { ticketMedioContrato, ticketMedioEntrega } = useMemo(() => {
        const numContratos = selectedPedidos.size;
        const numEntregas = analisisSeleccion.hitosCount;
        return {
            ticketMedioContrato: numContratos > 0 ? analisisSeleccion.pvpNeto / numContratos : 0,
            ticketMedioEntrega: numEntregas > 0 ? analisisSeleccion.pvpNeto / numEntregas : 0
        };
    }, [analisisSeleccion, selectedPedidos]);

    const topProductos = useMemo(() => {
        return analisisSeleccion.productos
            .sort((a,b) => b.cantidad - a.cantidad)
            .slice(0, 5);
    }, [analisisSeleccion.productos]);

    const rentabilidadPorCategoria = useMemo(() => {
        const allCategories = new Set([
            ...Object.keys(analisisSeleccion.costesPorCategoria),
            ...Object.keys(analisisSeleccion.pvpPorCategoria || {})
        ]);

        return Array.from(allCategories).map(cat => {
            const coste = analisisSeleccion.costesPorCategoria[cat] || 0;
            const pvp = (analisisSeleccion.pvpPorCategoria || {})[cat] || 0;
            const margen = pvp - coste;
            const margenPct = pvp > 0 ? (margen / pvp) * 100 : 0;
            return { categoria: cat, pvp, coste, margen, margenPct };
        }).filter(c => c.pvp > 0 || c.coste > 0)
          .sort((a,b) => b.margen - a.margen);
    }, [analisisSeleccion.costesPorCategoria, analisisSeleccion.pvpPorCategoria]);
    
    const partnerAnalysis = useMemo(() => {
        const partnerProducts = analisisSeleccion.productos.filter(p => p.producidoPorPartner);
        const coste = partnerProducts.reduce((sum, p) => sum + p.coste, 0);
        const pvp = partnerProducts.reduce((sum, p) => sum + p.pvp, 0);
        const margen = pvp - coste;
        const margenPct = pvp > 0 ? (margen / pvp) * 100 : 0;
        const top = partnerProducts.sort((a,b) => b.cantidad - a.cantidad).slice(0,5);
        return { coste, pvp, margen, margenPct, top };
    }, [analisisSeleccion.productos]);

    const monthlyData = useMemo(() => {
        const dataByMonth: { [key: string]: { facturacionNeta: number, coste: number, contratos: Set<string>, entregas: number } } = {};
        
        pedidosFiltrados.forEach(item => {
            const month = format(new Date(item.os.startDate), 'yyyy-MM');
            if (!dataByMonth[month]) {
                dataByMonth[month] = { facturacionNeta: 0, coste: 0, contratos: new Set(), entregas: 0 };
            }
            const pvpBruto = item.os.tarifa === 'IFEMA' ? item.pvpIfemaTotal : item.pvpTotal;
            const comisionAgenciaTotal = pvpBruto * ((item.os.agencyPercentage || 0) / 100) + (item.os.agencyCommissionValue || 0);
            const comisionCanonTotal = pvpBruto * ((item.os.spacePercentage || 0) / 100) + (item.os.spaceCommissionValue || 0);
            
            dataByMonth[month].facturacionNeta += pvpBruto - comisionAgenciaTotal - comisionCanonTotal;
            dataByMonth[month].coste += item.costeTotal;
            dataByMonth[month].contratos.add(item.os.id);
            
            const pedido = (JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[]).find(p => p.osId === item.os.id);
            dataByMonth[month].entregas += pedido?.hitos.length || 0;
        });

        return Object.entries(dataByMonth).map(([month, data]) => ({
            name: format(new Date(`${month}-02`), 'MMM yy', {locale: es}),
            Facturación: data.facturacionNeta,
            Rentabilidad: data.facturacionNeta - data.coste,
            Contratos: data.contratos.size,
            Entregas: data.entregas,
            'Ticket Medio Contrato': data.contratos.size > 0 ? data.facturacionNeta / data.contratos.size : 0,
            'Ticket Medio Entrega': data.entregas > 0 ? data.facturacionNeta / data.entregas : 0,
        })).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    }, [pedidosFiltrados]);

    const transporteAnalysis = useMemo(() => {
        const osIdsEnRango = new Set(pedidosFiltrados.map(p => p.os.id));
        const transporteEnRango = allTransporte.filter(t => osIdsEnRango.has(t.osId));

        const filteredByProvider = transporteProviderFilter === 'all'
            ? transporteEnRango
            : transporteEnRango.filter(t => t.proveedorId === transporteProviderFilter);

        const costeTotal = filteredByProvider.reduce((sum, t) => sum + t.precio, 0);
        const totalViajes = filteredByProvider.length;
        const costeMedio = totalViajes > 0 ? costeTotal / totalViajes : 0;
        
        const viajesPorProveedor: { [key: string]: number } = {};
        transporteEnRango.forEach(t => {
            const nombre = t.proveedorNombre || 'Desconocido';
            viajesPorProveedor[nombre] = (viajesPorProveedor[nombre] || 0) + 1;
        });
        const pieData = Object.entries(viajesPorProveedor).map(([name, value]) => ({ name, value }));

        const porMes: { [key: string]: { coste: number; viajes: number } } = {};
        filteredByProvider.forEach(t => {
            const month = format(new Date(t.fecha), 'yyyy-MM');
            if (!porMes[month]) {
                porMes[month] = { coste: 0, viajes: 0 };
            }
            porMes[month].coste += t.precio;
            porMes[month].viajes += 1;
        });
        const monthlyChartData = Object.entries(porMes).map(([month, data]) => ({
            name: format(new Date(`${month}-02`), 'MMM yy', {locale: es}),
            Coste: data.coste,
            Viajes: data.viajes
        })).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime());

        return { costeTotal, totalViajes, costeMedio, pieData, monthlyChartData, listado: filteredByProvider };
    }, [pedidosFiltrados, allTransporte, transporteProviderFilter]);
    
   const personalAnalysis = useMemo(() => {
        const osIdsEnRango = new Set(pedidosFiltrados.map(p => p.os.id));
        let personalEnRango = allPersonal.filter(p => osIdsEnRango.has(p.osId));
        
        if (personalProviderFilter !== 'all') {
            const personalDelProveedor = proveedoresPersonal.filter(pp => pp.proveedorId === personalProviderFilter).map(pp => pp.id);
            personalEnRango = personalEnRango.map(p => ({
                ...p,
                turnos: p.turnos.filter(t => personalDelProveedor.includes(t.proveedorId)),
            })).filter(p => p.turnos.length > 0);
        }

        let costeTotalPlan = 0, costeTotalReal = 0, horasPlan = 0, horasReal = 0, totalTurnos = 0, totalAjustes = 0;
        const costePorProveedor: Record<string, number> = {};
        const proveedoresMap = new Map(allProveedores.map(p => [p.id, p.nombreComercial]));

        const ajustesFiltrados: (PersonalExternoAjuste & {os: Entrega})[] = [];

        personalEnRango.forEach(p => {
            totalTurnos += p.turnos.length;
            p.turnos.forEach(turno => {
                horasPlan += calculateHours(turno.horaEntrada, turno.horaSalida);
                costeTotalPlan += calculateHours(turno.horaEntrada, turno.horaSalida) * turno.precioHora;
                
                const hReal = turno.asignaciones?.reduce((sum, asig) => sum + calculateHours(asig.horaEntradaReal, asig.horaSalidaReal), 0) || calculateHours(turno.horaEntrada, turno.horaSalida);
                horasReal += hReal;
                const costeTurnoReal = hReal * turno.precioHora;
                costeTotalReal += costeTurnoReal;

                const catPersonal = proveedoresPersonal.find(pp => pp.id === turno.proveedorId);
                const proveedorMaestro = allProveedores.find(prov => prov.id === catPersonal?.proveedorId);
                const provName = proveedorMaestro?.nombreComercial || 'Desconocido';
                costePorProveedor[provName] = (costePorProveedor[provName] || 0) + costeTurnoReal;
            });

            const osAjustes = allAjustesPersonal[p.osId] || [];
            osAjustes.forEach(ajuste => {
                 const os = pedidosFiltrados.find(ped => ped.os.id === p.osId)?.os;
                 if (os) {
                    ajustesFiltrados.push({ ...ajuste, os});
                 }
            });
            totalAjustes += osAjustes.reduce((sum, aj) => sum + aj.ajuste, 0);
        });
        
        const pieData = Object.entries(costePorProveedor).map(([name, value]) => ({ name, value }));

        return { costeTotalPlan, costeTotalReal, totalAjustes, costeFinal: costeTotalReal + totalAjustes, horasPlan, horasReal, totalTurnos, pieData, ajustes: ajustesFiltrados };
    }, [pedidosFiltrados, allPersonal, allAjustesPersonal, proveedoresPersonal, personalProviderFilter, allProveedores]);

    const uniquePersonalProviders = useMemo(() => {
        const providerIds = new Set(proveedoresPersonal.map(p => p.proveedorId));
        return allProveedores.filter(p => providerIds.has(p.id));
    }, [proveedoresPersonal, allProveedores]);


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
    };
    
    const costeTotalSeleccion = analisisSeleccion.costeProductos + analisisSeleccion.costeTransporte + analisisSeleccion.costePersonal + analisisSeleccion.comisionAgencia + analisisSeleccion.comisionCanon;
    const margenFinal = analisisSeleccion.pvpNeto - costeTotalSeleccion;


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Analítica de Rentabilidad..." />;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-6">
                <BarChart3 className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-headline font-bold">Analítica de Rentabilidad de Entregas</h1>
                </div>
            </div>
            
            <Card className="mb-6">
                <CardContent className="p-4 flex flex-wrap items-center gap-4 justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-full md:w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
                            </PopoverContent>
                        </Popover>
                        <Button size="sm" variant="outline" onClick={() => setDatePreset('month')}>Mes en curso</Button>
                        <Button size="sm" variant="outline" onClick={() => setDatePreset('year')}>Año en curso</Button>
                        <Button size="sm" variant="outline" onClick={() => setDatePreset('q1')}>Q1</Button>
                        <Button size="sm" variant="outline" onClick={() => setDatePreset('q2')}>Q2</Button>
                        <Button size="sm" variant="outline" onClick={() => setDatePreset('q3')}>Q3</Button>
                        <Button size="sm" variant="outline" onClick={() => setDatePreset('q4')}>Q4</Button>
                    </div>
                    <Select value={tarifaFilter} onValueChange={(value) => setTarifaFilter(value as any)}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Filtrar por tarifa" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las Tarifas</SelectItem>
                            <SelectItem value="Empresa">Empresa</SelectItem>
                            <SelectItem value="IFEMA">IFEMA</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Tabs defaultValue="rentabilidad">
                <TabsList className="mb-4 grid w-full grid-cols-4">
                    <TabsTrigger value="rentabilidad">Análisis de Rentabilidad</TabsTrigger>
                    <TabsTrigger value="partner">Análisis Partner</TabsTrigger>
                    <TabsTrigger value="transporte">Análisis de Transporte</TabsTrigger>
                    <TabsTrigger value="personal">Análisis de Personal</TabsTrigger>
                </TabsList>
                <TabsContent value="rentabilidad">
                    <div className="space-y-8">
                       <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                                    <CardTitle className="text-xl font-medium">Facturación</CardTitle>
                                    <Euro className="h-5 w-5 text-muted-foreground" />
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Bruta: {formatCurrency(analisisSeleccion.pvpBruto)}</p>
                                    <div className="text-3xl font-bold text-green-600">{formatCurrency(analisisSeleccion.pvpNeto)}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-base font-medium">Desglose de Costes</CardTitle>
                                    <Wallet className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent className="text-xs space-y-0.5">
                                    <div className="flex justify-between"><span>Productos:</span> <span className="font-semibold">{formatCurrency(analisisSeleccion.costeProductos)}</span></div>
                                    <div className="flex justify-between"><span>Personal:</span> <span className="font-semibold">{formatCurrency(analisisSeleccion.costePersonal)}</span></div>
                                    <div className="flex justify-between"><span>Transporte:</span> <span className="font-semibold">{formatCurrency(analisisSeleccion.costeTransporte)}</span></div>
                                    <div className="flex justify-between"><span>Com. Agencia:</span> <span className="font-semibold">{formatCurrency(analisisSeleccion.comisionAgencia)}</span></div>
                                    <div className="flex justify-between"><span>Canon Espacio:</span> <span className="font-semibold">{formatCurrency(analisisSeleccion.comisionCanon)}</span></div>
                                    <Separator className="my-1"/>
                                    <div className="flex justify-between font-bold text-sm"><span>Total:</span> <span>{formatCurrency(costeTotalSeleccion)}</span></div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                                    <CardTitle className="text-base font-medium">Rentabilidad Final</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent className="space-y-0.5">
                                    <div className={cn("text-2xl font-bold", margenFinal >= 0 ? "text-green-600" : "text-destructive")}>
                                        {formatCurrency(margenFinal)}
                                    </div>
                                    <p className={cn("text-base font-semibold", (analisisSeleccion.pvpNeto > 0 ? (margenFinal / analisisSeleccion.pvpNeto) * 100 : 0) >= 0 ? "text-green-600" : "text-destructive")}>
                                        {(analisisSeleccion.pvpNeto > 0 ? (margenFinal / analisisSeleccion.pvpNeto) * 100 : 0).toFixed(2)}%
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-base font-medium">Volumen</CardTitle>
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    <div className="text-2xl font-bold">{selectedPedidos.size} <span className="text-sm font-normal text-muted-foreground">contratos</span></div>
                                    <div className="text-2xl font-bold">{analisisSeleccion.hitosCount} <span className="text-sm font-normal text-muted-foreground">entregas</span></div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-base font-medium">Ticket Medio</CardTitle>
                                    <Ticket className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    <div className="text-lg font-bold">{formatCurrency(ticketMedioContrato)} <span className="text-xs font-normal text-muted-foreground">/contrato</span></div>
                                    <div className="text-lg font-bold">{formatCurrency(ticketMedioEntrega)} <span className="text-xs font-normal text-muted-foreground">/entrega</span></div>
                                </CardContent>
                            </Card>
                        </div>
                         <Card>
                            <CardHeader><CardTitle>Facturación y Rentabilidad Mensual</CardTitle></CardHeader>
                            <CardContent className="pl-0">
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value / 1000}k`}/>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        <Legend />
                                        <Area type="monotone" dataKey="Facturación" stackId="1" stroke="#8884d8" fill="#8884d8" />
                                        <Area type="monotone" dataKey="Rentabilidad" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        <div className="grid lg:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader><CardTitle>Top 5 Productos más Vendidos</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cantidad Vendida</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {topProductos.map(p => (
                                                <TableRow key={p.id}><TableCell>{p.nombre}</TableCell><TableCell className="text-right font-medium">{p.cantidad}</TableCell></TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Rentabilidad por Categoría</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Categoría</TableHead><TableHead className="text-right">Margen Bruto</TableHead><TableHead className="text-right">Margen %</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {rentabilidadPorCategoria.map(c => (
                                                <TableRow key={c.categoria}><TableCell>{c.categoria}</TableCell><TableCell className="text-right">{formatCurrency(c.margen)}</TableCell><TableCell className={cn("text-right font-medium", c.margenPct < 0 && 'text-destructive')}>{c.margenPct.toFixed(1)}%</TableCell></TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
                  <TabsContent value="partner">
                    <div className="grid md:grid-cols-[1fr_400px] gap-8 items-start">
                        <Card>
                            <CardHeader><CardTitle>Top 5 Productos de Partner más vendidos</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {partnerAnalysis.top.map(p => (
                                            <TableRow key={p.id}><TableCell>{p.nombre}</TableCell><TableCell className="text-right font-medium">{p.cantidad}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Rentabilidad Partner</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between font-semibold"><span>Facturación (PVP)</span><span>{formatCurrency(partnerAnalysis.pvp)}</span></div>
                                <div className="flex justify-between"><span>Coste</span><span>{formatCurrency(partnerAnalysis.coste)}</span></div>
                                <Separator className="my-2"/>
                                <div className="flex justify-between font-bold text-lg"><span>Margen Bruto</span><span>{formatCurrency(partnerAnalysis.margen)}</span></div>
                                <div className="flex justify-between font-bold text-lg"><span>Margen %</span><span className={cn(partnerAnalysis.margenPct < 0 && 'text-destructive')}>{partnerAnalysis.margenPct.toFixed(2)}%</span></div>
                            </CardContent>
                        </Card>
                    </div>
                  </TabsContent>
                  <TabsContent value="transporte">
                    <div className="space-y-8">
                         <div className="grid md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Coste Total Transporte</CardTitle><Wallet className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{formatCurrency(transporteAnalysis.costeTotal)}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Nº Total de Viajes</CardTitle><Truck className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{transporteAnalysis.totalViajes}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Coste Medio por Viaje</CardTitle><Euro className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{formatCurrency(transporteAnalysis.costeMedio)}</div></CardContent>
                            </Card>
                        </div>

                         <div className="grid lg:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader><CardTitle>Distribución de Viajes por Transportista</CardTitle></CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie data={transporteAnalysis.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                                 {transporteAnalysis.pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `${value} viajes`} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Costes de Transporte Mensuales</CardTitle></CardHeader>
                                <CardContent className="pl-0">
                                     <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={transporteAnalysis.monthlyChartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)} />
                                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                            <Bar dataKey="Coste" fill="#8884d8" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                         </div>
                         <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Listado de Viajes</CardTitle>
                                    <Select value={transporteProviderFilter} onValueChange={setTransporteProviderFilter}>
                                        <SelectTrigger className="w-full md:w-[240px]">
                                            <SelectValue placeholder="Filtrar por transportista" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los transportistas</SelectItem>
                                            {proveedoresTransporte.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreProveedor}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent>
                                 <Table>
                                    <TableHeader><TableRow><TableHead>OS</TableHead><TableHead>Proveedor</TableHead><TableHead>Tipo Vehículo</TableHead><TableHead className="text-right">Coste</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {transporteAnalysis.listado.map(t => (
                                            <TableRow key={t.id}><TableCell>{allPedidos.find(p => p.os.id === t.osId)?.os.serviceNumber}</TableCell><TableCell>{t.proveedorNombre}</TableCell><TableCell>{t.tipoTransporte}</TableCell><TableCell className="text-right">{formatCurrency(t.precio)}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                         </Card>
                    </div>
                  </TabsContent>
                   <TabsContent value="personal">
                    <div className="space-y-8">
                        <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant={personalProviderFilter === 'all' ? 'default' : 'outline'} onClick={() => setPersonalProviderFilter('all')}>Todos</Button>
                            {uniquePersonalProviders.map(proveedor => (
                                <Button key={proveedor.id} size="sm" variant={personalProviderFilter === proveedor.id ? 'default' : 'outline'} onClick={() => setPersonalProviderFilter(proveedor.id)}>
                                    {proveedor.nombreComercial}
                                </Button>
                            ))}
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Coste Total Planificado</CardTitle><Wallet className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{formatCurrency(personalAnalysis.costeTotalPlan)}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Coste Total Personal</CardTitle><Wallet className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{formatCurrency(personalAnalysis.costeFinal)}</div><p className="text-xs text-muted-foreground">Coste real + ajustes</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Desviación de Costes</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className={cn("text-2xl font-bold", personalAnalysis.costeFinal - personalAnalysis.costeTotalPlan >= 0 ? "text-destructive" : "text-green-600")}>{formatCurrency(personalAnalysis.costeFinal - personalAnalysis.costeTotalPlan)}</div><p className="text-xs text-muted-foreground">vs. planificado</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Nº de empleados</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{personalAnalysis.totalTurnos}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Horas</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{formatNumber(personalAnalysis.horasReal, 2)}h</div><p className="text-xs text-muted-foreground">Planificadas: {formatNumber(personalAnalysis.horasPlan, 2)}h</p></CardContent>
                             </Card>
                        </div>
                        <div className="grid lg:grid-cols-2 gap-4">
                             <Card>
                                <CardHeader><CardTitle>Coste por Proveedor de Personal</CardTitle></CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie data={personalAnalysis.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(props) => `${props.name} (${formatCurrency(props.value as number)})`}>
                                                 {personalAnalysis.pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Ajustes Manuales de Coste</CardTitle></CardHeader>
                                <CardContent>
                                     <Table>
                                        <TableHeader><TableRow><TableHead>Servicio</TableHead><TableHead>Fecha</TableHead><TableHead>Concepto</TableHead><TableHead className="text-right">Importe</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {personalAnalysis.ajustes.map((a, i) => (
                                                <TableRow key={i}>
                                                    <TableCell><Link href={`/entregas/pedido/${a.os.id}`} className="text-primary hover:underline">{a.os.serviceNumber}</Link></TableCell>
                                                    <TableCell>{format(new Date(a.os.startDate), 'dd/MM/yy')}</TableCell>
                                                    <TableCell>{a.concepto}</TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(a.ajuste)}</TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="font-bold border-t-2"><TableCell colSpan={3}>Total Ajustes</TableCell><TableCell className="text-right">{formatCurrency(personalAnalysis.totalAjustes)}</TableCell></TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                             </Card>
                        </div>
                    </div>
                  </TabsContent>
            </Tabs>
            
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Listado de Pedidos en el Periodo</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12"><Checkbox onCheckedChange={handleSelectAll} checked={selectedPedidos.size === pedidosFiltrados.length && pedidosFiltrados.length > 0} /></TableHead>
                                <TableHead>Nº Pedido</TableHead>
                                <TableHead>Tarifa</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead className="text-right">Coste</TableHead>
                                <TableHead className="text-right">PVP</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pedidosFiltrados.map(p => (
                                <TableRow key={p.os.id} onClick={() => handleSelect(p.os.id)} className="cursor-pointer">
                                    <TableCell><Checkbox checked={selectedPedidos.has(p.os.id)} /></TableCell>
                                    <TableCell className="font-medium">{p.os.serviceNumber}</TableCell>
                                    <TableCell>{p.os.tarifa}</TableCell>
                                    <TableCell>{p.os.client}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(p.costeTotal)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(p.os.tarifa === 'IFEMA' ? p.pvpIfemaTotal : p.pvpTotal)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
            </Card>
            
        </main>
    )
}

    
