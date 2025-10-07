
'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { addDays, startOfToday, isWithinInterval, startOfDay, endOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ClipboardList, Calendar as CalendarIcon, Factory, ChevronRight, ListChecks, Loader2, Warehouse, Users, Soup, AlertTriangle, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ServiceOrder, MaterialOrder, OrderItem, HieloOrder, PickingSheet, ReturnSheet } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

type NecesidadItem = OrderItem & { 
    osId: string; 
    serviceNumber: string; 
    deliverySpace: string; 
    deliveryLocation: string;
    solicitante?: 'Sala' | 'Cocina';
};
type NecesidadesPorTipo = {
    [key in 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler' | 'Hielo']: NecesidadItem[];
}
type OSConNecesidades = {
    os: ServiceOrder;
    necesidades: NecesidadesPorTipo;
    totalItems: number;
    solicitante?: 'Sala' | 'Cocina';
};
type NecesidadesPorDia = {
    fecha: string;
    ordenes: Record<string, OSConNecesidades>;
    totalItems: number;
}
type DashboardStats = {
    pickingPendiente: number;
    pickingEnProceso: number;
    incidenciasAbiertas: number;
    retornosPendientes: number;
};


export default function PlanificacionAlmacenPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfToday(),
        to: addDays(startOfToday(), 7),
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [necesidades, setNecesidades] = useState<NecesidadesPorDia[]>([]);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [dashboardStats, setDashboardStats] = useState<DashboardStats>({ pickingPendiente: 0, pickingEnProceso: 0, incidenciasAbiertas: 0, retornosPendientes: 0 });
    const { toast } = useToast();
    const router = useRouter();

    const calcularNecesidades = useCallback(() => {
        setIsLoading(true);
        setSelectedItems(new Set());

        if (!dateRange?.from) {
            toast({ variant: 'destructive', title: 'Error', description: 'Por favor, selecciona un rango de fechas.' });
            setIsLoading(false);
            return;
        }

        const toDate = dateRange.to || dateRange.from;

        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const osEnRango = allServiceOrders.filter(os => {
            try {
                const osDate = new Date(os.startDate);
                return os.status === 'Confirmado' && isWithinInterval(osDate, { start: startOfDay(dateRange.from!), end: endOfDay(toDate) });
            } catch (e) { return false; }
        });

        const osIdsEnRango = new Set(osEnRango.map(os => os.id));
        if (osIdsEnRango.size === 0) {
            setNecesidades([]);
            setIsLoading(false);
            return;
        }
        
        const osMap = new Map(osEnRango.map(os => [os.id, os]));

        const allMaterialOrders = (JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[]).filter(o => osIdsEnRango.has(o.osId));
        const allHieloOrders = (JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[]).filter(o => osIdsEnRango.has(o.osId));
        const allPickingSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}') as Record<string, PickingSheet>;

        // Create a set of items already in picking sheets for quick lookup
        const pickedItems = new Set<string>();
        Object.values(allPickingSheets).forEach(sheet => {
            sheet.items.forEach(item => {
                const key = `${sheet.osId}__${sheet.fechaNecesidad}__${item.itemCode}__${sheet.solicitante || 'general'}`;
                pickedItems.add(key);
            });
        });
        
        const necesidadesPorDia: { [key: string]: Record<string, OSConNecesidades> } = {};

        const processOrders = (orders: (MaterialOrder | HieloOrder)[]) => {
            orders.forEach(order => {
                const os = osMap.get(order.osId);
                if (!os) return;

                const solicitante = 'solicita' in order ? order.solicita : undefined;
                const deliveryDate = ('deliveryDate' in order && order.deliveryDate) ? order.deliveryDate : os.startDate;

                if (!deliveryDate) return;

                const dateKey = format(new Date(deliveryDate), 'yyyy-MM-dd');

                order.items.forEach(item => {
                    const itemKey = `${os.id}__${dateKey}__${item.itemCode}__${solicitante || 'general'}`;
                    if (pickedItems.has(itemKey)) {
                        return;
                    }

                    if (!necesidadesPorDia[dateKey]) {
                        necesidadesPorDia[dateKey] = {};
                    }
                    
                    const osKey = `${os.id}__${dateKey}__${solicitante || 'general'}`;

                    if (!necesidadesPorDia[dateKey][osKey]) {
                        necesidadesPorDia[dateKey][osKey] = { os, necesidades: { 'Almacen': [], 'Bodega': [], 'Bio': [], 'Alquiler': [], 'Hielo': [] }, totalItems: 0, solicitante };
                    }
                    
                    const osNecesidades = necesidadesPorDia[dateKey][osKey];
                    const orderType = 'type' in order ? order.type : 'Hielo';

                    if (orderType in osNecesidades.necesidades) {
                       osNecesidades.necesidades[orderType as keyof NecesidadesPorTipo].push({
                            ...item,
                            osId: os.id,
                            serviceNumber: os.serviceNumber,
                            deliverySpace: ('deliverySpace' in order && order.deliverySpace) ? order.deliverySpace : (os.space || ''),
                            deliveryLocation: ('deliveryLocation' in order && order.deliveryLocation) ? order.deliveryLocation : '',
                            solicitante: solicitante,
                        });
                        osNecesidades.totalItems++;
                    }
                });
            });
        };

        processOrders(allMaterialOrders);
        processOrders(allHieloOrders);
        
        const resultado: NecesidadesPorDia[] = Object.entries(necesidadesPorDia).map(([fecha, ordenes]) => ({
            fecha,
            ordenes,
            totalItems: Object.values(ordenes).reduce((sum, os) => sum + os.totalItems, 0)
        })).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        
        setNecesidades(resultado);
        setIsLoading(false);
    }, [dateRange, toast]);

    const calculateDashboardStats = useCallback(() => {
        const allSheets = Object.values(JSON.parse(localStorage.getItem('pickingSheets') || '{}')) as PickingSheet[];
        const allReturnSheets = Object.values(JSON.parse(localStorage.getItem('returnSheets') || '{}')) as ReturnSheet[];
        
        let pickingPendiente = 0;
        let pickingEnProceso = 0;
        let incidenciasAbiertas = 0;

        allSheets.forEach(sheet => {
            if (sheet.status === 'Pendiente') pickingPendiente++;
            if (sheet.status === 'En Proceso') pickingEnProceso++;
            if (sheet.itemStates) {
                const hasUnresolvedIncident = Object.values(sheet.itemStates).some(state => state.incidentComment && !state.resolved);
                if (hasUnresolvedIncident) incidenciasAbiertas++;
            }
        });

        const retornosPendientes = allReturnSheets.filter(sheet => sheet.status !== 'Completado').length;

        setDashboardStats({
            pickingPendiente,
            pickingEnProceso,
            incidenciasAbiertas,
            retornosPendientes
        });
    }, []);
    
    useEffect(() => {
        if(isMounted) {
            calcularNecesidades();
            calculateDashboardStats();
        }
    }, [isMounted, calcularNecesidades, calculateDashboardStats]);

    useEffect(() => {
        if(dateRange?.from && dateRange.to){
            calcularNecesidades();
        }
    }, [dateRange, calcularNecesidades]);

    useEffect(() => {
        setIsMounted(true);
    }, []);


    const handleSelectItem = (id: string) => {
        setSelectedItems(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(id)) {
                newSelection.delete(id);
            } else {
                newSelection.add(id);
            }
            return newSelection;
        });
    }

    const handleSelectOS = (osKey: string, fecha: string) => {
        const osData = necesidades.find(d => d.fecha === fecha)?.ordenes[osKey];
        if (!osData) return;
    
        const osItemIds: string[] = [];
        Object.entries(osData.necesidades).forEach(([tipo, items]) => {
            items.forEach(item => {
                osItemIds.push(`${item.itemCode}__${osData.os.id}__${fecha}__${tipo}__${item.solicitante || 'general'}`);
            });
        });
    
        setSelectedItems(prev => {
            const newSelection = new Set(prev);
            const allSelected = osItemIds.every(id => newSelection.has(id));
            osItemIds.forEach(id => {
                if (allSelected) {
                    newSelection.delete(id);
                } else {
                    newSelection.add(id);
                }
            });
            return newSelection;
        });
    };
    
    const getOsSelectionState = (osKey: string, fecha: string): boolean | 'indeterminate' => {
        const osData = necesidades.find(d => d.fecha === fecha)?.ordenes[osKey];
        if (!osData || osData.totalItems === 0) return false;
    
        let osItemIds: string[] = [];
        Object.keys(osData.necesidades).forEach((tipo) => {
             osData.necesidades[tipo as keyof NecesidadesPorTipo].forEach(item => {
                 osItemIds.push(`${item.itemCode}__${osData.os.id}__${fecha}__${tipo}__${item.solicitante || 'general'}`);
             })
        });

        const selectedCount = osItemIds.filter(id => selectedItems.has(id)).length;
    
        if (selectedCount === 0) return false;
        if (selectedCount === osItemIds.length) return true;
        return 'indeterminate';
    };
    
    const numSheetsToGenerate = useMemo(() => {
        const sheetsKeys = new Set<string>();
        selectedItems.forEach(id => {
            const [itemCode, osId, fecha, tipo, solicitante] = id.split('__');
            sheetsKeys.add(`${osId}__${fecha}__${solicitante || 'general'}`);
        });
        return sheetsKeys.size;
    }, [selectedItems]);


    const handleGeneratePicking = () => {
        if (selectedItems.size === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Selecciona al menos un artículo para generar una hoja de picking.' });
            return;
        }

        const allSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}') as Record<string, PickingSheet>;
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const itemsToProcess = Array.from(selectedItems);
        
        const sheetsToGenerate: Record<string, {osId: string, fechaNecesidad: string, items: any[], solicitante?: 'Sala' | 'Cocina'}> = {};

        itemsToProcess.forEach(itemId => {
            const [itemCode, osId, fecha, tipo, solicitanteStr] = itemId.split('__');
            const solicitante = solicitanteStr === 'Sala' || solicitanteStr === 'Cocina' ? solicitanteStr : undefined;
            const sheetKey = `${osId}__${fecha}__${solicitante || 'general'}`; 

            if (!sheetsToGenerate[sheetKey]) {
                sheetsToGenerate[sheetKey] = { osId, fechaNecesidad: fecha, items: [], solicitante };
            }

            const necesidadDia = necesidades.find(n => n.fecha === fecha);
            const osKey = `${osId}__${fecha}__${solicitante || 'general'}`;
            const osData = necesidadDia?.ordenes[osKey];
            const itemData = osData?.necesidades[tipo as keyof NecesidadesPorTipo]?.find(i => i.itemCode === itemCode && i.osId === osId);

            if (itemData) {
                 sheetsToGenerate[sheetKey].items.push({...itemData, type: tipo});
            }
        });
        
        Object.values(sheetsToGenerate).forEach(sheetData => {
            const os = allServiceOrders.find(o => o.id === sheetData.osId);
            if (!os) return;

            const baseId = os.serviceNumber.slice(-5);
            const dateSuffix = Object.keys(allSheets).filter(k => k.startsWith(`${baseId}.`)).length + 1;
            const sheetId = `${baseId}.${dateSuffix.toString().padStart(2, '0')}`;
            
            allSheets[sheetId] = {
                id: sheetId,
                osId: sheetData.osId,
                fechaNecesidad: sheetData.fechaNecesidad,
                items: sheetData.items,
                status: 'Pendiente',
                solicitante: sheetData.solicitante
            };
        })

        localStorage.setItem('pickingSheets', JSON.stringify(allSheets));
        
        toast({ title: "Hojas de Picking Generadas", description: `Se han creado o actualizado ${Object.keys(sheetsToGenerate).length} hojas de picking.` });
        router.push('/almacen/picking');
    }

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Planificación de Almacen..." />;
    }

    const statsCards = [
        { title: 'Hojas de Picking Pendientes', value: dashboardStats.pickingPendiente, icon: ListChecks, color: 'text-yellow-500', href: '/almacen/picking' },
        { title: 'Hojas en Proceso', value: dashboardStats.pickingEnProceso, icon: Factory, color: 'text-blue-500', href: '/almacen/picking' },
        { title: 'Incidencias Abiertas', value: dashboardStats.incidenciasAbiertas, icon: AlertTriangle, color: 'text-red-500', href: '/almacen/incidencias' },
        { title: 'Retornos Pendientes', value: dashboardStats.retornosPendientes, icon: History, color: 'text-indigo-500', href: '/almacen/retornos' },
    ];


    return (
        <div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                {statsCards.map(card => (
                    <Link href={card.href} key={card.title}>
                        <Card className="hover:bg-accent transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <card.icon className={cn("h-4 w-4", card.color)} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                        </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                    <ClipboardList /> Planificación de Necesidades
                </h1>
                <div className="flex items-center gap-4">
                     <Button onClick={handleGeneratePicking} disabled={numSheetsToGenerate === 0}>
                        <ListChecks className="mr-2"/> Generar Hoja de Picking ({numSheetsToGenerate})
                     </Button>
                </div>
            </div>

            <div className="flex items-center gap-4 mb-6 p-4 border rounded-lg bg-card">
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Elige un rango de fechas</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.from && range.to){ setIsDatePickerOpen(false) }}} numberOfMonths={2} locale={es} />
                    </PopoverContent>
                </Popover>
            </div>

            {isLoading ? <div className="flex justify-center items-center h-48"><Loader2 className="mx-auto animate-spin text-primary" size={48} /></div>
            : necesidades.length > 0 ? (
                <Accordion type="multiple" defaultValue={necesidades.map(n => n.fecha)} className="w-full space-y-4">
                    {necesidades.map(({ fecha, ordenes, totalItems }) => (
                         <AccordionItem value={fecha} key={fecha} className="border-none">
                            <Card>
                                <AccordionTrigger className="p-4 hover:no-underline rounded-lg">
                                    <div className="flex items-center gap-3 w-full">
                                        <CalendarIcon className="h-6 w-6"/>
                                        <div className="text-left">
                                            <h3 className="text-xl font-bold capitalize">{format(new Date(fecha), 'EEEE, d \'de\' MMMM', {locale: es})}</h3>
                                            <p className="text-sm text-muted-foreground">{totalItems} artículos en total para este día</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="border-t">
                                    <div className="p-4 space-y-3">
                                    {Object.entries(ordenes).sort(([, a], [, b]) => a.os.serviceNumber.localeCompare(b.os.serviceNumber)).map(([osKey, {os, necesidades: necesidadesOs, solicitante}]) => (
                                        <Collapsible key={osKey} className="border rounded-lg">
                                            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-t-lg">
                                                <Checkbox
                                                    checked={getOsSelectionState(osKey, fecha)}
                                                    onCheckedChange={() => handleSelectOS(osKey, fecha)}
                                                    aria-label={`Seleccionar todos los artículos para OS ${os.serviceNumber}`}
                                                />
                                                <CollapsibleTrigger className="flex-grow flex items-center justify-between group">
                                                    <div className="text-left">
                                                        <div className="flex items-center gap-3">
                                                            <p className="font-bold">{os.serviceNumber} - {os.client}</p>
                                                            {solicitante && <Badge variant={solicitante === 'Sala' ? 'default' : 'outline'} className={solicitante === 'Sala' ? 'bg-blue-600' : 'bg-orange-500'}>{solicitante === 'Sala' ? <Users size={12} className="mr-1.5"/> : <Soup size={12} className="mr-1.5"/>}{solicitante}</Badge>}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">{os.space}</p>
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-90"/>
                                                </CollapsibleTrigger>
                                            </div>
                                            <CollapsibleContent className="p-3">
                                                 {(Object.keys(necesidadesOs) as Array<keyof NecesidadesPorTipo>).map(tipo => {
                                                    const items = necesidadesOs[tipo];
                                                    if (items.length === 0) return null;
                                                    return (
                                                        <div key={tipo} className="mb-2 last:mb-0">
                                                            <h4 className="font-semibold mb-1 text-sm">{tipo}</h4>
                                                            <div className="border rounded-md">
                                                                <Table>
                                                                    <TableHeader><TableRow><TableHead className="w-8"></TableHead><TableHead>Artículo</TableHead><TableHead>Cantidad</TableHead></TableRow></TableHeader>
                                                                    <TableBody>
                                                                        {items.map((item) => {
                                                                            const itemId = `${item.itemCode}__${item.osId}__${fecha}__${tipo}__${item.solicitante || 'general'}`;
                                                                            return (
                                                                            <TableRow key={itemId}>
                                                                                <TableCell><Checkbox onCheckedChange={() => handleSelectItem(itemId)} checked={selectedItems.has(itemId)} aria-label={`Seleccionar ${item.description}`} /></TableCell>
                                                                                <TableCell>{item.description}</TableCell>
                                                                                <TableCell>{item.quantity}</TableCell>
                                                                            </TableRow>
                                                                        )})}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </CollapsibleContent>
                                        </Collapsible>
                                    ))}
                                    </div>
                                </AccordionContent>
                            </Card>
                         </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Warehouse className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Sin Necesidades</h3>
                        <p className="mt-1 text-sm text-muted-foreground">No hay pedidos de material para el rango de fechas seleccionado.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
    
    

    
