'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, ChefHat, Link as LinkIcon, Search, Check, CircleX } from 'lucide-react';
import type { IngredienteInterno, IngredienteERP, Alergeno } from '@/types';
import { ALERGENOS } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const ingredienteFormSchema = z.object({
  id: z.string(),
  nombreIngrediente: z.string().min(1, 'El nombre es obligatorio'),
  productoERPlinkId: z.string().min(1, 'Debe enlazar un producto ERP'),
  mermaPorcentaje: z.coerce.number().min(0).max(100).default(0),
  alergenos: z.array(z.string()).default([]),
});

type IngredienteFormValues = z.infer<typeof ingredienteFormSchema>;

export default function IngredienteFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [ingredientesERP, setIngredientesERP] = useState<IngredienteERP[]>([]);
  const [erpSearchTerm, setErpSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<IngredienteFormValues>({
    resolver: zodResolver(ingredienteFormSchema),
    defaultValues: { nombreIngrediente: '', productoERPlinkId: '', mermaPorcentaje: 0, alergenos: [] },
  });
  
  const selectedErpId = form.watch('productoERPlinkId');
  const selectedErpProduct = ingredientesERP.find(p => p.id === selectedErpId);

  useEffect(() => {
    // Cargar datos ERP
    const storedErp = JSON.parse(localStorage.getItem('ingredientesERP') || '[]') as IngredienteERP[];
    setIngredientesERP(storedErp);

    if (isEditing) {
      const ingredientes = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
      const ingrediente = ingredientes.find(p => p.id === id);
      if (ingrediente) {
        form.reset(ingrediente);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el ingrediente.' });
        router.push('/book/ingredientes');
      }
    } else {
        form.reset({ id: Date.now().toString(), nombreIngrediente: '', productoERPlinkId: '', mermaPorcentaje: 0, alergenos: [] });
    }
  }, [id, isEditing, form, router, toast]);

  function onSubmit(data: IngredienteFormValues) {
    setIsLoading(true);

    let allItems = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    let message = '';
    
    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = data;
        message = 'Ingrediente actualizado correctamente.';
      }
    } else {
       const existing = allItems.find(p => p.nombreIngrediente.toLowerCase() === data.nombreIngrediente.toLowerCase());
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un ingrediente con este nombre.' });
            setIsLoading(false);
            return;
        }
      allItems.push(data);
      message = 'Ingrediente creado correctamente.';
    }

    localStorage.setItem('ingredientesInternos', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ title: 'Operación Exitosa', description: message });
      setIsLoading(false);
      router.push('/book/ingredientes');
    }, 1000);
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="ingrediente-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <ChefHat className="h-8 w-8" />
                    <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Ingrediente</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => router.push('/book/ingredientes')}> <X className="mr-2"/> Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                    <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Ingrediente'}</span>
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>1. Definición del Ingrediente Interno</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="nombreIngrediente" render={({ field }) => (
                            <FormItem><FormLabel>Nombre del Ingrediente</FormLabel><FormControl><Input {...field} placeholder="Ej: Harina de Trigo" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="mermaPorcentaje" render={({ field }) => (
                            <FormItem><FormLabel>% de Merma</FormLabel><FormControl><Input type="number" {...field} placeholder="Ej: 10 para un 10%" /></FormControl><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>2. Vínculo con Materia Prima (ERP)</CardTitle>
                        <CardDescription>Enlaza este ingrediente con un producto de tu base de datos ERP para obtener el coste.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {selectedErpProduct ? (
                            <div className="border rounded-md p-4 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{selectedErpProduct.nombreProductoERP}</p>
                                        <p className="text-sm text-muted-foreground">{selectedErpProduct.nombreProveedor} ({selectedErpProduct.referenciaProveedor})</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => form.setValue('productoERPlinkId', '')}><CircleX className="mr-2"/>Desvincular</Button>
                                </div>
                                <p className="font-bold text-primary text-lg">{selectedErpProduct.precio.toLocaleString('es-ES', {style:'currency', currency: 'EUR'})} / {selectedErpProduct.unidad}</p>
                            </div>
                        ) : (
                             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="secondary" className="w-full"><LinkIcon className="mr-2"/>Vincular Producto ERP</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                    <DialogHeader>
                                        <DialogTitle>Seleccionar Producto ERP</DialogTitle>
                                    </DialogHeader>
                                    <Input placeholder="Buscar por nombre, proveedor, referencia..." value={erpSearchTerm} onChange={e => setErpSearchTerm(e.target.value)} />
                                    <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Producto</TableHead>
                                                    <TableHead>Proveedor</TableHead>
                                                    <TableHead>Precio</TableHead>
                                                    <TableHead></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {ingredientesERP.filter(p => p.nombreProductoERP.toLowerCase().includes(erpSearchTerm.toLowerCase())).map(p => (
                                                    <TableRow key={p.id}>
                                                        <TableCell>{p.nombreProductoERP}</TableCell>
                                                        <TableCell>{p.nombreProveedor}</TableCell>
                                                        <TableCell>{p.precio.toLocaleString('es-ES', {style:'currency', currency: 'EUR'})}/{p.unidad}</TableCell>
                                                        <TableCell>
                                                            <Button size="sm" onClick={() => {form.setValue('productoERPlinkId', p.id); setIsDialogOpen(false)}}>
                                                                <Check className="mr-2" />
                                                                Seleccionar
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </DialogContent>
                             </Dialog>
                        )}
                         <FormMessage className="mt-2 text-red-500">{form.formState.errors.productoERPlinkId?.message}</FormMessage>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>3. Gestión de Alérgenos</CardTitle>
                    <CardDescription>Marca todos los alérgenos presentes en este ingrediente.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                     {ALERGENOS.map((alergeno) => (
                        <FormField
                            key={alergeno}
                            control={form.control}
                            name="alergenos"
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                <Checkbox
                                    checked={field.value?.includes(alergeno)}
                                    onCheckedChange={(checked) => {
                                    return checked
                                        ? field.onChange([...(field.value || []), alergeno])
                                        : field.onChange(
                                            (field.value || [])?.filter(
                                            (value) => value !== alergeno
                                            )
                                        )
                                    }}
                                />
                                </FormControl>
                                <FormLabel className="font-normal capitalize text-sm">
                                    {alergeno.toLowerCase().replace('_', ' ')}
                                </FormLabel>
                            </FormItem>
                            )}
                        />
                    ))}
                </CardContent>
            </Card>

          </form>
        </Form>
      </main>
    </>
  );
}
