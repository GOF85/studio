'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { 
    Loader2, Save, X, Info, PlusCircle, GripVertical, 
    Trash2, Eye, Component, Archive, BrainCircuit, AlertTriangle, 
    Maximize2, Image as ImageIcon, ChevronLeft, ChevronRight, Search
} from 'lucide-react';
import type { Receta, Elaboracion, IngredienteInterno, ArticuloERP, Alergeno, CategoriaReceta, PartidaProduccion, ElaboracionEnReceta } from '@/types';
import { SABORES_PRINCIPALES, ALERGENOS, UNIDADES_MEDIDA, TECNICAS_COCCION } from '@/types';
import { supabase } from '@/lib/supabase';
import { usePersonal } from '@/hooks/use-data-queries';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { MultiSelect } from '@/components/ui/multi-select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Slider } from '@/components/ui/slider';
import { formatCurrency, formatUnit, cn } from '@/lib/utils';
import Image from 'next/image';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { ElaborationForm, type ElaborationFormValues } from '@/components/book/elaboration-form';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageManager } from '@/components/book/images/ImageManager';
import type { ImagenReceta } from '@/types/index';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// --- ESQUEMAS ---
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
    numeroReceta: z.string().optional().nullable(),
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    nombre_en: z.string().optional().default(''),
    visibleParaComerciales: z.boolean().default(true),
    isArchived: z.boolean().optional().default(false),
    descripcionComercial: z.string().optional().default(''),
    descripcionComercial_en: z.string().optional().default(''),
    responsableEscandallo: z.string().optional().default(''),
    categoria: z.string().min(1, 'La categoría es obligatoria'),
    partidaProduccion: z.string().optional().nullable(),
    gramajeTotal: z.coerce.number().optional().default(0),
    estacionalidad: z.enum(['INVIERNO', 'VERANO', 'MIXTO']).optional().nullable(),
    tipoDieta: z.enum(['VEGETARIANO', 'VEGANO', 'AMBOS', 'NINGUNO']).optional().nullable(),
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
    perfilSaborPrincipal: z.string().optional().nullable(),
    perfilSaborSecundario: z.array(z.string()).optional().default([]),
    perfilTextura: z.array(z.string()).optional().default([]),
    tipoCocina: z.array(z.string()).optional().default([]),
    recetaOrigen: z.string().optional().default(''),
    temperaturaServicio: z.string().optional().nullable(),
    tecnicaCoccionPrincipal: z.string().optional().nullable(),
    potencialMiseEnPlace: z.string().optional().nullable(),
    formatoServicioIdeal: z.array(z.string()).optional().default([]),
    equipamientoCritico: z.array(z.string()).optional().default([]),
    dificultadProduccion: z.coerce.number().min(1).max(5).optional().default(3),
    estabilidadBuffet: z.coerce.number().min(1).max(5).optional().default(3),
    escalabilidad: z.string().optional().nullable(),
    etiquetasTendencia: z.array(z.string()).optional().default([]),
    requiereRevision: z.boolean().optional().default(false),
    comentarioRevision: z.string().optional().default(''),
    fechaRevision: z.string().optional().nullable(),
});

type RecetaFormValues = z.infer<typeof recetaFormSchema>;
type ElaboracionConCoste = Elaboracion & { costePorUnidad?: number; alergenos?: Alergeno[] };
type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

// --- COMPONENTE GALERÍA MODAL ---
function ImageGalleryModal({ images, initialIndex, isOpen, onClose }: { images: ImagenReceta[], initialIndex: number, isOpen: boolean, onClose: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    useEffect(() => { if (isOpen) setCurrentIndex(initialIndex); }, [isOpen, initialIndex]);
    if (!isOpen) return null;
    const handleNext = () => setCurrentIndex((prev) => (prev + 1) % images.length);
    const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0 bg-black/95 border-none">
                <DialogTitle className="sr-only">Galería</DialogTitle>
                <div className="relative flex-1 flex items-center justify-center overflow-hidden">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-white z-50 hover:bg-white/20" onClick={onClose}><X className="h-6 w-6" /></Button>
                    {images.length > 1 && (<><Button type="button" variant="ghost" size="icon" className="absolute left-2 text-white hover:bg-white/20 z-10" onClick={handlePrev}><ChevronLeft className="h-8 w-8" /></Button><Button type="button" variant="ghost" size="icon" className="absolute right-2 text-white hover:bg-white/20 z-10" onClick={handleNext}><ChevronRight className="h-8 w-8" /></Button></>)}
                    <div className="relative w-full h-full p-4"><Image src={images[currentIndex]?.url || ''} alt="Imagen" fill className="object-contain" priority /></div>
                </div>
                <div className="p-4 text-center text-white bg-black/50"><p className="text-sm">{currentIndex + 1} / {images.length}</p>{images[currentIndex]?.descripcion && <p className="text-xs text-gray-300 mt-1">{images[currentIndex].descripcion}</p>}</div>
            </DialogContent>
        </Dialog>
    );
}

