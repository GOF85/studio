

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
import { format, differenceInMinutes, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';

import { Loader2, Save, X, BookHeart, Utensils, Sprout, GlassWater, Percent, PlusCircle, GripVertical, Trash2, Eye, Soup, Info, ChefHat, Package, Factory, Sparkles, TrendingUp, FilePenLine, Link as LinkIcon, Component, MoreHorizontal, Copy, Download, Upload, Menu, AlertTriangle, CheckCircle, RefreshCw, Pencil, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import type { Receta, Elaboracion, IngredienteInterno, MenajeDB, ArticuloERP, Alergeno, CategoriaReceta, SaborPrincipal, PartidaProduccion, ElaboracionEnReceta, ComponenteElaboracion, ServiceOrder, ComercialBriefing, ComercialBriefingItem, GastronomyOrder } from '@/types';
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
import { formatCurrency, formatUnit, cn, formatNumber } from '@/lib/utils';
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


function SortableTableRow({ field, index, remove, control, onQuantityChange }: { field: GastronomyOrderItem, index: number, remove: (index: number) => void, control: any, onQuantityChange: (index: number, quantity: number) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.keyId });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    const quantity = field.quantity || 0;
    const total = (field.precioVentaSnapshot || field.precioVenta || 0) * quantity;
    
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
             <TableCell className="w-12 p-2" {...attributes}>
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
                            value={quantityField.value ?? ''}
                            onChange={(e) => onQuantityChange(index, parseInt(e.target.value, 10) || 0)}
                            className="w-24 h-8"
                        />
                    )}
                />
            </TableCell>
            <TableCell>{formatCurrency(field.precioVentaSnapshot || field.precioVenta || 0)}</TableCell>
            <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end">
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
  
  const [totalPedido, setTotalPedido] = useState(0);
  const [ratioUnidadesPorPax, setRatioUnidadesPorPax] = useState(0);


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
  const { fields, append, remove, update, move } = useFieldArray({ control, name: "items", keyName: "keyId" });
  
  const watchedItems = watch('items');
  
    useEffect(() => {
        let total = 0;
        let totalUnits = 0;
        
        (watchedItems || []).forEach(item => {
            if (item.type === 'item') {
                const priceToUse = item.precioVentaSnapshot ?? item.precioVenta ?? 0;
                total += priceToUse * (item.quantity || 0);
                totalUnits += item.quantity || 0;
            }
        });

        const ratio = briefingItem?.asistentes && briefingItem.asistentes > 0 ? totalUnits / briefingItem.asistentes : 0;
        
        setTotalPedido(total);
        setRatioUnidadesPorPax(ratio);
  }, [watchedItems, briefingItem?.asistentes]);


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
  
    const handleQuantityChange = (index: number, quantity: number) => {
        const items = getValues('items');
        items[index].quantity = quantity;
        setValue('items', items, { shouldDirty: true });
        trigger('items');
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
        fecha: briefingItem.fecha,
    };
    
    if (orderIndex > -1) {
        allGastroOrders[orderIndex] = newOrderData;
    } else {
        allGastroOrders.push(newOrderData);
    }
    
    localStorage.setItem('gastronomyOrders', JSON.stringify(allGastroOrders));
        
    toast({ title: 'Pedido de Gastronomía Guardado' });
    reset(data);
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
        const oldIndex = fields.findIndex(f => f.keyId === active.id);
        const newIndex = fields.findIndex(f => f.keyId === over.id);
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
                    <SortableContext items={fields.map(f => f.keyId)} strategy={verticalListSortingStrategy}>
                        <TableBody>
                            {fields.length > 0 ? fields.map((field, index) => (
                                <SortableTableRow key={field.keyId} field={field} index={index} remove={remove} control={control} onQuantityChange={handleQuantityChange} />
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
- src/app/os/gastronomia/layout.tsx:
```tsx

'use client';

// This layout is not strictly necessary but good practice for future modifications
export default function PedidoGastronomiaLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

```
- src/app/pes/layout.tsx:
```tsx


'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Menu, ChevronRight, UserPlus, FilePenLine } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const pesNav = [
    { title: 'Previsión de Servicios', href: '/pes', icon: ClipboardList },
];

function NavContent({ closeSheet }: { closeSheet: () => void }) {
    const pathname = usePathname();
    return (
        <div className="w-full">
             <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2 text-lg"><ClipboardList/>Planificación</SheetTitle>
            </SheetHeader>
            <nav className="grid items-start gap-1 p-4">
                {pesNav.map((item, index) => {
                    const isActive = pathname === item.href;
                    return (
                    <Link
                        key={index}
                        href={item.href}
                        onClick={closeSheet}
                    >
                        <span
                            className={cn(
                                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                isActive ? "bg-accent" : "transparent"
                            )}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
                        </span>
                    </Link>
                )})}
            </nav>
        </div>
    );
}

export default function PesLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    
    const isNewOsPage = useMemo(() => pathname.endsWith('/nuevo/info'), [pathname]);

    return (
        <>
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-2 py-2 text-sm font-semibold">
                         <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="mr-2">
                                    <Menu className="h-5 w-5"/>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[280px] p-0">
                                <NavContent closeSheet={() => setIsSheetOpen(false)} />
                            </SheetContent>
                        </Sheet>
                        <Link href="/pes" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <ClipboardList className="h-5 w-5"/>
                            <span>Previsión de Servicios</span>
                        </Link>
                        {isNewOsPage && (
                             <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <span className="flex items-center gap-2 font-bold text-primary">
                                    <FilePenLine className="h-5 w-5"/>
                                    <span>Nueva Orden</span>
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
             <div className="container mx-auto">
                <div className="py-8">
                    {children}
                </div>
            </div>
        </>
    );
}

```
- src/app/os/info/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OsIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/info`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/info/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OsIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/info`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/nuevo/info/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import InfoPage from '@/app/os/[id]/info/page';

export default function NuevoOsPage() {
    const router = useRouter();
    
    // For now, this is a simple alias. In the future, it might have its own logic.
    return <InfoPage />;
}

```
- src/app/os/page.tsx:
```tsx

'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main service order overview page.
export default function OsRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/pes');
    }, [router]);
    return null;
}

```
- src/app/os/hielo/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HieloIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/hielo`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/bio/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BioIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/bio`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/atipicos/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AtipicosIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/atipicos`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/atipicos/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, FilePlus } from 'lucide-react';
import type { AtipicoOrder, ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency } from '@/lib/utils';

const statusVariant: { [key in AtipicoOrder['status']]: 'default' | 'secondary' | 'destructive' } = {
  Pendiente: 'secondary',
  Aprobado: 'default',
  Rechazado: 'destructive',
};

