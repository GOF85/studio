

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Save, FilePlus, Calendar as CalendarIcon, Loader2, X } from 'lucide-react';
import type { ServiceOrder, AtipicoDBItem, AtipicoOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';

const statusOptions: AtipicoOrder['status'][] = ['Pendiente', 'Aprobado', 'Rechazado'];

const atipicoOrderSchema = z.object({
  id: z.string(),
  fecha: z.date({ required_error: 'La fecha es obligatoria.' }),
  concepto: z.string().min(1, 'El concepto es obligatorio'),
  observaciones: z.string().optional(),
  precio: z.coerce.number().min(0.01, 'El precio debe ser mayor que cero'),
  status: z.enum(statusOptions).default('Pendiente'),
});

type AtipicoOrderFormValues = z.infer<typeof atipicoOrderSchema>;

export default function PedidoAtipicoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const orderId = searchParams.get('orderId');
  const isEditing = !!orderId;

  const [isLoading, setIsLoading] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [atipicosDB, setAtipicosDB] = useState<AtipicoDBItem[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<AtipicoOrderFormValues>({
    resolver: zodResolver(atipicoOrderSchema),
  });

  const { setValue, watch } = form;
  const selectedConcepto = watch('concepto');

  useEffect(() => {
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    setServiceOrder(currentOS || null);

    const dbItems = JSON.parse(localStorage.getItem('atipicosDB') || '[]') as AtipicoDBItem[];
    setAtipicosDB(dbItems);

    if (isEditing) {
      const allOrders = JSON.parse(localStorage.getItem('atipicoOrders') || '[]') as AtipicoOrder[];
      const order = allOrders.find(o => o.id === orderId);
      if (order) {
        form.reset({
          ...order,
          fecha: new Date(order.fecha),
        });
      }
    } else {
      form.reset({
        id: Date.now().toString(),
        fecha: currentOS?.startDate ? new Date(currentOS.startDate) : new Date(),
        status: 'Pendiente',
        precio: 0,
        concepto: '',
        observaciones: '',
      });
    }
    
  }, [osId, orderId, form, isEditing]);

  useEffect(() => {
    const dbItem = atipicosDB.find(item => item.concepto.toLowerCase() === selectedConcepto?.toLowerCase());
    if (dbItem) {
      setValue('precio', dbItem.precio);
    }
  }, [selectedConcepto, atipicosDB, setValue]);

  const atipicosOptions = useMemo(() => {
    return atipicosDB.map(item => ({ label: item.concepto, value: item.concepto }));
  }, [atipicosDB]);

  const onSubmit = (data: AtipicoOrderFormValues) => {
    setIsLoading(true);
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Falta el ID de la Orden de Servicio.' });
      setIsLoading(false);
      return;
    }

    // Check if the concept is new. If so, add it to the DB.
    const isNewConcept = !atipicosDB.some(item => item.concepto.toLowerCase() === data.concepto.toLowerCase());
    if (isNewConcept) {
      const newDBItem: AtipicoDBItem = {
        id: Date.now().toString(),
        concepto: data.concepto,
        precio: data.precio,
      };
      const updatedDB = [...atipicosDB, newDBItem];
      localStorage.setItem('atipicosDB', JSON.stringify(updatedDB));
      setAtipicosDB(updatedDB);
      toast({ title: "Concepto nuevo guardado", description: `"${data.concepto}" se ha añadido a la base de datos.` });
    }

    const allOrders = JSON.parse(localStorage.getItem('atipicoOrders') || '[]') as AtipicoOrder[];
    
    const finalOrder: AtipicoOrder = {
      ...data,
      osId,
      fecha: format(data.fecha, 'yyyy-MM-dd'),
    };

    if (isEditing) {
      const index = allOrders.findIndex(o => o.id === orderId);
      if (index !== -1) {
        allOrders[index] = finalOrder;
        toast({ title: "Gasto actualizado" });
      }
    } else {
      allOrders.push(finalOrder);
      toast({ title: "Gasto atípico creado" });
    }

    localStorage.setItem('atipicoOrders', JSON.stringify(allOrders));
    
    setTimeout(() => {
        setIsLoading(false);
        router.push(`/atipicos?osId=${osId}`);
    }, 500);
  };

