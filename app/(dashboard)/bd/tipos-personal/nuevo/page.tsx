
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, UserCog } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpsertTipoPersonal, useProveedores } from '@/hooks/use-data-queries';

export const tipoPersonalSchema = z.object({
  id: z.string().optional(),
  proveedorId: z.string().min(1, 'Debe seleccionar un proveedor.'),
  nombreProveedor: z.string().optional(),
  categoria: z.string().min(1, 'El nombre de la categoría es obligatorio.'),
  precioHora: z.coerce.number().min(0, 'El precio debe ser un número positivo').default(0),
});

export type TipoPersonalFormValues = z.infer<typeof tipoPersonalSchema>;

export default function NuevoTipoPersonalPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: proveedores = [] } = useProveedores();
  const upsertMutation = useUpsertTipoPersonal();

  const form = useForm<TipoPersonalFormValues>({
    resolver: zodResolver(tipoPersonalSchema),
    defaultValues: {
      proveedorId: '',
      nombreProveedor: '',
      categoria: '',
      precioHora: 0,
    },
  });

  const handleProviderChange = (providerId: string) => {
    const proveedor = proveedores.find(p => p.id === providerId);
    form.setValue('proveedorId', providerId);
    form.setValue('nombreProveedor', proveedor?.nombreComercial || '');
  }

  async function onSubmit(data: TipoPersonalFormValues) {
    try {
      await upsertMutation.mutateAsync(data);
      router.push('/bd/tipos-personal');
    } catch (error) {}
  }

  const isLoading = upsertMutation.isPending;

  return (
    <main>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <UserCog className="h-8 w-8" />
              <h1 className="text-3xl font-headline font-bold">Nueva Categoría de Personal</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => router.push('/bd/tipos-personal')}> <X className="mr-2"/> Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                <span className="ml-2">Guardar Categoría</span>
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader><CardTitle className="text-lg">Información de la Categoría</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField
                    control={form.control}
                    name="proveedorId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Proveedor (ETT)</FormLabel>
                        <Select onValueChange={(value) => handleProviderChange(value)} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar proveedor..." />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreComercial}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField control={form.control} name="categoria" render={({ field }) => (
                  <FormItem><FormLabel>Nombre de la Categoría</FormLabel><FormControl><Input {...field} placeholder="Ej: Camarero de Sala" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="precioHora" render={({ field }) => (
                  <FormItem><FormLabel>Precio por Hora</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </main>
  );
}
