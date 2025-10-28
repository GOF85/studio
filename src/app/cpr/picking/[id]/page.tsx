

'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Package, ArrowLeft, Thermometer, Box, Snowflake, PlusCircle, Printer, Loader2, Trash2, Check, Utensils, Building, Phone, Sprout, AlertTriangle, FileText, Tags, Menu } from 'lucide-react';
import { format } from 'date-fns';
import type { ServiceOrder, OrdenFabricacion, ContenedorIsotermo, PickingState, LoteAsignado, Elaboracion, ComercialBriefing, GastronomyOrder, Receta, PickingStatus, Espacio, ComercialBriefingItem, ContenedorDinamico, Alergeno, IngredienteInterno, ArticuloERP } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNumber, formatUnit } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { Separator } from '@/components/ui/separator';


type LotePendiente = {
    ofId: string;
    elaboracionId: string;
    elaboracionNombre: string;
    cantidadNecesaria: number; // Necesidad total para esta entrega
    cantidadAsignada: number; // Total asignado a contenedores para esta entrega
    unidad: string;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    recetas: { nombre: string, cantidad: number }[];
    alergenos: Alergeno[];
};

const expeditionTypeMap = {
    REFRIGERADO: { title: "Partida Refrigerado", icon: Thermometer, className: "bg-blue-100 border-blue-200" },
    CONGELADO: { title: "Partida Congelado", icon: Snowflake, className: "bg-sky-100 border-sky-200" },
    SECO: { title: "Partida Seco", icon: Box, className: "bg-yellow-100 border-yellow-200" },
};

export const statusOptions: PickingStatus[] = ['Pendiente', 'Preparado'];
export const statusVariant: { [key in PickingStatus]: 'success' | 'secondary' } = {
  Pendiente: 'secondary',
  Preparado: 'success',
};

