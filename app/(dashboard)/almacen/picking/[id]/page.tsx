

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ListChecks, Calendar as CalendarIcon, User, Building, AlertTriangle, MessageSquare, CheckCircle, Soup, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type { PickingSheet, OrderItem, PickingItemState, ServiceOrder } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';


export default function PickingSheetPage() {
    const [sheet, setSheet] = useState<PickingSheet | null>(null);
    const [itemStates, setItemStates] = useState<Map<string, PickingItemState>>(new Map());
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();
    const params = useParams() ?? {};
    const sheetId = (params.id ?? '') as string;
    const { toast } = useToast();
    const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);

    const loadSheet = useCallback(() => {
        const allSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}') as Record<string, PickingSheet>;
        let currentSheet = allSheets[sheetId];
        
        if (currentSheet) {
             // Always try to load the OS data
            const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
            const osData = allServiceOrders.find(os => os.id === currentSheet.osId);
            currentSheet.os = osData;


            setSheet(currentSheet);
            const initialStates = new Map<string, PickingItemState>();
            currentSheet.items.forEach(item => {
                const savedState = currentSheet.itemStates?.[item.itemCode];
                initialStates.set(item.itemCode, {
                    itemCode: item.itemCode,
                    checked: savedState?.checked || false,
                    pickedQuantity: savedState?.pickedQuantity ?? item.quantity,
                    incidentComment: savedState?.incidentComment,
                    resolved: savedState?.resolved || false,
                });
            });
            setItemStates(initialStates);
        } else {
            toast({ variant: "destructive", title: "Error", description: "Hoja de picking no encontrada."});
            router.push('/almacen/picking');
        }
        setIsMounted(true);
    }, [sheetId, router, toast]);

    useEffect(() => {
        loadSheet();
    }, [loadSheet]);
    
    const saveProgress = useCallback((newStates: Map<string, PickingItemState>, newStatus?: PickingSheet['status']) => {
        if(!sheet) return;
        
        const allSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}');
        const itemStatesForStorage: Record<string, Omit<PickingItemState, 'itemCode'>> = {};
        
        newStates.forEach((value, key) => {
            const originalItem = sheet.items.find(i => i.itemCode === key);
            let finalComment = value.incidentComment;

            if (originalItem && originalItem.quantity !== value.pickedQuantity && !finalComment) {
                 if (value.pickedQuantity === 0) {
                    finalComment = "No habia disponible el articulo";
                } else {
                    finalComment = `Discrepancia de cantidad: Requerido ${originalItem.quantity}, Recogido ${value.pickedQuantity}`;
                }
            }
            
            itemStatesForStorage[key] = {
                checked: value.checked,
                pickedQuantity: value.pickedQuantity,
                incidentComment: finalComment,
                resolved: value.resolved,
            };
        });

        const { os, ...sheetToSave } = sheet;

        const updatedSheet: PickingSheet = {
            ...sheetToSave,
            itemStates: itemStatesForStorage,
            status: newStatus || sheet.status,
        };
        allSheets[sheetId] = updatedSheet;
        localStorage.setItem('pickingSheets', JSON.stringify(allSheets));
        
        setSheet(prev => prev ? {...prev, ...updatedSheet} : updatedSheet);
        
        // Re-create map from the now-updated storage object to ensure consistency
        const reloadedStates = new Map<string, PickingItemState>();
        Object.entries(itemStatesForStorage).forEach(([key, value]) => {
            reloadedStates.set(key, { itemCode: key, ...value });
        });
        setItemStates(reloadedStates);
        
    }, [sheet, sheetId]);

    const updateItemState = (itemCode: string, updates: Partial<Omit<PickingItemState, 'itemCode'>>) => {
        setItemStates(prevStates => {
            const newStates = new Map(prevStates);
            const currentState = newStates.get(itemCode);
            if (currentState) {
                const newState = { ...currentState, ...updates };
                newStates.set(itemCode, newState);
                saveProgress(newStates);
                return newStates;
            }
            return prevStates;
        });
    }
    
    const { progress, totalItems, checkedCount, isComplete } = useMemo(() => {
        if (!sheet) return { progress: 0, totalItems: 0, checkedCount: 0, isComplete: false };
        const total = sheet.items.length;
        const checked = Array.from(itemStates.values()).filter(s => s.checked).length;
        
        const allItemsChecked = checked === total;

        const allQuantitiesValid = Array.from(itemStates.values()).every(s => {
            const originalItem = sheet.items.find(i => i.itemCode === s.itemCode);
            if (!originalItem) return true; // Should not happen
            // Valid if quantity matches OR if there's a discrepancy but a comment exists
            return originalItem.quantity === s.pickedQuantity || !!s.incidentComment;
        });

        return {
            progress: total > 0 ? (checked / total) * 100 : 0,
            totalItems: total,
            checkedCount: checked,
            isComplete: allItemsChecked && allQuantitiesValid
        };
    }, [sheet, itemStates]);

    const handleFinalizePicking = () => {
        saveProgress(itemStates, 'Listo');
        toast({ title: "Picking Finalizado", description: "La hoja de picking ha sido marcada como 'Lista'."});
        setIsFinalizeDialogOpen(false);
        router.push('/almacen/picking');
    }

    const groupedItems = useMemo(() => {
        if (!sheet) return {};
        return sheet.items.reduce((acc, item) => {
            const group = item.type || 'Varios';
            if (!acc[group]) acc[group] = [];
            acc[group].push(item);
            return acc;
        }, {} as Record<string, OrderItem[]>);
    }, [sheet]);


    if (!isMounted || !sheet) {
        return <LoadingSkeleton title="Cargando Hoja de Picking..." />;
    }

    return (
        <TooltipProvider>
        <div>
            <div className="flex items-center justify-between mb-4">
                 <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                    Hoja de Picking <Badge variant="outline" className="text-2xl">{sheet.id}</Badge>
                </h1>
                 <div className="flex items-center gap-3">
                    {sheet.solicita && (
                        <Badge variant={sheet.solicita === 'Sala' ? 'default' : 'outline'} className={cn("text-lg", sheet.solicita === 'Sala' ? 'bg-blue-600' : 'bg-orange-500')}>
                            {sheet.solicita === 'Sala' ? <Users size={16} className="mr-1.5"/> : <Soup size={16} className="mr-1.5"/>}
                            {sheet.solicita}
                        </Badge>
                    )}
                     <Button onClick={() => setIsFinalizeDialogOpen(true)} disabled={!isComplete || sheet.status === 'Listo'}>
                        <CheckCircle className="mr-2" />
                        {sheet.status === 'Listo' ? 'Picking Finalizado' : 'Finalizar Picking'}
                    </Button>
                 </div>
            </div>
            
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                             <CardTitle>Servicio: {sheet.os?.serviceNumber}</CardTitle>
                             <CardDescription>
                                {sheet.os?.client} {sheet.os?.finalClient && `- ${sheet.os.finalClient}`}
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="text-base">{format(new Date(sheet.fechaNecesidad), 'PPP', { locale: es })}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2"><Building className="h-4 w-4"/> <strong>Espacio:</strong> {sheet.os?.space || '-'}</div>
                    <div className="flex items-center gap-2"><User className="h-4 w-4"/> <strong>Contacto:</strong> {sheet.os?.contact || '-'}</div>
                    <div className="flex items-center gap-2"><User className="h-4 w-4"/> <strong>Metre:</strong> {sheet.os?.respMetre || '-'}</div>
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
                        {items.map(item => {
                            const state = itemStates.get(item.itemCode);
                            if (!state) return null;
                            const hasIncident = !!state.incidentComment || state.pickedQuantity !== item.quantity;
                            const cajas = (item.unidadVenta && item.unidadVenta > 0) ? (item.quantity / item.unidadVenta).toFixed(2) : null;

                            return (
                                <div key={item.itemCode} className={cn(
                                    "flex items-center gap-4 p-3 border rounded-md transition-colors", 
                                    state.checked ? "bg-green-50" : "bg-background",
                                    hasIncident && !state.checked && "bg-amber-50 border-amber-200"
                                )}>
                                    <Checkbox 
                                        id={`item-${item.itemCode}`}
                                        className="h-8 w-8"
                                        checked={state.checked}
                                        onCheckedChange={(checked) => updateItemState(item.itemCode, { checked: Boolean(checked) })}
                                    />
                                    <Label htmlFor={`item-${item.itemCode}`} className="flex-grow cursor-pointer">
                                        <p className="font-bold text-lg">{item.description}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Cant. Requerida: {item.quantity}
                                            {cajas && <span className="text-xs ml-2">({`~${cajas} cajas`})</span>}
                                        </p>
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor={`qty-${item.itemCode}`} className="text-sm font-medium">Cant. Recogida:</Label>
                                        <Input
                                            id={`qty-${item.itemCode}`}
                                            type="number"
                                            value={state.pickedQuantity}
                                            onChange={(e) => updateItemState(item.itemCode, { pickedQuantity: parseInt(e.target.value, 10) || 0 })}
                                            className="w-20 text-center h-9"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {state.incidentComment && (
                                            <Tooltip>
                                                <TooltipTrigger><MessageSquare className="h-5 w-5 text-amber-600" /></TooltipTrigger>
                                                <TooltipContent><p>{state.incidentComment}</p></TooltipContent>
                                            </Tooltip>
                                        )}
                                         <Dialog>
                                            <DialogTrigger asChild>
                                                 <Button variant="ghost" size="icon" className="h-9 w-9 text-amber-600 hover:bg-amber-100 hover:text-amber-700">
                                                    <AlertTriangle className="h-5 w-5"/>
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Registrar Incidencia: {item.description}</DialogTitle>
                                                    <DialogDescription>
                                                        Describe el problema encontrado. La cantidad recogida ya se ha ajustado a {state.pickedQuantity}. Si no añades un comentario, se generará uno por defecto.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <Textarea 
                                                    id={`comment-${item.itemCode}`}
                                                    defaultValue={state.incidentComment}
                                                    placeholder="Ej: Solo se encontraron 22 unidades en la estantería P4-E2."
                                                    rows={4}
                                                    onBlur={(e) => updateItemState(item.itemCode, { incidentComment: e.target.value })}
                                                />
                                                 <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button>Cerrar</Button>
                                                    </DialogClose>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            ))}
            </div>
            
            <AlertDialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar finalización del Picking?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esto marcará la hoja de picking como "Lista" para su expedición y no se podrá modificar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleFinalizePicking}>
                            Confirmar y Finalizar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
        </TooltipProvider>
    );
}


    
    
