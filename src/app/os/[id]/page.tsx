
'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { ServiceOrder, ComercialBriefing, MaterialOrder, GastronomyOrder, TransporteOrder, HieloOrder, DecoracionOrder, AtipicoOrder, PersonalMiceOrder, PersonalExternoOrder, PruebaMenuData, PersonalExternoAjuste, ComercialBriefingItem } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { Briefcase, Utensils, Warehouse, Euro, ArrowRight, Star, Building, FileText, LayoutDashboard } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

const calculatePersonalTotal = (orders: {precioHora?: number; horaEntrada: string; horaSalida: string; cantidad?: number}[]) => {
    return orders.reduce((sum, order) => {
        const hours = calculateHours(order.horaEntrada, order.horaSalida);
        const quantity = order.cantidad || 1;
        const price = order.precioHora || 0;
        return sum + (hours * price * quantity);
    }, 0);
};

export default function OsDashboardPage() {
    const router = useRouter();
    const params = useParams();
    const osId = params.id as string;
    
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    
    const { facturacionNeta, costeTotal, briefingItemsCount, pruebasMenuCount, rentabilidadEstimada, rentabilidadPct } = useMemo(() => {
        if (!isMounted || !serviceOrder) {
            return { facturacionNeta: 0, costeTotal: 0, briefingItemsCount: 0, pruebasMenuCount: 0, rentabilidadEstimada: 0, rentabilidadPct: 0 };
        }

        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        const currentBriefing = allBriefings.find(b => b.osId === osId);
        const totalBriefing = currentBriefing?.items.reduce((acc, item) => acc + (item.asistentes * item.precioUnitario) + (item.importeFijo || 0), 0) || 0;

        const allAjustes = (JSON.parse(localStorage.getItem('comercialAjustes') || '{}')[osId] || []) as { importe: number }[];
        const totalAjustes = allAjustes.reduce((sum: number, ajuste: {importe: number}) => sum + ajuste.importe, 0);
        const facturacionBruta = totalBriefing + totalAjustes;

        const agencyCommission = (facturacionBruta * (serviceOrder.agencyPercentage || 0) / 100) + (serviceOrder.agencyCommissionValue || 0);
        const spaceCommission = (facturacionBruta * (serviceOrder.spacePercentage || 0) / 100) + (serviceOrder.spaceCommissionValue || 0);
        const facturacionNeta = facturacionBruta - agencyCommission - spaceCommission;

        // Calculate total cost
        const getModuleTotal = (orders: {total?: number, precio?: number}[]) => orders.reduce((sum, order) => sum + (order.total ?? order.precio ?? 0), 0);
        const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
        const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
        const allHieloOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
        const allTransporteOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
        const allDecoracionOrders = JSON.parse(localStorage.getItem('decoracionOrders') || '[]') as DecoracionOrder[];
        const allAtipicoOrders = JSON.parse(localStorage.getItem('atipicosOrders') || '[]') as AtipicoOrder[];
        const allPersonalMiceOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[];
        const allPersonalExternoOrders = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
        const allPruebasMenu = JSON.parse(localStorage.getItem('pruebasMenu') || '[]') as PruebaMenuData[];
        const pruebaMenu = allPruebasMenu.find(p => p.osId === osId);
        const allPersonalExternoAjustes = (JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}')[osId] || []) as { ajuste: number }[];

        const costeGastro = getModuleTotal(allGastroOrders.filter(o => o.osId === osId));
        const costeMaterial = getModuleTotal(allMaterialOrders.filter(o => o.osId === osId));
        const costeHielo = getModuleTotal(allHieloOrders.filter(o => o.osId === osId));
        const costeTransporte = getModuleTotal(allTransporteOrders.filter(o => o.osId === osId));
        const costeDecoracion = getModuleTotal(allDecoracionOrders.filter(o => o.osId === osId));
        const costeAtipicos = getModuleTotal(allAtipicoOrders.filter(o => o.osId === osId));
        const costePersonalMice = calculatePersonalTotal(allPersonalMiceOrders.filter(o => o.osId === osId));
        const costePersonalExterno = calculatePersonalTotal(allPersonalExternoOrders.filter(o => o.osId === osId)) + allPersonalExternoAjustes.reduce((sum, ajuste) => sum + ajuste.ajuste, 0);
        const costePruebaMenu = pruebaMenu?.costePruebaMenu || 0;

        const costeTotal = costeGastro + costeMaterial + costeHielo + costeTransporte + costeDecoracion + costeAtipicos + costePersonalMice + costePersonalExterno + costePruebaMenu;

        const rentabilidad = facturacionNeta - costeTotal;
        const rentabilidadPorcentaje = facturacionNeta > 0 ? (rentabilidad / facturacionNeta) * 100 : 0;
        
        let gastronomicServices = 0;
        let tastingMenus = 0;
        if (currentBriefing) {
            currentBriefing.items.forEach(item => {
                if (item.conGastronomia) {
                    if (item.descripcion.toLowerCase() === 'prueba de menu') {
                        tastingMenus++;
                    } else {
                        gastronomicServices++;
                    }
                }
            });
        }

        return {
            facturacionNeta,
            costeTotal,
            briefingItemsCount: gastronomicServices,
            pruebasMenuCount: tastingMenus,
            rentabilidadEstimada: rentabilidad,
            rentabilidadPct: rentabilidadPorcentaje
        };

    }, [osId, isMounted, serviceOrder]);

    useEffect(() => {
        if (osId) {
            const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
            const currentOS = allServiceOrders.find(os => os.id === osId);
            setServiceOrder(currentOS || null);
        }
        setIsMounted(true);
    }, [osId]);


    if (!isMounted || !serviceOrder) {
        return <LoadingSkeleton title="Cargando Panel de Control..." />;
    }

    const statCards = [
        { title: 'Facturación Neta', value: formatCurrency(facturacionNeta), description: 'Ingresos post-comisiones' },
        { title: 'Coste Total Presup.', value: formatCurrency(costeTotal), description: 'Suma de todos los módulos' },
        { title: 'Rentabilidad Estimada', value: formatCurrency(rentabilidadEstimada), description: `${rentabilidadPct.toFixed(2)}% Margen Bruto`, color: rentabilidadEstimada >= 0 ? 'text-green-600' : 'text-destructive' },
        { 
            title: 'Nº de Servicios', 
            value: (
                <div className="flex items-baseline gap-2">
                    {briefingItemsCount > 0 && <span>{briefingItemsCount} <span className="text-sm font-normal">Servicios</span></span>}
                    {briefingItemsCount > 0 && pruebasMenuCount > 0 && <span className="text-xl">/</span>}
                    {pruebasMenuCount > 0 && <span>{pruebasMenuCount} <span className="text-sm font-normal">P. Menú</span></span>}
                    {briefingItemsCount === 0 && pruebasMenuCount === 0 && <span>0</span>}
                </div>
            ), 
            description: 'Servicios con gastronomía' 
        },
    ];

    const mainModuleLinks = [
        { title: 'Comercial', href: `/os/${osId}/comercial`, icon: Briefcase, description: 'Gestiona el briefing y la facturación.' },
        { title: 'Gastronomía', href: `/os/${osId}/gastronomia`, icon: Utensils, description: 'Define la oferta gastronómica del evento.' },
        { title: 'Almacén', href: `/os/${osId}/almacen`, icon: Warehouse, description: 'Solicita y gestiona el material interno.' },
        { title: 'Cta. Explotación', href: `/os/${osId}/cta-explotacion`, icon: Euro, description: 'Analiza la rentabilidad detallada.' },
    ];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold">{serviceOrder.serviceNumber}</h2>
                    <p className="text-lg text-muted-foreground">{serviceOrder.client} {serviceOrder.finalClient && `/ ${serviceOrder.finalClient}`}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(serviceOrder.startDate), 'dd MMM yyyy', {locale: es})} - {format(new Date(serviceOrder.endDate), 'dd MMM yyyy', {locale: es})}</p>
                </div>
                <Badge variant={serviceOrder.status === 'Confirmado' ? 'default' : (serviceOrder.status === 'Anulado' ? 'destructive' : 'secondary')} className="text-base">
                    {serviceOrder.status}
                </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card, index) => (
                    <Card key={index}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={cn("text-2xl font-bold", card.color)}>{card.value}</div>
                            <p className="text-xs text-muted-foreground">{card.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div>
                <h3 className="text-xl font-semibold mb-4">Módulos Principales</h3>
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                     {mainModuleLinks.map(link => (
                         <Link href={link.href} key={link.href}>
                             <Card className="hover:bg-accent hover:border-primary/50 transition-colors h-full">
                                 <CardHeader className="flex-row items-center gap-4">
                                     <link.icon className="w-8 h-8 text-primary"/>
                                     <CardTitle>{link.title}</CardTitle>
                                 </CardHeader>
                                 <CardContent>
                                     <p className="text-sm text-muted-foreground">{link.description}</p>
                                 </CardContent>
                             </Card>
                         </Link>
                     ))}
                 </div>
            </div>
        </div>
    );
}
