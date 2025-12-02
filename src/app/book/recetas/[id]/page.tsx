

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
import { usePersonal } from '@/hooks/use-data-queries';
import { supabase } from '@/lib/supabase';

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
import { ImageUploader } from '@/components/book/images/ImageUploader';
import { ImageGallery } from '@/components/book/images/ImageGallery';
import type { ImagenReceta } from '@/types/index';


const elaboracionEnRecetaSchema = z.object({
    id: z.string(),
    elaboracionId: z.string(),
    nombre: z.string(),
    cantidad: z.coerce.number().min(0),
    coste: z.coerce.number().optional().default(0),
    gramaje: z.coerce.number().default(0),
    alergenos: z.array(z.enum(ALERGENOS)).optional().default([]),
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
    fotosMiseEnPlace: z.array(z.custom<ImagenReceta>()).default([]),
    instruccionesRegeneracion: z.string().optional().default(''),
    fotosRegeneracion: z.array(z.custom<ImagenReceta>()).default([]),
    instruccionesEmplatado: z.string().optional().default(''),
    fotosEmplatado: z.array(z.custom<ImagenReceta>()).default([]),
    fotosComerciales: z.array(z.custom<ImagenReceta>()).default([]),
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

    const costeConMerma = (field.coste || 0) * (1 + (field.merma || 0) / 100);
    const costeTotal = costeConMerma * (form.watch(`elaboraciones.${index}.cantidad`) || 0);


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

function RecipeImageSection({
    form,
    name,
    folder,
    title,
    description
}: {
    form: any,
    name: "fotosComerciales" | "fotosMiseEnPlace" | "fotosRegeneracion" | "fotosEmplatado",
    folder: string,
    title: string,
    description?: string
}) {
    const images = form.watch(name) || [];

    const handleUpload = (url: string, filename: string) => {
        const newImage: ImagenReceta = {
            id: `img-${Date.now()}`,
            url,
            esPrincipal: images.length === 0,
            orden: images.length,
            descripcion: filename
        };
        form.setValue(name, [...images, newImage], { shouldDirty: true });
    };

    const handleReorder = (newOrder: ImagenReceta[]) => {
        form.setValue(name, newOrder.map((img, index) => ({ ...img, orden: index })), { shouldDirty: true });
    };

    const handleDelete = (id: string) => {
        const newImages = images.filter((img: ImagenReceta) => img.id !== id);
        // Reassign principal if needed
        if (images.find((img: ImagenReceta) => img.id === id)?.esPrincipal && newImages.length > 0) {
            newImages[0].esPrincipal = true;
        }
        form.setValue(name, newImages, { shouldDirty: true });
    };

    const handleSetPrincipal = (id: string) => {
        const newImages = images.map((img: ImagenReceta) => ({
            ...img,
            esPrincipal: img.id === id
        }));
        form.setValue(name, newImages, { shouldDirty: true });
    };

    // Determine the instruction field name based on the image field name
    const getInstructionFieldName = () => {
        if (name === "fotosMiseEnPlace") return "instruccionesMiseEnPlace";
        if (name === "fotosRegeneracion") return "instruccionesRegeneracion";
        if (name === "fotosEmplatado") return "instruccionesEmplatado";
        if (name === "fotosComerciales") return "descripcionComercial";
        return null;
    };

    const instructionFieldName = getInstructionFieldName();

    return (
        <div className="space-y-4">
            <div>
                <Label className="text-base">{title}</Label>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>

            {/* Text field for instructions */}
            {instructionFieldName && (
                <FormField
                    control={form.control}
                    name={instructionFieldName}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                {name === "fotosComerciales" ? "Descripción Comercial" : "Instrucciones"}
                            </FormLabel>
                            <FormControl>
                                <Textarea
                                    {...field}
                                    rows={4}
                                    placeholder={
                                        name === "fotosComerciales"
                                            ? "Descripción para la carta..."
                                            : "Escribe las instrucciones detalladas..."
                                    }
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            <ImageUploader
                folder={folder}
                onUploadComplete={handleUpload}
            />
            <ImageGallery
                imagenes={images}
                onReorder={handleReorder}
                onDelete={handleDelete}
                onSetPrincipal={handleSetPrincipal}
            />
        </div>
    );
}

const InfoTooltip = ({ text }: { text: string }) => (
    <Tooltip>
        <TooltipTrigger type="button"><Info className="h-3 w-3" /></TooltipTrigger>
        <TooltipContent><p>{text}</p></TooltipContent>
    </Tooltip>
);

const calculateElabAlergenos = (elaboracion: Elaboracion, ingredientesMap: Map<string, IngredienteConERP>): Alergeno[] => {
    if (!elaboracion || !elaboracion.componentes) {
        return [];
    }
    const elabAlergenos = new Set<Alergeno>();
    elaboracion.componentes.forEach(comp => {
        if (comp.tipo === 'ingrediente') {
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
                                    <Sparkles className="h-3.5 w-3.5" />
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
                    <Input value={newUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="Pega una URL de imagen..." />
                    <Button type="button" variant="outline" onClick={handleAdd}><LinkIcon className="mr-2" />Añadir</Button>
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

        // This is the key part: wait for the parent to handle the new elaboration
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
    instruccionesMiseEnPlace: '',
    fotosMiseEnPlace: [],
    instruccionesRegeneracion: '',
    fotosRegeneracion: [],
    instruccionesEmplatado: '',
    fotosEmplatado: [],
    fotosComerciales: [],
    perfilSaborPrincipal: undefined,
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
    const { data: personalData = [] } = usePersonal();
    const personalCPR = useMemo(() => {
        return (personalData || []).filter((p: any) => p.departamento === 'CPR');
    }, [personalData]);
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

        const loadData = async () => {
            try {
                setIsDataLoaded(false);

                // Load categories
                const { data: categoriasData, error: categoriasError } = await supabase
                    .from('categorias_recetas')
                    .select('*')
                    .order('nombre', { ascending: true });

                if (categoriasError) {
                    console.error('Error loading categorias:', categoriasError);
                } else {
                    setDbCategorias(categoriasData || []);
                }

                const currentId = isEditing ? id : cloneId;

                if (currentId) {
                    // Load recipe from Supabase
                    const { data: recetaData, error: recetaError } = await supabase
                        .from('recetas')
                        .select('*')
                        .eq('id', currentId)
                        .single();

                    if (recetaError) {
                        console.error('Error loading recipe:', recetaError);
                        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo encontrar la receta.' });
                        router.push('/book/recetas');
                        return;
                    }

                    if (recetaData) {
                        // Clone recipe if needed
                        if (cloneId) {
                            recetaData.id = Date.now().toString();
                            recetaData.nombre = `${recetaData.nombre} (Copia)`;
                        }

                        // Handle images - process both old and new formats
                        const processImages = (images: any[]): ImagenReceta[] => {
                            if (!images || !Array.isArray(images)) return [];
                            return images.map((img: any, index: number) => {
                                if (typeof img === 'string') {
                                    return {
                                        id: `img-${Date.now()}-${index}`,
                                        url: img,
                                        esPrincipal: index === 0,
                                        orden: index
                                    };
                                }
                                // Handle old format { value: string }
                                if (img.value) {
                                    return {
                                        id: `img-${Date.now()}-${index}`,
                                        url: img.value,
                                        esPrincipal: index === 0,
                                        orden: index
                                    };
                                }
                                // Already in correct format
                                return img;
                            });
                        };

                        initialValues = {
                            ...defaultValues,
                            id: recetaData.id,
                            numeroReceta: recetaData.numero_receta,
                            nombre: recetaData.nombre,
                            nombre_en: recetaData.nombre_en || '',
                            visibleParaComerciales: recetaData.visible_para_comerciales ?? true,
                            isArchived: recetaData.is_archived ?? false,
                            descripcionComercial: recetaData.descripcion_comercial || '',
                            descripcionComercial_en: recetaData.descripcion_comercial_en || '',
                            responsableEscandallo: recetaData.responsable_escandallo || '',
                            categoria: recetaData.categoria || '',
                            gramajeTotal: recetaData.gramaje_total || 0,
                            estacionalidad: recetaData.estacionalidad || 'MIXTO',
                            tipoDieta: recetaData.tipo_dieta || 'NINGUNO',
                            porcentajeCosteProduccion: recetaData.porcentaje_coste_produccion || 30,
                            elaboraciones: recetaData.elaboraciones || [],
                            menajeAsociado: recetaData.menaje_asociado || [],
                            instruccionesMiseEnPlace: recetaData.instrucciones_mise_en_place || '',
                            fotosMiseEnPlace: processImages(recetaData.fotos_mise_en_place || []),
                            instruccionesRegeneracion: recetaData.instrucciones_regeneracion || '',
                            fotosRegeneracion: processImages(recetaData.fotos_regeneracion || []),
                            instruccionesEmplatado: recetaData.instrucciones_emplatado || '',
                            fotosEmplatado: processImages(recetaData.fotos_emplatado || []),
                            fotosComerciales: processImages(recetaData.fotos_comerciales || []),
                            perfilSaborPrincipal: recetaData.perfil_sabor_principal,
                            perfilSaborSecundario: recetaData.perfil_sabor_secundario || [],
                            perfilTextura: recetaData.perfil_textura || [],
                            tipoCocina: recetaData.tipo_cocina || [],
                            recetaOrigen: recetaData.receta_origen || '',
                            temperaturaServicio: recetaData.temperatura_servicio,
                            tecnicaCoccionPrincipal: recetaData.tecnica_coccion_principal,
                            potencialMiseEnPlace: recetaData.potencial_mise_en_place,
                            formatoServicioIdeal: recetaData.formato_servicio_ideal || [],
                            equipamientoCritico: recetaData.equipamiento_critico || [],
                            dificultadProduccion: recetaData.dificultad_produccion || 3,
                            estabilidadBuffet: recetaData.estabilidad_buffet || 3,
                            escalabilidad: recetaData.escalabilidad,
                            etiquetasTendencia: recetaData.etiquetas_tendencia || [],
                            requiereRevision: recetaData.requiere_revision ?? false,
                            comentarioRevision: recetaData.comentario_revision || '',
                            fechaRevision: recetaData.fecha_revision || '',
                        };
                    }
                } else if (isNew) {
                    // Generate new recipe number
                    const { data: allRecetas, error } = await supabase
                        .from('recetas')
                        .select('numero_receta')
                        .order('numero_receta', { ascending: false })
                        .limit(1);

                    if (error) {
                        console.error('Error loading last recipe number:', error);
                    }

                    const lastRecipe = allRecetas?.[0];
                    const lastNumber = lastRecipe?.numero_receta ? parseInt(lastRecipe.numero_receta.split('-')[1]) : 0;
                    const newNumber = `R-${(lastNumber + 1).toString().padStart(4, '0')}`;

                    initialValues = { ...defaultValues, id: Date.now().toString(), numeroReceta: newNumber };
                }

                if (initialValues) {
                    form.reset(initialValues as RecetaFormValues);
                    recalculateCostsAndAllergens();
                }

            } catch (e) {
                console.error("Error crítico durante la carga de datos:", e);
                toast({ variant: 'destructive', title: 'Error de carga', description: 'No se pudieron cargar los datos necesarios.' });
            } finally {
                setIsDataLoaded(true);
            }
        };

        loadData();
    }, [id, cloneId, isNew, isEditing, form, router, toast, recalculateCostsAndAllergens]);

    const { costeMateriaPrima, alergenos, partidasProduccion } = useMemo(() => {
        let coste = 0;
        const allAlergenos = new Set<Alergeno>();
        const allPartidas = new Set<PartidaProduccion>();

        (watchedElaboraciones || []).forEach(elab => {
            const costeConMerma = (elab.coste || 0) * (1 + (elab.merma || 0) / 100);
            coste += costeConMerma * elab.cantidad;

            const elabData = dbElaboraciones.find(dbElab => dbElab.id === elab.elaboracionId);
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

    const onSubmit = async (data: RecetaFormValues) => {
        setIsLoading(true);

        if (data.requiereRevision && !data.fechaRevision) {
            data.fechaRevision = new Date().toISOString();
        }

        try {
            // Map form data (camelCase) to database schema (snake_case)
            const dataToSave = {
                id: data.id,
                numero_receta: data.numeroReceta,
                nombre: data.nombre,
                nombre_en: data.nombre_en,
                visible_para_comerciales: data.visibleParaComerciales,
                is_archived: data.isArchived,
                descripcion_comercial: data.descripcionComercial,
                descripcion_comercial_en: data.descripcionComercial_en,
                responsable_escandallo: data.responsableEscandallo,
                categoria: data.categoria,
                gramaje_total: data.gramajeTotal,
                estacionalidad: data.estacionalidad,
                tipo_dieta: data.tipoDieta,
                porcentaje_coste_produccion: data.porcentajeCosteProduccion,
                elaboraciones: data.elaboraciones,
                menaje_asociado: data.menajeAsociado,
                instrucciones_mise_en_place: data.instruccionesMiseEnPlace,
                fotos_mise_en_place: data.fotosMiseEnPlace,
                instrucciones_regeneracion: data.instruccionesRegeneracion,
                fotos_regeneracion: data.fotosRegeneracion,
                instrucciones_emplatado: data.instruccionesEmplatado,
                fotos_emplatado: data.fotosEmplatado,
                fotos_comerciales: data.fotosComerciales,
                perfil_sabor_principal: data.perfilSaborPrincipal,
                perfil_sabor_secundario: data.perfilSaborSecundario,
                perfil_textura: data.perfilTextura,
                tipo_cocina: data.tipoCocina,
                receta_origen: data.recetaOrigen,
                temperatura_servicio: data.temperaturaServicio,
                tecnica_coccion_principal: data.tecnicaCoccionPrincipal,
                potencial_mise_en_place: data.potencialMiseEnPlace,
                formato_servicio_ideal: data.formatoServicioIdeal,
                equipamiento_critico: data.equipamientoCritico,
                dificultad_produccion: data.dificultadProduccion,
                estabilidad_buffet: data.estabilidadBuffet,
                escalabilidad: data.escalabilidad,
                etiquetas_tendencia: data.etiquetasTendencia,
                requiere_revision: data.requiereRevision,
                comentario_revision: data.comentarioRevision,
                fecha_revision: data.fechaRevision || null,
                coste_materia_prima: costeMateriaPrima,
                precio_venta: pvpTeorico,
                alergenos: alergenos,
                partida_produccion: partidasProduccion.join(', '),
            };

            if (isEditing && !cloneId) {
                // Update existing recipe
                const { error } = await supabase
                    .from('recetas')
                    .update(dataToSave)
                    .eq('id', id);

                if (error) throw error;
                toast({ description: 'Receta actualizada correctamente.' });
            } else {
                // Insert new recipe
                const { error } = await supabase
                    .from('recetas')
                    .insert([dataToSave]);

                if (error) throw error;
                toast({ description: cloneId ? 'Receta clonada correctamente.' : 'Receta creada correctamente.' });
            }

            // Reset form with the original camelCase data
            const formResetData: RecetaFormValues = {
                ...data,
                costeMateriaPrima,
                precioVenta: pvpTeorico,
                alergenos,
                partidaProduccion: partidasProduccion.join(', '),
            };
            form.reset(formResetData);

            if (!isEditing || cloneId) {
                router.push('/book/recetas');
            } else {
                router.replace(`/book/recetas/${id}?t=${Date.now()}`);
            }
        } catch (error: any) {
            console.error('Error saving recipe:', error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }

    const handleDelete = async () => {
        if (!isEditing) return;

        try {
            const { error } = await supabase
                .from('recetas')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({ title: 'Receta eliminada' });
            router.push('/book/recetas');
        } catch (error: any) {
            console.error('Error deleting recipe:', error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
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
                                    <Button variant="outline" type="button" onClick={() => router.push('/book/recetas')}> <X className="mr-2" /> Cancelar</Button>
                                    {isEditing && (
                                        <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2" /> Borrar</Button>
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
                                                <FormField control={form.control} name="nombre" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Nombre de la Receta</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name="responsableEscandallo" render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                        <FormLabel className="flex items-center gap-1.5">Responsable del Escandallo <InfoTooltip text="Persona encargada de definir y mantener los costes y componentes de esta receta." /></FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un responsable..." /></SelectTrigger></FormControl>
                                                            <SelectContent>{personalCPR.map((p: any) => (<SelectItem key={p.id} value={p.nombre_compacto || p.nombre}>{p.nombre_compacto || p.nombre}</SelectItem>))}</SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>

                                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                <FormField control={form.control} name="categoria" render={({ field }) => (<FormItem className="flex flex-col">
                                                    <FormLabel>Categoría</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {dbCategorias.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage /></FormItem>)} />
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
                                                <FormField control={form.control} name="gramajeTotal" render={({ field }) => (<FormItem className="flex flex-col">
                                                    <FormLabel>Gramaje Total (g)</FormLabel>
                                                    <FormControl><Input type="number" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>)} />
                                            </div>

                                            <Separator className="my-4" />

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

                                            <Separator className="my-4" />

                                            <Separator className="my-4" />

                                            <RecipeImageSection
                                                name="fotosComerciales"
                                                title="Información Comercial"
                                                folder="recetas/comercial"
                                                form={form}
                                                description="Añade fotos para la propuesta comercial y una descripción atractiva."
                                            />
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
                                                                    <SortableTableRow key={field.key} field={{ ...field, key: field.key }} index={index} remove={removeElab} form={form} />
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
                                                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm"><Sprout />Resumen de Alérgenos</h4>
                                                    <div className="border rounded-md p-2 w-full bg-background min-h-8">
                                                        {alergenos.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {alergenos.map(a => <AllergenBadge key={a} allergen={a as Alergeno} />)}
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
                                            <CardTitle className="flex items-center gap-2 text-lg"><FilePenLine />Instrucciones y Medios</CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid lg:grid-cols-3 gap-6 pt-2">
                                            <RecipeImageSection
                                                name="fotosMiseEnPlace"
                                                title="Instrucciones Mise en Place"
                                                folder="recetas/MEP"
                                                form={form}
                                            />
                                            <RecipeImageSection
                                                name="fotosRegeneracion"
                                                title="Instrucciones Regeneración"
                                                folder="recetas/regeneracion"
                                                form={form}
                                            />
                                            <RecipeImageSection
                                                name="fotosEmplatado"
                                                title="Instrucciones Emplatado"
                                                folder="recetas/emplatado"
                                                form={form}
                                            />
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                                <TabsContent value="gastronomica" className="mt-4">
                                    <Card>
                                        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BrainCircuit />Clasificación Gastronómica</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <FormField control={form.control} name="perfilSaborPrincipal" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Sabor Principal <InfoTooltip text="¿Cuál es el sabor dominante que define el plato?" /></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{SABORES_PRINCIPALES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                                <FormField control={form.control} name="perfilSaborSecundario" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Sabores Secundarios <InfoTooltip text="¿Qué otras notas de sabor son perceptibles?" /></FormLabel><MultiSelect options={['Picante', 'Ahumado', 'Cítrico', 'Herbáceo', 'Floral'].map(s => ({ label: s, value: s }))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..." /></FormItem>)} />
                                                <FormField control={form.control} name="perfilTextura" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Texturas <InfoTooltip text="¿Qué texturas clave se encuentran en el plato?" /></FormLabel><MultiSelect options={['Crujiente', 'Cremoso', 'Meloso', 'Gelatinoso', 'Esponjoso', 'Líquido'].map(s => ({ label: s, value: s }))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..." /></FormItem>)} />
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name="tipoCocina" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Tipo de Cocina <InfoTooltip text="¿A qué estilo culinario pertenece?" /></FormLabel><MultiSelect options={['Mediterránea', 'Asiática', 'Fusión', 'De Mercado', 'Tradicional', 'Moderna'].map(s => ({ label: s, value: s }))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..." /></FormItem>)} />
                                                <FormField control={form.control} name="recetaOrigen" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Origen / Inspiración <InfoTooltip text="¿De dónde viene esta receta? (Ej: Receta de la abuela, viaje a Tailandia...)" /></FormLabel><FormControl><Input {...field} placeholder="Ej: Receta de la abuela, Inspirado en..." /></FormControl></FormItem>)} />
                                            </div>
                                            <Separator />
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <FormField control={form.control} name="temperaturaServicio" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Temperatura de Servicio <InfoTooltip text="¿Cómo se debe servir este plato?" /></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{['CALIENTE', 'TIBIO', 'AMBIENTE', 'FRIO', 'HELADO'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                                <FormField control={form.control} name="tecnicaCoccionPrincipal" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Técnica Principal <InfoTooltip text="¿Cuál es la técnica de cocción más relevante?" /></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{TECNICAS_COCCION.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                                <FormField control={form.control} name="potencialMiseEnPlace" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Potencial de MEP <InfoTooltip text="¿Cuánto trabajo se puede adelantar antes del servicio?" /></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{['COMPLETO', 'PARCIAL', 'AL_MOMENTO'].map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name="dificultadProduccion" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Dificultad de Producción (1-5) <InfoTooltip text="¿Cuán difícil es producir este plato en grandes cantidades?" /></FormLabel><FormControl><Input type="number" min="1" max="5" {...field} /></FormControl></FormItem>)} />
                                                <FormField control={form.control} name="estabilidadBuffet" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Estabilidad en Buffet (1-5) <InfoTooltip text="Del 1 al 5, ¿cuánto tiempo aguanta en perfectas condiciones en un buffet?" /></FormLabel><FormControl><Input type="number" min="1" max="5" {...field} /></FormControl></FormItem>)} />
                                                <FormField control={form.control} name="escalabilidad" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Escalabilidad <InfoTooltip text="¿Es fácil, medio o difícil aumentar la producción de 50 a 500 raciones?" /></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{['FACIL', 'MEDIA', 'DIFICIL'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                            </div>
                                            <Separator />
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name="formatoServicioIdeal" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Formato Ideal de Servicio <InfoTooltip text="¿En qué tipo de servicio o pase encaja mejor este plato?" /></FormLabel><MultiSelect options={['Cocktail', 'Banquete', 'Buffet', 'Box', 'Coffee Break'].map(s => ({ label: s, value: s }))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..." /></FormItem>)} />
                                                <FormField control={form.control} name="etiquetasTendencia" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1.5">Etiquetas / Tendencias <InfoTooltip text="Palabras clave para marketing y ventas." /></FormLabel><MultiSelect options={['Healthy', 'Vegano', 'Sin Gluten', 'Tradicional', 'De autor', 'Instagrameable'].map(s => ({ label: s, value: s }))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..." /></FormItem>)} />
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

