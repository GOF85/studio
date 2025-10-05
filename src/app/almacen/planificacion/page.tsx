
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { addDays, startOfToday, isWithinInterval, startOfDay, endOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ClipboardList, Calendar as CalendarIcon, Factory, ChevronDown, ListChecks, Loader2, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ServiceOrder, MaterialOrder, OrderItem, HieloOrder } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

type NecesidadItem = OrderItem & { osId: string; serviceNumber: string; deliverySpace: string; deliveryLocation: string };
type NecesidadesPorTipo = {
    [key in 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler' | 'Hielo']: NecesidadItem[];
}
type NecesidadesPorDia = {
    fecha: string;
    necesidades: NecesidadesPorTipo;
    totalItems: number;
}

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
    const { toast } = useToast();
    const router = useRouter();

    const calcularNecesidades = useCallback(() => {
        setIsLoading(true);

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
        const osMap = new Map(osEnRango.map(os => [os.id, os]));

        const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
        const allHieloOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
        
        const necesidadesPorDia: { [key: string]: NecesidadesPorTipo } = {};

        const processOrders = (orders: (MaterialOrder | HieloOrder)[]) => {
            orders.forEach(order => {
                if (osIdsEnRango.has(order.osId)) {
                    const deliveryDate = order.deliveryDate || osMap.get(order.osId)?.startDate;
                    if (!deliveryDate) return;

                    const dateKey = format(new Date(deliveryDate), 'yyyy-MM-dd');
                    if (!necesidadesPorDia[dateKey]) {
                        necesidadesPorDia[dateKey] = { 'Almacen': [], 'Bodega': [], 'Bio': [], 'Alquiler': [], 'Hielo': [] };
                    }
                    
                    const os = osMap.get(order.osId)!;

                    order.items.forEach(item => {
                        const orderType = (order as MaterialOrder).type || 'Hielo';
                        necesidadesPorDia[dateKey][orderType].push({
                            ...item,
                            osId: os.id,
                            serviceNumber: os.serviceNumber,
                            deliverySpace: order.deliverySpace || os.space,
                            deliveryLocation: order.deliveryLocation || ''
                        });
                    });
                }
            });
        };

        processOrders(allMaterialOrders);
        processOrders(allHieloOrders);
        
        const resultado: NecesidadesPorDia[] = Object.entries(necesidadesPorDia).map(([fecha, necesidades]) => ({
            fecha,
            necesidades,
            totalItems: Object.values(necesidades).flat().length
        })).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

        setNecesidades(resultado);
        setIsLoading(false);
    }, [dateRange, toast]);

    useEffect(() => {
        setIsMounted(true);
        calcularNecesidades();
    }, [calcularNecesidades]);

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

    const handleGeneratePicking = () => {
        if (selectedItems.size === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Selecciona al menos un artículo para generar una hoja de picking.' });
            return;
        }

        const allSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}');
        const itemsToProcess = Array.from(selectedItems);
        
        const sheetsToGenerate: Record<string, {osId: string, fechaNecesidad: string, items: any[]}> = {};

        itemsToProcess.forEach(itemId => {
            const [itemCode, osId, fecha, tipo] = itemId.split('__');
            const sheetKey = `${osId}-${fecha}`;

            if (!sheetsToGenerate[sheetKey]) {
                sheetsToGenerate[sheetKey] = { osId, fechaNecesidad: fecha, items: [] };
            }

            const necesidadDia = necesidades.find(n => n.fecha === fecha);
            const itemData = necesidadDia?.necesidades[tipo as keyof NecesidadesPorTipo]?.find(i => i.itemCode === itemCode && i.osId === osId);

            if (itemData) {
                 sheetsToGenerate[sheetKey].items.push({...itemData, type: tipo});
            }
        });
        
        Object.values(sheetsToGenerate).forEach(sheet => {
            const sheetKey = `${sheet.osId}-${sheet.fechaNecesidad}`;
            allSheets[sheetKey] = {
                id: sheetKey,
                osId: sheet.osId,
                fechaNecesidad: sheet.fechaNecesidad,
                items: sheet.items,
                status: 'Pendiente',
            };
        })

        localStorage.setItem('pickingSheets', JSON.stringify(allSheets));
        
        toast({ title: "Hojas de Picking Generadas", description: `Se han creado o actualizado ${Object.keys(sheetsToGenerate).length} hojas de picking.` });
        router.push('/almacen/picking');
    }

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Planificación de Almacen..." />;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                    <ClipboardList /> Planificación de Necesidades
                </h1>
                <div className="flex items-center gap-4">
                     <Button onClick={handleGeneratePicking} disabled={selectedItems.size === 0}>
                        <ListChecks className="mr-2"/> Generar Hoja de Picking ({selectedItems.size})
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
                <Button onClick={calcularNecesidades} disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin mr-2"/> : <CalendarIcon className="mr-2" />}
                    {isLoading ? 'Calculando...' : 'Calcular Necesidades'}
                </Button>
            </div>

            {isLoading ? <div className="flex justify-center items-center h-48"><Loader2 className="mx-auto animate-spin text-primary" size={48} /></div>
            : necesidades.length > 0 ? (
                <Accordion type="multiple" defaultValue={necesidades.map(n => n.fecha)} className="w-full space-y-4">
                    {necesidades.map(({ fecha, necesidades: necesidadesDelDia, totalItems }) => (
                         <AccordionItem value={fecha} key={fecha}>
                            <Card>
                                <AccordionTrigger className="p-4 hover:no-underline">
                                    <div className="flex items-center gap-3 w-full">
                                        <CalendarIcon className="h-6 w-6"/>
                                        <div className="text-left">
                                            <h3 className="text-xl font-bold capitalize">{format(new Date(fecha), 'EEEE, d \'de\' MMMM', {locale: es})}</h3>
                                            <p className="text-sm text-muted-foreground">{totalItems} artículos en total para este día</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="px-4 pb-4 space-y-4 border-t pt-4">
                                       {(Object.keys(necesidadesDelDia) as Array<keyof NecesidadesPorTipo>).map(tipo => {
                                            const items = necesidadesDelDia[tipo];
                                            if (items.length === 0) return null;
                                            return (
                                                 <div key={tipo}>
                                                    <h4 className="font-semibold mb-2">{tipo}</h4>
                                                    <div className="border rounded-md">
                                                        <Table>
                                                            <TableHeader><TableRow><TableHead className="w-8"></TableHead><TableHead>Artículo</TableHead><TableHead>Cantidad</TableHead><TableHead>OS</TableHead><TableHead>Lugar</TableHead></TableRow></TableHeader>
                                                            <TableBody>
                                                                {items.map((item, index) => {
                                                                    const itemId = `${item.itemCode}__${item.osId}__${fecha}__${tipo}`;
                                                                    return (
                                                                    <TableRow key={itemId}>
                                                                        <TableCell><Checkbox onCheckedChange={() => handleSelectItem(itemId)} checked={selectedItems.has(itemId)} /></TableCell>
                                                                        <TableCell>{item.description}</TableCell>
                                                                        <TableCell>{item.quantity}</TableCell>
                                                                        <TableCell>{item.serviceNumber}</TableCell>
                                                                        <TableCell>{item.deliverySpace} {item.deliveryLocation && `(${item.deliveryLocation})`}</TableCell>
                                                                    </TableRow>
                                                                )})}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                 </div>
                                            )
                                       })}
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
