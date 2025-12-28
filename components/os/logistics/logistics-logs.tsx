'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLogisticaLogs } from '@/hooks/use-os-logistics';
import { Loader2, History, Package, AlertTriangle, Lock } from 'lucide-react';

interface LogisticsLogsProps {
    osId: string;
}

export function LogisticsLogs({ osId }: LogisticsLogsProps) {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { loadLogs } = useLogisticaLogs();

    useEffect(() => {
        const fetchLogs = async () => {
            const data = await loadLogs(osId);
            setLogs(data);
            setIsLoading(false);
        };
        if (osId) fetchLogs();
    }, [osId, loadLogs]);

    const getActionBadge = (accion: string) => {
        switch (accion) {
            case 'REGISTRO_DEVOLUCION':
                return <Badge variant="outline" className="border-green-500 text-green-600"><Package className="w-3 h-3 mr-1" /> Devolución</Badge>;
            case 'REGISTRO_MERMA':
                return <Badge variant="outline" className="border-red-500 text-red-600"><AlertTriangle className="w-3 h-3 mr-1" /> Merma</Badge>;
            case 'CIERRE_OS':
                return <Badge variant="outline" className="border-blue-500 text-blue-600"><Lock className="w-3 h-3 mr-1" /> Cierre</Badge>;
            default:
                return <Badge variant="secondary">{accion}</Badge>;
        }
    };

    const formatDetails = (log: any) => {
        const { detalles, accion } = log;
        if (!detalles) return '-';

        if (accion === 'REGISTRO_DEVOLUCION') {
            return `${detalles.cantidad}x ${detalles.articulo} (${detalles.modulo})`;
        }
        if (accion === 'REGISTRO_MERMA') {
            return `${detalles.cantidad}x ${detalles.articulo} - Impacto: ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(detalles.coste)}`;
        }
        if (accion === 'CIERRE_OS') {
            return `OS cerrada por el usuario`;
        }

        return JSON.stringify(detalles);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historial de Auditoría
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Acción</TableHead>
                                <TableHead>Detalles</TableHead>
                                <TableHead>Usuario</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length > 0 ? (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {format(new Date(log.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
                                        </TableCell>
                                        <TableCell>{getActionBadge(log.accion)}</TableCell>
                                        <TableCell>{formatDetails(log)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {log.usuario_id?.substring(0, 8) || 'Sistema'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No hay registros de actividad.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
