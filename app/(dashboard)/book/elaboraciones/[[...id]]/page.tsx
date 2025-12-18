'use client';

// ----------------------------------------------------------------------
// 1. IMPORTS
// ----------------------------------------------------------------------

// Librerías Externas
import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import Decimal from 'decimal.js';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Papa from 'papaparse';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// UI Components (Shadcn/Radix)
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from '@/components/ui/label';

// Icons (Lucide)
import { 
    Loader2, Save, X, PlusCircle, GripVertical, 
    Trash2, Download, Upload, Menu, 
    AlertTriangle, ChevronLeft, ChevronRight, Search, 
    Image as ImageIcon, Filter, Euro, AlertCircle
} from 'lucide-react';

// Custom Components & Hooks
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { ImageManager } from '@/components/book/images/ImageManager';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { ProduccionesTab } from '@/components/elaboraciones/producciones-tab';
import { AñadirProduccionDialog } from '@/components/elaboraciones/anadir-produccion-dialog';

// Types & Libs
import type { Elaboracion, IngredienteInterno, Alergeno, ComponenteElaboracion, ImagenReceta, MediaProducciones } from '@/types';
import { PARTIDAS_PRODUCCION, UNIDADES_MEDIDA } from '@/types';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatUnit } from '@/lib/utils';
import Image from 'next/image';

// ----------------------------------------------------------------------
// 2. HELPERS PUROS & CONSTANTES
// ----------------------------------------------------------------------

// Función para generar UUID compatible con navegadores que no soportan crypto.randomUUID()
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback para navegadores que no soportan randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Configurar precisión de Decimal.js para 15 decimales
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

// Función para calcular costes con precisión
const calculateCostWithPrecision = (
  precioUnitario: number,
  cantidad: number,
  merma: number = 0
): { costeTotal: number; costePreciso: Decimal } => {
  try {
    const precio = new Decimal(precioUnitario || 0);
    const cant = new Decimal(cantidad || 0);
    const mermaDecimal = new Decimal(merma || 0);
    
    // costeConMerma = precio * (1 + merma/100)
    const factor = new Decimal(1).plus(mermaDecimal.dividedBy(100));
    const costePreciso = precio.times(factor).times(cant);
    
    return {
      costeTotal: parseFloat(costePreciso.toString()),
      costePreciso
    };
  } catch (e) {
    console.error('Error calculating cost:', e);
    return { costeTotal: 0, costePreciso: new Decimal(0) };
  }
};

const CSV_HEADERS_ELABORACIONES = ["id", "nombre", "produccionTotal", "unidadProduccion", "instruccionesPreparacion", "fotos", "videoProduccionURL", "formatoExpedicion", "ratioExpedicion", "tipoExpedicion", "costePorUnidad", "partidaProduccion"];
const CSV_HEADERS_COMPONENTES = ["id_elaboracion_padre", "tipo_componente", "id_componente", "cantidad", "merma"];

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

// Schemas Zod
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
  responsableRevision: z.string().optional().default(''),
});

type ElaborationFormValues = z.infer<typeof elaboracionFormSchema>;

// ----------------------------------------------------------------------
// 3. SUB-COMPONENTES LOCALES
// ----------------------------------------------------------------------

interface SortableRowProps {
    field: any;
    index: number;
    remove: (index: number) => void;
    form: any;
    erpData?: any;
}

function SortableComponentRow({ field, index, remove, form, erpData }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition,
    zIndex: transform ? 999 : 'auto' 
  };
  
  const quantity = form.watch(`componentes.${index}.cantidad`) || 0;
  const merma = form.watch(`componentes.${index}.merma`) || 0;
  const { costeTotal } = calculateCostWithPrecision(field.costePorUnidad || 0, quantity, merma);

  return (
      <TableRow ref={setNodeRef} style={style} {...attributes} className="bg-card hover:bg-muted/30">
          <TableCell className="w-8 p-1">
              <div {...listeners} className="cursor-grab text-muted-foreground p-1 hover:text-foreground transition-colors">
                  <GripVertical className="h-4 w-4" />
              </div>
          </TableCell>
          <TableCell className="font-semibold py-1 px-2 text-xs sm:text-sm min-w-[120px]">{field.nombre}</TableCell>
          <TableCell className="text-muted-foreground py-1 px-2 hidden lg:table-cell text-xs min-w-[100px]">{erpData?.nombreProveedor || '-'}</TableCell>
          <TableCell className="text-muted-foreground py-1 px-2 hidden lg:table-cell text-xs min-w-[140px] truncate" title={erpData?.nombreArticulo}>{erpData?.nombreArticulo || '-'}</TableCell>
          <TableCell className="text-right font-mono py-1 px-2 text-xs min-w-[80px]">{erpData ? formatCurrency(erpData.precioCompra) : '-'}</TableCell>
          <TableCell className="text-center font-mono py-1 px-2 text-xs min-w-[100px]">{erpData ? `${erpData.cantidadConversion} ${erpData.unidadConversion}` : '-'}</TableCell>
          <TableCell className="text-right font-mono font-bold py-1 px-2 text-xs min-w-[80px] bg-blue-50/50 dark:bg-blue-900/10">{erpData ? formatCurrency(erpData.precioUnitario) : '-'}</TableCell>
          <TableCell className="py-1 px-2 w-32">
              <FormField control={form.control} name={`componentes.${index}.cantidad`} render={({ field: qField }) => (
                  <FormItem><FormControl><Input type="number" step="any" {...qField} value={qField.value ?? ''} className="h-8 text-xs px-2 text-center" /></FormControl></FormItem>
              )} />
          </TableCell>
          <TableCell className="py-1 px-2 w-20 hidden sm:table-cell">
              <FormField control={form.control} name={`componentes.${index}.merma`} render={({ field: mField }) => (
                  <FormItem><FormControl><Input type="number" {...mField} value={mField.value ?? ''} className="h-8 text-xs px-2 text-center" /></FormControl></FormItem>
              )} />
          </TableCell>
          <TableCell className="text-right font-mono py-1 px-2 text-xs">{formatCurrency(costeTotal)}</TableCell>
          <TableCell className="py-1 px-1 w-8">
              <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-7 w-7 transition-colors" onClick={() => remove(index)}>
                  <Trash2 className="h-3.5 w-3.5" />
              </Button>
          </TableCell>
      </TableRow>
  );
}

