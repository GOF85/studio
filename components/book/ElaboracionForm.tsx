'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Decimal from 'decimal.js';
import { 
    DndContext, 
    closestCenter, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors,
    type DragEndEvent 
} from '@dnd-kit/core';
import { 
    SortableContext, 
    verticalListSortingStrategy, 
    useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
    Save, 
    Trash2, 
    PlusCircle, 
    GripVertical, 
    Search, 
    Image as ImageIcon, 
    AlertCircle,
    X,
    ChevronLeft,
    ChevronRight,
    Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

import { useToast } from '@/hooks/use-toast';
import { ImageManager } from '@/components/book/images/ImageManager';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { ProduccionesTab } from '@/components/elaboraciones/producciones-tab';
import { formatCurrency, formatUnit } from '@/lib/utils';
import { PARTIDAS_PRODUCCION, UNIDADES_MEDIDA } from '@/types';
import type { Elaboracion, IngredienteInterno, Alergeno, ComponenteElaboracion, ImagenReceta } from '@/types';
import Image from 'next/image';

// Configurar precisión de Decimal.js
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

// ----------------------------------------------------------------------
// SCHEMAS
// ----------------------------------------------------------------------

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

export type ElaborationFormValues = z.infer<typeof elaboracionFormSchema>;

// ----------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------

const calculateCostWithPrecision = (
  precioUnitario: number,
  cantidad: number,
  merma: number = 0
): { costeTotal: number; costePreciso: Decimal } => {
  try {
    const precio = new Decimal(precioUnitario || 0);
    const cant = new Decimal(cantidad || 0);
    const mermaDecimal = new Decimal(merma || 0);
    
    const factor = new Decimal(1).plus(mermaDecimal.dividedBy(100));
    const costePreciso = precio.times(factor).times(cant);
    
    return {
      costeTotal: parseFloat(costePreciso.toString()),
      costePreciso
    };
  } catch (e) {
    return { costeTotal: 0, costePreciso: new Decimal(0) };
  }
};

const calculateElabAlergenos = (
    componentes: any[], 
    ingredientes: IngredienteInterno[],
    elaboraciones: any[]
): Alergeno[] => {
  const elabAlergenos = new Set<Alergeno>();
  
  componentes.forEach(comp => {
    if (comp.tipo === 'ingrediente') {
      const ingData = ingredientes.find(i => i.id === comp.componenteId);
      if (ingData) {
        (ingData.alergenosPresentes || []).forEach(a => elabAlergenos.add(a));
        (ingData.alergenosTrazas || []).forEach(a => elabAlergenos.add(a));
      }
    } else if (comp.tipo === 'elaboracion') {
        const elabData = elaboraciones.find(e => e.id === comp.componenteId);
        if (elabData && elabData.alergenos) {
            elabData.alergenos.forEach((a: Alergeno) => elabAlergenos.add(a));
        }
    }
  });
  
  return Array.from(elabAlergenos);
};

const generateId = () => Math.random().toString(36).substring(2, 15);

// ----------------------------------------------------------------------
// SUB-COMPONENTS
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

function ComponenteSelector({ 
    onSelect, 
    ingredientes, 
    elaboraciones, 
    articulosERP 
}: { 
    onSelect: (comp: any) => void, 
    ingredientes: IngredienteInterno[], 
    elaboraciones: any[],
    articulosERP: any[]
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [tab, setTab] = useState<'ingredientes' | 'elaboraciones'>('ingredientes');

    const erpFullMap = useMemo(() => {
        const map = new Map<string, any>();
        articulosERP.forEach((a: any) => {
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
        return map;
    }, [articulosERP]);

    const filteredIngredientes = ingredientes.filter(i => i.nombreIngrediente.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredElaboraciones = elaboraciones.filter(e => e.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <DialogContent className="max-h-[80vh] flex flex-col max-w-7xl">
            <DialogHeader>
                <DialogTitle>Añadir Componente</DialogTitle>
                <DialogDescription className="sr-only">
                    Busca y añade ingredientes o elaboraciones a la receta.
                </DialogDescription>
            </DialogHeader>
            
            <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
                    <TabsTrigger value="elaboraciones">Elaboraciones</TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="relative mt-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto border rounded-md mt-2">
                <Table className="text-xs">
                    <TableHeader className="bg-muted/40 sticky top-0">
                        <TableRow>
                            <TableHead className="min-w-[150px]">Nombre</TableHead>
                            {tab === 'ingredientes' && (
                                <>
                                    <TableHead className="min-w-[140px]">Proveedor</TableHead>
                                    <TableHead className="min-w-[140px]">Artículo ERP</TableHead>
                                    <TableHead className="text-right min-w-[90px]">Precio Compra</TableHead>
                                </>
                            )}
                            <TableHead className="text-right min-w-[100px] bg-blue-50 dark:bg-blue-900/20 font-bold">Precio/Ud</TableHead>
                            {tab === 'ingredientes' && <TableHead className="text-center min-w-[100px]">Conversión</TableHead>}
                            <TableHead className="text-right w-[60px]">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tab === 'ingredientes' ? (
                            filteredIngredientes.map(ing => {
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
                            })
                        ) : (
                            filteredElaboraciones.map(elab => (
                                <TableRow key={elab.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">{elab.nombre}</TableCell>
                                    <TableCell className="text-right font-mono font-bold text-xs bg-blue-50/50 dark:bg-blue-900/10">{formatCurrency(elab.costeUnitario)}</TableCell>
                                    <TableCell className="text-right">
                                        <DialogClose asChild>
                                            <Button size="sm" onClick={() => onSelect({ id: generateId(), tipo: 'elaboracion', componenteId: elab.id, nombre: elab.nombre, cantidad: 0, merma: 0, costePorUnidad: elab.costeUnitario })} className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs px-2">
                                                <PlusCircle className="h-3 w-3 mr-1" /> Añadir
                                            </Button>
                                        </DialogClose>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
    );
}

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
                    Visualización de imágenes de la elaboración.
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

function ElaborationImageSection({ form, name, folder, title, description, canUseCamera, instructionFieldName }: { form: any, name: string, folder: string, title: string, description?: string, canUseCamera: boolean, instructionFieldName?: string }) {
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
// MAIN FORM COMPONENT
// ----------------------------------------------------------------------

interface ElaboracionFormProps {
    elaboracion?: any;
    ingredientes: IngredienteInterno[];
    elaboraciones: any[];
    articulosERP: any[];
    onSave: (data: ElaborationFormValues) => void;
    onDelete?: () => void;
    isSaving?: boolean;
}

export function ElaboracionForm({ 
    elaboracion, 
    ingredientes, 
    elaboraciones, 
    articulosERP, 
    onSave, 
    onDelete,
    isSaving 
}: ElaboracionFormProps) {
    const [currentTab, setCurrentTab] = useState('general');
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [canUseCamera, setCanUseCamera] = useState(false);

    useEffect(() => {
        setCanUseCamera(typeof navigator !== 'undefined' && !!navigator.mediaDevices);
    }, []);

    const form = useForm<ElaborationFormValues>({
        resolver: zodResolver(elaboracionFormSchema),
        defaultValues: {
            id: elaboracion?.id || generateId(),
            nombre: elaboracion?.nombre || '',
            partidaProduccion: elaboracion?.partidaProduccion || 'FRIO',
            unidadProduccion: elaboracion?.unidadProduccion || 'KG',
            produccionTotal: elaboracion?.produccionTotal || 1,
            caducidadDias: elaboracion?.caducidadDias || 0,
            instruccionesPreparacion: elaboracion?.instruccionesPreparacion || '',
            fotos: elaboracion?.fotos || [],
            videoProduccionURL: elaboracion?.videoProduccionURL || '',
            formatoExpedicion: elaboracion?.formatoExpedicion || '',
            ratioExpedicion: elaboracion?.ratioExpedicion || 0,
            tipoExpedicion: elaboracion?.tipoExpedicion || 'REFRIGERADO',
            componentes: elaboracion?.componentes || [],
            requiereRevision: elaboracion?.requiereRevision || false,
            comentarioRevision: elaboracion?.comentarioRevision || '',
            fechaRevision: elaboracion?.fechaRevision || null,
            responsableRevision: elaboracion?.responsableRevision || '',
        }
    });

    const { fields: compFields, append: appendComp, remove: removeComp, move: moveComp } = useFieldArray({ 
        control: form.control, 
        name: "componentes" 
    });

    const watchedComponentes = form.watch('componentes');
    const watchedProduccionTotal = form.watch('produccionTotal');
    const watchedUnidadProduccion = form.watch('unidadProduccion');

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

    const { costeTotal, costeUnitario, alergenos } = useMemo(() => {
        let costeDecimal = new Decimal(0);
        const prod = new Decimal(watchedProduccionTotal || 1);
        
        (watchedComponentes || []).forEach(c => {
            const { costePreciso } = calculateCostWithPrecision(c.costePorUnidad || 0, c.cantidad || 0, c.merma || 0);
            costeDecimal = costeDecimal.plus(costePreciso);
        });
        
        const costeUnitarioDecimal = prod.gt(0) ? costeDecimal.dividedBy(prod) : new Decimal(0);
        
        return {
            costeTotal: parseFloat(costeDecimal.toString()),
            costeUnitario: parseFloat(costeUnitarioDecimal.toString()),
            alergenos: calculateElabAlergenos(watchedComponentes || [], ingredientes, elaboraciones)
        };
    }, [watchedComponentes, watchedProduccionTotal, ingredientes, elaboraciones]);

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = compFields.findIndex(item => item.id === active.id);
            const newIndex = compFields.findIndex(item => item.id === over.id);
            moveComp(oldIndex, newIndex);
        }
    }

    const erpFullMap = useMemo(() => {
        const map = new Map<string, any>();
        articulosERP.forEach((a: any) => {
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
        return map;
    }, [articulosERP]);

    const onSubmit = (data: ElaborationFormValues) => {
        onSave({
            ...data,
            costeUnitario // Incluimos el coste calculado
        } as any);
    };

    return (
        <TooltipProvider>
            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm -mx-6 px-6">
                        <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
                            <div className="flex items-center gap-4">
                                <h1 className="text-xl font-bold truncate max-w-[300px]">
                                    {elaboracion ? `Editar: ${elaboracion.nombre}` : 'Nueva Elaboración'}
                                </h1>
                                <div className="flex gap-1">
                                    {alergenos.map(a => <AllergenBadge key={a} allergen={a} />)}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Guardar
                                </Button>
                                {onDelete && (
                                    <Button type="button" variant="destructive" onClick={onDelete} disabled={isSaving}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                            <div className="max-w-7xl mx-auto">
                                <TabsList className="w-full justify-start bg-transparent p-0 h-12 gap-6 rounded-none">
                                    <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0">General</TabsTrigger>
                                    <TabsTrigger value="componentes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0">Componentes</TabsTrigger>
                                    <TabsTrigger value="preparacion" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0">Preparación</TabsTrigger>
                                    <TabsTrigger value="producciones" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0">Producciones</TabsTrigger>
                                </TabsList>
                            </div>
                        </Tabs>
                    </div>

                    <div className="max-w-7xl mx-auto">
                        <TabsContent value="general" className="mt-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="md:col-span-2">
                                    <CardHeader><CardTitle>Información Básica</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="nombre" render={({ field }) => (
                                            <FormItem className="sm:col-span-2">
                                                <FormLabel>Nombre de la Elaboración</FormLabel>
                                                <FormControl><Input {...field} placeholder="Ej: Salsa Brava Casera" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="partidaProduccion" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Partida</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar partida" /></SelectTrigger></FormControl>
                                                    <SelectContent>{PARTIDAS_PRODUCCION.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="unidadProduccion" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Unidad de Producción</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar unidad" /></SelectTrigger></FormControl>
                                                    <SelectContent>{UNIDADES_MEDIDA.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="produccionTotal" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Producción Total</FormLabel>
                                                <FormControl><Input type="number" step="any" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="caducidadDias" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Caducidad (Días)</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle>Resumen de Costes</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                            <span className="text-sm font-medium">Coste Total:</span>
                                            <span className="text-lg font-bold font-mono">{formatCurrency(costeTotal)}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                                            <span className="text-sm font-bold text-primary">Coste / {formatUnit(watchedUnidadProduccion)}:</span>
                                            <span className="text-xl font-black font-mono text-primary">{formatCurrency(costeUnitario)}</span>
                                        </div>
                                        <Separator />
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-muted-foreground">Alérgenos Detectados</Label>
                                            <div className="flex flex-wrap gap-1">
                                                {alergenos.length > 0 ? alergenos.map(a => <AllergenBadge key={a} allergen={a} />) : <span className="text-xs text-muted-foreground italic">Ninguno</span>}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader><CardTitle>Expedición y Logística</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <FormField control={form.control} name="tipoExpedicion" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo Expedición</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {['REFRIGERADO', 'CONGELADO', 'AMBIENTE', 'CALIENTE'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="formatoExpedicion" render={({ field }) => (
                                        <FormItem className="sm:col-span-2">
                                            <FormLabel>Formato de Expedición</FormLabel>
                                            <FormControl><Input {...field} placeholder="Ej: Cubeta GN 1/2" /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="ratioExpedicion" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ratio (Ud/Formato)</FormLabel>
                                            <FormControl><Input type="number" step="any" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="componentes" className="mt-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Ingredientes y Sub-elaboraciones</CardTitle>
                                    <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                                <PlusCircle className="h-4 w-4 mr-2" /> Añadir Componente
                                            </Button>
                                        </DialogTrigger>
                                        <ComponenteSelector 
                                            onSelect={(comp) => appendComp(comp)} 
                                            ingredientes={ingredientes} 
                                            elaboraciones={elaboraciones.filter(e => e.id !== form.getValues('id'))} 
                                            articulosERP={articulosERP} 
                                        />
                                    </Dialog>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="w-8"></TableHead>
                                                    <TableHead>Componente</TableHead>
                                                    <TableHead className="hidden lg:table-cell">Proveedor</TableHead>
                                                    <TableHead className="hidden lg:table-cell">Artículo ERP</TableHead>
                                                    <TableHead className="text-right">P. Compra</TableHead>
                                                    <TableHead className="text-center">Conversión</TableHead>
                                                    <TableHead className="text-right bg-blue-50/50 dark:bg-blue-900/10">P. Unitario</TableHead>
                                                    <TableHead className="w-32">Cantidad</TableHead>
                                                    <TableHead className="w-20 hidden sm:table-cell">Merma %</TableHead>
                                                    <TableHead className="text-right">Subtotal</TableHead>
                                                    <TableHead className="w-8"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                                    <SortableContext items={compFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                                        {compFields.map((field, index) => {
                                                            const comp = watchedComponentes[index];
                                                            const ing = ingredientes.find(i => i.id === comp.componenteId);
                                                            const erpData = ing ? erpFullMap.get(ing.productoERPlinkId) : null;
                                                            
                                                            return (
                                                                <SortableComponentRow 
                                                                    key={field.id} 
                                                                    field={field} 
                                                                    index={index} 
                                                                    remove={removeComp} 
                                                                    form={form} 
                                                                    erpData={erpData} 
                                                                />
                                                            );
                                                        })}
                                                    </SortableContext>
                                                </DndContext>
                                                {compFields.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={11} className="h-32 text-center text-muted-foreground italic">
                                                            No hay componentes añadidos. Pulse "Añadir Componente" para empezar.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="preparacion" className="mt-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card className="h-full">
                                    <CardHeader><CardTitle>Proceso de Elaboración</CardTitle></CardHeader>
                                    <CardContent>
                                        <ElaborationImageSection 
                                            form={form} 
                                            name="fotos" 
                                            folder="elaboraciones" 
                                            title="Fotos del Proceso" 
                                            description="Añada fotos de los pasos críticos o del resultado final." 
                                            canUseCamera={canUseCamera} 
                                            instructionFieldName="instruccionesPreparacion" 
                                        />
                                    </CardContent>
                                </Card>
                                <Card className="h-full">
                                    <CardHeader><CardTitle>Recursos Multimedia</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField control={form.control} name="videoProduccionURL" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>URL Video de Producción</FormLabel>
                                                <FormControl><Input {...field} placeholder="https://youtube.com/..." /></FormControl>
                                                <FormMessage />
                                                {field.value && (
                                                    <div className="aspect-video rounded-lg overflow-hidden border bg-muted flex items-center justify-center mt-4">
                                                        <span className="text-xs text-muted-foreground">Vista previa del video no disponible</span>
                                                    </div>
                                                )}
                                            </FormItem>
                                        )} />
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="producciones" className="mt-6">
                            <ProduccionesTab 
                                elaboracionId={form.getValues('id')} 
                                componentesBase={watchedComponentes}
                                cantidadPlanificada={watchedProduccionTotal}
                                onAñadirClick={() => {}}
                            />
                        </TabsContent>
                    </div>
                </form>
            </FormProvider>
        </TooltipProvider>
    );
}
