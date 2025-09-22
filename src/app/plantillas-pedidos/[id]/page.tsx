'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, ArrowLeft, Save, FilePlus2, Loader2, X, AlertTriangle } from 'lucide-react';
import type { PedidoPlantilla, MaterialOrderType, CateringItem, OrderItem, AlquilerDBItem, Precio } from '@/types';
import { Header } from '@/components/layout/header';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Label } from '@/components/ui/label';

const plantillaItemSchema = z.object({
  itemCode: z.string(),
  description: z.string(),
  quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1"),
});

const plantillaSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, "El nombre de la plantilla es obligatorio"),
  tipo: z.enum(['Almacén', 'Bodega', 'Bio', 'Alquiler'], {
    errorMap: () => ({ message: "Debe seleccionar un tipo" }),
  }),
  items: z.array(plantillaItemSchema).min(1, "La plantilla debe tener al menos un artículo"),
});

type PlantillaFormValues = z.infer<typeof plantillaSchema>;

export default function PlantillaFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [catalogItems, setCatalogItems] = useState<CateringItem[]>([]);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const { toast } = useToast();

  const form = useForm<PlantillaFormValues>({
    resolver: zodResolver(plantillaSchema),
    defaultValues: { items: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const selectedType = form.watch('tipo');

  useEffect(() => {
    // Cargar catálogos
    const allPrecios = JSON.parse(localStorage.getItem('precios') || '[]') as Precio[];
    const storedAlquilerItems = JSON.parse(localStorage.getItem('alquilerDB') || '[]') as AlquilerDBItem[];

    let itemsToLoad: CateringItem[] = [];
    if (selectedType === 'Alquiler') {
      itemsToLoad = storedAlquilerItems.map(item => ({
        itemCode: item.id,
        description: item.concepto,
        price: item.precioAlquiler,
        stock: 999,
        imageUrl: item.imagen || '',
        imageHint: 'rental item',
        category: 'Alquiler',
      }));
    } else if (selectedType) {
      const categoryMap = { 'Almacén': 'ALMACEN', 'Bodega': 'BODEGA', 'Bio': 'BIO' };
      const filterCategory = categoryMap[selectedType];
      itemsToLoad = allPrecios
        .filter(p => p.categoria === filterCategory)
        .map(p => ({
          itemCode: p.id,
          description: p.producto,
          price: selectedType === 'Bodega' ? p.precioUd : p.precioAlquilerUd,
          stock: 999,
          imageUrl: p.imagen || '',
          imageHint: p.producto.toLowerCase(),
          category: p.categoria,
        }));
    }
    setCatalogItems(itemsToLoad);
  }, [selectedType]);

  useEffect(() => {
    if (isEditing) {
      const storedPlantillas = JSON.parse(localStorage.getItem('pedidoPlantillas') || '[]') as PedidoPlantilla[];
      const plantilla = storedPlantillas.find(p => p.id === id);
      if (plantilla) {
        form.reset(plantilla);
      } else {
        toast({ variant: "destructive", title: "Error", description: "Plantilla no encontrada." });
        router.push('/plantillas-pedidos');
      }
    } else {
      form.reset({ id: Date.now().toString(), nombre: '', items: [] });
    }
    setIsMounted(true);
  }, [id, isEditing, form, router, toast]);

  const onAddItem = (itemCode: string) => {
    if (!itemCode) return;
    
    const itemInCatalog = catalogItems.find(item => item.itemCode === itemCode);
    if (!itemInCatalog) return;
    
    const itemInForm = fields.find(field => field.itemCode === itemCode);
    if (itemInForm) {
      toast({ variant: 'destructive', title: 'Artículo duplicado', description: 'Este artículo ya está en la plantilla.' });
      return;
    }

    append({
      itemCode: itemInCatalog.itemCode,
      description: itemInCatalog.description,
      quantity: 1,
    });
  };

  const onSubmit = (data: PlantillaFormValues) => {
    setIsLoading(true);
    let allPlantillas = JSON.parse(localStorage.getItem('pedidoPlantillas') || '[]') as PedidoPlantilla[];
    const dataToSave = { ...data, items: data.items.map(({ itemCode, quantity, description }) => ({ itemCode, quantity, description }))};

    if (isEditing) {
      const index = allPlantillas.findIndex(p => p.id === id);
      allPlantillas[index] = dataToSave;
    } else {
      allPlantillas.push(dataToSave);
    }
    
    localStorage.setItem('pedidoPlantillas', JSON.stringify(allPlantillas));
    toast({ title: "Guardado", description: `Plantilla "${data.nombre}" guardada correctamente.` });
    setIsLoading(false);
    router.push('/plantillas-pedidos');
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando plantilla..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/plantillas-pedidos')} className="mb-2">
                  <ArrowLeft className="mr-2" /> Volver al listado
                </Button>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                  <FilePlus2 /> {isEditing ? 'Editar' : 'Nueva'} Plantilla de Pedido
                </h1>
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" type="button" onClick={() => router.push('/plantillas-pedidos')}>
                    <X className="mr-2 h-4 w-4" /> Cancelar
                 </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                    Guardar Plantilla
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Información de la Plantilla</CardTitle>
                <CardDescription>Define el nombre y el tipo de pedido para esta plantilla.</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="nombre" render={({ field }) => (
                  <FormItem><FormLabel>Nombre de la Plantilla</FormLabel><FormControl><Input {...field} placeholder="Ej: Coffee Básico 50pax" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="tipo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Pedido</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Almacén">Almacén</SelectItem>
                        <SelectItem value="Bodega">Bodega</SelectItem>
                        <SelectItem value="Bio">Bio</SelectItem>
                        <SelectItem value="Alquiler">Alquiler</SelectItem>
                      </SelectContent>
                    </Select>
                     {isEditing && <FormDescription>El tipo no se puede cambiar al editar.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {selectedType && (
              <Card>
                <CardHeader>
                  <CardTitle>Artículos de la Plantilla</CardTitle>
                  <CardDescription>Añade los artículos y las cantidades por defecto para esta plantilla.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4 p-4 border rounded-lg bg-secondary/50">
                        <Label htmlFor="add-item" className="flex-shrink-0">Añadir artículo:</Label>
                        <Select onValueChange={onAddItem}>
                            <SelectTrigger id="add-item">
                                <SelectValue placeholder="Busca en el catálogo..." />
                            </SelectTrigger>
                            <SelectContent>
                                {catalogItems.map(item => <SelectItem key={item.itemCode} value={item.itemCode}>{item.description}</SelectItem>)}
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
                          <TableRow><TableCell colSpan={3} className="h-24 text-center">Añade artículos del catálogo a la plantilla.</TableCell></TableRow>
                        ) : (
                          fields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell className="font-medium">{field.description}</TableCell>
                              <TableCell>
                                <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: qtyField }) => (
                                    <Input type="number" {...qtyField} className="h-9"/>
                                )} />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="text-destructive" type="button" onClick={() => setItemToDelete(index)}><Trash2 className="h-4 w-4" /></Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                   {form.formState.errors.items && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.items.message || form.formState.errors.items.root?.message}</p>}
                </CardContent>
              </Card>
            )}
          </form>
        </Form>
      </main>

      <AlertDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar artículo?</AlertDialogTitle>
            <AlertDialogDescription>Se quitará este artículo de la plantilla.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (itemToDelete !== null) remove(itemToDelete); setItemToDelete(null); }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
