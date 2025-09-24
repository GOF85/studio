

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Package, ArrowLeft, ThermometerSnowflake, Archive, PlusCircle, ChevronsUpDown, Printer, Loader2, Trash2, Check, X, Utensils } from 'lucide-react';
import { format } from 'date-fns';
import type { ServiceOrder, OrdenFabricacion, ContenedorIsotermo, PickingState, LoteAsignado, Elaboracion, ComercialBriefing, GastronomyOrder, Receta, PickingStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatNumber, formatUnit } from '@/lib/utils';

type LotePendiente = {
    ofId: string;
    elaboracionId: string;
    elaboracionNombre: string;
    cantidadNecesaria: number; // Necesidad para este hito
    cantidadAsignada: number; // Asignado a este hito
    unidad: string;
    tipoExpedicion: 'FRIO' | 'CALIENTE' | 'PASTELERIA' | 'EXPEDICION';
};

const expeditionTypeMap = {
    FRIO: { title: "Partida Frío", icon: ThermometerSnowflake, className: "bg-blue-100 border-blue-200" },
    CALIENTE: { title: "Partida Caliente", icon: ThermometerSnowflake, className: "bg-red-100 border-red-200" },
    PASTELERIA: { title: "Partida Pastelería", icon: Archive, className: "bg-pink-100 border-pink-200" },
    EXPEDICION: { title: "Partida Expedición", icon: Package, className: "bg-gray-100 border-gray-200" },
};

export const statusOptions: PickingStatus[] = ['Pendiente', 'Preparado', 'Enviado', 'Entregado', 'Retornado'];
export const statusVariant: { [key in PickingStatus]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  Pendiente: 'secondary',
  Preparado: 'outline',
  Enviado: 'default',
  Entregado: 'default',
  Retornado: 'destructive',
};

