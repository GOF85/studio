
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, X, UserCog, Trash2 } from 'lucide-react';
import { personalExternoSchema, type PersonalExternoFormValues } from '../nuevo/page';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePersonalExternoDBItem, useUpsertPersonalExternoDB, useDeletePersonalExternoDB, useProveedores } from '@/hooks/use-data-queries';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function EditarPersonalExternoPage() {
  const router = useRouter();
  const params = useParams() ?? {};
  const id = (params.id as string) || '';

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();
  
  const { data: item, isLoading: isLoadingItem } = usePersonalExternoDBItem(id);
  const { data: proveedores = [], isLoading: isLoadingProveedores } = useProveedores();
  const upsertMutation = useUpsertPersonalExternoDB();
  const deleteMutation = useDeletePersonalExternoDB();

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
    }
  });

  useEffect(() => {
    if (item) {
      form.reset({
        id: item.id,
        proveedorId: item.proveedorId,
        nombre: item.nombre,
        apellido1: item.apellido1,
        apellido2: item.apellido2 || '',
        telefono: item.telefono || '',
        email: item.email || '',
      });
    }
  }, [item, form]);

  async function onSubmit(data: PersonalExternoFormValues) {
    const nombreCompleto = `${data.nombre} ${data.apellido1} ${data.apellido2 || ''}`.trim();
    const nombreCompacto = `${data.nombre} ${data.apellido1}`;

    try {
      await upsertMutation.mutateAsync({ 
        ...data, 
        id,
        nombreCompleto,
        nombreCompacto
      });
      router.push('/bd/personal-externo-db');
    } catch (error) {
      // Error handled by mutation
    }
  }
  
  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      router.push('/bd/personal-externo-db');
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoadingItem || isLoadingProveedores) {
    return <LoadingSkeleton />;
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">No se encontró el trabajador externo.</p>
        <Button onClick={() => router.push('/bd/personal-externo-db')}>Volver al listado</Button>
      </div>
    );
  }

  return (
    <>
      <main>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <UserCog className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">Editar Trabajador Externo</h1>
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" type="button" onClick={() => router.push('/bd/personal-externo-db')}> <X className="mr-2"/> Cancelar</Button>
                 <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)} disabled={deleteMutation.isPending}><Trash2 className="mr-2"/> Borrar</Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Guardar Cambios</span>
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
                        <FormItem><FormLabel>DNI / ID</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>
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
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente el registro.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Eliminar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
