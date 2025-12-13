

'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Package, ListChecks, AlertTriangle, PlusCircle, Printer, CheckCircle, FileText, Trash2 } from 'lucide-react';
import { format, isBefore } from 'date-fns';
import type { ServiceOrder, OrdenFabricacion, ContenedorDinamico, PickingState, LoteAsignado, Elaboracion, ComercialBriefing, GastronomyOrder, Receta, PickingStatus, Alergeno, IngredienteInterno, ArticuloERP, ComercialBriefingItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNumber, formatUnit, formatCurrency } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { AllergenBadge } from '@/components/icons/allergen-badge';

type LoteDisponible = {
    ofId: string;
    cantidadDisponible: number;
    fechaCaducidad: string;
}

type LoteNecesario = {
    elaboracionId: string;
    elaboracionNombre: string;
    cantidadNecesaria: number; 
    cantidadAsignada: number; 
    unidad: string;
    tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
    recetas: { nombre: string, cantidad: number }[];
    lotesDisponibles: LoteDisponible[];
    alergenos: Alergeno[];
};

const expeditionTypeMap = {
    REFRIGERADO: { title: "Refrigerado", icon: Package, className: "bg-blue-100 border-blue-200" },
    CONGELADO: { title: "Congelado", icon: Package, className: "bg-sky-100 border-sky-200" },
    SECO: { title: "Seco", icon: Package, className: "bg-yellow-100 border-yellow-200" },
};

export const statusOptions: PickingStatus[] = ['Pendiente', 'Preparado', 'Enviado', 'Entregado', 'Retornado'];
export const statusVariant: { [key in PickingStatus]: 'success' | 'secondary' } = {
  Pendiente: 'secondary',
  Preparado: 'success',
  Enviado: 'secondary',
  Entregado: 'success',
  Retornado: 'secondary',
};

