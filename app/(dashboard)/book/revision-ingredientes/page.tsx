'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckSquare, Calendar } from 'lucide-react';
import { useRecetas, useElaboraciones } from '@/hooks/use-data-queries';
import type { Receta, Elaboracion } from '@/types';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Sin fecha';

    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

interface RevisionCardProps {
    nombre: string;
    comentario: string | undefined;
    fecha: string | undefined;
    onClick: () => void;
}

function RevisionCard({ nombre, comentario, fecha, onClick }: RevisionCardProps) {
    return (
        <div
            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-amber-50 cursor-pointer transition-colors"
            onClick={onClick}
        >
            <div className="w-1/4 font-medium text-sm">
                <span className="hover:text-primary line-clamp-2">{nombre}</span>
            </div>
            <div className="w-1/2 text-sm text-muted-foreground">
                <p className="line-clamp-2">{comentario || 'Sin comentario de revisión'}</p>
            </div>
            <div className="w-1/4 flex items-center gap-2 text-sm text-muted-foreground justify-end">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(fecha)}</span>
            </div>
        </div>
    );
}

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
        <div>
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
                        <div className="space-y-2">
                            {recetasParaRevisar.length > 0 ? (
                                recetasParaRevisar.map(receta => (
                                    <RevisionCard
                                        key={receta.id}
                                        nombre={receta.nombre}
                                        comentario={receta.comentarioRevision}
                                        fecha={receta.fechaRevision}
                                        onClick={() => router.push(`/book/recetas/${receta.id}`)}
                                    />
                                ))
                            ) : (
                                <div className="h-24 flex items-center justify-center text-muted-foreground">
                                    No hay recetas que necesiten revisión.
                                </div>
                            )}
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
                        <div className="space-y-2">
                            {elaboracionesParaRevisar.length > 0 ? (
                                elaboracionesParaRevisar.map(elab => (
                                    <RevisionCard
                                        key={elab.id}
                                        nombre={elab.nombre}
                                        comentario={elab.comentarioRevision}
                                        fecha={elab.fechaRevision}
                                        onClick={() => router.push(`/book/elaboraciones/${elab.id}`)}
                                    />
                                ))
                            ) : (
                                <div className="h-24 flex items-center justify-center text-muted-foreground">
                                    No hay elaboraciones que necesiten revisión.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
