'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useEffect } from 'react';
import React from 'react';
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
  const queryClient = useQueryClient();

  // Clear ALL cache on component mount to force fresh fetch
  React.useEffect(() => {
    queryClient.clear();
  }, []); // Empty deps: only run on mount

  // Fetch OS data
  const { data: osData, isLoading: osLoading, error: osError, dataUpdatedAt } = useQuery({
    queryKey: ['eventos', osId],
    queryFn: async () => {
      if (!osId) {
        return null;
      }
      
      // Use server endpoint instead of direct client query (bypasses RLS issues)
      try {
        const response = await fetch('/api/os/panel/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ osId }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const { data, error } = await response.json();

        if (error) {
          throw new Error(error);
        }

        return data || null;
      } catch (err) {
        console.error('[useOsPanel] Error fetching data:', err);
        throw err;
      }
    },
    enabled,
    staleTime: 5000, // Consider stale after 5s to allow UI updates
    gcTime: 10 * 60 * 1000, 
    refetchInterval: 30000, // Polling cada 30 segundos
    refetchOnMount: 'always', 
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
    const operaciones = allPersonal.filter((p) => 
      p.departamento === 'Operaciones' || p.departamento === 'Project Manager'
    );

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
      operaciones, // Added operations/PM
      getFullName,
      getCompactName,
      getById,
    };
  }, [allPersonal]);

  // Transform OS data to form values
  const formValues = useMemo<OsPanelFormValues | null>(() => {
    if (!osData) {
      console.log('[useOsPanel] osData is null, formValues will be null');
      return null;
    }

    // Extract legacy responsables from JSON if needed
    let legacyPM = null;
    let legacyPMId = null;
    try {
      if (osData.responsables) {
        const parsed = typeof osData.responsables === 'string' ? JSON.parse(osData.responsables) : osData.responsables;
        
        // Structure 1: Object { project_manager: "Name" }
        if (parsed.project_manager) {
          legacyPM = parsed.project_manager;
        } 
        // Structure 2: Array of objects [{ rol: "Project Manager", nombre: "Name", id_empleado: 123 }]
        else if (Array.isArray(parsed)) {
          const pm = parsed.find((r: any) => r.rol === 'Project Manager');
          if (pm) {
            legacyPM = pm.nombre;
            legacyPMId = pm.id_empleado?.toString();
          }
        }
      }
    } catch (e) {
      console.warn('[useOsPanel] Error parsing legacy responsables:', e);
    }

    console.log('[useOsPanel] Transforming osData to formValues - legacyPM:', legacyPM, 'legacyPMId:', legacyPMId);

    const normalizedEdoAlmacen = (() => {
      // ... previous logic
    })();

    // Sala - Fallback to legacyPM if produccion_sala is empty
    let initialProduccionSala = osData.produccion_sala || null;
    
    if (!initialProduccionSala) {
      if (legacyPMId) {
        // Find by id_empleado (numeric legacy ID)
        const person = allPersonal.find(p => p.id_empleado?.toString() === legacyPMId);
        if (person) initialProduccionSala = person.id;
      }
      
      if (!initialProduccionSala && legacyPM) {
        // Try to find personal ID by full name
        const person = allPersonal.find(p => 
          `${p.nombre} ${p.apellido1}`.toLowerCase() === legacyPM.toLowerCase() || 
          `${p.nombre} ${p.apellido1} ${p.apellido2 || ''}`.trim().toLowerCase() === legacyPM.toLowerCase()
        );
        initialProduccionSala = person?.id || null;
      }
    }

    const result = {
      os_id: osData.id,
      numero_expediente: osData.numero_expediente,
      
      // Sala
      produccion_sala: initialProduccionSala,
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

    return result;
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
