'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package, ArrowLeft, ThermometerSnowflake, Archive, PlusCircle, ChevronsUpDown, Printer, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { ServiceOrder, GastronomyOrder, Receta, Elaboracion, ContenedorIsotermo, PickingState } from '@/types';
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


type ElaboracionNecesaria = {
    id: string;
    nombre: string;
    cantidad: number;
    unidad: string;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    recetaContenedora: string;
    isPicked: boolean;
    containerId?: string;
};

type AssignedContainer = {
    id: string;
    nombre: string;
}

export default function PickingDetailPage() {
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [necesidades, setNecesidades] = useState<ElaboracionNecesaria[]>([]);
    const [dbContainers, setDbContainers] = useState<ContenedorIsotermo[]>([]);
    const [assignedContainers, setAssignedContainers] = useState<{[key in Elaboracion['tipoExpedicion']]?: AssignedContainer[]}>({});
    const [isMounted, setIsMounted] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    
    const router = useRouter();
    const params = useParams();
    const osId = params.id as string;
    const { toast } = useToast();

    const savePickingState = useCallback((currentNecesidades: ElaboracionNecesaria[], currentContainers: typeof assignedContainers) => {
        if (!osId) return;
        const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as {[key: string]: PickingState};
        const newState: PickingState = {
            osId,
            assignedContainers: currentContainers,
            itemStates: currentNecesidades.map(n => ({ id: n.id, isPicked: n.isPicked, containerId: n.containerId }))
        };
        allPickingStates[osId] = newState;
        localStorage.setItem('pickingStates', JSON.stringify(allPickingStates));
    }, [osId]);

    useEffect(() => {
        if (osId) {
            const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
            const currentOS = allServiceOrders.find(os => os.id === osId);
            setServiceOrder(currentOS || null);

            const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
            const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
            const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
            const allContainers = JSON.parse(localStorage.getItem('contenedoresDB') || '[]') as ContenedorIsotermo[];
            setDbContainers(allContainers);
            
            const recetasMap = new Map(allRecetas.map(r => [r.id, r]));
            const elaboracionesMap = new Map(allElaboraciones.map(e => [e.id, e]));
            const osGastroOrders = allGastroOrders.filter(go => go.osId === osId);
            
            let initialNecesidades: ElaboracionNecesaria[] = [];

            osGastroOrders.forEach(order => {
                (order.items || []).forEach(item => {
                    if (item.type === 'item') {
                        const receta = recetasMap.get(item.id);
                        if (receta) {
                            receta.elaboraciones.forEach(elabEnReceta => {
                                const elaboracion = elaboracionesMap.get(elabEnReceta.elaboracionId);
                                if (elaboracion) {
                                    const cantidadNecesaria = (item.quantity || 0) * elabEnReceta.cantidad;
                                    initialNecesidades.push({
                                        id: elaboracion.id + '-' + receta.id,
                                        nombre: elaboracion.nombre,
                                        cantidad: cantidadNecesaria,
                                        unidad: elaboracion.unidadProduccion,
                                        tipoExpedicion: elaboracion.tipoExpedicion,
                                        recetaContenedora: receta.nombre,
                                        isPicked: false,
                                    });
                                }
                            });
                        }
                    }
                });
            });

            const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as {[key: string]: PickingState};
            const savedState = allPickingStates[osId];

            if (savedState) {
                setAssignedContainers(savedState.assignedContainers || {});
                const itemStatesMap = new Map(savedState.itemStates.map(s => [s.id, s]));
                initialNecesidades = initialNecesidades.map(n => {
                    const savedItemState = itemStatesMap.get(n.id);
                    return savedItemState ? { ...n, isPicked: savedItemState.isPicked, containerId: savedItemState.containerId } : n;
                })
            }

            setNecesidades(initialNecesidades);
        }
        setIsMounted(true);
    }, [osId]);

    const addContainerToSection = (tipo: Elaboracion['tipoExpedicion'], container: ContenedorIsotermo) => {
        setAssignedContainers(prev => {
            const currentSectionContainers = prev[tipo] || [];
            if(currentSectionContainers.some(c => c.id === container.id)) return prev;
            const newContainers = { ...prev, [tipo]: [...currentSectionContainers, container]};
            savePickingState(necesidades, newContainers);
            return newContainers;
        })
    };

    const assignElaboracionToContainer = (elaboracionId: string, containerId: string) => {
        const newNecesidades = necesidades.map(nec => 
            nec.id === elaboracionId ? { ...nec, isPicked: true, containerId: containerId } : nec
        );
        setNecesidades(newNecesidades);
        savePickingState(newNecesidades, assignedContainers);
        toast({title: "Asignado", description: "La elaboración ha sido asignada al contenedor."});
    };

    const unassignElaboracion = (elaboracionId: string) => {
        const newNecesidades = necesidades.map(nec => 
            nec.id === elaboracionId ? { ...nec, isPicked: false, containerId: undefined } : nec
        );
        setNecesidades(newNecesidades);
        savePickingState(newNecesidades, assignedContainers);
        toast({title: "Desasignado", description: "La elaboración ha sido devuelta a la lista de pendientes."});
    }

    const necesidadesAgrupadas = useMemo(() => {
        const grouped: {[key in Elaboracion['tipoExpedicion']]?: ElaboracionNecesaria[]} = {};
        necesidades.forEach(nec => {
            if (!grouped[nec.tipoExpedicion]) {
                grouped[nec.tipoExpedicion] = [];
            }
            grouped[nec.tipoExpedicion]!.push(nec);
        });
        return grouped;
    }, [necesidades]);

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
            for (const tipo of Object.keys(necesidadesAgrupadas) as Array<keyof typeof necesidadesAgrupadas>) {
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
                    const containerItems = necesidades.filter(n => n.containerId === container.id);
                    const head = [['Elaboración (Receta)', 'Cantidad']];
                    const body = containerItems.map(item => [
                        `${item.nombre} (${item.recetaContenedora})`, 
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
        REFRIGERADO: { title: "Refrigerado", icon: ThermometerSnowflake, className: "bg-blue-100 border-blue-200" },
        CONGELADO: { title: "Congelado", icon: ThermometerSnowflake, className: "bg-sky-100 border-sky-200" },
        SECO: { title: "Seco", icon: Archive, className: "bg-amber-100 border-amber-200" },
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
                {(Object.keys(necesidadesAgrupadas) as Array<keyof typeof necesidadesAgrupadas>).map(tipo => {
                    const sectionNeeds = necesidadesAgrupadas[tipo] || [];
                    const pendingNeeds = sectionNeeds.filter(n => !n.isPicked);
                    const info = expeditionTypeMap[tipo];
                    const sectionContainers = assignedContainers[tipo] || [];
                    if (sectionNeeds.length === 0) return null;

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
                                {pendingNeeds.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="font-semibold text-lg mb-2">Elaboraciones pendientes de asignar</h3>
                                        <Table className="bg-white">
                                            <TableHeader><TableRow><TableHead>Elaboración (Receta)</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead className="w-48 no-print"></TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {pendingNeeds.map(nec => (
                                                    <TableRow key={nec.id}>
                                                        <TableCell className="font-medium">{nec.nombre} <span className="text-muted-foreground text-xs">({nec.recetaContenedora})</span></TableCell>
                                                        <TableCell className="text-right font-mono">{nec.cantidad.toFixed(2)} {nec.unidad}</TableCell>
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
                                                                                    <CommandItem key={c.id} onSelect={() => assignElaboracionToContainer(nec.id, c.id)}>{c.nombre} ({c.id})</CommandItem>
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
                                        const containerItems = sectionNeeds.filter(n => n.containerId === container.id);
                                        return (
                                            <div key={container.id}>
                                                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">Contenedor: <Badge variant="secondary" className="text-base">{container.nombre} ({container.id})</Badge></h3>
                                                <Table className="bg-white/70">
                                                    <TableHeader><TableRow><TableHead>Elaboración (Receta)</TableHead><TableHead className="text-right">Cantidad</TableHead><TableHead className="w-16 no-print"></TableHead></TableRow></TableHeader>
                                                    <TableBody>
                                                         {containerItems.length === 0 ? (
                                                            <TableRow><TableCell colSpan={3} className="text-center h-20 text-muted-foreground">Vacío</TableCell></TableRow>
                                                         ) : (
                                                            containerItems.map(item => (
                                                                <TableRow key={item.id}>
                                                                    <TableCell className="font-medium">{item.nombre} <span className="text-muted-foreground text-xs">({item.recetaContenedora})</span></TableCell>
                                                                    <TableCell className="text-right font-mono">{item.cantidad.toFixed(2)} {item.unidad}</TableCell>
                                                                    <TableCell className="no-print"><Button variant="ghost" size="sm" onClick={() => unassignElaboracion(item.id)}>Quitar</Button></TableCell>
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
