
'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { recipeDescriptionGenerator } from '@/ai/flows/recipe-description-generator';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';

import { Loader2, Save, X, BookHeart, Utensils, Sprout, GlassWater, Percent, PlusCircle, GripVertical, Trash2, Eye, Soup, Info, ChefHat, Package, Factory, Sparkles, TrendingUp, FilePenLine, Link as LinkIcon, Component, MoreHorizontal, Copy, Download, Upload, Menu, AlertTriangle, CheckCircle, RefreshCw, Pencil, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import type { Receta, Elaboracion, IngredienteInterno, MenajeDB, ArticuloERP, Alergeno, CategoriaReceta, SaborPrincipal, TipoCocina, PartidaProduccion, ElaboracionEnReceta, ComponenteElaboracion } from '@/types';
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
import { Combobox } from '@/components/ui/combobox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency, formatUnit, formatNumber, cn } from '@/lib/utils';
import Image from 'next/image';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { ElaborationForm, type ElaborationFormValues } from '@/components/book/elaboration-form';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ComponenteSelector } from '@/components/book/componente-selector';
import { Label } from '@/components/ui/label';
import { RecetaSelector } from '@/components/os/gastronomia/receta-selector';


const gastroItemSchema = z.object({
  id: z.string(), // Receta ID
  type: z.enum(['item', 'separator']),
  nombre: z.string(),
  costeMateriaPrimaSnapshot: z.number().optional(),
  precioVentaSnapshot: z.number().optional(),
  costeMateriaPrima: z.number().optional(),
  precioVenta: z.number().optional(),
  quantity: z.coerce.number().optional(),
  comentarios: z.string().optional(),
});

const formSchema = z.object({
  items: z.array(gastroItemSchema),
  status: z.enum(['Pendiente', 'En preparación', 'Listo', 'Incidencia']),
});

type FormValues = z.infer<typeof formSchema>;
type GastronomyOrderItem = FormValues['items'][0];