export default function AtipicosPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [atipicoOrders, setAtipicoOrders] = useState<AtipicoOrder[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  useEffect(() => {
    if (osId) {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allServiceOrders.find(os => os.id === osId);
      setServiceOrder(currentOS || null);

      const allAtipicoOrders = JSON.parse(localStorage.getItem('atipicoOrders') || '[]') as AtipicoOrder[];
      const relatedOrders = allAtipicoOrders.filter(order => order.osId === osId);
      setAtipicoOrders(relatedOrders);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
        router.push('/pes');
    }
    setIsMounted(true);
  }, [osId, router, toast]);

  const totalAmount = useMemo(() => {
    return atipicoOrders.reduce((sum, order) => sum + order.precio, 0);
  }, [atipicoOrders]);

  const handleDelete = () => {
    if (!orderToDelete) return;

    let allOrders = JSON.parse(localStorage.getItem('atipicoOrders') || '[]') as AtipicoOrder[];
    const updatedOrders = allOrders.filter((o: AtipicoOrder) => o.id !== orderToDelete);
    localStorage.setItem('atipicoOrders', JSON.stringify(updatedOrders));
    setAtipicoOrders(updatedOrders.filter((o: AtipicoOrder) => o.osId === osId));
    
    toast({ title: 'Gasto atípico eliminado' });
    setOrderToDelete(null);
  };
  
  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Atípicos..." />;
  }

  return (
    <>
      <div className="flex items-start justify-end mb-4">
        <Button asChild>
          <Link href={`/os/${osId}/atipicos/pedido`}>
            <PlusCircle className="mr-2" />
            Nuevo Gasto Atípico
          </Link>
        </Button>
      </div>

      <Card>
          <CardHeader><CardTitle>Gastos Atípicos Registrados</CardTitle></CardHeader>
          <CardContent>
               <div className="border rounded-lg">
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Importe</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {atipicoOrders.length > 0 ? (
                          atipicoOrders.map(order => (
                          <TableRow key={order.id}>
                              <TableCell className="font-medium">{format(new Date(order.fecha), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{order.concepto}</TableCell>
                              <TableCell>{formatCurrency(order.precio)}</TableCell>
                              <TableCell>
                              <Badge variant={statusVariant[order.status]}>
                                  {order.status}
                              </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Abrir menú</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/os/${osId}/atipicos/pedido?orderId=${order.id}`)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => setOrderToDelete(order.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                  </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                              </TableCell>
                          </TableRow>
                          ))
                      ) : (
                          <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                              No hay gastos atípicos para esta Orden de Servicio.
                          </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              </div>
              {atipicoOrders.length > 0 && (
                  <div className="flex justify-end mt-4 text-xl font-bold">
                      Importe Total: {formatCurrency(totalAmount)}
                  </div>
              )}
          </CardContent>
      </Card>

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto atípico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

```
- src/app/os/comercial/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ComercialIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/comercial`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/cta-explotacion/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CtaExplotacionIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/cta-explotacion`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/bodega/[id]/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BodegaIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/bodega`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/nuevo/info/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import InfoPage from '@/app/os/[id]/info/page';

export default function NuevoOsPage() {
    const router = useRouter();
    
    // For now, this is a simple alias. In the future, it might have its own logic.
    return <InfoPage />;
}

```
- src/app/os/page.tsx:
```tsx

'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main service order overview page.
export default function OsRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/pes');
    }, [router]);
    return null;
}

```
- src/app/personal-mice/[id]/page.tsx:
```tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, ArrowLeft, Users, Phone, Building, Save, Loader2 } from 'lucide-react';
import type { PersonalMiceOrder, ServiceOrder, Espacio, ComercialBriefing, ComercialBriefingItem, Personal } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { differenceInMinutes, parse, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Separator } from '@/components/ui/separator';
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


const formatCurrency = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

const calculateHours = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    try {
        const startTime = parse(start, 'HH:mm', new Date());
        const endTime = parse(end, 'HH:mm', new Date());
        const diff = differenceInMinutes(endTime, startTime);
        return diff > 0 ? diff / 60 : 0;
    } catch (e) {
        return 0;
    }
}

const centroCosteOptions = ['SALA', 'COCINA', 'LOGISTICA', 'RRHH'] as const;
const tipoServicioOptions = ['Producción', 'Montaje', 'Servicio', 'Recogida', 'Descarga'] as const;

const personalMiceSchema = z.object({
  id: z.string(),
  osId: z.string(),
  centroCoste: z.enum(centroCosteOptions),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  dni: z.string().optional().default(''),
  tipoServicio: z.enum(tipoServicioOptions),
  horaEntrada: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  horaSalida: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
  precioHora: z.coerce.number().min(0, 'El precio por hora debe ser positivo'),
  horaEntradaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
  horaSalidaReal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM").optional().or(z.literal('')),
});

const formSchema = z.object({
    personal: z.array(personalMiceSchema)
})

type PersonalMiceFormValues = z.infer<typeof formSchema>;

export default function PersonalMiceFormPage() {
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [spaceAddress, setSpaceAddress] = useState<string>('');
  const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [personalDB, setPersonalDB] = useState<Personal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);

  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  const form = useForm<PersonalMiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { personal: [] },
  });

  const { control, setValue } = form;

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "personal",
  });
  
 const handlePersonalChange = useCallback((index: number, name: string) => {
    if (!name) return;
    const person = personalDB.find(p => p.nombre.toLowerCase() === name.toLowerCase());
    if (person) {
      setValue(`personal.${index}.nombre`, person.nombre, { shouldDirty: true });
      setValue(`personal.${index}.dni`, person.dni || '', { shouldDirty: true });
      setValue(`personal.${index}.precioHora`, person.precioHora || 0, { shouldDirty: true });
    } else {
       setValue(`personal.${index}.nombre`, name, { shouldDirty: true });
    }
  }, [personalDB, setValue]);
  
  const watchedFields = useWatch({ control, name: 'personal' });

 const { totalPlanned, totalReal } = useMemo(() => {
    if (!watchedFields) return { totalPlanned: 0, totalReal: 0 };
    
    const totals = watchedFields.reduce((acc, order) => {
        const plannedHours = calculateHours(order.horaEntrada, order.horaSalida);
        acc.planned += plannedHours * (order.precioHora || 0);
        
        const realHours = calculateHours(order.horaEntradaReal, order.horaSalidaReal);
        acc.real += realHours * (order.precioHora || 0);
        
        return acc;
    }, { planned: 0, real: 0 });

    return { totalPlanned: totals.planned, totalReal: totals.real };
  }, [watchedFields]);

  const loadData = useCallback(() => {
     if (!osId) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
        router.push('/pes');
        return;
    }
    
    try {
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const currentOS = allServiceOrders.find(os => os.id === osId);
        setServiceOrder(currentOS || null);

        if (currentOS?.space) {
            const allEspacios = JSON.parse(localStorage.getItem('espacios') || '[]') as Espacio[];
            const currentSpace = allEspacios.find(e => e.espacio === currentOS.space);
            setSpaceAddress(currentSpace?.calle || '');
        }

        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        const currentBriefing = allBriefings.find(b => b.osId === osId);
        setBriefingItems(currentBriefing?.items || []);

        const allOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[];
        const relatedOrders = allOrders.filter(order => order.osId === osId);
        form.reset({ personal: relatedOrders });

        const dbPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
        setPersonalDB(dbPersonal);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    } finally {
        setIsMounted(true);
    }
  }, [osId, router, toast, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);


 const onSubmit = (data: PersonalMiceFormValues) => {
    setIsLoading(true);
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID de la Orden de Servicio.' });
      setIsLoading(false);
      return;
    }

    const allOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[];
    const otherOsOrders = allOrders.filter(o => o.osId !== osId);
    
    const currentOsOrders: PersonalMiceOrder[] = data.personal.map(p => ({ ...p, osId }));

    const updatedAllOrders = [...otherOsOrders, ...currentOsOrders];
    localStorage.setItem('personalMiceOrders', JSON.stringify(updatedAllOrders));

    setTimeout(() => {
        toast({ title: 'Personal MICE guardado', description: 'Todos los cambios han sido guardados.' });
        setIsLoading(false);
        form.reset(data); // Resets form with new values, marking it as not dirty
    }, 500);
  };
  
  const addRow = () => {
    append({
        id: Date.now().toString(),
        osId: osId,
        centroCoste: 'SALA',
        nombre: '',
        dni: '',
        tipoServicio: 'Servicio',
        horaEntrada: '09:00',
        horaSalida: '17:00',
        precioHora: 0,
        horaEntradaReal: '',
        horaSalidaReal: '',
    });
  }
  
  const handleDeleteRow = () => {
    if (rowToDelete !== null) {
      remove(rowToDelete);
      setRowToDelete(null);
      toast({ title: 'Asignación eliminada' });
    }
  };

  const personalOptions = useMemo(() => {
    return personalDB.map(p => ({ label: p.nombre, value: p.nombre.toLowerCase() }));
  }, [personalDB]);

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Módulo de Personal MICE..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
       <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex items-start justify-between mb-8">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/os/${osId}`)} className="mb-2">
                        <ArrowLeft className="mr-2" />
                        Volver a la OS
                    </Button>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Módulo de Personal MICE</h1>
                    <div className="text-muted-foreground mt-2 space-y-1">
                    <p>OS: {serviceOrder.serviceNumber} - {serviceOrder.client}</p>
                    {serviceOrder.space && (
                        <p className="flex items-center gap-2">
                        <Building className="h-3 w-3" /> {serviceOrder.space} {spaceAddress && `(${spaceAddress})`}
                        </p>
                    )}
                    {serviceOrder.respMetre && (
                        <p className="flex items-center gap-2">
                            Resp. Metre: {serviceOrder.respMetre} 
                            {serviceOrder.respMetrePhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {serviceOrder.respMetrePhone}</span>}
                        </p>
                    )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                        {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                        <span className="ml-2">Guardar Cambios</span>
                    </Button>
                </div>
            </div>
            
             <Accordion type="single" collapsible className="w-full mb-8" >
                <AccordionItem value="item-1">
                <Card>
                    <AccordionTrigger className="p-6">
                        <h3 className="text-xl font-semibold">Servicios del Evento</h3>
                    </AccordionTrigger>
                    <AccordionContent>
                    <CardContent className="pt-0">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead className="py-2 px-3">Fecha</TableHead>
                            <TableHead className="py-2 px-3">Descripción</TableHead>
                            <TableHead className="py-2 px-3">Asistentes</TableHead>
                            <TableHead className="py-2 px-3">Duración</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {briefingItems.length > 0 ? briefingItems.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="py-2 px-3">{format(new Date(item.fecha), 'dd/MM/yyyy')} {item.horaInicio}</TableCell>
                                <TableCell className="py-2 px-3">{item.descripcion}</TableCell>
                                <TableCell className="py-2 px-3">{item.asistentes}</TableCell>
                                <TableCell className="py-2 px-3">{calculateHours(item.horaInicio, item.horaFin).toFixed(2)}h</TableCell>
                            </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No hay servicios en el briefing.</TableCell></TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </CardContent>
                    </AccordionContent>
                </Card>
                </AccordionItem>
            </Accordion>

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Personal Asignado</CardTitle>
                    <Button type="button" onClick={addRow}>
                        <PlusCircle className="mr-2" />
                        Añadir Personal
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="px-2 py-2">Centro Coste</TableHead>
                                    <TableHead className="px-2 py-2">Nombre</TableHead>
                                    <TableHead className="px-2 py-2">Tipo Servicio</TableHead>
                                    <TableHead colSpan={3} className="text-center border-l border-r px-2 py-2 bg-muted/30">Planificado</TableHead>
                                    <TableHead colSpan={2} className="text-center border-r px-2 py-2">Real</TableHead>
                                    <TableHead className="text-right px-2 py-2">Acción</TableHead>
                                </TableRow>
                                <TableRow>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                    <TableHead className="border-l px-2 py-2 bg-muted/30 w-24">H. Entrada</TableHead>
                                    <TableHead className="px-2 py-2 bg-muted/30 w-24">H. Salida</TableHead>
                                    <TableHead className="border-r px-2 py-2 bg-muted/30 w-20">€/Hora</TableHead>
                                    <TableHead className="w-24">H. Entrada</TableHead>
                                    <TableHead className="border-r w-24">H. Salida</TableHead>
                                    <TableHead className="px-2 py-2"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {fields.length > 0 ? (
                                fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell className="px-2 py-1">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.centroCoste`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>{centroCosteOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="px-2 py-1 min-w-40">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.nombre`}
                                                render={({ field }) => (
                                                <FormItem>
                                                    <Combobox
                                                        options={personalOptions}
                                                        value={field.value}
                                                        onChange={(value) => handlePersonalChange(index, value)}
                                                        placeholder="Nombre..."
                                                    />
                                                </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="px-2 py-1">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.tipoServicio`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>{tipoServicioOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="border-l px-2 py-1 bg-muted/30">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.horaEntrada`}
                                                render={({ field }) => <FormItem><FormControl><Input type="time" {...field} className="w-24 h-9" /></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="px-2 py-1 bg-muted/30">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.horaSalida`}
                                                render={({ field }) => <FormItem><FormControl><Input type="time" {...field} className="w-24 h-9" /></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="border-r px-2 py-1 bg-muted/30">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.precioHora`}
                                                render={({ field }) => <FormItem><FormControl><Input type="number" step="0.01" {...field} className="w-20 h-9"/></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="px-2 py-1">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.horaEntradaReal`}
                                                render={({ field }) => <FormItem><FormControl><Input type="time" {...field} className="w-24 h-9"/></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="border-r px-2 py-1">
                                            <FormField
                                                control={control}
                                                name={`personal.${index}.horaSalidaReal`}
                                                render={({ field }) => <FormItem><FormControl><Input type="time" {...field} className="w-24 h-9"/></FormControl></FormItem>}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right px-2 py-1">
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-9" onClick={() => setRowToDelete(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center">
                                    No hay personal asignado. Haz clic en "Añadir Personal" para empezar.
                                </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                {fields.length > 0 && (
                    <CardFooter>
                         <Card className="w-full md:w-1/2 ml-auto">
                            <CardHeader><CardTitle className="text-lg">Resumen de Costes</CardTitle></CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Coste Total Planificado:</span>
                                    <span className="font-bold">{formatCurrency(totalPlanned)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Coste Total Real:</span>
                                    <span className="font-bold">{formatCurrency(totalReal)}</span>
                                </div>
                                <Separator className="my-2" />
                                 <div className="flex justify-between font-bold text-base">
                                    <span>Desviación:</span>
                                    <span className={totalReal - totalPlanned > 0 ? 'text-destructive' : 'text-green-600'}>
                                        {formatCurrency(totalReal - totalPlanned)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </CardFooter>
                )}
            </Card>
        </form>
       </FormProvider>

        <AlertDialog open={rowToDelete !== null} onOpenChange={(open) => !open && setRowToDelete(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará la asignación de personal de la tabla.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRowToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDeleteRow}
                >
                Eliminar
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}
```
- src/app/os/prueba-menu/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PruebaMenuIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/prueba-menu`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/prueba-menu/page.tsx:
```tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Trash2, PlusCircle, ClipboardCheck, Printer, Loader2, UtensilsCrossed } from 'lucide-react';
import type { ServiceOrder, PruebaMenuData, PruebaMenuItem, ComercialBriefing, ComercialBriefingItem } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Separator } from '@/components/ui/separator';

const pruebaMenuItemSchema = z.object({
  id: z.string(),
  type: z.enum(['header', 'item']),
  mainCategory: z.enum(['BODEGA', 'GASTRONOMÍA']),
  referencia: z.string().min(1, 'La referencia es obligatoria'),
  observaciones: z.string().optional().default(''),
});

const formSchema = z.object({
  items: z.array(pruebaMenuItemSchema),
  observacionesGenerales: z.string().optional().default(''),
  costePruebaMenu: z.coerce.number().optional().default(0),
});

type FormValues = z.infer<typeof formSchema>;

export default function PruebaMenuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);
  const [asistentesPrueba, setAsistentesPrueba] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { items: [], observacionesGenerales: '', costePruebaMenu: 0 },
  });

  const { control, handleSubmit, formState } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const loadData = useCallback(() => {
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
      router.push('/pes');
      return;
    }

    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    setServiceOrder(currentOS || null);

    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const currentBriefing = allBriefings.find(b => b.osId === osId);
    if (currentBriefing) {
        setBriefingItems(currentBriefing.items);
        const pruebaMenuHito = currentBriefing.items.find(item => item.descripcion.toLowerCase() === 'prueba de menu');
        setAsistentesPrueba(pruebaMenuHito?.asistentes || 0);
    }

    const allMenuTests = JSON.parse(localStorage.getItem('pruebasMenu') || '[]') as PruebaMenuData[];
    const currentMenuTest = allMenuTests.find(mt => mt.osId === osId);
    if (currentMenuTest) {
      form.reset({ 
        items: currentMenuTest.items,
        observacionesGenerales: currentMenuTest.observacionesGenerales || '',
        costePruebaMenu: currentMenuTest.costePruebaMenu || 0,
       });
    }

    setIsMounted(true);
  }, [osId, router, toast, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const onSubmit = (data: FormValues) => {
    if (!osId) return;

    let allMenuTests = JSON.parse(localStorage.getItem('pruebasMenu') || '[]') as PruebaMenuData[];
    const index = allMenuTests.findIndex(mt => mt.osId === osId);

    const newMenuData: PruebaMenuData = { 
        osId, 
        items: data.items, 
        observacionesGenerales: data.observacionesGenerales,
        costePruebaMenu: data.costePruebaMenu
    };

    if (index > -1) {
      allMenuTests[index] = newMenuData;
    } else {
      allMenuTests.push(newMenuData);
    }

    localStorage.setItem('pruebasMenu', JSON.stringify(allMenuTests));
    toast({ title: 'Guardado', description: 'La prueba de menú ha sido guardada.' });
    form.reset(data); // Mark as not dirty
  };
  
const handlePrint = async () => {
    if (!serviceOrder) return;
    setIsPrinting(true);

    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const margin = 15;
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        let finalY = margin;
        
        // --- TEXTOS ---
        const texts = {
            es: { proposalTitle: 'Prueba de Menú', orderNumber: 'Nº Servicio:', issueDate: 'Fecha Emisión:', client: 'Cliente:', finalClient: 'Cliente Final:', contact: 'Contacto:', eventDate: 'Fecha Principal:', deliveryFor: 'Entrega para:', logistics: 'Logística:', item: 'Producto', qty: 'Cant.', unitPrice: 'P. Unitario', subtotal: 'Subtotal', deliveryTotal: 'Total Entrega', summaryTitle: 'Resumen Económico', productsSubtotal: 'Subtotal Productos', logisticsSubtotal: 'Subtotal Logística', taxableBase: 'Base Imponible', vat: 'IVA', total: 'TOTAL Propuesta', observations: 'Observaciones', footer: 'MICE Catering - Propuesta generada digitalmente.', portes: 'portes', porte: 'porte' },
            en: { proposalTitle: 'Menu Tasting', orderNumber: 'Order No.:', issueDate: 'Issue Date:', client: 'Client:', finalClient: 'End Client:', contact: 'Contact:', eventDate: 'Main Date:', deliveryFor: 'Delivery for:', logistics: 'Logistics:', item: 'Product', qty: 'Qty.', unitPrice: 'Unit Price', subtotal: 'Subtotal', deliveryTotal: 'Financial Summary', productsSubtotal: 'Products Subtotal', logisticsSubtotal: 'Logistics Subtotal', taxableBase: 'Taxable Base', vat: 'VAT', total: 'TOTAL Proposal', observations: 'Observations', footer: 'MICE Catering - Digitally generated proposal.', portes: 'deliveries', porte: 'delivery' }
        };
        const T = texts['es'];

        // --- CABECERA ---
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#059669'); // Primary color
        doc.text(T.proposalTitle, margin, finalY);
        finalY += 10;
        
        // --- DATOS SERVICIO Y EVENTO ---
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#374151'); // Gris oscuro
        
        const serviceData = [
            ['Nº Servicio:', serviceOrder.serviceNumber],
            ['Comercial:', serviceOrder.comercial || '-'],
            ['Cliente:', serviceOrder.client],
            ['Cliente Final:', serviceOrder.finalClient || '-']
        ];
        const eventData = [
            ['Fecha Evento:', format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')],
            ['Asistentes:', String(serviceOrder.asistentes)],
            ['Servicios:', briefingItems.map(i => i.descripcion).join(', ') || '-']
        ];

        autoTable(doc, {
            body: serviceData,
            startY: finalY,
            theme: 'plain',
            tableWidth: (pageWidth - margin * 2) / 2 - 5,
            styles: { fontSize: 9, cellPadding: 0.5 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });
        autoTable(doc, {
            body: eventData,
            startY: finalY,
            theme: 'plain',
            tableWidth: (pageWidth - margin * 2) / 2 - 5,
            margin: { left: pageWidth / 2 + 5 },
            styles: { fontSize: 9, cellPadding: 0.5 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });

        finalY = (doc as any).lastAutoTable.finalY + 10;
        
        // --- TABLAS DE BODEGA Y GASTRONOMÍA ---
        const addSection = (category: 'BODEGA' | 'GASTRONOMÍA') => {
            const sectionItems = form.getValues('items').filter(item => item.mainCategory === category);
            if(sectionItems.length === 0) return;

             doc.setLineWidth(0.2);
            doc.setDrawColor('#cbd5e1');
            doc.line(margin, finalY - 5, pageWidth - margin, finalY - 5);


            if (finalY + 20 > pageHeight) { // Check if new section fits
                doc.addPage();
                finalY = margin;
            }
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#059669');
            doc.text(category.charAt(0) + category.slice(1).toLowerCase(), margin, finalY);
            finalY += 8;

            const body = sectionItems.map(item => {
                if(item.type === 'header') {
                    return [{ content: item.referencia, colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f3f4f6' } }];
                }
                return [item.referencia, ''];
            });

            autoTable(doc, {
                head: [['Referencias', 'Observaciones']],
                body,
                startY: finalY,
                theme: 'grid',
                columnStyles: {
                    0: { cellWidth: category === 'GASTRONOMÍA' ? (pageWidth - margin * 2) / 2 : 'auto' },
                    1: { cellWidth: category === 'GASTRONOMÍA' ? (pageWidth - margin * 2) / 2 : 'auto' },
                },
                didParseCell: (data) => {
                    data.cell.styles.minCellHeight = 8;
                    data.cell.styles.valign = 'middle';
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    valign: 'middle',
                },
                headStyles: {
                    fillColor: '#e5e7eb',
                    textColor: '#374151',
                    fontStyle: 'bold'
                },
            });
            finalY = (doc as any).lastAutoTable.finalY + 15;
        }

        addSection('BODEGA');
        addSection('GASTRONOMÍA');

        // --- OBSERVACIONES GENERALES ---
        const obsGenerales = form.getValues('observacionesGenerales');
        if (obsGenerales) {
            if (finalY + 30 > pageHeight) {
                doc.addPage();
                finalY = margin;
            }
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#059669');
            doc.text('Observaciones Generales', margin, finalY);
            finalY += 8;
            doc.setDrawColor('#e5e7eb');
            doc.rect(margin, finalY, pageWidth - margin * 2, 40);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#374151');
            doc.text(obsGenerales, margin + 2, finalY + 5, { maxWidth: pageWidth - margin * 2 - 4 });
        }


        doc.save(`PruebaMenu_${serviceOrder.serviceNumber}.pdf`);

    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el PDF.' });
    } finally {
        setIsPrinting(false);
    }
};

  const addRow = (mainCategory: 'BODEGA' | 'GASTRONOMÍA', type: 'header' | 'item') => {
    append({
      id: Date.now().toString(),
      type,
      mainCategory,
      referencia: '',
      observaciones: '',
    });
  };

  const renderSection = (mainCategory: 'BODEGA' | 'GASTRONOMÍA') => {
    const sectionItems = fields.map((field, index) => ({ field, index })).filter(({ field }) => field.mainCategory === mainCategory);

    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between py-4 no-print">
          <CardTitle>{mainCategory.charAt(0) + mainCategory.slice(1).toLowerCase()}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" type="button" variant="outline" onClick={() => addRow(mainCategory, 'header')}>+ Subcategoría</Button>
            <Button size="sm" type="button" onClick={() => addRow(mainCategory, 'item')}>+ Referencia</Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="p-2 border-r">Referencias</TableHead>
                  <TableHead className="p-2">Observaciones</TableHead>
                  <TableHead className="w-12 p-2 no-print"></TableHead>
                </TableRow>
              </TableHeader>
                <TableBody>
                {sectionItems.length > 0 ? sectionItems.map(({ field, index }) => (
                    <TableRow key={field.id}>
                        <TableCell className={cn("py-1 px-2 font-medium border-r", field.type === 'header' && "bg-muted/50 font-bold")}>
                            <FormField
                            control={control}
                            name={`items.${index}.referencia`}
                            render={({ field: formField }) => (
                                <FormItem>
                                <FormControl>
                                    <Input {...formField} className="border-none h-auto p-0 bg-transparent focus-visible:ring-0" />
                                </FormControl>
                                </FormItem>
                            )}
                            />
                        </TableCell>
                        <TableCell className={cn("py-1 px-2", field.type === 'header' && "bg-muted/50")}>
                             <FormField
                            control={control}
                            name={`items.${index}.observaciones`}
                            render={({ field: formField }) => (
                                <FormItem>
                                <FormControl>
                                    <Input {...formField} className="border-none h-auto p-0 bg-transparent focus-visible:ring-0" />
                                </FormControl>
                                </FormItem>
                            )}
                            />
                        </TableCell>
                        <TableCell className={cn("py-1 px-2 no-print", field.type === 'header' && "bg-muted/50")}>
                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                )) : (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                    Añade una referencia o subcategoría para empezar.
                    </TableCell>
                </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Prueba de Menú..." />;
  }

  return (
    <>
    <div className="flex items-start justify-between mb-4">
        <div>
        <Button variant="ghost" size="sm" onClick={() => router.push(`/os/${osId}`)} className="no-print">
            <ArrowLeft className="mr-2" />
            Volver a la OS
        </Button>
        </div>
        <div className="flex gap-2 no-print">
            <Button variant="outline" type="button" onClick={handlePrint} disabled={isPrinting}>
            {isPrinting ? <Loader2 className="mr-2 animate-spin"/> : <Printer className="mr-2" />}
            {isPrinting ? 'Generando...' : 'Imprimir / PDF'}
            </Button>
        <Button type="button" onClick={handleSubmit(onSubmit)} disabled={!formState.isDirty}>
            <Save className="mr-2" />
            Guardar Cambios
        </Button>
        </div>
    </div>
    
    <Card className="mb-4">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
                <h4 className="font-bold col-span-full mb-1">Datos del Servicio</h4>
                <div><strong>Nº Servicio:</strong> {serviceOrder.serviceNumber}</div>
                <div><strong>Comercial:</strong> {serviceOrder.comercial || '-'}</div>
                <div><strong>Cliente:</strong> {serviceOrder.client}</div>
                <div><strong>Cliente Final:</strong> {serviceOrder.finalClient || '-'}</div>
            </div>
            <Separator className="my-2 md:hidden" />
            <div>
                <h4 className="font-bold col-span-full mb-1">Datos del Evento</h4>
                <div><strong>Fecha:</strong> {format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')}</div>
                <div><strong>Asistentes:</strong> {serviceOrder.asistentes}</div>
                <div className="col-span-2"><strong>Servicios:</strong> {briefingItems.map(i => i.descripcion).join(', ') || '-'}</div>
            </div>
        </CardContent>
    </Card>
    <Separator className="my-6" />

    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="no-print flex items-center gap-6 p-4 border rounded-lg bg-background">
             <div className="flex items-center gap-2">
                <FormLabel className="font-semibold text-base whitespace-nowrap">Asistentes a la prueba</FormLabel>
                <Input value={asistentesPrueba} readOnly className="h-10 w-20 text-center font-bold text-lg"/>
            </div>
             <div className="flex items-center gap-2">
                <FormLabel className="font-semibold text-base flex items-center gap-2 whitespace-nowrap">Coste de la prueba de menú</FormLabel>
                <FormField
                    control={control}
                    name="costePruebaMenu"
                    render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                            <FormControl>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    {...field} 
                                    className="h-10 w-32 font-bold text-lg border-2 border-primary/50 focus-visible:ring-primary"
                                />
                            </FormControl>
                            <span className="text-lg font-bold">€</span>
                        </FormItem>
                    )}
                />
            </div>
        </div>

        <div className="space-y-6">
            {renderSection('BODEGA')}
            {renderSection('GASTRONOMÍA')}

            <Card>
                <CardHeader className="py-4">
                <CardTitle>Observaciones Generales</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <FormField
                    control={control}
                    name="observacionesGenerales"
                    render={({ field }) => (
                        <FormItem>
                        <FormControl>
                            <Textarea
                            placeholder="Añade aquí cualquier comentario o nota adicional sobre la prueba de menú..."
                            rows={4}
                            {...field}
                            />
                        </FormControl>
                        </FormItem>
                    )}
                    />
                </CardContent>
            </Card>
        </div>
      </form>
    </Form>
    </>
  );
}

```
- src/app/pes/layout.tsx:
```tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Menu, ChevronRight, UserPlus, FilePenLine } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const pesNav = [
    { title: 'Previsión de Servicios', href: '/pes', icon: ClipboardList },
];

function NavContent({ closeSheet }: { closeSheet: () => void }) {
    const pathname = usePathname();
    return (
        <div className="w-full">
             <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2 text-lg"><ClipboardList/>Planificación</SheetTitle>
            </SheetHeader>
            <nav className="grid items-start gap-1 p-4">
                {pesNav.map((item, index) => {
                    const isActive = pathname === item.href;
                    return (
                    <Link
                        key={index}
                        href={item.href}
                        onClick={closeSheet}
                    >
                        <span
                            className={cn(
                                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                isActive ? "bg-accent" : "transparent"
                            )}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
                        </span>
                    </Link>
                )})}
            </nav>
        </div>
    );
}

export default function PesLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    
    const isNewOsPage = useMemo(() => pathname.endsWith('/nuevo/info'), [pathname]);

    return (
        <>
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-2 py-2 text-sm font-semibold">
                         <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="mr-2">
                                    <Menu className="h-5 w-5"/>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[280px] p-0">
                                <NavContent closeSheet={() => setIsSheetOpen(false)} />
                            </SheetContent>
                        </Sheet>
                        <Link href="/pes" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <ClipboardList className="h-5 w-5"/>
                            <span>Previsión de Servicios</span>
                        </Link>
                        {isNewOsPage && (
                             <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <span className="flex items-center gap-2 font-bold text-primary">
                                    <FilePenLine className="h-5 w-5"/>
                                    <span>Nueva Orden</span>
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
             <div className="container mx-auto">
                <div className="py-8">
                    {children}
                </div>
            </div>
        </>
    );
}

```
- src/app/os/info/[id]/page.tsx:
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

  const getFullName = (p: Personal) => `${p.nombre} ${p.apellido1} ${p.apellido2 || ''}`.trim();

  const personalSala = useMemo(() => personal.filter(p => p.departamento === 'Sala' && p.nombre && p.apellido1), [personal]);
  const personalPase = useMemo(() => personal.filter(p => p.departamento === 'Pase' && p.nombre && p.apellido1), [personal]);
  const personalCPR = useMemo(() => personal.filter(p => p.departamento === 'CPR' && p.nombre && p.apellido1), [personal]);
  const personalComercial = useMemo(() => personal.filter(p => p.departamento === 'Comercial' && p.nombre && p.apellido1), [personal]);
  const personalCocina = useMemo(() => personal.filter(p => p.departamento === 'COCINA' && p.nombre && p.apellido1), [personal]);
  const personalRRHH = useMemo(() => personal.filter(p => p.departamento === 'RRHH' && p.nombre && p.apellido1), [personal]);
  const personalOperaciones = useMemo(() => personal.filter(p => p.departamento === 'Operaciones' && p.nombre && p.apellido1), [personal]);
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
    setValue(mailField, person?.email || '', { shouldDirty: true });
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
    setPersonal(allPersonal.filter(p => p.nombre && p.apellido1));
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
      const allOS = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const lastOSNumber = allOS.reduce((max, os) => {
        const numPart = os.serviceNumber.split('-')[2];
        const num = numPart ? parseInt(numPart) : 0;
        return Math.max(max, isNaN(num) ? 0 : num);
      }, 0);
      const newServiceNumber = `OS-${new Date().getFullYear()}-${(lastOSNumber + 1).toString().padStart(4, '0')}`;
      
      currentOS = {
        ...defaultValues,
        id: Date.now().toString(),
        serviceNumber: newServiceNumber,
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
      'decoracionOrders', 'atipicosOrders', 'personalMiceOrders', 'personalExterno', 'pruebasMenu'
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
        <main>
            <FormProvider {...form}>
              <form id="os-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <Card>
                  <CardHeader className="py-3 flex-row items-center justify-between">
                    <CardTitle className="text-xl">Datos del Servicio</CardTitle>
                    <div className="flex items-center gap-2">
                        <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem>
                            <Select onValueChange={handleStatusChange} value={field.value}>
                                <FormControl><SelectTrigger className={cn("w-[150px] font-semibold h-9", statusValue === 'Confirmado' && 'bg-green-100 dark:bg-green-900 border-green-400', statusValue === 'Pendiente' && 'bg-yellow-100 dark:bg-yellow-800 border-yellow-400', statusValue === 'Anulado' && 'bg-destructive/20 text-destructive-foreground border-destructive/40')}><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="Borrador">Borrador</SelectItem>
                                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                                  <SelectItem value="Confirmado">Confirmado</SelectItem>
                                  <SelectItem value="Anulado">Anulado</SelectItem>
                                </SelectContent>
                            </Select>
                            </FormItem>
                        )} />
                        <Button type="submit" form="os-form" size="sm" disabled={isLoading || !isDirty}>
                            {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                            <span className="ml-2">{isEditing ? 'Guardar Cambios' : 'Guardar OS'}</span>
                        </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                      <FormField control={form.control} name="serviceNumber" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Nº Servicio</FormLabel><FormControl><Input {...field} readOnly={isEditing} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="startDate" render={({ field }) => (
                          <FormItem className="flex flex-col"><FormLabel>Fecha Inicio</FormLabel><Popover open={startDateOpen} onOpenChange={setStartDateOpen}><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal h-9", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setStartDateOpen(false);}} initialFocus locale={es} /></PopoverContent></Popover><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="endDate" render={({ field }) => (
                          <FormItem className="flex flex-col"><FormLabel>Fecha Fin</FormLabel><Popover open={endDateOpen} onOpenChange={setEndDateOpen}><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal h-9", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setEndDateOpen(false);}} initialFocus locale={es} /></PopoverContent></Popover><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="asistentes" render={({ field }) => (
                            <FormItem><FormLabel>Asistentes</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="cateringVertical" render={({ field }) => (
                            <FormItem><FormLabel>Vertical Catering</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {CATERING_VERTICALES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                </SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )} />
                    </div>
                    
                       <Accordion type="multiple" defaultValue={accordionDefaultValue} className="w-full space-y-3 pt-3">
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
                                    ['respCocinaPase', 'respCocinaPasePhone', 'respCocinaPaseMail', 'Resp. Cocina Pase', personalCocina], 
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
                    
                    <div className="space-y-4 pt-4 border-t">
                      <FormField control={form.control} name="comments" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Comentarios Generales</FormLabel>
                              <FormControl><Textarea rows={4} {...field} /></FormControl>
                          </FormItem>
                      )} />
                    </div>

                    {statusValue === 'Anulado' && (
                        <div className="space-y-2 pt-4 border-t border-destructive">
                            <h3 className="text-destructive font-bold">Motivo de Anulación</h3>
                            <p className="text-muted-foreground p-4 bg-destructive/10 rounded-md">{anulacionMotivoSaved}</p>
                        </div>
                    )}
                  </CardContent>
                </Card>
              </form>
            </FormProvider>
             {isEditing && (
                 <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="danger-zone">
                      <Card className="mt-4 border-destructive bg-destructive/5">
                        <AccordionTrigger className="py-3 px-4 text-destructive hover:no-underline">
                            <div className="flex items-center gap-2"><AlertTriangle/>Borrar OS</div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="px-4 pb-4">
                            <p className="text-sm text-destructive/80 mb-4">
                              Esta acción es irreversible. Se eliminará la OS y todos los datos asociados a ella.
                            </p>
                            <Button variant="destructive" type="button" onClick={() => setShowDeleteConfirm(true)}>
                              <Trash2 className="mr-2" /> Eliminar Orden de Servicio
                            </Button>
                          </div>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>
                  </Accordion>
            )}
          </main>
        
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
- src/app/os/nuevo/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the info page for a new OS.
export default function NuevoOsRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/os/nuevo/info');
    }, [router]);
    return null;
}

```
- src/app/os/page.tsx:
```tsx

'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the main service order overview page.
export default function OsRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/pes');
    }, [router]);
    return null;
}

```
- src/app/layout.tsx:
```tsx

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { NProgressProvider } from '@/components/providers/nprogress-provider';
import { ImpersonatedUserProvider } from '@/hooks/use-impersonated-user';
import { Header } from '@/components/layout/header';
import { openSans, roboto } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'MICE Catering',
  description: 'Soluciones de alquiler para tus eventos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-body antialiased', openSans.variable, roboto.variable)}>
        <ImpersonatedUserProvider>
          <NProgressProvider>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              {children}
            </div>
          </NProgressProvider>
        </ImpersonatedUserProvider>
        <Toaster />
      </body>
    </html>
  );
}

```
- src/app/page.tsx:
```tsx
import { DashboardPage } from '@/app/dashboard-page';

export default function HomePage() {
  return <DashboardPage />;
}

```
- src/app/planificacion-cpr/page.tsx:
```tsx

'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page is deprecated and now redirects to the warehouse picking page.
export default function PlanificacionCprPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/cpr/of');
    }, [router]);
    return null;
}


```
- src/app/personal-mice/page.tsx:
```tsx


'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Users, Menu, FileUp, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PersonalMiceOrder, ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const ITEMS_PER_PAGE = 20;

export default function PersonalMicePage() {
  const [orders, setOrders] = useState<PersonalMiceOrder[]>([]);
  const [serviceOrders, setServiceOrders] = useState<Map<string, ServiceOrder>>(new Map());
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let storedOrders = localStorage.getItem('personalMiceOrders');
    setOrders(storedOrders ? JSON.parse(storedOrders) : []);

    let storedServiceOrders = localStorage.getItem('serviceOrders');
    const osMap = new Map<string, ServiceOrder>();
    if (storedServiceOrders) {
        (JSON.parse(storedServiceOrders) as ServiceOrder[]).forEach(os => osMap.set(os.id, os));
    }
    setServiceOrders(osMap);

    setIsMounted(true);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const os = serviceOrders.get(order.osId);
      const searchMatch =
        searchTerm === '' ||
        order.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.dni || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.centroCoste.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (os && os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      let dateMatch = true;
      if (dateRange?.from && os) {
          const osDate = new Date(os.startDate);
          if(dateRange.to) {
              dateMatch = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
          } else {
              dateMatch = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
          }
      }

      return searchMatch && dateMatch;
    });
  }, [orders, searchTerm, serviceOrders, dateRange]);
  
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  const handleDelete = () => {
    if (!orderToDelete) return;
    const updatedData = orders.filter(e => e.id !== orderToDelete);
    localStorage.setItem('personalMiceOrders', JSON.stringify(updatedData));
    setOrders(updatedData);
    toast({ title: 'Asignación eliminada', description: 'El registro se ha eliminado correctamente.' });
    setOrderToDelete(null);
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Personal MICE..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Gestión de Personal MICE</h1>
          <p className="text-muted-foreground">Esta página es de solo lectura. Para añadir o editar, accede desde la Orden de Servicio.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por nombre, DNI, OS..."
            className="flex-grow max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Popover>
            <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")} </>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Filtrar por fecha de evento...</span>)}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
            </PopoverContent>
          </Popover>
          <Button variant="secondary" onClick={() => { setSearchTerm(''); setDateRange(undefined); setCurrentPage(1); }}>Limpiar Filtros</Button>
        </div>
        
         <div className="flex items-center justify-end gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
          </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Centro Coste</TableHead>
                <TableHead>Tipo Servicio</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>€/hora</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map(item => {
                  const os = serviceOrders.get(item.osId);
                  return (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/personal-mice/${item.osId}`)}>
                        <TableCell><Badge variant="outline">{os?.serviceNumber}</Badge></TableCell>
                        <TableCell className="font-medium">{item.nombre}</TableCell>
                        <TableCell>{item.centroCoste}</TableCell>
                        <TableCell>{item.tipoServicio}</TableCell>
                        <TableCell>{item.horaEntrada} - {item.horaSalida}</TableCell>
                        <TableCell>{item.precioHora.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/personal-mice/${item.osId}`)}}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No se encontraron registros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </>
  );
}

```
- src/app/almacen/layout.tsx:
```tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { Warehouse, ClipboardList, ListChecks, History, AlertTriangle, Menu, ChevronRight } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export const almacenNav = [
    { title: 'Gestión de Picking', href: '/almacen/picking', icon: ListChecks, exact: false },
    { title: 'Incidencias de Picking', href: '/almacen/incidencias', icon: AlertTriangle, exact: true },
    { title: 'Gestión de Retornos', href: '/almacen/retornos', icon: History, exact: false },
    { title: 'Incidencias de Retorno', href: '/almacen/incidencias-retorno', icon: AlertTriangle, exact: true },
];

function NavContent({ closeSheet }: { closeSheet: () => void }) {
    const pathname = usePathname();
    return (
        <div className="w-full">
             <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2 text-lg"><Warehouse/>Panel de Almacen</SheetTitle>
            </SheetHeader>
            <nav className="grid items-start gap-1 p-4">
                {almacenNav.map((item, index) => {
                    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    return (
                    <Link
                        key={index}
                        href={item.href}
                        onClick={closeSheet}
                    >
                        <span
                            className={cn(
                                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                isActive ? "bg-accent" : "transparent"
                            )}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
                        </span>
                    </Link>
                )})}
            </nav>
        </div>
    );
}

export default function AlmacenLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    
    const currentPage = useMemo(() => {
      if (pathname.startsWith('/almacen/picking/')) return { title: 'Hoja de Picking', icon: ListChecks };
      if (pathname.startsWith('/almacen/retornos/')) return { title: 'Hoja de Retorno', icon: History };
      return almacenNav.find(item => item.exact ? pathname === item.href : pathname.startsWith(item.href));
    }, [pathname]);

    return (
        <>
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-2 py-2 text-sm font-semibold">
                         <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="mr-2">
                                    <Menu className="h-5 w-5"/>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[280px] p-0">
                                <NavContent closeSheet={() => setIsSheetOpen(false)} />
                            </SheetContent>
                        </Sheet>
                        <Link href="/almacen" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <Warehouse className="h-5 w-5"/>
                            <span>Panel de Almacen</span>
                        </Link>
                        {currentPage && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <currentPage.icon className="h-5 w-5 text-muted-foreground"/>
                                <span>{currentPage.title}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
             <div className="container mx-auto">
                <div className="py-8">
                    {children}
                </div>
            </div>
        </>
    );
}

```
- src/app/almacen/planificacion/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page is deprecated and now redirects to the warehouse picking page.
export default function AlmacenPlanificacionRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/almacen/picking');
    }, [router]);
    return null;
}

```
- src/app/almacen/page.tsx:
```tsx

'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the first page of the module.
export default function AlmacenPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/almacen/picking');
    }, [router]);
    return null;
}

```
- src/app/analitica/layout.tsx:
```tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ChevronRight, Menu, ClipboardList, Package } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

const analiticaNav = [
    { title: 'Analítica de Catering', href: '/analitica/catering', exact: true, icon: ClipboardList },
    { title: 'Analítica de Entregas', href: '/analitica/entregas', exact: true, icon: Package },
];

function NavContent({ closeSheet }: { closeSheet: () => void }) {
    const pathname = usePathname();
    return (
        <div className="w-full">
             <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2 text-lg"><BarChart3/>Analítica</SheetTitle>
            </SheetHeader>
            <nav className="grid items-start gap-1 p-4">
                {analiticaNav.map((item, index) => {
                    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    return (
                    <Link
                        key={index}
                        href={item.href}
                        onClick={closeSheet}
                    >
                        <span
                            className={cn(
                                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                isActive ? "bg-accent" : "transparent"
                            )}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
                        </span>
                    </Link>
                )})}
            </nav>
        </div>
    );
}

export default function AnaliticaLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    
    const currentPage = useMemo(() => {
        return analiticaNav.find(item => item.href === pathname);
    }, [pathname]);

    return (
        <>
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-2 py-2 text-sm font-semibold">
                         <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="mr-2">
                                    <Menu className="h-5 w-5"/>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[280px] p-0">
                                <NavContent closeSheet={() => setIsSheetOpen(false)} />
                            </SheetContent>
                        </Sheet>
                        <Link href="/analitica" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <BarChart3 className="h-5 w-5"/>
                            <span>Analítica</span>
                        </Link>
                        {currentPage && currentPage.href !== '/analitica' && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <currentPage.icon className="h-5 w-5 text-muted-foreground"/>
                                <span>{currentPage.title}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
             <div className="py-8">
                {children}
            </div>
        </>
    );
}

```
- src/app/analitica/page.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { BarChart3, Euro, TrendingUp, TrendingDown, ClipboardList, Package, Calendar as CalendarIcon, Factory } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import type { Entrega, ServiceOrder, MaterialOrder, GastronomyOrder, TransporteOrder, HieloOrder, DecoracionOrder, AtipicoOrder, PersonalMiceOrder, PersonalExterno, PersonalExternoAjuste, PedidoEntrega, PedidoEntregaItem, PruebaMenuData } from '@/types';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth, isWithinInterval, endOfDay, startOfYear, endOfQuarter, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type KpiCardProps = {
    title: string;
    value: string;
    icon: React.ElementType;
    description?: string;
}

function KpiCard({ title, value, icon: Icon, description }: KpiCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    )
}

const calculateHours = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    try {
        const startTime = new Date(`1970-01-01T${start}:00`);
        const endTime = new Date(`1970-01-01T${end}:00`);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 0;
        const diff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        return diff > 0 ? diff : 0;
    } catch (e) {
        return 0;
    }
}

export default function AnaliticaDashboardPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    
    // States to hold all data
    const [allServiceOrders, setAllServiceOrders] = useState<ServiceOrder[]>([]);
    const [allEntregas, setAllEntregas] = useState<Entrega[]>([]);
    const [allMaterialOrders, setAllMaterialOrders] = useState<MaterialOrder[]>([]);
    const [allGastroOrders, setAllGastroOrders] = useState<GastronomyOrder[]>([]);
    const [allTransporteOrders, setAllTransporteOrders] = useState<TransporteOrder[]>([]);
    const [allHieloOrders, setAllHieloOrders] = useState<HieloOrder[]>([]);
    const [allDecoracionOrders, setAllDecoracionOrders] = useState<DecoracionOrder[]>([]);
    const [allAtipicoOrders, setAllAtipicoOrders] = useState<AtipicoOrder[]>([]);
    const [allPersonalMiceOrders, setAllPersonalMiceOrders] = useState<PersonalMiceOrder[]>([]);
    const [allPersonalExterno, setAllPersonalExterno] = useState<PersonalExterno[]>([]);
    const [allAjustesPersonal, setAllAjustesPersonal] = useState<Record<string, PersonalExternoAjuste[]>>({});
    const [allPedidosEntrega, setAllPedidosEntrega] = useState<PedidoEntrega[]>([]);
    const [allPruebasMenu, setAllPruebasMenu] = useState<PruebaMenuData[]>([]);

    useEffect(() => {
        // Load all data from localStorage once
        setAllServiceOrders(JSON.parse(localStorage.getItem('serviceOrders') || '[]'));
        setAllEntregas(JSON.parse(localStorage.getItem('entregas') || '[]'));
        setAllMaterialOrders(JSON.parse(localStorage.getItem('materialOrders') || '[]'));
        setAllGastroOrders(JSON.parse(localStorage.getItem('gastronomyOrders') || '[]'));
        setAllTransporteOrders(JSON.parse(localStorage.getItem('transporteOrders') || '[]'));
        setAllHieloOrders(JSON.parse(localStorage.getItem('hieloOrders') || '[]'));
        setAllDecoracionOrders(JSON.parse(localStorage.getItem('decoracionOrders') || '[]'));
        setAllAtipicoOrders(JSON.parse(localStorage.getItem('atipicosOrders') || '[]'));
        setAllPersonalMiceOrders(JSON.parse(localStorage.getItem('personalMiceOrders') || '[]'));
        setAllPersonalExterno(JSON.parse(localStorage.getItem('personalExterno') || '[]'));
        setAllAjustesPersonal(JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}'));
        setAllPedidosEntrega(JSON.parse(localStorage.getItem('pedidosEntrega') || '[]'));
        setAllPruebasMenu(JSON.parse(localStorage.getItem('pruebasMenu') || '[]'));
        setIsMounted(true);
    }, []);

    const { cateringData, entregasData, totals } = useMemo(() => {
        const fromDate = dateRange?.from;
        const toDate = dateRange?.to || fromDate;
        if (!isMounted || !fromDate) return { cateringData: null, entregasData: null, totals: {} };
        
        const dateFilter = (dateStr: string) => isWithinInterval(new Date(dateStr), { start: startOfDay(fromDate), end: endOfDay(toDate) });
        
        // --- CATERING CALCULATION ---
        const cateringOrders = allServiceOrders.filter(os => os.vertical !== 'Entregas' && os.status === 'Confirmado' && dateFilter(os.startDate));
        let cateringFacturacion = 0;
        let cateringCoste = 0;

        cateringOrders.forEach(os => {
            const comisiones = (os.comisionesAgencia || 0) + (os.comisionesCanon || 0);
            const facturacionOS = (os.facturacion || 0) - comisiones;
            cateringFacturacion += facturacionOS;

            let costeOS = 0;
            costeOS += allGastroOrders.filter(o => o.osId === os.id).reduce((s, o) => s + (o.total || 0), 0);
            costeOS += allMaterialOrders.filter(o => o.osId === os.id).reduce((s, o) => s + o.total, 0);
            costeOS += allTransporteOrders.filter(o => o.osId === os.id).reduce((s, o) => s + o.precio, 0);
            costeOS += allHieloOrders.filter(o => o.osId === os.id).reduce((s, o) => s + o.total, 0);
            costeOS += allDecoracionOrders.filter(o => o.osId === os.id).reduce((s, o) => s + o.precio, 0);
            costeOS += allAtipicoOrders.filter(o => o.osId === os.id).reduce((s, o) => s + o.precio, 0);
            costeOS += allPersonalMiceOrders.filter(o => o.osId === os.id).reduce((s, o) => s + calculateHours(o.horaEntradaReal || o.horaEntrada, o.horaSalidaReal || o.horaSalida) * (o.precioHora || 0), 0);
            costeOS += (allPruebasMenu.find(p => p.osId === os.id)?.costePruebaMenu || 0);

            const personalExterno = allPersonalExterno.find(p => p.osId === os.id);
            if (personalExterno) {
               const costeTurnos = personalExterno.turnos.reduce((s, turno) => s + (turno.asignaciones || []).reduce((sA, a) => sA + calculateHours(a.horaEntradaReal || turno.horaEntrada, a.horaSalidaReal || turno.horaSalida) * (turno.precioHora || 0), 0), 0);
               const costeAjustes = (allAjustesPersonal[os.id] || []).reduce((s, a) => s + a.importe, 0);
               costeOS += costeTurnos + costeAjustes;
            }
            cateringCoste += costeOS;
        });

        // --- ENTREGAS CALCULATION ---
        const entregaOrders = allEntregas.filter(os => os.vertical === 'Entregas' && os.status === 'Confirmado' && dateFilter(os.startDate));
        let entregasFacturacion = 0;
        let entregasCoste = 0;
        let entregasHitos = 0;
        
        entregaOrders.forEach(os => {
            const pedido = allPedidosEntrega.find(p => p.osId === os.id);
            if (pedido) {
                entregasHitos += pedido.hitos.length;

                const pvpBrutoHitos = pedido.hitos.reduce((sum, hito) => {
                    const pvpProductos = (hito.items || []).reduce((s, i) => s + (i.pvp * i.quantity), 0);
                    const pvpPortes = (hito.portes || 0) * (os.tarifa === 'IFEMA' ? 95 : 30);
                    const horasCamarero = hito.horasCamarero || 0;
                    const horasFacturables = horasCamarero > 0 && horasCamarero < 4 ? 4 : horasCamarero;
                    const pvpCamareroHora = os.tarifa === 'IFEMA' ? 44.50 : 36.50;
                    const pvpCamareros = horasFacturables * pvpCamareroHora;
                    return sum + pvpProductos + pvpPortes + pvpCamareros;
                }, 0);

                const comisiones = (os.comisionesAgencia || 0) + (os.comisionesCanon || 0);
                entregasFacturacion += pvpBrutoHitos - comisiones;

                const costeProductos = pedido.hitos.reduce((sum, hito) => sum + (hito.items || []).reduce((s, i) => s + ((i.coste || 0) * i.quantity), 0), 0);
                const costeTransporte = allTransporteOrders.filter(t => t.osId === os.id).reduce((sum, o) => sum + o.precio, 0);
                
                const personalExterno = allPersonalExterno.find(p => p.osId === os.id);
                let costePersonal = 0;
                if(personalExterno) {
                    costePersonal = personalExterno.turnos.reduce((sum, turno) => sum + (turno.asignaciones || []).reduce((s, a) => s + calculateHours(a.horaEntradaReal || turno.horaEntrada, a.horaSalidaReal || turno.horaSalida) * turno.precioHora, 0), 0);
                }
                entregasCoste += costeProductos + costeTransporte + costePersonal;
            }
        });

        const totalFacturacion = cateringFacturacion + entregasFacturacion;
        const totalCoste = cateringCoste + entregasCoste;
        const rentabilidad = totalFacturacion - totalCoste;
        const margen = totalFacturacion > 0 ? rentabilidad / totalFacturacion : 0;
        
        return {
            cateringData: { facturacion: cateringFacturacion, coste: cateringCoste, rentabilidad: cateringFacturacion - cateringCoste, eventos: cateringOrders.length },
            entregasData: { facturacion: entregasFacturacion, coste: entregasCoste, rentabilidad: entregasFacturacion - entregasCoste, entregas: entregasHitos, contratos: entregaOrders.length },
            totals: { totalFacturacion, totalCoste, rentabilidad, margen },
        };

    }, [dateRange, isMounted, allServiceOrders, allEntregas, allGastroOrders, allMaterialOrders, allTransporteOrders, allHieloOrders, allDecoracionOrders, allAtipicoOrders, allPersonalMiceOrders, allPersonalExterno, allAjustesPersonal, allPedidosEntrega, allPruebasMenu]);

    const setDatePreset = (preset: 'month' | 'year' | 'q1' | 'q2' | 'q3' | 'q4') => {
        const now = new Date();
        let fromDate, toDate;
        switch(preset) {
            case 'month': fromDate = startOfMonth(now); toDate = endOfMonth(now); break;
            case 'year': fromDate = startOfYear(now); toDate = endOfYear(now); break;
            case 'q1': fromDate = startOfQuarter(new Date(now.getFullYear(), 0, 1)); toDate = endOfQuarter(new Date(now.getFullYear(), 2, 31)); break;
            case 'q2': fromDate = startOfQuarter(new Date(now.getFullYear(), 3, 1)); toDate = endOfQuarter(new Date(now.getFullYear(), 5, 30)); break;
            case 'q3': fromDate = startOfQuarter(new Date(now.getFullYear(), 6, 1)); toDate = endOfQuarter(new Date(now.getFullYear(), 8, 30)); break;
            case 'q4': fromDate = startOfQuarter(new Date(now.getFullYear(), 9, 1)); toDate = endOfQuarter(new Date(now.getFullYear(), 11, 31)); break;
        }
        setDateRange({ from: fromDate, to: toDate });
        setIsDatePickerOpen(false);
    };

    if (!isMounted || !cateringData || !entregasData) {
        return <LoadingSkeleton title="Cargando Panel de Analítica..." />;
    }

    return (
        <div className="container mx-auto px-4">
            <Card className="mb-6">
                <CardContent className="p-4 flex flex-col xl:flex-row gap-4">
                     <div className="flex flex-wrap items-center gap-2">
                         <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-full md:w-[260px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.from && range?.to) { setIsDatePickerOpen(false); }}} numberOfMonths={2} locale={es}/>
                            </PopoverContent>
                        </Popover>
                         <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('month')}>Mes</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('year')}>Año</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q1')}>Q1</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q2')}>Q2</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q3')}>Q3</Button>
                            <Button size="sm" variant="outline" onClick={() => setDatePreset('q4')}>Q4</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <KpiCard title="Facturación Neta Total" value={formatCurrency(totals.totalFacturacion || 0)} icon={Euro} description="Suma de Catering y Entregas" />
                <KpiCard title="Coste Total Estimado" value={formatCurrency(totals.totalCoste || 0)} icon={TrendingDown} description="Estimación de todos los costes directos" />
                <KpiCard title="Rentabilidad Bruta" value={formatCurrency(totals.rentabilidad || 0)} icon={TrendingUp} description="Facturación neta menos costes" />
                <KpiCard title="Margen Bruto" value={`${formatPercentage(totals.margen || 0)}`} icon={TrendingUp} description="Porcentaje de rentabilidad" />
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
                <Link href="/analitica/catering">
                    <Card className="hover:border-primary hover:shadow-lg transition-all h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><ClipboardList />Analítica de Catering</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Analiza en profundidad la rentabilidad, costes y rendimiento de tus eventos de catering.</p>
                        </CardContent>
                    </Card>
                </Link>
                 <Link href="/analitica/entregas">
                    <Card className="hover:border-primary hover:shadow-lg transition-all h-full theme-orange">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><Package />Analítica de Entregas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Explora los KPIs, ventas y márgenes de la vertical de negocio de Entregas MICE.</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
            
        </div>
    );
}

```
- src/app/os/alquiler/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AlquilerIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/alquiler`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/almacen/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AlmacenIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/almacen`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/info/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OsIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/info`);
    }, [router, params.id]);
    return null;
}

```
- src/app/os/personal-mice/[id]/page.tsx:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PersonalMiceIdRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(`/os/${params.id}/personal-mice`);
    }, [router, params.id]);
    return null;
}

