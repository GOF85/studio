'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ElaboracionProduccion, ComponenteElaboracion } from '@/types';
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

  const defaultValues: ProduccionFormValues = {
    cantidad_real_producida: cantidadPlanificada || 1,
    componentes_utilizados: (componentesBase || []).map(c => ({
      componenteId: c.componenteId || '',
      nombre: c.nombre || '',
      cantidad_planificada: c.cantidad || 0,
      cantidad_real: c.cantidad || 0,
      merma_real: 0,
      merma_porcentaje: 0,
    })),
    observaciones: '',
  };

  const form = useForm<ProduccionFormValues>({
    resolver: zodResolver(produccionFormSchema),
    mode: 'onChange',
    defaultValues,
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'componentes_utilizados',
  });

  // Resetear form cuando se abre/cambia - solo por isOpen y editingProduccion
  useEffect(() => {
    if (!isOpen) return;

    if (editingProduccion) {
      form.reset({
        cantidad_real_producida: editingProduccion.cantidad_real_producida || cantidadPlanificada,
        componentes_utilizados: (editingProduccion.componentes_utilizados || []).length > 0 
          ? editingProduccion.componentes_utilizados 
          : defaultValues.componentes_utilizados,
        observaciones: editingProduccion.observaciones || '',
      });
    } else {
      form.reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingProduccion?.id]);

  const onSubmit = async (data: ProduccionFormValues) => {
    try {
      if (!user?.email) {
        toast({ variant: 'destructive', title: 'Error', description: 'No hay usuario autenticado' });
        return;
      }

      setIsLoading(true);

      const produccionData = {
        elaboracion_id: elaboracionId,
        fecha_produccion: new Date().toISOString(),
        responsable: user.email,
        cantidad_real_producida: data.cantidad_real_producida,
        componentes_utilizados: data.componentes_utilizados,
        observaciones: data.observaciones || '',
      };

      let error: any = null;

      if (editingProduccion) {
        const result = await supabase
          .from('elaboracion_producciones')
          .update(produccionData)
          .eq('id', editingProduccion.id);
        error = result.error;
        if (!error) {
          toast({ description: 'Producción actualizada.' });
        }
      } else {
        const result = await supabase
          .from('elaboracion_producciones')
          .insert([produccionData]);
        error = result.error;
        if (!error) {
          toast({ description: 'Producción registrada.' });
        }
      }

      if (error) {
        throw new Error(error.message || 'Error al guardar la producción');
      }

      form.reset(defaultValues);
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error('Error saving production:', e);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: e?.message || 'Error desconocido al guardar' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComponenteChange = (index: number, newValue: number) => {
    try {
      const componentes = form.getValues('componentes_utilizados');
      if (!componentes || !componentes[index]) return;

      const comp = { ...componentes[index] };
      comp.cantidad_real = newValue;

      if (comp.cantidad_planificada > 0) {
        comp.merma_real = Math.max(0, comp.cantidad_planificada - comp.cantidad_real);
        comp.merma_porcentaje = (comp.merma_real / comp.cantidad_planificada) * 100;
      }

      componentes[index] = comp;
      form.setValue('componentes_utilizados', componentes, { shouldDirty: true });
    } catch (e) {
      console.error('Error updating componente:', e);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProduccion ? 'Editar Producción' : 'Registrar Nueva Producción'}
          </DialogTitle>
        </DialogHeader>

        {form ? (
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
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        value={field.value || ''}
                        className="text-base h-10"
                        placeholder="Ej: 50"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* COMPONENTES UTILIZADOS */}
              <div className="space-y-3">
                <FormLabel className="text-sm font-semibold">Componentes Utilizados</FormLabel>
                <div className="border rounded-lg overflow-hidden bg-white">
                  <Table className="text-sm">
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="text-sm py-3 px-4 font-semibold">Componente</TableHead>
                        <TableHead className="text-sm py-3 px-4 font-semibold text-right">Planificado</TableHead>
                        <TableHead className="text-sm py-3 px-4 font-semibold text-right">Real Utilizado</TableHead>
                        <TableHead className="text-sm py-3 px-4 font-semibold text-right">Merma %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields && fields.length > 0 ? (
                        fields.map((field, index) => {
                          const cantidadReal = form.watch(`componentes_utilizados.${index}.cantidad_real`) || 0;
                          const mermaPorc = form.watch(`componentes_utilizados.${index}.merma_porcentaje`) || 0;
                          const planificada = form.watch(`componentes_utilizados.${index}.cantidad_planificada`) || 0;
                          const nombre = form.watch(`componentes_utilizados.${index}.nombre`) || 'Sin nombre';
                          
                          return (
                            <TableRow key={field.id} className="border-t hover:bg-slate-50">
                              <TableCell className="py-3 px-4 font-medium">
                                {nombre}
                              </TableCell>
                              <TableCell className="py-3 px-4 text-right text-slate-600">
                                {Number(planificada).toFixed(2)}
                              </TableCell>
                              <TableCell className="py-3 px-4 text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={cantidadReal || ''}
                                  onChange={(e) => handleComponenteChange(index, parseFloat(e.target.value) || 0)}
                                  className="h-9 text-right font-medium"
                                  placeholder="0"
                                  min="0"
                                />
                              </TableCell>
                              <TableCell className="py-3 px-4 text-right font-semibold text-red-600">
                                {Number(mermaPorc).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="py-3 px-4 text-center text-slate-500">
                            Sin componentes
                          </TableCell>
                        </TableRow>
                      )}
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
                        value={field.value || ''}
                        placeholder="Notas sobre la producción..."
                        rows={3}
                        className="resize-none text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* FOOTER */}
              <DialogFooter className="flex gap-2 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white" 
                  disabled={isLoading || !form.formState.isValid}
                >
                  {isLoading ? 'Guardando...' : editingProduccion ? 'Actualizar' : 'Registrar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="p-4 text-red-600">Error al cargar el formulario</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
