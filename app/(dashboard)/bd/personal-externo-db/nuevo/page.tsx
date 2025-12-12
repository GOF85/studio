'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, UserPlus } from 'lucide-react';
import type { PersonalExternoDB, Proveedor } from '@/types';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export const personalExternoSchema = z.object({
  id: z.string().min(1, 'El DNI/ID es obligatorio'),
  proveedorId: z.string().min(1, 'El proveedor es obligatorio'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido1: z.string().min(1, 'El primer apellido es obligatorio'),
  apellido2: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Debe ser un email válido').optional().or(z.literal('')),
});

type PersonalExternoFormValues = z.infer<typeof personalExternoSchema>;

export default function NuevoPersonalExternoPage() {
  const router = useRouter();
  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  useEffect(() => {
    const storedProveedores = localStorage.getItem('proveedores');
    if (storedProveedores) {
        setProveedores(JSON.parse(storedProveedores));
    }
  }, []);

  const form = useForm<PersonalExternoFormValues>({
    resolver: zodResolver(personalExternoSchema),
    defaultValues: {
      id: '',
      proveedorId: '',
      nombre: '',
      apellido1: '',
      apellido2: '',
      telefono: '',
      email: '',
    },
  });

  function onSubmit(data: PersonalExternoFormValues) {
    setIsLoading(true);

    const allItems = JSON.parse(localStorage.getItem('personalExternoDB') || '[]') as PersonalExternoDB[];
    
    const existing = allItems.find(p => p.id.toLowerCase() === data.id.toLowerCase());
    if (existing) {
        toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un trabajador con este DNI/ID.' });
        setIsLoading(false);
        return;
    }

    const nombreCompleto = `${data.nombre} ${data.apellido1} ${data.apellido2 || ''}`.trim();
    const nombreCompacto = `${data.nombre} ${data.apellido1}`;
    
    const finalData: PersonalExternoDB = {
        id: data.id,
        nombre: data.nombre,
        apellido1: data.apellido1,
        apellido2: data.apellido2 || '',
        proveedorId: data.proveedorId,
        email: data.email || undefined,
        telefono: data.telefono || undefined,
        nombreCompleto,
        nombreCompacto
    }

    allItems.push(finalData);
    localStorage.setItem('personalExternoDB', JSON.stringify(allItems));
    
    toast({ description: 'Nuevo trabajador externo añadido correctamente.' });
    router.push('/bd/personal-externo-db');
    setIsLoading(false);
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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
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
                  )} />
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </main>
  );
}