```
- src/app/personal-mice/page.tsx:
```tsx


'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Users, Menu, FileUp, FileDown, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import type { PersonalMiceOrder, ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const ITEMS_PER_PAGE = 20;

export default function PersonalMicePage() {
  const [orders, setOrders] = useState<PersonalMiceOrder[]>([]);
  const [serviceOrders, setServiceOrders] = useState<Map<string, ServiceOrder>>(new Map());
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let storedOrders = localStorage.getItem('personalMiceOrders');
    setOrders(storedOrders ? JSON.parse(storedOrders) : []);

    let storedServiceOrders = localStorage.getItem('serviceOrders');
    const osMap = new Map<string, ServiceOrder>();
    if (storedServiceOrders) {
        (JSON.parse(storedServiceOrders) as ServiceOrder[]).forEach(os => osMap.set(os.id, os));
    }
    setServiceOrders(osMap);

    setIsMounted(true);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const os = serviceOrders.get(order.osId);
      const searchMatch =
        searchTerm === '' ||
        order.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.dni || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.centroCoste.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (os && os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      let dateMatch = true;
      if (dateRange?.from && os) {
          const osDate = new Date(os.startDate);
          if(dateRange.to) {
              dateMatch = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
          } else {
              dateMatch = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
          }
      }

      return searchMatch && dateMatch;
    });
  }, [orders, searchTerm, serviceOrders, dateRange]);
  
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  const handleDelete = () => {
    if (!orderToDelete) return;
    const updatedData = orders.filter(e => e.id !== orderToDelete);
    localStorage.setItem('personalMiceOrders', JSON.stringify(updatedData));
    setOrders(updatedData);
    toast({ title: 'Asignación eliminada', description: 'El registro se ha eliminado correctamente.' });
    setOrderToDelete(null);
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Personal MICE..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Gestión de Personal MICE</h1>
          <p className="text-muted-foreground">Esta página es de solo lectura. Para añadir o editar, accede desde la Orden de Servicio.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por nombre, DNI, OS..."
            className="flex-grow max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-full md:w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", {locale: es})} - {format(dateRange.to, "LLL dd, y", {locale: es})} </>) : (format(dateRange.from, "LLL dd, y", {locale: es}))) : (<span>Filtrar por fecha de evento...</span>)}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.from && range.to){setIsDatePickerOpen(false)} }} numberOfMonths={2} locale={es}/>
            </PopoverContent>
          </Popover>
          <Button variant="secondary" onClick={() => { setSearchTerm(''); setDateRange(undefined); setCurrentPage(1); }}>Limpiar Filtros</Button>
        </div>
        
         <div className="flex items-center justify-end gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
          </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Centro Coste</TableHead>
                <TableHead>Tipo Servicio</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>€/hora</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map(item => {
                  const os = serviceOrders.get(item.osId);
                  return (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/os/${item.osId}/personal-mice`)}>
                        <TableCell><Badge variant="outline">{os?.serviceNumber}</Badge></TableCell>
                        <TableCell className="font-medium">{item.nombre}</TableCell>
                        <TableCell>{item.centroCoste}</TableCell>
                        <TableCell>{item.tipoServicio}</TableCell>
                        <TableCell>{item.horaEntrada} - {item.horaSalida}</TableCell>
                        <TableCell>{item.precioHora.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/os/${item.osId}/personal-mice`)}}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No se encontraron registros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </>
  );
}

