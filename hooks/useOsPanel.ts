'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { resolveOsId } from '@/lib/supabase';
import { EDO_ALMACEN_OPTIONS } from '@/lib/validations/os-panel';
import type { OsPanelFormValues, PersonalLookup } from '@/types/os-panel';
import type { Personal } from '@/types';

interface UseOsPanelOptions {
  enabled?: boolean;
}

export function useOsPanel(osId: string | undefined, options?: UseOsPanelOptions) {
  const enabled = options?.enabled !== false && !!osId;

  // Fetch OS data
  const { data: osData, isLoading: osLoading, error: osError } = useQuery({
    queryKey: ['eventos', osId],
    queryFn: async () => {
      if (!osId) {
        console.debug('[useOsPanel] No osId provided');
        return null;
      }
      
      console.debug('[useOsPanel] Query function called:', { osId });
      const targetId = await resolveOsId(osId);
      console.debug('[useOsPanel] Resolved osId to targetId:', { osId, targetId });
      
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

      if (error) {
        console.error('[useOsPanel] Query error:', error.message);
        throw error;
      }
      
      console.debug('[useOsPanel] Query result:', { 
        found: !!data, 
        numero_expediente: data?.numero_expediente 
      });
      return data;
    },
    enabled,
  });

  // Fetch all active personnel
  const { data: allPersonal = [], isLoading: personalLoading } = useQuery({
    queryKey: ['personal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal')
        .select('*')
        .eq('activo', true)
        .order('apellido1', { ascending: true });

      if (error) throw error;
      return (data || []) as Personal[];
    },
    enabled,
  });

  // Build personal lookup with helpers
  const personalLookup = useMemo<PersonalLookup>(() => {
    const sala = allPersonal.filter((p) => p.departamento === 'Sala');
    const cpr = allPersonal.filter((p) => 
      p.departamento === 'CPR (Centro de Producción)' || p.departamento === 'CPR'
    );
    const pase = allPersonal.filter((p) => p.departamento === 'Pase');
    const almacen = allPersonal.filter((p) => p.departamento === 'Almacén');

    const getFullName = (p: Personal): string => {
      if (!p.nombre || !p.apellido1) return '';
      return `${p.nombre} ${p.apellido1}${p.apellido2 ? ` ${p.apellido2}` : ''}`;
    };

    const getCompactName = (p: Personal): string => {
      if (!p.nombre || !p.apellido1) return '';
      const firstLetter = p.nombre.charAt(0);
      return `${firstLetter}. ${p.apellido1}`;
    };

    const getById = (id: string): Personal | undefined => {
      return allPersonal.find((p) => p.id === id);
    };

    return {
      all: allPersonal,
      sala,
      cpr,
      pase,
      almacen,
      getFullName,
      getCompactName,
      getById,
    };
  }, [allPersonal]);

  // Transform OS data to form values
  const formValues = useMemo<OsPanelFormValues | null>(() => {
    if (!osData) return null;

    const normalizedEdoAlmacen = (() => {
      const raw = osData.edo_almacen;
      if (!raw || raw === 'Pendiente') return 'EP' as OsPanelFormValues['edo_almacen'];
      if ((EDO_ALMACEN_OPTIONS as readonly string[]).includes(raw)) {
        return raw as OsPanelFormValues['edo_almacen'];
      }
      return 'EP' as OsPanelFormValues['edo_almacen'];
    })();

    return {
      os_id: osData.id,
      numero_expediente: osData.numero_expediente,
      
      // Sala
      produccion_sala: osData.produccion_sala || null,
      revision_pm: osData.revision_pm || false,
      metre_responsable: osData.metre_responsable || null,
      metres: osData.metres || [],
      logistica_evento: osData.logistica_evento || null,
      camareros_ext: osData.camareros_ext || 0,
      logisticos_ext: osData.logisticos_ext || 0,
      pedido_ett: osData.pedido_ett || false,
      ped_almacen_bio_bod: osData.ped_almacen_bio_bod || false,
      pedido_walkies: osData.pedido_walkies || false,
      pedido_hielo: osData.pedido_hielo || false,
      pedido_transporte: osData.pedido_transporte || false,
      
      // Cocina
      produccion_cocina_cpr: osData.produccion_cocina_cpr || null,
      jefe_cocina: osData.jefe_cocina || null,
      cocina: osData.cocina || [],
      cocineros_ext: osData.cocineros_ext || 0,
      logisticos_ext_cocina: osData.logisticos_ext_cocina || 0,
      gastro_actualizada: osData.gastro_actualizada || false,
      pedido_gastro: osData.pedido_gastro || false,
      pedido_cocina: osData.pedido_cocina || false,
      personal_cocina: osData.personal_cocina || false,
      servicios_extra: osData.servicios_extra || [],
      
      // Logística
      edo_almacen: normalizedEdoAlmacen,
      mozo: osData.mozo || null,
      estado_logistica: osData.estado_logistica || 'Pendiente',
      carambucos: osData.carambucos || 0,
      jaulas: osData.jaulas || null,
      pallets: osData.pallets || null,
      proveedor: osData.proveedor || [],
      h_recogida_cocina: osData.h_recogida_cocina || null,
      transporte: osData.transporte || [],
      h_recogida_pre_evento: osData.h_recogida_pre_evento || null,
      h_descarga_evento: osData.h_descarga_evento || null,
      h_recogida_pos_evento: osData.h_recogida_pos_evento || null,
      h_descarga_pos_evento: osData.h_descarga_pos_evento || null,
      alquiler_lanzado: osData.alquiler_lanzado || false,
    };
  }, [osData]);

  // Helper: Get personal name by ID
  const getPersonalName = useCallback((id: string | null | undefined): string => {
    if (!id) return '—';
    const person = personalLookup.getById(id);
    return person ? personalLookup.getFullName(person) : '—';
  }, [personalLookup]);

  // Helper: Get personal array names
  const getPersonalNames = useCallback((ids: string[]): string[] => {
    return ids
      .map((id) => personalLookup.getById(id))
      .filter(Boolean)
      .map((p) => personalLookup.getFullName(p as Personal));
  }, [personalLookup]);

  return {
    osData,
    formValues,
    personalLookup,
    isLoading: osLoading || personalLoading,
    error: osError,
    getPersonalName,
    getPersonalNames,
  };
}
