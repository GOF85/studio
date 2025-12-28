'use client';

import { useParams } from 'next/navigation';
import { useArticulo, useArticuloPacks } from '@/hooks/use-data-queries';
import { ArticuloEntregasForm } from '../components/ArticuloEntregasForm';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function EditarArticuloEntregasPage() {
    const params = useParams();
    const id = params?.id as string;

    const { data: articulo, isLoading: isLoadingArticulo } = useArticulo(id);
    const { data: packs = [], isLoading: isLoadingPacks } = useArticuloPacks(id);

    if (isLoadingArticulo || isLoadingPacks) {
        return (
            <div className="container mx-auto py-6">
                <LoadingSkeleton />
            </div>
        );
    }

    if (!articulo) {
        return (
            <div className="container mx-auto py-6">
                <p>Artículo no encontrado.</p>
            </div>
        );
    }

    // Combinar artículo con sus packs para el formulario
    const initialData = {
        ...articulo,
        packs: packs.map(p => ({ erpId: p.erpId, cantidad: p.cantidad }))
    };

    return (
        <main className="container mx-auto py-6">
            <ArticuloEntregasForm initialData={initialData} isEditing={true} />
        </main>
    );
}
