
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Printer, Trash2, User, Building } from 'lucide-react';
import type { MaterialOrder, OrderItem, Proveedor, ServiceOrder } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type ReturnSheetItem = OrderItem & { sentQuantity: number; returnedQuantity: number; orderId: string; type: MaterialOrder['type'] };
type ReturnIncidencia = { osId: string; osServiceNumber: string; item: ReturnSheetItem; comment: string; timestamp: string };

type GroupedIncidencias = {
    osId: string;
    osServiceNumber: string;
    cliente: string;
    espacio: string;
    fechaEvento: string;
    incidencias: ReturnIncidencia[];
}

import { useReturnSheets, useEventos, useProveedores } from '@/hooks/use-data-queries';

export default function IncidenciasRetornoPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [providerFilter, setProviderFilter] = useState('all');
    const [osToDelete, setOsToDelete] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    const { data: allReturnSheets = [], isLoading: loadingSheets } = useReturnSheets();
    const { data: allServiceOrders = [], isLoading: loadingOrders } = useEventos();
    const { data: proveedores = [], isLoading: loadingProv } = useProveedores();

    const serviceOrdersMap = useMemo(() => {
        return new Map(allServiceOrders.map(os => [os.id, os]));
    }, [allServiceOrders]);

    const incidencias = useMemo(() => {
        const loadedIncidencias: ReturnIncidencia[] = [];
        
        allReturnSheets.forEach(sheet => {
            if (sheet.itemStates) {
                Object.entries(sheet.itemStates).forEach(([itemKey, state]) => {
                    if (state.incidentComment) {
                        const [orderId, itemCode] = itemKey.split('_');
                        const item = sheet.items.find(i => i.itemCode === itemCode && (i as any).orderId === orderId);
                        
                        if (item) {
                            const os = serviceOrdersMap.get(sheet.osId);
                            loadedIncidencias.push({
                                osId: sheet.osId,
                                osServiceNumber: os?.serviceNumber || 'N/A',
                                item: {
                                    ...item,
                                    sentQuantity: (item as any).sentQuantity || item.quantity,
                                    returnedQuantity: state.returnedQuantity,
                                    orderId: orderId,
                                    type: (item as any).type
                                } as ReturnSheetItem,
                                comment: state.incidentComment,
                                timestamp: new Date().toISOString() // We don't have a timestamp per incident in the state
                            });
                        }
                    }
                });
            }
        });
        
        return loadedIncidencias;
    }, [allReturnSheets, serviceOrdersMap]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const groupedAndFilteredIncidencias: GroupedIncidencias[] = useMemo(() => {
        const filtered = incidencias.filter(inc =>
            (inc.osServiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inc.item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inc.comment.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (providerFilter === 'all' || (inc.item as any).partnerId === providerFilter)
        );

        const groups: { [key: string]: GroupedIncidencias } = {};

        filtered.forEach(inc => {
            if (!groups[inc.osId]) {
                const os = serviceOrdersMap.get(inc.osId);
                groups[inc.osId] = {
                    osId: inc.osId,
                    osServiceNumber: inc.osServiceNumber,
                    cliente: os?.client || 'Desconocido',
                    espacio: os?.space || '-',
                    fechaEvento: os?.startDate ? (os.startDate instanceof Date ? os.startDate.toISOString() : os.startDate) : '',
                    incidencias: []
                };
            }
            groups[inc.osId].incidencias.push(inc);
        });

        return Object.values(groups).sort((a,b) => new Date(b.fechaEvento).getTime() - new Date(a.fechaEvento).getTime());

    }, [incidencias, searchTerm, providerFilter, serviceOrdersMap]);
    
    const rentalProviders = useMemo(() => {
        const providerIds = new Set<string>();
        incidencias.forEach(inc => {
            if (inc.item.type === 'Alquiler' && (inc.item as any).partnerId) {
                providerIds.add((inc.item as any).partnerId);
            }
        });
        return proveedores.filter(p => providerIds.has(p.id));
    }, [incidencias, proveedores]);
    
    const handlePrint = (group: GroupedIncidencias) => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`Informe de Incidencias: OS ${group.osServiceNumber}`, 14, 22);
        doc.setFontSize(11);
        doc.text(`Cliente: ${group.cliente}`, 14, 30);
        doc.text(`Fecha Evento: ${format(new Date(group.fechaEvento), 'dd/MM/yyyy', { locale: es })}`, 14, 36);

        let finalY = 45;

        const incidenciasPorTipo: Record<string, ReturnIncidencia[]> = {};
        group.incidencias.forEach(inc => {
            const tipo = inc.item.type || 'Varios';
            if(!incidenciasPorTipo[tipo]) incidenciasPorTipo[tipo] = [];
            incidenciasPorTipo[tipo].push(inc);
        });

        for (const tipo in incidenciasPorTipo) {
            if (finalY > 250) { doc.addPage(); finalY = 20; }
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(tipo, 14, finalY);
            finalY += 6;
            
            const tableColumn = ["Artículo", "Enviado", "Devuelto", "Merma", "Valor Merma", "% Merma", "Comentario"];
            const tableRows: (string | number)[][] = [];
            
            incidenciasPorTipo[tipo].forEach(inc => {
                const merma = inc.item.sentQuantity - inc.item.returnedQuantity;
                const valorMerma = merma * (inc.item.price || 0);
                const pctMerma = inc.item.sentQuantity > 0 ? (merma / inc.item.sentQuantity) * 100 : 0;
                tableRows.push([
                    inc.item.description,
                    inc.item.sentQuantity,
                    inc.item.returnedQuantity,
                    merma,
                    formatCurrency(valorMerma),
                    `${pctMerma.toFixed(1)}%`,
                    inc.comment
                ]);
            });
            
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: finalY,
                headStyles: { fillColor: [0, 112, 60] }
            });

            finalY = (doc as any).lastAutoTable.finalY + 10;
        }


        doc.save(`Informe_Incidencias_${group.osServiceNumber}.pdf`);
    }

    const handleDeleteReport = () => {
        toast({ title: "Funcionalidad no disponible", description: "Para eliminar incidencias, edite el retorno correspondiente." });
        setOsToDelete(null);
    }

    if (!isMounted || loadingSheets || loadingOrders || loadingProv) {
        return <LoadingSkeleton title="Cargando Incidencias de Retorno..." />;
    }
    
    const getGroupedIncidentsByType = (incidencias: ReturnIncidencia[]) => {
        return incidencias.reduce((acc, inc) => {
            const tipo = inc.item.type || 'Varios';
            if(!acc[tipo]) acc[tipo] = [];
            acc[tipo].push(inc);
            return acc;
        }, {} as Record<string, ReturnIncidencia[]>);
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-grow">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por OS, artículo o comentario..."
                        className="pl-8 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                 {rentalProviders.length > 0 && (
                    <Select value={providerFilter} onValueChange={setProviderFilter}>
                        <SelectTrigger className="w-full md:w-[240px]">
                            <SelectValue placeholder="Filtrar por proveedor" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Proveedores</SelectItem>
                            {rentalProviders.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.nombreComercial}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
            
            <div className="space-y-4">
                {groupedAndFilteredIncidencias.length > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-4">
                        {groupedAndFilteredIncidencias.map(group => {
                            const incidenciasPorTipo = getGroupedIncidentsByType(group.incidencias);
                            return (
                             <AccordionItem value={group.osId} key={group.osId} className="border rounded-lg">
                                <div className="flex justify-between items-center w-full p-4">
                                    <AccordionTrigger className="p-0 hover:no-underline flex-grow">
                                        <div className="flex items-center gap-4">
                                            <Badge 
                                                variant="outline" 
                                                className="text-base cursor-pointer hover:bg-accent"
                                                onClick={(e) => {e.stopPropagation(); router.push(`/os/${group.osId}/almacen`);}}
                                            >
                                                {group.osServiceNumber}
                                            </Badge>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground"><User className="h-4 w-4"/> {group.cliente}</div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building className="h-4 w-4"/> {group.espacio}</div>
                                        </div>
                                    </AccordionTrigger>
                                    <div className="flex items-center gap-2 pl-4" onClick={(e) => e.stopPropagation()}>
                                        <Button variant="outline" size="sm" onClick={() => handlePrint(group)}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
                                        <Button variant="destructive" size="sm" onClick={() => setOsToDelete(group.osId)}><Trash2 className="mr-2 h-4 w-4" /> Borrar</Button>
                                    </div>
                                </div>
                                <AccordionContent>
                                    <div className="border-t p-4 space-y-4">
                                        {Object.entries(incidenciasPorTipo).map(([tipo, incs]) => (
                                        <div key={tipo}>
                                            <h4 className="font-semibold text-lg mb-2">{tipo}</h4>
                                            <div className="border rounded-md">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Artículo</TableHead>
                                                            <TableHead className="w-48">Discrepancia</TableHead>
                                                            <TableHead className="w-24 text-center">Merma</TableHead>
                                                            <TableHead className="w-24 text-center">Valor Merma</TableHead>
                                                            <TableHead className="w-24 text-center">% Merma</TableHead>
                                                            <TableHead>Comentario</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {incs.map(inc => {
                                                            const merma = inc.item.sentQuantity - inc.item.returnedQuantity;
                                                            const valorMerma = merma * (inc.item.price || 0);
                                                            const pctMerma = inc.item.sentQuantity > 0 ? (merma / inc.item.sentQuantity) * 100 : 0;
                                                            return (
                                                                <TableRow key={`${inc.osId}-${inc.item.itemCode}-${inc.timestamp}`}>
                                                                    <TableCell className="font-medium">{inc.item.description}</TableCell>
                                                                    <TableCell>
                                                                        Enviado: {inc.item.sentQuantity} / Devuelto: {inc.item.returnedQuantity}
                                                                    </TableCell>
                                                                    <TableCell className="text-center font-bold text-destructive">{merma}</TableCell>
                                                                    <TableCell className="text-center font-bold text-destructive">{formatCurrency(valorMerma)}</TableCell>
                                                                    <TableCell className="text-center font-bold text-destructive">
                                                                        <Badge variant="destructive">{formatNumber(pctMerma, 1)}%</Badge>
                                                                    </TableCell>
                                                                    <TableCell className="max-w-md truncate">{inc.comment}</TableCell>
                                                                </TableRow>
                                                            )
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                             </AccordionItem>
                        )})}
                    </Accordion>
                ) : (
                    <Card>
                        <CardContent className="h-48 flex items-center justify-center text-muted-foreground">
                            No hay incidencias de retorno que coincidan con la búsqueda.
                        </CardContent>
                    </Card>
                )}
            </div>

            <AlertDialog open={!!osToDelete} onOpenChange={() => setOsToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente **todas** las incidencias asociadas a la Orden de Servicio seleccionada. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteReport}>Sí, eliminar informe</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
