/**
 * Example: Eventos List with Prefetching
 * 
 * This component demonstrates how to use prefetching for better UX
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Calendar, Search, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEventos } from '@/hooks/use-data-queries';
import {
    usePrefetchEvento,
    usePrefetchEventoDetails,
    useSearchEventos
} from '@/lib/react-query-utils';

export default function EventosListExample() {
    const [searchTerm, setSearchTerm] = useState('');
    const { data: eventos = [], isLoading } = useEventos();
    const { data: searchResults, isLoading: isSearching } = useSearchEventos(searchTerm);

    const prefetchEvento = usePrefetchEvento();
    const prefetchDetails = usePrefetchEventoDetails();

    // Use search results if searching, otherwise use all eventos
    const displayEventos = searchTerm.length >= 2
        ? searchResults?.pages.flatMap(page => page.data) || []
        : eventos;

    const handleMouseEnter = (eventoId: string) => {
        // Prefetch evento data when user hovers
        prefetchEvento(eventoId);
    };

    const handleClick = async (eventoId: string) => {
        // Prefetch all related data before navigation
        await prefetchDetails(eventoId);
    };

    if (isLoading) {
        return <LoadingSkeleton title="Cargando eventos..." />;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-4">Eventos</h1>

                {/* Search Input */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        type="text"
                        placeholder="Buscar por nombre o número..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {isSearching && (
                <div className="text-center py-4">
                    <p className="text-muted-foreground">Buscando...</p>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {displayEventos.map((evento) => (
                    <Link
                        key={evento.id}
                        href={`/eventos/${evento.id}`}
                        onMouseEnter={() => handleMouseEnter(evento.id)}
                        onClick={() => handleClick(evento.id)}
                    >
                        <Card className="hover:shadow-lg transition-all h-full">
                            <CardHeader>
                                <CardTitle className="flex items-start justify-between">
                                    <span className="flex-1">{evento.client}</span>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                            {format(new Date(evento.startDate), 'dd MMM yyyy', { locale: es })}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Expediente:</span>
                                        <span className="font-mono">{evento.serviceNumber}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Estado:</span>
                                        <span className={`px-2 py-1 rounded text-xs ${evento.status === 'Confirmado'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {evento.status}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {displayEventos.length === 0 && !isSearching && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">
                        {searchTerm.length >= 2
                            ? 'No se encontraron eventos que coincidan con tu búsqueda.'
                            : 'No hay eventos disponibles.'}
                    </p>
                </div>
            )}
        </div>
    );
}
