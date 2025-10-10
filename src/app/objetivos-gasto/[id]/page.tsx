
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, Target, X } from 'lucide-react';
import type { ObjetivosGasto } from '@/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';

export const objetivosGastoSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'El nombre de la plantilla es obligatorio'),
  gastronomia: z.coerce.number(),
  bodega: z.coerce.number(),
  consumibles: z.coerce.number(),
  hielo: z.coerce.number(),
  almacen: z.coerce.number(),
  alquiler: z.coerce.number(),
  transporte: z.coerce.number(),
  decoracion: z.coerce.number(),
  atipicos: z.coerce.number(),
  personalMice: z.coerce.number(),
  personalExterno: z.coerce.number(),
  costePruebaMenu: z.coerce.number(),
});

type ObjetivosGastoFormValues = z.infer<typeof objetivosGastoSchema>;

const defaultValues: Partial<ObjetivosGastoFormValues> = {
  name: 'Micecatering',
  gastronomia: 0,
  bodega: 0,
  consumibles: 0,
  hielo: 0,
  almacen: 0,
  alquiler: 0,
  transporte: 0,
  decoracion: 0,
  atipicos: 0,
  personalMice: 0,
  personalExterno: 0,
  costePruebaMenu: 0,
};

const labels: Record<keyof Omit<ObjetivosGasto, 'id' | 'name'>, string> = {
    gastronomia: 'Gastronomía',
    bodega: 'Bodega',
    consumibles: 'Consumibles (Bio)',
    hielo: 'Hielo',
    almacen: 'Almacén',
    alquiler: 'Alquiler material',
    transporte: 'Transporte',
    decoracion: 'Decoración',
    atipicos: 'Atípicos',
    personalMice: 'Personal MICE',
    personalExterno: 'Personal Externo',
    costePruebaMenu: 'Coste Prueba de Menu',
}

export default function ObjetivoGastoFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<ObjetivosGastoFormValues>({
    resolver: zodResolver(objetivosGastoSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('objetivosGastoPlantillas') || '[]') as ObjetivosGasto[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró la plantilla.' });
        router.push('/objetivos-gasto');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: ObjetivosGastoFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('objetivosGastoPlantillas') || '[]') as ObjetivosGasto[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data;
        message = 'Plantilla actualizada correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.name.toLowerCase() === data.name.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe una plantilla con este nombre.' });
            setIsLoading(false);
            return;
        }
      allItems.push(data);
      message = 'Plantilla creada correctamente.';
    }

    localStorage.setItem('objetivosGastoPlantillas', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ title: 'Operación Exitosa', description: message });
      setIsLoading(false);
      router.push('/objetivos-gasto');
    }, 1000);
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="objetivo-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Target className="h-8 w-8" />
                    <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nueva'} Plantilla de Objetivos</h1>
                </div>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => router.push('/objetivos-gasto')}>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                </Button>
                <Button type="submit" form="objetivo-form" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
                  <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Plantilla'}</span>
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Nombre de la Plantilla</CardTitle>
                <CardDescription>Dale un nombre descriptivo a esta plantilla de objetivos.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} className="max-w-md" /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target /> Objetivos de Gasto</CardTitle>
                <CardDescription>Define el % máximo de gasto por partida.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(labels).map(key => (
                  <FormField 
                    key={key} 
                    control={form.control} 
                    name={key as keyof Omit<ObjetivosGasto, 'id' | 'name'>}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between py-1 border-b">
                        <FormLabel className="capitalize text-base font-normal">{labels[key as keyof typeof labels]}</FormLabel>
                        <div className="flex items-center gap-2">
                            <FormControl>
                                <Input 
                                    type="number" 
                                    step="0.1"
                                    className="w-24 h-9 text-right" 
                                    {...field}
                                />
                            </FormControl>
                            <span>%</span>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