```
- src/app/os/comercial/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ComercialRedirectPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    useEffect(() => {
        router.replace('/pes'); // Redirect to the main OS list if no ID is provided
    }, [router, params.id]);
    return null;
}

```
- src/app/os/layout.tsx:
```tsx

'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectiveDisplay } from '@/components/os/objective-display';
import { Briefcase, Utensils, Wine, Leaf, Warehouse, Archive, Truck, Snowflake, Euro, FilePlus, Users, UserPlus, Flower2, ClipboardCheck, PanelLeft, Building, FileText, Star, Menu, ClipboardList, Calendar, LayoutDashboard, Phone, ChevronRight, FilePenLine } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';


type NavLink = {
    path: string;
    title: string;
    icon: LucideIcon;
    moduleName?: Parameters<typeof ObjectiveDisplay>[0]['moduleName'];
}

const navLinks: NavLink[] = [
    { path: 'info', title: 'Información OS', icon: FileText },
    { path: 'comercial', title: 'Comercial', icon: Briefcase },
    { path: 'gastronomia', title: 'Gastronomía', icon: Utensils, moduleName: 'gastronomia' },
    { path: 'bodega', title: 'Bebida', icon: Wine, moduleName: 'bodega' },
    { path: 'hielo', title: 'Hielo', icon: Snowflake, moduleName: 'hielo' },
    { path: 'bio', title: 'Bio (Consumibles)', icon: Leaf, moduleName: 'consumibles' },
    { path: 'almacen', title: 'Almacén', icon: Warehouse, moduleName: 'almacen' },
    { path: 'alquiler', title: 'Alquiler', icon: Archive, moduleName: 'alquiler' },
    { path: 'decoracion', title: 'Decoración', icon: Flower2, moduleName: 'decoracion' },
    { path: 'atipicos', title: 'Atípicos', icon: FilePlus, moduleName: 'atipicos' },
    { path: 'personal-mice', title: 'Personal MICE', icon: Users, moduleName: 'personalMice' },
    { path: 'personal-externo', title: 'Personal Externo', icon: UserPlus, moduleName: 'personalExterno' },
    { path: 'transporte', title: 'Transporte', icon: Truck, moduleName: 'transporte' },
    { path: 'prueba-menu', title: 'Prueba de Menu', icon: ClipboardCheck, moduleName: 'costePruebaMenu' },
    { path: 'cta-explotacion', title: 'Cta. Explotación', icon: Euro },
];

const getInitials = (name: string) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function OsHeaderContent({ osId }: { osId: string }) {
    const pathname = usePathname();
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [updateKey, setUpdateKey] = useState(Date.now());

    useEffect(() => {
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const currentOS = allServiceOrders.find(os => os.id === osId);
        setServiceOrder(currentOS || null);

        const handleStorageChange = () => {
            setUpdateKey(Date.now());
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [osId, updateKey]);
    
    const {currentModule, isSubPage} = useMemo(() => {
        const pathSegments = pathname.split('/').filter(Boolean); // e.g., ['os', '123', 'gastronomia', '456']
        const osIndex = pathSegments.indexOf('os');
        const moduleSegment = pathSegments[osIndex + 2];
        const subPageSegment = pathSegments[osIndex + 3];

        const module = navLinks.find(link => link.path === moduleSegment);
        
        if (module) {
            return { currentModule: module, isSubPage: !!subPageSegment };
        }

        if (moduleSegment === 'info' || !moduleSegment) {
            return { currentModule: { title: 'Información OS', icon: FileText, path: 'info'}, isSubPage: false};
        }

        return { currentModule: { title: 'Panel de Control', icon: LayoutDashboard, path: '' }, isSubPage: false };
    }, [pathname]);

    if (!serviceOrder) {
        return (
             <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-32" />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Skeleton className="h-6 w-36" />
                </div>
                 <div className="flex justify-between items-center text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md h-9">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-5 w-1/4" />
                </div>
             </div>
        );
    }
    
    const durationDays = serviceOrder.startDate && serviceOrder.endDate ? differenceInDays(new Date(serviceOrder.endDate), new Date(serviceOrder.startDate)) + 1 : 0;
    
    const responsables = [
        {label: 'Comercial', name: serviceOrder.comercial},
        {label: 'Metre', name: serviceOrder.respMetre},
        {label: 'PM', name: serviceOrder.respProjectManager},
        {label: 'Pase', name: serviceOrder.respPase},
    ].filter(r => r.name);

    return (
        <TooltipProvider>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Link href={`/os/${osId}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <ClipboardList className="h-5 w-5"/>
                        <span>{serviceOrder.serviceNumber}</span>
                    </Link>
                    {currentModule && (
                        <>
                         <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                         <Link href={`/os/${osId}/${currentModule.path}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                            <currentModule.icon className="h-5 w-5"/>
                            <span>{currentModule.title}</span>
                         </Link>
                        </>
                    )}
                    {isSubPage && (
                         <>
                             <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                             <span className="flex items-center gap-2 font-bold text-primary">
                                 <FilePenLine className="h-5 w-5"/>
                                 <span>Edición</span>
                             </span>
                         </>
                    )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {(currentModule?.moduleName) && <ObjectiveDisplay osId={osId} moduleName={currentModule.moduleName} updateKey={updateKey} />}
                  {serviceOrder.isVip && <Badge variant="default" className="bg-amber-400 text-black hover:bg-amber-500"><Star className="h-4 w-4 mr-1"/> VIP</Badge>}
                </div>
              </div>
               <div className="flex justify-between items-center text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md">
                    <div className="flex items-center gap-3">
                       {responsables.map(resp => (
                           <Tooltip key={resp.label}>
                                <TooltipTrigger className="flex items-center gap-2 cursor-default">
                                    <span className="font-semibold">{resp.label}:</span>
                                    <Avatar className="h-6 w-6 text-xs">
                                        <AvatarFallback>{getInitials(resp.name || '')}</AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{resp.name}</p>
                                </TooltipContent>
                            </Tooltip>
                       ))}
                    </div>
                    <div className="flex items-center gap-4">
                        {serviceOrder.startDate && serviceOrder.endDate && (
                            <div className="flex items-center gap-2 font-semibold">
                                <Calendar className="h-4 w-4"/>
                                <span>{format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')} - {format(new Date(serviceOrder.endDate), 'dd/MM/yyyy')}</span>
                                {durationDays > 0 && <Badge variant="outline">{durationDays} día{durationDays > 1 && 's'}</Badge>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

export default function OSDetailsLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const osId = params.id as string;
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const dashboardHref = `/os/${osId}`;

    return (
        <div className="container mx-auto">
            <div className="sticky top-[56px] z-30 bg-background/95 backdrop-blur-sm py-2 border-b">
                <div className="flex items-center gap-4">
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline">
                                <Menu className="h-5 w-5 mr-2" />
                                Módulos
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[250px] sm:w-[280px] p-0">
                            <SheetHeader className="p-4 border-b">
                                <SheetTitle>Módulos de la OS</SheetTitle>
                            </SheetHeader>
                            <ScrollArea className="h-full p-4">
                                <nav className="grid items-start gap-1 pb-4">
                                    <Link href={dashboardHref} onClick={() => setIsSheetOpen(false)}>
                                        <span className={cn("group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname === `/os/${osId}` ? "bg-accent" : "transparent")}>
                                            <LayoutDashboard className="mr-2 h-4 w-4" />
                                            <span>Panel de Control</span>
                                        </span>
                                    </Link>
                                    {navLinks.map((item, index) => {
                                        const href = `/os/${osId}/${item.path}`;
                                        return (
                                            <Link key={index} href={href} onClick={() => setIsSheetOpen(false)}>
                                                <span className={cn("group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname.startsWith(href) ? "bg-accent" : "transparent")}>
                                                    <item.icon className="mr-2 h-4 w-4" />
                                                    <span>{item.title}</span>
                                                </span>
                                            </Link>
                                        )
                                    })}
                                </nav>
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                    <div className="flex-grow">
                        <OsHeaderContent osId={osId} />
                    </div>
                </div>
            </div>
            <main className="py-8">
                {children}
            </main>
        </div>
    );
}

```
- src/app/os/nuevo/page.tsx:
```tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page just redirects to the info page for a new OS.
export default function NuevoOsRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/os/nuevo/info');
    }, [router]);
    return null;
}

```
```