function AllocationDialog({ lote, containers, onAllocate }: { lote: LotePendiente, containers: ContenedorIsotermo[], onAllocate: (ofId: string, containerId: string, quantity: number) => void }) {
    const cantidadPendiente = Number(lote.cantidadNecesaria) - Number(lote.cantidadAsignada);
    const [quantity, setQuantity] = useState(isNaN(cantidadPendiente) ? 0 : cantidadPendiente);
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    const handleAllocate = () => {
        if (!selectedContainerId) {
            alert("Por favor, selecciona un contenedor.");
            return;
        }
        if (quantity <= 0 || quantity > cantidadPendiente) {
            alert(`La cantidad debe estar entre 0.01 y ${formatNumber(cantidadPendiente, 2)}.`);
            return;
        }
        onAllocate(lote.ofId, selectedContainerId, quantity);
        setOpen(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">Asignar</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Asignar Lote: {lote.elaboracionNombre}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="p-2 border rounded-md">
                        <div className="flex justify-between text-sm font-semibold mt-1 pt-1 border-t"><span>Pendiente de Asignar:</span> <span>{formatNumber(cantidadPendiente, 2)} {formatUnit(lote.unidad)}</span></div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quantity-to-allocate">Cantidad a Asignar</Label>
                        <Input id="quantity-to-allocate" type="number" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value))} max={cantidadPendiente} min="0.01" step="0.01" />
                    </div>
                    <div className="space-y-2">
                        <Label>Contenedor de Destino</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                    {selectedContainerId ? containers.find(c => c.id === selectedContainerId)?.nombre : "Seleccionar contenedor..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar contenedor..." />
                                    <CommandList>
                                        <CommandEmpty>No hay contenedores.</CommandEmpty>
                                        <CommandGroup>
                                            {containers.map(c => (
                                                <CommandItem key={c.id} onSelect={() => setSelectedContainerId(c.id)}>{c.nombre} ({c.id})</CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleAllocate}>Confirmar Asignación</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function PickingDetailPage() {
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [hito, setHito] = useState<GastronomyOrder | null>(null);
    const [dbContainers, setDbContainers] = useState<ContenedorIsotermo[]>([]);
    const [pickingState, setPickingState] = useState<PickingState>({ osId: '', status: 'Pendiente', assignedContainers: {}, itemStates: [] });
    const [lotesPendientes, setLotesPendientes] = useState<LotePendiente[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const osId = params.id as string;
    const hitoId = searchParams.get('hitoId');
    const { toast } = useToast();

    const savePickingState = useCallback((newState: PickingState) => {
        if (!osId) return;
        const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as {[key: string]: PickingState};
        allPickingStates[osId] = newState;
        localStorage.setItem('pickingStates', JSON.stringify(allPickingStates));
        setPickingState(newState);
    }, [osId]);

    const handleStatusChange = (newStatus: PickingStatus) => {
        savePickingState({ ...pickingState, status: newStatus });
        toast({title: "Estado Actualizado", description: `El estado del picking es ahora: ${newStatus}`});
    }
    
    const isPickingComplete = useMemo(() => {
        return lotesPendientes.length === 0;
    }, [lotesPendientes]);

    const getRecetaForElaboracion = useCallback((elaboracionId: string, osId: string): string => {
        const gastroOrders = (JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[]).filter(o => o.osId === osId);
        const recetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
        for (const order of gastroOrders) {
            for (const item of (order.items || [])) {
                if(item.type === 'item') {
                    const receta = recetas.find(r => r.id === item.id);
                    if(receta && receta.elaboraciones.some(e => e.elaboracionId === elaboracionId)) {
                        return receta.nombre;
                    }
                }
            }
        }
        return '-';
    }, []);

    const lotesNecesarios = useMemo(() => {
        if (!isMounted) return [];
        const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        return allOFs.filter(of => of.osIDs.includes(osId));
    }, [osId, isMounted]);

    useEffect(() => {
        if (osId && hitoId) {
            const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
            const currentOS = allServiceOrders.find(os => os.id === osId);
            setServiceOrder(currentOS || null);
            
            const allGastroOrders = (JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[]);
            const currentHito = allGastroOrders.find(g => g.osId === osId && g.id === hitoId);
            setHito(currentHito || null);

            const allContainers = JSON.parse(localStorage.getItem('contenedoresDB') || '[]') as ContenedorIsotermo[];
            setDbContainers(allContainers);
            
            const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as {[key: string]: PickingState};
            const savedState = allPickingStates[osId];
            if (savedState) {
                setPickingState(savedState);
            } else {
                setPickingState({ osId, status: 'Pendiente', assignedContainers: {}, itemStates: [] });
            }
        }
        setIsMounted(true);
    }, [osId, hitoId]); 

    useEffect(() => {
        if(!isMounted || !hito) return;
         // Complex Logic to determine needs per hito
        const allOFs = (JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[]);
        const allRecetas = (JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[]);
        const allElaboraciones = (JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[]);
        
        const necesidadesHito: Map<string, LotePendiente> = new Map();

        (hito.items || []).forEach(item => {
            if (item.type === 'item') {
                const receta = allRecetas.find(r => r.id === item.id);
                if (receta) {
                    receta.elaboraciones.forEach(elabEnReceta => {
                        const elabInfo = allElaboraciones.find(e => e.id === elabEnReceta.elaboracionId);
                        if (elabInfo) {
                            const cantidadNecesaria = Number(item.quantity || 0) * elabEnReceta.cantidad;
                            const existing = necesidadesHito.get(elabInfo.id);
                            if(existing) {
                                existing.cantidadNecesaria += cantidadNecesaria;
                            } else {
                                const of = allOFs.find(o => o.osIDs.includes(osId) && o.elaboracionId === elabInfo.id);
                                necesidadesHito.set(elabInfo.id, {
                                    ofId: of?.id || 'NO-OF',
                                    elaboracionId: elabInfo.id,
                                    elaboracionNombre: elabInfo.nombre,
                                    cantidadNecesaria: cantidadNecesaria,
                                    cantidadAsignada: 0, // se calculará luego
                                    unidad: elabInfo.unidadProduccion,
                                    tipoExpedicion: elabInfo.partidaProduccion
                                });
                            }
                        }
                    });
                }
            }
        });
        
        const lotesPendientesHito = Array.from(necesidadesHito.values()).map(necesidad => {
            const cantidadAsignadaTotal = pickingState.itemStates
                .filter(a => a.ofId === necesidad.ofId && a.hitoId === hito.id)
                .reduce((sum, a) => sum + a.quantity, 0) || 0;
            
            return {
                ...necesidad,
                cantidadAsignada: cantidadAsignadaTotal,
            }
        }).filter(lote => (lote.cantidadNecesaria - lote.cantidadAsignada) > 0.001 && (allOFs.find(of => of.id === lote.ofId)?.estado === 'Validado' || allOFs.find(of => of.id === lote.ofId)?.estado === 'Finalizado'));
        
        setLotesPendientes(lotesPendientesHito);

    }, [osId, hitoId, isMounted, hito, pickingState.itemStates]);
    
    const lotesPendientesCalidad = useMemo(() => {
        return lotesNecesarios.filter(of => 
            of.estado !== 'Finalizado' && 
            of.estado !== 'Validado' && 
            !(of.incidencia && of.cantidadReal !== null && of.cantidadReal > 0)
        );
    }, [lotesNecesarios]);

    const addContainerToSection = (tipo: keyof typeof expeditionTypeMap, container: ContenedorIsotermo) => {
        const newAssignedContainers = { ...pickingState.assignedContainers };
        const currentSectionContainers = newAssignedContainers[tipo] || [];
        if(currentSectionContainers.some(c => c.id === container.id)) {
            toast({variant: 'destructive', title: "Contenedor ya asignado", description: "Este contenedor ya está en la lista."})
            return;
        };
        newAssignedContainers[tipo] = [...currentSectionContainers, container];
        savePickingState({ ...pickingState, assignedContainers: newAssignedContainers });
    };

    const allocateLote = (ofId: string, containerId: string, quantity: number) => {
        if (!hitoId) return;
        const newAllocation: LoteAsignado = { allocationId: Date.now().toString(), ofId, containerId, quantity, hitoId };
        const newItemStates = [...pickingState.itemStates, newAllocation];
        savePickingState({ ...pickingState, itemStates: newItemStates });
        toast({ title: 'Lote Asignado', description: `${formatNumber(quantity, 2)} unidades asignadas al contenedor.`});
    }
    
    const deallocateLote = (allocationId: string) => {
        const newItemStates = pickingState.itemStates.filter(a => a.allocationId !== allocationId);
        savePickingState({ ...pickingState, itemStates: newItemStates });
    }
    
     const handleDeletePicking = () => {
        savePickingState({ osId, status: 'Pendiente', assignedContainers: {}, itemStates: [] });
        toast({ title: "Picking Reiniciado", description: "Se han desasignado todos los lotes y contenedores."});
        setShowDeleteConfirm(false);
    }
    
const handlePrint = async () => {
    if (!serviceOrder || !hito) return;
    setIsPrinting(true);

    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });
        const allAssignedContainers = Object.values(pickingState.assignedContainers).flat();
        
        allAssignedContainers.forEach((container, index) => {
            if (index > 0) doc.addPage();

            const margin = 5;
            const pageWidth = doc.internal.pageSize.getWidth();
            let finalY = margin;

            // --- HEADER ---
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(container.nombre, margin, finalY + 2);
            doc.text(`${index + 1}/${allAssignedContainers.length}`, pageWidth - margin, finalY + 2, { align: 'right' });
            finalY += 4;
            
            doc.setLineWidth(0.5);
            doc.line(margin, finalY, pageWidth - margin, finalY);
            finalY += 2;

            // --- EVENT INFO ---
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#374151');
            
            const serviceData = [
                ['Nº Serv:', serviceOrder.serviceNumber],
                ['Cliente:', serviceOrder.finalClient || serviceOrder.client],
                ['Espacio:', serviceOrder.space || '-'],
                ['Fecha-Hora:', `${format(new Date(hito.fecha), 'dd/MM/yy')} ${hito.horaInicio}`],
                ['Servicio:', hito.descripcion]
            ];

             autoTable(doc, {
                body: serviceData,
                startY: finalY,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 0.2 },
                columnStyles: { 0: { fontStyle: 'bold' } }
            });
            finalY = (doc as any).lastAutoTable.finalY + 2;

            doc.setLineWidth(0.2);
            doc.line(margin, finalY, pageWidth - margin, finalY);
            finalY += 3;

            // --- CONTENT TABLE ---
            const containerItems = pickingState.itemStates.filter(item => item.containerId === container.id && item.hitoId === hitoId);
            const itemsGrouped = new Map<string, { totalQuantity: number, lotes: string[], unidad: string, receta: string }>();

            containerItems.forEach(assignedLote => {
                const loteInfo = lotesNecesarios.find(l => l.id === assignedLote.ofId);
                if (loteInfo) {
                    const key = loteInfo.elaboracionNombre;
                    const recetaNombre = getRecetaForElaboracion(loteInfo.elaboracionId, osId);

                    if (!itemsGrouped.has(key)) {
                        itemsGrouped.set(key, { totalQuantity: 0, lotes: [], unidad: loteInfo.unidad, receta: recetaNombre });
                    }
                    const entry = itemsGrouped.get(key)!;
                    entry.totalQuantity += assignedLote.quantity;
                    if(!entry.lotes.includes(loteInfo.id)) entry.lotes.push(loteInfo.id);
                }
            });

            const body: any[] = [];
            itemsGrouped.forEach((data, elabName) => {
                 body.push([
                    { content: `${elabName}\n(${data.receta})`, styles: { fontSize: 9 } },
                    `${formatNumber(data.totalQuantity, 2)} ${formatUnit(data.unidad)}`, 
                    data.lotes.join(', ')
                ]);
            });

            autoTable(doc, {
                startY: finalY,
                head: [['Elaboración (Receta)', 'Cant. Tot.', 'Lote']],
                body,
                theme: 'grid',
                headStyles: { fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 1.5, fillColor: [230, 230, 230], textColor: [0,0,0] },
                styles: { fontSize: 10, cellPadding: 1.5, lineColor: '#000', lineWidth: 0.1, valign: 'middle' },
                columnStyles: {
                    0: { cellWidth: 35 },
                    1: { cellWidth: 20, halign: 'right' },
                    2: { cellWidth: 'auto', halign: 'right' },
                }
            });
        });

        doc.save(`Etiquetas_Picking_${serviceOrder.serviceNumber}_${hito.descripcion}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el PDF.' });
    } finally {
        setIsPrinting(false);
    }
};

    if (!isMounted || !serviceOrder || !hito) {
        return <LoadingSkeleton title="Cargando Picking..." />;
    }
    
    const allocationsForHito = pickingState.itemStates.filter(state => state.hitoId === hitoId);
    const hasContentToPrint = allocationsForHito.length > 0;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/cpr/picking')} className="mb-2 no-print">
                        <ArrowLeft className="mr-2" /> Volver al listado
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <Package />
                        Hoja de Picking: {hito.descripcion} - {serviceOrder.serviceNumber}
                    </h1>
                    <CardDescription>
                        Cliente: {serviceOrder.client} | Fecha: {format(new Date(hito.fecha), 'dd/MM/yyyy')} a las {hito.horaInicio}
                    </CardDescription>
                </div>
                 <div className="flex gap-2 no-print">
                     <Select onValueChange={(value: PickingStatus) => handleStatusChange(value)} value={pickingState.status}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Estado..." />
                        </SelectTrigger>
                        <SelectContent>
                            {statusOptions.map(s => <SelectItem key={s} value={s} disabled={s !== 'Pendiente' && !isPickingComplete}><Badge variant={statusVariant[s]}>{s}</Badge></SelectItem>)}
                        </SelectContent>
                     </Select>
                    <Button onClick={handlePrint} disabled={!hasContentToPrint || isPrinting}>
                        {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Printer className="mr-2"/>}
                        {isPrinting ? 'Generando...' : 'Imprimir / PDF'}
                    </Button>
                    <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 className="mr-2"/> Reiniciar
                    </Button>
                </div>
            </div>
            
            {lotesPendientesCalidad.length > 0 && (
                 <Card className="mb-6 bg-yellow-50 border-yellow-200">
                    <CardHeader>
                        <CardTitle className="text-yellow-800">Lotes Pendientes de Control de Calidad</CardTitle>
                        <CardDescription className="text-yellow-700">
                            Los siguientes lotes son necesarios para este evento pero aún no han sido validados por Calidad. No se pueden añadir al picking.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {lotesPendientesCalidad.map(of => (
                                <Badge key={of.id} variant="secondary">{of.id} - {of.elaboracionNombre}</Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-8">
                 <Card className="print-section">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><Utensils />Necesidades para: {hito.descripcion}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {(Object.keys(expeditionTypeMap) as Array<keyof typeof expeditionTypeMap>).map(tipo => {
                            const lotesDePartida = lotesPendientes.filter(l => l.tipoExpedicion === tipo);
                            const contenedoresDePartida = pickingState.assignedContainers[tipo] || [];
                            
                            const allocationsForPartida = allocationsForHito.filter(alloc => lotesNecesarios.find(ln => ln.id === alloc.ofId)?.partidaAsignada === tipo);

                            if (lotesDePartida.length === 0 && allocationsForPartida.length === 0) {
                                return null;
                            }
                            
                            const info = expeditionTypeMap[tipo];

                            return (
                                <Card key={`${hito.id}-${tipo}`} className={cn(info.className)}>
                                    <CardHeader className="flex-row items-start justify-between">
                                        <CardTitle className="flex items-center gap-3 text-lg"><info.icon />{info.title}</CardTitle>
                                        <Dialog>
                                            <DialogTrigger asChild><Button size="sm" variant="outline" className="no-print bg-white/50"><PlusCircle className="mr-2"/>Asignar Contenedor</Button></DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader><DialogTitle>Seleccionar Contenedores para {info.title}</DialogTitle></DialogHeader>
                                                <Popover>
                                                    <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between">Añadir contenedor...<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                        <Command>
                                                            <CommandInput placeholder="Buscar contenedor..." /><CommandList><CommandEmpty>No hay contenedores.</CommandEmpty><CommandGroup>
                                                            {dbContainers.map(c => (<CommandItem key={c.id} onSelect={() => addContainerToSection(tipo, c)}>{c.nombre} ({c.id})</CommandItem>))}
                                                            </CommandGroup></CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </DialogContent>
                                        </Dialog>
                                    </CardHeader>
                                    <CardContent>
                                        {lotesDePartida.length > 0 && (
                                            <div className="mb-4">
                                                <h3 className="font-semibold mb-2">Lotes pendientes de asignar para este servicio</h3>
                                                <Table className="bg-white"><TableHeader><TableRow><TableHead>Lote (OF)</TableHead><TableHead>Elaboración</TableHead><TableHead className="text-right">Cant. Pendiente</TableHead><TableHead className="w-32 no-print"></TableHead></TableRow></TableHeader>
                                                    <TableBody>
                                                        {lotesDePartida.map(lote => (
                                                            <TableRow key={lote.ofId}>
                                                                <TableCell className="font-medium font-mono">{lote.ofId}</TableCell>
                                                                <TableCell>{lote.elaboracionNombre}</TableCell>
                                                                <TableCell className="text-right font-mono">{formatNumber(lote.cantidadNecesaria - lote.cantidadAsignada, 2)} {formatUnit(lote.unidad)}</TableCell>
                                                                <TableCell className="text-right no-print"><AllocationDialog lote={lote} containers={contenedoresDePartida} onAllocate={(of, cont, qty) => allocateLote(of, cont, qty)} /></TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                        <div className="space-y-4">
                                            {contenedoresDePartida.map(container => {
                                                const containerItems = pickingState.itemStates.filter(item => item.containerId === container.id && item.hitoId === hitoId);
                                                if(containerItems.length === 0) return null;
                                                return (
                                                    <div key={container.id}>
                                                        <h3 className="font-semibold mb-2 flex items-center gap-2">Contenedor: <Badge variant="secondary" className="text-base">{container.nombre} ({container.id})</Badge></h3>
                                                        <Table className="bg-white/70"><TableHeader><TableRow><TableHead>Lote (OF)</TableHead><TableHead>Elaboración</TableHead><TableHead>Receta</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead className="w-16 no-print"></TableHead></TableRow></TableHeader>
                                                            <TableBody>
                                                                {containerItems.length > 0 ? (
                                                                    containerItems.map(item => {
                                                                        const loteInfo = lotesNecesarios.find(l => l.id === item.ofId);
                                                                        return (
                                                                        <TableRow key={item.allocationId}>
                                                                            <TableCell className="font-medium font-mono">{item.ofId}</TableCell>
                                                                            <TableCell>{loteInfo?.elaboracionNombre}</TableCell>
                                                                            <TableCell className="text-xs text-muted-foreground">({getRecetaForElaboracion(loteInfo?.elaboracionId || '', osId)})</TableCell>
                                                                            <TableCell className="text-right font-mono">{formatNumber(item.quantity || 0, 2)} {loteInfo ? formatUnit(loteInfo.unidad) : ''}</TableCell>
                                                                            <TableCell className="no-print"><Button variant="ghost" size="sm" onClick={() => deallocateLote(item.allocationId)}>Quitar</Button></TableCell>
                                                                        </TableRow>
                                                                    )})
                                                                ) : (
                                                                     <TableRow><TableCell colSpan={5} className="text-center h-20 text-muted-foreground">Vacío</TableCell></TableRow>
                                                                )}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </CardContent>
                </Card>
            </div>
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Reiniciar el picking?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción desasignará todos los lotes de sus contenedores y vaciará la lista de contenedores asignados a este evento. Es útil si necesitas empezar la organización logística desde cero.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={handleDeletePicking}
                    >
                      Sí, reiniciar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}


    