'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { OrdenFabricacion, Personal } from '@/types';

interface OfAssignmentTableProps {
    ordenes: OrdenFabricacion[];
    personalCPR: Personal[];
    handleAssignResponsable: (ofId: string, responsable: string) => void;
}

export function OfAssignmentTable({
    ordenes,
    personalCPR,
    handleAssignResponsable
}: OfAssignmentTableProps) {
    const pendingOrders = ordenes.filter(o => o.estado === 'Pendiente');

    return (
        <Card>
            <CardHeader>
                <CardTitle>Asignación de Órdenes Pendientes</CardTitle>
                <CardDescription>Asigna rápidamente las OF pendientes a un responsable de producción.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Lote / OF</TableHead>
                            <TableHead>Elaboración</TableHead>
                            <TableHead>Fecha Prevista</TableHead>
                            <TableHead>Partida</TableHead>
                            <TableHead className="w-56">Asignar a</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pendingOrders.length > 0 ? (
                            pendingOrders.map(of => (
                                <TableRow key={of.id} className="hover:bg-muted/30">
                                    <TableCell><Badge variant="outline">{of.id}</Badge></TableCell>
                                    <TableCell className="font-medium">{of.elaboracionNombre}</TableCell>
                                    <TableCell>{format(new Date(of.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell><Badge variant="secondary">{of.partidaAsignada}</Badge></TableCell>
                                    <TableCell>
                                        <Select onValueChange={(responsable) => handleAssignResponsable(of.id, responsable)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar cocinero..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {personalCPR.map(p => (
                                                    <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">No hay órdenes pendientes de asignación.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
