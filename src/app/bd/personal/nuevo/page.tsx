
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, UserPlus } from 'lucide-react';
import type { Personal } from '@/types';
import { DEPARTAMENTOS_PERSONAL } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';

export const personalFormSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellidos: z.string().min(1, 'Los apellidos son obligatorios'),
  iniciales: z.string().optional(),
  departamento: z.string().min(1, 'El departamento es obligatorio'),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  telefono: z.string().optional(),
  mail: z.string().email('Debe ser un email válido'),
  dni: z.string().optional(),
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
      id: Date.now().toString(),
      precioHora: 0
    },
  });

  function onSubmit(data: PersonalFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    
    // Auto-generate initials if not provided
    if (!data.iniciales && data.nombre && data.apellidos) {
        const nameParts = data.nombre.split(' ');
        const lastNameParts = data.apellidos.split(' ');
        data.iniciales = `${nameParts[0][0]}${lastNameParts[0][0]}`.toUpperCase();
    }
    
    allItems.push(data);
    localStorage.setItem('personal', JSON.stringify(allItems));
    
    toast({ description: 'Nuevo empleado añadido correctamente.' });
    router.push('/bd/personal');
    setIsLoading(false);
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="personal-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <UserPlus className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">Nuevo Empleado</h1>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => router.push('/bd/personal')}> <X className="mr-2"/> Cancelar</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Guardar</span>
                </Button>
              </div>
            </div>
            
            <Card>
              <CardHeader><CardTitle className="text-lg">Información del Empleado</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="nombre" render={({ field }) => (
                    <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="apellidos" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Apellidos</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
                     <FormField control={form.control} name="mail" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="dni" render={({ field }) => (
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
