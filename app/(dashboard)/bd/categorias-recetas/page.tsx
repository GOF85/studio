import { Suspense } from 'react';
import { createClient } from '@/lib/supabase-server';
import { getCategoriasRecetas } from '@/services/categorias-recetas-service';
import { CategoriasRecetasClient } from './components/CategoriasRecetasClient';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { BookHeart } from 'lucide-react';

export default async function CategoriasRecetasPage() {
  const supabase = await createClient();
  const initialData = await getCategoriasRecetas(supabase);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
            <BookHeart className="h-10 w-10 text-primary" />
            CATEGORÍAS DE RECETAS
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Gestiona las categorías para organizar tus recetas y elaboraciones.
          </p>
        </div>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <CategoriasRecetasClient initialData={initialData} />
      </Suspense>
    </div>
  );
}
