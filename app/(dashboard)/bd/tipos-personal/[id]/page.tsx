
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, X, UserCog, Trash2 } from 'lucide-react';
import type { CategoriaPersonal, Proveedor } from '@/types';
import { tipoPersonalSchema, type TipoPersonalFormValues } from '../nuevo/page';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EditarTipoPersonalPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { isLoading, setIsLoading } = useLoadingStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const form = useForm<TipoPersonalFormValues>({
    resolver: zodResolver(tipoPersonalSchema),
    defaultValues: {
      precioHora: 0,
    }
  });

  useEffect(() => {
    const allProveedores = (JSON.parse(localStorage.getItem('proveedores') || '[]') as Proveedor[]);
    setProveedores(allProveedores);
    
    const allItems = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
    const item = allItems.find(p => p.id === id);
    if (item) {
      form.reset({
        ...item,
        precioHora: item.precioHora || 0 // Ensure it's a number
      });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se encontró la categoría de personal.' });
      router.push('/bd/tipos-personal');
    }
  }, [id, form, router, toast]);
  
  const handleProviderChange = (providerId: string) => {
    const proveedor = proveedores.find(p => p.id === providerId);
    form.setValue('proveedorId', providerId, { shouldDirty: true });
    form.setValue('nombreProveedor', proveedor?.nombreComercial || '', { shouldDirty: true });
  }

  function onSubmit(data: TipoPersonalFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
    const index = allItems.findIndex(p => p.id === id);

    if (index !== -1) {
      allItems[index] = data;
      localStorage.setItem('tiposPersonal', JSON.stringify(allItems));
      toast({ description: 'Categoría actualizada correctamente.' });
    }
    
    router.push('/bd/tipos-personal');
    setIsLoading(false);
  }
  
  const handleDelete = () => {
    let allItems = JSON.parse(localStorage.getItem('tiposPersonal') || '[]') as CategoriaPersonal[];
    const updatedItems = allItems.filter(p => p.id !== id);
    localStorage.setItem('tiposPersonal', JSON.stringify(updatedItems));
    toast({ title: 'Categoría eliminada' });
    router.push('/bd/tipos-personal');
  };

  return (
    <>
      <main>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <UserCog className="h-8 w-8" />
                <h1 className="text-3xl font-headline font-bold">Editar Categoría de Personal</h1>
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" type="button" onClick={() => router.push('/bd/tipos-personal')}> <X className="mr-2"/> Cancelar</Button>
                 <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2"/> Borrar</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="ml-2">Guardar Cambios</span>
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
                            <Select onValueChange={(value) => handleProviderChange(value)} value={field.value}>
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
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
