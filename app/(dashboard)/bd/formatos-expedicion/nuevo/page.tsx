
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Package } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDataStore } from '@/hooks/use-data-store';

const formatoExpedicionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
});

type FormValues = z.infer<typeof formatoExpedicionSchema>;

export default function NuevoFormatoExpedicionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { refreshData } = useDataStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formatoExpedicionSchema),
    defaultValues: {
      nombre: '',
    },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);

    // Check if already exists
    const { data: existing } = await supabase
      .from('formatos_expedicion')
      .select('id')
      .ilike('nombre', data.nombre)
      .single();

    if (existing) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un formato con este nombre.' });
      setIsLoading(false);
      return;
    }

    const { error } = await supabase
      .from('formatos_expedicion')
      .insert([{ nombre: data.nombre }]);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setIsLoading(false);
    } else {
      toast({ description: 'Nuevo formato añadido correctamente.' });
      refreshData();
      router.push('/bd/formatos-expedicion');
    }
  }

  return (
    <main>
      <Form {...form}>
        <form id="formato-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8" />
              <h1 className="text-3xl font-headline font-bold">Nuevo Formato de Expedición</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => router.push('/bd/formatos-expedicion')}> <X className="mr-2" /> Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                <span className="ml-2">Guardar</span>
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Información del Formato</CardTitle></CardHeader>
            <CardContent>
              <FormField control={form.control} name="nombre" render={({ field }) => (
                <FormItem><FormLabel>Nombre del Formato</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>
        </form>
      </Form>
    </main>
  );
}
