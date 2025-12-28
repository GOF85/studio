'use client';

import { useParams, useRouter } from 'next/navigation';
import { EspacioForm } from '../components/EspacioForm';
import { useEspacioItem } from '@/hooks/use-data-queries';
import { Button } from '@/components/ui/button';
import { GeneratePDFButton } from '../components/GeneratePDFButton';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Pencil } from 'lucide-react';
import { useState } from 'react';

export default function VerEspacioPage() {
  const params = useParams() ?? {};
  const router = useRouter();
  const id = (params.id as string) || '';
  const { data: espacio, isLoading } = useEspacioItem(id);
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <main className="container mx-auto py-6">
        <LoadingSkeleton title="Cargando espacio..." />
      </main>
    );
  }

  if (!espacio) {
    return (
      <main className="container mx-auto py-6">
        <div className="text-center">Espacio no encontrado</div>
        <Button onClick={() => router.push('/bd/espacios')} className="mt-4">
          Volver al listado
        </Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editando Espacio' : 'Detalle del Espacio'}
        </h1>
        <div className="flex gap-2">
          {!isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <GeneratePDFButton espacio={espacio} />
            </>
          )}
          <Button variant="ghost" onClick={() => isEditing ? setIsEditing(false) : router.push('/bd/espacios')}>
            {isEditing ? 'Cancelar' : 'Volver'}
          </Button>
        </div>
      </div>
      <EspacioForm 
        initialData={espacio} 
        isEditing={isEditing} 
        readOnly={!isEditing} 
      />
    </main>
  );
}
