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
  DialogDescription,
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
  merma: z.coerce.number().min(0),
});

const produccionFormSchema = z.object({
  cantidad_a_producir: z.coerce.number().min(0.001, 'La cantidad debe ser mayor a 0'),
  cantidad_final_producida: z.coerce.number().min(0.001, 'La cantidad final debe ser mayor a 0'),
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
  unidadProduccion: string;
  onSuccess: () => void;
  editingProduccion?: ElaboracionProduccion | null;
}

export function AñadirProduccionDialog({
  isOpen,
  onClose,
  elaboracionId,
  componentesBase,
  cantidadPlanificada,
  unidadProduccion,
  onSuccess,
  editingProduccion,
}: AñadirProduccionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProduccionFormValues>({
    resolver: zodResolver(produccionFormSchema),
    mode: 'onChange',
    defaultValues: {
      cantidad_a_producir: cantidadPlanificada || 1,
      cantidad_final_producida: cantidadPlanificada || 1,
      componentes_utilizados: (componentesBase || []).map(c => ({
        componenteId: c.componenteId || '',
        nombre: c.nombre || '',
        cantidad_planificada: c.cantidad || 0,
        cantidad_real: c.cantidad || 0,
        merma: 0,
      })),
      observaciones: '',
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'componentes_utilizados',
  });

  const cantidadAProducir = form.watch('cantidad_a_producir');

  // Resetear form cuando se abre/cambia
  useEffect(() => {
    if (!isOpen) return;

    if (editingProduccion) {
      form.reset({
        cantidad_a_producir: editingProduccion.cantidad_real_producida || cantidadPlanificada,
        cantidad_final_producida: editingProduccion.cantidad_real_producida || cantidadPlanificada,
        componentes_utilizados: (editingProduccion.componentes_utilizados || []).length > 0
          ? editingProduccion.componentes_utilizados
          : (componentesBase || []).map(c => ({
              componenteId: c.componenteId || '',
              nombre: c.nombre || '',
              cantidad_planificada: c.cantidad || 0,
              cantidad_real: c.cantidad || 0,
              merma: 0,
            })),
        observaciones: editingProduccion.observaciones || '',
      });
    } else {
      form.reset({
        cantidad_a_producir: cantidadPlanificada || 1,
        cantidad_final_producida: cantidadPlanificada || 1,
        componentes_utilizados: (componentesBase || []).map(c => ({
          componenteId: c.componenteId || '',
          nombre: c.nombre || '',
          cantidad_planificada: c.cantidad || 0,
          cantidad_real: c.cantidad || 0,
          merma: 0,
        })),
        observaciones: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingProduccion?.id]);

  // Calcular escandallo planificado cuando cantidad_a_producir cambia
  useEffect(() => {
    const componentes = form.getValues('componentes_utilizados');

    componentes.forEach((comp, index) => {
      const cantidadBase = componentesBase?.[index]?.cantidad || 0;
      const planificada = cantidadBase * (cantidadAProducir || 0);

      form.setValue(`componentes_utilizados.${index}.cantidad_planificada`, planificada);
      form.setValue(`componentes_utilizados.${index}.cantidad_real`, planificada);
    });
  }, [cantidadAProducir, componentesBase, form]);

  const onSubmit = async (data: ProduccionFormValues) => {
    try {
      if (!user?.email) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No hay usuario autenticado',
        });
        return;
      }

      setIsLoading(true);

      // Calcular ratio de producción
      const ratioProduccion =
        (data.cantidad_final_producida || 0) / (data.cantidad_a_producir || 1);

      const produccionData = {
        elaboracion_id: elaboracionId,
        fecha_produccion: new Date().toISOString(),
        responsable: user.email,
        cantidad_real_producida: data.cantidad_final_producida,
        ratio_produccion: parseFloat(ratioProduccion.toFixed(4)),
        componentes_utilizados: data.componentes_utilizados.map(c => ({
          componenteId: c.componenteId,
          nombre: c.nombre,
          cantidad_planificada: parseFloat(c.cantidad_planificada.toFixed(6)),
          cantidad_utilizada: parseFloat(c.cantidad_real.toFixed(6)),
          merma: parseFloat(c.merma.toFixed(6)),
        })),
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

      onSuccess();
      onClose();
    } catch (e: any) {
      console.error('Error saving production:', e);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e?.message || 'Error desconocido al guardar',
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
      comp.merma = Math.max(0, comp.cantidad_planificada - comp.cantidad_real);

      componentes[index] = comp;
      form.setValue('componentes_utilizados', componentes, { shouldDirty: true });
    } catch (e) {
      console.error('Error updating componente:', e);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-base sm:text-lg">
            {editingProduccion ? 'Editar Producción' : 'Registrar Nueva Producción'}
          </DialogTitle>
          <DialogDescription>
            Introduce los detalles de la producción y ajusta las mermas si es necesario.
          </DialogDescription>
        </DialogHeader>

        {form ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
              {/* CANTIDAD A PRODUCIR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="cantidad_a_producir"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Cantidad a Producir ({unidadProduccion})
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={e =>
                            field.onChange(
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                            )
                          }
                          value={field.value || ''}
                          className="text-sm sm:text-base h-11 sm:h-10 font-semibold touch-manipulation"
                          placeholder={`Ej: ${cantidadPlanificada}`}
                          autoFocus
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* CANTIDAD FINAL PRODUCIDA */}
                <FormField
                  control={form.control}
                  name="cantidad_final_producida"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Cantidad Final ({unidadProduccion})
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={e =>
                            field.onChange(
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                            )
                          }
                          value={field.value || ''}
                          className="text-sm sm:text-base h-11 sm:h-10 font-semibold touch-manipulation"
                          placeholder={`Ej: ${cantidadPlanificada}`}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* COMPONENTES - TABLA ÚNICA COMPACTA */}
              <div className="space-y-2">
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Detalles de Componentes
                </FormLabel>
                <div className="border rounded-lg overflow-x-auto bg-white shadow-sm -mx-3 sm:mx-0">
                  <Table className="text-[11px] sm:text-xs">
                    <TableHeader className="bg-slate-100 border-b sticky top-0">
                      <TableRow>
                        <TableHead className="py-2 px-2 sm:px-3 font-semibold text-left w-[45%] sm:w-[40%]">
                          Ingrediente
                        </TableHead>
                        <TableHead className="py-2 px-1.5 sm:px-2 font-semibold text-right w-[15%] sm:w-[15%]">
                          Plan.
                        </TableHead>
                        <TableHead className="py-2 px-1.5 sm:px-2 font-semibold text-right w-[20%]">
                          Real
                        </TableHead>
                        <TableHead className="py-2 px-1.5 sm:px-2 font-semibold text-right w-[15%] text-red-600">
                          Merma
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields && fields.length > 0 ? (
                        fields.map((field, index) => {
                          const cantidadPlan =
                            form.watch(`componentes_utilizados.${index}.cantidad_planificada`) ||
                            0;
                          const cantidadReal =
                            form.watch(`componentes_utilizados.${index}.cantidad_real`) || 0;
                          const merma =
                            form.watch(`componentes_utilizados.${index}.merma`) || 0;
                          const nombre =
                            form.watch(`componentes_utilizados.${index}.nombre`) ||
                            'Sin nombre';

                          return (
                            <TableRow key={field.id} className="border-b hover:bg-slate-50">
                              <TableCell className="py-2 px-2 sm:px-3 font-medium truncate text-left">
                                <span className="line-clamp-2">{nombre}</span>
                              </TableCell>
                              <TableCell className="py-2 px-1.5 sm:px-2 text-right font-mono text-slate-600 whitespace-nowrap">
                                {Number(cantidadPlan).toFixed(3)}
                              </TableCell>
                              <TableCell className="py-2 px-1.5 sm:px-2 text-right">
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={cantidadReal || ''}
                                  onChange={e =>
                                    handleComponenteChange(
                                      index,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="h-8 sm:h-7 text-right font-mono text-xs sm:text-sm px-1 touch-manipulation"
                                  placeholder="0"
                                  min="0"
                                />
                              </TableCell>
                              <TableCell className="py-2 px-1.5 sm:px-2 text-right font-mono font-semibold text-red-600 whitespace-nowrap">
                                {Number(merma).toFixed(3)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="py-3 px-2 sm:px-3 text-center text-xs text-slate-500">
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
                    <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Observaciones (Opcional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        placeholder="Notas sobre la producción..."
                        rows={2}
                        className="resize-none text-sm h-16 sm:h-14 touch-manipulation"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* FOOTER */}
              <DialogFooter className="flex gap-2 pt-2 sm:pt-3 border-t mt-3 sm:mt-4 flex-col-reverse sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="text-sm h-10 sm:h-9 touch-manipulation"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white text-sm h-10 sm:h-9 touch-manipulation font-semibold"
                  disabled={isLoading || !form.formState.isValid}
                >
                  {isLoading
                    ? 'Guardando...'
                    : editingProduccion
                      ? 'Actualizar'
                      : 'Registrar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="p-4 text-red-600 text-sm">Error al cargar el formulario</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