function AllocationDialog({ lote, containers, onAllocate, onAddContainer }: { lote: LotePendiente, containers: ContenedorDinamico[], onAllocate: (containerId: string, quantity: number) => void, onAddContainer: () => string }) {
    const cantidadPendiente = Math.ceil((lote.cantidadNecesaria - lote.cantidadAsignada) * 100) / 100;
    const [quantity, setQuantity] = useState(Math.max(0, cantidadPendiente));
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const handleAllocate = () => {
        if (!selectedContainerId) {
            toast({variant: 'destructive', title: 'Error', description: "Por favor, selecciona un contenedor."});
            return;
        }
        if (quantity <= 0 || quantity > cantidadPendiente + 0.001) { // Add tolerance for float issues
            toast({variant: 'destructive', title: 'Error', description: `La cantidad debe estar entre 0.01 y ${formatNumber(cantidadPendiente, 2)}.`});
            return;
        }
        onAllocate(selectedContainerId, quantity);
        setOpen(false);
    }
    
    const handleAddNewContainer = () => {
      const newContainerId = onAddContainer();
      setSelectedContainerId(newContainerId);
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
                        <Input id="quantity-to-allocate" type="number" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} max={cantidadPendiente} min="0.01" step="0.01" />
                    </div>
                    <div className="space-y-2">
                        <Label>Contenedor de Destino</Label>
                        <div className="flex gap-2">
                            <Select onValueChange={setSelectedContainerId} value={selectedContainerId || undefined}>
                                <SelectTrigger className="flex-grow">
                                    <SelectValue placeholder="Seleccionar contenedor..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {containers.map(c => <SelectItem key={c.id} value={c.id}>Contenedor {c.numero}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" type="button" onClick={handleAddNewContainer}><PlusCircle className="mr-2"/>Añadir Contenedor</Button>
                        </div>
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

const calculateElabAlergenos = (elaboracion: Elaboracion, ingredientesMap: Map<string, IngredienteInterno>): Alergeno[] => {
    if (!elaboracion || !elaboracion.componentes) {
      return [];
    }
    const elabAlergenos = new Set<Alergeno>();
    elaboracion.componentes.forEach(comp => {
        if(comp.tipo === 'ingrediente') {
            const ingData = ingredientesMap.get(comp.componenteId);
            if (ingData) {
              (ingData.alergenosPresentes || []).forEach(a => elabAlergenos.add(a));
              (ingData.alergenosTrazas || []).forEach(a => elabAlergenos.add(a));
            }
        }
    });
    return Array.from(elabAlergenos);
};

export default function PickingDetailPage() {
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [hitosConNecesidades, setHitosConNecesidades] = useState<ComercialBriefingItem[]>([]);
    const [pickingState, setPickingState] = useState<PickingState>({ osId: '', status: 'Pendiente', assignedContainers: [], itemStates: [] });
    const [isMounted, setIsMounted] = useState(false);
    const [printingHito, setPrintingHito] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const router = useRouter();
    const params = useParams();
    const osId = params.id as string;
    const { toast } = useToast();

    const savePickingState = useCallback((newState: Partial<PickingState>) => {
        if (!osId) return;
        const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as {[key: string]: PickingState};
        const currentState = allPickingStates[osId] || { osId, status: 'Pendiente', assignedContainers: [], itemStates: [] };
        const updatedState = { ...currentState, ...newState };
        allPickingStates[osId] = updatedState;
        localStorage.setItem('pickingStates', JSON.stringify(allPickingStates));
        setPickingState(updatedState);
    }, [osId]);

    const handleStatusChange = (newStatus: PickingStatus) => {
        savePickingState({ status: newStatus });
        toast({title: "Estado Actualizado", description: `El estado del picking es ahora: ${newStatus}`});
    }
    
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
        return 'Directa';
    }, []);

    const lotesNecesarios = useMemo(() => {
        if (!isMounted) return [];
        const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        const allElabs = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
        const ingredientesMap = new Map(storedInternos.map(i => [i.id, i]));
        const elabsMap = new Map(allElabs.map(e => [e.id, e]));

        return allOFs
            .map(of => {
                const elab = elabsMap.get(of.elaboracionId);
                return {
                    ...of, 
                    tipoExpedicion: elab?.tipoExpedicion || 'SECO',
                    alergenos: elab ? calculateElabAlergenos(elab, ingredientesMap) : []
                }
            });

    }, [osId, isMounted]);

    useEffect(() => {
        if (osId) {
            const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
            const currentOS = allServiceOrders.find(os => os.id === osId);
            setServiceOrder(currentOS || null);

            
            const allBriefings = (JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[]);
            const currentBriefing = allBriefings.find(b => b.osId === osId);
            const gastronomicHitos = currentBriefing?.items.filter(i => i.conGastronomia) || [];
            setHitosConNecesidades(gastronomicHitos);
            
            const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as {[key: string]: PickingState};
            const savedState = allPickingStates[osId];
            if (savedState) {
                setPickingState(savedState);
            }
        }
        setIsMounted(true);
    }, [osId, savePickingState]); 

    const { lotesPendientesPorHito, isPickingComplete } = useMemo(() => {
        const lotesPendientesPorHito = new Map<string, LotePendiente[]>();
        if (!isMounted || !hitosConNecesidades.length) {
            return { lotesPendientesPorHito, isPickingComplete: true };
        }
    
        const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
        const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    
        let allComplete = true;
    
        hitosConNecesidades.forEach(hito => {
            const necesidadesHito: Map<string, LotePendiente> = new Map();
            const gastroOrder = allGastroOrders.find(go => go.id === hito.id);
    
            if (gastroOrder && gastroOrder.items) {
                gastroOrder.items.forEach(item => {
                    if (item.type === 'item') {
                        const receta = allRecetas.find(r => r.id === item.id);
                        if (receta) {
                            receta.elaboraciones.forEach(elabEnReceta => {
                                const elabInfo = allElaboraciones.find(e => e.id === elabEnReceta.elaboracionId);
                                if (elabInfo) {
                                    const cantidadNecesaria = Number(item.quantity || 0) * elabEnReceta.cantidad;
                                    if(cantidadNecesaria < 0.01) return;
    
                                    let existing = necesidadesHito.get(elabInfo.id);
                                    
                                    const validOFs = lotesNecesarios.filter(o => o.elaboracionId === elabInfo.id && (o.estado === 'Validado'));
                                    const of = validOFs.length > 0 ? validOFs[0] : lotesNecesarios.find(o => o.elaboracionId === elabInfo.id);

                                    if(!existing) {
                                        existing = {
                                            ofId: of?.id || 'NO-OF',
                                            elaboracionId: elabInfo.id,
                                            elaboracionNombre: elabInfo.nombre,
                                            cantidadNecesaria: 0,
                                            cantidadAsignada: 0,
                                            unidad: elabInfo.unidadProduccion,
                                            tipoExpedicion: elabInfo.tipoExpedicion,
                                            recetas: [],
                                            alergenos: of?.alergenos || []
                                        };
                                        necesidadesHito.set(elabInfo.id, existing);
                                    }
    
                                    existing.cantidadNecesaria += cantidadNecesaria;
                                    const recetaEnNecesidad = existing.recetas.find(r => r.nombre === receta.nombre);
                                    if (recetaEnNecesidad) {
                                        recetaEnNecesidad.cantidad += item.quantity || 0;
                                    } else {
                                        existing.recetas.push({nombre: receta.nombre, cantidad: item.quantity || 0});
                                    }
                                }
                            });
                        }
                    }
                });
            }
    
            const lotesPendientesHito = Array.from(necesidadesHito.values()).map(necesidad => {
                const cantidadAsignadaTotal = pickingState.itemStates
                    .filter(a => lotesNecesarios.find(l => l.id === a.ofId)?.elaboracionId === necesidad.elaboracionId && a.hitoId === hito.id)
                    .reduce((sum, a) => sum + a.quantity, 0) || 0;
                
                return { ...necesidad, cantidadAsignada: cantidadAsignadaTotal };
            }).filter(lote => {
                const of = lotesNecesarios.find(o => o.elaboracionId === lote.elaboracionId && (o.estado === 'Validado'));
                if (!of) return false;
                
                const isReadyForPicking = true;
                const cantidadPendiente = lote.cantidadNecesaria - lote.cantidadAsignada;
                return cantidadPendiente > 0.001 && isReadyForPicking;
            });
            
            if (lotesPendientesHito.length > 0) {
                allComplete = false;
            }
    
            lotesPendientesPorHito.set(hito.id, lotesPendientesHito);
        });
        
        return { lotesPendientesPorHito, isPickingComplete: allComplete };

    }, [osId, isMounted, hitosConNecesidades, pickingState.itemStates, lotesNecesarios]);
    
    const lotesPendientesCalidad = useMemo(() => {
        if (!isMounted) return [];
        const neededElabIds = new Set<string>();
        lotesPendientesPorHito.forEach(lotes => {
            lotes.forEach(lote => {
                neededElabIds.add(lote.elaboracionId);
            });
        });
        
        return lotesNecesarios.filter(of => 
            neededElabIds.has(of.elaboracionId) &&
            of.estado === 'Finalizado' &&
            !of.incidencia
        );
    }, [lotesNecesarios, lotesPendientesPorHito, isMounted]);

    const addContainer = (tipo: keyof typeof expeditionTypeMap, hitoId: string): string => {
      const newContainer: ContenedorDinamico = {
        id: `cont-${Date.now()}`,
        hitoId: hitoId,
        tipo: tipo,
        numero: (pickingState.assignedContainers.filter(c => c.hitoId === hitoId && c.tipo === tipo).length) + 1
      }
      savePickingState({ assignedContainers: [...pickingState.assignedContainers, newContainer] });
      return newContainer.id;
    }

    const removeContainer = (containerId: string) => {
      const newItems = pickingState.itemStates.filter(item => item.containerId !== containerId);
      const newContainers = pickingState.assignedContainers.filter(c => c.id !== containerId);
      savePickingState({ itemStates: newItems, assignedContainers: newContainers });
    }

    const allocateLote = (ofId: string, containerId: string, quantity: number, hitoId: string) => {
        const newAllocation: LoteAsignado = { allocationId: Date.now().toString(), ofId, containerId, quantity, hitoId };
        const newItemStates = [...pickingState.itemStates, newAllocation];
        savePickingState({ itemStates: newItemStates });
        toast({ title: 'Lote Asignado', description: `${formatNumber(quantity, 2)} unidades asignadas al contenedor.`});
    }
    
    const deallocateLote = (allocationId: string) => {
        const newItemStates = pickingState.itemStates.filter(a => a.allocationId !== allocationId);
        savePickingState({ itemStates: newItemStates });
    }
    
     const handleDeletePicking = () => {
        savePickingState({ status: 'Pendiente', assignedContainers: [], itemStates: [] });
        toast({ title: "Picking Reiniciado", description: "Se han desasignado todos los lotes y contenedores."});
        setShowDeleteConfirm(false);
    }
    
    const handlePrintHito = (hito: ComercialBriefingItem) => {
        if (!serviceOrder) return;
        setPrintingHito(hito.id);
        setTimeout(() => {
          window.print();
          setPrintingHito(null);
        }, 100);
    };

    const handlePrintEtiquetas = (hito: ComercialBriefingItem) => {
        if (!serviceOrder) return;

        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] }); // Custom size
            const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
            const allElabs = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
            const containers = pickingState.assignedContainers.filter(c => c.hitoId === hito.id);
            const margin = 5;
            const pageWidth = 100;
            const pageHeight = 150;
    
            containers.forEach((container, containerIndex) => {
                if (containerIndex > 0) doc.addPage();
                
                let finalY = margin + 2;

                // --- HEADER ---
                const headerBgColor = container.tipo === 'REFRIGERADO' ? '#e0f2fe' : container.tipo === 'CONGELADO' ? '#e0f2fe' : '#fef9c3';
                doc.setFillColor(headerBgColor);
                doc.rect(0, 0, pageWidth, 28, 'F');
                doc.setFontSize(26);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor('#1f2937');
                
                const tipoTexto = container.tipo === 'REFRIGERADO' ? '❄️ Carambuco (Refrigerado)' : container.tipo === 'CONGELADO' ? '🧊 Carambuco (Congelado)' : '📦 Carambuco (Seco)';
                doc.text(`${tipoTexto} #${container.numero}`, pageWidth / 2, 18, { align: 'center' });
                
                finalY = 35;
    
                // --- INFO ---
                const hitoIndex = hitosConNecesidades.findIndex(h => h.id === hito.id);
                const expedicionNumero = `${serviceOrder.serviceNumber}.${(hitoIndex + 1).toString().padStart(2, '0')}`;
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`Servicio:`, margin, finalY);
                doc.setFont('helvetica', 'normal');
                doc.text(hito.descripcion, margin + 20, finalY, { maxWidth: pageWidth - margin * 2 - 20});
                let textLines = doc.splitTextToSize(hito.descripcion, pageWidth - margin * 2 - 20);
                finalY += textLines.length * 4.5;
                
                const infoPairs = [
                    ['Cliente:', serviceOrder.client],
                    ['Espacio:', serviceOrder.space || 'N/A'],
                    ['Fecha:', `${format(new Date(hito.fecha), 'dd/MM/yy')} ${hito.horaInicio}`],
                    ['Exp:', expedicionNumero],
                    ['OS:', serviceOrder.serviceNumber],
                ];

                doc.setFontSize(9);
                autoTable(doc, {
                    body: infoPairs,
                    startY: finalY,
                    theme: 'plain',
                    styles: { fontSize: 9, cellPadding: 0.5, halign: 'left' },
                    columnStyles: { 0: { fontStyle: 'bold' } },
                });

                finalY = (doc as any).lastAutoTable.finalY + 5;

                // --- TABLA ---
                const containerItems = pickingState.itemStates.filter(item => item.containerId === container.id);
                const tableBody = containerItems.map(item => {
                    const loteInfo = allOFs.find(of => of.id === item.ofId);
                    const elabInfo = allElabs.find(e => e.id === loteInfo?.elaboracionId);
                    const recetaNombre = elabInfo ? getRecetaForElaboracion(elabInfo.id, osId) : '-';
                    return [
                        { content: elabInfo?.nombre || 'N/A', styles: { fontStyle: 'bold' } },
                        recetaNombre,
                        `${formatNumber(item.quantity, 2)} ${formatUnit(elabInfo?.unidadProduccion || '')}`
                    ];
                });
    
                 autoTable(doc, {
                    startY: finalY,
                    head: [['Elaboración', 'Receta', 'Cant.']],
                    body: tableBody,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 1.5, overflow: 'hidden', cellWidth: 'auto' },
                    headStyles: { fillColor: '#e5e7eb', textColor: '#374151', fontSize: 9, fontStyle: 'bold' },
                    columnStyles: { 2: { halign: 'right' } }
                });
            });
    
             doc.save(`Etiquetas_${serviceOrder.serviceNumber}_${hito.descripcion.replace(/\s+/g, '_')}.pdf`);
    
        } catch (error) {
             console.error("Error generating labels PDF:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el PDF de etiquetas.' });
        }
    };


    if (!isMounted || !serviceOrder) {
        return <LoadingSkeleton title="Cargando Picking..." />;
    }
    
    return (
        <TooltipProvider>
            <div className="non-printable">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg mb-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold">{serviceOrder.serviceNumber}</h2>
                        <Separator orientation="vertical" className="h-6"/>
                        <p>{serviceOrder.client}</p>
                        <Separator orientation="vertical" className="h-6"/>
                        <p className="flex items-center gap-2 text-muted-foreground"><Building className="h-4 w-4"/> {serviceOrder.space}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select onValueChange={(value: PickingStatus) => handleStatusChange(value)} value={pickingState.status}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Estado..." />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map(s => <SelectItem key={s} value={s} disabled={s !== 'Pendiente' && !isPickingComplete}>
                                    <Badge variant={statusVariant[s]}>{s}</Badge>
                                </SelectItem>)}
                            </SelectContent>
                        </Select>
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
                    {hitosConNecesidades.map(hito => {
                        const lotesPendientesHito = (lotesPendientesPorHito.get(hito.id) || []).sort((a, b) => {
                            const recetaA = a.recetas[0]?.nombre || '';
                            const recetaB = b.recetas[0]?.nombre || '';
                            if (recetaA.localeCompare(recetaB) !== 0) {
                                return recetaA.localeCompare(recetaB);
                            }
                            return a.elaboracionNombre.localeCompare(b.elaboracionNombre);
                        });
                        const hasContentToPrint = pickingState.itemStates.some(item => item.hitoId === hito.id);
                        
                        return (
                            <Card key={hito.id} className="print-section">
                                <CardHeader className="flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-3"><Utensils />Necesidades para: {hito.descripcion}</CardTitle>
                                    <CardDescription>Fecha: {format(new Date(hito.fecha), 'dd/MM/yyyy')} a las {hito.horaInicio}</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                     <Button onClick={() => handlePrintHito(hito)} disabled={!hasContentToPrint} variant="outline">
                                        <Printer className="mr-2" />
                                        Hoja de Carga
                                    </Button>
                                    <Button onClick={() => handlePrintEtiquetas(hito)} disabled={!hasContentToPrint} variant="outline">
                                        <Tags className="mr-2" />
                                        Imprimir Etiquetas
                                    </Button>
                                </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        {(Object.keys(expeditionTypeMap) as Array<keyof typeof expeditionTypeMap>).map(tipo => {
                                            const lotesDePartida = lotesPendientesHito.filter(l => l.tipoExpedicion === tipo);
                                            const contenedoresDePartida = pickingState.assignedContainers.filter(c => c.hitoId === hito.id && c.tipo === tipo);
                                            
                                            const allocationsForPartida = pickingState.itemStates.filter(alloc => lotesNecesarios.find(ln => ln.id === alloc.ofId)?.tipoExpedicion === tipo && alloc.hitoId === hito.id);

                                            if (lotesDePartida.length === 0 && allocationsForPartida.length === 0) {
                                                return null;
                                            }
                                            
                                            const info = expeditionTypeMap[tipo];

                                            return (
                                                <Card key={`${hito.id}-${tipo}`} className={cn(info.className)}>
                                                    <CardHeader className="flex-row items-start justify-between">
                                                        <CardTitle className="flex items-center gap-3 text-lg"><info.icon />{info.title}</CardTitle>
                                                        <Button size="sm" variant="outline" className="no-print bg-white/50" onClick={() => addContainer(tipo, hito.id)}><PlusCircle className="mr-2"/>Añadir Contenedor</Button>
                                                    </CardHeader>
                                                    <CardContent>
                                                        {lotesDePartida.length > 0 && (
                                                            <div className="mb-4">
                                                                <h3 className="font-semibold mb-2">Lotes pendientes de asignar para esta entrega</h3>
                                                                <Table className="bg-white"><TableHeader><TableRow><TableHead className="w-[30%]">Receta</TableHead><TableHead className="font-bold">Elaboración</TableHead><TableHead>Lote (OF)</TableHead><TableHead className="text-right">Cant. Pendiente</TableHead><TableHead className="w-32 no-print"></TableHead></TableRow></TableHeader>
                                                                    <TableBody>
                                                                        {lotesDePartida.map(lote => (
                                                                            <TableRow key={lote.ofId}>
                                                                                <TableCell className="text-xs text-muted-foreground w-[30%]">
                                                                                    {lote.recetas.map(r => (
                                                                                        <div key={r.nombre}>{r.cantidad} x {r.nombre}</div>
                                                                                    ))}
                                                                                </TableCell>
                                                                                <TableCell className="font-bold">{lote.elaboracionNombre}</TableCell>
                                                                                <TableCell className="font-medium font-mono">{lote.ofId}</TableCell>
                                                                                <TableCell className="text-right font-mono">{formatNumber(lote.cantidadNecesaria - lote.cantidadAsignada, 2)} {formatUnit(lote.unidad)}</TableCell>
                                                                                <TableCell className="text-right no-print"><AllocationDialog lote={lote} containers={contenedoresDePartida} onAllocate={(contId, qty) => allocateLote(lote.ofId, contId, qty, hito.id)} onAddContainer={() => addContainer(tipo, hito.id)} /></TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        )}
                                                        <div className="space-y-4">
                                                            {contenedoresDePartida.map(container => {
                                                                const containerItems = pickingState.itemStates.filter(item => item.containerId === container.id);
                                                                return (
                                                                    <div key={container.id}>
                                                                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                                                                        Contenedor {container.numero}
                                                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeContainer(container.id)}><Trash2 size={14} /></Button>
                                                                        </h3>
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
                                                                                    <TableRow><TableCell colSpan={6} className="text-center h-20 text-muted-foreground">Vacío</TableCell></TableRow>
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
                                </CardContent>
                            </Card>
                        );
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
            {printingHito && <div id="printable-content" className="printable">
                {/* Content to be printed will be rendered here */}
            </div>}
        </TooltipProvider>
    );
}



