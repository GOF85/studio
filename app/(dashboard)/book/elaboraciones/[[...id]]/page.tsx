'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';

import { 
  Loader2, Save, X, PlusCircle, GripVertical, 
  Trash2, Component, Copy, Download, Upload, Menu, 
  AlertTriangle, Pencil, ChevronLeft, ChevronRight, Search, 
  Image as ImageIcon
} from 'lucide-react';
import type { Elaboracion, IngredienteInterno, Alergeno, PartidaProduccion, ComponenteElaboracion } from '@/types';
import { PARTIDAS_PRODUCCION, UNIDADES_MEDIDA, ALERGENOS } from '@/types';
import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency, formatUnit, cn } from '@/lib/utils';
import Image from 'next/image';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { Label } from '@/components/ui/label';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageManager } from '@/components/book/images/ImageManager';
import type { ImagenReceta } from '@/types/index';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const CSV_HEADERS_ELABORACIONES = ["id", "nombre", "produccionTotal", "unidadProduccion", "instruccionesPreparacion", "fotos", "videoProduccionURL", "formatoExpedicion", "ratioExpedicion", "tipoExpedicion", "costePorUnidad", "partidaProduccion"];
const CSV_HEADERS_COMPONENTES = ["id_elaboracion_padre", "tipo_componente", "id_componente", "cantidad", "merma"];

type ElaboracionConAlergenos = Elaboracion & { alergenosCalculados?: Alergeno[] };

