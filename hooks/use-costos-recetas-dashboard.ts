'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface RecetaCostoAlert {
  recetaId: string;
  recetaNombre: string;
  costePrevio: number;
  costeActual: number;
  cambioAbsoluto: number;
  cambioPercentaje: number;
  margenActual: number;
  severidad: 'critico' | 'alto' | 'medio' | 'bajo';
  timestamp: string;
}

export interface RecetaCostoDashboard {
  recetaId: string;
  nombre: string;
  precioVenta: number;
  costemateriaprima: number;
  margenBruto: number;
  tendencia: 'subida' | 'bajada' | 'estable';
  cambio7dias: number;
  cambio30dias: number;
  ultimaActualizacion: string;
  alerts: RecetaCostoAlert[];
}

export interface UseCostosRecetasDashboardReturn {
  recetas: RecetaCostoDashboard[];
  alertas: RecetaCostoAlert[];
  isLoading: boolean;
  error: string | null;
  totalAlertas: number;
  alertasCriticas: number;
  margenPromedio: number;
  costoPromedio: number;
  refetch: () => void;
}

export function useCostosRecetasDashboard(
  autoRefreshMs: number = 30000
): UseCostosRecetasDashboardReturn {
  const [recetas, setRecetas] = useState<RecetaCostoDashboard[]>([]);
  const [alertas, setAlertas] = useState<RecetaCostoAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCostosData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Get recipes with current costs
      const { data: recetasData, error: recetasError } = await supabase
        .from('recetas')
        .select(`
          id,
          nombre,
          precio_venta,
          coste_materia_prima_actual,
          margen_bruto_actual,
          coste_materia_prima_fecha_actualizacion
        `);

      if (recetasError) throw new Error(recetasError.message);

      // 2. Get historical data for trend calculation (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: historicoData, error: historicoError } = await supabase
        .from('coste_recetas_historico')
        .select('receta_id, coste_materia_prima, fecha, margen_bruto')
        .gte('fecha', thirtyDaysAgo)
        .order('fecha', { ascending: false });

      if (historicoError) console.warn('Error fetching historical data:', historicoError);

      // 3. Process data
      const recetasMap = new Map<string, RecetaCostoDashboard>();
      const newAlertas: RecetaCostoAlert[] = [];

      if (recetasData) {
        for (const receta of recetasData) {
          const historico = (historicoData || []).filter(
            (h: any) => h.receta_id === receta.id
          ).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

          // Calculate changes
          let cambio7dias = 0;
          let cambio30dias = 0;
          let tendencia: 'subida' | 'bajada' | 'estable' = 'estable';

          if (historico.length > 0) {
            const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const datos7dias = historico.filter(
              (h: any) => new Date(h.fecha) >= hace7dias
            );

            if (datos7dias.length > 0) {
              const costePrevio7dias = datos7dias[datos7dias.length - 1]?.coste_materia_prima || receta.coste_materia_prima_actual;
              cambio7dias = (receta.coste_materia_prima_actual || 0) - costePrevio7dias;
            }

            cambio30dias = (historico[historico.length - 1]?.coste_materia_prima || 0) - (receta.coste_materia_prima_actual || 0);

            // Determine trend
            if (historico.length >= 2) {
              const diff = historico[0].coste_materia_prima - historico[historico.length - 1].coste_materia_prima;
              tendencia = diff > 0 ? 'subida' : diff < 0 ? 'bajada' : 'estable';
            }
          }

          // Create alert if change > 5%
          const cambioPercentaje = (receta.coste_materia_prima_actual || 0) > 0
            ? (cambio7dias / (receta.coste_materia_prima_actual || 1)) * 100
            : 0;

          if (Math.abs(cambioPercentaje) > 5) {
            const severidad = Math.abs(cambioPercentaje) > 15
              ? 'critico'
              : Math.abs(cambioPercentaje) > 10
              ? 'alto'
              : 'medio';

            newAlertas.push({
              recetaId: receta.id,
              recetaNombre: receta.nombre,
              costePrevio: historico.length > 0 
                ? historico[0].coste_materia_prima 
                : (receta.coste_materia_prima_actual || 0),
              costeActual: receta.coste_materia_prima_actual || 0,
              cambioAbsoluto: cambio7dias,
              cambioPercentaje: cambioPercentaje,
              margenActual: receta.margen_bruto_actual || 0,
              severidad,
              timestamp: receta.coste_materia_prima_fecha_actualizacion || new Date().toISOString(),
            });
          }

          recetasMap.set(receta.id, {
            recetaId: receta.id,
            nombre: receta.nombre,
            precioVenta: receta.precio_venta || 0,
            costemateriaprima: receta.coste_materia_prima_actual || 0,
            margenBruto: receta.margen_bruto_actual || 0,
            tendencia,
            cambio7dias,
            cambio30dias,
            ultimaActualizacion: receta.coste_materia_prima_fecha_actualizacion || '',
            alerts: newAlertas.filter((a) => a.recetaId === receta.id),
          });
        }
      }

      setRecetas(Array.from(recetasMap.values()));
      setAlertas(newAlertas);

    } catch (e) {
      console.error('Error in useCostosRecetasDashboard:', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh
  useEffect(() => {
    fetchCostosData();
    if (autoRefreshMs > 0) {
      const interval = setInterval(fetchCostosData, autoRefreshMs);
      return () => clearInterval(interval);
    }
  }, [fetchCostosData, autoRefreshMs]);

  // Calculate statistics
  const { totalAlertas, alertasCriticas, margenPromedio, costoPromedio } = useMemo(() => {
    return {
      totalAlertas: alertas.length,
      alertasCriticas: alertas.filter((a) => a.severidad === 'critico').length,
      margenPromedio: recetas.length > 0
        ? recetas.reduce((acc, r) => acc + r.margenBruto, 0) / recetas.length
        : 0,
      costoPromedio: recetas.length > 0
        ? recetas.reduce((acc, r) => acc + r.costemateriaprima, 0) / recetas.length
        : 0,
    };
  }, [recetas, alertas]);

  return {
    recetas,
    alertas,
    isLoading,
    error,
    totalAlertas,
    alertasCriticas,
    margenPromedio,
    costoPromedio,
    refetch: fetchCostosData,
  };
}
