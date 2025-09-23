'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X, Component, ChefHat, PlusCircle, Trash2, DollarSign } from 'lucide-react';
import type { Elaboracion, IngredienteInterno, UnidadMedida, IngredienteERP, PartidaProduccion, Receta } from '@/types';
import { UNIDADES_MEDIDA } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const componenteSchema = z.object({
    id: z.string(),
    tipo: z.literal('ingrediente'), // Por ahora solo ingredientes
    componenteId: z.string(),
    nombre: z.string(),
    cantidad: z.coerce.number().min(0.001, 'La cantidad debe ser mayor que 0'),
    costePorUnidad: z.coerce.number().optional().default(0),
});

const elaboracionFormSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  produccionTotal: z.coerce.number().min(0.001, 'La producción total es obligatoria'),
  unidadProduccion: z.enum(UNIDADES_MEDIDA),
  partidaProduccion: z.enum(['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION']),
  componentes: z.array(componenteSchema).min(1, 'Debe tener al menos un componente'),
  instruccionesPreparacion: z.string().optional().default(''),
  fotosProduccionURLs: z.array(z.string()).optional().default([]), // Placeholder for multi-image
  videoProduccionURL: z.string().url().or(z.literal('')).optional(),
  formatoExpedicion: z.string().optional().default(''),
  ratioExpedicion: z.coerce.number().optional().default(0),
  tipoExpedicion: z.enum(['REFRIGERADO', 'CONGELADO', 'SECO']),
});

type ElaboracionFormValues = z.infer<typeof elaboracionFormSchema>;
type IngredienteConERP = IngredienteInterno & { erp?: IngredienteERP };

