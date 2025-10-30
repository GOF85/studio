

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

import { Loader2, Save, X, BookHeart, Utensils, Sprout, Percent, PlusCircle, GripVertical, Trash2, Eye, Soup, Info, ChefHat, Package, Factory, Sparkles, TrendingUp, FilePenLine, Link as LinkIcon, Component, RefreshCw, Euro, Archive, BrainCircuit, AlertTriangle } from 'lucide-react';
import type { Receta, Elaboracion, IngredienteInterno, ArticuloERP, Alergeno, CategoriaReceta, SaborPrincipal, PartidaProduccion, ElaboracionEnReceta, TecnicaCoccion } from '@/types';
import { SABORES_PRINCIPALES, ALERGENOS, UNIDADES_MEDIDA, PARTIDAS_PRODUCCION, TECNICAS_COCCION } from '@/types';

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
  tecnicaCoccionPrincipal: z.enum(TECNICAS_COCCION).optional(),
  potencialMiseEnPlace: z.enum(['COMPLETO', 'PARCIAL', 'AL_MOMENTO']).optional(),
  formatoServicioIdeal: z.array(z.string()).optional().default([]),
  equipamientoCritico: z.array(z.string()).optional().default([]),
  dificultadProduccion: z.coerce.number().min(1).max(5).optional().default(3),
  estabilidadBuffet: z.coerce.number().min(1).max(5).optional().default(3),
  escalabilidad: z.enum(['FACIL', 'MEDIA', 'DIFICIL']).optional(),
  etiquetasTendencia: z.array(z.string()).optional().default([]),
  requiereRevision: z.boolean().optional().default(false),
  comentarioRevision: z.string().optional().default(''),
  fechaRevision: z.string().optional(),
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

