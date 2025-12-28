'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
    Loader2, Save, X, Info, PlusCircle, GripVertical, 
    Trash2, Eye, Component, Archive, BrainCircuit, AlertTriangle, 
    Maximize2, Image as ImageIcon, ChevronLeft, ChevronRight, Search, RefreshCw
} from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { MultiSelect } from '@/components/ui/multi-select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { formatCurrency, formatUnit, cn } from '@/lib/utils';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { ImageManager } from '@/components/book/images/ImageManager';
import { ElaborationForm, type ElaborationFormValues } from '@/components/book/elaboration-form';
import { useUpsertElaboracion } from '@/hooks/use-data-queries';

import type { 
    Receta, Elaboracion, IngredienteInterno, ArticuloERP, 
    Alergeno, CategoriaReceta, PartidaProduccion, ElaboracionEnReceta,
    ImagenReceta
} from '@/types';
import { SABORES_PRINCIPALES, ALERGENOS, UNIDADES_MEDIDA, TECNICAS_COCCION } from '@/types';

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

export type RecetaFormValues = z.infer<typeof recetaFormSchema>;

interface RecetaFormProps {
    initialData: RecetaFormValues;
    onSave: (data: RecetaFormValues, extra: { costeMateriaPrima: number; pvpTeorico: number; alergenos: Alergeno[]; partidasProduccion: string }) => Promise<void>;
    isSubmitting: boolean;
    dbElaboraciones: Elaboracion[];
    dbCategorias: CategoriaReceta[];
    personalOptions: any[];
    ingredientesMap: Map<string, any>;
}

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
                <DialogDescription className="sr-only">
                    Visualización de imágenes de la receta.
                </DialogDescription>
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

const InfoTooltip = ({ text }: { text: string }) => (
    <Popover>
        <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-4 w-4 p-0 rounded-full hover:bg-transparent"><Info className="h-3.5 w-3.5 text-muted-foreground/70" /></Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 text-xs bg-popover text-popover-foreground shadow-md border"><p>{text}</p></PopoverContent>
    </Popover>
);

