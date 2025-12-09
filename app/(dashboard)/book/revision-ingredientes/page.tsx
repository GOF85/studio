'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckSquare, Calendar, ChevronRight, CheckCircle2, FileText, Component } from 'lucide-react';
import { useRecetas, useElaboraciones } from '@/hooks/use-data-queries';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

// --- HELPERS ---
function formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(date);
}

// --- COMPONENTES UI ---

interface RevisionItemProps {
    id: string;
    nombre: string;
    comentario: string | undefined;
    fecha: string | undefined;
    type: 'receta' | 'elaboracion';
    onClick: () => void;
}

function RevisionItem({ nombre, comentario, fecha, type, onClick }: RevisionItemProps) {
    return (
        <div 
            onClick={onClick}
            className="group flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-4 bg-card border rounded-lg hover:border-amber-400 hover:shadow-sm transition-all cursor-pointer relative overflow-hidden"
        >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400/50 group-hover:bg-amber-500 transition-colors" />

            <div className="flex gap-4 items-start pl-2">
                <div className="mt-1 p-2 bg-amber-100/50 rounded-full text-amber-600">
                    {type === 'receta' ? <FileText className="h-5 w-5" /> : <Component className="h-5 w-5" />}
                </div>
                <div className="space-y-1">
                    <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                        {nombre}
                        {type === 'elaboracion' && <Badge variant="outline" className="text-[10px] h-5">Elaboración</Badge>}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-snug">
                        <span className="font-medium text-amber-600/80 mr-1">Motivo:</span> 
                        {comentario || 'Revisión manual solicitada sin comentarios.'}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 pl-12 sm:pl-0 w-full sm:w-auto mt-2 sm:mt-0">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(fecha)}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary hidden sm:flex">
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/5">
            <div className="p-4 bg-green-100 rounded-full mb-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Todo al día</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">{message}</p>
        </div>
    );
}

// --- PÁGINA PRINCIPAL ---

export default function RevisionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // FIX: Leer parámetro de la URL
    const defaultTab = searchParams.get('tab') === 'elaboraciones' ? 'elaboraciones' : 'recetas';

    const { data: recetas = [], isLoading: loadingRecetas } = useRecetas();
    const { data: elaboraciones = [], isLoading: loadingElaboraciones } = useElaboraciones();

    const recetasParaRevisar = recetas.filter(r => r.requiereRevision);
    const elaboracionesParaRevisar = elaboraciones.filter(e => e.requiereRevision);

    const isLoading = loadingRecetas || loadingElaboraciones;

    if (isLoading) {
        return <LoadingSkeleton title="Cargando Tareas de Revisión..." />;
    }

    return (
        <main className="pb-24 bg-background min-h-screen">
            
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm pt-2">
                {/* FIX: Usar defaultTab dinámico */}
                <Tabs defaultValue={defaultTab} className="w-full">
                    
                    <div className="flex items-center px-4 pb-2 gap-3">
                        <CheckSquare className="h-6 w-6 text-primary" />
                        <h1 className="text-lg font-bold">Revisión Gastronómica</h1>
                    </div>

                    <div className="px-4">
                        <TabsList className="w-full justify-start bg-transparent p-0 h-10 gap-6 border-none">
                            <TabsTrigger 
                                value="recetas" 
                                className="rounded-none border-b-2 border-transparent px-1 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent transition-all"
                            >
                                Recetas
                                {recetasParaRevisar.length > 0 && (
                                    <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">
                                        {recetasParaRevisar.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger 
                                value="elaboraciones" 
                                className="rounded-none border-b-2 border-transparent px-1 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent transition-all"
                            >
                                Elaboraciones
                                {elaboracionesParaRevisar.length > 0 && (
                                    <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">
                                        {elaboracionesParaRevisar.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-4 max-w-5xl mx-auto mt-4">
                        <TabsContent value="recetas" className="space-y-4 m-0 focus-visible:ring-0">
                            {recetasParaRevisar.length > 0 ? (
                                <div className="grid gap-3">
                                    <div className="flex items-center gap-2 mb-2 px-1">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Pendientes ({recetasParaRevisar.length})
                                        </span>
                                    </div>
                                    {recetasParaRevisar.map(receta => (
                                        <RevisionItem
                                            key={receta.id}
                                            id={receta.id}
                                            nombre={receta.nombre}
                                            comentario={receta.comentarioRevision}
                                            fecha={receta.fechaRevision}
                                            type="receta"
                                            onClick={() => router.push(`/book/recetas/${receta.id}`)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState message="No hay recetas pendientes de revisión." />
                            )}
                        </TabsContent>

                        <TabsContent value="elaboraciones" className="space-y-4 m-0 focus-visible:ring-0">
                            {elaboracionesParaRevisar.length > 0 ? (
                                <div className="grid gap-3">
                                    <div className="flex items-center gap-2 mb-2 px-1">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Pendientes ({elaboracionesParaRevisar.length})
                                        </span>
                                    </div>
                                    {elaboracionesParaRevisar.map(elab => (
                                        <RevisionItem
                                            key={elab.id}
                                            id={elab.id}
                                            nombre={elab.nombre}
                                            comentario={elab.comentarioRevision}
                                            fecha={elab.fechaRevision}
                                            type="elaboracion"
                                            onClick={() => router.push(`/book/elaboraciones/${elab.id}`)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState message="No hay elaboraciones pendientes de revisión." />
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </main>
    );
}