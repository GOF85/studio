'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { Loader2, Save, X, BookHeart, Utensils, Sprout, GlassWater, Percent, PlusCircle, GripVertical, Trash2, Eye, Soup } from 'lucide-react';
import type { Receta, Elaboracion, IngredienteInterno, MenajeDB, IngredienteERP, Alergeno, Personal, CategoriaReceta, SaborPrincipal, TipoCocina } from '@/types';
import { SABORES_PRINCIPALES } from '@/types';

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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { Combobox } from '@/components/ui/combobox';


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
  visibleParaComerciales: z.boolean().default(true),
  descripcionComercial: z.string().optional().default(''),
  responsableEscandallo: z.string().optional().default(''),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  partidaProduccion: z.enum(['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION']),
  estacionalidad: z.enum(['INVIERNO', 'VERANO', 'MIXTO']),
  tipoDieta: z.enum(['VEGETARIANO', 'VEGANO', 'AMBOS', 'NINGUNO']),
  porcentajeCosteProduccion: z.coerce.number().optional().default(30),
  elaboraciones: z.array(elaboracionEnRecetaSchema).default([]),
  menajeAsociado: z.array(menajeEnRecetaSchema).default([]),
  instruccionesMiseEnPlace: z.string().optional().default(''),
  instruccionesRegeneracion: z.string().optional().default(''),
  instruccionesEmplatado: z.string().optional().default(''),
  perfilSaborPrincipal: z.enum(SABORES_PRINCIPALES).optional(),
  perfilSaborSecundario: z.array(z.string()).optional().default([]),
  perfilTextura: z.array(z.string()).optional().default([]),
  tipoCocina: z.string().optional().default(''),
  temperaturaServicio: z.enum(['CALIENTE', 'TIBIO', 'AMBIENTE', 'FRIO', 'HELADO']).optional(),
  tecnicaCoccionPrincipal: z.string().optional().default(''),
});

type RecetaFormValues = z.infer<typeof recetaFormSchema>;
type ElaboracionConCoste = Elaboracion & { costePorUnidad?: number };
type IngredienteConERP = IngredienteInterno & { erp?: IngredienteERP };

