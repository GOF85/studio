
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, Save, ArrowLeft, Utensils } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type { ServiceOrder, ComercialBriefing, ComercialBriefingItem, GastronomyOrderItem, GastronomyOrderStatus, Receta, TipoServicio } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const gastronomyOrderItemSchema = z.object({
  id: z.string(),
  type: z.enum(['item', 'separator']),
  nombre: z.string(),
  categoria: z.string().optional(),
  costeMateriaPrima: z.number().optional(),
  precioVenta: z.number().optional(),
  quantity: z.coerce.number().optional(),
});

const formSchema = z.object({
    gastro_status: z.enum(['Pendiente', 'En preparación', 'Listo', 'Incidencia']),
    gastro_items: z.array(gastronomyOrderItemSchema).default([]),
});

type FormValues = z.infer<typeof formSchema>;

export default function PedidoGastronomiaPage() {
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const briefingItemId = params.briefingItemId as string;

  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  
  // --- Estados de depuración ---
  const [debugOs, setDebugOs] = useState<ServiceOrder | null>(null);
  const [debugBriefing, setDebugBriefing] = useState<ComercialBriefing | null>(null);
  const [debugHito, setDebugHito] = useState<ComercialBriefingItem | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        gastro_status: 'Pendiente',
        gastro_items: [],
    }
  });

  const { control, handleSubmit, reset } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "gastro_items",
  });

  useEffect(() => {
    if (osId && briefingItemId) {
      try {
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const currentOS = allServiceOrders.find(os => os.id === osId);
        setDebugOs(currentOS || null);

        const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
        const currentBriefing = allBriefings.find(b => b.osId === osId);
        setDebugBriefing(currentBriefing || null);

        if (currentBriefing) {
            const currentHito = currentBriefing.items.find(item => item.id === briefingItemId);
            setDebugHito(currentHito || null);
            if (currentHito) {
                reset({
                    gastro_status: currentHito.gastro_status || 'Pendiente',
                    gastro_items: currentHito.gastro_items || [],
                });
            }
        }
      } catch (e) {
        console.error("Error loading data:", e);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos. La información puede estar corrupta.' });
      }
    }
    setIsMounted(true);
  }, [osId, briefingItemId, reset, toast]);

  const onSubmit = (data: FormValues) => {
    // Lógica de guardado que ya funcionaba
    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const briefingIndex = allBriefings.findIndex(b => b.osId === osId);

    if (briefingIndex !== -1) {
      const hitoIndex = allBriefings[briefingIndex].items.findIndex(i => i.id === briefingItemId);
      if (hitoIndex !== -1) {
        allBriefings[briefingIndex].items[hitoIndex] = {
            ...allBriefings[briefingIndex].items[hitoIndex],
            gastro_status: data.gastro_status,
            gastro_items: data.gastro_items,
        };
        localStorage.setItem('comercialBriefings', JSON.stringify(allBriefings));
        toast({ title: "Pedido guardado", description: "Los cambios en el pedido de gastronomía han sido guardados." });
        router.push(`/os/${osId}/gastronomia`);
      }
    }
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Pedido de Gastronomía..." />;
  }

  return (
    <main>
        <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/os/${osId}/gastronomia`)}>
                <ArrowLeft className="mr-2" /> Volver al listado
            </Button>
            <h1 className="text-xl font-bold">Debug Info</h1>
        </div>
        
        {/* Bloques de Depuración Visual */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
                <CardHeader><CardTitle>ServiceOrder (OS)</CardTitle></CardHeader>
                <CardContent className="text-xs max-h-48 overflow-y-auto"><pre>{JSON.stringify(debugOs, null, 2)}</pre></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>ComercialBriefing</CardTitle></CardHeader>
                <CardContent className="text-xs max-h-48 overflow-y-auto"><pre>{JSON.stringify(debugBriefing, null, 2)}</pre></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>BriefingItem (Hito)</CardTitle></CardHeader>
                <CardContent className="text-xs max-h-48 overflow-y-auto"><pre>{JSON.stringify(debugHito, null, 2)}</pre></CardContent>
            </Card>
        </div>

        {!debugHito ? (
             <Card>
                <CardHeader><CardTitle className="text-destructive">Error de Carga</CardTitle></CardHeader>
                <CardContent><p>No se han podido cargar los datos para este pedido. Revisa la información de depuración de arriba.</p></CardContent>
             </Card>
        ) : (
            <Form {...form}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Card>
                        <CardHeader>
                            <CardTitle>{debugHito.descripcion}</CardTitle>
                            <CardDescription>
                                Fecha: {format(new Date(debugHito.fecha), 'dd/MM/yyyy')} | Asistentes: {debugHito.asistentes}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Plato</TableHead><TableHead>Cantidad</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {fields.length > 0 ? fields.map((field, index) => (
                                        <TableRow key={field.id}>
                                            <TableCell>{field.nombre}</TableCell>
                                            <TableCell>{field.quantity}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={2} className="text-center h-24">No hay platos en este pedido.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                         <CardFooter>
                            <Button type="submit">Guardar</Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
        )}
    </main>
  );
}
