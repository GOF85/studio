

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Save, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import type { IngredienteERP, UnidadMedida } from '@/types';
import { UNIDADES_MEDIDA, ingredienteErpSchema } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { formatCurrency, formatUnit } from '@/lib/utils';
import { z } from 'zod';

const formSchema = z.object({
    items: z.array(ingredienteErpSchema)
});

type IngredientesERPFormValues = z.infer<typeof formSchema>;

export default function IngredientesERPPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  
  const form = useForm<IngredientesERPFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        items: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  useEffect(() => {
    let storedData = localStorage.getItem('ingredientesERP');
    const items = storedData ? JSON.parse(storedData) : [];
    form.reset({ items });
    setIsMounted(true);
  }, [form]);
  
  const watchedItems = form.watch('items');

  const filteredItems = useMemo(() => {
    if (!watchedItems) return [];
    return watchedItems.map((item, index) => ({...item, originalIndex: index}))
      .filter(item => {
        const term = searchTerm.toLowerCase();
        return (
          (item.nombreProductoERP || '').toLowerCase().includes(term) ||
          (item.nombreProveedor || '').toLowerCase().includes(term) ||
          (item.referenciaProveedor || '').toLowerCase().includes(term) ||
          (item.IdERP || '').toLowerCase().includes(term) ||
          (item.tipo || '').toLowerCase().includes(term)
        );
    });
  }, [watchedItems, searchTerm]);

  function onSubmit(data: IngredientesERPFormValues) {
    setIsLoading(true);
    localStorage.setItem('ingredientesERP', JSON.stringify(data.items));
    setTimeout(() => {
        toast({ title: 'Guardado', description: 'Todos los cambios en la materia prima han sido guardados.' });
        setIsLoading(false);
        form.reset(data); // Mark form as not dirty
    }, 500);
  }

  const handleAddNewRow = () => {
    append({
      id: Date.now().toString(),
      IdERP: '',
      nombreProductoERP: '',
      referenciaProveedor: '',
      nombreProveedor: '',
      familiaCategoria: '',
      precio: 0,
      unidad: 'UNIDAD',
      tipo: '',
    });
  };
  
  const handleDeleteRow = () => {
    if (itemToDelete !== null) {
      remove(itemToDelete);
      setItemToDelete(null);
      toast({title: 'Fila eliminada', description: 'La fila se eliminará permanentemente al guardar los cambios.'})
    }
  }
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Materia Prima..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/bd')} className="mb-2">
                            <ArrowLeft className="mr-2" />
                            Volver a Bases de Datos
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3">Materia Prima (ERP)</h1>
                    </div>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={handleAddNewRow}>
                        <PlusCircle className="mr-2" />
                        Añadir Fila
                    </Button>
                    <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                        {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                        <span className="ml-2">Guardar Cambios</span>
                    </Button>
                </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                <Input 
                    placeholder="Buscar por nombre, Id. ERP, proveedor o referencia..."
                    className="flex-grow max-w-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>

                <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="p-2 w-64">Producto</TableHead>
                        <TableHead className="p-2 w-32">Id. ERP</TableHead>
                        <TableHead className="p-2 w-48">Proveedor</TableHead>
                        <TableHead className="p-2 w-40">Ref. Proveedor</TableHead>
                        <TableHead className="p-2 w-40">Categoría</TableHead>
                        <TableHead className="p-2 w-40">Tipo</TableHead>
                        <TableHead className="p-2 w-28">Precio</TableHead>
                        <TableHead className="p-2 w-32">Unidad</TableHead>
                        <TableHead className="p-2 w-16 text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredItems.length > 0 ? (
                        filteredItems.map(item => (
                        <TableRow key={item.id}>
                            <TableCell className="p-1">
                                <FormField control={form.control} name={`items.${item.originalIndex}.nombreProductoERP`} render={({ field }) => ( <Input {...field} className="h-8"/> )} />
                            </TableCell>
                            <TableCell className="p-1">
                                 <FormField control={form.control} name={`items.${item.originalIndex}.IdERP`} render={({ field }) => ( <Input {...field} className="h-8"/> )} />
                            </TableCell>
                            <TableCell className="p-1">
                                 <FormField control={form.control} name={`items.${item.originalIndex}.nombreProveedor`} render={({ field }) => ( <Input {...field} className="h-8"/> )} />
                            </TableCell>
                            <TableCell className="p-1">
                                 <FormField control={form.control} name={`items.${item.originalIndex}.referenciaProveedor`} render={({ field }) => ( <Input {...field} className="h-8"/> )} />
                            </TableCell>
                            <TableCell className="p-1">
                                 <FormField control={form.control} name={`items.${item.originalIndex}.familiaCategoria`} render={({ field }) => ( <Input {...field} className="h-8"/> )} />
                            </TableCell>
                            <TableCell className="p-1">
                                 <FormField control={form.control} name={`items.${item.originalIndex}.tipo`} render={({ field }) => ( <Input {...field} className="h-8"/> )} />
                            </TableCell>
                            <TableCell className="p-1">
                                 <FormField control={form.control} name={`items.${item.originalIndex}.precio`} render={({ field }) => ( <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="h-8"/> )} />
                            </TableCell>
                            <TableCell className="p-1">
                                <FormField control={form.control} name={`items.${item.originalIndex}.unidad`} render={({ field }) => ( 
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="h-8"><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {UNIDADES_MEDIDA.map(u => <SelectItem key={u} value={u}>{formatUnit(u)}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )} />
                            </TableCell>
                            <TableCell className="text-right p-1">
                                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" type="button" onClick={() => setItemToDelete(item.originalIndex)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                            No se encontraron ingredientes que coincidan con la búsqueda.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </div>
            </form>
        </Form>
      </main>

      <AlertDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La fila se eliminará permanentemente cuando guardes los cambios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteRow}
            >
              Eliminar Fila
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
