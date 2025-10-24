
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format, parse } from 'date-fns';
import { Utensils, ArrowLeft, Save, Trash2, PlusCircle, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { ServiceOrder, GastronomyOrder, Receta, GastronomyOrderItem, GastronomyOrderStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';

const statusOptions: GastronomyOrderStatus[] = ['Pendiente', 'En preparación', 'Listo', 'Incidencia'];
const statusVariant: { [key in GastronomyOrderStatus]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  Pendiente: 'secondary',
  'En preparación': 'outline',
  Listo: 'default',
  Incidencia: 'destructive',
};


const gastronomyOrderItemSchema = z.object({
  id: z.string(),
  type: z.enum(['item', 'separator']),
  nombre: z.string(),
  categoria: z.string().optional(),
  costeMateriaPrima: z.number().optional(),
  precioVenta: z.number().optional(),
  quantity: z.coerce.number().optional(),
});

const gastronomyOrderSchema = z.object({
    id: z.string(),
    status: z.enum(statusOptions),
    items: z.array(gastronomyOrderItemSchema).default([]),
});

type GastronomyOrderFormValues = z.infer<typeof gastronomyOrderSchema>;

function RecetaSelector({ onSelectReceta }: { onSelectReceta: (receta: Receta) => void }) {
  const [recetasDB, setRecetasDB] = useState<Receta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const storedData = localStorage.getItem('recetas') || '[]';
    setRecetasDB(JSON.parse(storedData));
  }, []);

  const categories = useMemo(() => ['all', ...new Set(recetasDB.map(item => item.categoria).filter(Boolean))], [recetasDB]);

  const filteredItems = useMemo(() => {
    return recetasDB.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.categoria === selectedCategory;
      const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [recetasDB, searchTerm, selectedCategory]);

  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>Seleccionar Receta del Book</DialogTitle>
      </DialogHeader>
      <div className="flex gap-4 my-4">
        <Input placeholder="Buscar por nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[240px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat === 'all' ? 'Todas' : cat}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="max-h-[60vh] overflow-y-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre Receta</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>PVP</TableHead>
              <TableHead>Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map(receta => (
              <TableRow key={receta.id}>
                <TableCell className="font-medium">{receta.nombre}</TableCell>
                <TableCell>{receta.categoria}</TableCell>
                <TableCell>{(receta.precioVenta || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                <TableCell><Button size="sm" onClick={() => onSelectReceta(receta)}>Añadir</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DialogContent>
  );
}

function SortableTableRow({ field, index, remove, form }: { field: GastronomyOrderItem & { key: string }, index: number, remove: (index: number) => void, form: any }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <TableRow ref={setNodeRef} style={style} {...attributes}>
             <TableCell className="py-1 px-2 w-10">
                <Button type="button" variant="ghost" size="icon" {...listeners} className="cursor-grab h-8 w-8">
                    <GripVertical className="h-4 w-4 text-muted-foreground"/>
                </Button>
            </TableCell>
            {field.type === 'item' ? (
                <>
                    <TableCell className="font-medium">{field.nombre}</TableCell>
                    <TableCell>{field.categoria}</TableCell>
                    <TableCell>{(field.precioVenta || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                    <TableCell>
                        <Input 
                            type="number" 
                            min="1" 
                            className="w-20"
                            {...form.register(`items.${index}.quantity`)}
                        />
                    </TableCell>
                    <TableCell>{((field.precioVenta || 0) * (form.watch(`items.${index}.quantity`) || 0)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                </>
            ) : (
                <TableCell colSpan={5} className="font-bold bg-muted/50">
                    <Input 
                        className="border-none bg-transparent h-auto p-0 text-base"
                        {...form.register(`items.${index}.nombre`)}
                    />
                </TableCell>
            )}
            <TableCell className={cn("text-right", field.type === 'separator' && 'bg-muted/50')}>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)} type="button">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </TableCell>
        </TableRow>
    );
}

export default function PedidoGastronomiaPage() {
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const briefingItemId = params.briefingItemId as string;

  const [isMounted, setIsMounted] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [gastronomyOrder, setGastronomyOrder] = useState<GastronomyOrder | null>(null);
  const [isRecetaSelectorOpen, setIsRecetaSelectorOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<GastronomyOrderFormValues>({
    resolver: zodResolver(gastronomyOrderSchema),
  });

  const { fields, append, remove, update, move } = useFieldArray({
    control: form.control,
    name: "items",
    keyName: "key",
  });
  
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const oldIndex = fields.findIndex(f => f.id === active.id);
        const newIndex = fields.findIndex(f => f.id === over.id);
        move(oldIndex, newIndex);
    }
  }

  useEffect(() => {
    if (osId && briefingItemId) {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      setServiceOrder(allServiceOrders.find(os => os.id === osId) || null);

      const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
      const order = allGastroOrders.find(o => o.id === briefingItemId && o.osId === osId);
      
      if (order) {
        setGastronomyOrder(order);
        form.reset({
          id: order.id,
          status: order.status,
          items: order.items || [],
        });
      }
    }
    setIsMounted(true);
  }, [osId, briefingItemId, form]);

  const onSelectReceta = (receta: Receta) => {
    const existingIndex = fields.findIndex(item => item.id === receta.id);
    if (existingIndex > -1) {
      const existingItem = fields[existingIndex];
      update(existingIndex, { ...existingItem, quantity: (existingItem.quantity || 0) + 1 });
    } else {
      append({
        id: receta.id,
        type: 'item',
        nombre: receta.nombre,
        categoria: receta.categoria,
        costeMateriaPrima: receta.costeMateriaPrima,
        precioVenta: receta.precioVenta,
        quantity: 1,
      });
    }
    toast({ title: "Plato añadido", description: `${receta.nombre} ha sido añadido al pedido.` });
  };
  
  const addSeparator = () => {
    append({
        id: Date.now().toString(),
        type: 'separator',
        nombre: '',
        categoria: '',
        costeMateriaPrima: 0,
        precioVenta: 0,
        quantity: 0
    });
  }
  
  const totalPedido = useMemo(() => {
    return fields.reduce((acc, item) => {
        if(item.type === 'item') {
            return acc + ((item.precioVenta || 0) * (item.quantity || 0));
        }
        return acc;
    }, 0);
  }, [fields, form.watch('items')]); // watch items for changes

  const onSubmit = (data: GastronomyOrderFormValues) => {
    const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    const index = allGastroOrders.findIndex(o => o.id === briefingItemId && o.osId === osId);

    if (index > -1) {
      allGastroOrders[index] = {
        ...allGastroOrders[index],
        status: data.status,
        items: data.items,
        total: totalPedido,
      };

      localStorage.setItem('gastronomyOrders', JSON.stringify(allGastroOrders));
      toast({ title: "Pedido guardado", description: "Los cambios en el pedido de gastronomía han sido guardados." });
      router.push(`/os/${osId}/gastronomia`);
    } else {
      toast({ variant: "destructive", title: "Error", description: "No se pudo encontrar el pedido a actualizar." });
    }
  };

  if (!isMounted || !serviceOrder || !gastronomyOrder) {
    return <LoadingSkeleton title="Cargando Pedido de Gastronomía..." />;
  }

  return (
    <main>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                         <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {statusOptions.map(status => (
                                        <SelectItem key={status} value={status}>
                                        <Badge variant={statusVariant[status]}>{status}</Badge>
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                </FormItem>
                            )}
                            />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" type="button" onClick={() => router.push(`/os/${osId}/gastronomia`)}> <ArrowLeft className="mr-2"/> Cancelar</Button>
                        <Button type="submit"><Save className="mr-2" /> Guardar Pedido</Button>
                    </div>
                </div>

                <Card className="mb-8">
                    <CardHeader className="py-3">
                        <CardTitle className="text-lg">Resumen del Servicio</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-4 gap-x-4 gap-y-1 text-sm pt-0">
                        <div><span className="font-semibold text-muted-foreground">Fecha: </span>{format(new Date(gastronomyOrder.fecha), 'dd/MM/yyyy')}</div>
                        <div><span className="font-semibold text-muted-foreground">Hora: </span>{gastronomyOrder.horaInicio}</div>
                        <div><span className="font-semibold text-muted-foreground">Sala: </span>{gastronomyOrder.sala}</div>
                        <div><span className="font-semibold text-muted-foreground">Asistentes: </span>{gastronomyOrder.asistentes}</div>
                        {gastronomyOrder.comentarios && (
                            <div className="md:col-span-4"><span className="font-semibold text-muted-foreground">Comentarios: </span>{gastronomyOrder.comentarios}</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Platos del pedido</CardTitle>
                        <div className="flex gap-2">
                            <Button variant="secondary" type="button" onClick={addSeparator}><PlusCircle className="mr-2"/>+ Separador</Button>
                            <Dialog open={isRecetaSelectorOpen} onOpenChange={setIsRecetaSelectorOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" type="button"><PlusCircle className="mr-2"/>Añadir plato</Button>
                                </DialogTrigger>
                                <RecetaSelector onSelectReceta={onSelectReceta} />
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg">
                        <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead className="w-10"></TableHead>
                                      <TableHead>Nombre del Plato</TableHead>
                                      <TableHead>Categoría</TableHead>
                                      <TableHead>PVP (Ud.)</TableHead>
                                      <TableHead>Cantidad</TableHead>
                                      <TableHead>Subtotal</TableHead>
                                      <TableHead className="text-right">Acciones</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                  <TableBody>
                                      {fields.length > 0 ? (
                                          fields.map((field, index) => (
                                              <SortableTableRow key={field.key} field={{...field, key: field.id}} index={index} remove={remove} form={form} />
                                          ))
                                      ) : (
                                          <TableRow>
                                              <TableCell colSpan={7} className="h-24 text-center">
                                              No hay platos en este pedido.
                                              </TableCell>
                                          </TableRow>
                                      )}
                                  </TableBody>
                              </SortableContext>
                          </Table>
                        </DndContext>
                      </div>
                    </CardContent>
                    {fields.length > 0 && (
                         <CardFooter className="flex justify-end">
                            <div className="text-xl font-bold">
                                Total Pedido: {totalPedido.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </form>
        </Form>
    </main>
  );
}
