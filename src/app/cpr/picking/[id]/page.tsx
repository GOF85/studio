

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package, ArrowLeft, ThermometerSnowflake, Archive, PlusCircle, ChevronsUpDown, Printer, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { ServiceOrder, OrdenFabricacion, ContenedorIsotermo, PickingState, LoteAsignado, Elaboracion, ComercialBriefing, GastronomyOrder, Receta } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

type LotePendiente = {
    ofId: string;
    elaboracionNombre: string;
    cantidadTotal: number;
    cantidadAsignada: number;
    unidad: string;
    tipoExpedicion: 'FRIO' | 'CALIENTE' | 'PASTELERIA' | 'EXPEDICION';
};

const expeditionTypeMap = {
    FRIO: { title: "Partida Frío", icon: ThermometerSnowflake, className: "bg-blue-100 border-blue-200" },
    CALIENTE: { title: "Partida Caliente", icon: ThermometerSnowflake, className: "bg-red-100 border-red-200" },
    PASTELERIA: { title: "Partida Pastelería", icon: Archive, className: "bg-pink-100 border-pink-200" },
    EXPEDICION: { title: "Partida Expedición", icon: Package, className: "bg-gray-100 border-gray-200" },
};

function AllocationDialog({ lote, containers, onAllocate }: { lote: LotePendiente, containers: ContenedorIsotermo[], onAllocate: (ofId: string, containerId: string, quantity: number) => void }) {
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
    const initialQuantity = Number(lote.cantidadTotal) - Number(lote.cantidadAsignada);
    const [quantity, setQuantity] = useState(isNaN(initialQuantity) ? 0 : initialQuantity);
    const [open, setOpen] = useState(false);

    const handleAllocate = () => {
        if (!selectedContainerId) {
            alert("Por favor, selecciona un contenedor.");
            return;
        }
        if (quantity <= 0 || quantity > (Number(lote.cantidadTotal) - Number(lote.cantidadAsignada))) {
            alert("La cantidad no es válida.");
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
                        <div className="flex justify-between text-sm"><span>Cantidad Total Lote:</span> <span className="font-bold">{Number(lote.cantidadTotal).toFixed(2)} {lote.unidad}</span></div>
                        <div className="flex justify-between text-sm"><span>Ya Asignado:</span> <span className="font-bold">{Number(lote.cantidadAsignada).toFixed(2)} {lote.unidad}</span></div>
                        <div className="flex justify-between text-sm font-semibold mt-1 pt-1 border-t"><span>Pendiente de Asignar:</span> <span>{(Number(lote.cantidadTotal) - Number(lote.cantidadAsignada)).toFixed(2)} {lote.unidad}</span></div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quantity-to-allocate">Cantidad a Asignar</Label>
                        <Input id="quantity-to-allocate" type="number" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value))} max={Number(lote.cantidadTotal) - Number(lote.cantidadAsignada)} min="0.01" step="0.01" />
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
    const [lotesNecesarios, setLotesNecesarios] = useState<OrdenFabricacion[]>([]);
    const [dbContainers, setDbContainers] = useState<ContenedorIsotermo[]>([]);
    const [gastroOrder, setGastroOrder] = useState<GastronomyOrder | null>(null);
    const [pickingState, setPickingState] = useState<PickingState>({ osId: '', assignedContainers: {}, itemStates: [] });
    const [isMounted, setIsMounted] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const router = useRouter();
    const params = useParams();
    const osId = params.id as string;
    const { toast } = useToast();

    const savePickingState = useCallback((newState: PickingState) => {
        if (!osId) return;
        const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as {[key: string]: PickingState};
        allPickingStates[osId] = newState;
        localStorage.setItem('pickingStates', JSON.stringify(allPickingStates));
        setPickingState(newState);
    }, [osId]);

    useEffect(() => {
        if (osId) {
            const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
            const currentOS = allServiceOrders.find(os => os.id === osId);
            setServiceOrder(currentOS || null);

            const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
            const allContainers = JSON.parse(localStorage.getItem('contenedoresDB') || '[]') as ContenedorIsotermo[];
            setDbContainers(allContainers);
            
            const osOFs = allOFs.filter(of => of.osIDs.includes(osId));
            setLotesNecesarios(osOFs);
            
            const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
            const currentGastroOrder = allGastroOrders.find(go => go.osId === osId);
            setGastroOrder(currentGastroOrder || null);

            const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as {[key: string]: PickingState};
            const savedState = allPickingStates[osId];
            if (savedState) {
                setPickingState(savedState);
            } else {
                setPickingState({ osId, assignedContainers: {}, itemStates: [] });
            }
        }
        setIsMounted(true);
    }, [osId]);
    
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
        const newAllocation: LoteAsignado = { allocationId: Date.now().toString(), ofId, containerId, quantity };
        const newItemStates = [...pickingState.itemStates, newAllocation];
        savePickingState({ ...pickingState, itemStates: newItemStates });
        toast({ title: 'Lote Asignado', description: `Se asignaron ${quantity.toFixed(2)} unidades al contenedor.`});
    }
    
    const deallocateLote = (allocationId: string) => {
        const newItemStates = pickingState.itemStates.filter(a => a.allocationId !== allocationId);
        savePickingState({ ...pickingState, itemStates: newItemStates });
    }

    const lotesPendientes = useMemo(() => {
    return lotesNecesarios
      .filter(
        (of) =>
          (of.estado === 'Finalizado' ||
            of.estado === 'Validado' ||
            (of.incidencia && of.cantidadReal !== null && of.cantidadReal > 0))
      )
      .map((of) => {
        const cantidadTotal = Number(of.cantidadReal ?? of.cantidadTotal);
        const cantidadAsignada = pickingState.itemStates
          .filter((a) => a.ofId === of.id)
          .reduce((sum, a) => sum + Number(a.quantity), 0);

        return {
          ofId: of.id,
          elaboracionNombre: of.elaboracionNombre,
          cantidadTotal: cantidadTotal,
          cantidadAsignada: cantidadAsignada,
          unidad: of.unidad,
          tipoExpedicion: of.partidaAsignada,
        };
      })
      .filter((lote) => lote.cantidadTotal - lote.cantidadAsignada > 0.001);
  }, [lotesNecesarios, pickingState.itemStates]);
    
    const lotesPorPartida = useMemo(() => {
        const grouped: {[key in keyof typeof expeditionTypeMap]?: LotePendiente[]} = {};
         lotesPendientes.forEach(lote => {
            const tipo = lote.tipoExpedicion;
            if (!grouped[tipo]) grouped[tipo] = [];
            grouped[tipo]!.push(lote);
        });
        return grouped;
    }, [lotesPendientes]);
    
     const handleDeletePicking = () => {
        savePickingState({ osId, assignedContainers: {}, itemStates: [] });
        toast({ title: "Picking Reiniciado", description: "Se han desasignado todos los lotes y contenedores."});
        setShowDeleteConfirm(false);
    }
    
