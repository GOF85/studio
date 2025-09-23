
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Save, Snowflake, Calendar as CalendarIcon, PlusCircle, Trash2, X } from 'lucide-react';
import type { ServiceOrder, ProveedorHielo, HieloOrder, HieloOrderItem } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const statusOptions: HieloOrder['status'][] = ['Pendiente', 'Confirmado', 'En reparto', 'Entregado'];

const hieloOrderSchema = z.object({
  id: z.string(),
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  proveedorId: z.string().min(1, 'Debes seleccionar un proveedor'),
  observaciones: z.string().optional(),
  status: z.enum(statusOptions).default('Pendiente'),
  items: z.array(z.object({
      id: z.string(),
      producto: z.string(),
      precio: z.number(),
      cantidad: z.coerce.number().min(1),
  })).min(1, 'El pedido debe tener al menos un artículo.'),
});

type HieloOrderFormValues = z.infer<typeof hieloOrderSchema>;

function ProductSelector({ onSelectProduct, providerId }: { onSelectProduct: (product: ProveedorHielo) => void, providerId: string }) {
  const [allProveedores, setAllProveedores] = useState<ProveedorHielo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const storedData = JSON.parse(localStorage.getItem('proveedorHielo') || '[]') as ProveedorHielo[];
    const providerName = storedData.find(p => p.id === providerId)?.nombreProveedor;
    const providerProducts = storedData.filter(p => p.nombreProveedor === providerName);
    setAllProveedores(providerProducts);
  }, [providerId]);
  
  const filteredItems = useMemo(() => {
    return allProveedores.filter(item => 
      item.producto.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allProveedores, searchTerm]);

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Seleccionar Producto</DialogTitle>
      </DialogHeader>
      <div className="my-4">
        <Input placeholder="Buscar producto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>
      <div className="max-h-[60vh] overflow-y-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map(product => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.producto}</TableCell>
                <TableCell>{product.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                <TableCell><Button size="sm" onClick={() => onSelectProduct(product)}>Añadir</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DialogContent>
  );
}


