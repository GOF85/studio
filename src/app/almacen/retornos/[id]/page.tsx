
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, History, AlertTriangle, MessageSquare, Check, RotateCcw, Save } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// We need to include the original order ID to trace back and update it.
type ReturnSheetItem = OrderItem & { sentQuantity: number; orderId: string };

export default function RetornoSheetPage() {
    const [sheet, setSheet] = useState<ReturnSheet | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showMermaConfirm, setShowMermaConfirm] = useState(false);

    const router = useRouter();
    const params = useParams();
    const osId = params.id as string;
    const { toast } = useToast();

    const loadSheet = useCallback(() => {
        const allSheets = JSON.parse(localStorage.getItem('returnSheets') || '{}') as Record<string, ReturnSheet>;
        let currentSheet = allSheets[osId];

        if (!currentSheet) {
            const allMaterialOrders: MaterialOrder[] = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
            const osOrders = allMaterialOrders.filter(o => o.osId === osId);
            
            const itemsFromOrders: ReturnSheetItem[] = [];
            const initialItemStates: Record<string, ReturnItemState> = {};
            
            osOrders.forEach(order => {
                order.items.forEach(item => {
                    const newItem: ReturnSheetItem = { ...item, sentQuantity: item.quantity, orderId: order.id };
                    itemsFromOrders.push(newItem);
                    const itemKey = `${order.id}_${item.itemCode}`;
                    initialItemStates[itemKey] = { returnedQuantity: item.quantity };
                });
            });
            
            const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
            const os = allServiceOrders.find(o => o.id === osId);

            currentSheet = {
                id: osId,
                osId: osId,
                status: 'Pendiente',
                items: itemsFromOrders,
                itemStates: initialItemStates,
                os: os,
            };
            
            allSheets[osId] = currentSheet;
            localStorage.setItem('returnSheets', JSON.stringify(allSheets));
        }
        
        setSheet(currentSheet);
        setIsMounted(true);
    }, [osId]);

    useEffect(() => {
        loadSheet();
    }, [loadSheet]);
    
    const saveSheet = useCallback((newSheetData: Partial<ReturnSheet>) => {
        if (!sheet) return;
        
        const updatedSheet: ReturnSheet = { ...sheet, ...newSheetData };
        const allSheets = JSON.parse(localStorage.getItem('returnSheets') || '{}');
        allSheets[osId] = updatedSheet;
        localStorage.setItem('returnSheets', JSON.stringify(allSheets));
        
        setSheet(updatedSheet);
    }, [sheet, osId]);

    const updateItemState = (itemKey: string, updates: Partial<ReturnItemState>) => {
        if (!sheet) return;
        const newStates = { ...sheet.itemStates };
        const currentState = newStates[itemKey] || { returnedQuantity: 0 };
        newStates[itemKey] = { ...currentState, ...updates };

        const hasStarted = Object.values(newStates).some(state => state.returnedQuantity !== undefined);
        const status = sheet.status === 'Pendiente' && hasStarted ? 'Procesando' : sheet.status;

        saveSheet({ itemStates: newStates, status });
    };

    const handleAcceptMerma = () => {
        if (!sheet) return;
        let allMaterialOrders: MaterialOrder[] = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
        let updated = false;

        Object.entries(sheet.itemStates).forEach(([itemKey, state]) => {
            const [orderId, itemCode] = itemKey.split('_');
            const originalItem = sheet.items.find(i => i.orderId === orderId && i.itemCode === itemCode);
            
            if (originalItem && originalItem.sentQuantity !== state.returnedQuantity) {
                const orderIndex = allMaterialOrders.findIndex(o => o.id === orderId);
                if (orderIndex > -1) {
                    const orderToUpdate = allMaterialOrders[orderIndex];
                    const itemIndex = orderToUpdate.items.findIndex(i => i.itemCode === itemCode);
                    if (itemIndex > -1) {
                        // Update the quantity in the original order
                        orderToUpdate.items[itemIndex].quantity = state.returnedQuantity;
                        
                        // Recalculate total for the order
                        orderToUpdate.total = orderToUpdate.items.reduce((sum, current) => sum + (current.price * current.quantity), 0);

                         if (state.returnedQuantity === 0) {
                            orderToUpdate.items.splice(itemIndex, 1);
                        }

                        allMaterialOrders[orderIndex] = orderToUpdate;
                        updated = true;
                    }
                }
            }
        });
        
        if (updated) {
            localStorage.setItem('materialOrders', JSON.stringify(allMaterialOrders));
            toast({ title: "Pedidos Ajustados", description: "Las cantidades de los pedidos originales se han actualizado para reflejar la merma." });
        } else {
            toast({ title: "Sin cambios", description: "No se encontraron discrepancias para ajustar." });
        }
        setShowMermaConfirm(false);
    };

    const handleReset = () => {
        const allSheets = JSON.parse(localStorage.getItem('returnSheets') || '{}');
        delete allSheets[osId];
        localStorage.setItem('returnSheets', JSON.stringify(allSheets));
        loadSheet();
        toast({ title: "Retorno Reiniciado", description: "Se ha restaurado el estado inicial del retorno." });
        setShowResetConfirm(false);
    }
    
    const handleComplete = () => {
         saveSheet({ status: 'Completado' });
         toast({ title: "Retorno Completado", description: "Se ha marcado el retorno como completado." });
    }

    const { consumption, totalSent, totalReturned, totalLost, hasDiscrepancy } = useMemo(() => {
        if (!sheet) return { consumption: [], totalSent: 0, totalReturned: 0, totalLost: 0, hasDiscrepancy: false };
        
        let sent = 0;
        let returned = 0;
        let discrepancy = false;

        const consumptionList = sheet.items.map(item => {
            const itemKey = `${item.orderId}_${item.itemCode}`;
            const state = sheet.itemStates[itemKey];
            const returnedQty = state?.returnedQuantity ?? 0;
            const consumed = item.sentQuantity - returnedQty;

            if (item.sentQuantity !== returnedQty) {
                discrepancy = true;
            }

            sent += item.sentQuantity;
            returned += returnedQty;
            return {
                ...item,
                itemKey,
                returnedQuantity: returnedQty,
                consumed: consumed > 0 ? consumed : 0,
                surplus: consumed < 0 ? Math.abs(consumed) : 0,
                hasIncident: !!state?.incidentComment
            }
        });

        return {
            consumption: consumptionList,
            totalSent: sent,
            totalReturned: returned,
            totalLost: sent - returned,
            hasDiscrepancy: discrepancy,
        }
    }, [sheet]);


    if (!isMounted || !sheet || !sheet.os) {
        return <LoadingSkeleton title="Cargando Hoja de Retorno..." />;
    }

    return (
        <TooltipProvider>
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/almacen/retornos')} className="mb-2">
                        <ArrowLeft className="mr-2" /> Volver al listado
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <History /> Hoja de Retorno
                    </h1>
                </div>
                 <div className="flex items-center gap-2">
                    {hasDiscrepancy && <Button variant="destructive" onClick={() => setShowMermaConfirm(true)}><Save className="mr-2"/>Ajustar Pedido por Merma</Button>}
                    <Button variant="outline" onClick={() => setShowResetConfirm(true)}><RotateCcw className="mr-2"/>Reiniciar</Button>
                    <Button onClick={handleComplete} disabled={sheet.status === 'Completado'}><Check className="mr-2"/>Marcar como Completado</Button>
                 </div>
            </div>
            
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                             <CardTitle>Servicio: {sheet.os.serviceNumber}</CardTitle>
                             <CardDescription>
                                {sheet.os.client} {sheet.os.finalClient && `- ${sheet.os.finalClient}`}
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-base">{format(new Date(sheet.os.endDate), 'PPP', { locale: es })}</Badge>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardHeader><CardTitle>Total Enviado</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{totalSent}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Total Devuelto</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{totalReturned}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Total Merma/Pérdida</CardTitle></CardHeader>
                    <CardContent><p className={cn("text-2xl font-bold", totalLost > 0 ? "text-destructive" : "text-green-600")}>{totalLost}</p></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Desglose de Retorno</CardTitle></CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Artículo</TableHead>
                                    <TableHead className="text-center">Cant. Enviada</TableHead>
                                    <TableHead className="w-40 text-center">Cant. Devuelta</TableHead>
                                    <TableHead className="text-center">Consumo</TableHead>
                                    <TableHead className="text-center">Excedente</TableHead>
                                    <TableHead className="text-right">Incidencia</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {consumption.map(item => (
                                <TableRow key={item.itemKey}>
                                    <TableCell className="font-medium">{item.description}</TableCell>
                                    <TableCell className="text-center font-semibold">{item.sentQuantity}</TableCell>
                                    <TableCell className="text-center">
                                         <Input
                                            id={`qty-${item.itemKey}`}
                                            type="number"
                                            value={item.returnedQuantity}
                                            onChange={(e) => updateItemState(item.itemKey, { returnedQuantity: parseInt(e.target.value, 10) || 0 })}
                                            className="w-20 mx-auto text-center h-9"
                                        />
                                    </TableCell>
                                     <TableCell className="text-center font-bold text-destructive">{item.consumed}</TableCell>
                                    <TableCell className="text-center font-bold text-green-600">{item.surplus}</TableCell>
                                    <TableCell className="text-right">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
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
                                                            onBlur={(e) => updateItemState(item.itemKey, { incidentComment: e.target.value })}
                                                        />
                                                         <DialogFooter>
                                                            <DialogClose asChild>
                                                                <Button>Cerrar</Button>
                                                            </DialogClose>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </TooltipTrigger>
                                            {item.hasIncident && (
                                                <TooltipContent><p>{sheet.itemStates[item.itemKey]?.incidentComment}</p></TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
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

        <AlertDialog open={showMermaConfirm} onOpenChange={setShowMermaConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmar Ajuste por Merma?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción ajustará las cantidades en los pedidos de material originales para que coincidan con las cantidades devueltas. Este cambio afectará a los costes y a la planificación. ¿Estás seguro?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAcceptMerma}>Sí, Ajustar Pedidos</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        </TooltipProvider>
    );
}

    