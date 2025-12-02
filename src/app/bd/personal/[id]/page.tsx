
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, UserCog, Trash2 } from 'lucide-react';
import type { Personal } from '@/types';
import { DEPARTAMENTOS_PERSONAL } from '@/types';
import { personalFormSchema } from '@/app/bd/personal/nuevo/page';
import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type PersonalFormValues = z.infer<typeof personalFormSchema>;

const defaultFormValues: PersonalFormValues = {
  id: '',
  nombre: '',
  apellido1: '',
  apellido2: '',
  telefono: '',
  iniciales: '',
  email: '',
  precioHora: 0,
  departamento: '',
  categoria: '',
};

export default function EditarPersonalPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalFormSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    const fetchPersonal = async () => {
      const { data, error } = await supabase
        .from('personal')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el empleado.' });
        router.push('/bd/personal');
      } else if (data) {
        form.reset({
          ...defaultFormValues,
          id: data.id,
          nombre: data.nombre,
          apellido1: data.apellido1,
          apellido2: data.apellido2 || '',
          telefono: data.telefono || '',
          email: data.email || '',
          iniciales: data.iniciales || '',
          precioHora: data.precio_hora || 0,
          departamento: data.departamento,
          categoria: data.categoria,
        });
      }
    };

    fetchPersonal();
  }, [id, form, router, toast]);

  async function onSubmit(data: PersonalFormValues) {
    setIsLoading(true);

    const nombreCompleto = `${data.nombre} ${data.apellido1} ${data.apellido2 || ''}`.trim();
    const nombreCompacto = `${data.nombre} ${data.apellido1}`.trim();
    const iniciales = `${data.nombre[0] || ''}${data.apellido1[0] || ''}`.toUpperCase();

    const { error } = await supabase
      .from('personal')
      .update({
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
      })
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el empleado: ' + error.message });
    } else {
      toast({ description: 'Empleado actualizado correctamente.' });
      router.push('/bd/personal');
    }

    setIsLoading(false);
  }

  const handleDelete = async () => {
    const { error } = await supabase
      .from('personal')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el empleado.' });
    } else {
      toast({ title: 'Empleado eliminado' });
      router.push('/bd/personal');
    }
  };

  return (
    <>
      <main>
        <Form {...form}>
          <form id="personal-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <UserCog className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">Editar Empleado</h1>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => router.push('/bd/personal')}> <X className="mr-2" /> Cancelar</Button>
                <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2" /> Borrar</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Guardar Cambios</span>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormItem><FormLabel>DNI</FormLabel><FormControl><Input {...field} readOnly /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro del empleado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