export function RecetaForm({ 
    initialData, 
    onSave, 
    isSubmitting, 
    dbElaboraciones = [], 
    dbCategorias = [], 
    personalOptions = [],
    ingredientesMap = new Map()
}: RecetaFormProps) {
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [canUseCamera, setCanUseCamera] = useState(false);
    const upsertElab = useUpsertElaboracion();

    useEffect(() => {
        const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.enumerateDevices;
        setCanUseCamera(hasMediaDevices);
    }, []);

    const form = useForm<RecetaFormValues>({
        resolver: zodResolver(recetaFormSchema),
        defaultValues: initialData,
    });

    const { fields: elabFields, append: appendElab, remove: removeElab, move: moveElab } = useFieldArray({ 
        control: form.control, 
        name: "elaboraciones", 
        keyName: "key" 
    });

    const watchedElaboraciones = form.watch('elaboraciones');
    const watchedPorcentajeCoste = form.watch('porcentajeCosteProduccion');

    const { costeMateriaPrima, alergenos, partidasProduccion } = useMemo(() => {
        let coste = 0;
        const allAlergenos = new Set<Alergeno>();
        const allPartidas = new Set<PartidaProduccion>();
        (watchedElaboraciones || []).forEach(elab => {
            coste += (elab.coste || 0) * (1 + (elab.merma || 0) / 100) * elab.cantidad;
            const dbE = (dbElaboraciones || []).find(d => d.id === elab.elaboracionId);
            (dbE?.alergenos || []).forEach(a => allAlergenos.add(a));
            if (dbE?.partidaProduccion) allPartidas.add(dbE.partidaProduccion as PartidaProduccion);
        });
        return { 
            costeMateriaPrima: coste, 
            alergenos: Array.from(allAlergenos), 
            partidasProduccion: Array.from(allPartidas).join(', ') 
        };
    }, [watchedElaboraciones, dbElaboraciones]);

    const pvpTeorico = costeMateriaPrima + (costeMateriaPrima * ((watchedPorcentajeCoste || 0) / 100));

    const onAddElab = useCallback((elab: Elaboracion) => {
        appendElab({ 
            id: `${elab.id}-${Date.now()}`, 
            elaboracionId: elab.id, 
            nombre: elab.nombre, 
            cantidad: 1, 
            coste: elab.costePorUnidad || 0, 
            gramaje: elab.produccionTotal || 0, 
            alergenos: elab.alergenos || [], 
            unidad: elab.unidadProduccion, 
            merma: 0 
        });
        setIsSelectorOpen(false);
    }, [appendElab]);

    const handleElaborationCreated = async (data: ElaborationFormValues, costePorUnidad: number) => {
        try {
            const result = await upsertElab.mutateAsync({
                ...data,
                isEditing: false,
                coste_unitario: costePorUnidad
            });
            if (result) {
                onAddElab(result as unknown as Elaboracion);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            moveElab(elabFields.findIndex(f => f.id === active.id), elabFields.findIndex(f => f.id === over.id));
        }
    }

    const handleSubmit = async (data: RecetaFormValues) => {
        await onSave(data, { 
            costeMateriaPrima, 
            pvpTeorico, 
            alergenos, 
            partidasProduccion 
        });
    };

    return (
        <TooltipProvider>
            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background/95 backdrop-blur sticky top-0 z-30 pb-4 border-b">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-2xl font-bold tracking-tight">{form.watch('nombre') || 'Nueva Receta'}</h1>
                                <Badge variant="outline" className="font-mono text-[10px]">{form.watch('numeroReceta')}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">Gestión integral de escandallo, procesos y ficha técnica.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white shadow-md">
                                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Guardar Receta
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 space-y-6">
                            <Card>
                                <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Info className="h-5 w-5 text-primary" /> Información General</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="nombre" render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Nombre de la Receta</FormLabel>
                                            <FormControl><Input {...field} placeholder="Ej: Carrillera de Ternera al Vino Tinto" className="text-lg font-medium" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="categoria" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Categoría</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                                <SelectContent>{dbCategorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="responsableEscandallo" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Responsable Escandallo</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                                <SelectContent>{personalOptions.map(p => <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>

                            <Tabs defaultValue="escandallo" className="w-full">
                                <TabsList className="grid w-full grid-cols-3 h-12 p-1 bg-muted/50">
                                    <TabsTrigger value="escandallo" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Escandallo</TabsTrigger>
                                    <TabsTrigger value="pase" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Pase y MEP</TabsTrigger>
                                    <TabsTrigger value="gastronomica" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Ficha Gastronómica</TabsTrigger>
                                </TabsList>

                                <TabsContent value="escandallo" className="mt-4 space-y-4">
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between py-3">
                                            <CardTitle className="text-base font-bold">Elaboraciones Base</CardTitle>
                                            <div className="flex gap-2">
                                                <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                                                    <DialogTrigger asChild><Button type="button" size="sm" variant="outline" className="h-8"><PlusCircle className="h-4 w-4 mr-2" /> Añadir</Button></DialogTrigger>
                                                    <ElaborationSelector allElaboraciones={dbElaboraciones as any} onSelect={onAddElab} />
                                                </Dialog>
                                                <Dialog>
                                                    <DialogTrigger asChild><Button type="button" size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white"><PlusCircle className="h-4 w-4 mr-2" /> Crear Nueva</Button></DialogTrigger>
                                                    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                                                        <DialogHeader>
                                                            <DialogTitle>Nueva Elaboración</DialogTitle>
                                                            <DialogDescription>
                                                                Crea una nueva sub-receta o elaboración para añadir a este plato.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="flex-1 overflow-y-auto -mx-6 px-6">
                                                            <ElaborationForm 
                                                                initialData={{ 
                                                                    id: Date.now().toString(), 
                                                                    nombre: '', 
                                                                    produccionTotal: 1, 
                                                                    unidadProduccion: 'KG', 
                                                                    partidaProduccion: 'FRIO', 
                                                                    componentes: [], 
                                                                    tipoExpedicion: 'REFRIGERADO', 
                                                                    formatoExpedicion: '', 
                                                                    ratioExpedicion: 0, 
                                                                    instruccionesPreparacion: '', 
                                                                    videoProduccionURL: '', 
                                                                    fotos: [], 
                                                                }} 
                                                                onSave={handleElaborationCreated} 
                                                                isSubmitting={upsertElab.isPending} 
                                                            />
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="overflow-x-auto">
                                                <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                                                    <Table>
                                                        <TableHeader className="bg-muted/30">
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
                                                                    <SortableTableRow key={field.key} field={{ ...field, key: field.key } as any} index={index} remove={removeElab} form={form} />
                                                                ))}
                                                                {elabFields.length === 0 && (
                                                                    <TableRow>
                                                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm italic">No hay elaboraciones añadidas.</TableCell>
                                                                    </TableRow>
                                                                )}
                                                            </TableBody>
                                                        </SortableContext>
                                                    </Table>
                                                </DndContext>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="pase" className="mt-4 space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <Card><CardContent className="p-4"><RecipeImageSection name="fotosMiseEnPlace" title="Mise en Place" folder="recetas/MEP" form={form} canUseCamera={canUseCamera} instructionFieldName="instruccionesMiseEnPlace" /></CardContent></Card>
                                        <Card><CardContent className="p-4"><RecipeImageSection name="fotosRegeneracion" title="Regeneración" folder="recetas/regeneracion" form={form} canUseCamera={canUseCamera} instructionFieldName="instruccionesRegeneracion" /></CardContent></Card>
                                        <Card><CardContent className="p-4"><RecipeImageSection name="fotosEmplatado" title="Emplatado" folder="recetas/emplatado" form={form} canUseCamera={canUseCamera} instructionFieldName="instruccionesEmplatado" /></CardContent></Card>
                                    </div>
                                </TabsContent>

                                <TabsContent value="gastronomica" className="mt-4 space-y-4">
                                    <Card>
                                        <CardHeader><CardTitle className="text-base">Perfil Sensorial y Técnico</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <FormField control={form.control} name="perfilSaborPrincipal" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Sabor Principal</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                                            <SelectContent>{SABORES_PRINCIPALES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="perfilSaborSecundario" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Sabores Secundarios</FormLabel>
                                                        <MultiSelect 
                                                            options={SABORES_PRINCIPALES.map(s => ({ label: s, value: s }))} 
                                                            onChange={field.onChange} 
                                                            selected={field.value || []} 
                                                            placeholder="Seleccionar..." 
                                                        />
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <div className="space-y-4">
                                                <FormField control={form.control} name="tecnicaCoccionPrincipal" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Técnica de Cocción</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                                            <SelectContent>{TECNICAS_COCCION.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="tipoDieta" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Tipo de Dieta</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="NINGUNO">Estándar</SelectItem>
                                                                <SelectItem value="VEGETARIANO">Vegetariano</SelectItem>
                                                                <SelectItem value="VEGANO">Vegano</SelectItem>
                                                                <SelectItem value="AMBOS">Ambos</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader><CardTitle className="text-base">Fotos Comerciales</CardTitle></CardHeader>
                                        <CardContent>
                                            <RecipeImageSection name="fotosComerciales" title="Galería Comercial" folder="recetas/comercial" form={form} canUseCamera={canUseCamera} instructionFieldName="descripcionComercial" />
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </div>

                        <div className="lg:col-span-4 space-y-6">
                            <Card className="border-l-4 border-l-green-600 shadow-md">
                                <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Resumen Económico</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Coste Materia Prima</span>
                                        <span className="text-lg font-mono font-bold">{formatCurrency(costeMateriaPrima)}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Margen Producción (%)</span>
                                            <FormField control={form.control} name="porcentajeCosteProduccion" render={({ field }) => (
                                                <Input type="number" {...field} className="w-20 h-8 text-right" />
                                            )} />
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-end pt-2">
                                        <span className="text-sm font-bold text-primary uppercase">PVP Sugerido</span>
                                        <span className="text-3xl font-bold text-green-700 leading-none">{formatCurrency(pvpTeorico)}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {alergenos.length > 0 && (
                                <Card className="border-red-100 bg-red-50/30 dark:bg-red-950/10">
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700"><AlertTriangle className="h-4 w-4" /> Alérgenos Totales</CardTitle></CardHeader>
                                    <CardContent className="flex flex-wrap gap-1.5">
                                        {alergenos.map(a => <AllergenBadge key={a} allergen={a} />)}
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader><CardTitle className="text-sm font-bold">Configuración de Visibilidad</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="visibleParaComerciales" render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5">
                                                <FormLabel>Visible para Comerciales</FormLabel>
                                                <p className="text-[10px] text-muted-foreground">Permite ver esta receta en el catálogo comercial.</p>
                                            </div>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="isArchived" render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5">
                                                <FormLabel>Archivar Receta</FormLabel>
                                                <p className="text-[10px] text-muted-foreground">Ocultar de la lista activa sin eliminar.</p>
                                            </div>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </FormProvider>
        </TooltipProvider>
    );
}

function ElaborationSelector({ allElaboraciones, onSelect }: { allElaboraciones: Elaboracion[], onSelect: (elab: Elaboracion) => void }) {
    const [searchTerm, setSearchTerm] = useState('');
    const filtered = allElaboraciones.filter(e => e.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    return (
        <DialogContent className="max-h-[80vh] flex flex-col max-w-2xl">
            <DialogHeader>
                <DialogTitle>Añadir Elaboración</DialogTitle>
                <DialogDescription>
                    Selecciona una elaboración existente del catálogo.
                </DialogDescription>
            </DialogHeader>
            <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <div className="flex-1 overflow-y-auto border rounded-md">
                <Table>
                    <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Coste / Ud</TableHead><TableHead className="text-right w-[100px]"></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filtered.length > 0 ? filtered.map(elab => (
                            <TableRow key={elab.id}>
                                <TableCell className="font-medium">{elab.nombre}</TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(elab.costePorUnidad)} / {formatUnit(elab.unidadProduccion)}</TableCell>
                                <TableCell className="text-right"><DialogClose asChild><Button size="sm" onClick={() => onSelect(elab)} className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"><PlusCircle className="h-3 w-3 mr-1" /> Añadir</Button></DialogClose></TableCell>
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No se encontraron elaboraciones.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
    );
}
