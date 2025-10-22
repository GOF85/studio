

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Component, ChefHat, PlusCircle, Trash2, DollarSign, Image as ImageIcon, Link as LinkIcon, Component as SubElabIcon } from 'lucide-react';
import type { Elaboracion, IngredienteInterno, UnidadMedida, ArticuloERP, PartidaProduccion, Receta, FormatoExpedicion } from '@/types';
import { UNIDADES_MEDIDA } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatCurrency, formatUnit } from '@/lib/utils';
import Image from 'next/image';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ElaborationForm, type ElaborationFormValues } from '@/components/book/elaboration-form';


type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

export default function ElaboracionFormPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';
  const cloneId = searchParams.get('cloneId');
  
  const [initialData, setInitialData] = useState<Partial<ElaborationFormValues> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [affectedRecipes, setAffectedRecipes] = useState<Receta[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    let elabToLoad: Partial<ElaborationFormValues> | null = null;
    const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    
    if (cloneId) {
        const elabToClone = allElaboraciones.find(e => e.id === cloneId);
        if (elabToClone) {
            elabToLoad = { ...elabToClone, id: Date.now().toString(), nombre: `${elabToClone.nombre} (Copia)` };
        }
    } else if (isEditing) {
        elabToLoad = allElaboraciones.find(e => e.id === id) || null;
    } else {
        elabToLoad = { 
            id: Date.now().toString(), nombre: '', produccionTotal: 1, unidadProduccion: 'KG', partidaProduccion: 'FRIO', componentes: [],
            tipoExpedicion: 'REFRIGERADO', formatoExpedicion: '', ratioExpedicion: 0,
            instruccionesPreparacion: '', videoProduccionURL: '', fotosProduccionURLs: [],
        };
    }

    if (elabToLoad) {
        setInitialData(elabToLoad);
    }

  }, [id, isEditing, cloneId]);

  function onSubmit(data: ElaborationFormValues, costePorUnidad: number) {
    setIsLoading(true);
    let allItems = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    let message = '';
    
    const dataToSave: Elaboracion = { 
      ...data, 
      costePorUnidad 
    };

    if (isEditing && !cloneId) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = dataToSave;
        message = 'Elaboración actualizada correctamente.';
      }
    } else {
      allItems.push(dataToSave);
      message = cloneId ? 'Elaboración clonada correctamente.' : 'Elaboración creada correctamente.';
    }

    localStorage.setItem('elaboraciones', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/book/elaboraciones');
    }, 1000);
  }

  const handleAttemptDelete = () => {
    const allRecetas: Receta[] = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const recipesUsingElaboracion = allRecetas.filter(receta => 
      receta.elaboraciones.some(e => e.elaboracionId === id)
    );
    setAffectedRecipes(recipesUsingElaboracion);
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    if (affectedRecipes.length > 0) {
        let allRecetas: Receta[] = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
        const affectedRecipeIds = new Set(affectedRecipes.map(r => r.id));
        const updatedRecetas = allRecetas.map(r => 
            affectedRecipeIds.has(r.id) ? { ...r, requiereRevision: true } : r
        );
        localStorage.setItem('recetas', JSON.stringify(updatedRecetas));
    }

    let allItems = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const updatedItems = allItems.filter(p => p.id !== id);
    localStorage.setItem('elaboraciones', JSON.stringify(updatedItems));
    
    toast({ title: 'Elaboración eliminada' });
    router.push('/book/elaboraciones');
  };
  
  if (!initialData) return <div/>;

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <Component className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing && !cloneId ? 'Editar' : 'Nueva'} Elaboración {cloneId && <span className="text-xl text-muted-foreground">(Clonada)</span>}</h1>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => router.push('/book/elaboraciones')}> <X className="mr-2"/> Cancelar</Button>
                {isEditing && !cloneId && <Button variant="destructive" type="button" onClick={handleAttemptDelete}><Trash2 className="mr-2"/>Borrar</Button>}
                <Button type="submit" form="elaboration-form" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                <span className="ml-2">{isEditing && !cloneId ? 'Guardar Cambios' : 'Guardar Elaboración'}</span>
                </Button>
            </div>
        </div>
        <ElaborationForm
            initialData={initialData}
            onSave={onSubmit}
            isSubmitting={isLoading}
        />
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  {affectedRecipes.length > 0 ? (
                    <span>¡Atención! Esta elaboración se usa en <strong>{affectedRecipes.length} receta(s)</strong>. Si la eliminas, estas recetas quedarán incompletas y se marcarán para su revisión.</span>
                  ) : (
                    'Esta acción no se puede deshacer. Se eliminará permanentemente la elaboración.'
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
                    {affectedRecipes.length > 0 ? 'Eliminar y Marcar Recetas' : 'Eliminar Elaboración'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}
