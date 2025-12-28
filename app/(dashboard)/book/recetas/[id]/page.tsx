'use client';

import { use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  useReceta, 
  useUpsertReceta, 
  useCategoriasRecetas, 
  useElaboraciones, 
  useIngredientesInternos, 
  useArticulosERP,
  usePersonal
} from '@/hooks/use-data-queries';
import { RecetaForm } from '@/components/book/RecetaForm';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_RECETA = {
  id: 'nueva',
  nombre: '',
  categoria: '',
  visibleParaComerciales: true,
  porcentajeCosteProduccion: 30,
  elaboraciones: [],
  fotosMiseEnPlace: [],
  fotosRegeneracion: [],
  fotosEmplatado: [],
  fotosComerciales: [],
  perfilSaborSecundario: [],
  perfilTextura: [],
  tipoCocina: [],
  formatoServicioIdeal: [],
  equipamientoCritico: [],
  etiquetasTendencia: [],
};

export default function RecetaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const isNew = id === 'nueva';

  const { data: receta, isLoading: isLoadingReceta } = useReceta(id);
  const { data: categorias = [], isLoading: isLoadingCats } = useCategoriasRecetas();
  const { data: elaboraciones = [], isLoading: isLoadingElabs } = useElaboraciones();
  const { data: ingredientes = [], isLoading: isLoadingIngs } = useIngredientesInternos();
  const { data: articulosERP = [], isLoading: isLoadingERP } = useArticulosERP();
  const { data: personal = [], isLoading: isLoadingPersonal } = usePersonal();
  
  const upsertReceta = useUpsertReceta();

  const ingredientesMap = useMemo(() => {
    const map = new Map();
    ingredientes.forEach((i: any) => map.set(i.id, i));
    articulosERP.forEach((a: any) => map.set(a.id, a));
    return map;
  }, [ingredientes, articulosERP]);

  const handleSubmit = async (data: any, extra: any) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: formId, ...rest } = data;
      await upsertReceta.mutateAsync({
        ...rest,
        costeMateriaPrima: extra.costeMateriaPrima,
        precioVenta: extra.pvpTeorico,
        alergenos: extra.alergenos,
        partidaProduccion: extra.partidasProduccion,
        isEditing: !isNew,
        id: isNew ? undefined : id
      });
      toast({ title: 'Éxito', description: isNew ? 'Receta creada correctamente.' : 'Receta actualizada correctamente.' });
      router.push('/book/recetas');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la receta.' });
    }
  };

  if (isLoadingReceta || isLoadingCats || isLoadingElabs || isLoadingIngs || isLoadingERP || isLoadingPersonal) {
    if (!isNew || isLoadingCats || isLoadingElabs || isLoadingIngs || isLoadingERP || isLoadingPersonal) {
      return <LoadingSkeleton />;
    }
  }

  return (
    <div className="container mx-auto py-6">
      <RecetaForm 
        initialData={receta || (DEFAULT_RECETA as any)}
        dbCategorias={categorias}
        dbElaboraciones={elaboraciones}
        personalOptions={personal}
        ingredientesMap={ingredientesMap}
        onSave={handleSubmit}
        isSubmitting={upsertReceta.isPending}
      />
    </div>
  );
}
