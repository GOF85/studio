
      
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm, FormProvider, useWatch, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, FileDown, Loader2, Trash2, Package, Save, X, Truck, PlusCircle } from 'lucide-react';

import type { Entrega, ProductoVenta, PedidoEntrega, PedidoEntregaItem, TransporteOrder, EntregaHito } from '@/types';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatCurrency } from '@/lib/utils';

const entregaFormSchema = z.object({
  serviceNumber: z.string().min(1, 'El Nº de Pedido es obligatorio'),
  startDate: z.date({ required_error: 'La fecha es obligatoria.' }),
  client: z.string().min(1, 'El cliente es obligatorio.'),
  asistentes: z.coerce.number().min(1, 'El número de asistentes es obligatorio.'),
  contact: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  finalClient: z.string().optional().default(''),
  status: z.enum(['Borrador', 'Confirmado', 'Enviado', 'Entregado']).default('Borrador'),
  tipoCliente: z.enum(['Empresa', 'Agencia', 'Particular']).optional(),
  comercial: z.string().optional().default(''),
});

export type EntregaFormValues = z.infer<typeof entregaFormSchema>;

const defaultValues: Partial<EntregaFormValues> = {
  serviceNumber: '', 
  client: '', 
  asistentes: 1,
  contact: '',
  phone: '',
  finalClient: '',
  status: 'Borrador',
  tipoCliente: 'Empresa',
  comercial: '',
};

const hitoDialogSchema = z.object({
    id: z.string(),
    fecha: z.date(),
    hora: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM"),
    lugarEntrega: z.string().min(1, "El lugar de entrega es obligatorio"),
    contacto: z.string().optional(),
    telefono: z.string().optional(),
    observaciones: z.string().optional(),
});
type HitoDialogFormValues = z.infer<typeof hitoDialogSchema>;


