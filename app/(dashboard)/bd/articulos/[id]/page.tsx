'use client';

import { useParams } from 'next/navigation';
import { ArticuloForm } from '../components/ArticuloForm';
import { useArticulo } from '@/hooks/use-data-queries';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function EditarArticuloPage() {
    const params = useParams();
    const id = params?.id as string;
    const { data: articulo, isLoading } = useArticulo(id);

    if (isLoading) {
        return (
            <main className="container mx-auto py-6">
                <LoadingSkeleton title="Cargando artículo..." />
            </main>
        );
    }

    if (!articulo) {
        return (
            <main className="container mx-auto py-6">
                <div className="text-center">Artículo no encontrado</div>
            </main>
        );
    }

    return (
        <main className="container mx-auto py-6">
            <ArticuloForm initialData={articulo} isEditing={true} />
        </main>
    );
}
