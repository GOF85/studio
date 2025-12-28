

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, History, AlertTriangle, MessageSquare, Check, RotateCcw, Save, Minus, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type { ServiceOrder, ReturnSheet, MaterialOrder, OrderItem, ReturnItemState } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useEvento, useMaterialOrders, useReturnSheet, useUpdateReturnSheet } from '@/hooks/use-data-queries';

type ReturnSheetItem = OrderItem & { sentQuantity: number; returnedQuantity: number; orderId: string; type: MaterialOrder['type'] };
type ReturnIncidencia = { osId: string; osServiceNumber: string; item: ReturnSheetItem; comment: string; timestamp: string };

type StatCardProps = {
  title: string;
  itemCount: number;
  totalValue: number;
  progress: number;
};

function StatCard({ title, itemCount, totalValue, progress }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="py-2 px-3">
                <div className="flex justify-between items-baseline">
                    <CardTitle className="text-base">{title}</CardTitle>
                    <div className="font-bold text-lg">{itemCount} <span className="text-xs text-muted-foreground font-normal">refs.</span></div>
                </div>
                 <p className="text-xs text-muted-foreground text-right">{formatCurrency(totalValue)}</p>
            </CardHeader>
            <CardContent className="p-3 pt-0">
                 <Progress value={progress} />
            </CardContent>
        </Card>
    )
}