const handlePrint = async () => {
    if (!serviceOrder) return;
    setIsPrinting(true);

    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });
        const allAssignedContainers = Object.values(pickingState.assignedContainers).flat();
        
        allAssignedContainers.forEach((container, index) => {
            if (index > 0) doc.addPage();

            const margin = 5;
            const pageWidth = doc.internal.pageSize.getWidth();
            let finalY = margin + 2;

            // --- HEADER ---
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(container.nombre, margin, finalY);
            doc.text(`${index + 1}/${allAssignedContainers.length}`, pageWidth - margin, finalY, { align: 'right' });
            finalY += 3;
            
            doc.setLineWidth(0.5);
            doc.setDrawColor(0, 0, 0);
            doc.line(margin, finalY, pageWidth - margin, finalY);
            finalY += 4;

            // --- EVENT INFO ---
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            
            const serviceData = [
                ['Nº Serv:', serviceOrder.serviceNumber, 'Fecha:', format(new Date(serviceOrder.startDate), 'dd/MM/yy')],
                ['Cliente:', serviceOrder.client, 'PAX:', String(serviceOrder.asistentes)],
                ['Espacio:', serviceOrder.space || '-', 'Sala:', 'Pendiente'],
            ];

             autoTable(doc, {
                body: serviceData,
                startY: finalY,
                theme: 'plain',
                styles: { fontSize: 8, cellPadding: 0.2 },
                columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } }
            });
            finalY = (doc as any).lastAutoTable.finalY + 3;

            doc.setLineWidth(0.2);
            doc.line(margin, finalY, pageWidth - margin, finalY);
            finalY += 5;

            // --- CONTENT TABLE ---
            const containerItems = pickingState.itemStates.filter(item => item.containerId === container.id);
            const itemsGroupedByRecipe = new Map<string, { totalQuantity: number, lotes: string[], unidad: string }>();

            containerItems.forEach(assignedLote => {
                const loteInfo = lotesNecesarios.find(l => l.id === assignedLote.ofId);
                if (loteInfo) {
                    const key = loteInfo.elaboracionNombre;
                    if (!itemsGroupedByRecipe.has(key)) {
                        itemsGroupedByRecipe.set(key, { totalQuantity: 0, lotes: [], unidad: loteInfo.unidad });
                    }
                    const entry = itemsGroupedByRecipe.get(key)!;
                    entry.totalQuantity += assignedLote.quantity;
                    entry.lotes.push(loteInfo.id);
                }
            });

            const body: any[] = [];
            itemsGroupedByRecipe.forEach((data, elabName) => {
                 body.push([
                    elabName, 
                    `${data.totalQuantity.toFixed(2)} ${data.unidad}`, 
                    data.lotes.join(', ')
                ]);
            });

            autoTable(doc, {
                startY: finalY,
                head: [['Elaboración', 'Cant. Tot.', 'Lote']],
                body,
                theme: 'striped',
                headStyles: { fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 1, fillColor: [230, 230, 230], textColor: [0,0,0] },
                styles: { fontSize: 9, cellPadding: 1.5, lineColor: '#000', lineWidth: 0.1 },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 20, halign: 'right' },
                    2: { cellWidth: 40, halign: 'right' },
                }
            });
        });

        doc.save(`Etiquetas_Picking_${serviceOrder.serviceNumber}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el PDF.' });
    } finally {
        setIsPrinting(false);
    }
};

    if (!isMounted || !serviceOrder) {
        return <LoadingSkeleton title="Cargando Picking..." />;
    }

    const hasContentToPrint = pickingState.itemStates.length > 0;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/cpr/picking')} className="mb-2 no-print">
                        <ArrowLeft className="mr-2" /> Volver al listado
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <Package />
                        Hoja de Picking: {serviceOrder.serviceNumber}
                    </h1>
                    <CardDescription>
                        Cliente: {serviceOrder.client} | Fecha: {format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')}
                    </CardDescription>
                </div>
                 <div className="flex gap-2 no-print">
                    <Button onClick={handlePrint} disabled={!hasContentToPrint || isPrinting}>
                        {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Printer className="mr-2"/>}
                        {isPrinting ? 'Generando...' : 'Imprimir / PDF'}
                    </Button>
                    <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 className="mr-2"/> Reiniciar Picking
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
                {(Object.keys(expeditionTypeMap) as Array<keyof typeof expeditionTypeMap>).map(tipo => {
                    const lotesDePartida = lotesPorPartida[tipo] || [];
                    const contenedoresDePartida = pickingState.assignedContainers[tipo] || [];
                    const info = expeditionTypeMap[tipo];
                    
                    if (lotesDePartida.length === 0 && contenedoresDePartida.length === 0 && !Object.values(pickingState.assignedContainers).flat().some(ac => pickingState.itemStates.some(is => is.containerId === ac.id && lotesNecesarios.find(ln => ln.id === is.ofId)?.partidaAsignada === tipo))) {
                        return null;
                    }

                    return (
                        <Card key={tipo} className={cn(info.className, "print-section")}>
                            <CardHeader className="flex-row items-start justify-between">
                                <CardTitle className="flex items-center gap-3">
                                    <info.icon />
                                    {info.title}
                                </CardTitle>
                                 <Dialog>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="no-print bg-white/50"><PlusCircle className="mr-2"/>Asignar Contenedor</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>Seleccionar Contenedores para {info.title}</DialogTitle></DialogHeader>
                                         <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                                    Añadir contenedor...
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Buscar contenedor..." />
                                                    <CommandList>
                                                        <CommandEmpty>No hay contenedores.</CommandEmpty>
                                                        <CommandGroup>
                                                            {dbContainers.map(c => (
                                                                <CommandItem key={c.id} onSelect={() => addContainerToSection(tipo, c)}>{c.nombre} ({c.id})</CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent>
                                {lotesDePartida.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="font-semibold text-lg mb-2">Lotes pendientes de asignar</h3>
                                        <Table className="bg-white">
                                            <TableHeader><TableRow><TableHead>Lote (OF)</TableHead><TableHead>Elaboración</TableHead><TableHead className="text-right">Cant. Pendiente</TableHead><TableHead className="w-32 no-print"></TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {lotesDePartida.map(lote => (
                                                    <TableRow key={lote.ofId}>
                                                        <TableCell className="font-medium font-mono">{lote.ofId}</TableCell>
                                                        <TableCell>{lote.elaboracionNombre}</TableCell>
                                                        <TableCell className="text-right font-mono">{(Number(lote.cantidadTotal) - Number(lote.cantidadAsignada)).toFixed(2)} {lote.unidad}</TableCell>
                                                        <TableCell className="text-right no-print">
                                                            <AllocationDialog lote={lote} containers={contenedoresDePartida} onAllocate={allocateLote} />
                                                         </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                                
                                <div className="space-y-6">
                                    {contenedoresDePartida.map(container => {
                                        const containerItems = pickingState.itemStates.filter(item => item.containerId === container.id);
                                        return (
                                            <div key={container.id}>
                                                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">Contenedor: <Badge variant="secondary" className="text-base">{container.nombre} ({container.id})</Badge></h3>
                                                <Table className="bg-white/70">
                                                    <TableHeader><TableRow><TableHead>Lote (OF)</TableHead><TableHead>Elaboración</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead className="w-16 no-print"></TableHead></TableRow></TableHeader>
                                                    <TableBody>
                                                         {containerItems.length === 0 ? (
                                                            <TableRow><TableCell colSpan={4} className="text-center h-20 text-muted-foreground">Vacío</TableCell></TableRow>
                                                         ) : (
                                                            containerItems.map(item => {
                                                                const loteInfo = lotesNecesarios.find(l => l.id === item.ofId);
                                                                return (
                                                                <TableRow key={item.allocationId}>
                                                                    <TableCell className="font-medium font-mono">{item.ofId}</TableCell>
                                                                    <TableCell>{loteInfo?.elaboracionNombre}</TableCell>
                                                                    <TableCell className="text-right font-mono">{(item.quantity || 0).toFixed(2)} {loteInfo?.unidad}</TableCell>
                                                                    <TableCell className="no-print"><Button variant="ghost" size="sm" onClick={() => deallocateLote(item.allocationId)}>Quitar</Button></TableCell>
                                                                </TableRow>
                                                            )})
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

    
