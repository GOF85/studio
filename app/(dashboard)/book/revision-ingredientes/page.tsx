

'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckSquare } from 'lucide-react';
import { useRecetas, useElaboraciones } from '@/hooks/use-data-queries';
import type { Receta, Elaboracion } from '@/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RevisionPage() {
    const router = useRouter();

    // Use React Query hooks to fetch data from Supabase
    const { data: recetas = [], isLoading: loadingRecetas } = useRecetas();
    const { data: elaboraciones = [], isLoading: loadingElaboraciones } = useElaboraciones();

    // Filter items that require revision
    const recetasParaRevisar = recetas.filter(r => r.requiereRevision);
    const elaboracionesParaRevisar = elaboraciones.filter(e => e.requiereRevision);

    const isLoading = loadingRecetas || loadingElaboraciones;

    if (isLoading) {
        return <LoadingSkeleton title="Cargando Elementos para Revisión..." />;
    }

    return (
        <TooltipProvider>
            <div className="flex items-center gap-4 mb-8">
                <CheckSquare className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-headline font-bold">Revisión Gastronómica</h1>
            </div>
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="text-amber-500" />
                            Recetas que Requieren Revisión
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre de la Receta</TableHead>
                                        <TableHead>Categoría</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recetasParaRevisar.length > 0 ? (
                                        recetasParaRevisar.map(receta => (
                                            <TableRow key={receta.id} className="cursor-pointer hover:bg-amber-50" onClick={() => router.push(`/book/recetas/${receta.id}`)}>
                                                <TableCell className="font-medium">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild><span className="hover:text-primary">{receta.nombre}</span></TooltipTrigger>
                                                        <TooltipContent side="right"><p className="max-w-sm">{receta.comentarioRevision || 'Sin comentario de revisión.'}</p></TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>{receta.categoria}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="h-24 text-center">No hay recetas que necesiten revisión.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="text-amber-500" />
                            Elaboraciones que Requieren Revisión
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre de la Elaboración</TableHead>
                                        <TableHead>Partida de Producción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {elaboracionesParaRevisar.length > 0 ? (
                                        elaboracionesParaRevisar.map(elab => (
                                            <TableRow key={elab.id} className="cursor-pointer hover:bg-amber-50" onClick={() => router.push(`/book/elaboraciones/${elab.id}`)}>
                                                <TableCell className="font-medium">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild><span className="hover:text-primary">{elab.nombre}</span></TooltipTrigger>
                                                        <TooltipContent side="right"><p className="max-w-sm">{elab.comentarioRevision || 'Sin comentario de revisión.'}</p></TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>{elab.partidaProduccion}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="h-24 text-center">No hay elaboraciones que necesiten revisión.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}
