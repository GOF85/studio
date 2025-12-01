
'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Euro, Package, BookOpen, Users, Wallet, Ship, Ticket, Truck, UserCheck, Clock, Pencil, MessageSquare, AlertTriangle, LifeBuoy } from 'lucide-react';
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
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';


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
        partnerId?: string;
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
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [selectedPedidos, setSelectedPedidos] = useState<Set<string>>(new Set());
    const [tarifaFilter, setTarifaFilter] = useState<'all' | 'Empresa' | 'IFEMA'>('all');
    const [transporteProviderFilter, setTransporteProviderFilter] = useState('all');
    const [personalProviderFilter, setPersonalProviderFilter] = useState('all');
    const [partnerProviderFilter, setPartnerProviderFilter] = useState('all');

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
                                producidoPorPartner: producto.producidoPorPartner,
                                partnerId: producto.partnerId
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
                const ajustes = (allAjustesData[os.id] || []).reduce((sum, aj) => sum + aj.importe, 0);
                costesPorCategoria['Personal'] = (costesPorCategoria['Personal'] || 0) + costePersonalOs + ajustes;
                costeTotal += costePersonalOs + ajustes;
            }


            return { os, costeTotal, pvpTotal, pvpIfemaTotal, costesPorCategoria, productos };
        });

        setAllPedidos(data);
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
        const allPartnerProducts = analisisSeleccion.productos.filter(p => p.producidoPorPartner);
        
        const partnerProducts = partnerProviderFilter === 'all'
            ? allPartnerProducts
            : allPartnerProducts.filter(p => p.partnerId === partnerProviderFilter);
            
        const coste = partnerProducts.reduce((sum, p) => sum + p.coste, 0);
        const pvp = partnerProducts.reduce((sum, p) => sum + p.pvp, 0);
        const margen = pvp - coste;
        const margenPct = pvp > 0 ? (margen / pvp) * 100 : 0;
        const top = partnerProducts.sort((a,b) => b.cantidad - a.cantidad).slice(0,5);
        
        const costePorPartner: Record<string, number> = {};
         allPartnerProducts.forEach(p => {
            const partnerName = allProveedores.find(prov => prov.id === p.partnerId)?.nombreComercial || 'Desconocido';
            costePorPartner[partnerName] = (costePorPartner[partnerName] || 0) + p.coste;
        });
        const pieData = Object.entries(costePorPartner).map(([name, value]) => ({ name, value }));

        return { coste, pvp, margen, margenPct, top, pieData };
    }, [analisisSeleccion.productos, partnerProviderFilter, allProveedores]);

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
        
        const proveedoresMap = new Map(allProveedores.map(p => [p.id, p.nombreComercial]));
        const categoriasMap = new Map(proveedoresPersonal.map(p => [p.id, p]));

        if (personalProviderFilter !== 'all') {
            const personalDelProveedor = proveedoresPersonal.filter(pp => pp.proveedorId === personalProviderFilter).map(pp => pp.id);
            personalEnRango = personalEnRango.map(p => ({
                ...p,
                turnos: p.turnos.filter(t => personalDelProveedor.includes(t.proveedorId)),
            })).filter(p => p.turnos.length > 0);
        }

        let costeTotalPlan = 0, costeTotalReal = 0, horasPlan = 0, horasReal = 0, totalTurnos = 0, totalAjustes = 0;
        const costePorProveedor: Record<string, number> = {};
        

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

                const catPersonal = categoriasMap.get(turno.proveedorId);
                const provName = catPersonal ? (proveedoresMap.get(catPersonal.proveedorId) || 'Desconocido') : 'Desconocido';
                costePorProveedor[provName] = (costePorProveedor[provName] || 0) + costeTurnoReal;
            });

            const osAjustes = allAjustesPersonal[p.osId] || [];
            osAjustes.forEach(ajuste => {
                 const os = pedidosFiltrados.find(ped => ped.os.id === p.osId)?.os;
                 if (os) {
                    ajustesFiltrados.push({ ...ajuste, os});
                 }
            });
            totalAjustes += osAjustes.reduce((sum, aj) => sum + aj.importe, 0);
        });
        
        const pieData = Object.entries(costePorProveedor).map(([name, value]) => ({ name, value }));

        return { costeTotalPlan, costeTotalReal, totalAjustes, costeFinal: costeTotalReal + totalAjustes, horasPlan, horasReal, totalTurnos, pieData, ajustes: ajustesFiltrados };
    }, [pedidosFiltrados, allPersonal, allAjustesPersonal, proveedoresPersonal, personalProviderFilter, allProveedores]);

    const uniquePartnerProviders = useMemo(() => {
        const providerIds = new Set(analisisSeleccion.productos.filter(p=>p.partnerId).map(p => p.partnerId));
        return allProveedores.filter(p => providerIds.has(p.id));
    }, [analisisSeleccion.productos, allProveedores]);
    
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


