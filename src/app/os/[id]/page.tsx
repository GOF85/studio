

'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { ServiceOrder, ComercialBriefing, MaterialOrder, GastronomyOrder, TransporteOrder, HieloOrder, DecoracionOrder, AtipicoOrder, PersonalMiceOrder, PersonalExternoOrder, PruebaMenuData, PersonalExternoAjuste, ComercialBriefingItem } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Briefcase, Utensils, Warehouse, Euro, ArrowRight, Star, Building, FileText, LayoutDashboard, CheckCircle, Clock, XCircle, FileQuestion, Factory, ShieldCheck, Calendar } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

const StatusCard = ({ title, status, description }: { title: string, status: 'Completo' | 'En Progreso' | 'Pendiente', description: string }) => {
    const statusConfig = {
        'Completo': { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
        'En Progreso': { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50' },
        'Pendiente': { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
    };
    const config = statusConfig[status];

    return (
        <Card className={cn(config.bgColor)}>
            <CardHeader className="flex-row items-center gap-4 space-y-0 p-3">
                <config.icon className={cn("w-6 h-6", config.color)} />
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    )
}

function BriefingSummaryDialog({ osId }: { osId: string }) {
    const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);

    useEffect(() => {
        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        const currentBriefing = allBriefings.find(b => b.osId === osId);
        if (currentBriefing) {
            const sortedItems = [...currentBriefing.items].sort((a, b) => {
                const dateComparison = a.fecha.localeCompare(b.fecha);
                if (dateComparison !== 0) return dateComparison;
                return a.horaInicio.localeCompare(b.horaInicio);
            });
            setBriefingItems(sortedItems);
        }
    }, [osId]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Resumen de Servicios del Briefing</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Resumen de Servicios del Briefing</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Observaciones</TableHead>
                                <TableHead className="text-right">Asistentes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {briefingItems.length > 0 ? briefingItems.map(item => (
                                <TableRow key={item.id} className={cn(item.conGastronomia && 'bg-green-100/50 hover:bg-green-100')}>
                                    <TableCell>{format(new Date(item.fecha), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{item.horaInicio} - {item.horaFin}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{item.comentarios}</TableCell>
                                    <TableCell className="text-right">{item.asistentes}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function OsDashboardPage() {
    const router = useRouter();
    const params = useParams();
    const osId = params.id as string;
    
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    
    const { facturacionNeta, costeTotal, briefingItemsCount, pruebasMenuCount, rentabilidadEstimada, rentabilidadPct, eventStatus, durationDays } = useMemo(() => {
        if (!isMounted || !serviceOrder) {
            return { facturacionNeta: 0, costeTotal: 0, briefingItemsCount: 0, pruebasMenuCount: 0, rentabilidadEstimada: 0, rentabilidadPct: 0, eventStatus: {}, durationDays: 0 };
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

        const getModuleTotal = (orders: {total?: number, precio?: number}[]) => orders.reduce((sum, order) => sum + (order.total ?? order.precio ?? 0), 0);
        const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
        const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
        const allTransporteOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
        const allPersonalMiceOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[];
        const allPersonalExternoOrders = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
        const allPruebasMenu = JSON.parse(localStorage.getItem('pruebasMenu') || '[]') as PruebaMenuData[];
        const pruebaMenu = allPruebasMenu.find(p => p.osId === osId);
        const allPersonalExternoAjustes = (JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}')[osId] || []) as { ajuste: number }[];

        const costeGastro = getModuleTotal(allGastroOrders.filter(o => o.osId === osId));
        const costeMaterial = getModuleTotal(allMaterialOrders.filter(o => o.osId === osId));
        const costeTransporte = getModuleTotal(allTransporteOrders.filter(o => o.osId === osId));
        const costePersonalMice = calculatePersonalTotal(allPersonalMiceOrders.filter(o => o.osId === osId));
        const costePersonalExterno = calculatePersonalTotal(allPersonalExternoOrders.filter(o => o.osId === osId)) + allPersonalExternoAjustes.reduce((sum, ajuste) => sum + ajuste.ajuste, 0);
        const costePruebaMenu = pruebaMenu?.costePruebaMenu || 0;

        const costeTotal = costeGastro + costeMaterial + costeTransporte + costePersonalMice + costePersonalExterno + costePruebaMenu;

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
        
        const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as any[];
        const relatedOFs = allOFs.filter(of => of.osIDs.includes(osId));

        const status = {
            comercial: currentBriefing && currentBriefing.items.length > 0 ? 'Completo' : 'Pendiente',
            gastronomia: allGastroOrders.filter(o => o.osId === osId).length > 0 ? 'Completo' : 'Pendiente',
            cpr: relatedOFs.length > 0 ? (relatedOFs.every(of => of.estado === 'Validado') ? 'Completo' : 'En Progreso') : 'Pendiente',
            almacen: allMaterialOrders.filter(o => o.osId === osId).length > 0 ? 'En Progreso' : 'Pendiente'
        };

        const duration = differenceInDays(new Date(serviceOrder.endDate), new Date(serviceOrder.startDate)) + 1;

        return {
            facturacionNeta,
            costeTotal,
            briefingItemsCount: gastronomicServices,
            pruebasMenuCount: tastingMenus,
            rentabilidadEstimada: rentabilidad,
            rentabilidadPct: rentabilidadPorcentaje,
            eventStatus: status,
            durationDays: duration
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
        <div className="space-y-6">
             <div className="flex justify-between items-center text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-md">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">Comercial:</span>
                        <span>{serviceOrder.comercial}</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <span className="font-semibold">Metre:</span>
                        <span>{serviceOrder.respMetre || '-'}</span>
                    </div>
                </div>
                 <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4"/>
                        <span className="font-semibold">{format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')} - {format(new Date(serviceOrder.endDate), 'dd/MM/yyyy')}</span>
                        <Badge>{durationDays} {durationDays > 1 ? 'días' : 'día'}</Badge>
                    </div>
                    <BriefingSummaryDialog osId={osId} />
                </div>
            </div>

             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <h3 className="text-xl font-semibold mb-3">Estado del Evento</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatusCard title="Comercial" status={eventStatus.comercial} description="Briefing y servicios definidos."/>
                    <StatusCard title="Gastronomía" status={eventStatus.gastronomia} description="Menús y recetas seleccionados."/>
                    <StatusCard title="Producción (CPR)" status={eventStatus.cpr} description="Órdenes de Fabricación generadas."/>
                    <StatusCard title="Logística (Almacén)" status={eventStatus.almacen} description="Picking de material y bodega."/>
                </div>
            </div>

            <div>
                <h3 className="text-xl font-semibold mb-3">Módulos Principales</h3>
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

