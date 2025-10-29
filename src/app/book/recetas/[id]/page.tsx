

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
    defaultValues: { id: '', nombre: '', nombre_en: '', visibleParaComerciales: true, descripcionComercial: '', descripcionComercial_en: '', responsableEscandallo: '', categoria: '', estacionalidad: 'MIXTO', tipoDieta: 'NINGUNO', gramajeTotal: 0, porcentajeCosteProduccion: 30, elaboraciones: [], menajeAsociado: [], fotosComercialesURLs: [], fotosEmplatadoURLs: [], fotosMiseEnPlaceURLs: [], fotosRegeneracionURLs: [], perfilSaborSecundario: [], perfilTextura: [], tipoCocina: [], equipamientoCritico: [], formatoServicioIdeal: [], etiquetasTendencia: [] }
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
    const loadAllData = () => {
        const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
        const storedErp = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
        const erpMap = new Map(storedErp.map(i => [i.idreferenciaerp, i]));
        const combined = storedInternos.map(ing => ({ ...ing, erp: erpMap.get(ing.productoERPlinkId) }));
        const ingredientesMap = new Map(combined.map(i => [i.id, i]));
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

        const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
        // ... (resto de la lógica de carga de datos)
        
        let initialValues: Receta | null = null;
        if (isEditing) {
            initialValues = allRecetas.find(e => e.id === id) || null;
            if (!initialValues) {
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar la receta.' });
                router.push('/book/recetas');
                return;
            }
        } else if (cloneId) {
            const recetaToClone = allRecetas.find(e => e.id === cloneId);
            if (recetaToClone) {
                initialValues = { ...recetaToClone, id: Date.now().toString(), nombre: `${recetaToClone.nombre} (Copia)` };
            }
        } else {
            const lastRecipe = allRecetas.reduce((last, current) => {
                if (!current.numeroReceta) return last;
                const currentNum = parseInt(current.numeroReceta.substring(2));
                const lastNum = last ? parseInt(last.numeroReceta!.substring(2)) : 0;
                return currentNum > lastNum ? current : last;
            }, null as Receta | null);
            const lastNum = lastRecipe ? parseInt(lastRecipe.numeroReceta!.substring(2)) : 0;
            const newNum = `R-${(lastNum + 1).toString().padStart(4, '0')}`;
            initialValues = { numeroReceta: newNum } as Partial<Receta> as Receta;
        }

        form.reset({
            ...defaultValues,
            ...initialValues,
        });

        setIsDataLoaded(true);
    };

    loadAllData();
  }, [id, isEditing, cloneId, form, router, toast]);
  
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
        
        // Add to the list of available elaboraciones and add to the current recipe
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
        partidaProduccion: partidasProduccion.join(', '), // Save computed value
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
    form.reset(dataToSave); // Mark form as not dirty
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
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <TrendingUp/>Análisis de Rentabilidad
                            </CardTitle>
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
                                <Label className="flex items-center gap-2">PVP Teórico
                                    <Button variant="ghost" size="icon" className="h-5 w-5" type="button" onClick={forceRecalculate}>
                                        <RefreshCw className="h-3 w-3" />
                                    </Button>
                                </Label>
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

```
- src/hooks/use-loading-store.ts:
```ts
import { create } from 'zustand';

type LoadingState = {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
};

export const useLoadingStore = create<LoadingState>()((set) => ({
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
}));

```
- src/hooks/use-sidebar-store.ts:
```ts
import { create } from 'zustand';

type SidebarState = {
  isCollapsed: boolean;
  toggleSidebar: () => void;
};

export const useSidebarStore = create<SidebarState>()((set) => ({
  isCollapsed: false,
  toggleSidebar: () => set(state => ({ isCollapsed: !state.isCollapsed })),
}));

