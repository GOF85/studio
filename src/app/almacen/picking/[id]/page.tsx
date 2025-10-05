
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ListChecks, Calendar as CalendarIcon, User, Building } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type { PickingSheet, OrderItem, ServiceOrder } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ItemParaPicking = OrderItem & {
    orderType: string;
};

export default function PickingSheetPage() {
    const [sheet, setSheet] = useState<PickingSheet | null>(null);
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const osId = params.id as string;
    const fecha = searchParams.get('fecha');
    const { toast } = useToast();

    const sheetId = `${osId}-${fecha}`;

    const loadSheet = useCallback(() => {
        const allSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}') as Record<string, PickingSheet>;
        const currentSheet = allSheets[sheetId];
        
        if (currentSheet) {
            setSheet(currentSheet);
            setCheckedItems(new Set(currentSheet.checkedItems || []));
            const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
            const currentOS = allServiceOrders.find(os => os.id === currentSheet.osId);
            setServiceOrder(currentOS || null);
        } else {
            toast({ variant: "destructive", title: "Error", description: "Hoja de picking no encontrada."});
            router.push('/almacen/picking');
        }
        setIsMounted(true);
    }, [sheetId, router, toast]);

    useEffect(() => {
        loadSheet();
    }, [loadSheet]);
    
    const saveProgress = (newCheckedItems: Set<string>, newStatus?: PickingSheet['status']) => {
        if(!sheet) return;
        
        const allSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}');
        const currentStatus = sheet.status;
        let statusToSave = newStatus || currentStatus;

        if (!newStatus) {
            if (newCheckedItems.size === 0 && currentStatus !== 'Pendiente') {
                statusToSave = 'Pendiente';
            } else if (newCheckedItems.size > 0 && newCheckedItems.size < sheet.items.length && currentStatus !== 'En Proceso') {
                statusToSave = 'En Proceso';
            } else if (newCheckedItems.size === sheet.items.length && currentStatus !== 'Listo') {
                statusToSave = 'Listo';
            }
        }

        const updatedSheet = {
            ...sheet,
            checkedItems: Array.from(newCheckedItems),
            status: statusToSave
        };
        allSheets[sheetId] = updatedSheet;
        localStorage.setItem('pickingSheets', JSON.stringify(allSheets));
        setSheet(updatedSheet); // Update local state
    }

    const handleCheckItem = (itemCode: string, checked: boolean) => {
        const newCheckedItems = new Set(checkedItems);
        if (checked) {
            newCheckedItems.add(itemCode);
        } else {
            newCheckedItems.delete(itemCode);
        }
        setCheckedItems(newCheckedItems);
        saveProgress(newCheckedItems);
    }
    
    const { progress, totalItems, checkedCount } = useMemo(() => {
        if (!sheet) return { progress: 0, totalItems: 0, checkedCount: 0 };
        const total = sheet.items.length;
        const checked = checkedItems.size;
        return {
            progress: total > 0 ? (checked / total) * 100 : 0,
            totalItems: total,
            checkedCount: checked,
        };
    }, [sheet, checkedItems]);

    const groupedItems = useMemo(() => {
        if (!sheet) return {};
        return sheet.items.reduce((acc, item) => {
            const group = item.type || 'Varios';
            if (!acc[group]) acc[group] = [];
            acc[group].push(item);
            return acc;
        }, {} as Record<string, OrderItem[]>);
    }, [sheet]);


    if (!isMounted || !sheet || !serviceOrder) {
        return <LoadingSkeleton title="Cargando Hoja de Picking..." />;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/almacen/picking')} className="mb-2">
                        <ArrowLeft className="mr-2" /> Volver al listado
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <ListChecks /> Hoja de Picking
                    </h1>
                </div>
            </div>
            
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                             <CardTitle>Servicio: {serviceOrder.serviceNumber}</CardTitle>
                             <CardDescription>
                                {serviceOrder.client} {serviceOrder.finalClient && `- ${serviceOrder.finalClient}`}
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-base">{format(new Date(sheet.fechaNecesidad), 'PPP', { locale: es })}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2"><Building className="h-4 w-4"/> <strong>Espacio:</strong> {serviceOrder.space || '-'}</div>
                    <div className="flex items-center gap-2"><User className="h-4 w-4"/> <strong>Contacto:</strong> {serviceOrder.contact || '-'}</div>
                    <div className="flex items-center gap-2"><User className="h-4 w-4"/> <strong>Metre:</strong> {serviceOrder.respMetre || '-'}</div>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-base">Progreso del Picking</CardTitle>
                </CardHeader>
                <CardContent>
                    <Progress value={progress} className="w-full h-4" />
                    <p className="text-sm text-muted-foreground mt-2 text-center">{checkedCount} de {totalItems} tipos de artículo recogidos ({progress.toFixed(0)}%)</p>
                </CardContent>
            </Card>

            <div className="space-y-4">
            {Object.entries(groupedItems).map(([type, items]) => (
                <Card key={type}>
                    <CardHeader><CardTitle>{type}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {items.map(item => (
                            <div key={item.itemCode} className={cn("flex items-center gap-4 p-3 border rounded-md transition-colors", checkedItems.has(item.itemCode) ? "bg-green-50" : "bg-background")}>
                                <Checkbox 
                                    id={`item-${item.itemCode}`}
                                    className="h-8 w-8"
                                    checked={checkedItems.has(item.itemCode)}
                                    onCheckedChange={(checked) => handleCheckItem(item.itemCode, Boolean(checked))}
                                />
                                <Label htmlFor={`item-${item.itemCode}`} className="flex-grow cursor-pointer">
                                    <p className="font-bold text-lg">{item.description}</p>
                                    <p className="text-sm text-muted-foreground">Código: {item.itemCode}</p>
                                </Label>
                                <div className="text-2xl font-bold text-primary w-24 text-right">
                                    x{item.quantity}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}
            </div>
        </div>
    );
}
