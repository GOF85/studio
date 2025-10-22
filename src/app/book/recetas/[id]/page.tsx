

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, FieldErrors, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { recipeDescriptionGenerator } from '@/ai/flows/recipe-description-generator';

import { Loader2, Save, X, BookHeart, Utensils, Sprout, GlassWater, Percent, PlusCircle, GripVertical, Trash2, Eye, Soup, Info, ChefHat, Package, Factory, Sparkles, TrendingUp, FilePenLine, Link as LinkIcon, Component } from 'lucide-react';
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
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency, formatUnit, cn } from '@/lib/utils';
import Image from 'next/image';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { ElaborationForm, type ElaborationFormValues } from '@/components/book/elaboration-form';


const elaboracionEnRecetaSchema = z.object({
  id: z.string(),
  elaboracionId: z.string(),
  nombre: z.string(),
  cantidad: z.coerce.number().min(0),
  coste: z.coerce.number().default(0),
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
  menajeAsociado: z.array(menajeEnRecetaSchema).default([]),
  instruccionesMiseEnPlace: z.string().optional().default(''),
  fotosMiseEnPlaceURLs: z.array(z.object({ value: z.string().url("Debe ser una URL válida") })).optional().default([]),
  instruccionesRegeneracion: z.string().optional().default(''),
  fotosRegeneracionURLs: z.array(z.object({ value: z.string().url("Debe ser una URL válida") })).optional().default([]),
  instruccionesEmplatado: z.string().optional().default(''),
  fotosEmplatadoURLs: z.array(z.object({ value: z.string().url("Debe ser una URL válida") })).optional().default([]),
  perfilSaborPrincipal: z.enum(SABORES_PRINCIPALES).optional(),
  perfilSaborSecundario: z.array(z.string()).optional().default([]),
  perfilTextura: z.array(z.string()).optional().default([]),
  tipoCocina: z.string().optional().default(''),
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

function SelectorDialog({ trigger, title, items, columns, onSelect }: { trigger: React.ReactNode; title: string; items: any[]; columns: { key: string; header: string }[]; onSelect: (item: any) => void; }) {
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
                            {filteredItems.map((item: any) => (
                                <TableRow key={item.id}>
                                    {columns.map(c => <TableCell key={c.key as string}>{
                                        c.key === 'costePorUnidad' && typeof item[c.key] === 'number'
                                          ? formatCurrency(item[c.key])
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
    const style = { transform: CSS.Transform.toString(transform), transition };
    
    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-background p-1">
            <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground p-2">
                <GripVertical />
            </div>
            {children}
        </div>
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

function ImageUploadSection({ name, title, form }: { name: "fotosMiseEnPlaceURLs" | "fotosRegeneracionURLs" | "fotosEmplatadoURLs"; title: string; form: any }) {
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
            <div className="space-y-2 mt-2">
                <div className="flex gap-2">
                    <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Pega una URL de imagen..." />
                    <Button type="button" variant="outline" onClick={handleAdd}><LinkIcon className="mr-2" />Añadir</Button>
                </div>
                {form.formState.errors[name] && <p className="text-sm font-medium text-destructive">{(form.formState.errors[name] as any).message}</p>}
                <div className="grid grid-cols-4 gap-2 pt-2">
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
  const id = params.id as string;
  const isEditing = id !== 'nueva';
  const cloneId = searchParams.get('cloneId');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const [dbElaboraciones, setDbElaboraciones] = useState<ElaboracionConCoste[]>([]);
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
    defaultValues: { id: '', nombre: '', nombre_en: '', visibleParaComerciales: true, descripcionComercial: '', descripcionComercial_en: '', responsableEscandallo: '', categoria: '', estacionalidad: 'MIXTO', tipoDieta: 'NINGUNO', gramajeTotal: 0, porcentajeCosteProduccion: 30, elaboraciones: [], menajeAsociado: [], fotosEmplatadoURLs: [], fotosMiseEnPlaceURLs: [], fotosRegeneracionURLs: [], perfilSaborSecundario: [], perfilTextura: [], equipamientoCritico: [], formatoServicioIdeal: [], etiquetasTendencia: [] }
  });

  const { fields: elabFields, append: appendElab, remove: removeElab, move: moveElab } = useFieldArray({ control: form.control, name: "elaboraciones" });
  const { fields: menajeFields, append: appendMenaje, remove: removeMenaje, move: moveMenaje } = useFieldArray({ control: form.control, name: "menajeAsociado" });

  const watchedElaboraciones = form.watch('elaboraciones');
  const watchedPorcentajeCoste = form.watch('porcentajeCosteProduccion');
  const numeroReceta = form.watch('numeroReceta');

  const { costeMateriaPrima, alergenos, partidasProduccion } = useMemo(() => {
    let coste = 0;
    const allAlergenos = new Set<Alergeno>();
    const allPartidas = new Set<PartidaProduccion>();

    (watchedElaboraciones || []).forEach(elab => {
        const costeConMerma = elab.coste * (1 + (elab.merma || 0) / 100);
        coste += costeConMerma * elab.cantidad;
        (elab.alergenos || []).forEach(a => allAlergenos.add(a as Alergeno));

        const elabData = dbElaboraciones.find(dbElab => dbElab.id === elab.elaboracionId);
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

  const { precioVenta, margenBruto, margenPct } = useMemo(() => {
    if (!watchedPorcentajeCoste || watchedPorcentajeCoste < 0) {
        const pv = costeMateriaPrima;
        const margen = pv > 0 ? (pv - costeMateriaPrima) / pv * 100 : 0;
        return { precioVenta: pv, margenBruto: pv - costeMateriaPrima, margenPct: margen };
    }
    const pv = costeMateriaPrima + (costeMateriaPrima * (watchedPorcentajeCoste / 100));
    const margen = pv > 0 ? (pv - costeMateriaPrima) / pv * 100 : 0;
    return { precioVenta: pv, margenBruto: pv - costeMateriaPrima, margenPct: margen };
  }, [costeMateriaPrima, watchedPorcentajeCoste]);
  
  const loadData = useCallback(async () => {
    const storedInternos = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const storedErp = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
    const erpMap = new Map(storedErp.map(i => [i.id, i]));
    const combined = storedInternos.map(ing => ({ ...ing, erp: erpMap.get(ing.productoERPlinkId) }));
    const ingredientesMap = new Map(combined.map(i => [i.id, i]));

    const elaboracionesData = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const elaboracionesConDatos = elaboracionesData.map(e => ({
        ...e, 
        costePorUnidad: e.costePorUnidad || 0, 
        alergenos: calculateElabAlergenos(e, ingredientesMap)
    }));
    setDbElaboraciones(elaboracionesConDatos);
    
    const menaje = JSON.parse(localStorage.getItem('menajeDB') || '[]') as MenajeDB[];
    setDbMenaje(menaje);
    
    const categorias = JSON.parse(localStorage.getItem('categoriasRecetas') || '[]') as CategoriaReceta[];
    setDbCategorias(categorias);

    const tiposCocina = JSON.parse(localStorage.getItem('tiposCocina') || '[]') as TipoCocina[];
    setDbTiposCocina(tiposCocina);

    const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    setPersonalCPR(allPersonal.filter(p => p.departamento === 'CPR'));

    const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const sabores = new Set<string>();
    const texturas = new Set<string>();
    const tecnicas = new Set<string>();
    const formatos = new Set<string>(['Cóctel (bocado)', 'Buffet', 'Emplatado en mesa', 'Estación de cocina en vivo (Showcooking)']);
    const equipos = new Set<string>(['Horno de convección', 'Abatidor', 'Sifón', 'Roner']);
    const tendencias = new Set<string>(['Plant-based', 'Comfort food', 'Superalimentos', 'Kilómetro 0', 'Sin gluten', 'Keto']);

    allRecetas.forEach(r => {
      r.perfilSaborSecundario?.forEach(s => sabores.add(s));
      r.perfilTextura?.forEach(t => texturas.add(t));
      if (r.tecnicaCoccionPrincipal) tecnicas.add(r.tecnicaCoccionPrincipal);
      r.formatoServicioIdeal?.forEach(f => formatos.add(f));
      r.equipamientoCritico?.forEach(e => equipos.add(e));
      r.etiquetasTendencia?.forEach(t => tendencias.add(t));
    });
    setSaboresSecundarios(Array.from(sabores));
    setTexturas(Array.from(texturas));
    setTecnicasCoccion(Array.from(tecnicas));
    setFormatosServicio(Array.from(formatos));
    setEquipamientos(Array.from(equipos));
    setEtiquetasTendencia(Array.from(tendencias));

    let initialValues: Receta | null = null;
    if (cloneId) {
        const recetaToClone = allRecetas.find(e => e.id === cloneId);
        if (recetaToClone) {
            initialValues = {
                ...recetaToClone,
                id: Date.now().toString(), // New ID for the clone
                nombre: `${recetaToClone.nombre} (Copia)`
            }
        }
    } else if (isEditing) {
        initialValues = allRecetas.find(e => e.id === id) || null;
    }

    if (initialValues) {
        form.reset(initialValues);
    } else if (!isEditing) {
        // Generate new numeroReceta
        const lastRecipe = allRecetas.reduce((last, current) => {
            if (!current.numeroReceta) return last;
            const currentNum = parseInt(current.numeroReceta.substring(2));
            const lastNum = last ? parseInt(last.numeroReceta!.substring(2)) : 0;
            return currentNum > lastNum ? current : last;
        }, null as Receta | null);
        const lastNum = lastRecipe ? parseInt(lastRecipe.numeroReceta!.substring(2)) : 0;
        const newNum = `R-${(lastNum + 1).toString().padStart(4, '0')}`;

        form.reset({ 
            id: Date.now().toString(),
            numeroReceta: newNum,
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
            fotosEmplatadoURLs: [],
            fotosMiseEnPlaceURLs: [],
            fotosRegeneracionURLs: [],
            perfilSaborSecundario: [], 
            perfilTextura: [], 
            equipamientoCritico: [], 
            formatoServicioIdeal: [], 
            etiquetasTendencia: [] 
        });
    }
    
    setIsDataLoaded(true);
  }, [id, isEditing, cloneId, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);


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
          tipoCocina: formData.tipoCocina,
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
        precioVenta, 
        alergenos,
        partidaProduccion: partidasProduccion.join(', '), // Save computed value
    };

    if (isEditing && !cloneId) {
      const index = allItems.findIndex(p => p.id === id);
      if (index !== -1) allItems[index] = dataToSave;
    } else {
      allItems.push(dataToSave);
    }

    localStorage.setItem('recetas', JSON.stringify(allItems));
    toast({ description: `Receta "${data.nombre}" guardada.` });
    setIsLoading(false);
    form.reset(dataToSave); // Mark form as clean with the saved data
    router.push('/book');
  }

  const handleDelete = () => {
    if (!isEditing) return;
    let allItems = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const updatedItems = allItems.filter(p => p.id !== id);
    localStorage.setItem('recetas', JSON.stringify(updatedItems));
    toast({ title: 'Receta eliminada' });
    router.push('/book');
  }

  if (!isDataLoaded) {
    return <LoadingSkeleton title="Cargando receta..." />;
  }

  return (
    <TooltipProvider>
      <main className="container mx-auto px-4 py-8">
        <FormProvider {...form}>
        <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
        
          <form id="receta-form" onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <BookHeart className="h-8 w-8" />
                    <h1 className="text-3xl font-headline font-bold">{isEditing && !cloneId ? 'Editar' : 'Nueva'} Receta {cloneId && <span className="text-xl text-muted-foreground">(Clonando)</span>}</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => router.push('/book')}> <X className="mr-2"/> Cancelar</Button>
                    {isEditing && !cloneId && (
                        <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}> <Trash2 className="mr-2"/> Borrar Receta</Button>
                    )}
                    <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                    <span className="ml-2">{isEditing && !cloneId ? 'Guardar Cambios' : 'Guardar Receta'}</span>
                    </Button>
                </div>
            </div>

            <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full space-y-3">
                <AccordionItem value="item-1">
                    <Card>
                        <AccordionTrigger className="p-4 flex justify-between w-full">
                            <CardTitle className="text-lg">Información General y Clasificación</CardTitle>
                            {numeroReceta && <Badge variant="outline" className="text-base">{numeroReceta}</Badge>}
                        </AccordionTrigger>
                        <AccordionContent>
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
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="item-2">
                     <Card>
                        <AccordionTrigger className="p-4"><CardTitle className="flex items-center gap-2 text-lg"><Utensils />Elaboraciones</CardTitle></AccordionTrigger>
                        <AccordionContent>
                        <CardHeader className="pt-2 pb-3 flex-row items-center justify-between">
                             <div></div>
                            <div className="flex gap-2">
                                <CreateElaborationModal onElaborationCreated={handleElaborationCreated}>
                                  <Button variant="secondary" size="sm" type="button"><PlusCircle size={16} /> Crear Nueva</Button>
                                </CreateElaborationModal>
                                <SelectorDialog trigger={<Button type="button" variant="outline" size="sm"><PlusCircle size={16} />Añadir Elaboración</Button>} title="Seleccionar Elaboración" items={dbElaboraciones} columns={[{ key: 'nombre', header: 'Nombre' }, { key: 'costePorUnidad', header: 'Coste/Unidad' }]} onSelect={onAddElab} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <DndContext sensors={sensors} onDragEnd={(e) => handleDragEnd(e, 'elab')} collisionDetection={closestCenter}>
                                <SortableContext items={elabFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-1">
                                    {(elabFields || []).map((field, index) => (
                                        <SortableItem key={field.id} id={field.id}>
                                            <div className="flex-1 grid grid-cols-4 items-center gap-2">
                                                <span className="font-semibold col-span-2">{field.nombre}</span>
                                                <FormField control={form.control} name={`elaboraciones.${index}.cantidad`} render={({ field: qField }) => (
                                                    <FormItem className="flex items-center gap-2">
                                                        <FormLabel className="text-xs">Cantidad:</FormLabel>
                                                        <FormControl>
                                                            <div className="flex items-center">
                                                                <Input type="number" {...qField} className="h-8 w-20" />
                                                                <span className="text-xs text-muted-foreground ml-1">{formatUnit(field.unidad)}</span>
                                                            </div>
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name={`elaboraciones.${index}.merma`} render={({ field: mField }) => (
                                                    <FormItem className="flex items-center gap-2">
                                                        <FormLabel className="text-xs">% Merma:</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...mField} value={mField.value ?? 0} className="h-8 w-20" />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                            </div>
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
                                            <div className="flex-1 flex items-center">
                                                <span className="font-semibold flex-1">{field.descripcion}</span>
                                                <FormField control={form.control} name={`menajeAsociado.${index}.ratio`} render={({ field: qField }) => (
                                                    <FormItem className="flex items-center gap-2">
                                                        <FormLabel className="text-xs flex items-center gap-1.5">Ratio <InfoTooltip text="Ej: 1 (uno por comensal), 0.5 (uno cada dos), 4 (cuatro por comensal)." /></FormLabel>
                                                        <FormControl><Input type="number" {...qField} className="h-8 w-20" /></FormControl>
                                                    </FormItem>
                                                )} />
                                            </div>
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
                        <AccordionTrigger className="p-4"><CardTitle className="flex items-center gap-2 text-lg"><FilePenLine />Instrucciones de Pase</CardTitle></AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="grid md:grid-cols-3 gap-3 pt-2">
                               <ImageUploadSection name="fotosMiseEnPlaceURLs" title="Mise en Place" form={form} />
                               <ImageUploadSection name="fotosRegeneracionURLs" title="Regeneración" form={form} />
                               <ImageUploadSection name="fotosEmplatadoURLs" title="Emplatado" form={form} />
                            </CardContent>
                        </AccordionContent>
                     </Card>
                </AccordionItem>
                 <AccordionItem value="item-gastronomico">
                    <Card>
                        <AccordionTrigger className="p-4"><CardTitle className="flex items-center gap-2 text-lg"><Soup />Perfil Gastronómico</CardTitle></AccordionTrigger>
                        <AccordionContent>
                           <CardContent className="space-y-4 pt-2">
                             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                 <FormField control={form.control} name="estacionalidad" render={({ field }) => ( <FormItem className="flex flex-col">
                                        <FormLabel className="flex items-center gap-1.5">Estacionalidad <InfoTooltip text="Indica la temporada ideal para este plato, basado en la disponibilidad y calidad de sus ingredientes." /></FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="INVIERNO">Invierno</SelectItem><SelectItem value="VERANO">Verano</SelectItem><SelectItem value="MIXTO">Mixto</SelectItem></SelectContent></Select>
                                    </FormItem> )} />
                                    <FormField control={form.control} name="tipoDieta" render={({ field }) => ( <FormItem className="flex flex-col">
                                      <FormLabel>Tipo de Dieta</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="VEGETARIANO">Vegetariano</SelectItem><SelectItem value="VEGANO">Vegano</SelectItem><SelectItem value="AMBOS">Ambos</SelectItem><SelectItem value="NINGUNO">Ninguno</SelectItem></SelectContent></Select>
                                    </FormItem> )} />
                             </div>
                            <div className="grid md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="perfilSaborPrincipal" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5">Perfil Sabor Principal <InfoTooltip text="El sabor dominante que define la receta." /></FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl>
                                            <SelectContent>{SABORES_PRINCIPALES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                                 <FormField control={form.control} name="perfilSaborSecundario" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5">Perfil Sabor Secundario <InfoTooltip text="Matices que complementan el sabor principal (picante, ahumado, etc.)." /></FormLabel>
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
                                        <FormLabel className="flex items-center gap-1.5">Perfil de Textura <InfoTooltip text="Describe la sensación del plato en boca (crujiente, cremoso, etc.)." /></FormLabel>
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
                 <AccordionItem value="item-operacional">
                    <Card>
                        <AccordionTrigger className="p-4"><CardTitle className="flex items-center gap-2 text-lg"><Factory />Logística y Producción</CardTitle></AccordionTrigger>
                        <AccordionContent>
                           <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2 items-start">
                                <FormField control={form.control} name="potencialMiseEnPlace" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5">Potencial de "Mise en Place" <InfoTooltip text="Indica qué parte del plato se puede adelantar para optimizar la producción." /></FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="COMPLETO">Completo (Se puede dejar listo para servir)</SelectItem>
                                                <SelectItem value="PARCIAL">Parcial (Salsas, bases, guarniciones...)</SelectItem>
                                                <SelectItem value="AL_MOMENTO">Al momento (Se debe hacer al momento del servicio)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                                 <FormField control={form.control} name="formatoServicioIdeal" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5">Formato de Servicio Ideal <InfoTooltip text="Define para qué tipo de servicio está pensado este plato." /></FormLabel>
                                        <MultiSelect
                                            options={formatosServicio.map(f => ({label: f, value: f}))}
                                            selected={field.value || []}
                                            onChange={field.onChange}
                                            placeholder="Selecciona formatos..."
                                            onCreated={(value) => setFormatosServicio(prev => [...prev, value])}
                                        />
                                    </FormItem>
                                 )} />
                                  <FormField control={form.control} name="equipamientoCritico" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5">Equipamiento Crítico Requerido <InfoTooltip text="Lista la maquinaria específica y limitada necesaria para este plato." /></FormLabel>
                                         <MultiSelect
                                            options={equipamientos.map(e => ({label: e, value: e}))}
                                            selected={field.value || []}
                                            onChange={field.onChange}
                                            placeholder="Selecciona o añade equipo..."
                                            onCreated={(value) => setEquipamientos(prev => [...prev, value])}
                                        />
                                    </FormItem>
                                 )} />
                                <FormField control={form.control} name="dificultadProduccion" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5">Nivel de Dificultad (1-5) <InfoTooltip text="Valora de 1 (muy fácil) a 5 (muy complejo) la dificultad de producir esta receta."/></FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-4 pt-2">
                                                <span>Fácil</span>
                                                <Slider defaultValue={[field.value || 3]} value={[field.value || 3]} onValueChange={(value) => field.onChange(value[0])} max={5} min={1} step={1} />
                                                <span>Difícil</span>
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                 )} />
                                <FormField control={form.control} name="estabilidadBuffet" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5">Estabilidad en Buffet (1-5) <InfoTooltip text="Valora de 1 (muy poco estable) a 5 (muy estable) cuánto tiempo mantiene el plato su calidad en un buffet."/></FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-4 pt-2">
                                                <span>Baja</span>
                                                <Slider defaultValue={[field.value || 3]} value={[field.value || 3]} onValueChange={(value) => field.onChange(value[0])} max={5} min={1} step={1} />
                                                <span>Alta</span>
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                 )} />
                                <FormField control={form.control} name="escalabilidad" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5">Escalabilidad <InfoTooltip text="Indica si es fácil o difícil replicar esta receta para un gran número de comensales."/></FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="FACIL">Fácil de escalar</SelectItem>
                                                <SelectItem value="MEDIA">Escalabilidad media</SelectItem>
                                                <SelectItem value="DIFICIL">Difícil de escalar</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                           </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="item-translations">
                    <Card>
                        <AccordionTrigger className="p-4"><CardTitle className="flex items-center gap-2 text-lg">Traducciones / Otros</CardTitle></AccordionTrigger>
                        <AccordionContent>
                           <CardContent className="space-y-4 pt-2">
                                <FormField control={form.control} name="nombre_en" render={({ field }) => (<FormItem><FormLabel>Nombre (Inglés)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="descripcionComercial_en" render={({ field }) => (<FormItem><FormLabel>Descripción Comercial (Inglés)</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
                           </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                
            </Accordion>
          </form>
          
          <Card className="sticky top-24">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2"><TrendingUp/>Análisis de Rentabilidad</CardTitle>
                <CardDescription className="text-xs">Costes y precios en tiempo real.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <FormLabel>Coste Materia Prima</FormLabel>
                    <span className="font-bold">{formatCurrency(costeMateriaPrima)}</span>
                </div>
                <FormField control={form.control} name="porcentajeCosteProduccion" render={({ field }) => ( <FormItem>
                    <div className="flex justify-between items-center">
                        <FormLabel className="text-sm">Imputación CPR</FormLabel>
                         <div className="flex items-center gap-2">
                            <FormControl><Input type="number" {...field} className="h-8 w-20 text-right" /></FormControl>
                            <span>%</span>
                        </div>
                    </div>
                </FormItem> )} />
                 <Separator />
                <div className="flex justify-between items-center font-bold text-lg">
                    <FormLabel>Precio Venta</FormLabel>
                    <span className="text-primary">{formatCurrency(precioVenta)}</span>
                </div>
                <Separator />
                 <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span>Margen Bruto:</span>
                        <span className={cn(margenBruto < 0 && 'text-destructive')}>{formatCurrency(margenBruto)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Margen %:</span>
                        <span className={cn('font-semibold', margenPct < 30 ? 'text-destructive' : 'text-green-600')}>{margenPct.toFixed(2)}%</span>
                    </div>
                 </div>
            </CardContent>
             <CardFooter>
                <div className="w-full">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm"><Sprout/>Alérgenos de la Receta</h4>
                    <div className="border rounded-md p-2 w-full bg-muted/30">
                        <div className="flex flex-wrap gap-1.5">
                            {alergenos.map(a => (
                                <AllergenBadge key={a} allergen={a} />
                            ))}
                            {alergenos.length === 0 && <p className="text-muted-foreground text-xs">No se han detectado alérgenos.</p>}
                        </div>
                    </div>
                </div>
             </CardFooter>
        </Card>
        </div>
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
  );
}




