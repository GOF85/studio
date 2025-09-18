'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { ArrowLeft, Save, Trash2, PlusCircle, Utensils } from 'lucide-react';
import type { ServiceOrder, GastronomyOrder, GastronomiaDBItem, GastronomyOrderItem, GastronomyOrderStatus } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

const statusOptions: GastronomyOrderStatus[] = ['Pendiente', 'En preparación', 'Listo', 'Incidencia'];
const statusVariant: { [key in GastronomyOrderStatus]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  Pendiente: 'secondary',
  'En preparación': 'outline',
  Listo: 'default',
  Incidencia: 'destructive',
};


const gastronomyOrderSchema = z.object({
    id: z.string(),
    status: z.enum(statusOptions),
    items: z.array(z.object({
        id: z.string(),
        referencia: z.string(),
        categoria: z.string(),
        precio: z.number(),
        gramaje: z.number(),
        quantity: z.coerce.number().min(1),
    })).default([]),
});

type GastronomyOrderFormValues = z.infer<typeof gastronomyOrderSchema>;

function PlatoSelector({ onSelectPlato }: { onSelectPlato: (plato: GastronomiaDBItem) => void }) {
  const [gastronomiaDB, setGastronomiaDB] = useState<GastronomiaDBItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const storedData = localStorage.getItem('gastronomiaDB') || '[]';
    setGastronomiaDB(JSON.parse(storedData));
  }, []);

  const categories = useMemo(() => ['all', ...new Set(gastronomiaDB.map(item => item.categoria))], [gastronomiaDB]);

  const filteredItems = useMemo(() => {
    return gastronomiaDB.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.categoria === selectedCategory;
      const matchesSearch = item.referencia.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [gastronomiaDB, searchTerm, selectedCategory]);

  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>Seleccionar Plato</DialogTitle>
      </DialogHeader>
      <div className="flex gap-4 my-4">
        <Input placeholder="Buscar por referencia..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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
              <TableHead>Referencia</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map(plato => (
              <TableRow key={plato.id}>
                <TableCell className="font-medium flex items-center gap-3">
                  {plato.imagenRef && <Image src={plato.imagenRef} alt={plato.referencia} width={32} height={32} className="rounded-sm object-cover" />}
                  {plato.referencia}
                </TableCell>
                <TableCell>{plato.categoria}</TableCell>
                <TableCell>{plato.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                <TableCell><Button size="sm" onClick={() => onSelectPlato(plato)}>Añadir</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DialogContent>
  );
}

export default function PedidoGastronomiaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const briefingItemId = searchParams.get('briefingItemId');

  const [isMounted, setIsMounted] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [gastronomyOrder, setGastronomyOrder] = useState<GastronomyOrder | null>(null);
  const [isPlatoSelectorOpen, setIsPlatoSelectorOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<GastronomyOrderFormValues>({
    resolver: zodResolver(gastronomyOrderSchema),
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
    keyName: "key",
  });

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

  const onSelectPlato = (plato: GastronomiaDBItem) => {
    const existingIndex = fields.findIndex(item => item.id === plato.id);
    if (existingIndex > -1) {
      const existingItem = fields[existingIndex];
      update(existingIndex, { ...existingItem, quantity: existingItem.quantity + 1 });
    } else {
      append({
        id: plato.id,
        referencia: plato.referencia,
        categoria: plato.categoria,
        precio: plato.precio,
        gramaje: plato.gramaje,
        quantity: 1,
      });
    }
    toast({ title: "Plato añadido", description: `${plato.referencia} ha sido añadido al pedido.` });
  };
  
  const totalPedido = useMemo(() => {
    return fields.reduce((acc, item) => acc + (item.precio * item.quantity), 0);
  }, [fields]);

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
      router.push(`/gastronomia?osId=${osId}`);
    } else {
      toast({ variant: "destructive", title: "Error", description: "No se pudo encontrar el pedido a actualizar." });
    }
  };

  if (!isMounted || !serviceOrder || !gastronomyOrder) {
    return <LoadingSkeleton title="Cargando Pedido de Gastronomía..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/gastronomia?osId=${osId}`)} className="mb-2">
                            <ArrowLeft className="mr-2" />
                            Volver al Módulo
                        </Button>
                        <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Utensils />Pedido de Gastronomía</h1>
                        <p className="text-muted-foreground">{gastronomyOrder.descripcion} para OS: {serviceOrder.serviceNumber}</p>
                    </div>
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
                        <Button type="submit"><Save className="mr-2" /> Guardar Pedido</Button>
                    </div>
                </div>

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Resumen del Servicio</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-4 gap-4 text-sm">
                        <div><span className="font-semibold text-muted-foreground">Fecha: </span>{format(new Date(gastronomyOrder.fecha), 'dd/MM/yyyy')}</div>
                        <div><span className="font-semibold text-muted-foreground">Hora: </span>{gastronomyOrder.horaInicio}</div>
                        <div><span className="font-semibold text-muted-foreground">Sala: </span>{gastronomyOrder.sala}</div>
                        <div><span className="font-semibold text-muted-foreground">Asistentes: </span>{gastronomyOrder.asistentes}</div>
                        <div className="md:col-span-4"><span className="font-semibold text-muted-foreground">Comentarios: </span>{gastronomyOrder.comentarios || 'N/A'}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div >
                            <CardTitle>Platos del Pedido</CardTitle>
                            <CardDescription>Añade o modifica los platos para este servicio de gastronomía.</CardDescription>
                        </div>
                         <Dialog open={isPlatoSelectorOpen} onOpenChange={setIsPlatoSelectorOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline"><PlusCircle className="mr-2"/>Añadir Plato</Button>
                            </DialogTrigger>
                            <PlatoSelector onSelectPlato={onSelectPlato} />
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Referencia</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead>Precio Ud.</TableHead>
                                        <TableHead>Cantidad</TableHead>
                                        <TableHead>Subtotal</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                     {fields.length > 0 ? (
                                        fields.map((field, index) => (
                                            <TableRow key={field.key}>
                                                <TableCell className="font-medium">{field.referencia}</TableCell>
                                                <TableCell>{field.categoria}</TableCell>
                                                <TableCell>{field.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                                                <TableCell>
                                                    <Input 
                                                        type="number" 
                                                        min="1" 
                                                        className="w-20"
                                                        {...form.register(`items.${index}.quantity`)}
                                                    />
                                                </TableCell>
                                                <TableCell>{(field.precio * form.watch(`items.${index}.quantity`)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                            No hay platos en este pedido.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                             </Table>
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
    </>
  );
}
