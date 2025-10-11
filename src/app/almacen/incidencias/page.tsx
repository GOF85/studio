
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, Search } from 'lucide-react';
import type { PickingSheet, OrderItem, MaterialOrder, Precio, AlquilerDBItem, ArticuloCatering } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Separator } from '@/components/ui/separator';

type Incidencia = {
    sheetId: string;
    osId: string;
    fechaNecesidad: string;
    item: OrderItem & { orderId: string; solicita?: 'Sala' | 'Cocina'; };
    comment: string;
    requiredQty: number;
    pickedQty: number;
};

type CatalogItem = {
    value: string; // itemCode
    label: string; // description
    category: string;
    price: number;
};

export default function IncidenciasPickingPage() {
    const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [resolvingIncident, setResolvingIncident] = useState<Incidencia | null>(null);
    const [replacementItem, setReplacementItem] = useState<{itemCode: string, quantity: number} | null>(null);
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const { toast } = useToast();
    
    useEffect(() => {
        // Cargar incidencias
        const allSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}') as Record<string, PickingSheet>;
        const loadedIncidencias: Incidencia[] = [];
        
        Object.values(allSheets).forEach(sheet => {
            if (sheet.itemStates) {
                Object.entries(sheet.itemStates).forEach(([itemCode, state]) => {
                    const item = sheet.items.find(i => i.itemCode === itemCode);
                    if (item && item.orderId && state.incidentComment && !state.resolved) {
                        loadedIncidencias.push({
                            sheetId: sheet.id,
                            osId: sheet.osId,
                            fechaNecesidad: sheet.fechaNecesidad,
                            item: {
                                ...item,
                                solicita: sheet.solicitante,
                                orderId: item.orderId, // Ensure the original MaterialOrder ID is preserved
                            },
                            comment: state.incidentComment,
                            requiredQty: item.quantity,
                            pickedQty: state.pickedQuantity
                        });
                    }
                });
            }
        });
        
        setIncidencias(loadedIncidencias.sort((a,b) => new Date(a.fechaNecesidad).getTime() - new Date(b.fechaNecesidad).getTime()));
        
        // Cargar catálogos para reemplazo
        const allArticulos = (JSON.parse(localStorage.getItem('articulos') || '[]') as ArticuloCatering[]).map(a => ({
            value: a.id,
            label: a.nombre,
            category: a.categoria,
            price: a.precioAlquiler > 0 ? a.precioAlquiler : a.precioVenta
        }));

        setCatalog(allArticulos);

        setIsMounted(true);
    }, []);
    
   const handleAcceptDeviation = () => {
        if (!resolvingIncident) return;
        
        const { item, pickedQty, sheetId, comment, requiredQty } = resolvingIncident;
        const originalOrderId = item.orderId;
        const deviation = pickedQty - requiredQty;
        
        let allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
        
        if (originalOrderId) {
            const orderIndex = allMaterialOrders.findIndex(o => o.id === originalOrderId);

            if (orderIndex !== -1) {
                const orderToUpdate = { ...allMaterialOrders[orderIndex] };
                const itemIndex = orderToUpdate.items.findIndex(i => i.itemCode === item.itemCode);

                if (itemIndex !== -1) {
                    const originalItem = orderToUpdate.items[itemIndex];
                    
                    // Update quantity
                    const newQuantity = pickedQty;
                    orderToUpdate.items[itemIndex] = { ...originalItem, quantity: newQuantity };

                    // Add traceability record
                    const ajuste = {
                        tipo: deviation > 0 ? 'exceso' : 'merma',
                        cantidad: deviation,
                        fecha: new Date().toISOString(),
                        comentario: `Incidencia en picking: ${comment}`
                    };
                    
                    if (!orderToUpdate.items[itemIndex].ajustes) {
                        orderToUpdate.items[itemIndex].ajustes = [];
                    }
                    orderToUpdate.items[itemIndex].ajustes!.push(ajuste);
                    
                    // Recalculate total for the order
                    orderToUpdate.total = orderToUpdate.items.reduce((sum, current) => sum + (current.price * current.quantity), 0);
                    
                    allMaterialOrders[orderIndex] = orderToUpdate;
                    localStorage.setItem('materialOrders', JSON.stringify(allMaterialOrders));
                    toast({ title: "Pedido Original Ajustado", description: `La cantidad de "${item.description}" se ha actualizado a ${newQuantity}.` });

                     // Mark incidence as resolved in the picking sheet
                    const allSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}');
                    const sheet = allSheets[sheetId];
                    if (sheet && sheet.itemStates[item.itemCode]) {
                        sheet.itemStates[item.itemCode].resolved = true;
                        localStorage.setItem('pickingSheets', JSON.stringify(allSheets));
                        
                        // Update UI immediately
                        setIncidencias(prev => prev.filter(inc => !(inc.sheetId === sheetId && inc.item.itemCode === item.itemCode)));
                        setResolvingIncident(null);
                        
                        toast({ title: "Incidencia Resuelta", description: "El pedido original ha sido ajustado y la incidencia marcada como resuelta." });
                    }

                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el artículo en el pedido original.' });
                }
            } else {
                 toast({ variant: 'destructive', title: 'Error', description: `No se pudo encontrar el pedido original con ID: ${originalOrderId}` });
            }
        }
    };
    
    const handleCreateReplacementOrder = () => {
        if (!resolvingIncident || !replacementItem?.itemCode) return;
        
        const selectedCatalogItem = catalog.find(c => c.value === replacementItem.itemCode);
        if (!selectedCatalogItem) {
            toast({ variant: 'destructive', title: 'Error', description: 'El artículo seleccionado no es válido.' });
            return;
        }

        const newOrder: MaterialOrder = {
            id: `SUST-${Date.now()}`,
            osId: resolvingIncident.osId,
            type: selectedCatalogItem.category as any, // Asumimos que la categoría coincide
            status: 'Asignado',
            items: [{
                itemCode: selectedCatalogItem.value,
                description: selectedCatalogItem.label,
                quantity: replacementItem.quantity,
                price: selectedCatalogItem.price,
                stock: 0,
                imageUrl: '',
                imageHint: '',
                category: selectedCatalogItem.category,
            }],
            days: 1, 
            total: selectedCatalogItem.price * replacementItem.quantity,
            contractNumber: `SUST-${resolvingIncident.sheetId}`,
            solicita: resolvingIncident.item.solicita
        };

        const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
        allMaterialOrders.push(newOrder);
        localStorage.setItem('materialOrders', JSON.stringify(allMaterialOrders));

        // Marcar la incidencia original como resuelta
         const allSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}');
        const sheet = allSheets[resolvingIncident.sheetId];
        if (sheet && sheet.itemStates[resolvingIncident.item.itemCode]) {
            sheet.itemStates[resolvingIncident.item.itemCode].resolved = true;
            localStorage.setItem('pickingSheets', JSON.stringify(allSheets));
        }

        setIncidencias(prev => prev.filter(inc => !(inc.sheetId === resolvingIncident.sheetId && inc.item.itemCode === resolvingIncident.item.itemCode)));
        setResolvingIncident(null);
        setReplacementItem(null);

        toast({ title: "Pedido de Sustitución Creado", description: "Una nueva necesidad ha sido creada y aparecerá en Planificación de Almacén." });
    };
    
    const filteredCatalog = useMemo(() => {
        if (!resolvingIncident?.item.category) return catalog;
        return catalog.filter(c => c.category === resolvingIncident.item.category);
    }, [resolvingIncident, catalog]);

    const filteredIncidencias = useMemo(() => {
        return incidencias.filter(inc => 
            inc.sheetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inc.item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inc.comment.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [incidencias, searchTerm]);


    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Incidencias de Picking..." />;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                    <AlertTriangle /> Incidencias de Picking
                </h1>
            </div>
            
             <div className="relative flex-grow mb-6">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por hoja, artículo o comentario..."
                    className="pl-8 w-full max-w-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="border rounded-lg">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Hoja Picking</TableHead>
                            <TableHead>Fecha Evento</TableHead>
                            <TableHead>Artículo</TableHead>
                            <TableHead>Discrepancia</TableHead>
                            <TableHead>Comentario</TableHead>
                            <TableHead className="w-[120px] text-right">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredIncidencias.length > 0 ? (
                            filteredIncidencias.map(incidencia => (
                                <TableRow key={`${incidencia.sheetId}-${incidencia.item.itemCode}`}>
                                    <TableCell><Link href={`/almacen/picking/${incidencia.sheetId}`}><Badge>{incidencia.sheetId}</Badge></Link></TableCell>
                                    <TableCell>{format(parseISO(incidencia.fechaNecesidad), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{incidencia.item.description}</TableCell>
                                    <TableCell>
                                        Req: {incidencia.requiredQty} / Recogido: {incidencia.pickedQty}
                                        <span className={cn("font-bold ml-2", incidencia.pickedQty < incidencia.requiredQty ? 'text-destructive' : 'text-green-600')}>
                                            ({incidencia.pickedQty - incidencia.requiredQty})
                                        </span>
                                    </TableCell>
                                    <TableCell className="max-w-sm truncate">{incidencia.comment}</TableCell>
                                    <TableCell className="text-right">
                                        <Button onClick={() => setResolvingIncident(incidencia)}>Resolver</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">No hay incidencias pendientes de resolver.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <Dialog open={!!resolvingIncident} onOpenChange={() => setResolvingIncident(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Resolver Incidencia: {resolvingIncident?.item.description}</DialogTitle>
                        <DialogDescription>
                            Se recogieron {resolvingIncident?.pickedQty} de {resolvingIncident?.requiredQty} unidades. Elige cómo quieres proceder.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h4 className="font-semibold">Opción A: Aceptar Desviación</h4>
                            <p className="text-sm text-muted-foreground">
                                La cantidad recogida se considerará final. El pedido original se ajustará para reflejar esta desviación (merma o exceso).
                            </p>
                            <Button variant="destructive" onClick={handleAcceptDeviation}>Confirmar Desviación y Ajustar Pedido</Button>
                        </div>
                         <div className="space-y-3 border-l pl-6">
                            <h4 className="font-semibold">Opción B: Sustituir y crear nuevo pedido</h4>
                            <p className="text-sm text-muted-foreground">
                                Busca un artículo alternativo en el catálogo para cubrir la necesidad. Se generará un nuevo pedido que aparecerá en la planificación.
                            </p>
                            <div className="space-y-2">
                                <Label>Artículo de sustitución</Label>
                                <Combobox 
                                    options={filteredCatalog}
                                    value={replacementItem?.itemCode || ''}
                                    onChange={(value) => setReplacementItem(prev => ({...prev, itemCode: value, quantity: prev?.quantity || (resolvingIncident?.requiredQty || 1) - (resolvingIncident?.pickedQty || 0) }))}
                                    placeholder="Buscar en catálogo..."
                                    searchPlaceholder="Buscar artículo..."
                                />
                            </div>
                             <div className="space-y-2">
                                <Label>Cantidad necesaria</Label>
                                <Input 
                                    type="number" 
                                    min="1"
                                    value={replacementItem?.quantity || 1}
                                    onChange={(e) => setReplacementItem(prev => ({...prev, itemCode: prev?.itemCode || '', quantity: parseInt(e.target.value, 10)}))}
                                    disabled={!replacementItem?.itemCode}
                                />
                            </div>
                            <Button onClick={handleCreateReplacementOrder} disabled={!replacementItem?.itemCode || !replacementItem?.quantity}>Crear Pedido de Sustitución</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
