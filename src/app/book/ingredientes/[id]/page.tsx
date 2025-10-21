
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, ChefHat, Link as LinkIcon, Check, CircleX, Trash2, AlertTriangle } from 'lucide-react';
import type { IngredienteInterno, ArticuloERP, Alergeno, Elaboracion, Receta } from '@/types';
import { ALERGENOS } from '@/types';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


export const ingredienteFormSchema = z.object({
  id: z.string(),
  nombreIngrediente: z.string().min(1, 'El nombre es obligatorio'),
  productoERPlinkId: z.string().min(1, 'Debe enlazar un producto ERP'),
  alergenosPresentes: z.array(z.string()).default([]),
  alergenosTrazas: z.array(z.string()).default([]),
});

type IngredienteFormValues = z.infer<typeof ingredienteFormSchema>;

function ErpSelectorDialog({ onSelect, searchTerm, setSearchTerm, filteredProducts }: { onSelect: (id: string) => void, searchTerm: string, setSearchTerm: (term: string) => void, filteredProducts: ArticuloERP[] }) {
    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Seleccionar Producto ERP</DialogTitle></DialogHeader>
            <Input placeholder="Buscar por nombre, proveedor, referencia..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                <Table>
                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Proveedor</TableHead><TableHead>Precio</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filteredProducts.map(p => (
                            <TableRow key={p.id}>
                                <TableCell>{p.nombreProductoERP}</TableCell>
                                <TableCell>{p.nombreProveedor}</TableCell>
                                <TableCell>{p.precio.toLocaleString('es-ES', {style:'currency', currency: 'EUR'})}/{p.unidad}</TableCell>
                                <TableCell>
                                    <Button size="sm" onClick={() => onSelect(p.id)}>
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
    );
}

export default function IngredienteFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [affectedElaboraciones, setAffectedElaboraciones] = useState<Elaboracion[]>([]);
  const { toast } = useToast();
  
  const [articulosERP, setArticulosERP] = useState<ArticuloERP[]>([]);
  const [erpSearchTerm, setErpSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<IngredienteFormValues>({
    resolver: zodResolver(ingredienteFormSchema),
    defaultValues: { nombreIngrediente: '', productoERPlinkId: '', alergenosPresentes: [], alergenosTrazas: [] },
  });
  
  const selectedErpId = form.watch('productoERPlinkId');
  const selectedErpProduct = articulosERP.find(p => p.id === selectedErpId);

  const filteredErpProducts = useMemo(() => {
    return articulosERP.filter(p => 
        p.nombreProductoERP.toLowerCase().includes(erpSearchTerm.toLowerCase()) ||
        (p.nombreProveedor || '').toLowerCase().includes(erpSearchTerm.toLowerCase()) ||
        (p.referenciaProveedor || '').toLowerCase().includes(erpSearchTerm.toLowerCase())
    );
  }, [articulosERP, erpSearchTerm]);
  
  const alergenosColumns = React.useMemo(() => {
    const half = Math.ceil(ALERGENOS.length / 2);
    const firstHalf = ALERGENOS.slice(0, half);
    const secondHalf = ALERGENOS.slice(half);
    return [firstHalf, secondHalf];
  }, []);

  useEffect(() => {
    const storedErp = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
    setArticulosERP(storedErp);

    if (isEditing) {
      const ingredientes = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
      const ingrediente = ingredientes.find(p => p.id === id);
      if (ingrediente) {
        form.reset({
          ...ingrediente,
          alergenosPresentes: ingrediente.alergenosPresentes || [],
          alergenosTrazas: ingrediente.alergenosTrazas || [],
        });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el ingrediente.' });
        router.push('/book/ingredientes');
      }
    } else {
        form.reset({ id: Date.now().toString(), nombreIngrediente: '', productoERPlinkId: '', alergenosPresentes: [], alergenosTrazas: [] });
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
      toast({ description: message });
      setIsLoading(false);
      router.push('/book/ingredientes');
    }, 1000);
  }

  const handleAttemptDelete = () => {
    const allElaboraciones: Elaboracion[] = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const elaborationsUsingIngredient = allElaboraciones.filter(elab => 
      elab.componentes.some(c => c.componenteId === id)
    );
    setAffectedElaboraciones(elaborationsUsingIngredient);
    setShowDeleteConfirm(true);
  };


  const handleDelete = () => {
    if (!isEditing) return;

    if (affectedElaboraciones.length > 0) {
        let allRecetas: Receta[] = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
        const affectedElabIds = new Set(affectedElaboraciones.map(e => e.id));
        const recipesToFlag = allRecetas.filter(receta =>
            receta.elaboraciones.some(e => affectedElabIds.has(e.elaboracionId))
        );
        const recipesToFlagIds = new Set(recipesToFlag.map(r => r.id));

        const updatedRecetas = allRecetas.map(r => 
            recipesToFlagIds.has(r.id) ? { ...r, requiereRevision: true } : r
        );
        localStorage.setItem('recetas', JSON.stringify(updatedRecetas));

        toast({
            title: 'Recetas marcadas para revisión',
            description: `${recipesToFlag.length} receta(s) que usaban este ingrediente han sido marcadas.`
        });
    }

    let allItems = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const updatedItems = allItems.filter(p => p.id !== id);
    localStorage.setItem('ingredientesInternos', JSON.stringify(updatedItems));
    toast({ title: 'Ingrediente eliminado' });
    router.push('/book/ingredientes');
  }

  const handleErpSelect = (erpId: string) => {
    form.setValue('productoERPlinkId', erpId, { shouldDirty: true });
    setIsDialogOpen(false);
  }

  const AlergenosTable = ({ alergenosList }: { alergenosList: readonly Alergeno[] }) => (
    <div className="border rounded-md">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[60%] p-2">Alérgeno</TableHead>
                    <TableHead className="text-center p-2">Presente</TableHead>
                    <TableHead className="text-center p-2">Trazas</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {alergenosList.map((alergeno) => (
                    <TableRow key={alergeno}>
                        <TableCell className="capitalize p-2 font-medium text-base -translate-x-1">{alergeno.toLowerCase().replace('_', ' ')}</TableCell>
                        <TableCell className="text-center p-2">
                            <FormField
                                control={form.control}
                                name="alergenosPresentes"
                                render={({ field }) => (
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(alergeno)}
                                            onCheckedChange={(checked) => {
                                                const newValue = checked
                                                    ? [...(field.value || []), alergeno]
                                                    : (field.value || []).filter(v => v !== alergeno);
                                                field.onChange(newValue);
                                                if (checked) {
                                                    const trazas = form.getValues('alergenosTrazas').filter(t => t !== alergeno);
                                                    form.setValue('alergenosTrazas', trazas, { shouldDirty: true });
                                                }
                                            }}
                                        />
                                    </FormControl>
                                )}
                            />
                        </TableCell>
                         <TableCell className="text-center p-2">
                            <FormField
                                control={form.control}
                                name="alergenosTrazas"
                                render={({ field }) => (
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(alergeno)}
                                            onCheckedChange={(checked) => {
                                                const newValue = checked
                                                    ? [...(field.value || []), alergeno]
                                                    : (field.value || []).filter(v => v !== alergeno);
                                                field.onChange(newValue);
                                                if (checked) {
                                                    const presentes = form.getValues('alergenosPresentes').filter(p => p !== alergeno);
                                                    form.setValue('alergenosPresentes', presentes, { shouldDirty: true });
                                                }
                                            }}
                                        />
                                    </FormControl>
                                )}
                            />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
);

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="ingrediente-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <ChefHat className="h-8 w-8" />
                    <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Ingrediente</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => router.push('/book/ingredientes')}> <X className="mr-2"/> Cancelar</Button>
                    {isEditing && (
                        <Button variant="destructive" type="button" onClick={handleAttemptDelete}> <Trash2 className="mr-2"/> Borrar</Button>
                    )}
                    <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                    <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar'}</span>
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="py-3"><CardTitle className="text-lg">Información del Ingrediente</CardTitle></CardHeader>
                <CardContent className="pt-2">
                    <div className="grid grid-cols-12 gap-4 items-start">
                        <div className="col-span-5 space-y-4">
                            <FormField control={form.control} name="nombreIngrediente" render={({ field }) => (
                                <FormItem><FormLabel>Nombre del Ingrediente</FormLabel><FormControl><Input {...field} placeholder="Ej: Harina de Trigo" /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                         <div className="col-span-7">
                             <FormItem>
                                <FormLabel>Vínculo con Artículo ERP</FormLabel>
                                {selectedErpProduct ? (
                                    <div className="border rounded-md p-2 space-y-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-sm leading-tight">{selectedErpProduct.nombreProductoERP}</p>
                                                <p className="text-xs text-muted-foreground">{selectedErpProduct.nombreProveedor} ({selectedErpProduct.referenciaProveedor})</p>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-7 text-muted-foreground" onClick={() => form.setValue('productoERPlinkId', '')}><CircleX className="mr-1 h-3 w-3"/>Desvincular</Button>
                                        </div>
                                        <p className="font-bold text-primary text-sm">{selectedErpProduct.precio.toLocaleString('es-ES', {style:'currency', currency: 'EUR'})} / {selectedErpProduct.unidad}</p>
                                    </div>
                                ) : (
                                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="secondary" className="w-full h-16 border-dashed border-2"><LinkIcon className="mr-2"/>Vincular Artículo ERP</Button>
                                        </DialogTrigger>
                                        <ErpSelectorDialog 
                                            onSelect={handleErpSelect}
                                            searchTerm={erpSearchTerm}
                                            setSearchTerm={setErpSearchTerm}
                                            filteredProducts={filteredErpProducts}
                                        />
                                    </Dialog>
                                )}
                                <FormMessage className="mt-2 text-red-500">{form.formState.errors.productoERPlinkId?.message}</FormMessage>
                            </FormItem>
                         </div>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-lg">Gestión de Alérgenos</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                        <AlergenosTable alergenosList={alergenosColumns[0]} />
                        <AlergenosTable alergenosList={alergenosColumns[1]} />
                    </div>
                </CardContent>
            </Card>

          </form>
        </Form>
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  {affectedElaboraciones.length > 0 ? (
                      <span>¡Atención! Este ingrediente se usa en <strong>{affectedElaboraciones.length} elaboración(es)</strong>. Si lo eliminas, las recetas que contengan estas elaboraciones serán marcadas para su revisión.</span>
                  ) : (
                      'Esta acción no se puede deshacer. Se eliminará permanentemente el ingrediente.'
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
                  {affectedElaboraciones.length > 0 ? 'Eliminar y Marcar' : 'Eliminar Ingrediente'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}