interface ComponenteSelectorProps {
    onSelect: (comp: any) => void;
}

function ComponenteSelector({ onSelect }: ComponenteSelectorProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [ingredientes, setIngredientes] = useState<IngredienteInterno[]>([]);
    const [erpFullMap, setErpFullMap] = useState<Map<string, any>>(new Map());

    // Nota: En un refactor mayor, esto iría a un useIngredientes() hook
    useEffect(() => {
        const fetchIngredientes = async () => {
            const [{ data: ingData }, { data: erpData }] = await Promise.all([
                supabase.from('ingredientes_internos').select('*'),
                supabase.from('articulos_erp').select('*'),
            ]);
            if (ingData) setIngredientes(ingData.map((i: any) => ({
                id: i.id,
                nombreIngrediente: i.nombre_ingrediente,
                productoERPlinkId: i.producto_erp_link_id,
                alergenosPresentes: i.alergenos_presentes || [],
                alergenosTrazas: i.alergenos_trazas || [],
                historialRevisiones: []
            })));
            if (erpData) {
                const map = new Map<string, any>();
                erpData.forEach((a: any) => {
                    const precioBase = a.precio_compra || 0;
                    const descuentoPct = a.descuento || 0;
                    const precioConDescuento = precioBase * (1 - descuentoPct / 100);
                    const cantConv = a.unidad_conversion || 1;
                    const precioUnitario = precioConDescuento / cantConv;
                    
                    const erpObj = {
                        id: a.id,
                        erp_id: a.erp_id,
                        nombreArticulo: a.nombre_articulo || a.erp_id || '',
                        nombreProveedor: a.nombre_proveedor || '',
                        precioCompra: precioConDescuento,
                        precioUnitario: precioUnitario,
                        descuento: descuentoPct,
                        cantidadConversion: cantConv,
                        unidadConversion: a.unidad_medida || ''
                    };
                    if (a.id) map.set(a.id, erpObj);
                    if (a.erp_id) map.set(a.erp_id, erpObj);
                });
                setErpFullMap(map);
            }
        };
        fetchIngredientes();
    }, []);

    const filtered = ingredientes.filter(i => i.nombreIngrediente.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <DialogContent className="max-h-[80vh] flex flex-col max-w-7xl">
                <DialogHeader><DialogTitle>Añadir Ingrediente</DialogTitle></DialogHeader>
                <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar ingrediente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
                <div className="flex-1 overflow-x-auto overflow-y-auto border rounded-md mt-2">
                        <Table className="text-xs">
                                <TableHeader className="bg-muted/40 sticky top-0">
                                    <TableRow>
                                        <TableHead className="min-w-[150px]">Ingrediente</TableHead>
                                        <TableHead className="min-w-[140px]">Proveedor</TableHead>
                                        <TableHead className="min-w-[140px]">Artículo ERP</TableHead>
                                        <TableHead className="text-right min-w-[90px]">Precio Compra</TableHead>
                                        <TableHead className="text-right min-w-[100px] bg-blue-50 dark:bg-blue-900/20 font-bold">Precio/Ud</TableHead>
                                        <TableHead className="text-center min-w-[100px]">Conversión</TableHead>
                                        <TableHead className="text-right w-[60px]">Acción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                        {filtered.map(ing => {
                                            const erp = erpFullMap.get(ing.productoERPlinkId);
                                            const costePorUnidad = erp ? erp.precioUnitario : 0;
                                            return (
                                                <TableRow key={ing.id} className="hover:bg-muted/50">
                                                        <TableCell className="font-medium">{ing.nombreIngrediente}</TableCell>
                                                        <TableCell className="text-muted-foreground text-xs">{erp?.nombreProveedor || '-'}</TableCell>
                                                        <TableCell className="text-muted-foreground text-xs max-w-[140px] truncate" title={erp?.nombreArticulo}>{erp?.nombreArticulo || '-'}</TableCell>
                                                        <TableCell className="text-right font-mono font-semibold text-xs">{erp ? formatCurrency(erp.precioCompra) : '-'}</TableCell>
                                                        <TableCell className="text-right font-mono font-bold text-xs bg-blue-50/50 dark:bg-blue-900/10">{erp ? formatCurrency(erp.precioUnitario) : '-'}</TableCell>
                                                        <TableCell className="text-center font-mono text-xs">{erp ? `${erp.cantidadConversion} ${erp.unidadConversion}` : '-'}</TableCell>
                                                        <TableCell className="text-right">
                                                                <DialogClose asChild>
                                                                        <Button size="sm" onClick={() => onSelect({ id: generateId(), tipo: 'ingrediente', componenteId: ing.id, nombre: ing.nombreIngrediente, cantidad: 0, merma: 0, costePorUnidad, erpData: erp })} className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs px-2">
                                                                                <PlusCircle className="h-3 w-3 mr-1" /> Añadir
                                                                        </Button>
                                                                </DialogClose>
                                                        </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                </TableBody>
                        </Table>
                </div>
        </DialogContent>
    );
}

interface ImageGalleryModalProps {
    images: ImagenReceta[];
    initialIndex: number;
    isOpen: boolean;
    onClose: () => void;
}

function ImageGalleryModal({ images, initialIndex, isOpen, onClose }: ImageGalleryModalProps) {
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

interface ElaborationImageSectionProps {
    form: any;
    name: string;
    folder: string;
    title: string;
    description?: string;
    canUseCamera: boolean;
    instructionFieldName?: string;
}

function ElaborationImageSection({ form, name, folder, title, description, canUseCamera, instructionFieldName }: ElaborationImageSectionProps) {
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

// ----------------------------------------------------------------------
// 4. MAIN PAGE COMPONENT - LIST VIEW
// ----------------------------------------------------------------------

function ElaboracionesListPage() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const { toast } = useToast();
  
    // State
    const [items, setItems] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [importType, setImportType] = useState<'elaboraciones' | 'componentes' | null>(null);
    // Splash screen: muestra solo en carga inicial
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    // Desktop selection state
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filtro activo desde URL
  const activePartida = searchParams.get('partida') || 'ALL';
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effects (Fetch)
  const loadData = useCallback(async () => {
    // Scroll reset for UX
    window.scrollTo({ top: 0, behavior: 'instant' });
    try {
      const { data } = await supabase.from('elaboraciones').select('*').order('nombre');
      if(data) setItems(data);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

    useEffect(() => {
        // Si hay una bandera de recarga en sessionStorage, recargar y limpiar
        if (typeof window !== 'undefined' && window.sessionStorage.getItem('reloadElaboraciones')) {
            window.sessionStorage.removeItem('reloadElaboraciones');
            loadData();
            return;
        }
        loadData();
    }, [loadData]);

  // Handlers URL Params
  const handlePartidaChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if(value && value !== 'ALL') {
        params.set('partida', value);
    } else {
        params.delete('partida');
    }
    router.replace(`?${params.toString()}`);
  };

  // Handlers CSV
  const handleExportElaboracionesCSV = () => {
    const dataToExport = items.map(item => ({
        id: item.id,
        nombre: item.nombre,
        partidaProduccion: item.partida,
        produccionTotal: item.produccion_total,
        unidadProduccion: item.unidad_produccion,
        instruccionesPreparacion: item.instrucciones,
        fotos: JSON.stringify(item.fotos || []),
        videoProduccionURL: item.video_produccion_url,
        formatoExpedicion: item.formato_expedicion,
        ratioExpedicion: item.ratio_expedicion,
        tipoExpedicion: item.tipo_expedicion,
        costePorUnidad: item.coste_unitario
    }));
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'elaboraciones.csv');
    link.click();
    toast({ title: 'Exportación de Elaboraciones Completada' });
  };

  const handleExportComponentesCSV = async () => {
    const { data: allComponents } = await supabase.from('elaboracion_componentes').select('*');
    if (!allComponents) return;
    const csv = Papa.unparse(allComponents);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'componentes.csv');
    link.click();
    toast({ title: 'Exportación de Componentes Completada' });
  };

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
                let errors: string[] = [];
                let ignoredRows = 0;
                if (importType === 'elaboraciones') {
                    const importedData = results.data.map((item: any, idx: number) => {
                        let parsedFotos = [];
                        let valid = true;
                        // Validar campos obligatorios
                        if (!item.nombre || !item.partidaProduccion && !item.partida || !item.unidadProduccion) {
                            errors.push(`Fila ${idx + 2}: Faltan campos obligatorios (nombre, partida o unidad)`);
                            valid = false;
                        }
                        let produccionTotal = parseFloat(item.produccionTotal);
                        if (isNaN(produccionTotal) || produccionTotal <= 0) {
                            errors.push(`Fila ${idx + 2}: Producción total inválida`);
                            valid = false;
                        }
                        let costeUnitario = parseFloat(item.costePorUnidad);
                        if (isNaN(costeUnitario)) costeUnitario = 0;
                        try { parsedFotos = item.fotos ? JSON.parse(item.fotos) : []; } catch (e) { errors.push(`Fila ${idx + 2}: Fotos mal formateadas`); parsedFotos = []; }
                        if (!valid) { ignoredRows++; return null; }
                        return {
                                id: item.id || generateId(), 
                                nombre: item.nombre,
                                partida: item.partidaProduccion || item.partida,
                                unidad_produccion: item.unidadProduccion,
                                produccion_total: produccionTotal,
                                instrucciones: item.instruccionesPreparacion,
                                fotos: parsedFotos,
                                video_produccion_url: item.videoProduccionURL,
                                formato_expedicion: item.formatoExpedicion,
                                ratio_expedicion: parseFloat(item.ratioExpedicion) || 0,
                                tipo_expedicion: item.tipoExpedicion || 'REFRIGERADO',
                                coste_unitario: costeUnitario,
                        };
                    }).filter(Boolean);
                    const { error } = await supabase.from('elaboraciones').upsert(importedData);
                    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
                    else {
                        loadData();
                        let msg = 'Importación completada';
                        if (errors.length > 0) msg += `. Errores: ${errors.length}.`;
                        if (ignoredRows > 0) msg += ` Filas ignoradas: ${ignoredRows}.`;
                        toast({ title: msg, description: errors.length > 0 ? errors.join('\n').slice(0, 500) : undefined, variant: errors.length > 0 ? 'destructive' : 'default', duration: errors.length > 0 ? 8000 : 3000 });
                    }
                } else if (importType === 'componentes') {
                         const mappedComponents = results.data.map((item: any, idx: number) => {
                             let valid = true;
                             if (!item.id_elaboracion_padre && !item.elaboracion_padre_id) {
                                 errors.push(`Fila ${idx + 2}: Falta id_elaboracion_padre`);
                                 valid = false;
                             }
                             if (!item.tipo_componente) {
                                 errors.push(`Fila ${idx + 2}: Falta tipo_componente`);
                                 valid = false;
                             }
                             if (!item.id_componente && !item.componente_id) {
                                 errors.push(`Fila ${idx + 2}: Falta id_componente`);
                                 valid = false;
                             }
                             let cantidad = parseFloat(item.cantidad);
                             if (isNaN(cantidad)) cantidad = 0;
                             let merma = parseFloat(item.merma);
                             if (isNaN(merma)) merma = 0;
                             if (!valid) { ignoredRows++; return null; }
                             return {
                                 elaboracion_padre_id: item.id_elaboracion_padre || item.elaboracion_padre_id,
                                 tipo_componente: item.tipo_componente,
                                 componente_id: item.id_componente || item.componente_id,
                                 cantidad_neta: cantidad,
                                 merma_aplicada: merma
                             };
                         }).filter(Boolean);
                         const { error } = await supabase.from('elaboracion_componentes').upsert(mappedComponents);
                         if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
                         else {
                             let msg = 'Importación completada';
                             if (errors.length > 0) msg += `. Errores: ${errors.length}.`;
                             if (ignoredRows > 0) msg += ` Filas ignoradas: ${ignoredRows}.`;
                             toast({ title: msg, description: errors.length > 0 ? errors.join('\n').slice(0, 500) : undefined, variant: errors.length > 0 ? 'destructive' : 'default', duration: errors.length > 0 ? 8000 : 3000 });
                         }
                }
            }
        });
        if (event.target) event.target.value = '';
        setImportType(null);
    };

    // Lógica de filtrado combinada (Búsqueda + Partida URL)
    const filtered = items.filter(i => {
            const matchSearch = i.nombre.toLowerCase().includes(searchTerm.toLowerCase());
            const matchPartida = activePartida !== 'ALL' ? i.partida === activePartida : true;
            return matchSearch && matchPartida;
    });

        // Desktop: handle checkbox selection
        const isAllSelected = filtered.length > 0 && filtered.every(item => selectedIds.includes(item.id));
        const isIndeterminate = selectedIds.length > 0 && !isAllSelected;
        const handleSelectAll = () => {
                if (isAllSelected) setSelectedIds([]);
                else setSelectedIds(filtered.map(item => item.id));
        };
        const handleSelectOne = (id: string) => {
                setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        };

        // Bulk delete dialog state
        const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

        // Bulk delete handler
        const handleBulkDelete = async () => {
            try {
                if (selectedIds.length === 0) return;
                const { error } = await supabase.from('elaboraciones').delete().in('id', selectedIds);
                if (error) throw error;
                setSelectedIds([]);
                loadData();
                toast({ title: 'Elaboraciones eliminadas' });
            } catch (e) {
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar.' });
            } finally {
                setShowBulkDeleteConfirm(false);
            }
        };

  if (isInitialLoading) {
    return <LoadingSkeleton title="Cargando Elaboraciones..." />;
  }

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto pb-24">
         <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileSelected} />

         {/* TOOLBAR */}
         <div className="flex flex-col gap-4 sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
            
            <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center justify-between">
                {/* Search & Filter Group */}
                <div className="flex flex-1 gap-2 w-full max-w-2xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar elaboración..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="pl-9 h-9 text-sm bg-background"
                        />
                    </div>
                    <div className="w-[180px]">
                        <Select value={activePartida} onValueChange={handlePartidaChange}>
                            <SelectTrigger className="h-9">
                                <div className="flex items-center gap-2 truncate">
                                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                    <SelectValue placeholder="Partida" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas las partidas</SelectItem>
                                {PARTIDAS_PRODUCCION.map(p => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Actions Group */}
                <div className="flex gap-2 w-full sm:w-auto">
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
         </div>

         {/* VISTA MÓVIL */}
         <div className="grid grid-cols-1 gap-3 md:hidden">
            {filtered.map(item => (
                <div 
                    key={item.id} 
                    className={`bg-card border-l-4 rounded-lg p-3 shadow-sm active:scale-[0.98] transition-all cursor-pointer group ${item.requiere_revision ? 'border-l-amber-500 border-r border-t border-b border-amber-200 bg-amber-50/30' : 'border-l-primary/20 border-r border-t border-b'}`}
                    onClick={() => router.push(`/book/elaboraciones/${item.id}`)}
                >
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2 flex-1">
                            <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{item.nombre}</span>
                            {item.requiere_revision && <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />}
                        </div>
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

                 {/* VISTA DESKTOP */}
                 <div className="hidden md:block">
                     {selectedIds.length > 0 && (
                         <div className="flex justify-end mb-2">
                             <Button
                                 variant="destructive"
                                 size="sm"
                                 className="h-8 px-3 text-xs shadow"
                                 onClick={() => setShowBulkDeleteConfirm(true)}
                             >
                                 <Trash2 className="h-4 w-4 mr-1" /> Borrar seleccionados
                             </Button>
                         </div>
                     )}
                     <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                        <Table>
                <TableHeader className="bg-muted/40">
                    <TableRow>
                                                <TableHead className="w-8 pl-2 pr-1 align-middle">
                                                    <input
                                                        type="checkbox"
                                                        className="accent-blue-600 h-4 w-4 align-middle"
                                                        checked={isAllSelected}
                                                        ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                                                        onChange={handleSelectAll}
                                                        aria-label="Seleccionar todas"
                                                    />
                                                </TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Partida</TableHead>
                        <TableHead className="text-right">Coste / Ud.</TableHead>
                        <TableHead className="text-right w-[60px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filtered.map(item => (
                        <TableRow key={item.id} className={`${selectedIds.includes(item.id) ? "bg-blue-50/40" : item.requiere_revision ? "bg-amber-50/40 hover:bg-amber-50/60" : "cursor-pointer hover:bg-muted/50"} group transition-colors`}>
                                                        <TableCell className="w-8 pl-2 pr-1 align-middle">
                                                            <input
                                                                type="checkbox"
                                                                className="accent-blue-600 h-4 w-4 align-middle"
                                                                checked={selectedIds.includes(item.id)}
                                                                onChange={() => handleSelectOne(item.id)}
                                                                onClick={e => e.stopPropagation()}
                                                                aria-label="Seleccionar elaboración"
                                                            />
                                                        </TableCell>
                            <TableCell className="font-medium" onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>
                                <div className="flex items-center gap-2">
                                    <span>{item.nombre}</span>
                                    {item.requiere_revision && <AlertCircle className="h-4 w-4 text-amber-600" />}
                                </div>
                            </TableCell>
                            <TableCell onClick={() => router.push(`/book/elaboraciones/${item.id}`)}><Badge variant="outline" className="font-normal">{item.partida}</Badge></TableCell>
                            <TableCell className="text-right font-mono text-sm" onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>{formatCurrency(item.coste_unitario)} / {formatUnit(item.unidad_produccion)}</TableCell>
                            <TableCell className="text-right" onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>
                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </TableCell>
                        </TableRow>
                    ))}
                    {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No se encontraron elaboraciones.</TableCell></TableRow>}
                </TableBody>
                </Table>
              </div>
            </div>
        {/* Bulk delete confirmation dialog */}
        <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar seleccionados?</AlertDialogTitle>
                    <AlertDialogDescription>Esta acción eliminará todas las elaboraciones seleccionadas. ¿Desea continuar?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </div>
  )
}