function SelectorDialog<T extends { id: string; nombre?: string; descripcion?: string; costePorUnidad?: number }>({ trigger, title, items, columns, onSelect }: { trigger: React.ReactNode; title: string; items: T[]; columns: { key: keyof T; header: string }[]; onSelect: (item: T) => void; }) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = useMemo(() => {
        if (!searchTerm) return items;
        const term = searchTerm.toLowerCase();
        return items.filter(item => 
            (item.nombre || item.descripcion || '').toLowerCase().includes(term)
        );
    }, [items, searchTerm]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
                <Input 
                    placeholder="Buscar..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="my-2"
                />
                <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                    <Table>
                        <TableHeader><TableRow>{columns.map(c => <TableHead key={c.key as string}>{c.header}</TableHead>)}<TableHead></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredItems.map(item => (
                                <TableRow key={item.id}>
                                    {columns.map(c => <TableCell key={c.key as string}>{
                                        c.key === 'costePorUnidad' && typeof item[c.key] === 'number'
                                          ? (item[c.key] as number).toLocaleString('es-ES', {style:'currency', currency: 'EUR'})
                                          : String(item[c.key])
                                    }</TableCell>)}
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
    return <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center gap-2 bg-background p-1">{children}</div>;
}

export default function RecetaFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nueva';
  
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const [dbElaboraciones, setDbElaboraciones] = useState<ElaboracionConCoste[]>([]);
  const [dbMenaje, setDbMenaje] = useState<MenajeDB[]>([]);
  const [dbCategorias, setDbCategorias] = useState<CategoriaReceta[]>([]);
  const [dbTiposCocina, setDbTiposCocina] = useState<TipoCocina[]>([]);
  const [dbIngredientes, setDbIngredientes] = useState<Map<string, IngredienteConERP>>(new Map());
  const [personalCPR, setPersonalCPR] = useState<Personal[]>([]);
  const [saboresSecundarios, setSaboresSecundarios] = useState<string[]>([]);
  const [texturas, setTexturas] = useState<string[]>([]);
  const [tecnicasCoccion, setTecnicasCoccion] = useState<string[]>([]);

  const form = useForm<RecetaFormValues>({
    resolver: zodResolver(recetaFormSchema),
    defaultValues: { nombre: '', visibleParaComerciales: true, descripcionComercial: '', responsableEscandallo: '', categoria: '', partidaProduccion: 'FRIO', estacionalidad: 'MIXTO', tipoDieta: 'NINGUNO', porcentajeCosteProduccion: 30, elaboraciones: [], menajeAsociado: [], perfilSaborSecundario: [], perfilTextura: [] }
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
  
  const calculateElabAlergenos = useCallback((elaboracion: Elaboracion, ingredientesMap: Map<string, IngredienteConERP>) => {
    const elabAlergenos = new Set<Alergeno>();
    elaboracion.componentes.forEach(comp => {
        if(comp.tipo === 'ingrediente') {
            const ingData = ingredientesMap.get(comp.componenteId);
            (ingData?.alergenosPresentes || []).forEach(a => elabAlergenos.add(a));
            (ingData?.alergenosTrazas || []).forEach(a => elabAlergenos.add(a));
        }
    });
    return Array.from(elabAlergenos);
  }, []);

  const loadData = useCallback(() => {
    const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const storedErp = JSON.parse(localStorage.getItem('ingredientesERP') || '[]') as IngredienteERP[];
    const erpMap = new Map(storedErp.map(i => [i.id, i]));
    const combined = storedInternos.map(ing => ({ ...ing, erp: erpMap.get(ing.productoERPlinkId) }));
    const ingredientesMap = new Map(combined.map(i => [i.id, i]));
    setDbIngredientes(ingredientesMap);

    const elaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    setDbElaboraciones(elaboraciones.map(e => ({...e, costePorUnidad: e.costePorUnidad, alergenos: calculateElabAlergenos(e, ingredientesMap)})));
    
    const menaje = JSON.parse(localStorage.getItem('menajeDB') || '[]') as MenajeDB[];
    setDbMenaje(menaje);
    
    const categorias = JSON.parse(localStorage.getItem('categoriasRecetas') || '[]') as CategoriaReceta[];
    setDbCategorias(categorias);

    const tiposCocina = JSON.parse(localStorage.getItem('tiposCocina') || '[]') as TipoCocina[];
    setDbTiposCocina(tiposCocina);

    const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    setPersonalCPR(allPersonal.filter(p => p.departamento === 'CPR'));

    // Extract existing tags for multiselect options
    const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const sabores = new Set<string>();
    const texturas = new Set<string>();
    const tecnicas = new Set<string>();
    allRecetas.forEach(r => {
      r.perfilSaborSecundario?.forEach(s => sabores.add(s));
      r.perfilTextura?.forEach(t => texturas.add(t));
      if (r.tecnicaCoccionPrincipal) tecnicas.add(r.tecnicaCoccionPrincipal);
    });
    setSaboresSecundarios(Array.from(sabores));
    setTexturas(Array.from(texturas));
    setTecnicasCoccion(Array.from(tecnicas));


    if (isEditing) {
      const receta = allRecetas.find(e => e.id === id);
      if (receta) form.reset(receta);
    } else {
      form.reset({ nombre: '', visibleParaComerciales: true, descripcionComercial: '', responsableEscandallo: '', categoria: '', partidaProduccion: 'FRIO', estacionalidad: 'MIXTO', tipoDieta: 'NINGUNO', porcentajeCosteProduccion: 30, elaboraciones: [], menajeAsociado: [], perfilSaborSecundario: [], perfilTextura: [] });
    }
  }, [id, isEditing, calculateElabAlergenos, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const onAddElab = (elab: ElaboracionConCoste) => {
    appendElab({ id: `${elab.id}-${Date.now()}`, elaboracionId: elab.id, nombre: elab.nombre, cantidad: 1, coste: elab.costePorUnidad || 0, gramaje: elab.produccionTotal || 0, alergenos: elab.alergenos || [] });
  }

  const onAddMenaje = (menaje: MenajeDB) => {
    appendMenaje({ id: menaje.id, menajeId: menaje.id, descripcion: menaje.descripcion, ratio: 1 });
  }

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

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
        alergenos,
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

  const handleDelete = () => {
    if (!isEditing) return;
    let allItems = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const updatedItems = allItems.filter(p => p.id !== id);
    localStorage.setItem('recetas', JSON.stringify(updatedItems));
    toast({ title: 'Receta eliminada' });
    router.push('/book/recetas');
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form id="receta-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <BookHeart className="h-8 w-8" />
                    <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nueva'} Receta</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => router.push('/book/recetas')}> <X className="mr-2"/> Cancelar</Button>
                    {isEditing && (
                        <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}> <Trash2 className="mr-2"/> Borrar Receta</Button>
                    )}
                    <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                    <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar Receta'}</span>
                    </Button>
                </div>
            </div>

            <Accordion type="multiple" defaultValue={['item-1']} className="w-full space-y-3">
                <AccordionItem value="item-1">
                    <Card>
                        <AccordionTrigger className="p-4"><CardTitle className="text-lg">Información General y Clasificación</CardTitle></AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="space-y-3 pt-2">
                                <div className="grid md:grid-cols-2 gap-3">
                                    <FormField control={form.control} name="nombre" render={({ field }) => ( <FormItem><FormLabel>Nombre de la Receta</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField
                                        control={form.control}
                                        name="responsableEscandallo"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Responsable del Escandallo</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona un responsable..." />
                                                </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                {personalCPR.map((p) => (
                                                    <SelectItem key={p.id} value={p.nombre}>
                                                    {p.nombre}
                                                    </SelectItem>
                                                ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="flex items-end gap-4">
                                  <div className="flex-grow">
                                    <FormField control={form.control} name="descripcionComercial" render={({ field }) => ( <FormItem><FormLabel>Descripción Comercial</FormLabel><FormControl><Textarea {...field} placeholder="Descripción para la carta..." rows={2} /></FormControl></FormItem> )} />
                                  </div>
                                  <FormField
                                      control={form.control}
                                      name="visibleParaComerciales"
                                      render={({ field }) => (
                                          <FormItem className="flex flex-row items-center space-x-2 pb-2">
                                              <FormControl>
                                                  <Checkbox checked={field.value} onCheckedChange={field.onChange} id="visible-check" />
                                              </FormControl>
                                              <FormLabel htmlFor="visible-check" className="flex items-center gap-2 !mt-0 whitespace-nowrap"><Eye />Visible para Comerciales</FormLabel>
                                          </FormItem>
                                      )}
                                  />
                                </div>
                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <FormField control={form.control} name="categoria" render={({ field }) => ( <FormItem><FormLabel>Categoría</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecciona..."/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {dbCategorias.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="partidaProduccion" render={({ field }) => ( <FormItem><FormLabel>Partida de Producción</FormLabel> <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="FRIO">Frío</SelectItem><SelectItem value="CALIENTE">Caliente</SelectItem><SelectItem value="PASTELERIA">Pastelería</SelectItem><SelectItem value="EXPEDICION">Expedición</SelectItem></SelectContent></Select></FormItem> )} />
                                    <FormField control={form.control} name="estacionalidad" render={({ field }) => ( <FormItem><FormLabel>Estacionalidad</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="INVIERNO">Invierno</SelectItem><SelectItem value="VERANO">Verano</SelectItem><SelectItem value="MIXTO">Mixto</SelectItem></SelectContent></Select></FormItem> )} />
                                    <FormField control={form.control} name="tipoDieta" render={({ field }) => ( <FormItem><FormLabel>Tipo de Dieta</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="VEGETARIANO">Vegetariano</SelectItem><SelectItem value="VEGANO">Vegano</SelectItem><SelectItem value="AMBOS">Ambos</SelectItem><SelectItem value="NINGUNO">Ninguno</SelectItem></SelectContent></Select></FormItem> )} />
                                </div>
                                 <div className="grid md:grid-cols-3 gap-3 pt-3">
                                     <FormField control={form.control} name="tipoCocina" render={({ field }) => ( <FormItem><FormLabel>Tipo de Cocina/Origen</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecciona..."/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {dbTiposCocina.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="temperaturaServicio" render={({ field }) => ( <FormItem><FormLabel>Temperatura de Servicio</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="CALIENTE">Caliente</SelectItem><SelectItem value="TIBIO">Tibio</SelectItem><SelectItem value="AMBIENTE">Ambiente</SelectItem><SelectItem value="FRIO">Frío</SelectItem><SelectItem value="HELADO">Helado</SelectItem></SelectContent></Select></FormItem> )} />
                                    <FormField control={form.control} name="tecnicaCoccionPrincipal" render={({ field }) => ( 
                                        <FormItem>
                                            <FormLabel>Técnica de Cocción Principal</FormLabel>
                                            <Combobox
                                                options={tecnicasCoccion.map(t => ({label: t, value: t}))}
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                onCreated={(value) => setTecnicasCoccion(prev => [...prev, value])}
                                                placeholder="Selecciona o crea una técnica..."
                                            />
                                        </FormItem> 
                                    )} />
                                 </div>
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="item-gastronomico">
                    <Card>
                        <AccordionTrigger className="p-4"><CardTitle className="flex items-center gap-2 text-lg"><Soup />Perfil Gastronómico</CardTitle></AccordionTrigger>
                        <AccordionContent>
                           <CardContent className="space-y-4 pt-2">
                            <div className="grid md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="perfilSaborPrincipal" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Perfil Sabor Principal</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl>
                                            <SelectContent>{SABORES_PRINCIPALES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                                 <FormField control={form.control} name="perfilSaborSecundario" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Perfil Sabor Secundario</FormLabel>
                                        <MultiSelect
                                            options={saboresSecundarios.map(s => ({label: s, value: s}))}
                                            selected={field.value || []}
                                            onChange={field.onChange}
                                            placeholder="Selecciona o crea sabores..."
                                            onCreated={(value) => setSaboresSecundarios(prev => [...prev, value])}
                                        />
                                    </FormItem>
                                 )} />
                                  <FormField control={form.control} name="perfilTextura" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Perfil de Textura</FormLabel>
                                         <MultiSelect
                                            options={texturas.map(t => ({label: t, value: t}))}
                                            selected={field.value || []}
                                            onChange={field.onChange}
                                            placeholder="Selecciona o crea texturas..."
                                            onCreated={(value) => setTexturas(prev => [...prev, value])}
                                        />
                                    </FormItem>
                                 )} />
                            </div>
                           </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="item-2">
                     <Card>
                        <AccordionTrigger className="p-4"><CardTitle className="flex items-center gap-2 text-lg"><Utensils />Elaboraciones</CardTitle></AccordionTrigger>
                        <AccordionContent>
                        <CardHeader className="pt-2 pb-3 flex-row items-center justify-between">
                             <CardDescription>Añade los componentes de la receta. Puedes arrastrar y soltar para reordenarlos.</CardDescription>
                            <div className="flex gap-2">
                                <Button asChild variant="secondary" size="sm" type="button"><Link href="/book/elaboraciones/nuevo" target="_blank"><PlusCircle size={16} /> Crear Nueva</Link></Button>
                                <SelectorDialog trigger={<Button type="button" variant="outline" size="sm"><PlusCircle size={16} />Añadir Elaboración</Button>} title="Seleccionar Elaboración" items={dbElaboraciones} columns={[{ key: 'nombre', header: 'Nombre' }, { key: 'costePorUnidad', header: 'Coste/Unidad' }]} onSelect={onAddElab} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <DndContext sensors={sensors} onDragEnd={(e) => handleDragEnd(e, 'elab')} collisionDetection={closestCenter}>
                                <SortableContext items={elabFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-1">
                                    {elabFields.map((field, index) => (
                                        <SortableItem key={field.id} id={field.id}>
                                            <GripVertical className="cursor-grab text-muted-foreground" />
                                            <span className="font-semibold flex-1">{field.nombre}</span>
                                            <FormField control={form.control} name={`elaboraciones.${index}.cantidad`} render={({ field: qField }) => (<FormItem className="flex items-center gap-2"><FormLabel className="text-xs">Cantidad:</FormLabel><FormControl><Input type="number" {...qField} className="h-8 w-20" /></FormControl></FormItem>)} />
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeElab(index)}><Trash2 className="h-4 w-4" /></Button>
                                        </SortableItem>
                                    ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </CardContent>
                        </AccordionContent>
                     </Card>
                </AccordionItem>
                 <AccordionItem value="item-3">
                     <Card>
                        <AccordionTrigger className="p-4"><CardTitle className="flex items-center gap-2 text-lg"><GlassWater />Menaje Asociado</CardTitle></AccordionTrigger>
                        <AccordionContent>
                        <CardHeader className="pt-2 pb-3 flex-row items-center justify-between">
                            <CardDescription>Define el menaje necesario para servir esta receta.</CardDescription>
                            <SelectorDialog trigger={<Button type="button" variant="outline" size="sm"><PlusCircle size={16}/>Añadir Menaje</Button>} title="Seleccionar Menaje" items={dbMenaje} columns={[{ key: 'descripcion', header: 'Descripción' }]} onSelect={onAddMenaje} />
                        </CardHeader>
                        <CardContent>
                            <DndContext sensors={sensors} onDragEnd={(e) => handleDragEnd(e, 'menaje')} collisionDetection={closestCenter}>
                                <SortableContext items={menajeFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-1">
                                    {menajeFields.map((field, index) => (
                                        <SortableItem key={field.id} id={field.id}>
                                            <GripVertical className="cursor-grab text-muted-foreground" />
                                            <span className="font-semibold flex-1">{field.descripcion}</span>
                                            <FormField control={form.control} name={`menajeAsociado.${index}.ratio`} render={({ field: qField }) => (<FormItem className="flex items-center gap-2"><FormLabel className="text-xs">Ratio:</FormLabel><FormControl><Input type="number" {...qField} className="h-8 w-20" /></FormControl></FormItem>)} />
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeMenaje(index)}><Trash2 className="h-4 w-4" /></Button>
                                        </SortableItem>
                                    ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </CardContent>
                        </AccordionContent>
                     </Card>
                </AccordionItem>
                <AccordionItem value="item-4">
                     <Card>
                        <AccordionTrigger className="p-4"><CardTitle className="text-lg">Instrucciones de Cocina</CardTitle></AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="grid md:grid-cols-3 gap-3 pt-2">
                                <FormField control={form.control} name="instruccionesMiseEnPlace" render={({ field }) => ( <FormItem><FormLabel>Mise en Place</FormLabel><FormControl><Textarea {...field} rows={5}/></FormControl></FormItem> )} />
                                <FormField control={form.control} name="instruccionesRegeneracion" render={({ field }) => ( <FormItem><FormLabel>Regeneración</FormLabel><FormControl><Textarea {...field} rows={5} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="instruccionesEmplatado" render={({ field }) => ( <FormItem><FormLabel>Emplatado</FormLabel><FormControl><Textarea {...field} rows={5} /></FormControl></FormItem> )} />
                            </CardContent>
                        </AccordionContent>
                     </Card>
                </AccordionItem>
                <AccordionItem value="item-5">
                    <Card>
                        <AccordionTrigger className="p-4"><CardTitle className="flex items-center gap-2 text-lg"><Percent />Costes y Alérgenos</CardTitle></AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                                <FormItem><FormLabel>Gramaje Total (g)</FormLabel><Input readOnly value={gramajeTotal.toFixed(2)} className="font-bold h-9" /></FormItem>
                                <FormItem><FormLabel>Coste Materia Prima</FormLabel><Input readOnly value={costeMateriaPrima.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} className="font-bold h-9" /></FormItem>
                                <FormField control={form.control} name="porcentajeCosteProduccion" render={({ field }) => ( <FormItem><FormLabel>% Coste Producción</FormLabel><FormControl><Input type="number" {...field} className="h-9" /></FormControl></FormItem> )} />
                                <FormItem><FormLabel>Precio Venta Rec.</FormLabel><Input readOnly value={precioVentaRecomendado.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} className="font-bold text-primary h-9" /></FormItem>
                            </CardContent>
                            <CardFooter>
                                <div className="border rounded-md p-3 w-full bg-muted/30">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Sprout/>Alérgenos de la Receta</h4>
                                    {alergenos.length > 0 ? <div className="flex flex-wrap gap-2">{alergenos.map(a => <Badge key={a} variant="secondary">{a}</Badge>)}</div> : <p className="text-muted-foreground text-sm">No se han detectado alérgenos en las elaboraciones.</p>}
                                </div>
                            </CardFooter>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            </Accordion>
          </form>
        </Form>
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminará permanentemente la receta.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={handleDelete}
                >
                  Eliminar Receta
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}