// --- HELPERS ---
const calculateElabAlergenos = (componentes: ComponenteElaboracion[], ingredientesMap: Map<string, IngredienteInterno>): Alergeno[] => {
  const elabAlergenos = new Set<Alergeno>();
  componentes.forEach(comp => {
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

const ITEMS_PER_PAGE = 20;

// --- COMPONENTES UI AUXILIARES ---

function SortableComponentRow({ field, index, remove, form }: { field: any, index: number, remove: (index: number) => void, form: any }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  
  const costeConMerma = (field.costePorUnidad || 0) * (1 + (field.merma || 0) / 100);
  const quantity = form.watch(`componentes.${index}.cantidad`) || 0;
  const costeTotal = costeConMerma * quantity;

  return (
      <TableRow ref={setNodeRef} style={style} {...attributes}>
          <TableCell className="w-8 p-1"><div {...listeners} className="cursor-grab text-muted-foreground p-1"><GripVertical className="h-4 w-4" /></div></TableCell>
          <TableCell className="font-semibold py-1 px-2 text-xs sm:text-sm min-w-[120px]">{field.nombre}</TableCell>
          <TableCell className="text-right font-mono py-1 px-2 hidden sm:table-cell text-xs">{formatCurrency(field.costePorUnidad)}</TableCell>
          <TableCell className="py-1 px-2 w-32">
              <FormField control={form.control} name={`componentes.${index}.cantidad`} render={({ field: qField }) => (
                  <FormItem><FormControl><Input type="number" step="any" {...qField} value={qField.value ?? ''} className="h-7 text-xs px-2 text-center" /></FormControl></FormItem>
              )} />
          </TableCell>
          <TableCell className="py-1 px-2 w-20 hidden sm:table-cell"><FormField control={form.control} name={`componentes.${index}.merma`} render={({ field: mField }) => (<FormItem><FormControl><Input type="number" {...mField} value={mField.value ?? ''} className="h-7 text-xs px-2 text-center" /></FormControl></FormItem>)} /></TableCell>
          <TableCell className="text-right font-mono py-1 px-2 text-xs">{formatCurrency(costeTotal)}</TableCell>
          <TableCell className="py-1 px-1 w-8"><Button type="button" variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => remove(index)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
      </TableRow>
  );
}

function ComponenteSelector({ onSelect }: { onSelect: (comp: any) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [ingredientes, setIngredientes] = useState<IngredienteInterno[]>([]);
  
  useEffect(() => {
    const fetchIngredientes = async () => {
      const { data } = await supabase.from('ingredientes_internos').select('*');
      if (data) setIngredientes(data.map((i: any) => ({
        id: i.id,
        nombreIngrediente: i.nombre_ingrediente,
        productoERPlinkId: i.producto_erp_link_id,
        alergenosPresentes: i.alergenos_presentes || [],
        alergenosTrazas: i.alergenos_trazas || [],
        historialRevisiones: []
      })));
    };
    fetchIngredientes();
  }, []);

  const filtered = ingredientes.filter(i => i.nombreIngrediente.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <DialogContent className="max-h-[80vh] flex flex-col max-w-2xl">
        <DialogHeader><DialogTitle>Añadir Ingrediente</DialogTitle></DialogHeader>
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar ingrediente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <div className="flex-1 overflow-y-auto border rounded-md">
            <Table>
                <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
                <TableBody>
                    {filtered.map(ing => (
                        <TableRow key={ing.id}>
                            <TableCell className="font-medium">{ing.nombreIngrediente}</TableCell>
                            <TableCell className="text-right">
                                <DialogClose asChild>
                                    <Button size="sm" onClick={() => onSelect({ id: crypto.randomUUID(), tipo: 'ingrediente', componenteId: ing.id, nombre: ing.nombreIngrediente, cantidad: 0, merma: 0, costePorUnidad: 0 })} className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs">
                                        <PlusCircle className="h-3 w-3 mr-1" /> Añadir
                                    </Button>
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

// --- SECCIÓN DE IMÁGENES MEJORADA ---
function ElaborationImageSection({ form, name, folder, title, description, canUseCamera, instructionFieldName }: any) {
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
                {description && <p className="text-[11px] text-muted-foreground leading-tight">{description}</p>}
            </div>
            
            {instructionFieldName && (
                <FormField control={form.control} name={instructionFieldName} render={({ field }) => (
                    <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Instrucciones</FormLabel>
                        <FormControl>
                            <Textarea {...field} value={field.value ?? ''} rows={10} placeholder="Describa el proceso de elaboración..." className="resize-none text-sm min-h-[150px]" />
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

// --- PÁGINA LISTADO ---
function ElaboracionesListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  // RESTORED: Estado para importación
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<'elaboraciones' | 'componentes' | null>(null);
  
  const loadData = useCallback(async () => {
    const { data } = await supabase.from('elaboraciones').select('*').order('nombre');
    if(data) setItems(data);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // RESTORED: Funciones de Exportación/Importación
  const handleExportElaboracionesCSV = () => {
    const dataToExport = items.map(item => {
      // Simplified export for brevity, matches DB columns
      return {
        id: item.id,
        nombre: item.nombre,
        partidaProduccion: item.partida,
        produccionTotal: item.produccion_total,
        unidadProduccion: item.unidad_produccion,
        instruccionesPreparacion: item.instrucciones,
        fotos: JSON.stringify(item.fotos || []), // Using correct column mapping logic
        costePorUnidad: item.coste_unitario,
        // ... add other fields as needed
      };
    });
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'elaboraciones.csv');
    link.click();
    toast({ title: 'Exportación de Elaboraciones Completada' });
  }

  const handleExportComponentesCSV = async () => {
    // Need to fetch components first as they are not loaded in list view for performance
    const { data: allComponents } = await supabase.from('elaboracion_componentes').select('*');
    if (!allComponents) return;

    const csv = Papa.unparse(allComponents);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'componentes.csv');
    link.click();
    toast({ title: 'Exportación de Componentes Completada' });
  }

  const handleImportClick = (type: 'elaboraciones' | 'componentes') => {
    setImportType(type);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !importType) return;

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (importType === 'elaboraciones') {
          // Basic mapping - ensure CSV headers match what you expect or map them here
          const importedData = results.data.map((item: any) => ({
            id: item.id || crypto.randomUUID(), 
            nombre: item.nombre,
            partida: item.partidaProduccion || item.partida,
            unidad_produccion: item.unidadProduccion,
            produccion_total: parseFloat(item.produccionTotal) || 1,
            // ... map other fields
          }));
          const { error } = await supabase.from('elaboraciones').upsert(importedData);
          if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
          else { loadData(); toast({ title: 'Importación completada' }); }
        } else if (importType === 'componentes') {
             const { error } = await supabase.from('elaboracion_componentes').insert(results.data);
             if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
             else toast({ title: 'Importación completada' });
        }
      }
    });
    if (event.target) event.target.value = '';
    setImportType(null);
  };

  const filtered = items.filter(i => i.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto pb-24">
         {/* Hidden Input for Import */}
         <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileSelected} />

         {/* TOOLBAR */}
         <div className="flex flex-col sm:flex-row justify-between gap-4 items-end sm:items-center">
             <div className="relative w-full sm:w-auto flex-1 max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar elaboración..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-9 h-9 text-sm bg-background"
                />
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
                {/* RESTORED: Dropdown Menu for CSV Actions */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9">
                            <Menu className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones CSV</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleExportElaboracionesCSV}><Download className="mr-2 h-4 w-4"/> Exportar Elaboraciones</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportComponentesCSV}><Download className="mr-2 h-4 w-4"/> Exportar Componentes</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleImportClick('elaboraciones')}><Upload className="mr-2 h-4 w-4"/> Importar Elaboraciones</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleImportClick('componentes')}><Upload className="mr-2 h-4 w-4"/> Importar Componentes</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={() => router.push('/book/elaboraciones/nueva')} className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none shadow-sm h-9">
                    <PlusCircle className="mr-2 h-4 w-4"/> 
                    <span className="hidden sm:inline">Nueva Elaboración</span>
                    <span className="sm:hidden">Nueva</span>
                </Button>
            </div>
         </div>

         {/* VISTA MÓVIL: TARJETAS CLICABLES */}
         <div className="grid grid-cols-1 gap-3 md:hidden">
            {filtered.map(item => (
                <div 
                    key={item.id} 
                    className="bg-card border rounded-lg p-3 shadow-sm active:scale-[0.98] transition-transform cursor-pointer group"
                    onClick={() => router.push(`/book/elaboraciones/${item.id}`)}
                >
                    <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-foreground">{item.nombre}</span>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">{item.partida}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{formatCurrency(item.coste_unitario)} / {formatUnit(item.unidad_produccion)}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary" />
                    </div>
                </div>
            ))}
            {filtered.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-lg bg-muted/10">No se encontraron elaboraciones.</div>}
         </div>

         {/* VISTA DESKTOP: TABLA */}
         <div className="hidden md:block border rounded-lg overflow-hidden bg-white shadow-sm">
            <Table>
                <TableHeader className="bg-muted/40">
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Partida</TableHead>
                        <TableHead className="text-right">Coste / Ud.</TableHead>
                        <TableHead className="text-right w-[60px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filtered.map(item => (
                        <TableRow key={item.id} onClick={() => router.push(`/book/elaboraciones/${item.id}`)} className="cursor-pointer hover:bg-muted/50 group">
                            <TableCell className="font-medium">{item.nombre}</TableCell>
                            <TableCell><Badge variant="outline" className="font-normal">{item.partida}</Badge></TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrency(item.coste_unitario)} / {formatUnit(item.unidad_produccion)}</TableCell>
                            <TableCell className="text-right">
                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </TableCell>
                        </TableRow>
                    ))}
                    {filtered.length === 0 && <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No se encontraron elaboraciones.</TableCell></TableRow>}
                </TableBody>
            </Table>
         </div>
    </div>
  )
}

// --- FORMULARIO DE ELABORACIÓN ---

const componenteElaboracionSchema = z.object({
  id: z.string(),
  tipo: z.enum(['ingrediente', 'elaboracion']),
  componenteId: z.string(),
  nombre: z.string(), 
  cantidad: z.coerce.number().min(0),
  merma: z.coerce.number().default(0),
  costePorUnidad: z.coerce.number().optional().default(0), 
});

const elaboracionFormSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  partidaProduccion: z.enum(PARTIDAS_PRODUCCION),
  unidadProduccion: z.enum(UNIDADES_MEDIDA),
  produccionTotal: z.coerce.number().min(0.001, 'La producción debe ser mayor a 0'),
  caducidadDias: z.coerce.number().optional().default(0),
  instruccionesPreparacion: z.string().optional().default(''),
  fotos: z.array(z.custom<ImagenReceta>()).default([]),
  videoProduccionURL: z.string().optional().default(''),
  formatoExpedicion: z.string().optional().default(''),
  ratioExpedicion: z.coerce.number().optional().default(0),
  tipoExpedicion: z.enum(['REFRIGERADO', 'CONGELADO', 'AMBIENTE', 'CALIENTE']).default('REFRIGERADO'),
  componentes: z.array(componenteElaboracionSchema).default([]),
  requiereRevision: z.boolean().optional().default(false),
  comentarioRevision: z.string().optional().default(''),
  fechaRevision: z.string().optional().nullable(),
});