function HitoDialog({ onSave, initialData, os }: { onSave: (data: EntregaHito) => void; initialData?: Partial<EntregaHito>; os: Entrega | null }) {
    const [isOpen, setIsOpen] = useState(false);
    const form = useForm<HitoDialogFormValues>({
        resolver: zodResolver(hitoDialogSchema),
        defaultValues: {
            id: initialData?.id || Date.now().toString(),
            fecha: initialData?.fecha ? new Date(initialData.fecha) : (os?.startDate ? new Date(os.startDate) : new Date()),
            hora: initialData?.hora || '10:00',
            lugarEntrega: initialData?.lugarEntrega || os?.spaceAddress || '',
            contacto: initialData?.contacto || os?.contact || '',
            telefono: initialData?.telefono || os?.phone || '',
            observaciones: initialData?.observaciones || '',
        }
    });

    const handleSubmit = (data: HitoDialogFormValues) => {
        onSave({
            ...data,
            fecha: format(data.fecha, 'yyyy-MM-dd'),
            items: initialData?.items || [],
        });
        setIsOpen(false);
        form.reset();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button>
                    <PlusCircle className="mr-2"/>
                    Añadir Entrega
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Editar' : 'Nueva'} Entrega</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField control={form.control} name="fecha" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Fecha</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="hora" render={({ field }) => (
                            <FormItem><FormLabel>Hora</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="lugarEntrega" render={({ field }) => (
                            <FormItem><FormLabel>Lugar de Entrega</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="contacto" render={({ field }) => (<FormItem><FormLabel>Contacto</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="telefono" render={({ field }) => (<FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

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
                 <div></div>
                <FormField control={control} name="finalClient" render={({ field }) => (
                    <FormItem className="md:col-span-3">
                        <FormLabel>Cliente Final</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                )} />
                <FormField control={control} name="contact" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contacto</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
            </div>
        </AccordionContent>
    )
}

const ClientAccordionTrigger = () => {
    const { watch } = useFormContext();
    const client = watch('client');
    const finalClient = watch('finalClient');
    return (
        <div className="flex w-full items-center justify-between p-4">
            <h3 className="text-lg font-semibold">Información del Cliente</h3>
            {client && <span className="text-sm font-medium text-primary">{client}</span>}
        </div>
    )
}

export default function EntregaFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isEditing = id !== 'nuevo';

  const [isMounted, setIsMounted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [hitos, setHitos] = useState<EntregaHito[]>([]);
  
  const form = useForm<EntregaFormValues>({
    resolver: zodResolver(entregaFormSchema),
    defaultValues,
  });

  const { control, handleSubmit, formState: { isDirty }, getValues } = form;
  
  useEffect(() => {
    if (isEditing) {
      const allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
      const currentEntrega = allEntregas.find(e => e.id === id);
      
      const allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
      const currentPedido = allPedidosEntrega.find(p => p.osId === id);

      if (currentEntrega) {
        form.reset({
            ...(defaultValues as any),
            ...currentEntrega,
            startDate: new Date(currentEntrega.startDate),
        });
        setHitos(currentPedido?.hitos || []);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el pedido de entrega.' });
        router.push('/entregas/pes');
      }
    } else {
      form.reset({
          ...defaultValues,
          startDate: new Date(),
      });
    }
    setIsMounted(true);
  }, [id, isEditing, form, router, toast]);
  
  const handleSaveHito = (hitoData: EntregaHito) => {
     setHitos(prevHitos => {
         const existingIndex = prevHitos.findIndex(h => h.id === hitoData.id);
         if (existingIndex > -1) {
             const newHitos = [...prevHitos];
             newHitos[existingIndex] = hitoData;
             return newHitos;
         }
         return [...prevHitos, hitoData];
     });
  }
  
  const handleDeleteHito = (index: number) => {
      setHitos(prevHitos => prevHitos.filter((_, i) => i !== index));
  }

  function onSubmit(data: EntregaFormValues) {
    setIsLoading(true);
    let allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
    let allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
    let message = '';
    let currentId = isEditing ? id : Date.now().toString();

    const entregaData: Entrega = {
        ...(data as any),
        id: currentId,
        startDate: data.startDate.toISOString(),
        endDate: data.startDate.toISOString(),
        vertical: 'Entregas',
        deliveryTime: hitos?.[0]?.hora || '', 
        space: '',
        spaceAddress: hitos?.[0]?.lugarEntrega || '',
    }
    
    const pedidoEntregaData: PedidoEntrega = {
        osId: currentId,
        hitos: hitos,
    }

    if (isEditing) {
      const entregaIndex = allEntregas.findIndex(e => e.id === id);
      if (entregaIndex > -1) {
        allEntregas[entregaIndex] = entregaData;
      }
      const pedidoIndex = allPedidosEntrega.findIndex(p => p.osId === id);
      if(pedidoIndex > -1) {
          allPedidosEntrega[pedidoIndex] = pedidoEntregaData;
      } else {
          allPedidosEntrega.push(pedidoEntregaData);
      }
      message = 'Pedido de entrega actualizado.';
    } else {
       const existing = allEntregas.find(e => e.serviceNumber === data.serviceNumber);
        if (existing) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ya existe un pedido con este número.' });
            setIsLoading(false);
            return;
        }
      allEntregas.push(entregaData);
      allPedidosEntrega.push(pedidoEntregaData);
      message = 'Pedido de entrega creado.';
    }

    localStorage.setItem('entregas', JSON.stringify(allEntregas));
    localStorage.setItem('pedidosEntrega', JSON.stringify(allPedidosEntrega));
    
    toast({ description: message });
    setIsLoading(false);
    router.push('/entregas/pes');
  }

  const handleDelete = () => {
    if (!isEditing) return;
    
    let allEntregas = JSON.parse(localStorage.getItem('entregas') || '[]') as Entrega[];
    allEntregas = allEntregas.filter(e => e.id !== id);
    localStorage.setItem('entregas', JSON.stringify(allEntregas));

    let allPedidosEntrega = JSON.parse(localStorage.getItem('pedidosEntrega') || '[]') as PedidoEntrega[];
    allPedidosEntrega = allPedidosEntrega.filter(p => p.osId !== id);
    localStorage.setItem('pedidosEntrega', JSON.stringify(allPedidosEntrega));

    toast({ title: 'Pedido eliminado' });
    router.push('/entregas/pes');
  };
  
  const calculateHitoTotal = (hito: EntregaHito): number => {
    return hito.items.reduce((sum, item) => sum + ((item.pvp || 0) * item.quantity), 0);
  }

  if (!isMounted) {
    return <LoadingSkeleton title={isEditing ? 'Editando Pedido...' : 'Nuevo Pedido...'} />;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-headline font-bold">{isEditing ? 'Editar' : 'Nuevo'} Pedido de Entrega</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/entregas/pes')}>Cancelar</Button>
          {isEditing && (
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2"/>Borrar</Button>
          )}
          <Button type="submit" form="entrega-form" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
            {isEditing ? 'Guardar Cambios' : 'Guardar Pedido'}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
             <FormProvider {...form}>
              <form id="entrega-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Card>
                    <CardHeader className="py-3">
                        <CardTitle className="text-lg">Información General del Pedido</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-2">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <FormField control={control} name="serviceNumber" render={({ field }) => (
                                <FormItem><FormLabel>Nº Pedido</FormLabel><FormControl><Input {...field} readOnly={isEditing} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={control} name="startDate" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Fecha Principal</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                            )} />
                             <FormField control={control} name="status" render={({ field }) => (
                                <FormItem><FormLabel>Estado</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="Borrador">Borrador</SelectItem><SelectItem value="Confirmado">Confirmado</SelectItem><SelectItem value="Enviado">Enviado</SelectItem><SelectItem value="Entregado">Entregado</SelectItem></SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={control} name="asistentes" render={({ field }) => (
                                <FormItem><FormLabel>Nº Asistentes</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    </CardContent>
                </Card>
                
                 <Accordion type="single" collapsible defaultValue={isEditing ? undefined : "cliente-info"} className="w-full">
                    <AccordionItem value="cliente-info" className="border-none">
                        <Card>
                            <AccordionTrigger className="p-0"><ClientAccordionTrigger /></AccordionTrigger>
                            <ClientInfo />
                        </Card>
                    </AccordionItem>
                </Accordion>
              </form>
            </FormProvider>
            
            <Card>
                <CardHeader className="flex-row justify-between items-center py-3">
                    <CardTitle className="text-lg">Hitos de Entrega</CardTitle>
                    <HitoDialog onSave={handleSaveHito} os={getValues() as unknown as Entrega} />
                </CardHeader>
                <CardContent className="space-y-2">
                    {hitos.map((hito, index) => (
                         <Card key={hito.id} className="hover:bg-secondary/50">
                            <CardHeader className="p-3 flex-row justify-between items-center">
                                <div className="space-y-1">
                                    <p className="font-bold text-base">
                                        <span className="text-primary">{`${getValues('serviceNumber') || 'Pedido'}.${(index + 1).toString().padStart(2, '0')}`}</span> - {hito.lugarEntrega}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{format(new Date(hito.fecha), "PPP", { locale: es })} - {hito.hora}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                     <div className="font-bold text-lg text-green-600">
                                        {formatCurrency(calculateHitoTotal(hito))}
                                     </div>
                                     <Button asChild size="sm">
                                        <Link href={`/entregas/entrega/${hito.id}?osId=${id}`}>
                                            Confeccionar
                                        </Link>
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => {e.stopPropagation(); handleDeleteHito(index)}}><Trash2 /></Button>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                     {hitos.length === 0 && (
                        <div className="text-center text-muted-foreground py-10">No hay entregas definidas para este pedido.</div>
                     )}
                </CardContent>
            </Card>
        </div>
      
       <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción es irreversible. Se eliminará permanentemente el pedido de entrega.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </main>
  );
}

    
