
'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Save, Trash2, PlusCircle, Utensils, Loader2 } from 'lucide-react';
import type { ServiceOrder, ComercialBriefing, ComercialBriefingItem, GastronomyOrderItem, Receta, GastronomyOrderStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const gastroItemSchema = z.object({
  id: z.string(),
  type: z.enum(['item', 'separator']),
  nombre: z.string(),
  categoria: z.string().optional(),
  costeMateriaPrima: z.number().optional(),
  precioVenta: z.number().optional(),
  quantity: z.number().optional(),
});

const formSchema = z.object({
  gastro_items: z.array(gastroItemSchema),
  gastro_status: z.enum(['Pendiente', 'En preparación', 'Listo', 'Incidencia']),
});

type FormValues = z.infer<typeof formSchema>;

function RecetaSelector({ onSelect }: { onSelect: (receta: Receta) => void }) {
    const [recetas, setRecetas] = useState<Receta[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const storedRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
        setRecetas(storedRecetas);
    }, []);
    
    const filteredRecetas = useMemo(() => {
        return recetas.filter(r => r.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [recetas, searchTerm]);

    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Seleccionar Receta</DialogTitle></DialogHeader>
            <Input placeholder="Buscar receta..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="text-right">Coste</TableHead>
                            <TableHead className="text-right">PVP</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecetas.map(receta => (
                            <TableRow key={receta.id}>
                                <TableCell>{receta.nombre}</TableCell>
                                <TableCell>{receta.categoria}</TableCell>
                                <TableCell className="text-right">{formatCurrency(receta.costeMateriaPrima || 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(receta.precioVenta || 0)}</TableCell>
                                <TableCell className="text-right"><Button size="sm" onClick={() => onSelect(receta)}>Añadir</Button></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
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

  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gastro_items: [],
      gastro_status: 'Pendiente',
    },
  });

  const { control, handleSubmit, reset } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "gastro_items" });

  useEffect(() => {
    if (osId && briefingItemId) {
      const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
      const currentBriefing = allBriefings.find(b => b.osId === osId);
      const currentHito = currentBriefing?.items.find(item => item.id === briefingItemId);

      if (currentHito) {
        setBriefingItem(currentHito);
        reset({
          gastro_items: currentHito.gastro_items || [],
          gastro_status: currentHito.gastro_status || 'Pendiente',
        });
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
        categoria: receta.categoria,
        costeMateriaPrima: receta.costeMateriaPrima,
        precioVenta: receta.precioVenta,
        quantity: serviceOrder?.asistentes || 1,
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
    setIsLoading(true);
    let allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const briefingIndex = allBriefings.findIndex(b => b.osId === osId);

    if (briefingIndex !== -1) {
      const hitoIndex = allBriefings[briefingIndex].items.findIndex(h => h.id === briefingItemId);
      if (hitoIndex !== -1) {
        allBriefings[briefingIndex].items[hitoIndex] = {
          ...allBriefings[briefingIndex].items[hitoIndex],
          gastro_items: data.gastro_items,
          gastro_status: data.gastro_status,
        };
        localStorage.setItem('comercialBriefings', JSON.stringify(allBriefings));
        toast({ title: 'Pedido de Gastronomía Guardado' });
        router.push(`/os/${osId}/gastronomia`);
      }
    }
    setIsLoading(false);
  };
  
  if (!isMounted || !briefingItem) {
    return <LoadingSkeleton title="Cargando pedido de gastronomía..." />;
  }

  return (
    <main>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
                <Button variant="ghost" size="sm" onClick={() => router.push(`/os/${osId}/gastronomia`)} className="mb-2">
                    <ArrowLeft className="mr-2" /> Volver al listado
                </Button>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Utensils />Pedido de Gastronomía</h1>
                <CardDescription>Para el servicio: {briefingItem.descripcion} - {format(new Date(briefingItem.fecha), 'dd/MM/yyyy')}</CardDescription>
            </div>
            <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2" />} 
                Guardar Pedido
            </Button>
          </div>
          
          <Card>
            <CardHeader className="flex-row justify-between items-center">
                <CardTitle>Platos del Pedido</CardTitle>
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => addSeparator('Nuevo Separador')}>Añadir Separador</Button>
                    <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline"><PlusCircle className="mr-2"/>Añadir Plato</Button>
                        </DialogTrigger>
                        <RecetaSelector onSelect={onAddReceta} />
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Referencia</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>PVP</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.length > 0 ? fields.map((field, index) => (
                            field.type === 'separator' ? (
                                <TableRow key={field.id} className="bg-muted/50">
                                    <TableCell colSpan={4}>
                                        <FormField
                                            control={control}
                                            name={`gastro_items.${index}.nombre`}
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
                                    <TableCell>{field.categoria}</TableCell>
                                    <TableCell>{formatCurrency(field.precioVenta || 0)}</TableCell>
                                    <TableCell>
                                        <FormField
                                            control={control}
                                            name={`gastro_items.${index}.quantity`}
                                            render={({ field: qtyField }) => (
                                                <Input type="number" {...qtyField} className="w-24 h-8" />
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
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
    </main>
  );
}

export default function PedidoGastronomiaPage() {
    return (
        // Suspense is important for pages using dynamic params
        <React.Suspense fallback={<LoadingSkeleton title="Cargando..." />}>
            <PedidoGastronomiaForm />
        </React.Suspense>
    );
}