function IngredienteSelector({ onSelect }: { onSelect: (ingrediente: IngredienteConERP) => void }) {
    const [ingredientes, setIngredientes] = useState<IngredienteConERP[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
        const storedErp = JSON.parse(localStorage.getItem('ingredientesERP') || '[]') as IngredienteERP[];
        const erpMap = new Map(storedErp.map(i => [i.id, i]));
        
        const combined = storedInternos.map(ing => ({
            ...ing,
            erp: erpMap.get(ing.productoERPlinkId),
        }));
        setIngredientes(combined);
    }, []);

    const filtered = useMemo(() => {
        return ingredientes.filter(i => 
            i.nombreIngrediente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.erp?.IdERP || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [ingredientes, searchTerm]);

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Seleccionar Ingrediente</DialogTitle></DialogHeader>
            <Input placeholder="Buscar ingrediente o Id. ERP..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                <Table>
                    <TableHeader><TableRow><TableHead>Ingrediente</TableHead><TableHead>Coste / Unidad</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filtered.map(ing => (
                            <TableRow key={ing.id}>
                                <TableCell>{ing.nombreIngrediente}</TableCell>
                                <TableCell>{ing.erp?.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} / {ing.erp?.unidad}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" type="button" onClick={() => onSelect(ing)}>Añadir</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
    );
}

export default function ElaboracionFormPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';
  const cloneId = searchParams.get('cloneId');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [ingredientesData, setIngredientesData] = useState<Map<string, IngredienteConERP>>(new Map());
  const [affectedRecipes, setAffectedRecipes] = useState<Receta[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { toast } = useToast();

  const form = useForm<ElaboracionFormValues>({
    resolver: zodResolver(elaboracionFormSchema),
    defaultValues: { 
        nombre: '', produccionTotal: 1, unidadProduccion: 'KILO', partidaProduccion: 'FRIO', componentes: [],
        tipoExpedicion: 'REFRIGERADO', formatoExpedicion: '', ratioExpedicion: 0,
        instruccionesPreparacion: '', videoProduccionURL: '', fotosProduccionURLs: [],
    }
  });

  const { fields, append, remove, control } = useFieldArray({
      control: form.control,
      name: 'componentes',
  });

  const watchedComponentes = form.watch('componentes');
  const watchedProduccionTotal = form.watch('produccionTotal');

  useEffect(() => {
    const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const storedErp = JSON.parse(localStorage.getItem('ingredientesERP') || '[]') as IngredienteERP[];
    const erpMap = new Map(storedErp.map(i => [i.id, i]));
    const combined = storedInternos.map(ing => ({ ...ing, erp: erpMap.get(ing.productoERPlinkId) }));
    setIngredientesData(new Map(combined.map(i => [i.id, i])));

    const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    let initialData: Elaboracion | null = null;
    
    if (cloneId) {
        const elabToClone = allElaboraciones.find(e => e.id === cloneId);
        if (elabToClone) {
            initialData = { ...elabToClone, id: Date.now().toString(), nombre: `${elabToClone.nombre} (Copia)` };
        }
    } else if (isEditing) {
        initialData = allElaboraciones.find(e => e.id === id) || null;
    }

    if (initialData) {
        form.reset(initialData);
    } else if (!isEditing) {
         form.reset({
            id: Date.now().toString(), nombre: '', produccionTotal: 1, unidadProduccion: 'KILO', partidaProduccion: 'FRIO', componentes: [],
            tipoExpedicion: 'REFRIGERADO', formatoExpedicion: '', ratioExpedicion: 0,
            instruccionesPreparacion: '', videoProduccionURL: '', fotosProduccionURLs: [],
        });
    }

  }, [id, isEditing, cloneId, form]);

  const handleSelectIngrediente = (ingrediente: IngredienteConERP) => {
      const costeConMerma = ingrediente.mermaPorcentaje > 0 && ingrediente.erp
        ? (ingrediente.erp.precio / (1 - ingrediente.mermaPorcentaje / 100))
        : ingrediente.erp?.precio || 0;
      
      append({
          id: `${ingrediente.id}-${Date.now()}`,
          tipo: 'ingrediente',
          componenteId: ingrediente.id,
          nombre: ingrediente.nombreIngrediente,
          cantidad: 1,
          costePorUnidad: costeConMerma
      });
      setIsSelectorOpen(false);
  }
  
  const { costeTotal, costePorUnidad } = useMemo(() => {
    let total = 0;
    watchedComponentes.forEach(componente => {
        if (componente.tipo === 'ingrediente') {
           total += (componente.costePorUnidad || 0) * componente.cantidad;
        }
    });
    const produccionTotal = watchedProduccionTotal > 0 ? watchedProduccionTotal : 1;
    const porUnidad = total / produccionTotal;
    return { costeTotal: total, costePorUnidad: porUnidad };
  }, [watchedComponentes, watchedProduccionTotal]);


  function onSubmit(data: ElaboracionFormValues) {
    setIsLoading(true);
    let allItems = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    let message = '';
    
    const dataToSave: Elaboracion = { 
      ...data, 
      costePorUnidad 
    };

    if (isEditing && !cloneId) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = dataToSave;
        message = 'Elaboración actualizada correctamente.';
      }
    } else {
      allItems.push(dataToSave);
      message = cloneId ? 'Elaboración clonada correctamente.' : 'Elaboración creada correctamente.';
    }

    localStorage.setItem('elaboraciones', JSON.stringify(allItems));
    
    setTimeout(() => {
      toast({ description: message });
      setIsLoading(false);
      router.push('/book/elaboraciones');
    }, 1000);
  }

  const handleAttemptDelete = () => {
    const allRecetas: Receta[] = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const recipesUsingElaboracion = allRecetas.filter(receta => 
      receta.elaboraciones.some(e => e.elaboracionId === id)
    );
    setAffectedRecipes(recipesUsingElaboracion);
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    if (affectedRecipes.length > 0) {
        let allRecetas: Receta[] = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
        const affectedRecipeIds = new Set(affectedRecipes.map(r => r.id));
        const updatedRecetas = allRecetas.map(r => 
            affectedRecipeIds.has(r.id) ? { ...r, requiereRevision: true } : r
        );
        localStorage.setItem('recetas', JSON.stringify(updatedRecetas));
    }

    let allItems = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const updatedItems = allItems.filter(p => p.id !== id);
    localStorage.setItem('elaboraciones', JSON.stringify(updatedItems));
    
    toast({ title: 'Elaboración eliminada' });
    router.push('/book/elaboraciones');
  };

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="elaboracion-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Component className="h-8 w-8" />
                    <h1 className="text-3xl font-headline font-bold">{isEditing && !cloneId ? 'Editar' : 'Nueva'} Elaboración {cloneId && <span className="text-xl text-muted-foreground">(Clonada)</span>}</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => router.push('/book/elaboraciones')}> <X className="mr-2"/> Cancelar</Button>
                    {isEditing && !cloneId && <Button variant="destructive" type="button" onClick={handleAttemptDelete}><Trash2 className="mr-2"/>Borrar</Button>}
                    <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                    <span className="ml-2">{isEditing && !cloneId ? 'Guardar Cambios' : 'Guardar Elaboración'}</span>
                    </Button>
                </div>
            </div>
            
            <Card>
                <CardHeader className="flex flex-row justify-between items-start pb-4">
                    <div>
                        <CardTitle>Información General</CardTitle>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Coste / {form.watch('unidadProduccion')}</p>
                        <p className="font-bold text-2xl text-primary">{costePorUnidad.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="nombre" render={({ field }) => (
                            <FormItem><FormLabel>Nombre de la Elaboración</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="partidaProduccion" render={({ field }) => (
                            <FormItem><FormLabel>Partida de Producción</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="FRIO">FRIO</SelectItem>
                                        <SelectItem value="CALIENTE">CALIENTE</SelectItem>
                                        <SelectItem value="PASTELERIA">PASTELERIA</SelectItem>
                                        <SelectItem value="EXPEDICION">EXPEDICION</SelectItem>
                                    </SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="produccionTotal" render={({ field }) => (
                            <FormItem><FormLabel>Producción Total</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                            <FormField control={form.control} name="unidadProduccion" render={({ field }) => (
                            <FormItem><FormLabel>Unidad</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {UNIDADES_MEDIDA.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )} />
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader className="flex-row items-center justify-between py-4">
                    <div className="space-y-1.5"><CardTitle className="flex items-center gap-2"><ChefHat/>Componentes</CardTitle>
                    <CardDescription>Añade los ingredientes que forman parte de esta preparación.</CardDescription></div>
                    <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                        <DialogTrigger asChild>
                             <Button variant="outline" type="button"><PlusCircle className="mr-2"/>Añadir Componente</Button>
                        </DialogTrigger>
                        <IngredienteSelector onSelect={handleSelectIngrediente} />
                    </Dialog>
                </CardHeader>
                <CardContent>
                     <div className="border rounded-lg">
                        <Table>
                            <TableHeader><TableRow><TableHead className="p-3">Componente</TableHead><TableHead className="w-40 p-3">Cantidad</TableHead><TableHead className="w-40 p-3">Unidad</TableHead><TableHead className="w-12 p-3"></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {fields.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center">Añade un componente para empezar.</TableCell></TableRow>}
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell className="font-medium py-1 px-3">{field.nombre}</TableCell>
                                        <TableCell className="py-1 px-3">
                                            <FormField control={form.control} name={`componentes.${index}.cantidad`} render={({ field: qField }) => (
                                                <FormItem><FormControl><Input type="number" step="any" {...qField} className="h-8" /></FormControl></FormItem>
                                            )} />
                                        </TableCell>
                                        <TableCell className="py-1 px-3">
                                            {ingredientesData.get(field.componenteId)?.erp?.unidad || 'N/A'}
                                        </TableCell>
                                        <TableCell className="py-1 px-3"><Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </div>
                     {form.formState.errors.componentes && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.componentes.message}</p>}
                </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6 items-start">
                 <Card>
                    <CardHeader className="py-4">
                        <CardTitle>Instrucciones y Medios</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="instruccionesPreparacion" render={({ field }) => (
                            <FormItem><FormLabel>Instrucciones de Preparación</FormLabel><FormControl><Textarea {...field} rows={6} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="videoProduccionURL" render={({ field }) => (
                            <FormItem><FormLabel>URL Vídeo Producción</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormItem>
                            <FormLabel>Fotos Producción</FormLabel>
                            <FormControl>
                                <div className="border-dashed border-2 rounded-md p-4 text-center text-muted-foreground h-24 flex items-center justify-center">
                                    Carga de imágenes (Próximamente)
                                </div>
                            </FormControl>
                        </FormItem>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="py-4">
                        <CardTitle>Datos de Expedición</CardTitle>
                        <CardDescription>Define cómo se empaqueta y conserva esta elaboración.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="formatoExpedicion" render={({ field }) => (
                                <FormItem><FormLabel>Formato Expedición</FormLabel><FormControl><Input {...field} placeholder="Ej: Barqueta 1kg" /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="ratioExpedicion" render={({ field }) => (
                                <FormItem><FormLabel>Ratio Expedición</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                         <FormField control={form.control} name="tipoExpedicion" render={({ field }) => (
                            <FormItem><FormLabel>Tipo de Expedición</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="REFRIGERADO">Refrigerado</SelectItem>
                                        <SelectItem value="CONGELADO">Congelado</SelectItem>
                                        <SelectItem value="SECO">Seco</SelectItem>
                                    </SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>
            </div>
          </form>
        </Form>
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  {affectedRecipes.length > 0 ? (
                    <span>¡Atención! Esta elaboración se usa en <strong>{affectedRecipes.length} receta(s)</strong>. Si la eliminas, estas recetas quedarán incompletas y se marcarán para su revisión.</span>
                  ) : (
                    'Esta acción no se puede deshacer. Se eliminará permanentemente la elaboración.'
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
                    {affectedRecipes.length > 0 ? 'Eliminar y Marcar Recetas' : 'Eliminar Elaboración'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}
