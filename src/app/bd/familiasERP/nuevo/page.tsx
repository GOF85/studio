
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Layers } from 'lucide-react';
import type { FamiliaERP } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';

export const familiaERPSchema = z.object({
  id: z.string(),
  familiaCategoria: z.string().min(1, 'El código de familia es obligatorio'),
  Familia: z.string().min(1, 'El nombre de la familia es obligatorio'),
  Categoria: z.string().min(1, 'La categoría es obligatoria'),
});

export type FamiliaERPFormValues = z.infer<typeof familiaERPSchema>;

export default function NuevaFamiliaERPPage() {
  const router = useRouter();
  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<FamiliaERPFormValues>({
    resolver: zodResolver(familiaERPSchema),
    defaultValues: {
      id: Date.now().toString(),
    },
  });

  function onSubmit(data: FamiliaERPFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('familiasERP') || '[]') as FamiliaERP[];
    
    const existing = allItems.find(p => p.familiaCategoria.toLowerCase() === data.familiaCategoria.toLowerCase());
    if (existing) {
        toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un registro con este código de familia.' });
        setIsLoading(false);
        return;
    }

    allItems.push(data);
    localStorage.setItem('familiasERP', JSON.stringify(allItems));
    
    toast({ description: 'Nueva Familia ERP añadida correctamente.' });
    router.push('/bd/familiasERP');
    setIsLoading(false);
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Form {...form}>
        <form id="familia-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Layers className="h-8 w-8" />
              <h1 className="text-3xl font-headline font-bold">Nueva Familia ERP</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => router.push('/bd/familiasERP')}> <X className="mr-2"/> Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                <span className="ml-2">Guardar</span>
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader><CardTitle className="text-lg">Información de la Familia ERP</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="familiaCategoria" render={({ field }) => (
                  <FormItem><FormLabel>Código Familia (ERP)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="Familia" render={({ field }) => (
                  <FormItem><FormLabel>Nombre Familia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="Categoria" render={({ field }) => (
                  <FormItem><FormLabel>Categoría MICE</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </main>
  );
}
