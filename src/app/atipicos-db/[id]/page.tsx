
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileDown, FilePlus, X } from 'lucide-react';
import type { AtipicoDBItem } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';

export const atipicoFormSchema = z.object({
  id: z.string(),
  concepto: z.string().min(1, 'El concepto es obligatorio'),
  precio: z.coerce.number().min(0, 'El precio debe ser positivo'),
});

type AtipicoFormValues = z.infer<typeof atipicoFormSchema>;

const defaultValues: Partial<AtipicoFormValues> = {
    concepto: '',
    precio: 0,
};

export default function AtipicoFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<AtipicoFormValues>({
    resolver: zodResolver(atipicoFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isEditing) {
      const items = JSON.parse(localStorage.getItem('atipicosDB') || '[]') as AtipicoDBItem[];
      const item = items.find(p => p.id === id);
      if (item) {
        form.reset(item);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el concepto.' });
        router.push('/atipicos-db');
      }
    } else {
        form.reset({...defaultValues, id: Date.now().toString() });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: AtipicoFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('atipicosDB') || '[]') as AtipicoDBItem[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data;
        message = 'Concepto actualizado correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.concepto.toLowerCase() === data.concepto.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un concepto con este nombre.' });
            setIsLoading(false);
            return;
        }
      allItems.push(data);
      message = 'Concepto creado correctamente.';
    }

    localStorage.setItem('atipicosDB', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/atipicos-db');
    }, 1000);
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <FilePlus className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Concepto Atípico</h1>
            </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/atipicos-db')}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
            </Button>
            <Button type="submit" form="atipico-form" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
              <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Concepto'}</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="atipico-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Concepto</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField control={form.control} name="concepto" render={({ field }) => (
                    <FormItem><FormLabel>Concepto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="precio" render={({ field }) => (
                    <FormItem><FormLabel>Precio</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
