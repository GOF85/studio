'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EspacioForm } from '../../components/EspacioForm';
import { getEspacioById } from '@/services/espacios-service';
import { supabase } from '@/lib/supabase';
import type { EspacioV2 } from '@/types/espacios';
import { useToast } from '@/hooks/use-toast';

export default function EditarEspacioPage() {
    const params = useParams() ?? {};
    const router = useRouter();
    const { toast } = useToast();
    const [espacio, setEspacio] = useState<EspacioV2 | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadEspacio() {
            try {
                const id = (params.id as string) || '';
                const data = await getEspacioById(supabase, id);
                setEspacio(data);
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'No se pudo cargar el espacio: ' + error.message,
                });
                router.push('/bd/espacios');
            } finally {
                setIsLoading(false);
            }
        }

        loadEspacio();
    }, [params?.id, router, toast]);

    if (isLoading) {
        return (
            <main className="container mx-auto py-6">
                <div className="text-center">Cargando espacio...</div>
            </main>
        );
    }

    if (!espacio) {
        return null;
    }

    return (
        <main className="container mx-auto py-6">
            <EspacioForm initialData={espacio} isEditing />
        </main>
    );
}
