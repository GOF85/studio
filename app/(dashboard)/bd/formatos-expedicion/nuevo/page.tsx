
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
import { useUpsertFormatoExpedicion } from '@/hooks/use-data-queries';

export const formatoExpedicionSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
});

export type FormatoExpedicionFormValues = z.infer<typeof formatoExpedicionSchema>;

export default function NuevoFormatoExpedicionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const upsertMutation = useUpsertFormatoExpedicion();

  const form = useForm<FormatoExpedicionFormValues>({
    resolver: zodResolver(formatoExpedicionSchema),
    defaultValues: {
      nombre: '',
    },
  });

  async function onSubmit(data: FormatoExpedicionFormValues) {
    try {
      await upsertMutation.mutateAsync({
        ...data,
        id: data.id || crypto.randomUUID(),
      });
      toast({ description: 'Nuevo formato añadido correctamente.' });
      router.push('/bd/formatos-expedicion');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  const isLoading = upsertMutation.isPending;

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