export default function RetornoSheetPage() {
    const [localSheet, setLocalSheet] = useState<ReturnSheet | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    
    const router = useRouter();
    const params = useParams() ?? {};
    const osId = (params.id as string) || '';
    const { toast } = useToast();

    const { data: os, isLoading: isLoadingOS } = useEvento(osId);
    const { data: materialOrders = [], isLoading: isLoadingOrders } = useMaterialOrders(osId);
    const { data: dbSheet, isLoading: isLoadingSheet } = useReturnSheet(osId);
    const updateMutation = useUpdateReturnSheet();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (dbSheet) {
            setLocalSheet(dbSheet);
        } else if (os && materialOrders.length > 0) {
            // Initialize from material orders if no sheet exists in DB
            const itemsFromOrders: (OrderItem & { sentQuantity: number; orderId: string; type: MaterialOrder['type']; })[] = [];
            const initialItemStates: Record<string, ReturnItemState> = {};
            
            materialOrders.forEach(order => {
                order.items.forEach(item => {
                    const isRental = order.type === 'Alquiler';
                    const isAlmacen = order.type === 'Almacen';
                    const isAutoReturn = isRental || isAlmacen;

                    const newItem = { ...item, sentQuantity: item.quantity, orderId: order.id, type: order.type };
                    itemsFromOrders.push(newItem);
                    const itemKey = `${order.id}_${item.itemCode}`;

                    initialItemStates[itemKey] = { 
                        returnedQuantity: isAutoReturn ? item.quantity : 0,
                    };
                });
            });

            setLocalSheet({
                id: osId,
                osId: osId,
                status: 'Pendiente',
                items: itemsFromOrders,
                itemStates: initialItemStates,
                os: os
            });
        }
    }, [dbSheet, os, materialOrders, osId]);

    const saveSheet = useCallback(async (sheetToSave: ReturnSheet) => {
        try {
            await updateMutation.mutateAsync(sheetToSave);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la hoja de retorno." });
        }
    }, [updateMutation, toast]);

    const updateItemState = (itemKey: string, updates: Partial<ReturnItemState>) => {
        if (!localSheet) return;
        const newStates = { ...localSheet.itemStates };
        const currentState = newStates[itemKey] || { returnedQuantity: 0 };
        newStates[itemKey] = { ...currentState, ...updates };

        const hasStarted = Object.values(newStates).some(state => state.isReviewed);
        const status = localSheet.status === 'Pendiente' && hasStarted ? 'Procesando' : localSheet.status;

        const updatedSheet = { ...localSheet, itemStates: newStates, status };
        setLocalSheet(updatedSheet);
        saveSheet(updatedSheet);
    };
    
    const handleAddIncidencia = (item: ReturnSheetItem, comment: string) => {
        if(!localSheet || !localSheet.os) return;
        const itemKey = `${item.orderId}_${item.itemCode}`;
        updateItemState(itemKey, { incidentComment: comment });
        toast({title: 'Incidencia Registrada', description: `Se ha registrado una incidencia para ${item.description}`});
    }

    const handleReset = () => {
        if (!os) return;
        
        const itemsFromOrders: (OrderItem & { sentQuantity: number; orderId: string; type: MaterialOrder['type']; })[] = [];
        const initialItemStates: Record<string, ReturnItemState> = {};
        
        materialOrders.forEach(order => {
            order.items.forEach(item => {
                const isRental = order.type === 'Alquiler';
                const isAlmacen = order.type === 'Almacen';
                const isAutoReturn = isRental || isAlmacen;

                const newItem = { ...item, sentQuantity: item.quantity, orderId: order.id, type: order.type };
                itemsFromOrders.push(newItem);
                const itemKey = `${order.id}_${item.itemCode}`;

                initialItemStates[itemKey] = { 
                    returnedQuantity: isAutoReturn ? item.quantity : 0,
                };
            });
        });

        const resetSheet = {
            id: osId,
            osId: osId,
            status: 'Pendiente' as const,
            items: itemsFromOrders,
            itemStates: initialItemStates,
            os: os
        };

        setLocalSheet(resetSheet);
        saveSheet(resetSheet);
        setShowResetConfirm(false);
        toast({ title: "Retorno Reiniciado", description: "Se ha restaurado el estado inicial del retorno." });
    }
    
    const handleComplete = () => {
        if (!localSheet) return;
        const finalizedSheet = { ...localSheet, status: 'Completado' as const };
        setLocalSheet(finalizedSheet);
        saveSheet(finalizedSheet);
        toast({ title: "Retorno Completado", description: "Se ha marcado el retorno como completado." });
    }
    
    const { groupedItems, stats } = useMemo(() => {
        if(!localSheet) return { groupedItems: {}, stats: {} };
        const consumptionList = localSheet.items.map(item => {
            const itemKey = `${item.orderId}_${item.itemCode}`;
            const state = localSheet.itemStates[itemKey] || { returnedQuantity: 0, isReviewed: false };
            const returnedQty = state.returnedQuantity;

            return {
                ...item,
                itemKey,
                returnedQuantity: returnedQty,
                consumed: Math.max(0, item.sentQuantity - returnedQty),
                surplus: Math.max(0, returnedQty - item.sentQuantity),
                hasIncident: !!state.incidentComment,
                isReviewed: state.isReviewed || false,
            }
        });
        
        const grouped = consumptionList.reduce((acc, item) => {
            const group = item.type || 'Varios';
            if (!acc[group]) acc[group] = [];
            acc[group].push(item);
            return acc;
        }, {} as Record<string, typeof consumptionList>);

        const calculatedStats: Record<string, { itemCount: number, totalValue: number, checkedCount: number, progress: number }> = {};
        Object.entries(grouped).forEach(([type, items]) => {
            const itemCount = items.length;
            const totalValue = items.reduce((sum: number, item: any) => sum + (item.price * item.sentQuantity), 0);
            const checkedCount = items.filter((i: any) => i.isReviewed).length;
            const progress = itemCount > 0 ? (checkedCount / itemCount) * 100 : 0;
            calculatedStats[type] = { itemCount, totalValue, checkedCount, progress };
        });

        return { groupedItems: grouped, stats: calculatedStats };

    }, [localSheet]);


    if (!isMounted || isLoadingOS || isLoadingOrders || isLoadingSheet || !localSheet || !localSheet.os) {
        return <LoadingSkeleton title="Cargando Hoja de Retorno..." />;
    }

    return (
        <TooltipProvider>
        <div>
            <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-base">{sheet.os.serviceNumber}</Badge>
                    <span className="text-lg font-semibold">{sheet.os.client}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setShowResetConfirm(true)}><RotateCcw className="mr-2"/>Reiniciar</Button>
                    <Button onClick={handleComplete} disabled={sheet.status === 'Completado'}><Check className="mr-2"/>Marcar como Completado</Button>
                 </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                 {Object.entries(stats).map(([type, statData]) => (
                    <StatCard 
                        key={type}
                        title={type}
                        itemCount={statData.itemCount}
                        totalValue={statData.totalValue}
                        progress={statData.progress}
                    />
                ))}
            </div>

            {Object.entries(groupedItems).map(([type, items]) => (
                <Card key={type} className="mb-4">
                    <CardHeader><CardTitle>{type}</CardTitle></CardHeader>
                    <CardContent>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-8"></TableHead>
                                        <TableHead>Artículo</TableHead>
                                        <TableHead className="text-center w-24">Enviado</TableHead>
                                        <TableHead className="w-52 text-center">Devuelto</TableHead>
                                        <TableHead className="w-24 text-center">Consumo / Merma</TableHead>
                                        <TableHead className="w-24 text-center">Excedente</TableHead>
                                        <TableHead className="text-center w-20">Revisado</TableHead>
                                        <TableHead className="text-right w-20">Incidencia</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map(item => {
                                        const isMismatch = item.sentQuantity !== item.returnedQuantity;
                                        const rowCn = cn(
                                            isMismatch && !item.hasIncident && "bg-amber-50/80",
                                            item.isReviewed && "bg-slate-100/60 opacity-60 hover:opacity-100"
                                        );
                                        // Tipar item explícitamente
                                        const typedItem = item as any;
                                        return (
                                        <TableRow key={typedItem.itemKey} className={rowCn}>
                                             <TableCell className="p-1">
                                                {item.isReviewed && <Check className="h-5 w-5 text-green-600" />}
                                            </TableCell>
                                            <TableCell className="font-medium p-2">{item.description}</TableCell>
                                            <TableCell className="text-center font-semibold p-2">{item.sentQuantity}</TableCell>
                                            <TableCell className="text-center p-1">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateItemState(item.itemKey, { returnedQuantity: Math.max(0, item.returnedQuantity - 1)})}><Minus className="h-4 w-4"/></Button>
                                                    <Input
                                                        id={`qty-${item.itemKey}`}
                                                        type="number"
                                                        value={item.returnedQuantity}
                                                        onChange={(e) => updateItemState(item.itemKey, { returnedQuantity: parseInt(e.target.value, 10) || 0 })}
                                                        className="w-16 mx-auto text-center h-8"
                                                    />
                                                     <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateItemState(item.itemKey, { returnedQuantity: item.returnedQuantity + 1})}><Plus className="h-4 w-4"/></Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className={cn("text-center font-bold p-2", item.consumed > 0 && "text-destructive")}>{item.consumed}</TableCell>
                                            <TableCell className={cn("text-center font-bold p-2", item.surplus > 0 && "text-green-600")}>{item.surplus}</TableCell>
                                            <TableCell className="text-center p-2">
                                                <Checkbox
                                                    checked={item.isReviewed}
                                                    onCheckedChange={(checked) => updateItemState(item.itemKey, { isReviewed: !!checked })}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right p-1">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className={cn("h-9 w-9 text-muted-foreground hover:text-amber-600", item.hasIncident && "text-amber-600")}>
                                                            <MessageSquare className="h-5 w-5"/>
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Registrar Incidencia: {item.description}</DialogTitle>
                                                            <DialogDescription>Describe el problema, como roturas, pérdidas, etc.</DialogDescription>
                                                        </DialogHeader>
                                                        <Textarea 
                                                            id={`comment-${item.itemKey}`}
                                                            defaultValue={sheet.itemStates[item.itemKey]?.incidentComment}
                                                            placeholder="Ej: Se devolvieron 3 copas rotas."
                                                            rows={4}
                                                            onBlur={(e) => handleAddIncidencia(item, e.target.value)}
                                                        />
                                                        <DialogFooter><DialogClose asChild><Button>Cerrar</Button></DialogClose></DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            ))}
             <div className="mt-6 flex justify-end">
                <Button onClick={handleComplete} disabled={sheet.status === 'Completado'} size="lg">
                    <Check className="mr-2" />
                    Marcar como Completado
                </Button>
            </div>
        </div>
        <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Reiniciar hoja de retorno?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción borrará todo el progreso actual de esta hoja de retorno y la restaurará a su estado inicial. Los datos no se podrán recuperar.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset} className="bg-destructive hover:bg-destructive/80">Sí, reiniciar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        </TooltipProvider>
    );
}
