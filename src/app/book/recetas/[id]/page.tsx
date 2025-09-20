
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { Loader2, Save, X, BookHeart, Utensils, Sprout, GlassWater, Percent, PlusCircle, GripVertical, Trash2 } from 'lucide-react';
import type { Receta, Elaboracion, IngredienteInterno, MenajeDB, IngredienteERP, Alergeno } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const elaboracionEnRecetaSchema = z.object({
    id: z.string(),
    elaboracionId: z.string(),
    nombre: z.string(),
    cantidad: z.coerce.number().min(0),
    coste: z.coerce.number().default(0),
    gramaje: z.coerce.number().default(0),
    alergenos: z.array(z.string()).optional().default([]),
});
const menajeEnRecetaSchema = z.object({
    id: z.string(),
    menajeId: z.string(),
    descripcion: z.string(),
    ratio: z.coerce.number().min(0),
});

const recetaFormSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcionComercial: z.string().optional().default(''),
  responsableEscandallo: z.string().optional().default(''),
  categoria: z.string().optional().default(''),
  partidaProduccion: z.enum(['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION']),
  estacionalidad: z.enum(['INVIERNO', 'VERANO', 'MIXTO']),
  tipoDieta: z.enum(['VEGETARIANO', 'VEGANO', 'AMBOS', 'NINGUNO']),
  porcentajeCosteProduccion: z.coerce.number().optional().default(30),
  elaboraciones: z.array(elaboracionEnRecetaSchema).default([]),
  menajeAsociado: z.array(menajeEnRecetaSchema).default([]),
  instruccionesMiseEnPlace: z.string().optional().default(''),
  instruccionesRegeneracion: z.string().optional().default(''),
  instruccionesEmplatado: z.string().optional().default(''),
});

type RecetaFormValues = z.infer<typeof recetaFormSchema>;
type ElaboracionConCoste = Elaboracion & { costePorUnidad?: number };
type IngredienteConERP = IngredienteInterno & { erp?: IngredienteERP };