function AllocationDialog({ lote, containers, onAllocate, onAddContainer }: { lote: LoteNecesario, containers: ContenedorDinamico[], onAllocate: (allocations: { ofId: string, quantity: number }[], containerId: string) => void, onAddContainer: () => string }) {
    const cantidadPendiente = Math.ceil((lote.cantidadNecesaria - lote.cantidadAsignada) * 100) / 100;
    const [allocations, setAllocations] = useState<Record<string, number>>({});
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(containers[0]?.id || null);
    const [open, setOpen] = useState(false);
    const [showExcessConfirm, setShowExcessConfirm] = useState(false);
    const { toast } = useToast();

    const totalAllocated = useMemo(() => Object.values(allocations).reduce((sum, qty) => sum + qty, 0), [allocations]);
    const isExcess = totalAllocated > cantidadPendiente;

    const proceedAllocation = () => {
        if (!selectedContainerId) {
            toast({variant: 'destructive', title: 'Error', description: "Por favor, selecciona un contenedor."});
            return;
        }
        if (totalAllocated <= 0) {
            toast({variant: 'destructive', title: 'Error', description: "Debes asignar una cantidad mayor que cero."});
            return;
        }
        
        const finalAllocations = Object.entries(allocations)
            .filter(([, qty]) => qty > 0)
            .map(([ofId, quantity]) => ({ ofId, quantity }));
        
        onAllocate(finalAllocations, selectedContainerId);
        setOpen(false);
        setShowExcessConfirm(false);
        setAllocations({});
    }

    const handleAllocateClick = () => {
        if (isExcess) {
            setShowExcessConfirm(true);
        } else {
            proceedAllocation();
        }
    }
    
    const handleAddNewContainer = () => {
      const newContainerId = onAddContainer();
      setSelectedContainerId(newContainerId);
    }
    
    const handleAllocationChange = (ofId: string, value: string, max: number) => {
        const qty = parseFloat(value) || 0;
        const newQty = Math.max(0, Math.min(qty, max));
        setAllocations(prev => ({...prev, [ofId]: newQty}));
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button size="sm">Asignar</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Asignar Lote: {lote.elaboracionNombre}</DialogTitle>
                        <DialogDescription>
                            Selecciona de qué lotes quieres coger producto y a qué contenedor asignarlo.
                            Necesitas asignar un total de <strong>{formatNumber(cantidadPendiente, 2)} {formatUnit(lote.unidad)}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="max-h-64 overflow-y-auto border rounded-md">
                            <Table>
                                <TableHeader><TableRow><TableHead>Lote (OF)</TableHead><TableHead>Disponible</TableHead><TableHead className="w-40">Cantidad a Asignar</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {lote.lotesDisponibles.map(ld => (
                                        <TableRow key={ld.ofId}>
                                            <TableCell><Badge variant="secondary">{ld.ofId}</Badge></TableCell>
                                            <TableCell>{formatNumber(ld.cantidadDisponible, 2)} {formatUnit(lote.unidad)}</TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" 
                                                    value={allocations[ld.ofId] || ''}
                                                    onChange={(e) => handleAllocationChange(ld.ofId, e.target.value, ld.cantidadDisponible)}
                                                    max={ld.cantidadDisponible}
                                                    step="0.01"
                                                    className="h-8"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className={cn("flex justify-end font-bold items-center gap-2", isExcess && "text-destructive")}>
                            {isExcess && <AlertTriangle className="h-4 w-4" />}
                            Total Asignado: {formatNumber(totalAllocated, 2)} {formatUnit(lote.unidad)}
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
                        <Button variant="secondary" onClick={() => { setOpen(false); setAllocations({}); }}>Cancelar</Button>
                        <Button onClick={handleAllocateClick}>Confirmar Asignación</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
             <AlertDialog open={showExcessConfirm} onOpenChange={setShowExcessConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar asignación excesiva?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Estás asignando <strong>{formatNumber(totalAllocated, 2)} {formatUnit(lote.unidad)}</strong>, que es más de los <strong>{formatNumber(cantidadPendiente, 2)} {formatUnit(lote.unidad)}</strong> necesarios. ¿Quieres continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>No, corregir</AlertDialogCancel>
                        <AlertDialogAction onClick={proceedAllocation}>Sí, continuar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
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


function PrintDialog({ hito, serviceOrder, allOFs, getRecetaForElaboracion, pickingState }: { hito: ComercialBriefingItem, serviceOrder: ServiceOrder, allOFs: OrdenFabricacion[], getRecetaForElaboracion: (elabId: string, osId: string) => string, pickingState: PickingState }) {
    const [isOpen, setIsOpen] = useState(false);

    const generateLabel = (orientation: 'p' | 'l') => {
        const width = orientation === 'p' ? 90 : 110;
        const height = orientation === 'p' ? 110 : 90;
        
        const doc = new jsPDF({ orientation, unit: 'mm', format: [width, height] });
        const containers = pickingState.assignedContainers.filter(c => c.hitoId === hito.id);
        
        containers.forEach((container, containerIndex) => {
            if (containerIndex > 0) doc.addPage();
            
            const margin = 5;
            let finalY = margin + 5;
            
            const hitoIndex = serviceOrder.deliveryLocations?.indexOf(hito.sala || '') ?? 0;
            const expedicionNumero = `${serviceOrder.serviceNumber}.${(hitoIndex + 1).toString().padStart(2, '0')}`;
            const containerInfo = expeditionTypeMap[container.tipo];

            if (orientation === 'p') {
                 // --- CABECERA ---
                doc.setFillColor(0, 0, 0);
                doc.rect(0, 0, width, 12, 'F');
                doc.setFontSize(22);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text(expedicionNumero, width / 2, 9, { align: 'center' });
                finalY = 18;

                doc.setTextColor(0, 0, 0);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'normal');
                doc.text(`Contenedor ${containerInfo.title} #${container.numero}`, width / 2, finalY, { align: 'center' });
                finalY += 4;
                doc.setLineWidth(0.3);
                doc.setDrawColor('#cbd5e1');
                doc.line(margin, finalY, width - margin, finalY);
                finalY += 6;
                
                doc.setFontSize(9);
                doc.text(`Espacio: ${serviceOrder.space || '-'}`, margin, finalY);
                doc.text(`Servicio: ${hito.descripcion}`, width - margin, finalY, { align: 'right' });
                finalY += 4;
                
                doc.text(`Fecha: ${format(new Date(hito.fecha), 'dd/MM/yy')} Hora: ${hito.horaInicio}`, margin, finalY);
                if (hito.sala) {
                    doc.text(`Sala: ${hito.sala}`, width - margin, finalY, { align: 'right' });
                }
                finalY += 4;
            } else { // landscape
                doc.setFillColor(0, 0, 0);
                doc.rect(0, 0, width, 12, 'F');
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text(`Contenedor ${containerInfo.title}`, margin, 9);

                doc.setFontSize(28);
                doc.setFont('helvetica', 'bold');
                doc.text(`${expedicionNumero}-${container.numero}`, width - margin, 9, { align: 'right' });
                finalY = 18;

                doc.setTextColor(0,0,0);
                 doc.setLineWidth(0.3);
                doc.setDrawColor('#cbd5e1');
                doc.line(margin, finalY, width - margin, finalY);
                finalY += 6;
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                let clientText = `Espacio: ${serviceOrder.space || '-'}${hito.sala ? ` (${hito.sala})` : ''}`;
                doc.text(clientText, margin, finalY);
                doc.text(`Servicio: ${hito.descripcion}`, width - margin, finalY, { align: 'right' });
                finalY += 4;
                doc.text(`Fecha: ${format(new Date(hito.fecha), 'dd/MM/yy')} Hora: ${hito.horaInicio}`, margin, finalY);
                finalY += 4;
            }
            
            doc.setLineWidth(0.3);
            doc.setDrawColor('#cbd5e1');
            doc.line(margin, finalY, width - margin, finalY);
            finalY += 4;

            const containerItems = pickingState.itemStates.filter(item => item.containerId === container.id);
            const tableBody = containerItems.map(item => {
                const loteInfo = allOFs.find(l => l.id === item.ofId);
                const recetaNombre = getRecetaForElaboracion(loteInfo?.elaboracionId || '', serviceOrder.id);
                const nombre = `${loteInfo?.elaboracionNombre || 'N/A'}${recetaNombre !== 'Directa' ? ` (${recetaNombre})` : ''}`;
                const cantidad = `${formatNumber(item.quantity, 2)} ${formatUnit(loteInfo?.unidad || 'Uds')}`;
                return [nombre, cantidad];
            });

            autoTable(doc, {
                startY: finalY,
                head: [['PRODUCTO', 'CANTIDAD']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: '#374151', textColor: '#FFFFFF', fontSize: 7, fontStyle: 'bold', cellPadding: 1 },
                styles: { fontSize: 8, cellPadding: 2, overflow: 'hidden', valign: 'middle' },
                columnStyles: { 
                    0: { cellWidth: orientation === 'p' ? 55 : 70 }, 
                    1: { cellWidth: 20, halign: 'right' }
                },
            });
        });

        doc.save(`Etiquetas_${serviceOrder.serviceNumber}_${hito.descripcion.replace(/\s+/g, '_')}.pdf`);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" disabled={pickingState.assignedContainers.filter(c => c.hitoId === hito.id).length === 0}>
                    <Printer className="mr-2" />Imprimir Etiquetas
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Seleccionar Formato de Etiqueta</DialogTitle>
                    <DialogDescription>Elige la orientación para las etiquetas de los contenedores (9x11 cm).</DialogDescription>
                </DialogHeader>
                <div className="flex justify-center gap-8 py-8">
                    <Button onClick={() => generateLabel('p')} variant="outline" className="h-28 w-20 flex-col gap-2">
                        <FileText />
                        Vertical (9x11)
                    </Button>
                    <Button onClick={() => generateLabel('l')} variant="outline" className="h-20 w-28 flex-col gap-2">
                        <FileText className="transform rotate-90" />
                        Horizontal (11x9)
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function PickingPageContent() {
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [hitosConNecesidades, setHitosConNecesidades] = useState<ComercialBriefingItem[]>([]);
    const [pickingState, setPickingState] = useState<PickingState>({ osId: '', status: 'Pendiente', assignedContainers: [], itemStates: [] });
    const [isMounted, setIsMounted] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const router = useRouter();
    const params = useParams() ?? {};
    const id = (params.id as string) || '';
    const osId = id; // Use the dynamic [id] as osId
    const { toast } = useToast();

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

    const allValidatedOFs = useMemo(() => {
        if (!isMounted) return [];
        const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
        return allOFs.filter(of => of.estado === 'Validado');
    }, [isMounted]);

    const allAssignedQuantities = useMemo(() => {
        if (!isMounted) return {};
        const allStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as Record<string, PickingState>;
        const assigned: Record<string, number> = {};
        Object.values(allStates).forEach(state => {
            (state.itemStates || []).forEach(alloc => {
                assigned[alloc.ofId] = (assigned[alloc.ofId] || 0) + alloc.quantity;
            });
        });
        return assigned;
    }, [isMounted]);

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

    const { lotesPendientesPorHito, isPickingComplete, elabMap, lotesNecesarios } = useMemo(() => {
        if (!isMounted || !hitosConNecesidades.length) {
            return { lotesPendientesPorHito: new Map(), isPickingComplete: true, elabMap: new Map(), lotesNecesarios: [] };
        }
      
        const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
        const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        const elabMap = new Map(allElaboraciones.map(e => [e.id, e]));
        const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
      
        let allComplete = true;
        const lotesPorHito = new Map<string, LoteNecesario[]>();
      
        hitosConNecesidades.forEach(hito => {
          const necesidadesHito: Map<string, LoteNecesario> = new Map();
          const gastroOrder = allGastroOrders.find(go => go.id === hito.id);
      
          if (gastroOrder && gastroOrder.items) {
            gastroOrder.items.forEach(item => {
              if (item.type === 'item') {
                const receta = allRecetas.find(r => r.id === item.id);
                if (receta) {
                  receta.elaboraciones.forEach(elabEnReceta => {
                    const elabInfo = elabMap.get(elabEnReceta.elaboracionId);
                    if (elabInfo) {
                      const cantidadNecesaria = Number(item.quantity || 0) * elabEnReceta.cantidad;
                      if (cantidadNecesaria < 0.01) return;
      
                      let existing = necesidadesHito.get(elabInfo.id);
                      if (!existing) {
                        existing = {
                          elaboracionId: elabInfo.id,
                          elaboracionNombre: elabInfo.nombre,
                          cantidadNecesaria: 0,
                          cantidadAsignada: 0,
                          unidad: elabInfo.unidadProduccion,
                          tipoExpedicion: elabInfo.tipoExpedicion,
                          recetas: [],
                          lotesDisponibles: [],
                          alergenos: []
                        };
                        necesidadesHito.set(elabInfo.id, existing);
                      }
                      existing.cantidadNecesaria += cantidadNecesaria;
                    }
                  });
                }
              }
            });
          }
      
          const lotesPendientesHito = Array.from(necesidadesHito.values()).map(necesidad => {
            const cantidadAsignadaTotal = pickingState.itemStates
              .filter(a => {
                  const of = allValidatedOFs.find(of => of.id === a.ofId);
                  return of?.elaboracionId === necesidad.elaboracionId && a.hitoId === hito.id
              })
              .reduce((sum, a) => sum + a.quantity, 0);
  
            const lotesDisponibles = allValidatedOFs
              .filter(of => of.elaboracionId === necesidad.elaboracionId)
              .map(of => ({
                  ofId: of.id,
                  cantidadDisponible: (of.cantidadReal || 0) - (allAssignedQuantities[of.id] || 0),
                  fechaCaducidad: of.fechaFinalizacion || of.fechaCreacion,
              }))
              .filter(lote => lote.cantidadDisponible > 0.001)
              .sort((a,b) => new Date(a.fechaCaducidad).getTime() - new Date(b.fechaCaducidad).getTime());
  
            return { ...necesidad, cantidadAsignada: cantidadAsignadaTotal, lotesDisponibles };
          }).filter(lote => (lote.cantidadNecesaria - lote.cantidadAsignada) > 0.001);
  
          if (lotesPendientesHito.length > 0) {
              allComplete = false;
          }
  
          lotesPorHito.set(hito.id, lotesPendientesHito);
        });

        const lotes = new Map<string, LoteNecesario>();
        lotesPorHito.forEach((lotesHito) => {
            lotesHito.forEach(lote => {
                const existing = lotes.get(lote.elaboracionId);
                if (existing) {
                    existing.cantidadNecesaria += lote.cantidadNecesaria;
                    existing.cantidadAsignada += lote.cantidadAsignada;
                } else {
                    lotes.set(lote.elaboracionId, { ...lote });
                }
            });
        });
        
        return { lotesPendientesPorHito: lotesPorHito, isPickingComplete: allComplete, elabMap, lotesNecesarios: Array.from(lotes.values()) };
  
      }, [osId, isMounted, hitosConNecesidades, pickingState.itemStates, allValidatedOFs, allAssignedQuantities]);
    
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

    const allocateLote = (allocations: { ofId: string, quantity: number }[], containerId: string, hitoId: string) => {
        const newAllocations: LoteAsignado[] = allocations.map(({ofId, quantity}) => ({
            allocationId: `${ofId}-${containerId}-${Date.now()}`,
            ofId,
            containerId,
            quantity,
            hitoId
        }));

        const newItemStates = [...pickingState.itemStates, ...newAllocations];
        savePickingState({ itemStates: newItemStates });
        toast({ title: 'Lote Asignado', description: `${formatNumber(newAllocations.reduce((s, a) => s + a.quantity, 0), 2)} unidades asignadas al contenedor.`});
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

    if (!isMounted || !serviceOrder) {
        return <LoadingSkeleton title="Cargando Picking..." />;
    }
    
    return (
        <TooltipProvider>
            <div>
                <div className="flex items-start justify-between p-3 bg-muted rounded-lg mb-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold">{serviceOrder.serviceNumber}</h2>
                        <Separator orientation="vertical" className="h-6"/>
                        <p>{serviceOrder.client}</p>
                        <Separator orientation="vertical" className="h-6"/>
                        <p className="flex items-center gap-2 text-muted-foreground"><Package className="h-4 w-4"/> {serviceOrder.space}</p>
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
                
                <div className="space-y-8">
                    {hitosConNecesidades.map(hito => {
                        const lotesPendientesHito = lotesPendientesPorHito.get(hito.id) || [];
                        const hasContentToPrint = pickingState.itemStates.some(item => item.hitoId === hito.id);
                        
                        return (
                            <Card key={hito.id} className="print-section">
                                <CardHeader className="flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-3"><Package />Necesidades para: {hito.descripcion}</CardTitle>
                                    <CardDescription>Fecha: {format(new Date(hito.fecha), 'dd/MM/yyyy')} a las {hito.horaInicio}</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                     <PrintDialog hito={hito} serviceOrder={serviceOrder} allOFs={allValidatedOFs} getRecetaForElaboracion={getRecetaForElaboracion} pickingState={pickingState} />
                                </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        {(Object.keys(expeditionTypeMap) as Array<keyof typeof expeditionTypeMap>).map(tipo => {
                                            const lotesDePartida = lotesPendientesHito.filter((l: any) => l.tipoExpedicion === tipo);
                                            const contenedoresDePartida = pickingState.assignedContainers.filter(c => c.hitoId === hito.id && c.tipo === tipo);
                                            
                                            const allocationsForPartida = pickingState.itemStates.filter(alloc => {
                                                const of = allValidatedOFs.find(of => of.id === alloc.ofId);
                                                return of && elabMap.get(of.elaboracionId)?.tipoExpedicion === tipo && alloc.hitoId === hito.id;
                                            });

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
                                                                <Table className="bg-white"><TableHeader><TableRow><TableHead className="font-bold">Elaboración</TableHead><TableHead className="text-right">Cant. Pendiente</TableHead><TableHead className="w-32 no-print"></TableHead></TableRow></TableHeader>
                                                                    <TableBody>
                                                                        {lotesDePartida.map((lote: any) => (
                                                                            <TableRow key={lote.elaboracionId}>
                                                                                <TableCell className="font-bold">{lote.elaboracionNombre}</TableCell>
                                                                                <TableCell className="text-right font-mono">{formatNumber(lote.cantidadNecesaria - lote.cantidadAsignada, 2)} {formatUnit(lote.unidad)}</TableCell>
                                                                                <TableCell className="text-right no-print"><AllocationDialog lote={lote} containers={contenedoresDePartida} onAllocate={(allocs, contId) => allocateLote(allocs, contId, hito.id)} onAddContainer={() => addContainer(tipo, hito.id)} /></TableCell>
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
                                                                                        const loteInfo = allValidatedOFs.find(l => l.id === item.ofId);
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
                        className="bg-destructive hover:bg-destructive/80"
                        onClick={handleDeletePicking}
                        >
                        Sí, reiniciar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </TooltipProvider>
    );
}

function PickingDetailPageWrapper() {
  return (
    <Suspense fallback={<LoadingSkeleton title="Cargando picking..." />}>
      <PickingPageContent />
    </Suspense>
  )
}

export default PickingDetailPageWrapper;








