import { Suspense } from 'react';
import { createClient } from '@/lib/supabase-server';
import { getGastroEsenciales, getAllRecetas } from '@/services/gastro-esenciales-service';
import { GastroEsencialesClient } from './components/GastroEsencialesClient';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Esenciales de Gastronomía | Studio',
  description: 'Gestiona los artículos que se incluyen por defecto en los servicios de gastronomía.',
};

export default async function GastroEsencialesPage() {
  const supabase = await createClient();
  
  // Fetch initial data
  const [esenciales, recetas] = await Promise.all([
    getGastroEsenciales(supabase),
    getAllRecetas(supabase)
  ]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
            <Sparkles className="h-10 w-10 text-amber-500" />
            ESENCIALES DE GASTRONOMÍA
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Artículos que aparecen siempre en el briefing (limones, café, etc.). No computan para ratios.
          </p>
        </div>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <GastroEsencialesClient 
          initialEsenciales={esenciales} 
          availableRecetas={recetas} 
        />
      </Suspense>
    </div>
  );
}