```
- src/lib/utils.ts:
```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { parse, differenceInMinutes } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || isNaN(value)) {
    return (0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  }
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function formatNumber(value: number, decimals: number = 2) {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatUnit(unit: string) {
  const unitMap: Record<string, string> = {
    KG: 'kg',
    L: 'l',
    UD: 'ud',
  };
  return unitMap[unit] || unit;
}

export function formatPercentage(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function calculateHours(start?: string, end?: string): number {
  if (!start || !end) return 0;
  try {
    const startTime = parse(start, 'HH:mm', new Date());
    const endTime = parse(end, 'HH:mm', new Date());

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      console.error('Invalid time format for calculating hours:', { start, end });
      return 0;
    }
    
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    const diff = differenceInMinutes(endTime, startTime);
    return diff > 0 ? diff / 60 : 0;
  } catch (e) {
    console.error('Error calculating hours:', e);
    return 0;
  }
}

export function formatDuration(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
```
- src/app/os/[id]/info/page.tsx:
```tsx

'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, FileDown, Loader2, Warehouse, ChevronRight, PanelLeft, Wine, FilePenLine, Trash2, Leaf, Briefcase, Utensils, Truck, Archive, Snowflake, Euro, FilePlus, Users, UserPlus, Flower2, ClipboardCheck, Star, Save, AlertTriangle, Phone, Mail } from 'lucide-react';

import type { ServiceOrder, Personal, Espacio, ComercialBriefing, ComercialBriefingItem } from '@/types';
import { CATERING_VERTICALES } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/hooks/use-loading-store';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';

export const osFormSchema = z.object({
  id: z.string().min(1),
  serviceNumber: z.string().min(1, 'El Nº de Servicio es obligatorio'),
  startDate: z.date({ required_error: 'La fecha de inicio es obligatoria.' }),
  client: z.string().min(1, 'El cliente es obligatorio.'),
  tipoCliente: z.enum(['Empresa', 'Agencia', 'Particular']).optional(),
  asistentes: z.coerce.number().min(1, 'El número de asistentes es obligatorio.'),
  cateringVertical: z.enum(CATERING_VERTICALES, { required_error: 'La vertical de catering es obligatoria.' }),
  contact: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  finalClient: z.string().optional().default(''),
  endDate: z.date({ required_error: 'La fecha de fin es obligatoria.' }),
  space: z.string().optional().default(''),
  spaceAddress: z.string().optional().default(''),
  spaceContact: z.string().optional().default(''),
  spacePhone: z.string().optional().default(''),
  spaceMail: z.string().email().optional().or(z.literal('')),
  respMetre: z.string().optional().default(''),
  respMetrePhone: z.string().optional().default(''),
  respMetreMail: z.string().email().optional().or(z.literal('')),
  respCocinaCPR: z.string().optional().default(''),
  respCocinaCPRPhone: z.string().optional().default(''),
  respCocinaCPRMail: z.string().email().optional().or(z.literal('')),
  respPase: z.string().optional().default(''),
  respPasePhone: z.string().optional().default(''),
  respPaseMail: z.string().email().optional().or(z.literal('')),
  respCocinaPase: z.string().optional().default(''),
  respCocinaPasePhone: z.string().optional().default(''),
  respCocinaPaseMail: z.string().email().optional().or(z.literal('')),
  respProjectManager: z.string().optional().default(''),
  respProjectManagerPhone: z.string().optional().default(''),
  respProjectManagerMail: z.string().email().optional().or(z.literal('')),
  comercialAsiste: z.boolean().optional().default(false),
  comercial: z.string().optional().default(''),
  comercialPhone: z.string().optional().default(''),
  comercialMail: z.string().email().optional().or(z.literal('')),
  rrhhAsiste: z.boolean().optional().default(false),
  respRRHH: z.string().optional().default(''),
  respRRHHPhone: z.string().optional().default(''),
  respRRHHMail: z.string().email().optional().or(z.literal('')),
  agencyPercentage: z.coerce.number().optional().default(0),
  agencyCommissionValue: z.coerce.number().optional().default(0),
  spacePercentage: z.coerce.number().optional().default(0),
  spaceCommissionValue: z.coerce.number().optional().default(0),
  comisionesAgencia: z.coerce.number().optional().default(0),
  comisionesCanon: z.coerce.number().optional().default(0),
  facturacion: z.coerce.number().optional().default(0),
  plane: z.string().optional().default(''),
  comments: z.string().optional().default(''),
  status: z.enum(['Borrador', 'Pendiente', 'Confirmado', 'Anulado']).default('Borrador'),
  anulacionMotivo: z.string().optional(),
  deliveryLocations: z.array(z.string()).optional().default([]),
  objetivoGastoId: z.string().optional(),
  direccionPrincipal: z.string().optional().default(''),
  isVip: z.boolean().optional().default(false),
  email: z.string().email().optional().or(z.literal('')),
});

export type OsFormValues = z.infer<typeof osFormSchema>;

const defaultValues: Partial<OsFormValues> = {
  serviceNumber: '', client: '', contact: '', phone: '', finalClient: '', asistentes: 0,
  space: '', spaceAddress: '', spaceContact: '', spacePhone: '', spaceMail: '',
  respMetre: '', respMetrePhone: '', respMetreMail: '', 
  respPase: '', respPasePhone: '', respPaseMail: '',
  respCocinaPase: '', respCocinaPasePhone: '', respCocinaPaseMail: '',
  respCocinaCPR: '', respCocinaCPRPhone: '', respCocinaCPRMail: '',
  respProjectManager: '', respProjectManagerPhone: '', respProjectManagerMail: '',
  comercialAsiste: false, comercial: '', comercialPhone: '', comercialMail: '',
  rrhhAsiste: false, respRRHH: '', respRRHHPhone: '', respRRHHMail: '',
  agencyPercentage: 0, agencyCommissionValue: 0, spacePercentage: 0, spaceCommissionValue: 0,
  facturacion: 0,
  plane: '', comments: '',
  status: 'Borrador', tipoCliente: 'Empresa',
  deliveryLocations: [],
  direccionPrincipal: '',
  isVip: false,
};

const ClienteTitle = () => {
  const { watch } = useFormContext();
  const client = watch('client');
  const finalClient = watch('finalClient');
  return (
    <div className="flex w-full items-center justify-between p-4">
        <h3 className="text-lg font-semibold">Cliente</h3>
        {(client || finalClient) && (
             <span className="text-lg font-bold text-primary text-right">
                {client}{finalClient && ` / ${finalClient}`}
            </span>
        )}
    </div>
  );
};

const ClientInfo = () => {
    const { control } = useFormContext();
    return (
        <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 pt-2">
                 <FormField control={control} name="client" render={({ field }) => (
                    <FormItem><FormLabel>Cliente</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={control} name="tipoCliente" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo Cliente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Empresa">Empresa</SelectItem>
                            <SelectItem value="Agencia">Agencia</SelectItem>
                            <SelectItem value="Particular">Particular</SelectItem>
                        </SelectContent>
                    </Select>
                    </FormItem>
                )} />
                 <FormField control={control} name="finalClient" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cliente Final</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                )} />
                <FormField control={control} name="contact" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contacto Principal</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono Principal</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                 <FormField control={control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email Principal</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={control} name="direccionPrincipal" render={({ field }) => (
                    <FormItem className="col-span-full"><FormLabel>Dirección Principal de Entrega</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
            </div>
        </AccordionContent>
    );
};

const EspacioTitle = () => {
    const { watch } = useFormContext();
    const space = watch('space');
    const spaceAddress = watch('spaceAddress');
    
    return (
        <div className="flex w-full items-center justify-between p-4">
            <h3 className="text-lg font-semibold">Espacio</h3>
            {space && (
                <span className="text-base font-semibold text-primary text-right">
                    {space} {spaceAddress && <span className="font-normal text-muted-foreground">({spaceAddress})</span>}
                </span>
            )}
        </div>
    );
};

const ResponsablesTitle = () => {
  const metre = useWatch({ name: 'respMetre' });
  const pase = useWatch({ name: 'respPase' });

  return (
    <div className="flex w-full items-center justify-between p-4">
        <h3 className="text-lg font-semibold">Responsables</h3>
        {(metre || pase) && (
            <div className="text-right">
                {metre && <p className="text-sm"><span className="font-semibold text-muted-foreground">Metre:</span> <span className="font-semibold text-primary">{metre}</span></p>}
                {pase && <p className="text-sm"><span className="font-semibold text-muted-foreground">Pase:</span> <span className="font-semibold text-primary">{pase}</span></p>}
            </div>
        )}
    </div>
  );
};

export default function InfoPage() {
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const isEditing = osId !== 'nuevo';

  const [isMounted, setIsMounted] = useState(false);
  const { isLoading, setIsLoading } = useLoadingStore();
  const [accordionDefaultValue, setAccordionDefaultValue] = useState<string[] | undefined>(undefined);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSubmittingFromDialog, setIsSubmittingFromDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const [personal, setPersonal] = useState<Personal[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [isAnulacionDialogOpen, setIsAnulacionDialogOpen] = useState(false);
  const [anulacionMotivo, setAnulacionMotivo] = useState("");
  const [pendingStatus, setPendingStatus] = useState<OsFormValues['status'] | null>(null);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);

  
  const hasPruebaDeMenu = useMemo(() => {
    return briefingItems.some(item => item.descripcion.toLowerCase() === 'prueba de menu');
  }, [briefingItems]);

  const getFullName = (p: Personal) => `${p.nombre} ${p.apellidos}`;

  const personalSala = useMemo(() => personal.filter(p => p.departamento === 'Sala' && p.nombre && p.apellidos), [personal]);
  const personalPase = useMemo(() => personal.filter(p => p.departamento === 'Pase' && p.nombre && p.apellidos), [personal]);
  const personalCPR = useMemo(() => personal.filter(p => p.departamento === 'CPR' && p.nombre && p.apellidos), [personal]);
  const personalComercial = useMemo(() => personal.filter(p => p.departamento === 'Comercial' && p.nombre && p.apellidos), [personal]);
  const personalCocina = useMemo(() => personal.filter(p => p.departamento === 'COCINA' && p.nombre && p.apellidos), [personal]);
  const personalRRHH = useMemo(() => personal.filter(p => p.departamento === 'RRHH' && p.nombre && p.apellidos), [personal]);
  const personalOperaciones = useMemo(() => personal.filter(p => p.departamento === 'Operaciones' && p.nombre && p.apellidos), [personal]);
  const validEspacios = useMemo(() => espacios.filter(e => e.identificacion.nombreEspacio), [espacios]);
  const espacioOptions = useMemo(() => validEspacios.map(e => ({label: e.identificacion.nombreEspacio, value: e.identificacion.nombreEspacio})), [validEspacios]);


  const form = useForm<OsFormValues>({
    resolver: zodResolver(osFormSchema),
    defaultValues,
  });

  const { formState: { isDirty }, setValue, watch } = form;
  
  const handlePersonalChange = (name: string, phoneField: keyof OsFormValues, mailField: keyof OsFormValues) => {
    const person = personal.find(p => getFullName(p) === name);
    setValue(phoneField, person?.telefono || '', { shouldDirty: true });
    setValue(mailField, person?.mail || '', { shouldDirty: true });
  }

  const handleEspacioChange = (name: string) => {
    const espacio = espacios.find(e => e.identificacion.nombreEspacio === name);
    setValue('spaceAddress', espacio?.identificacion.calle || '', { shouldDirty: true });
    setValue('spaceContact', espacio?.contactos[0]?.nombre || '', { shouldDirty: true });
    setValue('spacePhone', espacio?.contactos[0]?.telefono || '', { shouldDirty: true });
    setValue('spaceMail', espacio?.contactos[0]?.email || '', { shouldDirty: true });
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);


  const handleBackToList = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
        router.push('/pes');
    }
  };


  useEffect(() => {
    const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    const allEspacios = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
    setPersonal(allPersonal.filter(p => p.nombre && p.apellidos));
    setEspacios(allEspacios.filter(e => e.identificacion.nombreEspacio));

    let currentOS: ServiceOrder | null = null;
    
    if (isEditing) {
      setAccordionDefaultValue([]); // Collapse for existing
      const allOS = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      currentOS = allOS.find(os => os.id === osId) || null;
      if (currentOS) {
        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        const currentBriefing = allBriefings.find(b => b.osId === osId);
        setBriefingItems(currentBriefing?.items || []);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró la Orden de Servicio.' });
        router.push('/pes');
      }
    } else { // Creating new OS
      currentOS = {
        ...defaultValues,
        id: Date.now().toString(),
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      } as ServiceOrder;
      setAccordionDefaultValue(['cliente', 'espacio', 'responsables']); // Expand for new
    }

    if (currentOS) {
        setServiceOrder(currentOS);
        form.reset({
            ...currentOS,
            startDate: new Date(currentOS.startDate),
            endDate: new Date(currentOS.endDate),
        });
    }

    setIsMounted(true);
  }, [osId, isEditing, form, router, toast]);

  function onSubmit(data: OsFormValues) {
    setIsLoading(true);

    let allOS = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    let message = '';
    let currentOsId = osId;
    
    if (isEditing) { // Update existing
      const osIndex = allOS.findIndex(os => os.id === osId);
      if (osIndex !== -1) {
        allOS[osIndex] = { ...allOS[osIndex], ...data, id: osId };
        message = 'Orden de Servicio actualizada correctamente.';
      }
    } else { // Create new
      const existingOS = allOS.find(os => os.serviceNumber === data.serviceNumber);
      if (existingOS) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Ya existe una Orden de Servicio con este número.',
        });
        setIsLoading(false);
        return;
      }
      currentOsId = data.id;
      const newOS: ServiceOrder = {
        ...data,
        facturacion: data.facturacion || 0, // Ensure facturacion is a number
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
      };
      allOS.push(newOS);
      message = 'Orden de Servicio creada correctamente.';
    }

    localStorage.setItem('serviceOrders', JSON.stringify(allOS));
    
    toast({ description: message });
    setIsLoading(false);

    if (!isEditing) {
        router.push(`/os/${currentOsId}`);
    } else {
        form.reset(data); // Mark form as not dirty
        if (isSubmittingFromDialog) {
          router.push('/pes');
        } else {
          router.replace(`/os/${currentOsId}/info?t=${Date.now()}`);
        }
    }
  }
  
  const handleSaveFromDialog = async () => {
    setIsSubmittingFromDialog(true);
    await form.handleSubmit(onSubmit)();
  };
  
  const handleDelete = () => {
    if (!isEditing) return;
    
    // Delete OS
    let allOS = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    allOS = allOS.filter(os => os.id !== osId);
    localStorage.setItem('serviceOrders', JSON.stringify(allOS));

    // Delete related data from other localStorage items
    const keysToDeleteFrom: (keyof Window['localStorage'])[] = [
      'materialOrders', 'comercialBriefings', 'gastronomyOrders', 'transporteOrders', 'hieloOrders', 
      'decoracionOrders', 'atipicosOrders', 'personalMiceOrders', 'personalExterno', 'pruebasMenu', 'pedidosEntrega'
    ];

    keysToDeleteFrom.forEach(key => {
        const data = JSON.parse(localStorage.getItem(key) || '[]') as { osId: string }[];
        const filteredData = data.filter(item => item.osId !== osId);
        localStorage.setItem(key, JSON.stringify(filteredData));
    });

    toast({ title: 'Orden de Servicio eliminada', description: 'Se han eliminado todos los datos asociados.' });
    router.push('/pes');
  };

  const statusValue = watch("status");
  const anulacionMotivoSaved = watch("anulacionMotivo");

  const handleStatusChange = (value: OsFormValues['status']) => {
    if (value === 'Anulado') {
        setPendingStatus(value);
        setIsAnulacionDialogOpen(true);
    } else {
        setValue('status', value, { shouldDirty: true });
        setValue('anulacionMotivo', undefined, { shouldDirty: true });
    }
  }

  const handleConfirmAnulacion = () => {
      if (pendingStatus && anulacionMotivo.trim()) {
          setValue('status', pendingStatus, { shouldDirty: true });
          setValue('anulacionMotivo', anulacionMotivo, { shouldDirty: true });
          setIsAnulacionDialogOpen(false);
          setAnulacionMotivo("");
          setPendingStatus(null);
      } else {
          toast({ variant: 'destructive', description: "El motivo de anulación no puede estar vacío."})
      }
  }


  if (!isMounted) {
    return <LoadingSkeleton title={isEditing ? 'Editando Orden de Servicio...' : 'Creando Orden de Servicio...'} />;
  }

  return (
    <>
      <FormProvider {...form}>
        <form id="os-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleBackToList} className="mb-2">
              <ArrowLeft className="mr-2" />
              Volver a Previsión
            </Button>
            <div className="flex gap-2">
              <Button type="submit" form="os-form" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar OS'}</span>
              </Button>
            </div>
          </div>
          <Accordion type="multiple" defaultValue={accordionDefaultValue} className="w-full space-y-3">
            <AccordionItem value="cliente" className="border-none">
              <Card>
                <AccordionTrigger className="p-0"><ClienteTitle /></AccordionTrigger>
                <ClientInfo />
              </Card>
            </AccordionItem>
            <AccordionItem value="espacio" className="border-none">
              <Card>
                <AccordionTrigger className="p-0"><EspacioTitle /></AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 px-4 pb-4">
                    <FormField control={form.control} name="space" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Espacio</FormLabel>
                            <Combobox
                                options={espacioOptions}
                                value={field.value || ''}
                                onChange={(value) => { field.onChange(value); handleEspacioChange(value); }}
                                placeholder="Busca o selecciona un espacio..."
                            />
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="spaceAddress" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Dirección</FormLabel>
                            <FormControl><Input {...field} placeholder="Dirección del espacio" /></FormControl>
                        </FormItem>
                    )} />
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormField control={form.control} name="spaceContact" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Contacto Espacio</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                        )} />
                        <FormField control={form.control} name="spacePhone" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tlf. Espacio</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                        )} />
                        <FormField control={form.control} name="spaceMail" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email Espacio</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="plane" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Plano</FormLabel>
                            <FormControl><Input placeholder="Enlazar aquí..." {...field} /></FormControl>
                        </FormItem>
                        )} />
                    </div>
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
            <AccordionItem value="responsables" className="border-none">
              <Card>
                <AccordionTrigger className="p-0"><ResponsablesTitle /></AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 px-4 pb-4">
                    {[
                        ['respMetre', 'respMetrePhone', 'respMetreMail', 'Resp. Metre', personalSala], 
                        ['respPase', 'respPasePhone', 'respPaseMail', 'Resp. Pase', personalPase], 
                        ['respCocinaPase', 'respCocinaPasePhone', 'respCocinaPaseMail', 'Resp. Cocina Pase', personalPase], 
                        ['respCocinaCPR', 'respCocinaCPRPhone', 'respCocinaCPRMail', 'Resp. Cocina CPR', personalCPR],
                        ['respProjectManager', 'respProjectManagerPhone', 'respProjectManagerMail', 'Resp. Project Manager', personalOperaciones],
                    ].map(([name, phone, mail, label, personalList]) => (
                      <div key={name as string} className="flex items-end gap-4">
                        <FormField control={form.control} name={name as any} render={({ field }) => (
                          <FormItem className="flex-grow">
                            <FormLabel>{label as string}</FormLabel>
                            <Select onValueChange={(value) => { field.onChange(value); handlePersonalChange(value, phone as any, mail as any); }} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                {(personalList as Personal[]).map(p => <SelectItem key={p.id} value={getFullName(p)}>{getFullName(p)}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground">
                           <Phone className="h-4 w-4"/>
                           <span>{watch(phone as any) || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground">
                           <Mail className="h-4 w-4"/>
                           <span>{watch(mail as any) || '-'}</span>
                        </div>
                      </div>
                    ))}

                    <Separator className="my-3" />
                    
                    <FormField control={form.control} name="comercialAsiste" render={({ field }) => (<FormItem className="flex flex-row items-center justify-start gap-3 rounded-lg border p-3"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!m-0 text-base">Comercial asiste al evento</FormLabel></FormItem>)} />
                    <div className="flex items-end gap-4">
                      <FormField control={form.control} name="comercial" render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormLabel>Resp. Comercial</FormLabel>
                          <Select onValueChange={(value) => { field.onChange(value); handlePersonalChange(value, 'comercialPhone', 'comercialMail'); }} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                            <SelectContent>{personalComercial.map(p => <SelectItem key={p.id} value={getFullName(p)}>{getFullName(p)}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground"><Phone className="h-4 w-4"/><span>{watch('comercialPhone') || '-'}</span></div>
                      <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground"><Mail className="h-4 w-4"/><span>{watch('comercialMail') || '-'}</span></div>
                    </div>
                    
                    <Separator className="my-3" />

                    <FormField control={form.control} name="rrhhAsiste" render={({ field }) => (<FormItem className="flex flex-row items-center justify-start gap-3 rounded-lg border p-3"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!m-0 text-base">RRHH asiste al evento</FormLabel></FormItem>)} />
                    <div className="flex items-end gap-4">
                      <FormField control={form.control} name="respRRHH" render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormLabel>Resp. RRHH</FormLabel>
                          <Select onValueChange={(value) => { field.onChange(value); handlePersonalChange(value, 'respRRHHPhone', 'respRRHHMail'); }} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                            <SelectContent>{personalRRHH.map(p => <SelectItem key={p.id} value={getFullName(p)}>{getFullName(p)}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground"><Phone className="h-4 w-4"/><span>{watch('respRRHHPhone') || '-'}</span></div>
                      <div className="flex items-center gap-2 pb-1 text-sm text-muted-foreground"><Mail className="h-4 w-4"/><span>{watch('respRRHHMail') || '-'}</span></div>
                    </div>
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>
        </form>
      </FormProvider>
      
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tienes cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Qué quieres hacer con los cambios que has realizado?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-between">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
                <Button variant="destructive" className="bg-orange-500 hover:bg-orange-600" onClick={() => router.push('/pes')}>Descartar</Button>
                <Button onClick={handleSaveFromDialog} disabled={isLoading}>
                {isLoading && isSubmittingFromDialog ? <Loader2 className="animate-spin" /> : 'Guardar y Salir'}
                </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción es irreversible. Se eliminará permanentemente la Orden de Servicio y todos sus datos asociados (pedidos de material, briefings, etc.).
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar Permanentemente</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isAnulacionDialogOpen} onOpenChange={setIsAnulacionDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Vas a anular esta orden de servicio?</AlertDialogTitle>
                    <AlertDialogDescription>
                        ¿Es correcto? Indica, por favor, el motivo de la anulación.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea 
                    placeholder="Escribe aquí el motivo de la anulación..."
                    value={anulacionMotivo}
                    onChange={(e) => setAnulacionMotivo(e.target.value)}
                    rows={4}
                />
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {
                        setIsAnulacionDialogOpen(false);
                        form.setValue('status', form.getValues('status')); // revert select
                    }}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmAnulacion} disabled={!anulacionMotivo.trim()}>Confirmar Anulación</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

```
- src/app/os/page.tsx:
```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the first page of the CPR module.
export default function OsRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/pes');
    }, [router]);
    return null;
}

```
- src/app/page.tsx:
```tsx
import { DashboardPage } from '@/app/dashboard-page';

export default function HomePage() {
  return <DashboardPage />;
}
```
- src/hooks/index.ts:
```ts
export * from "./use-toast";
export * from "./use-impersonated-user";
export * from "./use-loading-store";
export * from "./use-sidebar-store";
```
- tailwind.config.ts:
```ts
/** @type {import('tailwindcss').Config} */
import {fontFamily} from 'tailwindcss/defaultTheme';

module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
       fontFamily: {
        body: ['var(--font-body)', ...fontFamily.sans],
        headline: ['var(--font-headline)', ...fontFamily.sans],
        code: ['monospace'],
      },
       typography: (theme) => ({
        DEFAULT: {
          css: {
            h1: {
              fontFamily: theme('fontFamily.headline'),
            },
            h2: {
              fontFamily: theme('fontFamily.headline'),
            },
            h3: {
              fontFamily: theme('fontFamily.headline'),
            },
            '--tw-prose-bullets': theme('colors.primary.DEFAULT'),
          },
        },
      }),
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require('@tailwindcss/typography')],
}

```
- tsconfig.json:
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@/types": ["./src/types/index.ts"],
      "@/dnd/*": ["components/dnd/*"]
    },
    "types": ["node", "@types/papaparse", "@types/nprogress", "jspdf-autotable", "@types/react-signature-canvas"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

```