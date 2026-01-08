'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUpsertPersonalExternoDB, useProveedores } from '@/hooks/use-data-queries';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export const personalExternoSchema = z.object({
  id: z.string().min(1, 'El DNI/ID es obligatorio'),
  proveedorId: z.string().min(1, 'El proveedor es obligatorio'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido1: z.string().min(1, 'El primer apellido es obligatorio'),
  apellido2: z.string().optional(),
  categoria: z.string().optional(),
  activo: z.boolean().default(true),
  telefono: z.string().optional(),
  email: z.string().email('Debe ser un email válido').optional().or(z.literal('')),
});

export type PersonalExternoFormValues = z.infer<typeof personalExternoSchema>;

export default function NuevoPersonalExternoPage() {
  const router = useRouter();
  const { data: proveedores = [], isLoading: isLoadingProveedores } = useProveedores();
  const upsertMutation = useUpsertPersonalExternoDB();

  const form = useForm<PersonalExternoFormValues>({
    resolver: zodResolver(personalExternoSchema),
    defaultValues: {
      id: '',
      proveedorId: '',
      nombre: '',
      apellido1: '',
      apellido2: '',
      categoria: '',
      activo: true,
      telefono: '',
      email: '',
    },
  });

  async function onSubmit(data: PersonalExternoFormValues) {
    try {
      await upsertMutation.mutateAsync(data);
      router.push('/bd/personal-externo-db');
    } catch (error) {
      // Error handled by mutation
    }
  }

  if (isLoadingProveedores) {
    return <LoadingSkeleton />;
  }

  return (
    <main>
      <Form {...form}>
        <form id="personal-externo-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <UserPlus className="h-8 w-8" />
              <h1 className="text-3xl font-headline font-bold">Nuevo Trabajador Externo</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => router.push('/bd/personal-externo-db')}> <X className="mr-2"/> Cancelar</Button>
              <Button type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                <span className="ml-2">Guardar</span>
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader><CardTitle className="text-lg">Información del Trabajador</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="proveedorId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Proveedor (ETT)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreComercial}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="id" render={({ field }) => (
                    <FormItem><FormLabel>DNI / ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="categoria" render={({ field }) => (
                    <FormItem><FormLabel>Categoría</FormLabel><FormControl><Input placeholder="Ej: Camarero, Cocinero..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="nombre" render={({ field }) => (
                    <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="apellido1" render={({ field }) => (
                    <FormItem><FormLabel>Primer Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="apellido2" render={({ field }) => (
                    <FormItem><FormLabel>Segundo Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="telefono" render={({ field }) => (
                    <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />                  <FormField control={form.control} name="activo" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Estado Activo</FormLabel>
                        <p className="text-[12px] text-muted-foreground">Define si el trabajador está disponible</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </main>
  );
}