// ----------------------------------------------------------------------
// 5. MAIN PAGE COMPONENT - FORM VIEW
// ----------------------------------------------------------------------

function ElaborationFormPage() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const searchParams = useSearchParams() ?? new URLSearchParams();

  // Params Handling
  const idParam = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;
  const isNew = idParam === 'nueva' || !idParam;
  const isEditing = !isNew && idParam;
  const cloneId = searchParams.get('cloneId');

  // URL Driven Tabs Logic
  const currentTab = searchParams.get('tab') || 'general';
  const handleTabChange = (val: string) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', val);
      router.replace(`?${newParams.toString()}`, { scroll: false });
  };

  // Local State
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isProduccionDialogOpen, setIsProduccionDialogOpen] = useState(false);
  const [ingredientesMap, setIngredientesMap] = useState<Map<string, IngredienteInterno>>(new Map());
  const [canUseCamera, setCanUseCamera] = useState(false);
  const [mediaProducciones, setMediaProducciones] = useState<MediaProducciones | null>(null);
  const [reloadProduccionesTrigger, setReloadProduccionesTrigger] = useState(0);

  // DnD Sensors
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  // Form Setup
  const form = useForm<ElaborationFormValues>({
    resolver: zodResolver(elaboracionFormSchema),
    defaultValues: {
      id: '', nombre: '', produccionTotal: 1, unidadProduccion: 'KG', partidaProduccion: 'FRIO', componentes: [],
      tipoExpedicion: 'REFRIGERADO', formatoExpedicion: '', ratioExpedicion: 0, instruccionesPreparacion: '', videoProduccionURL: '', fotos: [],
      requiereRevision: false, comentarioRevision: '', fechaRevision: null, responsableRevision: '',
    }
  });

  const { fields: compFields, append: appendComp, remove: removeComp, move: moveComp } = useFieldArray({ control: form.control, name: "componentes" });
  const watchedComponentes = form.watch('componentes');
  const watchedProduccionTotal = form.watch('produccionTotal');

  // Load Data
  useEffect(() => {
    // Scroll Reset
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Check Media
    setCanUseCamera(typeof navigator !== 'undefined' && !!navigator.mediaDevices);

    const loadElaboration = async () => {
      try {
        setIsDataLoaded(false);
        const [ingRes, erpRes] = await Promise.all([
          supabase.from('ingredientes_internos').select('*'),
          supabase.from('articulos_erp').select('*')
        ]);
        
        const erpMap = new Map<string, number>();
        const erpFullMap = new Map<string, any>();
        (erpRes.data || []).forEach((a: any) => {
             const descuentoPct = a.descuento || 0;
             const precioBase = a.precio_compra || 0;
             const precioConDescuento = precioBase * (1 - descuentoPct / 100);
             const cantConv = a.unidad_conversion || 1;
             const precioUnitario = precioConDescuento / cantConv;
             
             const erpData = {
               id: a.id,
               erp_id: a.erp_id,
               nombreArticulo: a.nombre_articulo || a.erp_id || 'Sin nombre',
               nombreProveedor: a.nombre_proveedor || 'Sin proveedor',
               precioCompra: precioConDescuento,
               precioUnitario: precioUnitario,
               descuento: descuentoPct,
               cantidadConversion: cantConv,
               unidadConversion: a.unidad_medida || 'UN'
             };
             if(a.id) {
               erpMap.set(a.id, precioUnitario);
               erpFullMap.set(a.id, erpData);
             }
             if(a.erp_id) {
               erpMap.set(a.erp_id, precioUnitario);
               erpFullMap.set(a.erp_id, erpData);
             }
        });

        const ingMap = new Map<string, IngredienteInterno>();
        (ingRes.data || []).forEach((i: any) => {
            const ing: IngredienteInterno = {
                id: i.id, nombreIngrediente: i.nombre_ingrediente, productoERPlinkId: i.producto_erp_link_id,
                alergenosPresentes: i.alergenos_presentes, alergenosTrazas: i.alergenos_trazas, historialRevisiones: []
            };
            (ing as any).coste = erpMap.get(i.producto_erp_link_id) || 0;
            (ing as any).erpData = erpFullMap.get(i.producto_erp_link_id);
            ingMap.set(i.id, ing);
        });
        setIngredientesMap(ingMap);

        let elabToLoad: Partial<ElaborationFormValues> | null = null;
        const targetId = isEditing ? idParam : cloneId;

        if (targetId && targetId !== 'nueva') {
            const { data: elabData } = await supabase.from('elaboraciones').select('*').eq('id', targetId).single();
            if (elabData) {
                const { data: compsData } = await supabase.from('elaboracion_componentes').select('*').eq('elaboracion_padre_id', targetId);
                
                const components = (compsData || []).map((c: any) => {
                   const ing = ingMap.get(c.componente_id);
                   return {
                       id: generateId(),
                       tipo: c.tipo_componente === 'ARTICULO' ? 'ingrediente' : 'elaboracion',
                       componenteId: c.componente_id,
                       nombre: ing?.nombreIngrediente || 'Desconocido',
                       cantidad: c.cantidad_neta || 0,
                       merma: c.merma_aplicada || 0,
                       costePorUnidad: (ing as any)?.coste || 0,
                       erpData: (ing as any)?.erpData
                   };
                });

                elabToLoad = {
                    id: isEditing ? elabData.id : generateId(),
                    nombre: cloneId ? `${elabData.nombre} (Copia)` : elabData.nombre,
                    partidaProduccion: (elabData.partida || 'FRIO') as any, 
                    unidadProduccion: (elabData.unidad_produccion || 'KG') as any, 
                    produccionTotal: elabData.produccion_total || 1,
                    caducidadDias: elabData.caducidad_dias || 0,
                    instruccionesPreparacion: elabData.instrucciones || '',
                    fotos: (elabData.fotos || []).map((url: any) => typeof url === 'string' ? { url } : url),
                    videoProduccionURL: elabData.video_produccion_url || '',
                    formatoExpedicion: elabData.formato_expedicion || '',
                    ratioExpedicion: elabData.ratio_expedicion || 0,
                    tipoExpedicion: (elabData.tipo_expedicion || 'REFRIGERADO') as any,
                    requiereRevision: elabData.requiere_revision || false,
                    comentarioRevision: elabData.comentario_revision || '',
                    fechaRevision: elabData.fecha_revision || null,
                    responsableRevision: elabData.responsable_revision || '',
                    componentes: components as any 
                };
            }
        } else {
             elabToLoad = { 
                 id: generateId(), 
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

  // Derived Calculations
  const { costeTotal, costeUnitario, alergenos } = useMemo(() => {
     let costeDecimal = new Decimal(0);
     const prod = new Decimal(watchedProduccionTotal || 1);
     
     (watchedComponentes || []).forEach(c => {
         const { costePreciso } = calculateCostWithPrecision(c.costePorUnidad || 0, c.cantidad || 0, c.merma || 0);
         costeDecimal = costeDecimal.plus(costePreciso);
     });
     
     const costeUnitarioDecimal = costeDecimal.dividedBy(prod);
     
     return {
         costeTotal: parseFloat(costeDecimal.toString()),
         costeUnitario: parseFloat(costeUnitarioDecimal.toString()),
         alergenos: calculateElabAlergenos(watchedComponentes || [], ingredientesMap)
     };
  }, [watchedComponentes, watchedProduccionTotal, ingredientesMap]);

  // Handlers
  function handleDragEnd(event: DragEndEvent) {
      const { active, over } = event;
      if (over && active.id !== over.id) {
          const oldIndex = compFields.findIndex(item => item.id === active.id);
          const newIndex = compFields.findIndex(item => item.id === over.id);
          moveComp(oldIndex, newIndex);
      }
  }

  const onSubmit = async (data: ElaborationFormValues) => {
    setIsLoading(true);
    try {
      // Obtener usuario autenticado
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user?.email || 'Sistema';

      // Si requiere revisión, auto-capturar fecha y responsable
      if (data.requiereRevision) {
        form.setValue('responsableRevision', currentUser);
        form.setValue('fechaRevision', new Date().toISOString());
      }

      // Re-obtener los valores del formulario después de las actualizaciones
      const updatedData = form.getValues();

      const elaboracionData: any = {
        id: updatedData.id,
        nombre: updatedData.nombre,
        partida: updatedData.partidaProduccion,
        unidad_produccion: updatedData.unidadProduccion,
        instrucciones: updatedData.instruccionesPreparacion,
        produccion_total: updatedData.produccionTotal,
        coste_unitario: costeUnitario,
        caducidad_dias: updatedData.caducidadDias,
        fotos: updatedData.fotos, 
        video_produccion_url: updatedData.videoProduccionURL,
        formato_expedicion: updatedData.formatoExpedicion,
        ratio_expedicion: updatedData.ratioExpedicion,
        tipo_expedicion: updatedData.tipoExpedicion
      };

      // Agregar campos de revisión solo si es necesario
      // (Verificar si existen en el schema antes de intentar guardar)
      if (updatedData.requiereRevision !== undefined) {
        elaboracionData.requiere_revision = updatedData.requiereRevision;
        elaboracionData.comentario_revision = updatedData.comentarioRevision;
        elaboracionData.fecha_revision = updatedData.requiereRevision ? updatedData.fechaRevision : null;
        elaboracionData.responsable_revision = updatedData.requiereRevision ? updatedData.responsableRevision : null;
      }

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

      toast({ description: 'Elaboración guardada correctamente.' });
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

  return (
    <TooltipProvider>
      <main className="pb-24 bg-background min-h-screen">
        <FormProvider {...form}>
            <form id="elaboration-form" onSubmit={form.handleSubmit(onSubmit)}>
                
                {/* TABS HEADER */}
                <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm">
                     {/* Tabs */}
                     <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                         <div className="max-w-7xl mx-auto px-2 sm:px-4 overflow-x-auto">
                             <TabsList className="w-full justify-start bg-transparent p-0 h-10 sm:h-12 gap-0 rounded-none flex">
                                    {["Info. General", "Componentes", "Info. Preparación", "Producciones"].map((tab, i) => {
                                        const val = ["general", "componentes", "preparacion", "producciones"][i];
                                        return (
                                            <TabsTrigger 
                                                key={val} 
                                                value={val} 
                                                className="rounded-none border-b-2 border-transparent px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent transition-all hover:text-foreground whitespace-nowrap flex-shrink-0"
                                            >
                                                {tab}
                                            </TabsTrigger>
                                        )
                                    })}
                                </TabsList>
                         </div>

                        {/* CONTENT AREA */}
                        <div className="max-w-7xl mx-auto bg-background pb-32 px-4 pt-4">
                            
                            {/* TAB: GENERAL */}
                            <TabsContent value="general" className="space-y-4 mt-0">
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

                                <Card className="shadow-none border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
                                    <CardHeader className="p-3 pb-1 border-b border-amber-200 bg-amber-100/30 dark:bg-amber-900/20"><CardTitle className="text-sm font-bold text-amber-900 dark:text-amber-100">Revisión Requerida</CardTitle></CardHeader>
                                    <CardContent className="p-3 space-y-3">
                                        <FormField control={form.control} name="requiereRevision" render={({ field }) => (
                                            <FormItem className="flex items-center gap-3 space-y-0">
                                                <FormControl>
                                                    <input 
                                                        type="checkbox"
                                                        checked={field.value || false}
                                                        onChange={(e) => field.onChange(e.target.checked)}
                                                        className="h-4 w-4 accent-amber-600 rounded"
                                                    />
                                                </FormControl>
                                                <FormLabel className="text-sm font-medium text-amber-900 dark:text-amber-100 cursor-pointer">¿Requiere revisión?</FormLabel>
                                            </FormItem>
                                        )} />
                                        
                                        {form.watch('requiereRevision') && (
                                            <>
                                                <FormField control={form.control} name="comentarioRevision" render={({ field }) => (
                                                    <FormItem className="space-y-0.5">
                                                        <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Comentarios</FormLabel>
                                                        <FormControl>
                                                            <Textarea {...field} value={field.value ?? ''} rows={3} placeholder="Describir qué requiere revisión..." className="resize-none text-sm" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Responsable</FormLabel>
                                                        <div className="flex items-center h-8 px-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                                                            {form.watch('responsableRevision') || '—'}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <FormLabel className="text-[10px] uppercase font-bold text-muted-foreground">Fecha de Revisión</FormLabel>
                                                        <div className="flex items-center h-8 px-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                                                            {form.watch('fechaRevision') ? new Date(form.watch('fechaRevision')).toLocaleDateString('es-ES') : '—'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>

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

                            {/* TAB: COMPONENTES */}
                            <TabsContent value="componentes" className="space-y-4 mt-0">
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

                                <Card className="shadow-none border border-border/60">
                                                                        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between bg-muted/10 border-b">
                                                                                <CardTitle className="text-sm font-bold">Componentes</CardTitle>
                                                                                <div className="flex gap-2 items-center">
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        className="h-7 text-xs bg-background"
                                                                                        onClick={() => {
                                                                                            // Recalcular costes: actualiza el form con los nuevos costes
                                                                                            const comps = form.getValues('componentes');
                                                                                            let total = 0;
                                                                                            const nuevos = comps.map((c: any, idx: number) => {
                                                                                                const cantidad = Number(c.cantidad) || 0;
                                                                                                const merma = Number(c.merma) || 0;
                                                                                                const costePorUnidad = Number(c.costePorUnidad) || 0;
                                                                                                const costeTotal = costePorUnidad * cantidad * (1 + merma / 100);
                                                                                                total += costeTotal;
                                                                                                return { ...c, recalculado: true };
                                                                                            });
                                                                                            form.setValue('componentes', nuevos, { shouldDirty: true });
                                                                                            // Forzar recalculo de totales (ya que useMemo depende de watchedComponentes)
                                                                                            form.trigger('componentes');
                                                                                            toast({ title: 'Costes recalculados', description: 'Los costes han sido actualizados con los valores actuales.', duration: 2000 });
                                                                                        }}
                                                                                        title="Recalcular costes"
                                                                                    >
                                                                                        <Euro className="h-3.5 w-3.5 mr-1" /> Recalcular
                                                                                    </Button>
                                                                                    <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                                                                                        <DialogTrigger asChild><Button variant="outline" size="sm" className="h-7 text-xs bg-background"><PlusCircle className="h-3.5 w-3.5 mr-1" /> Añadir</Button></DialogTrigger>
                                                                                        <ComponenteSelector onSelect={(comp) => { appendComp(comp); setIsSelectorOpen(false); }} />
                                                                                    </Dialog>
                                                                                </div>
                                                                        </CardHeader>
                                    <CardContent className="p-0 sm:p-2">
                                        <div className="hidden md:block overflow-x-auto">
                                            <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                                                <Table>
                                                    <TableHeader><TableRow><TableHead className="w-8"></TableHead><TableHead>Nombre</TableHead><TableHead className="hidden lg:table-cell">Proveedor</TableHead><TableHead className="hidden lg:table-cell">Artículo ERP</TableHead><TableHead className="text-right">P. Compra</TableHead><TableHead className="text-center">Conversión</TableHead><TableHead className="text-right bg-blue-50 dark:bg-blue-900/20 font-bold">Precio/Ud</TableHead><TableHead className="w-24 text-center">Cant.</TableHead><TableHead className="hidden sm:table-cell w-20 text-center">Merma</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-8"></TableHead></TableRow></TableHeader>
                                                    <SortableContext items={compFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                                        <TableBody>
                                                            {compFields.map((field, index) => <SortableComponentRow key={field.id} field={field} index={index} remove={removeComp} form={form} erpData={(field as any).erpData} />)}
                                                        </TableBody>
                                                    </SortableContext>
                                                </Table>
                                            </DndContext>
                                        </div>

                                        {/* Mobile List */}
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

                                {alergenos.length > 0 && (
                                    <Card className="shadow-sm border border-red-200 bg-red-50/50 dark:bg-red-950/10">
                                        <CardHeader className="p-2 pb-1"><CardTitle className="text-sm font-bold flex items-center gap-2 text-red-700"><AlertTriangle className="h-3.5 w-3.5" /> Alérgenos Totales</CardTitle></CardHeader>
                                        <CardContent className="p-2 flex flex-wrap gap-1.5 pt-0">{alergenos.map(a => <AllergenBadge key={a} allergen={a} />)}</CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            {/* TAB: PREPARACIÓN */}
                            <TabsContent value="preparacion" className="space-y-4 mt-0">
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

                            {/* TAB: PRODUCCIONES */}
                            {isEditing && (
                              <TabsContent value="producciones" className="space-y-4 mt-0">
                                <div className="bg-card border rounded-t-none border-t-0 rounded-lg p-4 shadow-sm">
                                  <ProduccionesTab
                                    key={reloadProduccionesTrigger}
                                    elaboracionId={idParam as string}
                                    componentesBase={watchedComponentes || []}
                                    cantidadPlanificada={watchedProduccionTotal || 1}
                                    onProduccionesLoaded={setMediaProducciones}
                                    onAñadirClick={() => setIsProduccionDialogOpen(true)}
                                  />
                                </div>
                              </TabsContent>
                            )}
                        </div>
                    </Tabs>
                </div>

                {/* FAB ACTIONS */}
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
      </main>

      {/* Dialogs - Fuera de main para máximo aislamiento */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>¿Eliminar elaboración?</AlertDialogTitle><AlertDialogDescription>Acción irreversible.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive">Eliminar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {isEditing && (
          <AñadirProduccionDialog
            isOpen={isProduccionDialogOpen}
            onClose={() => setIsProduccionDialogOpen(false)}
            elaboracionId={idParam as string}
            componentesBase={watchedComponentes || []}
            cantidadPlanificada={watchedProduccionTotal || 1}
            unidadProduccion={form.watch('unidadProduccion')}
            onSuccess={() => {
              setIsProduccionDialogOpen(false);
              setReloadProduccionesTrigger(prev => prev + 1);
            }}
          />
        )}
    </TooltipProvider>
  );
}

// ----------------------------------------------------------------------
// 6. DEFAULT EXPORT & ROUTING LOGIC
// ----------------------------------------------------------------------

export default function ElaboracionesPage() {
  const params = useParams();
  
  // Determinamos si es vista de lista o detalle basándonos en la existencia de ID
  const hasId = params?.id && (Array.isArray(params.id) ? params.id.length > 0 : !!params.id);

  return (
    <Suspense fallback={<LoadingSkeleton title="Cargando sistema..." />}>
      {!hasId ? <ElaboracionesListPage /> : <ElaborationFormPage />}
    </Suspense>
  );
}