// --- FILA ORDENNABLE ---
function SortableTableRow({ field, index, remove, form }: { field: ElaboracionEnReceta & { key: string }, index: number, remove: (index: number) => void, form: any }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const costeConMerma = (field.coste || 0) * (1 + (field.merma || 0) / 100);
    const quantity = form.watch(`elaboraciones.${index}.cantidad`) || 0;
    const costeTotal = costeConMerma * quantity;

    return (
        <TableRow ref={setNodeRef} style={style} {...attributes}>
            <TableCell className="w-8 p-1"><div {...listeners} className="cursor-grab text-muted-foreground p-1"><GripVertical className="h-4 w-4" /></div></TableCell>
            <TableCell className="font-semibold py-1 px-2 text-xs sm:text-sm min-w-[120px]">{field.nombre}</TableCell>
            <TableCell className="text-right font-mono py-1 px-2 hidden sm:table-cell text-xs">{formatCurrency(field.coste)}</TableCell>
            <TableCell className="py-1 px-2 w-32">
                <FormField control={form.control} name={`elaboraciones.${index}.cantidad`} render={({ field: qField }) => (
                    <FormItem><FormControl><Input type="number" step="any" {...qField} value={qField.value ?? ''} className="h-7 text-xs px-2" /></FormControl></FormItem>
                )} />
            </TableCell>
            <TableCell className="py-1 px-2 w-20 hidden sm:table-cell"><FormField control={form.control} name={`elaboraciones.${index}.merma`} render={({ field: mField }) => (<FormItem><FormControl><Input type="number" {...mField} value={mField.value ?? ''} className="h-7 text-xs px-2" /></FormControl></FormItem>)} /></TableCell>
            <TableCell className="text-[10px] text-muted-foreground py-1 px-2">{formatUnit(field.unidad)}</TableCell>
            <TableCell className="text-right font-mono py-1 px-2 text-xs">{formatCurrency(costeTotal)}</TableCell>
            <TableCell className="py-1 px-1 w-8"><Button type="button" variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => remove(index)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
        </TableRow>
    );
}

