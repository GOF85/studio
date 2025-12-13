'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ElaboracionProduccion, ComponenteProducido, ComponenteElaboracion } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';

// Zod Schema
const componenteProducidoSchema = z.object({
  componenteId: z.string(),
  nombre: z.string(),
  cantidad_planificada: z.coerce.number().min(0),
  cantidad_real: z.coerce.number().min(0),
  merma_real: z.coerce.number().min(0),
  merma_porcentaje: z.coerce.number().min(0).max(100),
});

const produccionFormSchema = z.object({
  cantidad_real_producida: z.coerce.number().min(0.001, 'La cantidad debe ser mayor a 0'),
  componentes_utilizados: z.array(componenteProducidoSchema),
  observaciones: z.string().optional().default(''),
});

type ProduccionFormValues = z.infer<typeof produccionFormSchema>;

interface AñadirProduccionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  elaboracionId: string;
  componentesBase: ComponenteElaboracion[];
  cantidadPlanificada: number;
  onSuccess: () => void;
  editingProduccion?: ElaboracionProduccion | null;
}

export function AñadirProduccionDialog({
  isOpen,
  onClose,
  elaboracionId,
  componentesBase,
  cantidadPlanificada,
  onSuccess,
  editingProduccion,
}: AñadirProduccionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProduccionFormValues>({
    resolver: zodResolver(produccionFormSchema),
    defaultValues: {
      cantidad_real_producida: cantidadPlanificada,
      componentes_utilizados: componentesBase.map(c => ({
        componenteId: c.componenteId,
        nombre: c.nombre,
        cantidad_planificada: c.cantidad,
        cantidad_real: c.cantidad,
        merma_real: 0,
        merma_porcentaje: 0,
      })),
      observaciones: '',
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'componentes_utilizados',
  });

  // Cargar datos si estamos editando
  useEffect(() => {
    if (editingProduccion && isOpen) {
      form.reset({
        cantidad_real_producida: editingProduccion.cantidad_real_producida,
        componentes_utilizados: editingProduccion.componentes_utilizados || componentesBase.map(c => ({
          componenteId: c.componenteId,
          nombre: c.nombre,
          cantidad_planificada: c.cantidad,
          cantidad_real: c.cantidad,
          merma_real: 0,
          merma_porcentaje: 0,
        })),
        observaciones: editingProduccion.observaciones || '',
      });
    } else if (isOpen) {
      form.reset({
        cantidad_real_producida: cantidadPlanificada,
        componentes_utilizados: componentesBase.map(c => ({
          componenteId: c.componenteId,
          nombre: c.nombre,
          cantidad_planificada: c.cantidad,
          cantidad_real: c.cantidad,
          merma_real: 0,
          merma_porcentaje: 0,
        })),
        observaciones: '',
      });
    }
  }, [editingProduccion, isOpen, componentesBase, cantidadPlanificada, form]);

  const onSubmit = async (data: ProduccionFormValues) => {
    if (!user?.email) {
      toast({ variant: 'destructive', title: 'Error', description: 'No hay usuario autenticado' });
      return;
    }

    setIsLoading(true);

    try {
      const produccionData = {
        elaboracion_id: elaboracionId,
        fecha_produccion: new Date().toISOString(),
        responsable: user.email,
        cantidad_real_producida: data.cantidad_real_producida,
        componentes_utilizados: data.componentes_utilizados,
        observaciones: data.observaciones,
      };

      if (editingProduccion) {
        // Actualizar
        const { error } = await supabase
          .from('elaboracion_producciones')
          .update(produccionData)
          .eq('id', editingProduccion.id);

        if (error) throw error;
        toast({ description: 'Producción actualizada.' });
      } else {
        // Crear nueva
        const { error } = await supabase
          .from('elaboracion_producciones')
          .insert([produccionData]);

        if (error) throw error;
        toast({ description: 'Producción registrada.' });
      }

      onSuccess();
      onClose();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComponenteChange = (index: number, field: keyof ComponenteProducido, value: any) => {
    const componentes = form.getValues('componentes_utilizados');
    const comp = { ...componentes[index], [field]: value };

    // Calcular merma_porcentaje si se modifica cantidad_real
    if (field === 'cantidad_real' && comp.cantidad_planificada > 0) {
      comp.merma_real = comp.cantidad_planificada - comp.cantidad_real;
      comp.merma_porcentaje = (comp.merma_real / comp.cantidad_planificada) * 100;
    }

    componentes[index] = comp;
    form.setValue('componentes_utilizados', componentes, { shouldDirty: true });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProduccion ? 'Editar Producción' : 'Registrar Nueva Producción'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* CANTIDAD REAL PRODUCIDA */}
            <FormField
              control={form.control}
              name="cantidad_real_producida"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Cantidad Real Producida</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      {...field}
                      value={field.value ?? ''}
                      className="text-sm"
                      placeholder="Ej: 50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* COMPONENTES UTILIZADOS */}
            <div className="space-y-3">
              <FormLabel className="text-sm font-semibold">Componentes Utilizados</FormLabel>
              <div className="border rounded-lg overflow-hidden">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs py-2">Componente</TableHead>
                      <TableHead className="text-xs py-2 text-right">Planificado</TableHead>
                      <TableHead className="text-xs py-2 text-right">Real Utilizado</TableHead>
                      <TableHead className="text-xs py-2 text-right">Merma %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id} className="border-t">
                        <TableCell className="py-2 font-medium text-xs w-1/4">
                          {form.watch(`componentes_utilizados.${index}.nombre`)}
                        </TableCell>
                        <TableCell className="py-2 text-right text-xs w-1/4">
                          {form.watch(`componentes_utilizados.${index}.cantidad_planificada`).toFixed(2)}
                        </TableCell>
                        <TableCell className="py-2 text-right w-1/4">
                          <Input
                            type="number"
                            step="any"
                            value={
                              form.watch(`componentes_utilizados.${index}.cantidad_real`) ?? ''
                            }
                            onChange={e =>
                              handleComponenteChange(index, 'cantidad_real', parseFloat(e.target.value) || 0)
                            }
                            className="h-7 text-xs text-center text-right"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="py-2 text-right text-xs w-1/4 font-semibold">
                          {form
                            .watch(`componentes_utilizados.${index}.merma_porcentaje`)
                            .toFixed(1)}
                          %
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* OBSERVACIONES */}
            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      placeholder="Notas sobre la producción..."
                      rows={3}
                      className="resize-none text-sm"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* FOOTER */}
            <DialogFooter className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? 'Guardando...' : editingProduccion ? 'Actualizar' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
