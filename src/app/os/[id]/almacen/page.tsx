

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Users, Soup, Eye, ChevronDown, Save, Loader2, Trash2, FileText } from 'lucide-react';
import type { MaterialOrder, OrderItem, PickingSheet, ComercialBriefing, ComercialBriefingItem, ReturnSheet } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useOsContext } from '../os-context';

type ItemWithOrderInfo = OrderItem & {
  orderContract: string;
  orderId: string;
  orderStatus?: PickingSheet['status'];
  solicita?: 'Sala' | 'Cocina';
  tipo?: string;
  deliveryDate?: string;
  ajustes?: { tipo: string; cantidad: number; fecha: string; comentario: string; }[];
};

type BlockedOrderInfo = {
    sheetId: string;
    status: PickingSheet['status'];
    items: OrderItem[];
};

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo';

const statusMap: Record<PickingSheet['status'], StatusColumn> = {
    'Pendiente': 'En Preparación',
    'En Proceso': 'En Preparación',
    'Listo': 'Listo',
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
                <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Resumen de Briefing</Button>
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

function StatusCard({ title, items, totalQuantity, totalValue, onClick }: { title: string, items: number, totalQuantity: number, totalValue: number, onClick: () => void }) {
    return (
        <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={onClick}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{items} <span className="text-sm font-normal text-muted-foreground">refs.</span></p>
                <p className="text-xs text-muted-foreground">{totalQuantity.toLocaleString('es-ES')} artículos | {formatCurrency(totalValue)}</p>
            </CardContent>
        </Card>
    )
}

export default function AlmacenPage() {
    const { osId, isLoading, allItems: contextItems } = useOsContext();
    const router = useRouter();
    const [activeModal, setActiveModal] = useState<StatusColumn | null>(null);

    const { allItems, blockedOrders, pendingItems, itemsByStatus, totalValoracionPendiente } = useMemo(() => {
        if (!contextItems) {
            return { allItems: [], blockedOrders: [], pendingItems: [], itemsByStatus: { Asignado: [], 'En Preparación': [], Listo: [] }, totalValoracionPendiente: 0 };
        }
        
        const relatedOrders = contextItems.materialOrders.filter(o => o.type === 'Almacen');
        const relatedPickingSheets = contextItems.pickingSheets.filter(sheet => sheet.osId === osId);
        
        const statusItems: Record<StatusColumn, ItemWithOrderInfo[]> = { Asignado: [], 'En Preparación': [], Listo: [] };
        const processedItemKeys = new Set<string>();
        const blocked: BlockedOrderInfo[] = [];

        relatedPickingSheets.forEach(sheet => {
            const targetStatus = statusMap[sheet.status];
            const sheetInfo: BlockedOrderInfo = { sheetId: sheet.id, status: sheet.status, items: [] };

            sheet.items.forEach(itemInSheet => {
                if (itemInSheet.type !== 'Almacen') return;
                
                const uniqueKey = `${itemInSheet.orderId}-${itemInSheet.itemCode}`;
                const orderRef = relatedOrders.find(o => o.id === itemInSheet.orderId);
                const originalItem = orderRef?.items.find(i => i.itemCode === itemInSheet.itemCode);

                if (!originalItem) return;

                const itemWithInfo: ItemWithOrderInfo = {
                    ...originalItem,
                    orderId: sheet.id, 
                    orderContract: orderRef?.contractNumber || 'N/A', 
                    orderStatus: sheet.status, 
                    solicita: orderRef?.solicita,
                };

                statusItems[targetStatus].push(itemWithInfo);
                sheetInfo.items.push(itemWithInfo);
                processedItemKeys.add(uniqueKey);
            });

            if (sheetInfo.items.length > 0) {
                blocked.push(sheetInfo);
            }
        });

        const all = relatedOrders.flatMap(order => 
            order.items.map(item => ({
                ...item, 
                orderId: order.id, 
                contractNumber: order.contractNumber, 
                solicita: order.solicita, 
                tipo: item.tipo, 
                deliveryDate: order.deliveryDate,
                ajustes: item.ajustes
            } as ItemWithOrderInfo))
        );
        
        const pending = all.filter(item => {
            const uniqueKey = `${item.orderId}-${item.itemCode}`;
            return !processedItemKeys.has(uniqueKey) && item.quantity > 0;
        });
        
        statusItems['Asignado'] = pending;

        const totalValoracionPendiente = pending.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        return { 
            allItems: all, 
            blockedOrders: blocked,
            pendingItems: pending,
            itemsByStatus: statusItems,
            totalValoracionPendiente
        };
    }, [osId, contextItems]);
    
    const renderStatusModal = (status: StatusColumn) => {
        const items = itemsByStatus[status];
        return (
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>Artículos en estado: {status}</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Solicita</TableHead><TableHead className="text-right">Cantidad</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {items.length > 0 ? items.map((item, index) => (
                                <TableRow key={`${item.itemCode}-${index}`}><TableCell>{item.description}</TableCell><TableCell>{item.solicita}</TableCell><TableCell className="text-right">{item.quantity}</TableCell></TableRow>
                            )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay artículos en este estado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        )
    }

    const renderSummaryModal = () => {
        const all = [...itemsByStatus.Asignado, ...itemsByStatus['En Preparación'], ...itemsByStatus.Listo];
        const totalValue = all.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return (
        <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Resumen de Artículos de Almacén</DialogTitle></DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Artículo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Cant. Cajas</TableHead>
                    <TableHead>Valoración</TableHead>
                    <TableHead>Estado</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {all.map((item, index) => {
                    const isBlocked = !itemsByStatus.Asignado.some(pi => pi.itemCode === item.itemCode && pi.orderId === item.orderId);
                    const cajas = item.unidadVenta && item.unidadVenta > 0 ? (item.quantity / item.unidadVenta).toFixed(2) : '-';
                    return (
                    <TableRow key={`${item.itemCode}-${index}`}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{cajas}</TableCell>
                        <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                        <TableCell><Badge variant={isBlocked ? 'destructive' : 'default'}>{isBlocked ? 'Bloqueado' : 'Pendiente'}</Badge></TableCell>
                    </TableRow>
                    )
                })}
                </TableBody>
            </Table>
            </div>
            <div className="flex justify-end font-bold text-lg p-4">
                Valoración Total: {formatCurrency(totalValue)}
            </div>
        </DialogContent>
        )
    }

    if (isLoading) {
        return <LoadingSkeleton title="Cargando Módulo de Almacén..." />;
    }

    return (
        <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={allItems.length === 0}><Eye className="mr-2 h-4 w-4" />Ver Resumen de Artículos</Button>
                    </DialogTrigger>
                    {renderSummaryModal()}
                </Dialog>
                <BriefingSummaryDialog osId={osId} />
            </div>
            <Button asChild>
            <Link href={`/pedidos?osId=${osId}&type=Almacen`}>
                <PlusCircle className="mr-2" />
                Nuevo Pedido de Almacén
            </Link>
            </Button>
        </div>
        
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                {(Object.keys(itemsByStatus) as StatusColumn[]).map(status => {
                    const items = itemsByStatus[status];
                    const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    return (
                    <StatusCard 
                        key={status}
                        title={status === 'Asignado' ? 'Asignado (Pendiente)' : status}
                        items={items.length}
                        totalQuantity={items.reduce((sum, item) => sum + item.quantity, 0)}
                        totalValue={totalValue}
                        onClick={() => setActiveModal(status)}
                    />
                )})}
            </div>
        
            <Card className="mb-6">
                <div className="flex items-center justify-between p-4">
                    <CardTitle className="text-lg">Gestión de Pedidos Pendientes</CardTitle>
                </div>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Artículo</TableHead>
                                    <TableHead>Solicita</TableHead>
                                    <TableHead>Fecha Entrega</TableHead>
                                    <TableHead className="w-32">Cantidad</TableHead>
                                    <TableHead>Valoración</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingItems.length > 0 ? pendingItems.sort((a,b) => (a.solicita || '').localeCompare(b.solicita || '')).map(item => (
                                    <TableRow key={item.itemCode + item.orderId}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell>{item.solicita}</TableCell>
                                        <TableCell>{item.deliveryDate ? format(new Date(item.deliveryDate), 'dd/MM/yyyy') : ''}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>{formatCurrency(item.quantity * item.price)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No hay pedidos pendientes.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Consulta de Pedidos en Preparación o Listos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Hoja Picking</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Contenido</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {blockedOrders.length > 0 ? blockedOrders.map(order => (
                                    <TableRow key={order.sheetId}>
                                        <TableCell>
                                            <Link href={`/almacen/picking/${order.sheetId}`} className="text-primary hover:underline">
                                                <Badge variant="secondary">{order.sheetId}</Badge>
                                            </Link>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                        <TableCell>{order.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">No hay pedidos en preparación o listos.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

        {activeModal && renderStatusModal(activeModal)}
        </Dialog>
    );
}

```
- src/app/os/[id]/layout.tsx:
    - Remplazar `<OsHeaderContent osId={osId} />` por `<OsHeaderContent osId={osId} allData={allData} isLoading={isLoading} />`.
    - Añadir una nueva `interface OsDataContextType`.
    - Añadir un nuevo `const OsContext`.
    - Añadir una nueva `export function OsContextProvider`.
    - Añadir una nueva `export function useOsContext`.
    - Actualizar `OSDetailsLayout`.

<file>
  <path>src/app/os/[id]/layout.tsx</path>
  <content><![CDATA[

'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { ServiceOrder, MaterialOrder, PickingSheet, ReturnSheet } from '@/types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectiveDisplay } from '@/components/os/objective-display';
import { Briefcase, Utensils, Wine, Leaf, Warehouse, Archive, Truck, Snowflake, Euro, FilePlus, Users, UserPlus, Flower2, ClipboardCheck, PanelLeft, Building, FileText, Star, Menu, ClipboardList, Calendar, LayoutDashboard, Phone, ChevronRight, FilePenLine } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';


type NavLink = {
    path: string;
    title: string;
    icon: LucideIcon;
    moduleName?: Parameters<typeof ObjectiveDisplay>[0]['moduleName'];
}

const navLinks: NavLink[] = [
    { path: 'info', title: 'Información OS', icon: FileText },
    { path: 'comercial', title: 'Comercial', icon: Briefcase },
    { path: 'gastronomia', title: 'Gastronomía', icon: Utensils, moduleName: 'gastronomia' },
    { path: 'bodega', title: 'Bebida', icon: Wine, moduleName: 'bodega' },
    { path: 'hielo', title: 'Hielo', icon: Snowflake, moduleName: 'hielo' },
    { path: 'bio', title: 'Bio (Consumibles)', icon: Leaf, moduleName: 'consumibles' },
    { path: 'almacen', title: 'Almacén', icon: Warehouse, moduleName: 'almacen' },
    { path: 'alquiler', title: 'Alquiler', icon: Archive, moduleName: 'alquiler' },
    { path: 'decoracion', title: 'Decoración', icon: Flower2, moduleName: 'decoracion' },
    { path: 'atipicos', title: 'Atípicos', icon: FilePlus, moduleName: 'atipicos' },
    { path: 'personal-mice', title: 'Personal MICE', icon: Users, moduleName: 'personalMice' },
    { path: 'personal-externo', title: 'Personal Externo', icon: UserPlus, moduleName: 'personalExterno' },
    { path: 'transporte', title: 'Transporte', icon: Truck, moduleName: 'transporte' },
    { path: 'prueba-menu', title: 'Prueba de Menu', icon: ClipboardCheck, moduleName: 'costePruebaMenu' },
    { path: 'cta-explotacion', title: 'Cta. Explotación', icon: Euro },
];

const getInitials = (name: string) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

interface OsDataContextType {
    osId: string;
    isLoading: boolean;
    allItems: {
        materialOrders: MaterialOrder[];
        pickingSheets: PickingSheet[];
        returnSheets: ReturnSheet[];
    } | null;
}

const OsContext = createContext<OsDataContextType | undefined>(undefined);

export function OsContextProvider({ osId, children }: { osId: string; children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [allItems, setAllItems] = useState<OsDataContextType['allItems']>(null);

    const loadData = useCallback(() => {
        setIsLoading(true);
        try {
            const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
            const allPickingSheets = Object.values(JSON.parse(localStorage.getItem('pickingSheets') || '{}')) as PickingSheet[];
            const allReturnSheets = Object.values(JSON.parse(localStorage.getItem('returnSheets') || '{}') as Record<string, ReturnSheet>);
            
            setAllItems({
                materialOrders: allMaterialOrders.filter(o => o.osId === osId),
                pickingSheets: allPickingSheets.filter(s => s.osId === osId),
                returnSheets: allReturnSheets.filter(s => s.osId === osId),
            });
        } catch (error) {
            console.error("Failed to load OS context data", error);
            setAllItems(null);
        } finally {
            setIsLoading(false);
        }
    }, [osId]);

    useEffect(() => {
        loadData();
        window.addEventListener('storage', loadData);
        return () => window.removeEventListener('storage', loadData);
    }, [loadData]);

    const value = { osId, isLoading, allItems };

    return <OsContext.Provider value={value}>{children}</OsContext.Provider>;
}

export function useOsContext() {
    const context = useContext(OsContext);
    if (!context) {
        throw new Error('useOsContext must be used within an OsContextProvider');
    }
    return context;
}

function OsHeaderContent({ osId, allData, isLoading }: { osId: string; allData: any; isLoading: boolean }) {
    const pathname = usePathname();
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [updateKey, setUpdateKey] = useState(Date.now());

    useEffect(() => {
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const currentOS = allServiceOrders.find(os => os.id === osId);
        setServiceOrder(currentOS || null);

        const handleStorageChange = () => {
            setUpdateKey(Date.now());
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [osId, updateKey]);
    
    const {currentModule, isSubPage} = useMemo(() => {
        const pathSegments = pathname.split('/').filter(Boolean); // e.g., ['os', '123', 'gastronomia', '456']
        const osIndex = pathSegments.indexOf('os');
        const moduleSegment = pathSegments[osIndex + 2];
        const subPageSegment = pathSegments[osIndex + 3];

        const module = navLinks.find(link => link.path === moduleSegment);
        
        if (module) {
            return { currentModule: module, isSubPage: !!subPageSegment };
        }

        if (moduleSegment === 'info' || !moduleSegment) {
            return { currentModule: { title: 'Información OS', icon: FileText, path: 'info'}, isSubPage: false};
        }

        return { currentModule: { title: 'Panel de Control', icon: LayoutDashboard, path: '' }, isSubPage: false };
    }, [pathname]);

    if (!serviceOrder) {
        return (
             <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-32" />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Skeleton className="h-6 w-36" />
                </div>
                 <div className="flex justify-between items-center text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md h-9">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-5 w-1/4" />
                </div>
             </div>
        );
    }
    
    const durationDays = serviceOrder.startDate && serviceOrder.endDate ? differenceInDays(new Date(serviceOrder.endDate), new Date(serviceOrder.startDate)) + 1 : 0;
    
    const responsables = [
        {label: 'Comercial', name: serviceOrder.comercial},
        {label: 'Metre', name: serviceOrder.respMetre},
        {label: 'PM', name: serviceOrder.respProjectManager},
        {label: 'Pase', name: serviceOrder.respPase},
    ].filter(r => r.name);

    return (
        <TooltipProvider>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Link href={`/os/${osId}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <ClipboardList className="h-5 w-5"/>
                        <span>{serviceOrder.serviceNumber}</span>
                    </Link>
                    {currentModule && (
                        <>
                         <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                         <Link href={`/os/${osId}/${currentModule.path}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                            <currentModule.icon className="h-5 w-5"/>
                            <span>{currentModule.title}</span>
                         </Link>
                        </>
                    )}
                    {isSubPage && (
                         <>
                             <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                             <span className="flex items-center gap-2 font-bold text-primary">
                                 <FilePenLine className="h-5 w-5"/>
                                 <span>Edición</span>
                             </span>
                         </>
                    )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {(currentModule?.moduleName) && <ObjectiveDisplay osId={osId} moduleName={currentModule.moduleName} updateKey={updateKey} />}
                  {serviceOrder.isVip && <Badge variant="default" className="bg-amber-400 text-black hover:bg-amber-500"><Star className="h-4 w-4 mr-1"/> VIP</Badge>}
                </div>
              </div>
               <div className="flex justify-between items-center text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md">
                    <div className="flex items-center gap-3">
                       {responsables.map(resp => (
                           <Tooltip key={resp.label}>
                                <TooltipTrigger className="flex items-center gap-2 cursor-default">
                                    <span className="font-semibold">{resp.label}:</span>
                                    <Avatar className="h-6 w-6 text-xs">
                                        <AvatarFallback>{getInitials(resp.name || '')}</AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{resp.name}</p>
                                </TooltipContent>
                            </Tooltip>
                       ))}
                    </div>
                    <div className="flex items-center gap-4">
                        {serviceOrder.startDate && serviceOrder.endDate && (
                            <div className="flex items-center gap-2 font-semibold">
                                <Calendar className="h-4 w-4"/>
                                <span>{format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')} - {format(new Date(serviceOrder.endDate), 'dd/MM/yyyy')}</span>
                                {durationDays > 0 && <Badge variant="outline">{durationDays} día{durationDays > 1 && 's'}</Badge>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

export default function OSDetailsLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const osId = params.id as string;
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const dashboardHref = `/os/${osId}`;

    return (
      <OsContextProvider osId={osId}>
        <div className="container mx-auto">
            <div className="sticky top-[56px] z-30 bg-background/95 backdrop-blur-sm py-2 border-b">
                <div className="flex items-center gap-4">
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline">
                                <Menu className="h-5 w-5 mr-2" />
                                Módulos
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[250px] sm:w-[280px] p-0">
                            <SheetHeader className="p-4 border-b">
                                <SheetTitle>Módulos de la OS</SheetTitle>
                            </SheetHeader>
                            <ScrollArea className="h-full p-4">
                                <nav className="grid items-start gap-1 pb-4">
                                    <Link href={dashboardHref} onClick={() => setIsSheetOpen(false)}>
                                        <span className={cn("group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname === `/os/${osId}` ? "bg-accent" : "transparent")}>
                                            <LayoutDashboard className="mr-2 h-4 w-4" />
                                            <span>Panel de Control</span>
                                        </span>
                                    </Link>
                                    {navLinks.map((item, index) => {
                                        const href = `/os/${osId}/${item.path}`;
                                        return (
                                            <Link key={index} href={href} onClick={() => setIsSheetOpen(false)}>
                                                <span className={cn("group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname.startsWith(href) ? "bg-accent" : "transparent")}>
                                                    <item.icon className="mr-2 h-4 w-4" />
                                                    <span>{item.title}</span>
                                                </span>
                                            </Link>
                                        )
                                    })}
                                </nav>
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                    <div className="flex-grow">
                        <OsHeaderContent osId={osId} allData={null} isLoading={false} />
                    </div>
                </div>
            </div>
            <main className="py-8">
                {children}
            </main>
        </div>
      </OsContextProvider>
    );
}

