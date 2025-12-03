/**
 * Example: Infinite Scroll Recetas
 * 
 * This component demonstrates infinite scroll pattern with React Query
 */

'use client';

import { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { ChefHat, Loader2 } from 'lucide-react';
import { useInfiniteRecetas } from '@/lib/react-query-utils';

export default function RecetasInfiniteScrollExample() {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteRecetas(20);

    const observerTarget = useRef<HTMLDivElement>(null);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1 }
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    if (isLoading) {
        return <LoadingSkeleton title="Cargando recetas..." />;
    }

    const allRecetas = data?.pages.flatMap((page) => page.data) || [];

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Recetas</h1>
                <p className="text-muted-foreground">
                    Scroll para cargar más recetas automáticamente
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allRecetas.map((receta) => (
                    <Card key={receta.id} className="hover:shadow-lg transition-all">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ChefHat className="w-5 h-5" />
                                {receta.nombre}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                {receta.descripcionComercial && (
                                    <p className="text-muted-foreground line-clamp-2">
                                        {receta.descripcionComercial}
                                    </p>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Estado:</span>
                                    <span className={`px-2 py-1 rounded text-xs ${receta.estado === 'ACTIVO'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {receta.estado}
                                    </span>
                                </div>
                                {receta.precioVenta && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Precio:</span>
                                        <span className="font-semibold">
                                            {receta.precioVenta.toFixed(2)}€
                                        </span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Intersection Observer Target */}
            <div ref={observerTarget} className="py-8 text-center">
                {isFetchingNextPage && (
                    <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-muted-foreground">Cargando más recetas...</span>
                    </div>
                )}
                {!hasNextPage && allRecetas.length > 0 && (
                    <p className="text-muted-foreground">
                        Has llegado al final de la lista
                    </p>
                )}
            </div>

            {/* Manual Load More Button (fallback) */}
            {hasNextPage && !isFetchingNextPage && (
                <div className="text-center mt-4">
                    <Button onClick={() => fetchNextPage()} variant="outline">
                        Cargar más recetas
                    </Button>
                </div>
            )}
        </div>
    );
}
