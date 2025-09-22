'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package, ArrowLeft, ThermometerSnowflake, Archive, PlusCircle, ChevronsUpDown, Printer, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { ServiceOrder, OrdenFabricacion, ContenedorIsotermo, PickingState } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


type LoteDisponible = {
    ofId: string;
    elaboracionNombre: string;
    cantidad: number;
    unidad: string;
    tipoExpedicion: OrdenFabricacion['partidaAsignada']; // We'll approximate this from partida
    isPicked: boolean;
    containerId?: string;
};

type AssignedContainer = {
    id: string;
    nombre: string;
}

export default function PickingDetailPage() {
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [lotes, setLotes] = useState<LoteDisponible[]>([]);
    const [dbContainers, setDbContainers] = useState<ContenedorIsotermo[]>([]);
    const [assignedContainers, setAssignedContainers] = useState<{[key in 'FRIO' | 'CALIENTE' | 'PASTELERIA']?: AssignedContainer[]}>({});
    const [isMounted, setIsMounted] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    
    const router = useRouter();
    const params = useParams();
    const osId = params.id as string;
    const { toast } = useToast();

    const savePickingState = useCallback((currentLotes: LoteDisponible[], currentContainers: typeof assignedContainers) => {
        if (!osId) return;
        const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as {[key: string]: PickingState};
        const newState: PickingState = {
            osId,
            assignedContainers: currentContainers,
            itemStates: currentLotes.map(n => ({ id: n.ofId, isPicked: n.isPicked, containerId: n.containerId }))
        };
        allPickingStates[osId] = newState;
        localStorage.setItem('pickingStates', JSON.stringify(allPickingStates));
    }, [osId]);

    useEffect(() => {
        if (osId) {
            const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
            const currentOS = allServiceOrders.find(os => os.id === osId);
            setServiceOrder(currentOS || null);

            const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
            const allContainers = JSON.parse(localStorage.getItem('contenedoresDB') || '[]') as ContenedorIsotermo[];
            setDbContainers(allContainers);
            
            const osOFs = allOFs.filter(of => of.osIDs.includes(osId) && of.estado === 'Validado');

            let initialLotes: LoteDisponible[] = osOFs.map(of => ({
                ofId: of.id,
                elaboracionNombre: of.elaboracionNombre,
                cantidad: of.cantidadReal || of.cantidadTotal,
                unidad: of.unidad,
                tipoExpedicion: of.partidaAsignada, // Approximation
                isPicked: false,
            }));

            const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as {[key: string]: PickingState};
            const savedState = allPickingStates[osId];

            if (savedState) {
                setAssignedContainers(savedState.assignedContainers || {});
                const itemStatesMap = new Map(savedState.itemStates.map(s => [s.id, s]));
                initialLotes = initialLotes.map(lote => {
                    const savedItemState = itemStatesMap.get(lote.ofId);
                    return savedItemState ? { ...lote, isPicked: savedItemState.isPicked, containerId: savedItemState.containerId } : lote;
                })
            }

            setLotes(initialLotes);
        }
        setIsMounted(true);
    }, [osId]);

    const addContainerToSection = (tipo: LoteDisponible['tipoExpedicion'], container: ContenedorIsotermo) => {
        setAssignedContainers(prev => {
            const currentSectionContainers = prev[tipo] || [];
            if(currentSectionContainers.some(c => c.id === container.id)) return prev;
            const newContainers = { ...prev, [tipo]: [...currentSectionContainers, container]};
            savePickingState(lotes, newContainers);
            return newContainers;
        })
    };

    const assignLoteToContainer = (ofId: string, containerId: string) => {
        const newLotes = lotes.map(lote => 
            lote.ofId === ofId ? { ...lote, isPicked: true, containerId: containerId } : lote
        );
        setLotes(newLotes);
        savePickingState(newLotes, assignedContainers);
        toast({title: "Asignado", description: `El lote ${ofId} ha sido asignado al contenedor.`});
    };

    const unassignLote = (ofId: string) => {
        const newLotes = lotes.map(lote => 
            lote.ofId === ofId ? { ...lote, isPicked: false, containerId: undefined } : lote
        );
        setLotes(newLotes);
        savePickingState(newLotes, assignedContainers);
        toast({title: "Desasignado", description: `El lote ${ofId} ha sido devuelto a la lista de pendientes.`});
    }

    const lotesAgrupados = useMemo(() => {
        const grouped: {[key in LoteDisponible['tipoExpedicion']]?: LoteDisponible[]} = {};
        lotes.forEach(lote => {
            const tipo = lote.tipoExpedicion;
            if (!grouped[tipo]) {
                grouped[tipo] = [];
            }
            grouped[tipo]!.push(lote);
        });
        return grouped;
    }, [lotes]);

    const handlePrint = async () => {
        if (!serviceOrder) return;
        setIsPrinting(true);
        try {
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const margin = 15;
            const pageWidth = doc.internal.pageSize.getWidth();
            let finalY = margin;

            // Header
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(`Hoja de Picking: ${serviceOrder.serviceNumber}`, margin, finalY);
            finalY += 10;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Cliente: ${serviceOrder.client}`, margin, finalY);
            doc.text(`Fecha: ${format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')}`, pageWidth - margin, finalY, { align: 'right' });
            finalY += 10;

            // Sections
            for (const tipo of Object.keys(lotesAgrupados) as Array<keyof typeof lotesAgrupados>) {
                const sectionContainers = assignedContainers[tipo] || [];
                if (sectionContainers.length === 0) continue;

                if (finalY + 20 > doc.internal.pageSize.getHeight()) {
                    doc.addPage();
                    finalY = margin;
                }

                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(tipo, margin, finalY);
                finalY += 8;

                sectionContainers.forEach(container => {
                    const containerItems = lotes.filter(n => n.containerId === container.id);
                    const head = [['Lote (OF)', 'Elaboración', 'Cantidad']];
                    const body = containerItems.map(item => [
                        item.ofId,
                        item.elaboracionNombre, 
                        `${item.cantidad.toFixed(2)} ${item.unidad}`
                    ]);

                     if (finalY + body.length * 8 + 20 > doc.internal.pageSize.getHeight()) {
                        doc.addPage();
                        finalY = margin;
                    }

                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Contenedor: ${container.nombre} (${container.id})`, margin, finalY);
                    finalY += 6;
                    
                    autoTable(doc, {
                        head,
                        body,
                        startY: finalY,
                        theme: 'grid',
                        headStyles: { fillColor: '#e5e7eb', textColor: '#374151' }
                    });
                    finalY = (doc as any).lastAutoTable.finalY + 10;
                });
            }
            
            doc.save(`Picking_${serviceOrder.serviceNumber}.pdf`);

        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: "No se pudo generar el PDF." });
        } finally {
            setIsPrinting(false);
        }
    };


    if (!isMounted || !serviceOrder) {
        return <LoadingSkeleton title="Cargando Picking..." />;
    }

    const expeditionTypeMap = {
        FRIO: { title: "Partida Frío", icon: ThermometerSnowflake, className: "bg-blue-100 border-blue-200" },
        CALIENTE: { title: "Partida Caliente", icon: ThermometerSnowflake, className: "bg-red-100 border-red-200" },
        PASTELERIA: { title: "Partida Pastelería", icon: Archive, className: "bg-pink-100 border-pink-200" },
        EXPEDICION: { title: "Partida Expedición", icon: Package, className: "bg-gray-100 border-gray-200" },
    };

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
                <Button onClick={handlePrint} className="no-print" disabled={isPrinting}>
                    {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Printer className="mr-2"/>}
                    {isPrinting ? 'Generando...' : 'Imprimir / PDF'}
                </Button>
            </div>

            <div className="space-y-8">
                {(Object.keys(lotesAgrupados) as Array<keyof typeof lotesAgrupados>).map(tipo => {
                    const sectionLotes = lotesAgrupados[tipo] || [];
                    const pendingLotes = sectionLotes.filter(n => !n.isPicked);
                    const info = expeditionTypeMap[tipo];
                    const sectionContainers = assignedContainers[tipo] || [];
                    if (sectionLotes.length === 0) return null;

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
                                        <div className="space-y-2 py-4">
                                            {dbContainers.map(c => (
                                                 <div key={c.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`cont-${c.id}`}
                                                        checked={sectionContainers.some(sc => sc.id === c.id)}
                                                        onCheckedChange={(checked) => {
                                                            if(checked) { addContainerToSection(tipo, c) }
                                                            // Logic to remove would be here, if needed
                                                        }}
                                                    />
                                                    <label htmlFor={`cont-${c.id}`} className="font-medium">{c.nombre} <span className="text-muted-foreground">({c.id})</span></label>
                                                </div>
                                            ))}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent>
                                {pendingLotes.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="font-semibold text-lg mb-2">Lotes pendientes de asignar</h3>
                                        <Table className="bg-white">
                                            <TableHeader><TableRow><TableHead>Lote (OF)</TableHead><TableHead>Elaboración</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead className="w-48 no-print"></TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {pendingLotes.map(lote => (
                                                    <TableRow key={lote.ofId}>
                                                        <TableCell className="font-medium font-mono">{lote.ofId}</TableCell>
                                                        <TableCell>{lote.elaboracionNombre}</TableCell>
                                                        <TableCell className="text-right font-mono">{lote.cantidad.toFixed(2)} {lote.unidad}</TableCell>
                                                         <TableCell className="text-right no-print">
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="secondary" size="sm" disabled={sectionContainers.length === 0}>Asignar</Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-56 p-0">
                                                                     <Command>
                                                                        <CommandInput placeholder="Buscar contenedor..."/>
                                                                        <CommandList>
                                                                            <CommandEmpty>No hay contenedores.</CommandEmpty>
                                                                            <CommandGroup>
                                                                                {sectionContainers.map(c => (
                                                                                    <CommandItem key={c.id} onSelect={() => assignLoteToContainer(lote.ofId, c.id)}>{c.nombre} ({c.id})</CommandItem>
                                                                                ))}
                                                                            </CommandGroup>
                                                                        </CommandList>
                                                                    </Command>
                                                                </PopoverContent>
                                                            </Popover>
                                                         </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                                
                                <div className="space-y-6">
                                    {sectionContainers.map(container => {
                                        const containerItems = sectionLotes.filter(n => n.containerId === container.id);
                                        return (
                                            <div key={container.id}>
                                                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">Contenedor: <Badge variant="secondary" className="text-base">{container.nombre} ({container.id})</Badge></h3>
                                                <Table className="bg-white/70">
                                                    <TableHeader><TableRow><TableHead>Lote (OF)</TableHead><TableHead>Elaboración</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead className="w-16 no-print"></TableHead></TableRow></TableHeader>
                                                    <TableBody>
                                                         {containerItems.length === 0 ? (
                                                            <TableRow><TableCell colSpan={4} className="text-center h-20 text-muted-foreground">Vacío</TableCell></TableRow>
                                                         ) : (
                                                            containerItems.map(item => (
                                                                <TableRow key={item.ofId}>
                                                                    <TableCell className="font-medium font-mono">{item.ofId}</TableCell>
                                                                    <TableCell>{item.elaboracionNombre}</TableCell>
                                                                    <TableCell className="text-right font-mono">{item.cantidad.toFixed(2)} {item.unidad}</TableCell>
                                                                    <TableCell className="no-print"><Button variant="ghost" size="sm" onClick={() => unassignLote(item.ofId)}>Quitar</Button></TableCell>
                                                                </TableRow>
                                                            ))
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
        </div>
    );
}