// --- SECCIÓN DE IMÁGENES ---
function RecipeImageSection({ form, name, folder, title, description, canUseCamera, instructionFieldName }: any) {
    const images = form.watch(name) || [];
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [initialIndex, setInitialIndex] = useState(0);

    const handleUpload = (url: string, filename: string) => {
        const newImage: ImagenReceta = { id: `img-${Date.now()}`, url, esPrincipal: images.length === 0, orden: images.length, descripcion: filename };
        form.setValue(name, [...images, newImage], { shouldDirty: true });
    };
    const handleReorder = (newOrder: ImagenReceta[]) => form.setValue(name, newOrder.map((img, index) => ({ ...img, orden: index })), { shouldDirty: true });
    const handleDelete = (id: string) => {
        const newImages = images.filter((img: ImagenReceta) => img.id !== id);
        if (images.find((img: ImagenReceta) => img.id === id)?.esPrincipal && newImages.length > 0) newImages[0].esPrincipal = true;
        form.setValue(name, newImages, { shouldDirty: true });
    };
    const handleSetPrincipal = (id: string) => form.setValue(name, images.map((img: ImagenReceta) => ({ ...img, esPrincipal: img.id === id })), { shouldDirty: true });
    const openGallery = (index: number) => { setInitialIndex(index); setGalleryOpen(true); };

    return (
        <div className="space-y-3 h-full flex flex-col">
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold text-foreground">{title}</Label>
                    {images.length > 0 && (
                        <Button 
                            type="button" 
                            variant="default" 
                            size="sm" 
                            onClick={() => openGallery(0)} 
                            className="h-6 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-2"
                        >
                            <ImageIcon className="h-3 w-3 mr-1.5"/> 
                            Galería ({images.length})
                        </Button>
                    )}
                </div>
                {description && name !== "fotosComerciales" && <p className="text-[11px] text-muted-foreground leading-tight">{description}</p>}
            </div>
            
            {instructionFieldName && (
                <FormField control={form.control} name={instructionFieldName} render={({ field }) => (
                    <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{title.includes("Comercial") ? "TEXTO COMERCIAL" : "Instrucciones"}</FormLabel>
                        <FormControl>
                            <Textarea {...field} value={field.value ?? ''} rows={10} placeholder={title.includes("Comercial") ? "Descripción..." : "Instrucciones paso a paso..."} className="resize-none text-sm min-h-[150px]" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            )}

            <div className="bg-muted/30 rounded-lg p-2 border flex-1">
                <ImageManager 
                    images={images} 
                    onUpload={handleUpload} 
                    onReorder={handleReorder} 
                    onDelete={handleDelete} 
                    onSetPrincipal={handleSetPrincipal} 
                    folder={folder} 
                    enableCamera={canUseCamera} 
                    label="Añadir" 
                />
            </div>
            <ImageGalleryModal images={images} initialIndex={initialIndex} isOpen={galleryOpen} onClose={() => setGalleryOpen(false)} />
        </div>
    );
}

// FIX: Tooltip por CLICK
const InfoTooltip = ({ text }: { text: string }) => (
    <Popover>
        <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-4 w-4 p-0 rounded-full hover:bg-transparent"><Info className="h-3.5 w-3.5 text-muted-foreground/70" /></Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 text-xs bg-popover text-popover-foreground shadow-md border"><p>{text}</p></PopoverContent>
    </Popover>
);

const calculateElabAlergenos = (elaboracion: Elaboracion, ingredientesMap: Map<string, IngredienteConERP>): Alergeno[] => {
    if (!elaboracion || !elaboracion.componentes) return [];
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

function CreateElaborationModal({ onElaborationCreated, children }: { onElaborationCreated: (newElab: Elaboracion) => Promise<void>, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const handleSave = async (data: ElaborationFormValues, costePorUnidad: number) => {
        setIsSubmitting(true);
        try {
            const dbData = { nombre: data.nombre, produccion_total: data.produccionTotal, unidad_produccion: data.unidadProduccion, partida: data.partidaProduccion, instrucciones: data.instruccionesPreparacion, fotos_produccion_urls: data.fotos?.map(f => ({ value: f.url })) || [], video_produccion_url: data.videoProduccionURL, formato_expedicion: data.formatoExpedicion, ratio_expedicion: data.ratioExpedicion, tipo_expedicion: data.tipoExpedicion, coste_unitario: costePorUnidad, requiere_revision: false, comentario_revision: '', fecha_revision: new Date().toISOString() };
            const { data: newElab, error } = await supabase.from('elaboraciones').insert([dbData]).select().single();
            if (error) throw error;
            if (newElab && data.componentes && data.componentes.length > 0) {
                const componentesToInsert = data.componentes.map(c => ({ elaboracion_padre_id: newElab.id, tipo_componente: c.tipo === 'ingrediente' ? 'ARTICULO' : 'ELABORACION', componente_id: c.componenteId, cantidad_neta: c.cantidad, merma_aplicada: c.merma }));
                await supabase.from('elaboracion_componentes').insert(componentesToInsert);
            }
            const savedElaboracion: Elaboracion = { ...data, id: newElab.id, costePorUnidad };
            toast({ title: 'Elaboración Creada', description: `Se ha añadido "${data.nombre}" a la base de datos.` });
            await onElaborationCreated(savedElaboracion);
            setIsSubmitting(false);
            setIsOpen(false);
        } catch (e) { console.error(e); toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la elaboración.' }); setIsSubmitting(false); }
    };
    return (<Dialog open={isOpen} onOpenChange={setIsOpen}><DialogTrigger asChild>{children}</DialogTrigger><DialogContent className="max-w-4xl max-h-[90vh] flex flex-col"><DialogHeader><DialogTitle>Nueva Elaboración</DialogTitle></DialogHeader><div className="flex-1 overflow-y-auto -mx-6 px-6"><ElaborationForm initialData={{ id: Date.now().toString(), nombre: '', produccionTotal: 1, unidadProduccion: 'KG', partidaProduccion: 'FRIO', componentes: [], tipoExpedicion: 'REFRIGERADO', formatoExpedicion: '', ratioExpedicion: 0, instruccionesPreparacion: '', videoProduccionURL: '', fotos: [], }} onSave={handleSave} isSubmitting={isSubmitting} /></div></DialogContent></Dialog>);
}

function ElaborationSelector({ allElaboraciones, onSelect }: { allElaboraciones: ElaboracionConCoste[], onSelect: (elab: ElaboracionConCoste) => void }) {
    const [searchTerm, setSearchTerm] = useState('');
    const filtered = allElaboraciones.filter(e => e.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    return (
        <DialogContent className="max-h-[80vh] flex flex-col max-w-2xl">
            <DialogHeader>
                <DialogTitle>Añadir Elaboración</DialogTitle>
            </DialogHeader>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar por nombre..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-9"
                />
            </div>
            <div className="flex-1 overflow-y-auto border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50%]">Nombre</TableHead>
                            <TableHead className="text-right">Coste / Ud</TableHead>
                            <TableHead className="text-right w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length > 0 ? (
                            filtered.map(elab => (
                                <TableRow key={elab.id}>
                                    <TableCell className="font-medium">{elab.nombre}</TableCell>
                                    <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(elab.costePorUnidad)} / {formatUnit(elab.unidadProduccion)}</TableCell>
                                    <TableCell className="text-right">
                                        <DialogClose asChild>
                                            <Button size="sm" onClick={() => onSelect(elab)} className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs">
                                                <PlusCircle className="h-3 w-3 mr-1" /> Añadir
                                            </Button>
                                        </DialogClose>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No se encontraron elaboraciones.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
    );
}

// --- PÁGINA PRINCIPAL ---

const defaultValues: Partial<RecetaFormValues> = {
    id: '', numeroReceta: '', nombre: '', nombre_en: '', visibleParaComerciales: true, isArchived: false, descripcionComercial: '', descripcionComercial_en: '',
    responsableEscandallo: '', categoria: '', estacionalidad: 'MIXTO', tipoDieta: 'NINGUNO', gramajeTotal: 0, porcentajeCosteProduccion: 30, elaboraciones: [],
    menajeAsociado: [], instruccionesMiseEnPlace: '', fotosMiseEnPlace: [], instruccionesRegeneracion: '', fotosRegeneracion: [], instruccionesEmplatado: '',
    fotosEmplatado: [], fotosComerciales: [], perfilSaborPrincipal: undefined, perfilSaborSecundario: [], perfilTextura: [], tipoCocina: [], equipamientoCritico: [],
    formatoServicioIdeal: [], etiquetasTendencia: [], requiereRevision: false, comentarioRevision: '', fechaRevision: '',
};

function RecetaFormPage() {
    const router = useRouter();
    const params = useParams() ?? {};
    const searchParams = useSearchParams() ?? new URLSearchParams();
    const id = (params.id as string) || '';
    const cloneId = searchParams.get('cloneId');
    const isNew = id === 'nueva';
    const isEditing = !isNew && id;

    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const { toast } = useToast();
    const [dbElaboraciones, setDbElaboraciones] = useState<ElaboracionConCoste[]>([]);
    const [dbCategorias, setDbCategorias] = useState<CategoriaReceta[]>([]);
    const [personalOptions, setPersonalOptions] = useState<any[]>([]);
    const [ingredientesMap, setIngredientesMap] = useState<Map<string, IngredienteConERP>>(new Map());
    
    // FIX IPHONE CRASH
    const [canUseCamera, setCanUseCamera] = useState(false);
    useEffect(() => {
        const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.enumerateDevices;
        setCanUseCamera(hasMediaDevices);
    }, []);

    const form = useForm<RecetaFormValues>({
        resolver: zodResolver(recetaFormSchema),
        defaultValues,
    });

    const { fields: elabFields, append: appendElab, remove: removeElab, move: moveElab, replace } = useFieldArray({ control: form.control, name: "elaboraciones", keyName: "key" });
    const watchedElaboraciones = form.watch('elaboraciones');
    const watchedPorcentajeCoste = form.watch('porcentajeCosteProduccion');

    const recalculateCostsAndAllergens = useCallback(async () => {
        const [{ data: ingredientesData }, { data: erpData }, { data: elaboracionesData }, { data: elaboracionComponentesData }] = await Promise.all([
            supabase.from('ingredientes_internos').select('*'), supabase.from('articulos_erp').select('*'), supabase.from('elaboraciones').select('*'), supabase.from('elaboracion_componentes').select('*')
        ]);

        const erpMap = new Map<string, ArticuloERP>();
        (erpData || []).forEach((a: any) => {
             const item = { id: a.id, idreferenciaerp: a.erp_id || a.id_referencia_erp, precioCompra: a.precio_compra, unidadConversion: a.unidad_conversion, descuento: a.descuento } as ArticuloERP;
             if(item.id) erpMap.set(item.id, item); if(item.idreferenciaerp) erpMap.set(item.idreferenciaerp, item);
        });

        const ingMap = new Map((ingredientesData || []).map((i: any) => [i.id, { id: i.id, alergenosPresentes: i.alergenos_presentes, alergenosTrazas: i.alergenos_trazas, erp: erpMap.get(i.producto_erp_link_id) } as IngredienteConERP]));
        setIngredientesMap(ingMap);

        const allElaboraciones: Elaboracion[] = (elaboracionesData || []).map((e: any) => ({
            id: e.id, nombre: e.nombre, produccionTotal: e.produccion_total, unidadProduccion: e.unidad_produccion,
            // FIX: Map missing properties required by Elaboracion interface
            partidaProduccion: e.partida,
            instruccionesPreparacion: e.instrucciones,
            fotosProduccionURLs: e.fotos_produccion_urls || [],
            videoProduccionURL: e.video_produccion_url,
            formatoExpedicion: e.formato_expedicion,
            ratioExpedicion: e.ratio_expedicion,
            tipoExpedicion: e.tipo_expedicion,
            costePorUnidad: e.coste_unitario,
            componentes: (elaboracionComponentesData || []).filter((c: any) => c.elaboracion_padre_id === e.id).map((c: any) => ({
                id: c.id, tipo: c.tipo_componente === 'ARTICULO' ? 'ingrediente' : 'elaboracion', componenteId: c.componente_id, cantidad: c.cantidad_neta, merma: c.merma_aplicada, nombre: '', costePorUnidad: 0
            })),
            requiereRevision: e.requiere_revision,
            comentarioRevision: e.comentario_revision,
            fechaRevision: e.fecha_revision
        }));

        const updatedDbElaboraciones = allElaboraciones.map(e => ({ ...e, costePorUnidad: e.costePorUnidad || 0, alergenos: calculateElabAlergenos(e, ingMap) }));
        setDbElaboraciones(updatedDbElaboraciones);

        const currentFormElabs = form.getValues('elaboraciones');
        const updatedFormElabs = currentFormElabs.map(elab => {
            const match = updatedDbElaboraciones.find(d => d.id === elab.elaboracionId);
            return { ...elab, coste: match?.costePorUnidad || elab.coste, alergenos: match?.alergenos || [] };
        });
        if (JSON.stringify(currentFormElabs) !== JSON.stringify(updatedFormElabs)) replace(updatedFormElabs);
    }, [form, replace]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsDataLoaded(false);
                
                const [pRes, cRes] = await Promise.all([
                    supabase.from('personal').select('*'),
                    supabase.from('categorias_recetas').select('*').order('nombre')
                ]);
                
                const cpr = (pRes.data || []).filter((p: any) => p.departamento === 'CPR');
                setPersonalOptions(cpr);
                setDbCategorias(cRes.data || []);

                const currentId = isEditing ? id : cloneId;
                if (currentId) {
                    const { data: r, error } = await supabase.from('recetas').select('*').eq('id', currentId).single();
                    if (error || !r) { toast({ variant: 'destructive', title: 'Error', description: 'Receta no encontrada' }); router.push('/book/recetas'); return; }
                    
                    if (cloneId) { r.id = Date.now().toString(); r.nombre = `${r.nombre} (Copia)`; }
                    const procImg = (imgs: any[]) => (!imgs ? [] : imgs.map((img, i) => typeof img === 'string' ? { id: `img-${i}`, url: img, esPrincipal: i===0, orden: i } : (img.value ? { id: `img-${i}`, url: img.value, esPrincipal: i===0, orden: i } : img)));

                    let newNum = r.numero_receta;
                    if (cloneId) {
                        const { data: last } = await supabase.from('recetas').select('numero_receta').order('numero_receta', { ascending: false }).limit(1);
                        const n = last?.[0]?.numero_receta ? parseInt(last[0].numero_receta.split('-')[1]) : 0;
                        newNum = `R-${(n + 1).toString().padStart(4, '0')}`;
                    }

                    const formData: RecetaFormValues = {
                        id: cloneId ? Date.now().toString() : r.id,
                        numeroReceta: cloneId ? newNum : r.numero_receta,
                        nombre: r.nombre || '',
                        nombre_en: r.nombre_en || '',
                        visibleParaComerciales: r.visible_para_comerciales ?? true,
                        isArchived: r.is_archived ?? false,
                        descripcionComercial: r.descripcion_comercial || '',
                        descripcionComercial_en: r.descripcion_comercial_en || '',
                        responsableEscandallo: r.responsable_escandallo || '',
                        categoria: r.categoria || '',
                        partidaProduccion: r.partida_produccion || '',
                        gramajeTotal: r.gramaje_total || 0,
                        estacionalidad: r.estacionalidad || 'MIXTO',
                        tipoDieta: r.tipo_dieta || 'NINGUNO',
                        porcentajeCosteProduccion: r.porcentaje_coste_produccion || 30,
                        elaboraciones: r.elaboraciones || [],
                        menajeAsociado: r.menaje_asociado || [],
                        instruccionesMiseEnPlace: r.instrucciones_mise_en_place || '',
                        fotosMiseEnPlace: procImg(r.fotos_mise_en_place),
                        instruccionesRegeneracion: r.instrucciones_regeneracion || '',
                        fotosRegeneracion: procImg(r.fotos_regeneracion),
                        instruccionesEmplatado: r.instrucciones_emplatado || '',
                        fotosEmplatado: procImg(r.fotos_emplatado),
                        fotosComerciales: procImg(r.fotos_comerciales),
                        perfilSaborPrincipal: r.perfil_sabor_principal || undefined, 
                        perfilSaborSecundario: r.perfil_sabor_secundario || [],
                        perfilTextura: r.perfil_textura || [],
                        tipoCocina: r.tipo_cocina || [],
                        recetaOrigen: r.receta_origen || '',
                        temperaturaServicio: r.temperatura_servicio || undefined,
                        tecnicaCoccionPrincipal: r.tecnica_coccion_principal || undefined,
                        potencialMiseEnPlace: r.potencial_mise_en_place || undefined,
                        formatoServicioIdeal: r.formato_servicio_ideal || [],
                        equipamientoCritico: r.equipamiento_critico || [],
                        dificultadProduccion: r.dificultad_produccion || 3,
                        estabilidadBuffet: r.estabilidad_buffet || 3,
                        escalabilidad: r.escalabilidad || undefined,
                        etiquetasTendencia: r.etiquetas_tendencia || [],
                        requiereRevision: r.requiere_revision ?? false,
                        comentarioRevision: r.comentario_revision || '',
                        fechaRevision: r.fecha_revision || '',
                    };

                    form.reset(formData);
                    await recalculateCostsAndAllergens();
                } else if (isNew) {
                    const { data: last } = await supabase.from('recetas').select('numero_receta').order('numero_receta', { ascending: false }).limit(1);
                    const n = last?.[0]?.numero_receta ? parseInt(last[0].numero_receta.split('-')[1]) : 0;
                    form.reset({ ...defaultValues, id: Date.now().toString(), numeroReceta: `R-${(n + 1).toString().padStart(4, '0')}` } as RecetaFormValues);
                }
            } catch (e) { console.error(e); } finally { setIsDataLoaded(true); }
        };
        loadData();
    }, [id, cloneId, isNew, isEditing, form, router, toast, recalculateCostsAndAllergens]);

    const { costeMateriaPrima, alergenos, partidasProduccion } = useMemo(() => {
        let coste = 0;
        const allAlergenos = new Set<Alergeno>();
        const allPartidas = new Set<PartidaProduccion>();
        (watchedElaboraciones || []).forEach(elab => {
            coste += (elab.coste || 0) * (1 + (elab.merma || 0) / 100) * elab.cantidad;
            const dbE = dbElaboraciones.find(d => d.id === elab.elaboracionId);
            (dbE?.alergenos || []).forEach(a => allAlergenos.add(a));
            if (dbE?.partidaProduccion) allPartidas.add(dbE.partidaProduccion);
        });
        return { costeMateriaPrima: coste, alergenos: Array.from(allAlergenos), partidasProduccion: Array.from(allPartidas) };
    }, [watchedElaboraciones, dbElaboraciones]);

    const pvpTeorico = costeMateriaPrima + (costeMateriaPrima * ((watchedPorcentajeCoste || 0) / 100));

    const onAddElab = useCallback((elab: ElaboracionConCoste) => {
        appendElab({ id: `${elab.id}-${Date.now()}`, elaboracionId: elab.id, nombre: elab.nombre, cantidad: 1, coste: elab.costePorUnidad || 0, gramaje: elab.produccionTotal || 0, alergenos: elab.alergenos || [], unidad: elab.unidadProduccion, merma: 0 });
        setIsSelectorOpen(false);
    }, [appendElab]);

    const handleElaborationCreated = async (newElab: Elaboracion) => {
        recalculateCostsAndAllergens();
        const elabWithData: ElaboracionConCoste = { ...newElab, costePorUnidad: newElab.costePorUnidad || 0, alergenos: calculateElabAlergenos(newElab, ingredientesMap) };
        onAddElab(elabWithData);
    };

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) moveElab(elabFields.findIndex(f => f.id === active.id), elabFields.findIndex(f => f.id === over.id));
    }

    const onSubmit = async (data: RecetaFormValues) => {
        setIsLoading(true);
        try {
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
                // FIX: Access properties correctly in camelCase
                requiere_revision: data.requiereRevision,
                comentario_revision: data.comentarioRevision, 
                fecha_revision: data.fechaRevision || null, 
                coste_materia_prima: costeMateriaPrima, 
                precio_venta: pvpTeorico, 
                alergenos: alergenos,
                partida_produccion: partidasProduccion.join(', ')
            };

            const { error } = isEditing && !cloneId ? await supabase.from('recetas').update(dataToSave).eq('id', id) : await supabase.from('recetas').insert([dataToSave]);
            if (error) throw error;
            toast({ description: 'Receta guardada correctamente.' });
            if (!isEditing || cloneId) router.push('/book/recetas'); else router.replace(`/book/recetas/${id}?t=${Date.now()}`);
        } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); } finally { setIsLoading(false); }
    };

    const handleDelete = async () => {
        try { await supabase.from('recetas').delete().eq('id', id); toast({ title: 'Receta eliminada' }); router.push('/book/recetas'); } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
    };

    if (!isDataLoaded) return <LoadingSkeleton title="Cargando receta..." />;

    return (
        <TooltipProvider>
            <main className="pb-24 bg-background min-h-screen">
                <FormProvider {...form}>
                    <form id="receta-form" onSubmit={form.handleSubmit(onSubmit)}>
                        
                        {/* HEADER STICKY (SOLO TABS) */}
                        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm pt-2">
                            <Tabs defaultValue="general" className="w-full">
                                
                                {/* PESTAÑAS (MÓVIL: Grid 2x2 - DESKTOP: Fila) */}
                                <div className="px-2 pb-2">
                                    <TabsList className="
                                        w-full 
                                        grid grid-cols-2 grid-rows-2 h-auto gap-2 
                                        md:flex md:flex-row md:justify-start md:h-10 md:bg-transparent md:p-0 md:gap-4 md:mb-0
                                    ">
                                        {["Info. General", "Receta", "Info. Pase", "Gastronómica"].map((tab, i) => {
                                            const val = ["general", "receta", "pase", "gastronomica"][i];
                                            return (
                                                <TabsTrigger 
                                                    key={val} 
                                                    value={val} 
                                                    className="
                                                        rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-xs font-medium text-muted-foreground shadow-sm 
                                                        data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:border-transparent 
                                                        md:rounded-none md:border-b-2 md:border-transparent md:bg-transparent md:px-1 md:py-2 md:text-sm md:shadow-none 
                                                        md:data-[state=active]:bg-transparent md:data-[state=active]:text-green-700 md:data-[state=active]:border-green-600 
                                                        transition-all whitespace-nowrap
                                                    "
                                                >
                                                    {tab}
                                                </TabsTrigger>
                                            )
                                        })}
                                    </TabsList>
                                </div>
                                
                                {/* CONTENIDO DE TABS */}
                                <div className="p-2 sm:p-4 max-w-7xl mx-auto min-h-screen bg-muted/5">
                                    
                                    {/* --- TAB: GENERAL --- */}
                                    <TabsContent value="general" className="space-y-3 mt-1">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <Card className="shadow-none border border-border/60">
                                                    <CardContent className="p-3 space-y-2">
                                                        <FormField control={form.control} name="nombre" render={({ field }) => (<FormItem className="space-y-0.5"><FormLabel className="text-[10px] uppercase text-muted-foreground font-bold">Nombre Receta</FormLabel><FormControl><Input {...field} value={field.value ?? ''} className="h-8 text-sm" /></FormControl><FormMessage /></FormItem>)} />
                                                        
                                                        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                                                            <FormField control={form.control} name="responsableEscandallo" render={({ field }) => (
                                                                <FormItem className="space-y-0.5">
                                                                    <FormLabel className="text-[10px] uppercase text-muted-foreground font-bold">Responsable</FormLabel>
                                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                                        <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger></FormControl>
                                                                        <SelectContent>{personalOptions.map((p: any) => (<SelectItem key={p.id} value={p.nombre_compacto || p.nombre}>{p.nombre_compacto || p.nombre}</SelectItem>))}</SelectContent>
                                                                    </Select>
                                                                </FormItem>
                                                            )} />

                                                            <FormField control={form.control} name="categoria" render={({ field }) => (
                                                                <FormItem className="space-y-0.5">
                                                                    <FormLabel className="text-[10px] uppercase text-muted-foreground font-bold">Categoría</FormLabel>
                                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                                        <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger></FormControl>
                                                                        <SelectContent>{dbCategorias.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}</SelectContent>
                                                                    </Select>
                                                                </FormItem>
                                                            )} />
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <Card className="shadow-none border border-border/60">
                                                    <CardContent className="p-3 grid gap-2">
                                                        <div className="flex items-center justify-between border p-2 rounded-md bg-card">
                                                            <Label htmlFor="visible-sw" className="flex items-center gap-2 font-medium text-xs"><Eye className="h-3.5 w-3.5" /> Visible</Label>
                                                            <FormField control={form.control} name="visibleParaComerciales" render={({ field }) => <Switch id="visible-sw" checked={field.value} onCheckedChange={field.onChange} className="scale-75 origin-right" />} />
                                                        </div>
                                                        <div className="flex items-center justify-between border p-2 rounded-md bg-card">
                                                            <Label htmlFor="archived-sw" className="flex items-center gap-2 font-medium text-xs"><Archive className="h-3.5 w-3.5" /> Archivado</Label>
                                                            <FormField control={form.control} name="isArchived" render={({ field }) => <Switch id="archived-sw" checked={field.value} onCheckedChange={field.onChange} className="scale-75 origin-right" />} />
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            <Card className="shadow-none border border-border/60 h-fit">
                                                <CardContent className="p-3">
                                                    <RecipeImageSection name="fotosComerciales" title="Foto Comercial" folder="recetas/comercial" form={form} canUseCamera={canUseCamera} description="Principal para catálogos." instructionFieldName="descripcionComercial" />
                                                </CardContent>
                                            </Card>

                                            {/* ZONA DE PELIGRO: BOTÓN BORRAR AL FINAL DE INFO GENERAL */}
                                            {isEditing && (
                                                <div className="mt-4 pt-4 border-t border-dashed">
                                                    <Card className="border-destructive/30 bg-destructive/5 shadow-none">
                                                        <CardContent className="p-3 flex justify-between items-center">
                                                            <span className="text-xs text-destructive font-medium">Eliminar esta receta permanentemente</span>
                                                            <Button 
                                                                variant="ghost" 
                                                                type="button" 
                                                                onClick={() => setShowDeleteConfirm(true)} 
                                                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>

                                    {/* --- TAB: RECETA (ORDEN CORREGIDO) --- */}
                                    <TabsContent value="receta" className="mt-1 space-y-3">
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                                            
                                            {/* LISTA ELABORACIONES (75% en Desktop) */}
                                            <div className="lg:col-span-9 order-2 lg:order-1 space-y-4">
                                                <Card className="shadow-none border border-border/60">
                                                    <CardHeader className="p-2 pb-1 flex flex-row items-center justify-between bg-muted/10 border-b">
                                                        <CardTitle className="text-sm font-bold">Elaboraciones</CardTitle>
                                                        <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                                                            <DialogTrigger asChild><Button variant="outline" size="sm" className="h-6 text-xs px-2 bg-background"><PlusCircle className="h-3 w-3 mr-1" /> Añadir</Button></DialogTrigger>
                                                            <ElaborationSelector allElaboraciones={dbElaboraciones} onSelect={onAddElab} />
                                                        </Dialog>
                                                    </CardHeader>
                                                    <CardContent className="p-0 sm:p-2">
                                                        {/* Vista Móvil (Cards) */}
                                                        <div className="md:hidden space-y-1 p-1">
                                                            {elabFields.map((field, index) => {
                                                                const costeTotal = ((field.coste || 0) * (1 + (field.merma || 0) / 100)) * (form.watch(`elaboraciones.${index}.cantidad`) || 0);
                                                                return (
                                                                    <div key={field.id} className="bg-background border rounded-md p-2.5 relative flex flex-col gap-2">
                                                                        <div className="flex justify-between items-start pr-8">
                                                                            <span className="font-medium text-sm leading-snug text-foreground">{field.nombre}</span>
                                                                            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{formatCurrency(field.coste)}/u</span>
                                                                        </div>
                                                                        <div className="grid grid-cols-3 gap-2 items-center bg-muted/20 p-1.5 rounded">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[9px] text-muted-foreground uppercase block font-bold mb-0.5">Cant.</span>
                                                                                <div className="flex items-center gap-1">
                                                                                    <FormField control={form.control} name={`elaboraciones.${index}.cantidad`} render={({ field: f }) => (
                                                                                        <FormControl><Input type="number" {...f} value={f.value ?? ''} className="h-7 w-full text-center text-sm px-1 bg-white" /></FormControl>
                                                                                    )} />
                                                                                    <span className="text-[10px] text-muted-foreground">{formatUnit(field.unidad)}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[9px] text-muted-foreground uppercase block font-bold mb-0.5">Merma %</span>
                                                                                <FormField control={form.control} name={`elaboraciones.${index}.merma`} render={({ field: f }) => (
                                                                                    <FormControl><Input type="number" {...f} value={f.value ?? ''} className="h-7 w-full text-center text-sm px-1 bg-white" /></FormControl>
                                                                                )} />
                                                                            </div>
                                                                            <div className="text-right pl-2 border-l">
                                                                                <span className="text-[9px] text-muted-foreground block uppercase font-bold mb-0.5">Total</span>
                                                                                <span className="font-bold text-sm text-foreground">{formatCurrency(costeTotal)}</span>
                                                                            </div>
                                                                        </div>
                                                                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeElab(index)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                                    </div>
                                                                )
                                                            })}
                                                            {elabFields.length === 0 && <div className="text-center py-8 text-muted-foreground text-xs bg-muted/10 rounded-lg border-dashed border">No hay elaboraciones añadidas</div>}
                                                        </div>

                                                        {/* VISTA DESKTOP (Tabla) */}
                                                        <div className="hidden md:block overflow-x-auto">
                                                            <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead className="w-8"></TableHead>
                                                                            <TableHead>Elaboración</TableHead>
                                                                            <TableHead className="w-32 text-center">Cant.</TableHead>
                                                                            <TableHead className="w-20 text-center">Merma %</TableHead>
                                                                            <TableHead className="w-24 text-right">Coste</TableHead>
                                                                            <TableHead className="w-8"></TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <SortableContext items={elabFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                                                        <TableBody>
                                                                            {elabFields.map((field, index) => (
                                                                                <SortableTableRow key={field.key} field={{ ...field, key: field.key }} index={index} remove={removeElab} form={form} />
                                                                            ))}
                                                                            {elabFields.length === 0 && (
                                                                                <TableRow>
                                                                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No hay elaboraciones añadidas. Pulsa "Añadir" para comenzar.</TableCell>
                                                                                </TableRow>
                                                                            )}
                                                                        </TableBody>
                                                                    </SortableContext>
                                                                </Table>
                                                            </DndContext>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            {/* COSTES (25% Sticky derecha en Desktop) */}
                                            <div className="lg:col-span-3 order-1 lg:order-2 lg:sticky lg:top-36">
                                                <Card className="border-l-4 border-l-green-600 shadow-sm rounded-r-lg rounded-l-none">
                                                    <CardContent className="p-3 bg-card flex flex-col gap-0">
                                                        {/* Fila 1: Coste MP y Margen (50/50) */}
                                                        <div className="flex w-full mb-3">
                                                            <div className="w-1/2 pr-2 border-r">
                                                                <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Coste mp</span>
                                                                <span className="font-mono text-lg font-medium text-foreground">{formatCurrency(costeMateriaPrima)}</span>
                                                            </div>
                                                            <div className="w-1/2 pl-3 flex flex-col justify-between">
                                                                <span className="text-[10px] text-muted-foreground uppercase font-medium block mb-1">Margen CPR</span>
                                                                <FormField control={form.control} name="porcentajeCosteProduccion" render={({ field }) => (
                                                                    <div className="flex items-center gap-1">
                                                                        <Input type="number" {...field} value={field.value ?? 0} className="h-7 w-full text-right px-2 text-sm bg-background border rounded-md" />
                                                                        <span className="text-sm text-muted-foreground font-medium">%</span>
                                                                    </div>
                                                                )} />
                                                            </div>
                                                        </div>

                                                        <Separator className="mb-3"/>

                                                        {/* Fila 2: PVP (Grande y Negrita) */}
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-xs text-muted-foreground font-bold uppercase mb-1">Precio venta Catering</span>
                                                            <span className="font-bold text-2xl text-green-700 leading-none">{formatCurrency(pvpTeorico)}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                                
                                                {/* ALÉRGENOS (Debajo de costes en Desktop) */}
                                                {alergenos.length > 0 && (
                                                    <Card className="shadow-sm border border-red-200 bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/20 mt-4">
                                                        <CardHeader className="p-2 pb-1">
                                                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700 dark:text-red-400">
                                                                <AlertTriangle className="h-4 w-4" /> Alérgenos Totales
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="p-2 flex flex-wrap gap-1.5 pt-0">
                                                            {alergenos.map(a => <AllergenBadge key={a} allergen={a as Alergeno} />)}
                                                        </CardContent>
                                                    </Card>
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* --- TAB: PASE --- */}
                                    <TabsContent value="pase" className="space-y-4 mt-1">
                                        <div className="grid grid-cols-1 gap-4">
                                            {/* CADA FASE OCUPA UNA LÍNEA ENTERA (1 COLUMNA) PARA MAYOR VISIBILIDAD */}
                                            <Card className="shadow-none border border-border/60"><CardContent className="p-3"><RecipeImageSection name="fotosMiseEnPlace" title="Mise en Place" folder="recetas/MEP" form={form} canUseCamera={canUseCamera} instructionFieldName="instruccionesMiseEnPlace" /></CardContent></Card>
                                            <Card className="shadow-none border border-border/60"><CardContent className="p-3"><RecipeImageSection name="fotosRegeneracion" title="Regeneración" folder="recetas/regeneracion" form={form} canUseCamera={canUseCamera} instructionFieldName="instruccionesRegeneracion" /></CardContent></Card>
                                            <Card className="shadow-none border border-border/60"><CardContent className="p-3"><RecipeImageSection name="fotosEmplatado" title="Emplatado" folder="recetas/emplatado" form={form} canUseCamera={canUseCamera} instructionFieldName="instruccionesEmplatado" /></CardContent></Card>
                                        </div>
                                    </TabsContent>

                                    {/* --- TAB: GASTRONÓMICA --- */}
                                    <TabsContent value="gastronomica" className="mt-1">
                                        <Card className="shadow-none border border-border/60">
                                            <CardHeader className="p-2 pb-1"><CardTitle className="text-sm font-bold flex items-center gap-2"><BrainCircuit className="h-4 w-4" /> Clasificación Técnica</CardTitle></CardHeader>
                                            <CardContent className="p-2">
                                                {/* GRID 4 COLUMNAS EN DESKTOP */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <FormField control={form.control} name="perfilSaborPrincipal" render={({ field }) => (
                                                        <FormItem className="space-y-0.5"><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">Sabor Princ. <InfoTooltip text="Sabor dominante del plato." /></FormLabel><Select onValueChange={field.onChange} value={field.value ?? undefined}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger></FormControl><SelectContent>{SABORES_PRINCIPALES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>
                                                    )} />
                                                    
                                                    <FormField control={form.control} name="perfilSaborSecundario" render={({ field }) => (<FormItem className="space-y-0.5"><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">Sabores Sec. <InfoTooltip text="Matices secundarios." /></FormLabel><MultiSelect options={['Picante', 'Ahumado', 'Cítrico', 'Herbáceo'].map(s => ({ label: s, value: s }))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..." /></FormItem>)} />
                                                    <FormField control={form.control} name="perfilTextura" render={({ field }) => (<FormItem className="space-y-0.5"><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">Texturas <InfoTooltip text="Sensación en boca." /></FormLabel><MultiSelect options={['Crujiente', 'Cremoso', 'Meloso', 'Gelatinoso'].map(s => ({ label: s, value: s }))} selected={field.value || []} onChange={field.onChange} placeholder="Seleccionar..." /></FormItem>)} />
                                                    <FormField control={form.control} name="temperaturaServicio" render={({ field }) => (<FormItem className="space-y-0.5"><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">Temp. Servicio <InfoTooltip text="Temperatura ideal." /></FormLabel><Select onValueChange={field.onChange} value={field.value ?? undefined}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger></FormControl><SelectContent>{['CALIENTE', 'TIBIO', 'AMBIENTE', 'FRIO', 'HELADO'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                                </div>
                                                
                                                <Separator className="my-3"/>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="dificultadProduccion" render={({ field }) => (
                                                        <FormItem>
                                                            <div className="flex justify-between mb-1"><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Dificultad</FormLabel><span className="text-xs font-mono font-bold bg-muted px-1.5 rounded">{field.value} / 5</span></div>
                                                            <FormControl><Slider min={1} max={5} step={1} value={[field.value ?? 3]} onValueChange={(vals) => field.onChange(vals[0])} /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name="estabilidadBuffet" render={({ field }) => (
                                                        <FormItem>
                                                            <div className="flex justify-between mb-1"><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Estabilidad</FormLabel><span className="text-xs font-mono font-bold bg-muted px-1.5 rounded">{field.value} / 5</span></div>
                                                            <FormControl><Slider min={1} max={5} step={1} value={[field.value ?? 3]} onValueChange={(vals) => field.onChange(vals[0])} /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    </form>
                </FormProvider>
            </main>
            
            {/* BOTÓN DE GUARDAR FLOTANTE (FAB) - SIEMPRE VISIBLE */}
            <div className="fixed bottom-6 right-6 z-50">
                <Button 
                    type="submit" 
                    form="receta-form" 
                    disabled={isLoading} 
                    className="rounded-full shadow-lg h-14 w-14 bg-green-600 hover:bg-green-700 text-white border-2 border-white flex flex-col items-center justify-center p-0 transition-transform hover:scale-105 active:scale-95"
                >
                    {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : <Save className="h-6 w-6" />}
                </Button>
            </div>

            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>¿Eliminar receta?</AlertDialogTitle><AlertDialogDescription>Esta acción es irreversible.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </TooltipProvider>
    );
}

export default function RecetaPage() {
    const params = useParams() ?? {};
    const isNew = (params.id === 'nueva') || ((params.id as any)?.[0] === 'nueva');
    // PADDING INFERIOR EXTRA PARA LOS BOTONES FLOTANTES
    if (isNew) return <main className="p-0 bg-background"><RecetaFormPage /></main>;
    return <main className="p-0 bg-background"><RecetaFormPage /></main>;
}