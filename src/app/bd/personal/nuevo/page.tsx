
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Database, Users, ChevronRight } from 'lucide-react';
import type { Personal } from '@/types';
import { DEPARTAMENTOS_PERSONAL } from '@/types';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { supabase } from '@/lib/supabase';

export const personalFormSchema = z.object({
  id: z.string().min(1, 'El DNI es obligatorio'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido1: z.string().min(1, 'El primer apellido es obligatorio'),
  apellido2: z.string().optional().default(''),
  iniciales: z.string().optional(),
  departamento: z.string().min(1, 'El departamento es obligatorio'),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  telefono: z.string().optional().default(''),
  email: z.string().email('Debe ser un email válido'),
  precioHora: z.coerce.number().min(0, 'El precio por hora no puede ser negativo'),
});

type PersonalFormValues = z.infer<typeof personalFormSchema>;

export default function NuevoPersonalPage() {
  const router = useRouter();
  const { isLoading, setIsLoading } = useLoadingStore();
  const { toast } = useToast();

  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalFormSchema),
    defaultValues: {
      id: '',
      nombre: '',
      apellido1: '',
      apellido2: '',
      iniciales: '',
      departamento: '',
      categoria: '',
      telefono: '',
      email: '',
      precioHora: 0,
    },
  });

  async function onSubmit(data: PersonalFormValues) {
    setIsLoading(true);

    // Check if ID exists
    const { data: existing } = await supabase
      .from('personal')
      .select('id')
      .eq('id', data.id)
      .single();

    if (existing) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un empleado con este DNI.' });
      setIsLoading(false);
      return;
    }

    const nombreCompleto = `${data.nombre} ${data.apellido1} ${data.apellido2 || ''}`.trim();
    const nombreCompacto = `${data.nombre} ${data.apellido1}`.trim();
    const iniciales = `${data.nombre[0]}${data.apellido1[0]}`.toUpperCase();

    const { error } = await supabase.from('personal').insert({
      id: data.id,
      nombre: data.nombre,
      apellido1: data.apellido1,
      apellido2: data.apellido2,
      nombre_completo: nombreCompleto,
      nombre_compacto: nombreCompacto,
      iniciales: iniciales,
      departamento: data.departamento,
      categoria: data.categoria,
      telefono: data.telefono,
      email: data.email,
      precio_hora: data.precioHora,
      activo: true
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el empleado: ' + error.message });
    } else {
      toast({ description: 'Nuevo empleado añadido correctamente.' });
      router.push('/bd/personal');
    }
    setIsLoading(false);
  }

  return (
    <>
      <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Link href="/bd" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Database className="h-5 w-5" />
                <span>Bases de datos</span>
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Link href="/bd/personal" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Users className="h-5 w-5" />
                <span>Personal Interno</span>
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="flex items-center gap-2 font-bold text-primary">
                <span>Nuevo Empleado</span>
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => router.push('/bd/personal')}> <X className="mr-2" /> Cancelar</Button>
              <Button type="submit" form="personal-form" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                <span className="ml-2">Guardar</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="personal-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Información del Empleado</CardTitle></CardHeader>
              <CardContent className="space-y-4">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="departamento" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {DEPARTAMENTOS_PERSONAL.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="categoria" render={({ field }) => (
                    <FormItem><FormLabel>Categoría / Puesto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="precioHora" render={({ field }) => (
                    <FormItem><FormLabel>Precio/Hora</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="telefono" render={({ field }) => (
                    <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="id" render={({ field }) => (
                    <FormItem><FormLabel>DNI</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
