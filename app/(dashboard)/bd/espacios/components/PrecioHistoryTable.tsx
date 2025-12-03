'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/hooks/use-toast';
import type { PrecioHistorico } from '@/types/espacios';

interface PrecioHistoryTableProps {
    espacioId: string;
}

export function PrecioHistoryTable({ espacioId }: PrecioHistoryTableProps) {
    const [history, setHistory] = useState<PrecioHistorico[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { isAdmin } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        loadHistory();
    }, [espacioId]);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('espacios_precios_historico')
                .select('*')
                .eq('espacio_id', espacioId)
                .order('fecha_cambio', { ascending: false });

            if (error) throw error;

            // Map snake_case to camelCase
            const mapped: PrecioHistorico[] = (data || []).map((item: any) => ({
                id: item.id,
                espacioId: item.espacio_id,
                fechaCambio: item.fecha_cambio,
                usuarioId: item.usuario_id,
                precioAlquilerAnterior: item.precio_alquiler_anterior,
                canonPorcentajeAnterior: item.canon_porcentaje_anterior,
                canonFijoAnterior: item.canon_fijo_anterior,
                precioAlquilerNuevo: item.precio_alquiler_nuevo,
                canonPorcentajeNuevo: item.canon_porcentaje_nuevo,
                canonFijoNuevo: item.canon_fijo_nuevo,
                motivoCambio: item.motivo_cambio,
                createdAt: item.created_at,
            }));

            setHistory(mapped);
        } catch (error: any) {
            console.error('Error loading price history:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo cargar el histórico de precios',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!isAdmin) {
            toast({
                variant: 'destructive',
                title: 'No autorizado',
                description: 'Solo los administradores pueden borrar registros del histórico',
            });
            return;
        }

        if (!confirm('¿Estás seguro de borrar este registro del histórico?')) return;

        try {
            const { error } = await supabase
                .from('espacios_precios_historico')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({
                title: 'Registro eliminado',
                description: 'El registro se ha borrado del histórico',
            });

            loadHistory();
        } catch (error: any) {
            console.error('Error deleting history record:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'No se pudo borrar el registro',
            });
        }
    };

    const formatCurrency = (value?: number) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
        }).format(value);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-8 flex justify-center items-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Cargando histórico...</span>
                </CardContent>
            </Card>
        );
    }

    if (history.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Histórico de Precios
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No hay cambios registrados. El histórico se generará automáticamente al modificar los precios.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Histórico de Precios ({history.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Alquiler</TableHead>
                                <TableHead>Canon %</TableHead>
                                <TableHead>Canon Fijo</TableHead>
                                <TableHead>Motivo</TableHead>
                                {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell className="font-medium">
                                        {formatDate(record.fechaCambio)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {record.precioAlquilerAnterior !== undefined && (
                                                <span className="text-xs text-muted-foreground line-through">
                                                    {formatCurrency(record.precioAlquilerAnterior)}
                                                </span>
                                            )}
                                            {record.precioAlquilerNuevo !== undefined && (
                                                <span className="text-sm font-medium">
                                                    {formatCurrency(record.precioAlquilerNuevo)}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {record.canonPorcentajeAnterior !== undefined && (
                                                <span className="text-xs text-muted-foreground line-through">
                                                    {record.canonPorcentajeAnterior}%
                                                </span>
                                            )}
                                            {record.canonPorcentajeNuevo !== undefined && (
                                                <span className="text-sm font-medium">
                                                    {record.canonPorcentajeNuevo}%
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {record.canonFijoAnterior !== undefined && (
                                                <span className="text-xs text-muted-foreground line-through">
                                                    {formatCurrency(record.canonFijoAnterior)}
                                                </span>
                                            )}
                                            {record.canonFijoNuevo !== undefined && (
                                                <span className="text-sm font-medium">
                                                    {formatCurrency(record.canonFijoNuevo)}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {record.motivoCambio ? (
                                            <span className="text-sm">{record.motivoCambio}</span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">Sin motivo</span>
                                        )}
                                    </TableCell>
                                    {isAdmin && (
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleDelete(record.id)}
                                            >
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
