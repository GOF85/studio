

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { recipeDescriptionGenerator } from '@/ai/flows/recipe-description-generator';

import { Loader2, Save, X, BookHeart, Utensils, Sprout, Percent, PlusCircle, GripVertical, Trash2, Eye, Soup, Info, ChefHat, Package, Factory, Sparkles, TrendingUp, FilePenLine, Link as LinkIcon, Component, RefreshCw, Euro, Archive, BrainCircuit } from 'lucide-react';
import type { Receta, Elaboracion, IngredienteInterno, ArticuloERP, Alergeno, CategoriaReceta, SaborPrincipal, PartidaProduccion, ElaboracionEnReceta } from '@/types';
import { SABORES_PRINCIPALES, ALERGENOS, UNIDADES_MEDIDA, PARTIDAS_PRODUCCION } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency, formatUnit, cn } from '@/lib/utils';
import Image from 'next/image';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { ElaborationForm, type ElaborationFormValues } from '@/components/book/elaboration-form';
import { ComponenteSelector } from '@/components/book/componente-selector';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const elaboracionEnRecetaSchema = z.object({
  id: z.string(),
  elaboracionId: z.string(),
  nombre: z.string(),
  cantidad: z.coerce.number().min(0),
  coste: z.coerce.number().optional().default(0),
  gramaje: z.coerce.number().default(0),
  alergenos: z.array(z.string()).optional().default([]),
  unidad: z.enum(UNIDADES_MEDIDA),
  merma: z.coerce.number().optional().default(0),
});

const menajeEnRecetaSchema = z.object({
    id: z.string(),
    menajeId: z.string(),
    descripcion: z.string(),
    ratio: z.coerce.number().min(0),
});