export default function PedidoHieloPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const orderId = searchParams.get('orderId');
  const isEditing = !!orderId;

  const [isMounted, setIsMounted] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [allProveedores, setAllProveedores] = useState<ProveedorHielo[]>([]);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<HieloOrderFormValues>({
    resolver: zodResolver(hieloOrderSchema),
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
    keyName: "key",
  });

  useEffect(() => {
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    setServiceOrder(currentOS || null);

    const storedProveedores = JSON.parse(localStorage.getItem('proveedorHielo') || '[]') as ProveedorHielo[];
    setAllProveedores(storedProveedores);

    if (isEditing) {
      const allOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
      const order = allOrders.find(o => o.id === orderId);
      if (order) {
        form.reset({
          ...order,
          observaciones: order.observaciones || '',
          fecha: new Date(order.fecha),
        });
      }
    } else {
      form.reset({
        id: Date.now().toString(),
        fecha: currentOS?.startDate ? new Date(currentOS.startDate) : new Date(),
        status: 'Pendiente',
        items: [],
        observaciones: '',
      });
    }
    
    setIsMounted(true);
  }, [osId, orderId, form, isEditing]);

  const selectedProviderId = form.watch('proveedorId');
  const uniqueProveedores = useMemo(() => {
      const providerNames = new Set<string>();
      return allProveedores.filter(p => {
          if (providerNames.has(p.nombreProveedor)) {
              return false;
          }
          providerNames.add(p.nombreProveedor);
          return true;
      });
  }, [allProveedores]);
  
  const onSelectProduct = (product: ProveedorHielo) => {
    const existingIndex = fields.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
      const existingItem = fields[existingIndex];
      update(existingIndex, { ...existingItem, cantidad: existingItem.cantidad + 1 });
    } else {
      append({
        id: product.id,
        producto: product.producto,
        precio: product.precio,
        cantidad: 1,
      });
    }
    toast({ title: "Producto añadido", description: `${product.producto} ha sido añadido al pedido.` });
  };
  
  const totalPedido = useMemo(() => {
    return fields.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  }, [fields, form.watch('items')]); // watch items for changes

  useEffect(() => {
    if (fields.length === 0) {
      const selectedProviderName = allProveedores.find(p => p.id === selectedProviderId)?.nombreProveedor;
      const firstProductOfProvider = allProveedores.find(p => p.nombreProveedor === selectedProviderName);
      if(firstProductOfProvider) {
          form.setValue('proveedorId', firstProductOfProvider.id);
      }
    }
  }, [selectedProviderId, form, allProveedores, fields]);
  
  const selectedProviderName = useMemo(() => {
    if (!selectedProviderId) return '';
    return uniqueProveedores.find(p => p.id === selectedProviderId)?.nombreProveedor || '';
  }, [selectedProviderId, uniqueProveedores]);


  const onSubmit = (data: HieloOrderFormValues) => {
    if (!osId || !selectedProviderId || !selectedProviderName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Faltan datos para crear el pedido.' });
      return;
    }

    const allOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
    
    const finalOrder: HieloOrder = {
      id: data.id,
      osId,
      fecha: format(data.fecha, 'yyyy-MM-dd'),
      proveedorId: selectedProviderId,
      proveedorNombre: selectedProviderName,
      items: data.items,
      total: totalPedido,
      observaciones: data.observaciones || '',
      status: data.status,
    };

    if (isEditing) {
      const index = allOrders.findIndex(o => o.id === orderId);
      if (index !== -1) {
        allOrders[index] = { ...allOrders[index], ...finalOrder };
        toast({ title: "Pedido actualizado" });
      }
    } else {
      allOrders.push(finalOrder);
      toast({ title: "Pedido de hielo creado" });
    }

    localStorage.setItem('hieloOrders', JSON.stringify(allOrders));
    router.push(`/hielo?osId=${osId}`);
  };

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Cargando Pedido de Hielo..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/hielo?osId=${osId}`)} className="mb-2">
                            <ArrowLeft className="mr-2" />
                            Volver al Módulo
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Snowflake />{isEditing ? 'Editar' : 'Nuevo'} Pedido de Hielo</h1>
                        <p className="text-muted-foreground">Para la OS: {serviceOrder.serviceNumber}</p>
                    </div>
                    <div className="flex gap-2">
                         <Button variant="outline" type="button" onClick={() => router.push(`/hielo?osId=${osId}`)}>
                            <X className="mr-2 h-4 w-4" />
                            Cancelar
                        </Button>
                        <Button type="submit"><Save className="mr-2" /> Guardar Pedido</Button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <Card>
                             <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
                             <CardContent className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="fecha" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Fecha del Servicio</FormLabel>
                                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); setIsCalendarOpen(false);}} initialFocus locale={es} />
                                            </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="status" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estado</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Estado..." /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="proveedorId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Proveedor</FormLabel>
                                        <Select onValueChange={(value) => { field.onChange(value); form.setValue('items', [])}} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {uniqueProveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreProveedor}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                 <FormField control={form.control} name="observaciones" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Observaciones</FormLabel>
                                    <FormControl><Textarea {...field} rows={4} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )} />
                             </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Artículos del Pedido</CardTitle>
                                <CardDescription>Añade o modifica los productos.</CardDescription>
                            </div>
                            <Dialog open={isProductSelectorOpen} onOpenChange={setIsProductSelectorOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" type="button" disabled={!selectedProviderId}><PlusCircle className="mr-2"/>Añadir</Button>
                                </DialogTrigger>
                                {selectedProviderId && <ProductSelector onSelectProduct={onSelectProduct} providerId={selectedProviderId} />}
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead>Precio</TableHead>
                                            <TableHead>Cantidad</TableHead>
                                            <TableHead>Subtotal</TableHead>
                                            <TableHead className="text-right"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.length > 0 ? (
                                            fields.map((field, index) => (
                                                <TableRow key={field.key}>
                                                    <TableCell className="font-medium">{field.producto}</TableCell>
                                                    <TableCell>{field.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                                                    <TableCell>
                                                        <Input type="number" min="1" className="w-20" {...form.register(`items.${index}.cantidad`)} />
                                                    </TableCell>
                                                    <TableCell>{(field.precio * form.watch(`items.${index}.cantidad`)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)} type="button">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">No hay productos en el pedido.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        {fields.length > 0 && (
                            <CardFooter className="flex justify-end">
                                <div className="text-xl font-bold">
                                    Total: {totalPedido.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </div>
                            </CardFooter>
                        )}
                    </Card>
                </div>
            </form>
        </Form>
      </main>
    </>
  );
}
