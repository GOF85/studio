import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveOsId } from '@/lib/supabase';
import type { AtipicoOrder, AtipicoDBItem } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function useAtipicos(osId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: atipicos = [], isLoading } = useQuery({
    queryKey: ['atipicos', osId],
    queryFn: async () => {
      if (!osId) return [];
      const targetId = await resolveOsId(osId);
      const { data, error } = await supabase
        .from('atipico_orders')
        .select('*')
        .eq('os_id', targetId)
        .order('fecha', { ascending: false });

      if (error) throw error;
      return data as AtipicoOrder[];
    },
    enabled: !!osId,
  });

  const { data: catalogo = [], isLoading: isLoadingCatalogo } = useQuery({
    queryKey: ['atipicos-catalogo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atipicos_catalogo')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      return data.map(item => ({
        id: item.id,
        concepto: item.nombre,
        precio: item.precio_referencia
      })) as AtipicoDBItem[];
    },
  });

  const createAtipico = useMutation({
    mutationFn: async (newOrder: Omit<AtipicoOrder, 'id'>) => {
      const targetId = await resolveOsId(osId);
      const { data, error } = await supabase
        .from('atipico_orders')
        .insert([{ ...newOrder, os_id: targetId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atipicos', osId] });
      toast({ title: 'Gasto atípico registrado' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error al registrar gasto',
        description: error.message,
      });
    },
  });

  const updateAtipico = useMutation({
    mutationFn: async (order: AtipicoOrder) => {
      const { data, error } = await supabase
        .from('atipico_orders')
        .update({
          fecha: order.fecha,
          concepto: order.concepto,
          observaciones: order.observaciones,
          precio: order.precio,
          status: order.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atipicos', osId] });
      toast({ title: 'Gasto atípico actualizado' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error al actualizar gasto',
        description: error.message,
      });
    },
  });

  const deleteAtipico = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('atipico_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atipicos', osId] });
      toast({ title: 'Gasto atípico eliminado' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error al eliminar gasto',
        description: error.message,
      });
    },
  });

  const addToCatalogo = useMutation({
    mutationFn: async (item: Omit<AtipicoDBItem, 'id'>) => {
      const { data, error } = await supabase
        .from('atipicos_catalogo')
        .insert([{ nombre: item.concepto, precio_referencia: item.precio }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atipicos-catalogo'] });
    },
  });

  return {
    atipicos,
    catalogo,
    isLoading: isLoading || isLoadingCatalogo,
    createAtipico,
    updateAtipico,
    deleteAtipico,
    addToCatalogo,
  };
}