function ImageUploadSection({ name, title, description, form }: { name: "fotosMiseEnPlaceURLs" | "fotosRegeneracionURLs" | "fotosEmplatadoURLs" | "fotosComercialesURLs"; title: string; description?: string; form: any }) {
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
            <h4 className="font-semibold text-lg">{title}</h4>
            
            {name === "fotosComercialesURLs" ? (
                <>
                <p className="text-sm text-muted-foreground mb-2">{description}</p>
                <FormField control={form.control} name="descripcionComercial" render={({ field }) => (
                    <FormItem className="mb-4">
                        <FormLabel className="flex items-center gap-2">Descripción Comercial 
                            <Button size="sm" variant="ghost" type="button" className="h-auto px-1 py-0 text-accent-foreground hover:text-accent-foreground/80">
                                <Sparkles className="h-3.5 w-3.5"/>
                            </Button>
                        </FormLabel>
                        <FormControl><Textarea {...field} placeholder="Descripción para la carta..." rows={2} /></FormControl>
                    </FormItem>
                )} />
                </>
            ) : (
                 <FormField
                    control={form.control}
                    name={name === "fotosMiseEnPlaceURLs" ? "instruccionesMiseEnPlace" : name === "fotosRegeneracionURLs" ? "instruccionesRegeneracion" : "instruccionesEmplatado"}
                    render={({ field }) => (
                        <FormItem className="mb-4">
                            <FormLabel>Instrucciones</FormLabel>
                            <FormControl><Textarea {...field} rows={4} /></FormControl>
                        </FormItem>
                    )}
                />
            )}

            <div className="space-y-2">
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

function CreateElaborationModal({ onElaborationCreated, children }: { onElaborationCreated: (newElab: Elaboracion) => Promise<void>, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSave = async (data: ElaborationFormValues, costePorUnidad: number) => {
        setIsSubmitting(true);
        let allItems = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        
        const dataToSave: Elaboracion = { ...data, costePorUnidad };
        allItems.push(dataToSave);
        localStorage.setItem('elaboraciones', JSON.stringify(allItems));
        
        toast({ title: 'Elaboración Creada', description: `Se ha añadido "${data.nombre}" a la base de datos y a la receta.` });
        await onElaborationCreated(dataToSave);

        setIsSubmitting(false);
        setIsOpen(false);
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

function ElaborationSelector({ allElaboraciones, onSelect }: { allElaboraciones: ElaboracionConCoste[], onSelect: (elab: ElaboracionConCoste) => void }) {
    const [searchTerm, setSearchTerm] = useState('');
    const filtered = allElaboraciones.filter(e => e.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <DialogContent>
            <DialogHeader><DialogTitle>Seleccionar Elaboración</DialogTitle></DialogHeader>
            <Input placeholder="Buscar elaboración..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="my-2" />
            <div className="max-h-[50vh] overflow-y-auto border rounded-md">
                <Table>
                    <TableHeader><TableRow><TableHead>Elaboración</TableHead><TableHead>Coste / Unidad</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filtered.map(elab => (
                            <TableRow key={elab.id}>
                                <TableCell>{elab.nombre}</TableCell>
                                <TableCell>{formatCurrency(elab.costePorUnidad)} / {formatUnit(elab.unidadProduccion)}</TableCell>
                                <TableCell className="text-right">
                                    <DialogClose asChild>
                                        <Button size="sm" type="button" onClick={() => onSelect(elab)}>Añadir</Button>
                                    </DialogClose>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
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
    etiquetasTendencia: [],
    requiereRevision: false,
    comentarioRevision: '',
    fechaRevision: '',
};

function RecetaFormPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const id = params.id as string;
  const cloneId = searchParams.get('cloneId');
  const isNew = id === 'nueva';
  const isEditing = !isNew && id;

  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const { toast } = useToast();
  const [dbElaboraciones, setDbElaboraciones] = useState<ElaborationConCoste[]>([]);
  const [dbCategorias, setDbCategorias] = useState<CategoriaReceta[]>([]);
  const [personalCPR, setPersonalCPR] = useState<Personal[]>([]);
  const [ingredientesMap, setIngredientesMap] = useState<Map<string, IngredienteConERP>>(new Map());


  const form = useForm<RecetaFormValues>({
    resolver: zodResolver(recetaFormSchema),
    defaultValues,
  });

  const { fields: elabFields, append: appendElab, remove: removeElab, move: moveElab, replace } = useFieldArray({ control: form.control, name: "elaboraciones", keyName: "key" });

  const watchedElaboraciones = form.watch('elaboraciones');
  const watchedPorcentajeCoste = form.watch('porcentajeCosteProduccion');

  const recalculateCostsAndAllergens = useCallback(() => {
    const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const storedErp = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
    const erpMap = new Map(storedErp.map(i => [i.idreferenciaerp, i]));
    const ingMap = new Map(storedInternos.map(ing => [ing.id, { ...ing, erp: erpMap.get(ing.productoERPlinkId) }]));
    setIngredientesMap(ingMap);

    const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    
    const updatedDbElaboraciones = allElaboraciones.map(e => {
        let costeTotalComponentes = 0;
        (e.componentes || []).forEach(comp => {
            if (comp.tipo === 'ingrediente') {
                const ing = ingMap.get(comp.componenteId);
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
            alergenos: calculateElabAlergenos(e, ingMap),
        };
    });
    
    setDbElaboraciones(updatedDbElaboraciones);
    
    const currentFormElabs = form.getValues('elaboraciones');
    const updatedFormElabs = currentFormElabs.map(elabInReceta => {
        const matchingDbElab = updatedDbElaboraciones.find(dbElab => dbElab.id === elabInReceta.elaboracionId);
        return {
            ...elabInReceta,
            coste: matchingDbElab?.costePorUnidad || elabInReceta.coste,
            alergenos: matchingDbElab?.alergenos || [],
        };
    });
    
    if (JSON.stringify(currentFormElabs) !== JSON.stringify(updatedFormElabs)) {
        replace(updatedFormElabs);
    }
    
  }, [form, replace]);

  useEffect(() => {
    let initialValues: Partial<RecetaFormValues> | null = null;
    
    try {
      setIsDataLoaded(false);
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
          responsableEscandallo: initialValues.responsableEscandallo || '',
          fotosComercialesURLs: (initialValues.fotosComercialesURLs || []).map(url => typeof url === 'string' ? {value: url} : url),
          fotosEmplatadoURLs: (initialValues.fotosEmplatadoURLs || []).map(url => typeof url === 'string' ? {value: url} : url),
          fotosMiseEnPlaceURLs: (initialValues.fotosMiseEnPlaceURLs || []).map(url => typeof url === 'string' ? {value: url} : url),
          fotosRegeneracionURLs: (initialValues.fotosRegeneracionURLs || []).map(url => typeof url === 'string' ? {value: url} : url),
        };
        form.reset(processedData as RecetaFormValues);
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
  
  const onAddElab = useCallback((elab: ElaboracionConCoste) => {
    appendElab({ id: `${elab.id}-${Date.now()}`, elaboracionId: elab.id, nombre: elab.nombre, cantidad: 1, coste: elab.costePorUnidad || 0, gramaje: elab.produccionTotal || 0, alergenos: elab.alergenos || [], unidad: elab.unidadProduccion, merma: 0 });
    setIsSelectorOpen(false); // Close the modal
  }, [appendElab]);
  
    const handleElaborationCreated = async (newElab: Elaboracion) => {
        recalculateCostsAndAllergens();
        const elabWithData: ElaboracionConCoste = {
            ...newElab,
            costePorUnidad: newElab.costePorUnidad || 0,
            alergenos: calculateElabAlergenos(newElab, ingredientesMap),
        };
        onAddElab(elabWithData);
        // After adding, trigger save for the main recipe form
        await form.handleSubmit(onSubmit)();
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
        description: `Por favor, revisa todos los campos obligatorios. Errores: ${Object.keys(errors).join(', ')}`,
    })
  };

  const onSubmit = (data: RecetaFormValues) => {
    setIsLoading(true);
    let allItems = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    
    if (data.requiereRevision && !data.fechaRevision) {
        data.fechaRevision = new Date().toISOString();
    }
    
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
    form.reset(dataToSave as RecetaFormValues); 

    if (!isEditing || cloneId) {
        router.push('/book/recetas');
    } else {
        router.replace(`/book/recetas/${id}?t=${Date.now()}`);
    }
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
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="general">Info. General</TabsTrigger>
                        <TabsTrigger value="receta">Receta</TabsTrigger>
                        <TabsTrigger value="pase">Info. Pase</TabsTrigger>
                        <TabsTrigger value="gastronomica">Clasificación Gastronómica</TabsTrigger>
                    </TabsList>
                    <TabsContent value="general" className="mt-4">
                         <Card>
                            <CardHeader className="flex-row justify-between items-start py-3">
                                <CardTitle className="text-lg">Información General y Clasificación</CardTitle>
                                <div className="flex items-center gap-4">
                                    <FormField control={form.control} name="visibleParaComerciales" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-end gap-3 rounded-lg border p-2">
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} id="visible-check" /></FormControl>
                                            <FormLabel htmlFor="visible-check" className="flex items-center gap-2 !mt-0 whitespace-nowrap"><Eye /><InfoTooltip text="Marca esta casilla si la receta debe aparecer en las propuestas para comerciales." /></FormLabel>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="isArchived" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-end gap-3 rounded-lg border p-2">
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} id="archived-check" /></FormControl>
                                            <FormLabel htmlFor="archived-check" className="flex items-center gap-2 !mt-0 whitespace-nowrap"><Archive /><InfoTooltip text="Archivar oculta la receta de todas las listas y selectores." /></FormLabel>
                                        </FormItem>
                                    )} />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-2">
                                <div className="grid md:grid-cols-2 gap-3">
                                    <FormField control={form.control} name="nombre" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Nombre de la Receta</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="responsableEscandallo" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel className="flex items-center gap-1.5">Responsable del Escandallo <InfoTooltip text="Persona encargada de definir y mantener los costes y componentes de esta receta." /></FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un responsable..." /></SelectTrigger></FormControl>
                                        <SelectContent>{personalCPR.map((p) => (<SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>))}</SelectContent>
                                        </Select>
                                        <FormMessage />
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
                              
                              <Separator className="my-4"/>
                              
                               <div className="space-y-4">
                                  <FormField control={form.control} name="requiereRevision" render={({ field }) => (
                                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                      <FormControl>
                                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                          <FormLabel className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Requiere Revisión</FormLabel>
                                          <p className="text-sm text-muted-foreground">Marca esta opción si la receta necesita ser revisada por un responsable (ej. costes desactualizados, alérgenos incorrectos).</p>
                                      </div>
                                      </FormItem>
                                  )} />
                                  {form.watch('requiereRevision') && (
                                      <FormField control={form.control} name="comentarioRevision" render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>Comentario de Revisión</FormLabel>
                                              <FormControl><Textarea {...field} placeholder="Describe por qué necesita revisión..." rows={2} /></FormControl>
                                          </FormItem>
                                      )} />
                                  )}
                              </div>
                                
                                <Separator className="my-4"/>

                                <ImageUploadSection name="fotosComercialesURLs" title="Información Comercial" form={form} description="Añade fotos para la propuesta comercial y una descripción atractiva."/>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="receta" className="mt-4">
                        <Card>
                            <CardHeader className="flex-row items-center justify-between py-3">
                                <div className="space-y-1">
                                  <CardTitle className="flex items-center gap-2 text-lg"><Utensils />Elaboraciones de la Receta</CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CreateElaborationModal onElaborationCreated={handleElaborationCreated}>
                                        <Button variant="secondary" size="sm" type="button"><PlusCircle size={16} /> Crear Nueva</Button>
                                    </CreateElaborationModal>
                                     <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                                        <DialogTrigger asChild>
                                        <Button type="button" variant="outline" size="sm"><PlusCircle size={16} />Añadir Elaboración</Button>
                                        </DialogTrigger>
                                        <ElaborationSelector allElaboraciones={dbElaboraciones} onSelect={onAddElab} />
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
                                <div className="flex w-full items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm"><Sprout/>Resumen de Alérgenos</h4>
                                        <div className="border rounded-md p-2 w-full bg-background min-h-8">
                                            {alergenos.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {alergenos.map(a => <AllergenBadge key={a} allergen={a as Alergeno}/>)}
                                                </div>
                                            ) : <p className="text-xs text-muted-foreground italic">Ninguno</p>}
                                        </div>
                                    </div>
                                    <Card className="flex-shrink-0">
                                        <CardHeader className="flex-row items-center justify-between pb-2">
                                            <CardTitle className="text-base">Coste y PVP</CardTitle>
                                             <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={recalculateCostsAndAllergens}>
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="space-y-1 text-sm">
                                             <div className="flex justify-between gap-4"><span>Coste Materia Prima:</span><span className="font-bold">{formatCurrency(costeMateriaPrima)}</span></div>
                                            <div className="flex justify-between gap-4 items-center">
                                                <Label>Imputación CPR (%):</Label>
                                                <FormField control={form.control} name="porcentajeCosteProduccion" render={({ field }) => (
                                                  <Input type="number" {...field} className="w-20 h-7 text-xs text-right" />
                                                )} />
                                            </div>
                                            <Separator />
                                            <div className="flex justify-between font-bold text-base pt-1">
                                                <span>PVP Teórico:</span>
                                                <span className="text-green-600">{formatCurrency(pvpTeorico)}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
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
                     <TabsContent value="gastronomica" className="mt-4">
                        <Card>
                            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BrainCircuit/>Clasificación Gastronómica</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="perfilSaborPrincipal" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Sabor Principal <InfoTooltip text="¿Cuál es el sabor dominante que define el plato?" /></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl><SelectContent>{SABORES_PRINCIPALES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                    <FormField control={form.control} name="perfilSaborSecundario" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Sabores Secundarios <InfoTooltip text="¿Qué otras notas de sabor son perceptibles?" /></FormLabel><MultiSelect options={['Picante', 'Ahumado', 'Cítrico', 'Herbáceo', 'Floral'].map(s=>({label: s, value:s}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem>)} />
                                    <FormField control={form.control} name="perfilTextura" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Texturas <InfoTooltip text="¿Qué texturas clave se encuentran en el plato?" /></FormLabel><MultiSelect options={['Crujiente', 'Cremoso', 'Meloso', 'Gelatinoso', 'Esponjoso', 'Líquido'].map(s=>({label: s, value:s}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem>)} />
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="tipoCocina" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Tipo de Cocina <InfoTooltip text="¿A qué estilo culinario pertenece?" /></FormLabel><MultiSelect options={['Mediterránea', 'Asiática', 'Fusión', 'De Mercado', 'Tradicional', 'Moderna'].map(s=>({label: s, value:s}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem>)} />
                                    <FormField control={form.control} name="recetaOrigen" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Origen / Inspiración <InfoTooltip text="¿De dónde viene esta receta? (Ej: Receta de la abuela, viaje a Tailandia...)" /></FormLabel><FormControl><Input {...field} placeholder="Ej: Receta de la abuela, Inspirado en..."/></FormControl></FormItem>)} />
                                </div>
                                <Separator />
                                <div className="grid md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="temperaturaServicio" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Temperatura de Servicio <InfoTooltip text="¿Cómo se debe servir este plato?" /></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl><SelectContent>{['CALIENTE', 'TIBIO', 'AMBIENTE', 'FRIO', 'HELADO'].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                    <FormField control={form.control} name="tecnicaCoccionPrincipal" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Técnica Principal <InfoTooltip text="¿Cuál es la técnica de cocción más relevante?" /></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl><SelectContent>{TECNICAS_COCCION.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                    <FormField control={form.control} name="potencialMiseEnPlace" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Potencial de MEP <InfoTooltip text="¿Cuánto trabajo se puede adelantar antes del servicio?" /></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl><SelectContent>{['COMPLETO', 'PARCIAL', 'AL_MOMENTO'].map(s=><SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                </div>
                                 <div className="grid md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="dificultadProduccion" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Dificultad de Producción (1-5) <InfoTooltip text="¿Cuán difícil es producir este plato en grandes cantidades?" /></FormLabel><FormControl><Input type="number" min="1" max="5" {...field} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="estabilidadBuffet" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Estabilidad en Buffet (1-5) <InfoTooltip text="Del 1 al 5, ¿cuánto tiempo aguanta en perfectas condiciones en un buffet?" /></FormLabel><FormControl><Input type="number" min="1" max="5" {...field} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="escalabilidad" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Escalabilidad <InfoTooltip text="¿Es fácil, medio o difícil aumentar la producción de 50 a 500 raciones?" /></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl><SelectContent>{['FACIL', 'MEDIA', 'DIFICIL'].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                </div>
                                <Separator />
                                 <div className="grid md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="formatoServicioIdeal" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Formato Ideal de Servicio <InfoTooltip text="¿En qué tipo de servicio o pase encaja mejor este plato?" /></FormLabel><MultiSelect options={['Cocktail', 'Banquete', 'Buffet', 'Box', 'Coffee Break'].map(s=>({label: s, value:s}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem>)} />
                                    <FormField control={form.control} name="etiquetasTendencia" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Etiquetas / Tendencias <InfoTooltip text="Palabras clave para marketing y ventas." /></FormLabel><MultiSelect options={['Healthy', 'Vegano', 'Sin Gluten', 'Tradicional', 'De autor', 'Instagrameable'].map(s=>({label: s, value:s}))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..."/></FormItem>)} />
                                </div>
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
    const params = useParams();
    const isNew = params.id === 'nueva' || params.id?.[0] === 'nueva';

    if (isNew) {
         return (
            <main>
                <RecetaFormPage />
            </main>
        )
    }

    return <RecetaFormPage />;
}












