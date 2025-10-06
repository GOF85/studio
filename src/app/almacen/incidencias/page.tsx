
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, Search, Check } from 'lucide-react';
import type { PickingSheet, OrderItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Incidencia = {
    sheetId: string;
    fechaNecesidad: string;
    item: OrderItem;
    comment: string;
    requiredQty: number;
    pickedQty: number;
};

export default function IncidenciasPickingPage() {
    const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
    const [reviewed, setReviewed] = useState<Set<string>>(new Set());
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    
    useEffect(() => {
        const allSheets = JSON.parse(localStorage.getItem('pickingSheets') || '{}') as Record<string, PickingSheet>;
        const loadedIncidencias: Incidencia[] = [];
        
        Object.values(allSheets).forEach(sheet => {
            if (sheet.itemStates) {
                Object.entries(sheet.itemStates).forEach(([itemCode, state]) => {
                    const item = sheet.items.find(i => i.itemCode === itemCode);
                    if (item && (state.incidentComment || state.pickedQuantity !== item.quantity)) {
                        loadedIncidencias.push({
                            sheetId: sheet.id,
                            fechaNecesidad: sheet.fechaNecesidad,
                            item,
                            comment: state.incidentComment || 'Discrepancia de cantidad',
                            requiredQty: item.quantity,
                            pickedQty: state.pickedQuantity
                        });
                    }
                });
            }
        });
        
        setIncidencias(loadedIncidencias.sort((a,b) => new Date(b.fechaNecesidad).getTime() - new Date(a.fechaNecesidad).getTime()));
        
        const storedReviewed = JSON.parse(localStorage.getItem('reviewedPickingIncidents') || '[]');
        setReviewed(new Set(storedReviewed));
        
        setIsMounted(true);
    }, []);
    
    const handleReviewedChange = (incidenciaId: string, isChecked: boolean) => {
        const newReviewed = new Set(reviewed);
        if(isChecked) {
            newReviewed.add(incidenciaId);
        } else {
            newReviewed.delete(incidenciaId);
        }
        setReviewed(newReviewed);
        localStorage.setItem('reviewedPickingIncidents', JSON.stringify(Array.from(newReviewed)));
    };
    
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
                            <TableHead className="w-[100px] text-center">Revisado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredIncidencias.length > 0 ? (
                            filteredIncidencias.map(incidencia => {
                                const id = `${incidencia.sheetId}-${incidencia.item.itemCode}`;
                                const isChecked = reviewed.has(id);
                                return (
                                <TableRow key={id} className={cn(isChecked && 'bg-muted/50 text-muted-foreground')}>
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
                                    <TableCell className="text-center">
                                        <Checkbox 
                                            id={`check-${id}`}
                                            checked={isChecked}
                                            onCheckedChange={(checked) => handleReviewedChange(id, Boolean(checked))}
                                        />
                                    </TableCell>
                                </TableRow>
                            )})
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">No hay incidencias registradas.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

