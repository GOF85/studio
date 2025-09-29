
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Package, ListChecks, AlertTriangle, PlusCircle, Camera, Upload, Trash2, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import type { Entrega, PedidoEntrega, ProductoVenta, EntregaHito, PedidoEntregaItem, PickingEntregaState, PickingIncidencia } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import Image from 'next/image';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


type ItemParaPicking = {
    id: string; // erpId o producto.id
    nombre: string;
    cantidad: number;
    unidad: string;
    loc: string;
    imageUrl?: string;
    categoria: string;
    origen: string; // Nombre del Pack o 'Directo'
    producidoPorPartner?: boolean;
};

function SortableItem({ id, children }: { id: string, children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    
    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-background p-2 border-b">
            <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground p-2">
                <GripVertical />
            </div>
            {children}
        </div>
    );
}

function IncidenciaDialog({ item, onSave }: { item: ItemParaPicking; onSave: (itemId: string, comment: string) => void }) {
    const [comment, setComment] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><AlertTriangle className="h-5 w-5"/></Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Reportar Incidencia: {item.nombre}</DialogTitle></DialogHeader>
                <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Ej: No se encontraron todas las unidades, producto dañado..."/>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={() => { onSave(item.id, comment); setIsOpen(false); }}>Guardar Incidencia</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function PickingEntregaPage() {
    const [entrega, setEntrega] = useState<Entrega | null>(null);
    const [hito, setHito] = useState<EntregaHito | null>(null);
    const [pickingState, setPickingState] = useState<PickingEntregaState>({ hitoId: '', checkedItems: new Set(), incidencias: [], fotoUrl: null });
    const [isMounted, setIsMounted] = useState(false);
    const [expedicionNumero, setExpedicionNumero] = useState('');
    const [showOnlyPending, setShowOnlyPending] = useState(true);
    const [showSaveFeedback, setShowSaveFeedback] = useState(false);
    const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
    const [itemsParaPicking, setItemsParaPicking] = useState<ItemParaPicking[]>([]);

    const router = useRouter();
    const params = useParams();
    const hitoId = params.id as string;
    const searchParams = useSearchParams();
    const osId = searchParams.get('osId');
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

    const totalItems = useMemo(() => itemsParaPicking.length, [itemsParaPicking]);

    const saveState = useCallback((newState: Partial<PickingEntregaState>) => {
        const allStates = JSON.parse(localStorage.getItem('pickingEntregasState') || '{}');
        const currentState = allStates[hitoId] || { hitoId, checkedItems: new Set(), incidencias: [], fotoUrl: null };
        const updatedState = { ...currentState, ...newState };

        // Convert Set to Array for JSON serialization
        updatedState.checkedItems = Array.from(updatedState.checkedItems);
        allStates[hitoId] = updatedState;
        localStorage.setItem('pickingEntregasState', JSON.stringify(allStates));

        // Convert back to Set for component state
        setPickingState({ ...updatedState, checkedItems: new Set(updatedState.checkedItems) });
        
        setShowSaveFeedback(true);
        setTimeout(() => setShowSaveFeedback(false), 2000);

    }, [hitoId]);

    useEffect(() => {
        // Load data on mount
        const allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
        const currentEntrega = allEntregas.find(e => e.id === osId);
        setEntrega(currentEntrega || null);
        
        const allPedidos = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
        const currentPedido = allPedidos.find(p => p.osId === osId);
        const currentHito = currentPedido?.hitos?.find(h => h.id === hitoId);
        
        if (currentPedido && currentHito && currentEntrega) {
            const hitoIndex = currentPedido.hitos.findIndex(h => h.id === hitoId);
            setExpedicionNumero(`${currentEntrega.serviceNumber}.${(hitoIndex + 1).toString().padStart(2, '0')}`);
            setHito(currentHito);
            
            const allProductosVenta = JSON.parse(localStorage.getItem('productosVenta') || '[]') as ProductoVenta[];
            const productosMap = new Map(allProductosVenta.map(p => [p.id, p]));
            const allPrecios = JSON.parse(localStorage.getItem('precios') || '[]') as any[];
            const preciosMap = new Map(allPrecios.map(p => [p.id, p]));

            const items: ItemParaPicking[] = [];
            const uniqueIds = new Set<string>();

            (currentHito.items || []).forEach(item => {
                const producto = productosMap.get(item.id);
                if (producto) {
                    if (producto.producidoPorPartner || producto.recetaId) {
                        const uniqueId = `prod_${producto.id}`;
                        if (!uniqueIds.has(uniqueId)) {
                            items.push({
                                id: uniqueId,
                                nombre: producto.nombre,
                                cantidad: item.quantity,
                                unidad: 'Uds',
                                loc: 'N/A',
                                categoria: producto.categoria,
                                origen: 'Directo',
                                producidoPorPartner: producto.producidoPorPartner,
                                imageUrl: (preciosMap.get(producto.id) || {}).imagen || '',
                            });
                            uniqueIds.add(uniqueId);
                        }
                    } else { // It's a Pack
                        (producto.componentes || []).forEach(comp => {
                            const compInfo = preciosMap.get(comp.erpId);
                            const uniqueId = comp.erpId;
                            const existing = items.find(i => i.id === uniqueId);
                            if (existing) {
                                existing.cantidad += comp.cantidad * item.quantity;
                            } else {
                                items.push({
                                    id: uniqueId,
                                    nombre: comp.nombre,
                                    cantidad: comp.cantidad * item.quantity,
                                    unidad: compInfo?.unidad || 'Uds',
                                    loc: compInfo?.loc || 'N/A',
                                    categoria: compInfo?.categoria || 'Varios',
                                    origen: producto.nombre,
                                    imageUrl: compInfo?.imagen || '',
                                });
                                uniqueIds.add(uniqueId);
                            }
                        });
                    }
                }
            });
            setItemsParaPicking(items);
        } else {
            router.push('/entregas/picking');
        }

        const allStates = JSON.parse(localStorage.getItem('pickingEntregasState') || '{}');
        const savedState = allStates[hitoId];
        if (savedState) {
            setPickingState({
                ...savedState,
                checkedItems: new Set(savedState.checkedItems || []),
            });
        }

        setIsMounted(true);
    }, [osId, hitoId, router]);

    const handleCheck = (itemId: string, checked: boolean) => {
        const newCheckedItems = new Set(pickingState.checkedItems);
        if (checked) {
            newCheckedItems.add(itemId);
        } else {
            newCheckedItems.delete(itemId);
        }
        saveState({ checkedItems: newCheckedItems });
    };
    
    const handleIncidencia = (itemId: string, comment: string) => {
        const newIncidencias = [...pickingState.incidencias.filter(i => i.itemId !== itemId), { itemId, comment, timestamp: new Date().toISOString() }];
        saveState({ incidencias: newIncidencias });
        toast({ title: 'Incidencia Registrada' });
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result;
                if (typeof result === 'string') {
                    saveState({ fotoUrl: result });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFinalize = () => {
        saveState({ status: 'Preparado' });
        setIsFinalizeDialogOpen(false);
        toast({ title: 'Picking Finalizado', description: 'El estado se ha actualizado a "Preparado".'});
    }

    const { checkedCount, progress } = useMemo(() => {
        const count = pickingState.checkedItems.size;
        const percentage = totalItems > 0 ? (count / totalItems) * 100 : 0;
        return { checkedCount: count, progress: percentage };
    }, [pickingState.checkedItems, totalItems]);
    
    const itemsToShow = useMemo(() => {
        return showOnlyPending 
            ? itemsParaPicking.filter(item => !pickingState.checkedItems.has(item.id)) 
            : itemsParaPicking;
    }, [itemsParaPicking, pickingState.checkedItems, showOnlyPending]);
    
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setItemsParaPicking((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    if (!isMounted || !entrega || !hito) {
        return <LoadingSkeleton title="Cargando Hoja de Picking..." />;
    }
    
    const groupedItems = itemsToShow.reduce((acc, item) => {
        const key = item.producidoPorPartner ? 'Recibido de Partner' : (item.categoria || 'Varios');
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(item);
        return acc;
    }, {} as Record<string, ItemParaPicking[]>);
    
    const isFinalizable = progress === 100 || pickingState.incidencias.length > 0;

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/entregas/picking')} className="mb-2 no-print">
                        <ArrowLeft className="mr-2" /> Volver al listado
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <ListChecks /> Hoja de Picking: {expedicionNumero}
                    </h1>
                    <CardDescription>
                        {hito.lugarEntrega}
                    </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                    {showSaveFeedback && <span className="text-sm text-green-600 transition-opacity animate-pulse">Guardado ✓</span>}
                    <div className="flex items-center space-x-2">
                        <Switch id="show-pending" checked={showOnlyPending} onCheckedChange={setShowOnlyPending} />
                        <Label htmlFor="show-pending">Ver solo pendientes</Label>
                    </div>
                </div>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-base">Progreso del Picking</CardTitle>
                </CardHeader>
                <CardContent>
                    <Progress value={progress} className="w-full h-4" />
                    <p className="text-sm text-muted-foreground mt-2 text-center">{checkedCount} de {totalItems} artículos recogidos ({progress.toFixed(0)}%)</p>
                </CardContent>
            </Card>

            <div className="space-y-4">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={itemsParaPicking.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {Object.entries(groupedItems).map(([groupName, items]) => (
                        <Card key={groupName}>
                            <CardHeader>
                                <CardTitle className="text-lg">{groupName}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {items.map(item => {
                                    const hasIncidencia = pickingState.incidencias.some(i => i.itemId === item.id);
                                    return (
                                        <SortableItem key={item.id} id={item.id}>
                                            <Checkbox 
                                                id={`item-${item.id}`}
                                                className="h-8 w-8"
                                                checked={pickingState.checkedItems.has(item.id)}
                                                onCheckedChange={(checked) => handleCheck(item.id, Boolean(checked))}
                                            />
                                            <Label htmlFor={`item-${item.id}`} className={cn("flex-grow flex items-center gap-4 cursor-pointer", hasIncidencia && 'text-destructive')}>
                                                <div className="relative w-12 h-12 rounded-md overflow-hidden bg-secondary">
                                                    {item.imageUrl && <Image src={item.imageUrl} alt={item.nombre} fill className="object-cover" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-lg">{item.nombre}</p>
                                                    <p className="text-sm text-muted-foreground">Ubicación: {item.loc} - Origen: {item.origen}</p>
                                                </div>
                                            </Label>
                                            <div className="text-2xl font-bold text-primary w-24 text-right">
                                                x{item.cantidad}
                                            </div>
                                            <IncidenciaDialog item={item} onSave={handleIncidencia} />
                                        </SortableItem>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    ))}
                </SortableContext>
              </DndContext>
            </div>
            
            <div className="mt-8 flex justify-end">
                <Dialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" disabled={!isFinalizable}>Finalizar Picking</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Finalizar Picking de Expedición {expedicionNumero}</DialogTitle>
                            <DialogDescription>
                                {pickingState.incidencias.length > 0 
                                ? `Se finalizará el picking con ${pickingState.incidencias.length} incidencia(s) registrada(s).` 
                                : 'Confirma que todos los artículos han sido recogidos.'}
                                 Puedes adjuntar una foto del pedido final como evidencia.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            {pickingState.fotoUrl ? (
                                <div className="relative">
                                    <Image src={pickingState.fotoUrl} alt="Foto del picking" width={400} height={300} className="rounded-md w-full h-auto object-contain"/>
                                    <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => saveState({ fotoUrl: null })}><Trash2/></Button>
                                </div>
                            ) : (
                                <div>
                                    <Label htmlFor="upload-photo">Adjuntar Foto</Label>
                                    <Input id="upload-photo" type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileUpload} />
                                </div>
                            )}
                             {pickingState.incidencias.length > 0 && (
                                <div>
                                    <h4 className="font-semibold">Incidencias Reportadas:</h4>
                                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                                        {pickingState.incidencias.map(inc => {
                                            const item = itemsParaPicking.find(i => i.id === inc.itemId);
                                            return <li key={inc.itemId}><strong>{item?.nombre}:</strong> {inc.comment}</li>
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setIsFinalizeDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleFinalize}>Confirmar y Finalizar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </main>
    );
}


    