const recetaFormSchema = z.object({
  id: z.string(),
  numeroReceta: z.string().optional(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  nombre_en: z.string().optional().default(''),
  visibleParaComerciales: z.boolean().default(true),
  isArchived: z.boolean().optional().default(false),
  descripcionComercial: z.string().optional().default(''),
  descripcionComercial_en: z.string().optional().default(''),
  responsableEscandallo: z.string().optional().default(''),
  categoria: z.string().min(1, 'La categoría es obligatoria'),
  partidaProduccion: z.string().optional(),
  gramajeTotal: z.coerce.number().optional().default(0),
  estacionalidad: z.enum(['INVIERNO', 'VERANO', 'MIXTO']),
  tipoDieta: z.enum(['VEGETARIANO', 'VEGANO', 'AMBOS', 'NINGUNO']),
  porcentajeCosteProduccion: z.coerce.number().optional().default(30),
  elaboraciones: z.array(elaboracionEnRecetaSchema).default([]),
  menajeAsociado: z.array(menajeEnRecetaSchema).optional().default([]),
  instruccionesMiseEnPlace: z.string().optional().default(''),
  fotosComercialesURLs: z.array(z.object({ value: z.string().url("Debe ser una URL válida") })).optional().default([]),
  fotosMiseEnPlaceURLs: z.array(z.object({ value: z.string().url("Debe ser una URL válida") })).optional().default([]),
  instruccionesRegeneracion: z.string().optional().default(''),
  fotosRegeneracionURLs: z.array(z.object({ value: z.string().url("Debe ser una URL válida") })).optional().default([]),
  instruccionesEmplatado: z.string().optional().default(''),
  fotosEmplatadoURLs: z.array(z.object({ value: z.string().url("Debe ser una URL válida") })).optional().default([]),
  perfilSaborPrincipal: z.enum(SABORES_PRINCIPALES).optional(),
  perfilSaborSecundario: z.array(z.string()).optional().default([]),
  perfilTextura: z.array(z.string()).optional().default([]),
  tipoCocina: z.array(z.string()).optional().default([]),
  recetaOrigen: z.string().optional().default(''),
  temperaturaServicio: z.enum(['CALIENTE', 'TIBIO', 'AMBIENTE', 'FRIO', 'HELADO']).optional(),
  tecnicaCoccionPrincipal: z.string().optional().default(''),
  potencialMiseEnPlace: z.enum(['COMPLETO', 'PARCIAL', 'AL_MOMENTO']).optional(),
  formatoServicioIdeal: z.array(z.string()).optional().default([]),
  equipamientoCritico: z.array(z.string()).optional().default([]),
  dificultadProduccion: z.coerce.number().min(1).max(5).optional().default(3),
  estabilidadBuffet: z.coerce.number().min(1).max(5).optional().default(3),
  escalabilidad: z.enum(['FACIL', 'MEDIA', 'DIFICIL']).optional(),
  etiquetasTendencia: z.array(z.string()).optional().default([]),
});

type RecetaFormValues = z.infer<typeof recetaFormSchema>;
type ElaboracionConCoste = Elaboracion & { costePorUnidad?: number; alergenos?: Alergeno[] };
type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

function SortableTableRow({ field, index, remove, form }: { field: ElaboracionEnReceta & { key: string }, index: number, remove: (index: number) => void, form: any }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    const costeTotal = (field.coste || 0) * (form.watch(`elaboraciones.${index}.cantidad`) || 0);

    return (
        <TableRow ref={setNodeRef} style={style} {...attributes}>
            <TableCell className="w-10 p-2">
                <div {...listeners} className="cursor-grab text-muted-foreground p-2">
                    <GripVertical />
                </div>
            </TableCell>
            <TableCell className="font-semibold py-1 px-3">{field.nombre}</TableCell>
             <TableCell className="text-right font-mono py-1 px-3">{formatCurrency(field.coste)}</TableCell>
            <TableCell className="py-1 px-3">
                <FormField control={form.control} name={`elaboraciones.${index}.cantidad`} render={({ field: qField }) => (
                    <FormItem><FormControl><Input type="number" step="any" {...qField} className="h-8" /></FormControl></FormItem>
                )} />
            </TableCell>
            <TableCell className="py-1 px-3">
                <FormField control={form.control} name={`elaboraciones.${index}.merma`} render={({ field: mField }) => (
                    <FormItem><FormControl><Input type="number" {...mField} value={mField.value ?? 0} className="h-8" /></FormControl></FormItem>
                )} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground py-1 px-3">{formatUnit(field.unidad)}</TableCell>
            <TableCell className="text-right font-mono py-1 px-3">{formatCurrency(costeTotal)}</TableCell>
            <TableCell className="py-1 px-3">
                <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
            </TableCell>
        </TableRow>
    );
}

const InfoTooltip = ({ text }: { text: string }) => (
    <Tooltip>
        <TooltipTrigger type="button"><Info className="h-3 w-3"/></TooltipTrigger>
        <TooltipContent><p>{text}</p></TooltipContent>
    </Tooltip>
);

const calculateElabAlergenos = (elaboracion: Elaboracion, ingredientesMap: Map<string, IngredienteInterno>): Alergeno[] => {
    if (!elaboracion || !elaboracion.componentes) {
      return [];
    }
    const elabAlergenos = new Set<Alergeno>();
    elaboracion.componentes.forEach(comp => {
        if(comp.tipo === 'ingrediente') {
            const ingData = ingredientesMap.get(comp.componenteId);
            if (ingData) {
              (ingData.alergenosPresentes || []).forEach(a => elabAlergenos.add(a));
              (ingData.alergenosTrazas || []).forEach(a => elabAlergenos.add(a));
            }
        }
    });
    return Array.from(elabAlergenos);
};

function ImageUploadSection({ name, title, form, description }: { name: "fotosMiseEnPlaceURLs" | "fotosRegeneracionURLs" | "fotosEmplatadoURLs" | "fotosComercialesURLs"; title: string; form: any, description?: string }) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name });
    const [newUrl, setNewImageUrl] = useState('');
    const { toast } = useToast();

    const handleAdd = () => {
        try {
            const url = new URL(newUrl);
            append({ value: url.href });
            setNewImageUrl('');
        } catch (e) {
            toast({ variant: 'destructive', title: 'URL inválida', description: 'Por favor, introduce una URL de imagen válida.' });
        }
    };

    return (
        <div>
            {name !== "fotosComercialesURLs" ? (
                <FormField
                    control={form.control}
                    name={name === "fotosMiseEnPlaceURLs" ? "instruccionesMiseEnPlace" : name === "fotosRegeneracionURLs" ? "instruccionesRegeneracion" : "instruccionesEmplatado"}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{title}</FormLabel>
                            <FormControl><Textarea {...field} rows={5} /></FormControl>
                        </FormItem>
                    )}
                />
            ) : (
                <>
                <h4 className="font-semibold text-lg">{title}</h4>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
                </>
            )}
            <div className="space-y-2 mt-2">
                <div className="flex gap-2">
                    <Input value={newUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="Pega una URL de imagen..."/>
                    <Button type="button" variant="outline" onClick={handleAdd}><LinkIcon className="mr-2"/>Añadir</Button>
                </div>
                {form.formState.errors[name] && <p className="text-sm font-medium text-destructive">{(form.formState.errors[name] as any).message}</p>}
                <div className="grid grid-cols-3 gap-2 pt-2">
                    {fields.map((field, index) => (
                        <div key={field.id} className="relative aspect-video rounded-md overflow-hidden group">
                            <Image src={(field as any).value} alt={`Foto ${index + 1}`} fill className="object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function CreateElaborationModal({ onElaborationCreated, children }: { onElaborationCreated: (newElab: Elaboracion) => void, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = (data: ElaborationFormValues, costePorUnidad: number) => {
        setIsSubmitting(true);
        let allItems = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        
        const dataToSave: Elaboracion = { ...data, costePorUnidad };
        allItems.push(dataToSave);
        localStorage.setItem('elaboraciones', JSON.stringify(allItems));
        
        setTimeout(() => {
            onElaborationCreated(dataToSave);
            setIsSubmitting(false);
            setIsOpen(false);
        }, 500);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-4xl">
                 <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Component /> Nueva Elaboración</DialogTitle>
                    <DialogDescription>
                        Crea una sub-receta sin salir de la página. Se añadirá automáticamente a la receta actual al guardar.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto -mx-6 px-6">
                    <ElaborationForm 
                        initialData={{ 
                            id: Date.now().toString(), nombre: '', produccionTotal: 1, unidadProduccion: 'KG', partidaProduccion: 'FRIO', componentes: [],
                            tipoExpedicion: 'REFRIGERADO', formatoExpedicion: '', ratioExpedicion: 0,
                            instruccionesPreparacion: '', videoProduccionURL: '', fotosProduccionURLs: [],
                        }}
                        onSave={handleSave}
                        isSubmitting={isSubmitting}
                    />
                </div>
                 <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button type="submit" form="elaboration-form" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
                        <span className="ml-2">Crear y Añadir a Receta</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const defaultValues: Partial<RecetaFormValues> = { 
    id: '', 
    nombre: '', 
    nombre_en: '', 
    visibleParaComerciales: true,
    isArchived: false,
    descripcionComercial: '', 
    descripcionComercial_en: '', 
    responsableEscandallo: '', 
    categoria: '', 
    estacionalidad: 'MIXTO', 
    tipoDieta: 'NINGUNO', 
    gramajeTotal: 0, 
    porcentajeCosteProduccion: 30, 
    elaboraciones: [], 
    menajeAsociado: [], 
    fotosComercialesURLs: [], 
    fotosEmplatadoURLs: [], 
    fotosMiseEnPlaceURLs: [], 
    fotosRegeneracionURLs: [], 
    perfilSaborSecundario: [], 
    perfilTextura: [], 
    tipoCocina: [], 
    equipamientoCritico: [], 
    formatoServicioIdeal: [], 
    etiquetasTendencia: [] 
};

function RecetaFormPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const id = params.id as string;
  const cloneId = searchParams.get('cloneId');
  const isNew = id === 'nueva';
  const isEditing = !isNew;

  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const { toast } = useToast();
  const [dbElaboraciones, setDbElaboraciones] = useState<ElaboracionConCoste[]>([]);
  const [dbCategorias, setDbCategorias] = useState<CategoriaReceta[]>([]);
  const [personalCPR, setPersonalCPR] = useState<Personal[]>([]);

  const form = useForm<RecetaFormValues>({
    resolver: zodResolver(recetaFormSchema),
    defaultValues,
  });

  const { fields: elabFields, append: appendElab, remove: removeElab, move: moveElab, update: updateElab, replace } = useFieldArray({ control: form.control, name: "elaboraciones", keyName: "key" });

  const watchedElaboraciones = form.watch('elaboraciones');
  const watchedPorcentajeCoste = form.watch('porcentajeCosteProduccion');

  const recalculateCostsAndAllergens = useCallback(() => {
    const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const storedErp = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
    const erpMap = new Map(storedErp.map(i => [i.idreferenciaerp, i]));
    const ingredientesMap = new Map(storedInternos.map(ing => [ing.id, { ...ing, erp: erpMap.get(ing.productoERPlinkId) }]));

    const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    
    const updatedDbElaboraciones = allElaboraciones.map(e => {
        let costeTotalComponentes = 0;
        (e.componentes || []).forEach(comp => {
            if (comp.tipo === 'ingrediente') {
                const ing = ingredientesMap.get(comp.componenteId);
                const costeReal = ing?.erp ? (ing.erp.precioCompra / (ing.erp.unidadConversion || 1)) * (1 - (ing.erp.descuento || 0) / 100) : 0;
                costeTotalComponentes += costeReal * comp.cantidad * (1 + (comp.merma || 0) / 100);
            } else if (comp.tipo === 'elaboracion') {
                const subElab = allElaboraciones.find(sub => sub.id === comp.componenteId);
                costeTotalComponentes += (subElab?.costePorUnidad || 0) * comp.cantidad * (1 + (comp.merma || 0) / 100);
            }
        });
        const costePorUnidad = e.produccionTotal > 0 ? costeTotalComponentes / e.produccionTotal : 0;
        return {
            ...e,
            costePorUnidad: costePorUnidad,
            alergenos: calculateElabAlergenos(e, ingredientesMap as any),
        };
    });
    
    setDbElaboraciones(updatedDbElaboraciones);
    
    const currentFormElabs = form.getValues('elaboraciones');
    const updatedFormElabs = currentFormElabs.map(elabInReceta => {
        const matchingDbElab = updatedDbElaboraciones.find(dbElab => dbElab.id === elabInReceta.elaboracionId);
        return {
            ...elabInReceta,
            coste: matchingDbElab?.costePorUnidad || elabInReceta.coste, // Fallback to old cost if not found
            alergenos: matchingDbElab?.alergenos || [],
        };
    });
    
    replace(updatedFormElabs);
    
  }, [form, replace]);

  useEffect(() => {
    let initialValues: Partial<RecetaFormValues> | null = null;
    
    try {
      setIsDataLoaded(false); // Set loading state
      setDbCategorias(JSON.parse(localStorage.getItem('categoriasRecetas') || '[]'));
      const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
      setPersonalCPR(allPersonal.filter(p => p.departamento === 'CPR'));

      const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
      let foundReceta: Receta | undefined;
      
      const currentId = isEditing ? id : cloneId;

      if (currentId) {
        foundReceta = allRecetas.find(e => e.id === currentId);
        if (foundReceta) {
          initialValues = { ...foundReceta };
          if (cloneId) {
            initialValues.id = Date.now().toString();
            initialValues.nombre = `${foundReceta.nombre} (Copia)`;
          }
        }
      } else if (isNew) {
        const lastRecipe = allRecetas.reduce((last, current) => {
            if (!current.numeroReceta || !last?.numeroReceta) return current;
            const currentNum = parseInt(current.numeroReceta.substring(2));
            const lastNum = parseInt(last.numeroReceta.substring(2));
            return currentNum > lastNum ? current : last;
        }, null as Receta | null);
        const lastNum = lastRecipe && lastRecipe.numeroReceta ? parseInt(lastRecipe.numeroReceta.substring(2)) : 0;
        const newNum = `R-${(lastNum + 1).toString().padStart(4, '0')}`;
        initialValues = { ...defaultValues, id: Date.now().toString(), numeroReceta: newNum };
      }

      if (initialValues) {
        const processedData = {
          ...defaultValues,
          ...initialValues,
          fotosComercialesURLs: (initialValues.fotosComercialesURLs || []).map(url => typeof url === 'string' ? {value: url} : url),
          fotosEmplatadoURLs: (initialValues.fotosEmplatadoURLs || []).map(url => typeof url === 'string' ? {value: url} : url),
          fotosMiseEnPlaceURLs: (initialValues.fotosMiseEnPlaceURLs || []).map(url => typeof url === 'string' ? {value: url} : url),
          fotosRegeneracionURLs: (initialValues.fotosRegeneracionURLs || []).map(url => typeof url === 'string' ? {value: url} : url),
        };
        form.reset(processedData);
        recalculateCostsAndAllergens();
      } else if(isEditing) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar la receta.' });
        router.push('/book/recetas');
      }

    } catch (e) {
      console.error("Error crítico durante la carga de datos:", e);
      toast({ variant: 'destructive', title: 'Error de carga', description: 'No se pudieron cargar los datos necesarios.' });
    } finally {
      setIsDataLoaded(true);
    }
  }, [id, cloneId, isNew, isEditing, form, router, toast, recalculateCostsAndAllergens]);

  const { costeMateriaPrima, alergenos, partidasProduccion } = useMemo(() => {
    let coste = 0;
    const allAlergenos = new Set<Alergeno>();
    const allPartidas = new Set<PartidaProduccion>();

    (watchedElaboraciones || []).forEach(elab => {
        const elabData = dbElaboraciones.find(dbElab => dbElab.id === elab.elaboracionId);
        const costeUnitarioReal = elab.coste || 0;
        const costeConMerma = costeUnitarioReal * (1 + (elab.merma || 0) / 100);
        coste += costeConMerma * elab.cantidad;
        
        (elabData?.alergenos || []).forEach(a => allAlergenos.add(a as Alergeno));

        if (elabData?.partidaProduccion) {
            allPartidas.add(elabData.partidaProduccion);
        }
    });

    return { 
        costeMateriaPrima: coste, 
        alergenos: Array.from(allAlergenos),
        partidasProduccion: Array.from(allPartidas)
    };
  }, [watchedElaboraciones, dbElaboraciones]);

  const pvpTeorico = useMemo(() => {
    const costeImputacion = costeMateriaPrima * ((watchedPorcentajeCoste || 0) / 100);
    return costeMateriaPrima + costeImputacion;
  }, [costeMateriaPrima, watchedPorcentajeCoste]);
  
  const onAddElab = (elab: ElaboracionConCoste) => {
    appendElab({ id: `${elab.id}-${Date.now()}`, elaboracionId: elab.id, nombre: elab.nombre, cantidad: 1, coste: elab.costePorUnidad || 0, gramaje: elab.produccionTotal || 0, alergenos: elab.alergenos || [], unidad: elab.unidadProduccion, merma: 0 });
    setIsSelectorOpen(false); // Close the modal
  }
  
  const handleElaborationCreated = (newElab: Elaboracion) => {
        toast({ title: 'Elaboración Creada', description: `Se ha añadido "${newElab.nombre}" a la receta.` });
        
        const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
        const erpMap = new Map((JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[]).map(i => [i.idreferenciaerp, i]));
        const ingredientesMap = new Map(storedInternos.map(ing => [ing.id, { ...ing, erp: erpMap.get(ing.productoERPlinkId) }]));

        const elabWithData = {
            ...newElab,
            costePorUnidad: newElab.costePorUnidad || 0,
            alergenos: calculateElabAlergenos(newElab, ingredientesMap as any)
        };
        
        setDbElaboraciones(prev => [...prev, elabWithData]);
        onAddElab(elabWithData);
    };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const oldIndex = elabFields.findIndex(f => f.id === active.id);
        const newIndex = elabFields.findIndex(f => f.id === over.id);
        moveElab(oldIndex, newIndex);
    }
  }
  
  const onError = (errors: any) => {
    console.error("Errores de validación del formulario:", errors);
    toast({
        variant: 'destructive',
        title: 'Error de validación',
        description: `Por favor, revisa todos los campos obligatorios.`,
    })
  };

  function onSubmit(data: RecetaFormValues) {
    setIsLoading(true);
    let allItems = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    
    const dataToSave: Receta = { 
        ...data, 
        costeMateriaPrima, 
        precioVenta: pvpTeorico, 
        alergenos,
        partidaProduccion: partidasProduccion.join(', '),
    };

    if (isEditing && !cloneId) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) {
        allItems[index] = dataToSave;
        toast({ description: 'Receta actualizada correctamente.' });
      }
    } else {
      allItems.push(dataToSave);
      toast({ description: cloneId ? 'Receta clonada correctamente.' : 'Receta creada correctamente.' });
    }

    localStorage.setItem('recetas', JSON.stringify(allItems));
    setIsLoading(false);
    form.reset(dataToSave); 
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
  
  if (!isDataLoaded) {
    return <LoadingSkeleton title="Cargando receta..." />;
  }

  const pageTitle = cloneId ? 'Clonar Receta' : (isNew ? 'Nueva Receta' : 'Editar Receta');

  return (
    <>
      <TooltipProvider>
        <main>
          <FormProvider {...form}>
              <form id="receta-form" onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                          <BookHeart className="h-8 w-8" />
                          <h1 className="text-3xl font-headline font-bold">{pageTitle} {cloneId && <span className="text-xl text-muted-foreground">(Clonando)</span>}</h1>
                      </div>
                      <div className="flex gap-2">
                          <Button variant="outline" type="button" onClick={() => router.push('/book/recetas')}> <X className="mr-2"/> Cancelar</Button>
                          {isEditing && (
                            <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2"/> Borrar</Button>
                          )}
                          <Button type="submit" form="receta-form" disabled={isLoading}>
                          {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                          <span className="ml-2">{isEditing && !cloneId ? 'Guardar Cambios' : 'Guardar Receta'}</span>
                          </Button>
                      </div>
                  </div>
                
                 <Tabs defaultValue="general">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="general">Info. General</TabsTrigger>
                        <TabsTrigger value="gastronomica">Info. Gastronómica</TabsTrigger>
                        <TabsTrigger value="costes">Info. €</TabsTrigger>
                        <TabsTrigger value="receta">Receta</TabsTrigger>
                        <TabsTrigger value="pase">Info. Pase</TabsTrigger>
                    </TabsList>
                    <TabsContent value="general" className="mt-4">
                         <Card>
                          <CardHeader>
                              <CardTitle className="text-lg">Información General y Clasificación</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-2">
                              <div className="grid md:grid-cols-2 gap-3">
                                  <FormField control={form.control} name="nombre" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Nombre de la Receta</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                  <FormField control={form.control} name="responsableEscandallo" render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                      <FormLabel className="flex items-center gap-1.5">Responsable del Escandallo <InfoTooltip text="Persona encargada de definir y mantener los costes y componentes de esta receta." /></FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un responsable..." /></SelectTrigger></FormControl>
                                      <SelectContent>{personalCPR.map((p) => (<SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>))}</SelectContent>
                                      </Select>
                                      <FormMessage />
                                  </FormItem>
                                  )} />
                              </div>
                              
                              <div className="flex items-center gap-4">
                                  <div className="flex-grow space-y-2">
                                  <FormField control={form.control} name="descripcionComercial" render={({ field }) => ( <FormItem>
                                      <FormLabel className="flex items-center gap-2">Descripción Comercial 
                                          <Button size="sm" variant="ghost" type="button" disabled={isGenerating} className="h-auto px-1 py-0 text-accent-foreground hover:text-accent-foreground/80">
                                              {isGenerating ? <Loader2 className="animate-spin h-3.5 w-3.5"/> : <Sparkles className="h-3.5 w-3.5"/>}
                                          </Button>
                                      </FormLabel>
                                      <FormControl><Textarea {...field} placeholder="Descripción para la carta..." rows={2} /></FormControl>
                                  </FormItem> )} />
                                  </div>
                                  <div className="space-y-2 pt-5">
                                      <FormField control={form.control} name="visibleParaComerciales" render={({ field }) => (
                                          <FormItem className="flex flex-row items-center justify-end gap-3 rounded-lg border p-3">
                                              <FormControl>
                                                  <Switch checked={field.value} onCheckedChange={field.onChange} id="visible-check" />
                                              </FormControl>
                                              <FormLabel htmlFor="visible-check" className="flex items-center gap-2 !mt-0 whitespace-nowrap"><Eye /><InfoTooltip text="Marca esta casilla si la receta debe aparecer en las propuestas para comerciales." /></FormLabel>
                                          </FormItem>
                                      )} />
                                       <FormField control={form.control} name="isArchived" render={({ field }) => (
                                          <FormItem className="flex flex-row items-center justify-end gap-3 rounded-lg border p-3">
                                              <FormControl>
                                                  <Switch checked={field.value} onCheckedChange={field.onChange} id="archived-check" />
                                              </FormControl>
                                              <FormLabel htmlFor="archived-check" className="flex items-center gap-2 !mt-0 whitespace-nowrap"><Archive /><InfoTooltip text="Archivar oculta la receta de todas las listas y selectores." /></FormLabel>
                                          </FormItem>
                                      )} />
                                  </div>
                              </div>

                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  <FormField control={form.control} name="categoria" render={({ field }) => ( <FormItem className="flex flex-col">
                                      <FormLabel>Categoría</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl><SelectTrigger><SelectValue placeholder="Selecciona..."/></SelectTrigger></FormControl>
                                          <SelectContent>
                                              {dbCategorias.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                  <FormMessage /></FormItem> )} />
                                  <FormItem className="flex flex-col">
                                      <FormLabel className="flex items-center gap-1.5">Partida de Producción <InfoTooltip text="Se calcula automáticamente a partir de las elaboraciones añadidas." /></FormLabel>
                                      <div className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                                          <div className="flex flex-wrap gap-1">
                                              {partidasProduccion.length > 0 ? (
                                                  partidasProduccion.map(p => <Badge key={p} variant="secondary">{p}</Badge>)
                                              ) : (
                                                  <span className="text-muted-foreground">N/A</span>
                                              )}
                                          </div>
                                      </div>
                                  </FormItem>
                                  <FormField control={form.control} name="gramajeTotal" render={({ field }) => ( <FormItem className="flex flex-col">
                                      <FormLabel>Gramaje Total (g)</FormLabel>
                                      <FormControl><Input type="number" {...field} /></FormControl>
                                      <FormMessage />
                                  </FormItem>)} />
                              </div>
                              <Separator />
                              <ImageUploadSection name="fotosComercialesURLs" title="Imágenes Comerciales" description="Añade URLs de imágenes de alta calidad para usar en propuestas. La primera imagen será la principal." form={form} />
                          </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="gastronomica" className="mt-4">
                        <Card>
                            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BrainCircuit/>Información Gastronómica</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="perfilSaborPrincipal" render={({ field }) => (<FormItem><FormLabel>Sabor Principal</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl><SelectContent>{SABORES_PRINCIPALES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                    <FormField control={form.control} name="perfilSaborSecundario" render={({ field }) => (<FormItem><FormLabel>Sabores Secundarios</FormLabel><MultiSelect options={['Picante', 'Ahumado', 'Cítrico', 'Herbáceo', 'Floral'].map(s=>({label: s, value:s}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem>)} />
                                    <FormField control={form.control} name="perfilTextura" render={({ field }) => (<FormItem><FormLabel>Texturas</FormLabel><MultiSelect options={['Crujiente', 'Cremoso', 'Meloso', 'Gelatinoso', 'Esponjoso', 'Líquido'].map(s=>({label: s, value:s}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem>)} />
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="tipoCocina" render={({ field }) => (<FormItem><FormLabel>Tipo de Cocina</FormLabel><MultiSelect options={['Mediterránea', 'Asiática', 'Fusión', 'De Mercado', 'Tradicional', 'Moderna'].map(s=>({label: s, value:s}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem>)} />
                                    <FormField control={form.control} name="recetaOrigen" render={({ field }) => (<FormItem><FormLabel>Origen / Inspiración</FormLabel><FormControl><Input {...field} placeholder="Ej: Receta de la abuela, Inspirado en..."/></FormControl></FormItem>)} />
                                </div>
                                <Separator />
                                <div className="grid md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="temperaturaServicio" render={({ field }) => (<FormItem><FormLabel>Temperatura de Servicio</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl><SelectContent>{['CALIENTE', 'TIBIO', 'AMBIENTE', 'FRIO', 'HELADO'].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                    <FormField control={form.control} name="tecnicaCoccionPrincipal" render={({ field }) => (<FormItem><FormLabel>Técnica Principal</FormLabel><FormControl><Input {...field} placeholder="Ej: Fritura, Horneado..."/></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="potencialMiseEnPlace" render={({ field }) => (<FormItem><FormLabel>Potencial de MEP</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl><SelectContent>{['COMPLETO', 'PARCIAL', 'AL_MOMENTO'].map(s=><SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                </div>
                                 <div className="grid md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="dificultadProduccion" render={({ field }) => (<FormItem><FormLabel>Dificultad de Producción (1-5)</FormLabel><FormControl><Input type="number" min="1" max="5" {...field} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="estabilidadBuffet" render={({ field }) => (<FormItem><FormLabel>Estabilidad en Buffet (1-5)</FormLabel><FormControl><Input type="number" min="1" max="5" {...field} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="escalabilidad" render={({ field }) => (<FormItem><FormLabel>Escalabilidad</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl><SelectContent>{['FACIL', 'MEDIA', 'DIFICIL'].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                </div>
                                <Separator />
                                 <div className="grid md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="formatoServicioIdeal" render={({ field }) => (<FormItem><FormLabel>Formato Ideal de Servicio</FormLabel><MultiSelect options={['Cocktail', 'Banquete', 'Buffet', 'Box', 'Coffee Break'].map(s=>({label: s, value:s}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem>)} />
                                    <FormField control={form.control} name="etiquetasTendencia" render={({ field }) => (<FormItem><FormLabel>Etiquetas / Tendencias</FormLabel><MultiSelect options={['Healthy', 'Vegano', 'Sin Gluten', 'Tradicional', 'De autor', 'Instagrameable'].map(s=>({label: s, value:s}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem>)} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="costes" className="mt-4">
                         <Card>
                          <CardHeader className="text-lg flex-row items-center justify-between">
                              <CardTitle className="flex items-center gap-2">
                                  <TrendingUp/>Análisis de Rentabilidad
                              </CardTitle>
                              <Button type="button" variant="outline" size="sm" onClick={recalculateCostsAndAllergens}>
                                <RefreshCw className="mr-2 h-4 w-4"/>Recalcular Costes
                               </Button>
                          </CardHeader>
                          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                              <div>
                                  <Label>Coste Materia Prima</Label>
                                  <p className="font-bold text-lg">{formatCurrency(costeMateriaPrima)}</p>
                              </div>
                              <FormField control={form.control} name="porcentajeCosteProduccion" render={({ field }) => (
                                  <FormItem>
                                      <Label>Imputación CPR (%)</Label>
                                      <FormControl><Input type="number" {...field} className="h-9"/></FormControl>
                                  </FormItem>
                              )} />
                              <div>
                                  <Label>PVP Teórico</Label>
                                  <p className="font-bold text-lg text-green-600">{formatCurrency(pvpTeorico)}</p>
                              </div>
                          </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="receta" className="mt-4">
                        <Card>
                            <CardHeader className="flex-row items-center justify-between py-3">
                                <div className="space-y-1"><CardTitle className="flex items-center gap-2 text-lg"><Utensils />Elaboraciones</CardTitle>
                                <CardDescription className="text-xs">Añade los componentes que forman parte de esta receta.</CardDescription></div>
                                <div className="flex gap-2">
                                    <CreateElaborationModal onElaborationCreated={handleElaborationCreated}>
                                        <Button variant="secondary" size="sm" type="button"><PlusCircle size={16} /> Crear Nueva</Button>
                                    </CreateElaborationModal>
                                    <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                                        <DialogTrigger asChild>
                                        <Button type="button" variant="outline" size="sm"><PlusCircle size={16} />Añadir Elaboración</Button>
                                        </DialogTrigger>
                                        <ComponenteSelector onSelectIngrediente={() => {}} onSelectElaboracion={onAddElab} allElaboraciones={Array.from(dbElaboraciones.values())} />
                                    </Dialog>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-lg">
                                <DndContext sensors={sensors} onDragEnd={(e) => handleDragEnd(e)} collisionDetection={closestCenter}>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10 p-2"></TableHead>
                                            <TableHead className="py-2 px-3">Nombre</TableHead>
                                            <TableHead className="w-28 py-2 px-3 text-right">Coste / Ud.</TableHead>
                                            <TableHead className="w-28 py-2 px-3">Cantidad</TableHead>
                                            <TableHead className="w-24 py-2 px-3">% Merma</TableHead>
                                            <TableHead className="w-24 py-2 px-3">Unidad</TableHead>
                                            <TableHead className="w-32 py-2 px-3 text-right">Subtotal</TableHead>
                                            <TableHead className="w-12 py-2 px-3"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <SortableContext items={elabFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                        <TableBody>
                                        {(elabFields || []).map((field, index) => (
                                            <SortableTableRow key={field.key} field={{...field, key: field.key}} index={index} remove={removeElab} form={form} />
                                        ))}
                                        </TableBody>
                                    </SortableContext>
                                </Table>
                                </DndContext>
                                </div>
                            </CardContent>
                             <CardFooter className="flex-col items-start gap-3 mt-4">
                                <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm"><Sprout/>Resumen de Alérgenos</h4>
                                <div className="w-full space-y-2">
                                     <div className="border rounded-md p-2 w-full bg-background min-h-8">
                                        {alergenos.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {alergenos.map(a => <AllergenBadge key={a} allergen={a}/>)}
                                            </div>
                                        ) : <p className="text-xs text-muted-foreground italic">Ninguno</p>}
                                    </div>
                                </div>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                    <TabsContent value="pase" className="mt-4">
                        <Card>
                            <CardHeader className="py-3">
                                <CardTitle className="flex items-center gap-2 text-lg"><FilePenLine/>Instrucciones y Medios</CardTitle>
                            </CardHeader>
                            <CardContent className="grid lg:grid-cols-3 gap-6 pt-2">
                                <ImageUploadSection name="fotosMiseEnPlaceURLs" title="Instrucciones Mise en Place" form={form} />
                                <ImageUploadSection name="fotosRegeneracionURLs" title="Instrucciones Regeneración" form={form} />
                                <ImageUploadSection name="fotosEmplatadoURLs" title="Instrucciones Emplatado" form={form} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                 </Tabs>
                </form>
              </FormProvider>
        </main>
      </TooltipProvider>
      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      >
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
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar Receta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function RecetaPage() {
    return <RecetaFormPage />
}
