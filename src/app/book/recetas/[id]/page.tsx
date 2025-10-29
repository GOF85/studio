

'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, FieldErrors, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { recipeDescriptionGenerator } from '@/ai/flows/recipe-description-generator';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

import { Loader2, Save, X, BookHeart, Utensils, Sprout, GlassWater, Percent, PlusCircle, GripVertical, Trash2, Eye, Soup, Info, ChefHat, Package, Factory, Sparkles, TrendingUp, FilePenLine, Link as LinkIcon, Component, RefreshCw, Euro } from 'lucide-react';
import type { Receta, Elaboracion, IngredienteInterno, MenajeDB, ArticuloERP, Alergeno, Personal, CategoriaReceta, SaborPrincipal, TipoCocina, PartidaProduccion, ElaboracionEnReceta } from '@/types';
import { SABORES_PRINCIPALES } from '@/types';

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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { Combobox } from '@/components/ui/combobox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency, formatUnit, cn } from '@/lib/utils';
import Image from 'next/image';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { ElaborationForm, type ElaborationFormValues } from '@/components/book/elaboration-form';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ComponenteSelector } from '@/components/book/componente-selector';
import { Label } from '@/components/ui/label';


const elaboracionEnRecetaSchema = z.object({
  id: z.string(),
  elaboracionId: z.string(),
  nombre: z.string(),
  cantidad: z.coerce.number().min(0),
  coste: z.coerce.number().optional().default(0),
  gramaje: z.coerce.number().default(0),
  alergenos: z.array(z.string()).optional().default([]),
  unidad: z.enum(['KG', 'L', 'UD']),
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

const calculateElabAlergenos = (elaboracion: Elaboracion, ingredientesMap: Map<string, IngredienteConERP>): Alergeno[] => {
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
    const [newUrl, setNewUrl] = useState('');
    const { toast } = useToast();

    const handleAdd = () => {
        try {
            const url = new URL(newUrl);
            append({ value: url.href });
            setNewUrl('');
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
                <CardTitle className="text-lg">{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
                </>
            )}
            <div className="space-y-2 mt-2">
                <div className="flex gap-2">
                    <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Pega una URL de imagen..."/>
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

export default function RecetaFormPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const id = Array.isArray(params.id) ? params.id[0] : null;
  const isNew = id === 'nueva';
  const isEditing = !isNew && id;
  const cloneId = searchParams.get('cloneId');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const { toast } = useToast();
  const [dbElaboraciones, setDbElaboraciones] = useState<ElaborationConCoste[]>([]);
  const [dbMenaje, setDbMenaje] = useState<MenajeDB[]>([]);
  const [dbCategorias, setDbCategorias] = useState<CategoriaReceta[]>([]);
  const [dbTiposCocina, setDbTiposCocina] = useState<TipoCocina[]>([]);
  const [personalCPR, setPersonalCPR] = useState<Personal[]>([]);
  const [saboresSecundarios, setSaboresSecundarios] = useState<string[]>([]);
  const [texturas, setTexturas] = useState<string[]>([]);
  const [tecnicasCoccion, setTecnicasCoccion] = useState<string[]>([]);
  const [formatosServicio, setFormatosServicio] = useState<string[]>(['Cóctel (bocado)', 'Buffet', 'Emplatado en mesa', 'Estación de cocina en vivo (Showcooking)']);
  const [equipamientos, setEquipamientos] = useState<string[]>(['Horno de convección', 'Abatidor', 'Sifón', 'Roner']);
  const [etiquetasTendencia, setEtiquetasTendencia] = useState<string[]>(['Plant-based', 'Comfort food', 'Superalimentos', 'Kilómetro 0', 'Sin gluten', 'Keto']);

  const form = useForm<RecetaFormValues>({
    resolver: zodResolver(recetaFormSchema),
    defaultValues: defaultValues,
  });

  const { fields: elabFields, append: appendElab, remove: removeElab, move: moveElab, update: updateElab } = useFieldArray({ control: form.control, name: "elaboraciones", keyName: "key" });
  const { fields: menajeFields, append: appendMenaje, remove: removeMenaje, move: moveMenaje } = useFieldArray({ control: form.control, name: "menajeAsociado" });

  const watchedElaboraciones = form.watch('elaboraciones');
  const watchedPorcentajeCoste = form.watch('porcentajeCosteProduccion');

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
  

  useEffect(() => {
    // This effect runs once to load all master data.
    const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const storedErp = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
    const erpMap = new Map(storedErp.map(i => [i.idreferenciaerp, i]));
    const combinedIngredientes = storedInternos.map(ing => ({ ...ing, erp: erpMap.get(ing.productoERPlinkId) }));
    const ingredientesMap = new Map(combinedIngredientes.map(i => [i.id, i]));
    
    const elaboracionesData = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const elaboracionesConDatos = elaboracionesData.map(e => ({
        ...e, 
        costePorUnidad: e.costePorUnidad || 0, 
        alergenos: calculateElabAlergenos(e, ingredientesMap)
    }));
    
    setDbElaboraciones(elaboracionesConDatos);
    setDbMenaje(JSON.parse(localStorage.getItem('menajeDB') || '[]') as MenajeDB[]);
    setDbCategorias(JSON.parse(localStorage.getItem('categoriasRecetas') || '[]') as CategoriaReceta[]);
    setDbTiposCocina(JSON.parse(localStorage.getItem('tiposCocina') || '[]') as TipoCocina[]);
    
    const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    setPersonalCPR(allPersonal.filter(p => p.departamento === 'CPR'));

    // This effect handles the form data logic.
    let initialValues: Partial<RecetaFormValues> | null = null;
    const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];

    if (isEditing && id) {
        const foundReceta = allRecetas.find(e => e.id === id);
        if (foundReceta) {
            initialValues = foundReceta;
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar la receta.' });
            router.push('/book/recetas');
            return;
        }
    } else if (cloneId) {
        const recetaToClone = allRecetas.find(e => e.id === cloneId);
        if (recetaToClone) {
            initialValues = { ...recetaToClone, id: Date.now().toString(), nombre: `${recetaToClone.nombre} (Copia)` };
        } else {
            // Handle cloneId not found
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
        form.reset({
            ...defaultValues,
            ...initialValues
        });
    }

    setIsDataLoaded(true);

}, [id, isEditing, cloneId, isNew, form, router, toast]);

  const forceRecalculate = () => {
    const currentElaboraciones = form.getValues('elaboraciones');
    const updatedElaboraciones = currentElaboraciones.map(elab => {
        const masterElab = dbElaboraciones.find(dbElab => dbElab.id === elab.elaboracionId);
        if (masterElab && masterElab.costePorUnidad !== elab.coste) {
            return { ...elab, coste: masterElab.costePorUnidad || 0 };
        }
        return elab;
    });
    form.setValue('elaboraciones', updatedElaboraciones, { shouldDirty: true });
    toast({ title: 'Costes recalculados', description: 'Se han actualizado los costes unitarios de las elaboraciones.' });
};


  const onAddElab = (elab: ElaboracionConCoste) => {
    appendElab({ id: `${elab.id}-${Date.now()}`, elaboracionId: elab.id, nombre: elab.nombre, cantidad: 1, coste: elab.costePorUnidad || 0, gramaje: elab.produccionTotal || 0, alergenos: elab.alergenos || [], unidad: elab.unidadProduccion, merma: 0 });
  }

  const onAddMenaje = (menaje: MenajeDB) => {
    appendMenaje({ id: menaje.id, menajeId: menaje.id, descripcion: menaje.descripcion, ratio: 1 });
  }
  
  const handleElaborationCreated = (newElab: Elaboracion) => {
        toast({ title: 'Elaboración Creada', description: `Se ha añadido "${newElab.nombre}" a la receta.` });
        
        const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
        const ingredientesMap = new Map(storedInternos.map(i => [i.id, i]));
        const elabWithData = {
            ...newElab,
            costePorUnidad: newElab.costePorUnidad || 0,
            alergenos: calculateElabAlergenos(newElab, ingredientesMap)
        };
        
        setDbElaboraciones(prev => [...prev, elabWithData]);
        onAddElab(elabWithData);
    };

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

  const handleGenerateDescription = async () => {
    setIsGenerating(true);
    try {
        const formData = form.getValues();
        const description = await recipeDescriptionGenerator({
          nombre: formData.nombre,
          tipoCocina: formData.tipoCocina?.join(', '),
          perfilSaborPrincipal: formData.perfilSaborPrincipal,
          perfilSaborSecundario: formData.perfilSaborSecundario,
          perfilTextura: formData.perfilTextura,
          tecnicaCoccionPrincipal: formData.tecnicaCoccionPrincipal,
        });
        form.setValue('descripcionComercial', description, { shouldDirty: true });
        toast({ title: 'Descripción generada', description: 'La IA ha generado una nueva descripción comercial.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar la descripción.' });
    } finally {
        setIsGenerating(false);
    }
  };
  
  const onError = (errors: FieldErrors<RecetaFormValues>) => {
    const firstError = Object.entries(errors)[0];
    if (firstError) {
        const [fieldName, errorDetails] = firstError;
        let errorMessage = errorDetails.message;
        if (errorDetails.root) { // For array errors
            errorMessage = errorDetails.root.message;
        }
        if (typeof errorDetails === 'object' && !errorMessage && 'message' in errorDetails) {
            errorMessage = (errorDetails as any).message;
        }
        toast({
            variant: 'destructive',
            title: 'Error de validación',
            description: `${fieldName}: ${errorMessage}`,
        })
    }
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
    <div>
    <TooltipProvider>
      <main className="container mx-auto px-4 py-8">
        <FormProvider {...form}>
            <form id="receta-form" onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <BookHeart className="h-8 w-8" />
                        <h1 className="text-3xl font-headline font-bold">{pageTitle} {cloneId && <span className="text-xl text-muted-foreground">(Clonando)</span>}</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => router.push('/book/recetas')}> <X className="mr-2"/> Cancelar</Button>
                        {isEditing && !cloneId && (
                            <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}> <Trash2 className="mr-2"/> Borrar</Button>
                        )}
                        <Button type="submit" form="receta-form" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                        <span className="ml-2">{isEditing && !cloneId ? 'Guardar Cambios' : 'Guardar Receta'}</span>
                        </Button>
                    </div>
                </div>
              
                <div className="space-y-4">
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
                            
                            <div className="flex items-start gap-4">
                                <div className="flex-grow">
                                <FormField control={form.control} name="descripcionComercial" render={({ field }) => ( <FormItem>
                                    <FormLabel className="flex items-center gap-2">Descripción Comercial 
                                        <Button size="sm" variant="ghost" type="button" onClick={handleGenerateDescription} disabled={isGenerating} className="h-auto px-1 py-0 text-accent-foreground hover:text-accent-foreground/80">
                                            {isGenerating ? <Loader2 className="animate-spin h-3.5 w-3.5"/> : <Sparkles className="h-3.5 w-3.5"/>}
                                        </Button>
                                    </FormLabel>
                                    <FormControl><Textarea {...field} placeholder="Descripción para la carta..." rows={2} /></FormControl>
                                </FormItem> )} />
                                </div>
                                <FormField control={form.control} name="visibleParaComerciales" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 pt-9">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} id="visible-check" />
                                        </FormControl>
                                        <FormLabel htmlFor="visible-check" className="flex items-center gap-2 !mt-0 whitespace-nowrap"><Eye /><InfoTooltip text="Marca esta casilla si la receta debe aparecer en las propuestas y herramientas para el equipo comercial." /></FormLabel>
                                    </FormItem>
                                )} />
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
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="py-4">
                            <CardTitle className="text-lg">Imágenes Comerciales</CardTitle>
                             <CardDescription>Añade URLs de imágenes de alta calidad para usar en propuestas. La primera imagen será la principal.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ImageUploadSection name="fotosComercialesURLs" title="Imágenes Comerciales" form={form} />
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="text-lg flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp/>Análisis de Rentabilidad
                            </CardTitle>
                             <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7" type="button" onClick={forceRecalculate}>
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
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
                          <DndContext sensors={sensors} onDragEnd={(e) => handleDragEnd(e, 'elab')} collisionDetection={closestCenter}>
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
                                        <SortableTableRow key={field.id} field={{...field, key: field.id}} index={index} remove={removeElab} form={form} />
                                    ))}
                                    </TableBody>
                                </SortableContext>
                            </Table>
                          </DndContext>
                          </div>
                        </CardContent>
                    </Card>
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
                </div>
              </form>
            </FormProvider>
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
      </TooltipProvider>
    </div>
  );
}