function SelectorDialog<T extends { id: string; nombre?: string; descripcion?: string }>({ trigger, title, items, columns, onSelect }: { trigger: React.ReactNode; title: string; items: T[]; columns: { key: keyof T; header: string }[]; onSelect: (item: T) => void; }) {
    const [open, setOpen] = useState(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                    <Table>
                        <TableHeader><TableRow>{columns.map(c => <TableHead key={c.key as string}>{c.header}</TableHead>)}<TableHead></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {items.map(item => (
                                <TableRow key={item.id}>
                                    {columns.map(c => <TableCell key={c.key as string}>{String(item[c.key])}</TableCell>)}
                                    <TableCell><Button size="sm" onClick={() => { onSelect(item); setOpen(false); }}>Añadir</Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function SortableItem({ id, children }: { id: string, children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, };
    return <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center gap-2 bg-background">{children}</div>;
}

export default function RecetaFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nueva';
  
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [dbElaboraciones, setDbElaboraciones] = useState<ElaboracionConCoste[]>([]);
  const [dbMenaje, setDbMenaje] = useState<MenajeDB[]>([]);
  const [dbIngredientes, setDbIngredientes] = useState<Map<string, IngredienteConERP>>(new Map());

  const form = useForm<RecetaFormValues>({
    resolver: zodResolver(recetaFormSchema),
    defaultValues: { nombre: '', descripcionComercial: '', responsableEscandallo: '', categoria: '', partidaProduccion: 'FRIO', estacionalidad: 'MIXTO', tipoDieta: 'NINGUNO', porcentajeCosteProduccion: 30, elaboraciones: [], menajeAsociado: [], instruccionesMiseEnPlace: '', instruccionesRegeneracion: '', instruccionesEmplatado: '', }
  });

  const { fields: elabFields, append: appendElab, remove: removeElab, move: moveElab } = useFieldArray({ control: form.control, name: "elaboraciones" });
  const { fields: menajeFields, append: appendMenaje, remove: removeMenaje, move: moveMenaje } = useFieldArray({ control: form.control, name: "menajeAsociado" });

  const watchedElaboraciones = form.watch('elaboraciones');
  const watchedPorcentajeCoste = form.watch('porcentajeCosteProduccion');

  const { costeMateriaPrima, gramajeTotal, alergenos } = useMemo(() => {
    let coste = 0;
    let gramaje = 0;
    const allAlergenos = new Set<Alergeno>();
    watchedElaboraciones.forEach(elab => {
        coste += (elab.coste || 0) * elab.cantidad;
        gramaje += (elab.gramaje || 0) * elab.cantidad;
        (elab.alergenos || []).forEach(a => allAlergenos.add(a as Alergeno));
    });
    return { costeMateriaPrima: coste, gramajeTotal: gramaje, alergenos: Array.from(allAlergenos) };
  }, [watchedElaboraciones]);

  const precioVentaRecomendado = useMemo(() => {
    if (!watchedPorcentajeCoste || watchedPorcentajeCoste <= 0) return 0;
    return costeMateriaPrima / (watchedPorcentajeCoste / 100);
  }, [costeMateriaPrima, watchedPorcentajeCoste]);
  
  const calculateElabAlergenos = useCallback((elaboracion: Elaboracion) => {
    const elabAlergenos = new Set<Alergeno>();
    elaboracion.componentes.forEach(comp => {
        if(comp.tipo === 'ingrediente') {
            const ingData = dbIngredientes.get(comp.componenteId);
            ingData?.alergenos.forEach(a => elabAlergenos.add(a));
        }
        // Recursive call if component is another elaboration (future)
    });
    return Array.from(elabAlergenos);
}, [dbIngredientes]);


  useEffect(() => {
    const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const storedErp = JSON.parse(localStorage.getItem('ingredientesERP') || '[]') as IngredienteERP[];
    const erpMap = new Map(storedErp.map(i => [i.id, i]));
    const combined = storedInternos.map(ing => ({ ...ing, erp: erpMap.get(ing.productoERPlinkId) }));
    setDbIngredientes(new Map(combined.map(i => [i.id, i])));

    const elaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    setDbElaboraciones(elaboraciones.map(e => ({...e, alergenos: calculateElabAlergenos(e)})));
    
    const menaje = JSON.parse(localStorage.getItem('menajeDB') || '[]') as MenajeDB[];
    setDbMenaje(menaje);

    if (isEditing) {
      const recetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
      const receta = recetas.find(e => e.id === id);
      if (receta) form.reset(receta);
    } else {
        form.reset({ id: Date.now().toString(), nombre: '', descripcionComercial: '', responsableEscandallo: '', categoria: '', partidaProduccion: 'FRIO', estacionalidad: 'MIXTO', tipoDieta: 'NINGUNO', porcentajeCosteProduccion: 30, elaboraciones: [], menajeAsociado: [] });
    }
  }, [id, isEditing, form, calculateElabAlergenos]);

  const onAddElab = (elab: ElaboracionConCoste) => {
    appendElab({ id: elab.id, elaboracionId: elab.id, nombre: elab.nombre, cantidad: 1, coste: elab.costePorUnidad || 0, gramaje: elab.produccionTotal || 0, alergenos: elab.alergenos || [] });
  }

  const onAddMenaje = (menaje: MenajeDB) => {
    appendMenaje({ id: menaje.id, menajeId: menaje.id, descripcion: menaje.descripcion, ratio: 1 });
  }

  function handleDragEnd(event: DragEndEvent, type: 'elab' | 'menaje') {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const oldIndex = (type === 'elab' ? elabFields : menajeFields).findIndex(f => f.id === active.id);
        const newIndex = (type === 'elab' ? elabFields : menajeFields).findIndex(f => f.id === over.id);
        if(type === 'elab') moveElab(oldIndex, newIndex);
        else moveMenaje(oldIndex, newIndex);
    }
  }

  function onSubmit(data: RecetaFormValues) {
    setIsLoading(true);
    let allItems = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    
    const dataToSave: Receta = { 
        ...data, 
        costeMateriaPrima, 
        gramajeTotal, 
        precioVentaRecomendado, 
        alergenos: alergenos
    };

    if (isEditing) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) allItems[index] = dataToSave;
    } else {
      allItems.push(dataToSave);
    }

    localStorage.setItem('recetas', JSON.stringify(allItems));
    toast({ title: 'Operación Exitosa', description: `Receta "${data.nombre}" guardada.` });
    setIsLoading(false);
    router.push('/book/recetas');
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="receta-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <BookHeart className="h-8 w-8" />
                    <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nueva'} Receta</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => router.push('/book')}> <X className="mr-2"/> Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                    <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Receta'}</span>
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="nombre" render={({ field }) => ( <FormItem><FormLabel>Nombre de la Receta</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="responsableEscandallo" render={({ field }) => ( <FormItem><FormLabel>Responsable del Escandallo</FormLabel><FormControl><Input {...field} placeholder="Nombre del cocinero" /></FormControl></FormItem> )} />
                    </div>
                     <FormField control={form.control} name="descripcionComercial" render={({ field }) => ( <FormItem><FormLabel>Descripción Comercial</FormLabel><FormControl><Textarea {...field} placeholder="Descripción para la carta..." /></FormControl></FormItem> )} />
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle>Clasificación y Atributos</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                     <FormField control={form.control} name="categoria" render={({ field }) => ( <FormItem><FormLabel>Categoría</FormLabel><FormControl><Input {...field} placeholder="Ej: Entrante, Pescado..." /></FormControl></FormItem> )} />
                     <FormField control={form.control} name="partidaProduccion" render={({ field }) => ( <FormItem><FormLabel>Partida de Producción</FormLabel> <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="FRIO">Frío</SelectItem><SelectItem value="CALIENTE">Caliente</SelectItem><SelectItem value="PASTELERIA">Pastelería</SelectItem><SelectItem value="EXPEDICION">Expedición</SelectItem></SelectContent></Select></FormItem> )} />
                     <FormField control={form.control} name="estacionalidad" render={({ field }) => ( <FormItem><FormLabel>Estacionalidad</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="INVIERNO">Invierno</SelectItem><SelectItem value="VERANO">Verano</SelectItem><SelectItem value="MIXTO">Mixto</SelectItem></SelectContent></Select></FormItem> )} />
                     <FormField control={form.control} name="tipoDieta" render={({ field }) => ( <FormItem><FormLabel>Tipo de Dieta</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="VEGETARIANO">Vegetariano</SelectItem><SelectItem value="VEGANO">Vegano</SelectItem><SelectItem value="AMBOS">Ambos</SelectItem><SelectItem value="NINGUNO">Ninguno</SelectItem></SelectContent></Select></FormItem> )} />
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div className="space-y-1.5"><CardTitle className="flex items-center gap-2"><Utensils />Elaboraciones</CardTitle><CardDescription>Añade los componentes de la receta. Puedes arrastrar y soltar para reordenarlos.</CardDescription></div>
                    <SelectorDialog trigger={<Button type="button" variant="outline"><PlusCircle className="mr-2" />Añadir Elaboración</Button>} title="Seleccionar Elaboración" items={dbElaboraciones} columns={[{ key: 'nombre', header: 'Nombre' }, { key: 'costePorUnidad', header: 'Coste/Unidad' }]} onSelect={onAddElab} />
                </CardHeader>
                <CardContent>
                    <DndContext sensors={[]} onDragEnd={(e) => handleDragEnd(e, 'elab')} collisionDetection={closestCenter}>
                        <SortableContext items={elabFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                            {elabFields.map((field, index) => (
                                <SortableItem key={field.id} id={field.id}>
                                    <GripVertical className="cursor-grab text-muted-foreground" />
                                    <span className="font-semibold flex-1">{field.nombre}</span>
                                    <FormField control={form.control} name={`elaboraciones.${index}.cantidad`} render={({ field: qField }) => (<FormItem className="flex items-center gap-2"><FormLabel>Cantidad:</FormLabel><FormControl><Input type="number" {...qField} className="h-8 w-24" /></FormControl></FormItem>)} />
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeElab(index)}><Trash2 className="h-4 w-4" /></Button>
                                </SortableItem>
                            ))}
                        </SortableContext>
                    </DndContext>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div className="space-y-1.5"><CardTitle className="flex items-center gap-2"><GlassWater />Menaje Asociado</CardTitle><CardDescription>Define el menaje necesario para servir esta receta.</CardDescription></div>
                    <SelectorDialog trigger={<Button type="button" variant="outline"><PlusCircle className="mr-2" />Añadir Menaje</Button>} title="Seleccionar Menaje" items={dbMenaje} columns={[{ key: 'descripcion', header: 'Descripción' }]} onSelect={onAddMenaje} />
                </CardHeader>
                <CardContent>
                    <DndContext sensors={[]} onDragEnd={(e) => handleDragEnd(e, 'menaje')} collisionDetection={closestCenter}>
                        <SortableContext items={menajeFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                            {menajeFields.map((field, index) => (
                                <SortableItem key={field.id} id={field.id}>
                                    <GripVertical className="cursor-grab text-muted-foreground" />
                                    <span className="font-semibold flex-1">{field.descripcion}</span>
                                    <FormField control={form.control} name={`menajeAsociado.${index}.ratio`} render={({ field: qField }) => (<FormItem className="flex items-center gap-2"><FormLabel>Ratio:</FormLabel><FormControl><Input type="number" {...qField} className="h-8 w-24" /></FormControl></FormItem>)} />
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeMenaje(index)}><Trash2 className="h-4 w-4" /></Button>
                                </SortableItem>
                            ))}
                        </SortableContext>
                    </DndContext>
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Percent />Costes y Precios</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <FormItem><FormLabel>Gramaje Total (g)</FormLabel><Input readOnly value={gramajeTotal.toFixed(2)} className="font-bold" /></FormItem>
                    <FormItem><FormLabel>Coste Materia Prima</FormLabel><Input readOnly value={costeMateriaPrima.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} className="font-bold" /></FormItem>
                    <FormField control={form.control} name="porcentajeCosteProduccion" render={({ field }) => ( <FormItem><FormLabel>% Coste Producción</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem> )} />
                    <FormItem><FormLabel>Precio Venta Rec.</FormLabel><Input readOnly value={precioVentaRecomendado.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} className="font-bold text-primary" /></FormItem>
                </CardContent>
                <CardFooter>
                     <div className="border rounded-md p-4 w-full bg-muted/30">
                        <h4 className="font-semibold mb-2 flex items-center gap-2"><Sprout/>Alérgenos de la Receta</h4>
                        {alergenos.length > 0 ? <div className="flex flex-wrap gap-2">{alergenos.map(a => <Badge key={a} variant="secondary">{a}</Badge>)}</div> : <p className="text-muted-foreground">No se han detectado alérgenos en las elaboraciones.</p>}
                     </div>
                </CardFooter>
            </Card>
          </form>
        </Form>
      </main>
    </>
  );
}
