
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// We need to include the original order ID to trace back and update it.
type ReturnSheetItem = OrderItem & { sentQuantity: number; orderId: string; type: MaterialOrder['type'] };
type ReturnIncidencia = { osId: string; osServiceNumber: string; item: ReturnSheetItem; comment: string; timestamp: string };

export default function RetornoSheetPage() {
    const [sheet, setSheet] = useState<ReturnSheet | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    
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
                    const newItem: ReturnSheetItem = { ...item, sentQuantity: item.quantity, orderId: order.id, type: order.type };
                    itemsFromOrders.push(newItem);
                    const itemKey = `${order.id}_${item.itemCode}`;
                    
                    // Smart Returns Logic
                    const isConsumable = order.type === 'Bodega' || order.type === 'Bio';
                    initialItemStates[itemKey] = { 
                        returnedQuantity: isConsumable ? 0 : item.quantity 
                    };
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
    
    const handleAddIncidencia = (item: ReturnSheetItem, comment: string) => {
        if(!sheet || !sheet.os) return;
        const allIncidencias = JSON.parse(localStorage.getItem('incidenciasRetorno') || '[]') as ReturnIncidencia[];
        const newIncidencia: ReturnIncidencia = {
            osId: sheet.osId,
            osServiceNumber: sheet.os.serviceNumber,
            item,
            comment,
            timestamp: new Date().toISOString()
        };
        
        const existingIndex = allIncidencias.findIndex(inc => inc.osId === osId && inc.item.itemCode === item.itemCode);
        if(existingIndex > -1) {
            allIncidencias[existingIndex] = newIncidencia;
        } else {
            allIncidencias.push(newIncidencia);
        }
        localStorage.setItem('incidenciasRetorno', JSON.stringify(allIncidencias));
        updateItemState(`${item.orderId}_${item.itemCode}`, { incidentComment: comment });
        toast({title: 'Incidencia Registrada', description: `Se ha registrado una incidencia para ${item.description}`});
    }

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
    
    const groupedItems = useMemo(() => {
        if(!sheet) return {};
        const consumptionList = sheet.items.map(item => {
            const itemKey = `${item.orderId}_${item.itemCode}`;
            const state = sheet.itemStates[itemKey] || { returnedQuantity: 0 };
            const returnedQty = state.returnedQuantity;

            return {
                ...item,
                itemKey,
                returnedQuantity: returnedQty,
                consumed: Math.max(0, item.sentQuantity - returnedQty),
                surplus: Math.max(0, returnedQty - item.sentQuantity),
                hasIncident: !!state.incidentComment
            }
        });
        
        return consumptionList.reduce((acc, item) => {
            const group = item.type || 'Varios';
            if (!acc[group]) acc[group] = [];
            acc[group].push(item);
            return acc;
        }, {} as Record<string, ReturnType<typeof consumptionList>>);

    }, [sheet]);


    if (!isMounted || !sheet || !sheet.os) {
        return <LoadingSkeleton title="Cargando Hoja de Retorno..." />;
    }

    return (
        <TooltipProvider>
        <div>
            <div className="flex items-center justify-end mb-4">
                 <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setShowResetConfirm(true)}><RotateCcw className="mr-2"/>Reiniciar</Button>
                    <Button onClick={handleComplete} disabled={sheet.status === 'Completado'}><Check className="mr-2"/>Marcar como Completado</Button>
                 </div>
            </div>
            
            <Card className="mb-6">
                <CardHeader className="py-3">
                    <div className="flex justify-between items-start">
                        <div>
                             <CardTitle className="text-xl">Servicio: {sheet.os.serviceNumber}</CardTitle>
                             <CardDescription>
                                {sheet.os.client} {sheet.os.finalClient && `- ${sheet.os.finalClient}`}
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-base">{format(new Date(sheet.os.endDate), 'PPP', { locale: es })}</Badge>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                 {Object.entries(groupedItems).map(([type, items]) => (
                    <Card key={type}>
                        <CardHeader className="py-2"><CardTitle className="text-base">{type}</CardTitle></CardHeader>
                        <CardContent className="py-2"><p className="text-2xl font-bold">{items.length}</p><span className="text-xs text-muted-foreground">tipos de artículo</span></CardContent>
                    </Card>
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
                                        <TableHead>Artículo</TableHead>
                                        <TableHead className="text-center">Enviado</TableHead>
                                        <TableHead className="w-52 text-center">Devuelto</TableHead>
                                        <TableHead className="text-center">Consumo</TableHead>
                                        <TableHead className="text-center">Excedente</TableHead>
                                        <TableHead className="text-right">Incidencia</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map(item => {
                                        const isMismatch = item.sentQuantity !== item.returnedQuantity;
                                        return (
                                        <TableRow key={item.itemKey} className={cn(isMismatch && item.hasIncident && "bg-destructive/10", isMismatch && !item.hasIncident && "bg-amber-50/80")}>
                                            <TableCell className="font-medium">{item.description}</TableCell>
                                            <TableCell className="text-center font-semibold">{item.sentQuantity}</TableCell>
                                            <TableCell className="text-center">
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
                                            <TableCell className={cn("text-center font-bold", item.consumed > 0 && "text-destructive")}>{item.consumed}</TableCell>
                                            <TableCell className={cn("text-center font-bold", item.surplus > 0 && "text-green-600")}>{item.surplus}</TableCell>
                                            <TableCell className="text-right">
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

    
