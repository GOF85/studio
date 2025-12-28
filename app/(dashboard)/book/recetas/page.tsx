'use client';

import { useState, Suspense } from 'react';
import { useRecetas, useDeleteReceta, useCategoriasRecetas, useElaboraciones, useIngredientesInternos, useArticulosERP, useUpsertReceta } from '@/hooks/use-data-queries';
import { RecetasList } from '@/components/book/RecetasList';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';

function RecetasListPageInner() {
  const { data: recetas = [], isLoading: isLoadingRecetas } = useRecetas();
  const { data: categorias = [], isLoading: isLoadingCategorias } = useCategoriasRecetas();
  const deleteReceta = useDeleteReceta();
  const upsertReceta = useUpsertReceta();
  const { toast } = useToast();

  // Hooks para el recalculo masivo
  const { data: elaboraciones = [] } = useElaboraciones();
  const { data: ingredientes = [] } = useIngredientesInternos();
  const { data: articulosERP = [] } = useArticulosERP();

  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcProgress, setRecalcProgress] = useState(0);
  const [recalcStatus, setRecalcStatus] = useState('');

  const handleDeleteBulk = async (ids: string[]) => {
    try {
      for (const id of ids) {
        await deleteReceta.mutateAsync(id);
      }
      toast({ title: 'Éxito', description: `${ids.length} recetas eliminadas.` });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRecalculateAll = async () => {
    setIsRecalculating(true);
    setRecalcProgress(0);
    setRecalcStatus('Iniciando recalculo...');
    
    try {
      for (let i = 0; i < recetas.length; i++) {
        const receta = recetas[i];
        setRecalcStatus(`Procesando: ${receta.nombre}`);
        setRecalcProgress(Math.round(((i + 1) / recetas.length) * 100));

        let totalCost = 0;
        const elabs = receta.elaboraciones || [];
        
        for (const elabRef of elabs) {
          const dbElab = elaboraciones.find(e => e.id === elabRef.elaboracionId);
          if (dbElab) {
            const cost = (dbElab.costePorUnidad || 0) * (1 + (elabRef.merma || 0) / 100) * elabRef.cantidad;
            totalCost += cost;
          }
        }

        const pvp = totalCost + (totalCost * ((receta.porcentajeCosteProduccion || 30) / 100));

        await upsertReceta.mutateAsync({
          ...receta,
          isEditing: true,
          costeMateriaPrima: totalCost,
          precioVenta: pvp
        });
      }

      toast({ title: 'Éxito', description: 'Todas las recetas han sido recalculadas.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Error durante el recalculo masivo.' });
    } finally {
      setIsRecalculating(false);
      setRecalcStatus('');
    }
  };

  if (isLoadingRecetas || isLoadingCategorias) return <LoadingSkeleton />;

  return (
    <RecetasList 
      recetas={recetas}
      categorias={categorias}
      onDeleteBulk={handleDeleteBulk}
      onRecalculateAll={handleRecalculateAll}
      isRecalculating={isRecalculating}
      recalcProgress={recalcProgress}
      recalcStatus={recalcStatus}
    />
  );
}

export default function RecetasPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <RecetasListPageInner />
    </Suspense>
  );
}
