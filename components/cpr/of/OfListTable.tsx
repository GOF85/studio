'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Factory, Search, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatNumber, formatUnit, formatCurrency, cn } from '@/lib/utils';
import type { OrdenFabricacion, PartidaProduccion, ServiceOrder } from '@/types';

const statusVariant: { [key in OrdenFabricacion['estado']]: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' } = {
    'Pendiente': 'secondary',
    'Asignada': 'default',
    'En Proceso': 'outline',
    'Finalizado': 'success',
    'Incidencia': 'destructive',
    'Validado': 'success',
};

const partidaColorClasses: Record<PartidaProduccion, string> = {
    FRIO: 'bg-green-100/50 hover:bg-green-100/80',
    CALIENTE: 'bg-red-100/50 hover:bg-red-100/80',
    PASTELERIA: 'bg-blue-100/50 hover:bg-blue-100/80',
    EXPEDICION: 'bg-yellow-100/50 hover:bg-yellow-100/80'
};

interface OfListTableProps {
    filteredAndSortedOFs: OrdenFabricacion[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    statusFilter: string;
    setStatusFilter: (status: string) => void;
    statusOptions: string[];
    elaboracionesMap: Map<string, any>;
    getPickingInfo: (ofId: string) => { osId: string; containerId: string } | null;
    serviceOrdersMap: Map<string, ServiceOrder>;
}

export function OfListTable({
    filteredAndSortedOFs,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    statusOptions,
    elaboracionesMap,
    getPickingInfo,
    serviceOrdersMap
}: OfListTableProps) {
    const router = useRouter();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Factory />Órdenes de Fabricación Creadas</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar por Nº de Lote, Elaboración, Responsable..."
                                className="pl-8 w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[240px]">
                                <SelectValue placeholder="Filtrar por estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Estados</SelectItem>
                                {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button asChild>
                        <Link href="/cpr/of/nuevo">
                            <PlusCircle className="mr-2" />
                            Nueva OF Manual
                        </Link>
                    </Button>
                </div>

                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Lote / OF</TableHead>
                                <TableHead>Elaboración</TableHead>
                                <TableHead>Cant. Planificada</TableHead>
                                <TableHead>Cant. Producida</TableHead>
                                <TableHead>Valoración Lote</TableHead>
                                <TableHead>Fecha Prevista</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAndSortedOFs.length > 0 ? (
                                filteredAndSortedOFs.map(of => {
                                    const elab = elaboracionesMap.get(of.elaboracionId);
                                    const costeLote = (elab?.costePorUnidad || 0) * (of.cantidadReal || of.cantidadTotal);
                                    const pickingInfo = getPickingInfo(of.id);

                                    const rowContent = (
                                        <TableRow
                                            key={of.id}
                                            className={cn(
                                                "cursor-pointer",
                                                of.partidaAsignada && partidaColorClasses[of.partidaAsignada]
                                            )}
                                            onClick={() => router.push(`/cpr/of/${of.id}`)}
                                        >
                                            <TableCell className="font-medium">{of.id}</TableCell>
                                            <TableCell>{of.elaboracionNombre}</TableCell>
                                            <TableCell>{formatNumber(of.cantidadTotal, 2)} {formatUnit(of.unidad)}</TableCell>
                                            <TableCell>{of.cantidadReal ? `${formatNumber(of.cantidadReal, 2)} ${formatUnit(of.unidad)}` : '-'}</TableCell>
                                            <TableCell className="font-semibold">{formatCurrency(costeLote)}</TableCell>
                                            <TableCell>{format(new Date(of.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>
                                                <Badge variant={statusVariant[of.estado]}>{of.estado}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    );

                                    if (pickingInfo) {
                                        return (
                                            <Tooltip key={of.id}>
                                                <TooltipTrigger asChild>
                                                    {rowContent}
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div>Asignado al contenedor <Badge variant="secondary">{pickingInfo.containerId}</Badge> para la OS <Badge variant="outline">{serviceOrdersMap.get(pickingInfo.osId)?.serviceNumber}</Badge></div>
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    }
                                    return rowContent;
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        No se encontraron órdenes de fabricación.
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
