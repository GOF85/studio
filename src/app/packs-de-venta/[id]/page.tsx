
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, ArrowLeft, Save, ShoppingBag, Loader2, X } from 'lucide-react';
import type { PackDeVenta, Precio } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency } from '@/lib/utils';

const componenteSchema = z.object({
  itemCode: z.string(),
  description: z.string(),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1"),
});

const packSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, "El nombre del pack es obligatorio"),
  pvp: z.coerce.number().min(0, "El PVP debe ser un número positivo"),
  componentes: z.array(componenteSchema).min(1, "El pack debe tener al menos un componente"),
});

type PackFormValues = z.infer<typeof packSchema>;

export default function PackFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [catalogItems, setCatalogItems] = useState<Precio[]>([]);
  const { toast } = useToast();

  const form = useForm<PackFormValues>({
    resolver: zodResolver(packSchema),
    defaultValues: { componentes: [], pvp: 0 },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "componentes",
  });

  useEffect(() => {
    const allPrecios = JSON.parse(localStorage.getItem('precios') || '[]') as Precio[];
    setCatalogItems(allPrecios);

    if (isEditing) {
      const storedPacks = JSON.parse(localStorage.getItem('packsDeVenta') || '[]') as PackDeVenta[];
      const pack = storedPacks.find(p => p.id === id);
      if (pack) {
        form.reset(pack);
      } else {
        toast({ variant: "destructive", title: "Error", description: "Pack de venta no encontrado." });
        router.push('/packs-de-venta');
      }
    } else {
      form.reset({ id: Date.now().toString(), nombre: '', pvp: 0, componentes: [] });
    }
    setIsMounted(true);
  }, [id, isEditing, form, router, toast]);

  const onAddItem = (itemCode: string) => {
    if (!itemCode) return;
    
    const itemInCatalog = catalogItems.find(item => item.id === itemCode);
    if (!itemInCatalog) return;
    
    const itemInForm = fields.find(field => field.itemCode === itemCode);
    if (itemInForm) {
      toast({ variant: 'destructive', title: 'Artículo duplicado', description: 'Este artículo ya está en el pack.' });
      return;
    }

    append({
      itemCode: itemInCatalog.id,
      description: itemInCatalog.producto,
      quantity: 1,
    });
  };

  const onSubmit = (data: PackFormValues) => {
    setIsLoading(true);
    let allPacks = JSON.parse(localStorage.getItem('packsDeVenta') || '[]') as PackDeVenta[];
    
    if (isEditing) {
      const index = allPacks.findIndex(p => p.id === id);
      allPacks[index] = data;
    } else {
      allPacks.push(data);
    }
    
    localStorage.setItem('packsDeVenta', JSON.stringify(allPacks));
    toast({ title: "Guardado", description: `Pack de venta "${data.nombre}" guardado correctamente.` });
    setIsLoading(false);
    router.push('/packs-de-venta');
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Pack de Venta..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/packs-de-venta')} className="mb-2">
                  <ArrowLeft className="mr-2" /> Volver al listado
                </Button>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                  <ShoppingBag /> {isEditing ? 'Editar' : 'Nuevo'} Pack de Venta
                </h1>
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" type="button" onClick={() => router.push('/packs-de-venta')}>
                    <X className="mr-2 h-4 w-4" /> Cancelar
                 </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                    Guardar Pack
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Información General del Pack</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="nombre" render={({ field }) => (
                  <FormItem><FormLabel>Nombre del Pack</FormLabel><FormControl><Input {...field} placeholder="Ej: Box Café Natural" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="pvp" render={({ field }) => (
                  <FormItem><FormLabel>Precio de Venta al Público (PVP)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Componentes del Pack</CardTitle>
                <CardDescription>Añade los artículos de inventario que componen este pack.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4 p-4 border rounded-lg bg-secondary/50">
                  <Label htmlFor="add-item" className="flex-shrink-0">Añadir componente:</Label>
                  <Select onValueChange={onAddItem}>
                    <SelectTrigger id="add-item"><SelectValue placeholder="Busca en el catálogo de precios..." /></SelectTrigger>
                    <SelectContent>
                      {catalogItems.map(item => <SelectItem key={item.id} value={item.id}>{item.producto}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Artículo</TableHead>
                        <TableHead className="w-32">Cantidad</TableHead>
                        <TableHead className="w-16 text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="h-24 text-center">Añade componentes del catálogo al pack.</TableCell></TableRow>
                      ) : (
                        fields.map((field, index) => (
                          <TableRow key={field.id}>
                            <TableCell className="font-medium">{field.description}</TableCell>
                            <TableCell>
                              <FormField control={form.control} name={`componentes.${index}.quantity`} render={({ field: qtyField }) => (
                                  <Input type="number" {...qtyField} className="h-9"/>
                              )} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="text-destructive" type="button" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {form.formState.errors.componentes && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.componentes.message || form.formState.errors.componentes.root?.message}</p>}
              </CardContent>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
