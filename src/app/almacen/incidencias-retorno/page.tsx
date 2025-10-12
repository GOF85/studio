
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Search } from 'lucide-react';
import type { MaterialOrder, OrderItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

type ReturnSheetItem = OrderItem & { sentQuantity: number; orderId: string; type: MaterialOrder['type'] };
type ReturnIncidencia = { osId: string; osServiceNumber: string; item: ReturnSheetItem; comment: string; timestamp: string };

export default function IncidenciasRetornoPage() {
    const [incidencias, setIncidencias] = useState<ReturnIncidencia[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    useEffect(() => {
        const loadedIncidencias = JSON.parse(localStorage.getItem('incidenciasRetorno') || '[]') as ReturnIncidencia[];
        setIncidencias(loadedIncidencias.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setIsMounted(true);
    }, []);

    const filteredIncidencias = useMemo(() => {
        return incidencias.filter(inc =>
            inc.osServiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inc.item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inc.comment.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [incidencias, searchTerm]);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Incidencias de Retorno..." />;
    }

    return (
        <div>
            <div className="relative flex-grow mb-6">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por OS, artículo o comentario..."
                    className="pl-8 w-full max-w-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="border rounded-lg">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[120px]">Fecha Incidencia</TableHead>
                            <TableHead>Nº Servicio (OS)</TableHead>
                            <TableHead>Artículo</TableHead>
                            <TableHead>Comentario del Operario</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredIncidencias.length > 0 ? (
                            filteredIncidencias.map(incidencia => (
                                <TableRow key={`${incidencia.osId}-${incidencia.item.itemCode}-${incidencia.timestamp}`}>
                                    <TableCell>{format(parseISO(incidencia.timestamp), 'dd/MM/yyyy HH:mm')}</TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant="outline" 
                                            className="cursor-pointer hover:bg-accent"
                                            onClick={() => router.push(`/os/${incidencia.osId}/almacen`)}
                                        >
                                            {incidencia.osServiceNumber}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{incidencia.item.description}</TableCell>
                                    <TableCell className="max-w-md truncate">{incidencia.comment}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">No hay incidencias de retorno registradas.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