function SortableTableRow({ field, index, remove, control }: { field: GastronomyOrderItem & { key: string }, index: number, remove: (index: number) => void, control: any }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const quantity = useWatch({ control, name: `items.${index}.quantity` });
    const total = (field.precioVentaSnapshot || field.precioVenta || 0) * (quantity || 0);
    
    if (field.type === 'separator') {
        return (
            <TableRow ref={setNodeRef} style={style} className="bg-muted/50 hover:bg-muted/80">
                <TableCell className="w-12 p-2" {...attributes}>
                    <div {...listeners} className="cursor-grab text-muted-foreground p-2">
                        <GripVertical />
                    </div>
                </TableCell>
                <TableCell colSpan={4}>
                    <FormField
                        control={control}
                        name={`items.${index}.nombre`}
                        render={({ field: separatorField }) => (
                            <Input {...separatorField} className="border-none bg-transparent font-bold text-lg focus-visible:ring-1" />
                        )}
                    />
                </TableCell>
                 <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4"/>
                    </Button>
                </TableCell>
            </TableRow>
        );
    }

    return (
        <TableRow ref={setNodeRef} style={style} {...attributes}>
             <TableCell className="w-12 p-2">
                <div {...listeners} className="cursor-grab text-muted-foreground p-2">
                    <GripVertical />
                </div>
            </TableCell>
            <TableCell>{field.nombre}</TableCell>
            <TableCell>
                <FormField
                    control={control}
                    name={`items.${index}.quantity`}
                    render={({ field: quantityField }) => (
                        <Input
                            type="number"
                            {...quantityField}
                            onChange={(e) => quantityField.onChange(parseInt(e.target.value, 10) || 0)}
                            className="w-24 h-8"
                        />
                    )}
                />
            </TableCell>
            <TableCell>{formatCurrency(field.precioVentaSnapshot || field.precioVenta || 0)}</TableCell>
            <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end">
                    {/* Placeholder for comment button */}
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4"/>
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}

function PedidoGastronomiaForm() {
  const params = useParams();
  const osId = params.id as string;
  const briefingItemId = params.briefingItemId as string;

  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [briefingItem, setBriefingItem] = useState<ComercialBriefingItem | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [editingComment, setEditingComment] = useState<{ index: number; text: string } | null>(null);
  const [historicoPrecios, setHistoricoPrecios] = useState<HistoricoPreciosERP[]>([]);
  const [ingredientesInternos, setIngredientesInternos] = useState<IngredienteInterno[]>([]);
  const [articulosERP, setArticulosERP] = useState<ArticuloERP[]>([]);
  const [elaboraciones, setElaboraciones] = useState<Elaboracion[]>([]);


  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [],
      status: 'Pendiente',
    },
  });

  const { control, handleSubmit, reset, watch, setValue, getValues, formState } = form;
  const { fields, append, remove, update, move } = useFieldArray({ control, name: "items" });
  
  const watchedItems = watch('items');
  
  const calculateHistoricalCost = useCallback((receta: Receta, eventDate: Date): { coste: number, pvp: number } => {
    const articulosErpMap = new Map(articulosERP.map(a => [a.idreferenciaerp, a]));
    const ingredientesMap = new Map(ingredientesInternos.map(i => [i.id, i]));
    const elaboracionesMap = new Map(elaboraciones.map(e => [e.id, e]));

    const getHistoricalPrice = (erpId: string): number => {
      const relevantPrices = historicoPrecios
        .filter(h => h.articuloErpId === erpId && new Date(h.fecha) <= startOfToday(eventDate))
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      
      const latestPrice = articulosErpMap.get(erpId)?.precio || 0;

      return relevantPrices.length > 0 ? relevantPrices[0].precioCalculado : latestPrice;
    };
    
    const calculateElabCost = (elabId: string): number => {
        const elab = elaboracionesMap.get(elabId);
        if (!elab) return 0;
        
        const elabCost = (elab.componentes || []).reduce((sum, comp) => {
            let componentCost = 0;
            if (comp.tipo === 'ingrediente') {
                const ingrediente = ingredientesMap.get(comp.componenteId);
                const erpItem = ingrediente ? articulosErpMap.get(ingrediente.productoERPlinkId) : undefined;
                if(erpItem) {
                    const price = getHistoricalPrice(erpItem.idreferenciaerp);
                    componentCost = price * comp.cantidad;
                }
            } else { // It's a sub-elaboration
                componentCost = calculateElabCost(comp.componenteId) * comp.cantidad;
            }
            return sum + (componentCost * (1 + (comp.merma || 0) / 100));
        }, 0);

        return elab.produccionTotal > 0 ? elabCost / elab.produccionTotal : 0;
    }

    const costeMateriaPrima = (receta.elaboraciones || []).reduce((sum, elabEnReceta) => {
        const elabCost = calculateElabCost(elabEnReceta.elaboracionId);
        return sum + (elabCost * elabEnReceta.cantidad);
    }, 0);
    
    const pvp = costeMateriaPrima * (1 + (receta.porcentajeCosteProduccion / 100));

    return { coste: costeMateriaPrima, pvp: pvp };
  }, [historicoPrecios, ingredientesInternos, articulosERP, elaboraciones]);

  const { totalPedido, costeTotalMateriaPrima, ratioUnidadesPorPax } = useMemo(() => {
    let total = 0;
    let coste = 0;
    let totalUnits = 0;
    
    (watchedItems || []).forEach(item => {
        if (item.type === 'item') {
            const priceToUse = item.precioVentaSnapshot ?? item.precioVenta ?? 0;
            const costToUse = item.costeMateriaPrimaSnapshot ?? item.costeMateriaPrima ?? 0;
            
            total += priceToUse * (item.quantity || 0);
            coste += costToUse * (item.quantity || 0);
            totalUnits += item.quantity || 0;
        }
    });

    const ratio = briefingItem?.asistentes && briefingItem.asistentes > 0 ? totalUnits / briefingItem.asistentes : 0;
    
    return {
        totalPedido: total,
        costeTotalMateriaPrima: coste,
        ratioUnidadesPorPax: ratio,
    }
  }, [watchedItems, briefingItem?.asistentes]);


  useEffect(() => {
    setHistoricoPrecios(JSON.parse(localStorage.getItem('historicoPreciosERP') || '[]'));
    setIngredientesInternos(JSON.parse(localStorage.getItem('ingredientesInternos') || '[]'));
    setArticulosERP(JSON.parse(localStorage.getItem('articulosERP') || '[]'));
    setElaboraciones(JSON.parse(localStorage.getItem('elaboraciones') || '[]'));
  }, []);
  
  useEffect(() => {
    if (osId && briefingItemId) {
      const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
      const currentBriefing = allBriefings.find(b => b.osId === osId);
      const currentHito = currentBriefing?.items.find(item => item.id === briefingItemId);

      if (currentHito) {
        setBriefingItem(currentHito);
        
        const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
        const currentGastroOrder = allGastroOrders.find(o => o.id === briefingItemId);
        
        if (currentGastroOrder) {
            reset({
                items: currentGastroOrder.items || [],
                status: currentGastroOrder.status || 'Pendiente',
            });
        }
      }
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      setServiceOrder(allServiceOrders.find(os => os.id === osId) || null);
    }
    setIsMounted(true);
  }, [osId, briefingItemId, reset]);

  const onAddReceta = (receta: Receta) => {
    const { coste, pvp } = calculateHistoricalCost(receta, serviceOrder ? new Date(serviceOrder.startDate) : new Date());
    
    append({
        id: receta.id,
        type: 'item',
        nombre: receta.nombre,
        costeMateriaPrima: coste,
        precioVenta: pvp,
        costeMateriaPrimaSnapshot: coste,
        precioVentaSnapshot: pvp,
        quantity: briefingItem?.asistentes || 1,
        comentarios: '',
    });
    toast({title: "Receta añadida"});
  }
  
  const addSeparator = (name: string) => {
    append({
      id: `sep-${Date.now()}`,
      type: 'separator',
      nombre: name,
    });
  };

  const onSubmit = (data: FormValues) => {
    if (!briefingItem) return;
    setIsLoading(true);
    
    let allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    const orderIndex = allGastroOrders.findIndex(o => o.id === briefingItemId);

    const newOrderData: GastronomyOrder = {
        id: briefingItemId,
        osId: osId,
        status: data.status,
        items: data.items,
        total: totalPedido,
        fecha: briefingItem.fecha, // Add fecha from briefingItem
    };
    
    if (orderIndex > -1) {
        allGastroOrders[orderIndex] = newOrderData;
    } else {
        allGastroOrders.push(newOrderData);
    }
    
    localStorage.setItem('gastronomyOrders', JSON.stringify(allGastroOrders));
        
    toast({ title: 'Pedido de Gastronomía Guardado' });
    reset(data); // Mark form as not dirty
    setIsLoading(false);
  };
  
  const handleSaveComment = () => {
    if (editingComment) {
        const currentItems = getValues('items');
        currentItems[editingComment.index].comentarios = editingComment.text;
        update(editingComment.index, currentItems[editingComment.index]);
        setEditingComment(null);
        toast({title: 'Comentario guardado.'});
    }
  };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const oldIndex = fields.findIndex(f => f.id === active.id);
        const newIndex = fields.findIndex(f => f.id === over.id);
        move(oldIndex, newIndex);
    }
  }


  if (!isMounted || !briefingItem) {
    return <LoadingSkeleton title="Cargando pedido de gastronomía..." />;
  }

  return (
    <main>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between p-2 bg-muted rounded-md text-sm text-muted-foreground">
                <div className="flex items-center gap-4 text-sm">
                    <span>Para el servicio: <strong>{briefingItem.descripcion}</strong></span>
                    <span className="h-4 border-l"></span>
                    <span>{format(new Date(briefingItem.fecha), 'dd/MM/yyyy')} a las {briefingItem.horaInicio}h</span>
                    <span className="h-4 border-l"></span>
                    <span className="flex items-center gap-1.5"><Users size={16}/>{briefingItem.asistentes} asistentes</span>
                </div>
          </div>
          
          <Card>
            <CardHeader className="flex-row justify-between items-center py-3">
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => addSeparator('Nuevo Separador')}>Añadir Separador</Button>
                    <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline"><PlusCircle className="mr-2"/>Añadir Plato</Button>
                        </DialogTrigger>
                        <RecetaSelector onSelect={onAddReceta} />
                    </Dialog>
                </div>
                 <div className="flex items-center gap-6">
                     <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">Ratio (uds/pax)</p>
                        <p className="text-xl font-bold">{formatNumber(ratioUnidadesPorPax, 1)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">Total Pedido (PVP)</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(totalPedido)}</p>
                    </div>
                    <Button type="submit" disabled={isLoading || !formState.isDirty}>
                        {isLoading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2" />} 
                        Guardar Pedido
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12 p-2"></TableHead>
                            <TableHead>Referencia</TableHead>
                            <TableHead className="w-48">Cantidad</TableHead>
                            <TableHead className="w-32">PVP</TableHead>
                            <TableHead className="w-40 text-right">Total</TableHead>
                            <TableHead className="w-28 text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                        <TableBody>
                            {fields.length > 0 ? fields.map((field, index) => (
                                <SortableTableRow key={field.key} field={{...field, key: field.id }} index={index} remove={remove} control={control} />
                            )) : (
                                <TableRow><TableCell colSpan={6} className="text-center h-24">No hay platos en este pedido.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </SortableContext>
                </Table>
                </DndContext>
            </CardContent>
          </Card>
        </form>
      </Form>
      
       <Dialog open={!!editingComment} onOpenChange={(isOpen) => !isOpen && setEditingComment(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Observaciones para: {editingComment ? watchedItems[editingComment.index].nombre : ''}</DialogTitle>
                </DialogHeader>
                <Textarea 
                    value={editingComment?.text || ''}
                    onChange={(e) => setEditingComment(prev => prev ? {...prev, text: e.target.value} : null)}
                    rows={4}
                    placeholder="Añade aquí cualquier comentario sobre este plato..."
                />
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setEditingComment(null)}>Cancelar</Button>
                    <Button onClick={handleSaveComment}>Guardar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </main>
  );
}

function PedidoGastronomiaPage() {
    return (
        <React.Suspense fallback={<LoadingSkeleton title="Cargando..." />}>
            <PedidoGastronomiaForm />
        </React.Suspense>
    );
}

export default PedidoGastronomiaPage;


```