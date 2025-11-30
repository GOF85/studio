'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EspacioForm } from '../components/EspacioForm';
import { getEspacioById } from '@/services/espacios-service';
import type { EspacioV2 } from '@/types/espacios';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { GeneratePDFButton } from '../components/GeneratePDFButton';

export default function VerEspacioPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [espacio, setEspacio] = useState<EspacioV2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEspacio() {
      try {
        const id = params.id as string;
        const data = await getEspacioById(id);
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
  }, [params.id, router, toast]);

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
    <main className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Detalle del Espacio</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/bd/espacios')}>
            Volver
          </Button>
          <GeneratePDFButton espacio={espacio} />
        </div>
      </div>
      <EspacioForm initialData={espacio} readOnly />
    </main>
  );
}
