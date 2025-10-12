
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
import { formatNumber } from '@/lib/utils';
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

export default function IncidenciasRetornoPage() {
    const [incidencias, setIncidencias] = useState<ReturnIncidencia[]>([]);
    const [serviceOrdersMap, setServiceOrdersMap] = useState<Map<string, ServiceOrder>>(new Map());
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [providerFilter, setProviderFilter] = useState('all');
    const [osToDelete, setOsToDelete] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const loadedIncidencias = JSON.parse(localStorage.getItem('incidenciasRetorno') || '[]') as ReturnIncidencia[];
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const allProveedores = JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[];
        
        setServiceOrdersMap(new Map(allServiceOrders.map(os => [os.id, os])));
        setProveedores(allProveedores);
        setIncidencias(loadedIncidencias.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
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
                    fechaEvento: os?.startDate || '',
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

        const tableColumn = ["Artículo", "Enviado", "Devuelto", "Merma", "% Merma", "Comentario"];
        const tableRows: (string | number)[][] = [];

        group.incidencias.forEach(inc => {
            const merma = inc.item.sentQuantity - inc.item.returnedQuantity;
            const pctMerma = inc.item.sentQuantity > 0 ? (merma / inc.item.sentQuantity) * 100 : 0;
            const incData = [
                inc.item.description,
                inc.item.sentQuantity,
                inc.item.returnedQuantity,
                merma,
                `${pctMerma.toFixed(1)}%`,
                inc.comment
            ];
            tableRows.push(incData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            headStyles: { fillColor: [0, 112, 60] } // Corporate Green
        });

        doc.save(`Informe_Incidencias_${group.osServiceNumber}.pdf`);
    }

    const handleDeleteReport = () => {
        if (!osToDelete) return;
        
        const newIncidencias = incidencias.filter(inc => inc.osId !== osToDelete);
        localStorage.setItem('incidenciasRetorno', JSON.stringify(newIncidencias));
        setIncidencias(newIncidencias);
        
        toast({ title: "Informe Eliminado", description: `Todas las incidencias para la OS han sido eliminadas.` });
        setOsToDelete(null);
    }

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Incidencias de Retorno..." />;
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
                        {groupedAndFilteredIncidencias.map(group => (
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
                                    <div className="border-t p-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Artículo</TableHead>
                                                <TableHead className="w-48">Discrepancia</TableHead>
                                                <TableHead className="w-24 text-center">Merma</TableHead>
                                                <TableHead className="w-24 text-center">% Merma</TableHead>
                                                <TableHead>Comentario</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {group.incidencias.map(inc => {
                                                const merma = inc.item.sentQuantity - inc.item.returnedQuantity;
                                                const pctMerma = inc.item.sentQuantity > 0 ? (merma / inc.item.sentQuantity) * 100 : 0;
                                                return (
                                                    <TableRow key={`${inc.osId}-${inc.item.itemCode}-${inc.timestamp}`}>
                                                        <TableCell className="font-medium">{inc.item.description}</TableCell>
                                                        <TableCell>
                                                            Enviado: {inc.item.sentQuantity} / Devuelto: {inc.item.returnedQuantity}
                                                        </TableCell>
                                                        <TableCell className="text-center font-bold text-destructive">{merma}</TableCell>
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
                                </AccordionContent>
                             </AccordionItem>
                        ))}
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
