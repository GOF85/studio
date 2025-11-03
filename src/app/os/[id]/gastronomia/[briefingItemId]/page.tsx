

'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, useWatch, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, Save, Pencil, Check, Utensils, MessageSquare, Users, Loader2 } from 'lucide-react';
import { format, differenceInMinutes, parse } from 'date-fns';
import { es } from 'date-fns/locale';

import type { ServiceOrder, ComercialBriefing, ComercialBriefingItem, GastronomyOrderItem, Receta, GastronomyOrderStatus, GastronomyOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { RecetaSelector } from '@/components/os/gastronomia/receta-selector';

const gastroItemSchema = z.object({
  id: z.string(), // Receta ID
  type: z.enum(['item', 'separator']),
  nombre: z.string(),
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
  const { fields, append, remove, update } = useFieldArray({ control, name: "items" });
  
  const watchedItems = watch('items');
  
  const { totalPedido, costeTotalMateriaPrima, ratioUnidadesPorPax } = useMemo(() => {
    let total = 0;
    let coste = 0;
    let totalUnits = 0;
    
    (watchedItems || []).forEach(item => {
        if (item.type === 'item') {
            total += (item.precioVenta || 0) * (item.quantity || 0);
            coste += (item.costeMateriaPrima || 0) * (item.quantity || 0);
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
    append({
        id: receta.id,
        type: 'item',
        nombre: receta.nombre,
        costeMateriaPrima: receta.costeMateriaPrima,
        precioVenta: receta.precioVenta,
        quantity: briefingItem?.asistentes || 1,
        comentarios: '',
    });
    setIsSelectorOpen(false);
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
        total: totalPedido
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
        const currentItems = getValues('gastro_items');
        currentItems[editingComment.index].comentarios = editingComment.text;
        update(editingComment.index, currentItems[editingComment.index]);
        setEditingComment(null);
        toast({title: 'Comentario guardado.'});
    }
  };


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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Referencia</TableHead>
                            <TableHead className="w-48">Cantidad</TableHead>
                            <TableHead className="w-32">PVP</TableHead>
                            <TableHead className="w-40 text-right">Total</TableHead>
                            <TableHead className="w-28 text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.length > 0 ? fields.map((field, index) => (
                            field.type === 'separator' ? (
                                <TableRow key={field.id} className="bg-muted/50 hover:bg-muted/80">
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
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <TableRow key={field.id}>
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
                                    <TableCell>{formatCurrency(field.precioVenta || 0)}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency((field.precioVenta || 0) * (field.quantity || 0))}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end">
                                            <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => setEditingComment({ index, text: field.comentarios || '' })}>
                                                <MessageSquare className={`h-4 w-4 ${field.comentarios ? 'text-primary' : ''}`} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}>
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        )) : (
                            <TableRow><TableCell colSpan={5} className="text-center h-24">No hay platos en este pedido.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
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