type ElaborationFormValues = z.infer<typeof elaboracionFormSchema>;

function ElaborationFormPage() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const searchParams = useSearchParams();

  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const isNew = idParam === 'nueva';
  const isEditing = !isNew && idParam;
  const cloneId = searchParams.get('cloneId');

  const [initialData, setInitialData] = useState<Partial<ElaborationFormValues> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [ingredientesMap, setIngredientesMap] = useState<Map<string, IngredienteInterno>>(new Map());
  const [canUseCamera, setCanUseCamera] = useState(false);

  // FIX: Hooks al nivel superior
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  useEffect(() => {
    const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.enumerateDevices;
    setCanUseCamera(hasMediaDevices);
  }, []);

  const form = useForm<ElaborationFormValues>({
    resolver: zodResolver(elaboracionFormSchema),
    defaultValues: {
      id: '', nombre: '', produccionTotal: 1, unidadProduccion: 'KG', partidaProduccion: 'FRIO', componentes: [],
      tipoExpedicion: 'REFRIGERADO', formatoExpedicion: '', ratioExpedicion: 0, instruccionesPreparacion: '', videoProduccionURL: '', fotos: [],
    }
  });

  const { fields: compFields, append: appendComp, remove: removeComp, move: moveComp } = useFieldArray({ control: form.control, name: "componentes" });
  const watchedComponentes = form.watch('componentes');
  const watchedProduccionTotal = form.watch('produccionTotal');

  function handleDragEnd(event: DragEndEvent) {
      const { active, over } = event;
      if (over && active.id !== over.id) {
          const oldIndex = compFields.findIndex(item => item.id === active.id);
          const newIndex = compFields.findIndex(item => item.id === over.id);
          moveComp(oldIndex, newIndex);
      }
  }

  useEffect(() => {
    const loadElaboration = async () => {
      try {
        setIsDataLoaded(false);
        const [ingRes, erpRes] = await Promise.all([
          supabase.from('ingredientes_internos').select('*'),
          supabase.from('articulos_erp').select('*')
        ]);
        
        const erpMap = new Map<string, number>();
        (erpRes.data || []).forEach((a: any) => {
             const price = (a.precio_compra || 0) / (a.unidad_conversion || 1);
             const id = a.id;
             const ref = a.erp_id || a.id_referencia_erp;
             if(id) erpMap.set(id, price);
             if(ref) erpMap.set(ref, price);
        });

        const ingMap = new Map<string, IngredienteInterno>();
        (ingRes.data || []).forEach((i: any) => {
            const ing: IngredienteInterno = {
                id: i.id, nombreIngrediente: i.nombre_ingrediente, productoERPlinkId: i.producto_erp_link_id,
                alergenosPresentes: i.alergenos_presentes, alergenosTrazas: i.alergenos_trazas, historialRevisiones: []
            };
            (ing as any).coste = erpMap.get(i.producto_erp_link_id) || 0;
            ingMap.set(i.id, ing);
        });
        setIngredientesMap(ingMap);

        let elabToLoad = null;
        const targetId = isEditing ? idParam : cloneId;

        if (targetId) {
            const { data: elabData } = await supabase.from('elaboraciones').select('*').eq('id', targetId).single();
            if (elabData) {
                const { data: compsData } = await supabase.from('elaboracion_componentes').select('*').eq('elaboracion_padre_id', targetId);
                
                const components = (compsData || []).map((c: any) => {
                   const ing = ingMap.get(c.componente_id);
                   return {
                       id: crypto.randomUUID(),
                       tipo: c.tipo_componente === 'ARTICULO' ? 'ingrediente' : 'elaboracion',
                       componenteId: c.componente_id,
                       nombre: ing?.nombreIngrediente || 'Desconocido',
                       cantidad: c.cantidad_neta || 0,
                       merma: c.merma_aplicada || 0,
                       costePorUnidad: (ing as any)?.coste || 0
                   };
                });

                // FIX: CASTING EXPLÍCITO para evitar error de tipado en 'componentes' y valores literales
                elabToLoad = {
                    id: isEditing ? elabData.id : crypto.randomUUID(),
                    nombre: cloneId ? `${elabData.nombre} (Copia)` : elabData.nombre,
                    partidaProduccion: (elabData.partida || 'FRIO') as any, 
                    unidadProduccion: (elabData.unidad_produccion || 'KG') as any, 
                    produccionTotal: elabData.produccion_total || 1,
                    caducidadDias: elabData.caducidad_dias || 0,
                    instruccionesPreparacion: elabData.instrucciones || '',
                    // FIX: Asegurar nombre correcto de la columna fotos en DB (solo 'fotos')
                    fotos: (elabData.fotos || []).map((url: any) => typeof url === 'string' ? { url } : url),
                    videoProduccionURL: elabData.video_produccion_url || '',
                    formatoExpedicion: elabData.formato_expedicion || '',
                    ratioExpedicion: elabData.ratio_expedicion || 0,
                    tipoExpedicion: (elabData.tipo_expedicion || 'REFRIGERADO') as any, 
                    componentes: components as any 
                };
            }
        } else {
             // FIX: Asegurar que los valores por defecto coinciden con los literales del esquema Zod
             elabToLoad = { 
                 id: crypto.randomUUID(), 
                 nombre: '', 
                 produccionTotal: 1, 
                 unidadProduccion: 'KG' as const, 
                 partidaProduccion: 'FRIO' as const, 
                 tipoExpedicion: 'REFRIGERADO' as const,
                 componentes: [] 
             };
        }

        if(elabToLoad) form.reset(elabToLoad);

      } catch (e) { console.error(e); toast({ variant: 'destructive', title: 'Error cargando datos' }); } 
      finally { setIsDataLoaded(true); }
    };
    loadElaboration();
  }, [idParam, isNew, isEditing, cloneId, toast, form]);

  const { costeTotal, costeUnitario, alergenos } = useMemo(() => {
     let coste = 0;
     const prod = watchedProduccionTotal || 1;
     (watchedComponentes || []).forEach(c => {
         const cost = c.costePorUnidad || 0;
         coste += cost * c.cantidad * (1 + (c.merma || 0)/100);
     });
     return {
         costeTotal: coste,
         costeUnitario: coste / prod,
         alergenos: calculateElabAlergenos(watchedComponentes || [], ingredientesMap)
     };
  }, [watchedComponentes, watchedProduccionTotal, ingredientesMap]);


  const onSubmit = async (data: ElaborationFormValues) => {
    setIsLoading(true);
    try {
      const elaboracionData = {
        id: data.id,
        nombre: data.nombre,
        partida: data.partidaProduccion,
        unidad_produccion: data.unidadProduccion,
        instrucciones: data.instruccionesPreparacion,
        produccion_total: data.produccionTotal,
        coste_unitario: costeUnitario,
        caducidad_dias: data.caducidadDias,
        // FIX: Columna correcta 'fotos'
        fotos: data.fotos, 
        video_produccion_url: data.videoProduccionURL,
        formato_expedicion: data.formatoExpedicion,
        ratio_expedicion: data.ratioExpedicion,
        tipo_expedicion: data.tipoExpedicion,
        requiere_revision: data.requiereRevision,
        comentario_revision: data.comentarioRevision,
        fecha_revision: data.fechaRevision || new Date().toISOString()
      };

      const { error: elabError } = await supabase.from('elaboraciones').upsert(elaboracionData);
      if (elabError) throw elabError;

      await supabase.from('elaboracion_componentes').delete().eq('elaboracion_padre_id', data.id);
      
      if (data.componentes.length > 0) {
        const comps = data.componentes.map(c => ({
          elaboracion_padre_id: data.id,
          tipo_componente: c.tipo === 'ingrediente' ? 'ARTICULO' : 'ELABORACION',
          componente_id: c.componenteId,
          cantidad_neta: c.cantidad,
          merma_aplicada: c.merma
        }));
        await supabase.from('elaboracion_componentes').insert(comps);
      }

      toast({ description: 'Elaboración guardada.' });
      router.push('/book/elaboraciones');
    } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
    finally { setIsLoading(false); }
  };

  const handleDelete = async () => {
      try {
          const { error } = await supabase.from('elaboraciones').delete().eq('id', idParam);
          if (error) throw error;
          toast({ title: 'Elaboración eliminada' });
          router.push('/book/elaboraciones');
      } catch (e) { toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar.' }); }
  };

  if (!isDataLoaded) return <LoadingSkeleton title="Cargando elaboración..." />;

  const pageTitle = cloneId ? 'Clonar Elaboración' : (isNew ? 'Nueva Elaboración' : 'Editar Elaboración');

  return (
    <TooltipProvider>
      <main className="pb-24 bg-background min-h-screen">
        <FormProvider {...form}>
            <form id="elaboration-form" onSubmit={form.handleSubmit(onSubmit)}>
                
                {/* HEADER STICKY (SOLO TABS Y NAVEGACION) */}
                <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm pt-2">
                     <Tabs defaultValue="general" className="w-full">
                        {/* FILA 1: Navegación simple */}
                         <div className="flex items-center px-3 pb-2 gap-2">
                             <Button variant="ghost" size="icon" type="button" onClick={() => router.push('/book/elaboraciones')} className="-ml-2 h-8 w-8 text-muted-foreground hover:text-foreground">
                                <ChevronLeft className="h-6 w-6" />
                             </Button>
                             {/* Tabs a la derecha */}
                             <div className="flex-1 overflow-x-auto no-scrollbar">
                                <TabsList className="w-full justify-start bg-transparent p-0 h-9 gap-4">
                                    {["Info. General", "Componentes", "Info. Preparación"].map((tab, i) => {
                                        const val = ["general", "componentes", "preparacion"][i];
                                        return (
                                            <TabsTrigger key={val} value={val} className="rounded-none border-b-2 border-transparent px-1 py-2 text-xs font-medium text-muted-foreground data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:bg-transparent transition-all hover:text-foreground whitespace-nowrap">
                                                {tab}
                                            </TabsTrigger>
                                        )
                                    })}
                                </TabsList>
                             </div>
                         </div>

                        {/* CONTENIDO TABS (Dentro del mismo contexto) */}
                        <div className="p-2 sm:p-4 max-w-7xl mx-auto min-h-screen bg-muted/5 mt-0 absolute left-0 right-0 top-[100%] overflow-y-auto pb-32">
                            <TabsContent value="general" className="space-y-4 mt-2">
                                <Card className="shadow-none border border-border/60">
                                    <CardHeader className="p-3 pb-1 border-b bg-muted/10"><CardTitle className="text-sm font-bold">Datos Básicos</CardTitle></CardHeader>
                                    <CardContent className="p-3 space-y-3">
                                        <FormField control={form.control} name="nombre" render={({ field }) => (<FormItem className="space-y-0.5"><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Nombre</FormLabel><FormControl><Input {...field} value={field.value ?? ''} className="h-8 text-sm" /></FormControl><FormMessage /></FormItem>)} />
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormField control={form.control} name="partidaProduccion" render={({ field }) => (
                                                <FormItem className="space-y-0.5"><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Partida</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{PARTIDAS_PRODUCCION.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></FormItem>
                                            )} />
                                            <FormField control={form.control} name="caducidadDias" render={({ field }) => (<FormItem className="space-y-0.5"><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Caducidad (días)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} className="h-8 text-sm" /></FormControl></FormItem>)} />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* ZONA DE PELIGRO */}
                                {isEditing && (
                                    <div className="mt-8 pt-4 border-t border-dashed">
                                        <Card className="border-destructive/30 bg-destructive/5 shadow-none">
                                            <CardContent className="p-3 flex justify-between items-center">
                                                <span className="text-xs text-destructive font-medium">Eliminar elaboración permanentemente</span>
                                                <Button variant="ghost" type="button" onClick={() => setShowDeleteConfirm(true)} className="h-8 w-8 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="componentes" className="space-y-4 mt-2">
                                 
                                 {/* 1. TARJETA DE RENDIMIENTO (MOVIDA AQUI) */}
                                 <Card className="shadow-none border border-border/60">
                                    <CardHeader className="p-3 pb-1 border-b bg-muted/10"><CardTitle className="text-sm font-bold">Rendimiento</CardTitle></CardHeader>
                                    <CardContent className="p-3">
                                         <div className="grid grid-cols-2 gap-3">
                                             <FormField control={form.control} name="produccionTotal" render={({ field }) => (<FormItem className="space-y-0.5"><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Producción Total</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} className="h-8 text-sm" /></FormControl></FormItem>)} />
                                             <FormField control={form.control} name="unidadProduccion" render={({ field }) => (
                                                <FormItem className="space-y-0.5"><FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Unidad</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl><SelectContent>{UNIDADES_MEDIDA.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></FormItem>
                                            )} />
                                        </div>
                                    </CardContent>
                                 </Card>

                                 {/* 2. LISTA DE COMPONENTES */}
                                <Card className="shadow-none border border-border/60">
                                    <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between bg-muted/10 border-b">
                                        <CardTitle className="text-sm font-bold">Componentes</CardTitle>
                                        <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                                            <DialogTrigger asChild><Button variant="outline" size="sm" className="h-7 text-xs bg-background"><PlusCircle className="h-3.5 w-3.5 mr-1" /> Añadir</Button></DialogTrigger>
                                            <ComponenteSelector onSelect={(comp) => { appendComp(comp); setIsSelectorOpen(false); }} />
                                        </Dialog>
                                    </CardHeader>
                                    <CardContent className="p-0 sm:p-2">
                                         {/* Desktop Table */}
                                        <div className="hidden md:block overflow-x-auto">
                                            <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                                                <Table>
                                                    <TableHeader><TableRow><TableHead className="w-8"></TableHead><TableHead>Nombre</TableHead><TableHead className="text-right">Coste/Ud</TableHead><TableHead className="w-24 text-center">Cant.</TableHead><TableHead className="w-20 text-center">Merma</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-8"></TableHead></TableRow></TableHeader>
                                                    <SortableContext items={compFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                                        <TableBody>
                                                            {compFields.map((field, index) => <SortableComponentRow key={field.id} field={field} index={index} remove={removeComp} form={form} />)}
                                                        </TableBody>
                                                    </SortableContext>
                                                </Table>
                                            </DndContext>
                                        </div>

                                        {/* Mobile Cards */}
                                        <div className="md:hidden space-y-1 p-1">
                                            {compFields.map((field, index) => {
                                                const costeTotal = ((field as any).costePorUnidad || 0) * (1 + (field as any).merma / 100) * (form.watch(`componentes.${index}.cantidad`) || 0);
                                                return (
                                                    <div key={field.id} className="bg-background border rounded-md p-2 relative flex flex-col gap-2">
                                                        <div className="flex justify-between items-start pr-8">
                                                            <span className="font-medium text-sm leading-snug">{(field as any).nombre}</span>
                                                            <span className="font-mono text-[10px] text-muted-foreground">{formatCurrency((field as any).costePorUnidad)}</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 items-center bg-muted/20 p-1 rounded">
                                                            <div className="flex flex-col"><span className="text-[9px] uppercase font-bold text-muted-foreground">Cant.</span><FormField control={form.control} name={`componentes.${index}.cantidad`} render={({ field: f }) => (<FormControl><Input type="number" {...f} value={f.value ?? ''} className="h-6 w-full text-center text-xs bg-white" /></FormControl>)} /></div>
                                                            <div className="text-right"><span className="text-[9px] uppercase font-bold text-muted-foreground block">Total</span><span className="font-bold text-sm">{formatCurrency(costeTotal)}</span></div>
                                                        </div>
                                                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-destructive" onClick={() => removeComp(index)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                    </div>
                                                )
                                            })}
                                            {compFields.length === 0 && <div className="text-center py-6 text-xs text-muted-foreground border-2 border-dashed m-2 rounded">Sin componentes</div>}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* COSTES */}
                                <Card className="border-l-4 border-l-blue-600 shadow-sm rounded-r-lg rounded-l-none">
                                    <CardContent className="p-3 flex justify-between items-center bg-card">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Coste Total</span>
                                            <span className="font-mono text-lg font-medium">{formatCurrency(costeTotal)}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Coste Unitario</span>
                                            <span className="font-bold text-xl text-blue-700">{formatCurrency(costeUnitario)}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* ALÉRGENOS */}
                                {alergenos.length > 0 && (
                                    <Card className="shadow-sm border border-red-200 bg-red-50/50 dark:bg-red-950/10">
                                        <CardHeader className="p-2 pb-1"><CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700"><AlertTriangle className="h-3.5 w-3.5" /> Alérgenos Totales</CardTitle></CardHeader>
                                        <CardContent className="p-2 flex flex-wrap gap-1.5 pt-0">{alergenos.map(a => <AllergenBadge key={a} allergen={a} />)}</CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            <TabsContent value="preparacion" className="space-y-4 mt-2">
                                 <div className="bg-card border rounded-lg p-3 shadow-sm">
                                    <ElaborationImageSection 
                                        name="fotos" 
                                        title="Preparación" 
                                        folder="elaboraciones" 
                                        form={form} 
                                        canUseCamera={canUseCamera} 
                                        instructionFieldName="instruccionesPreparacion" 
                                    />
                                 </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* BOTONES FLOTANTES */}
                <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
                    <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="rounded-full shadow-lg h-10 w-10 border-2 border-white"
                        onClick={() => router.push('/book/elaboraciones')}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                    <Button 
                        type="submit" 
                        form="elaboration-form" 
                        disabled={isLoading} 
                        className="rounded-full shadow-lg h-14 w-14 bg-green-600 hover:bg-green-700 text-white border-2 border-white flex items-center justify-center p-0 scale-110"
                    >
                        {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : <Save className="h-6 w-6" />}
                    </Button>
                </div>
            </form>
        </FormProvider>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>¿Eliminar elaboración?</AlertDialogTitle><AlertDialogDescription>Acción irreversible.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive">Eliminar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </TooltipProvider>
  );
}

export default function ElaboracionesPage() {
  const params = useParams();
  const isListPage = !params.id || params.id.length === 0;

  return (
    <Suspense fallback={<LoadingSkeleton title="Cargando elaboraciones..." />}>
      {isListPage ? <ElaboracionesListPage /> : <ElaborationFormPage />}
    </Suspense>
  );
}