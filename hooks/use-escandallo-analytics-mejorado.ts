'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export interface ComponenteDesglose {
  id: string;
  nombre: string;
  tipo: 'ingrediente' | 'elaboracion';
  cantidad: number;
  startPrice: number;
  endPrice: number;
  diff: number;
  percent: number;
  contribucionPorcent: number;
}

export interface VariacionItem {
  id: string;
  nombre: string;
  tipo: 'ingrediente' | 'elaboracion' | 'receta';
  startPrice: number;
  endPrice: number;
  diff: number;
  percent: number;
  categoria?: string;
  proveedor?: string;
  referencia?: string;
  detalles?: {
    componentes: ComponenteDesglose[];
  };
}

export interface EscandalloSnapshot {
  fecha: string;
  precio: number;
  cantidad: number;
}

export interface UseEscandalloAnalyticsReturn {
  data: VariacionItem[];
  snapshots: EscandalloSnapshot[];
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
}

export function useEscandalloAnalyticsNew(
  type: 'ingredientes' | 'elaboraciones' | 'recetas',
  dateFrom: string | null,
  dateTo: string | null
): UseEscandalloAnalyticsReturn {
  const [data, setData] = useState<VariacionItem[]>([]);
  const [snapshots, setSnapshots] = useState<EscandalloSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isValidRange = useMemo(() => {
    if (!dateFrom || !dateTo) return false;
    try {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      return from < to && !isNaN(from.getTime()) && !isNaN(to.getTime());
    } catch { return false; }
  }, [dateFrom, dateTo]);

  const fetchAndCalculate = useCallback(async () => {
    if (!isValidRange || !dateFrom || !dateTo) return;

    setIsLoading(true);
    setLoadingMessage('Iniciando análisis de datos...');
    setError(null);

    try {
      const newData: VariacionItem[] = [];

      if (type === 'ingredientes') {
        setLoadingMessage('Consultando catálogo de ingredientes...');

        const { data: ingredientes, error: dbError } = await supabase
          .from('ingredientes_internos')
          .select(`
            id, 
            nombre_ingrediente, 
            producto_erp_link_id,
            articulos_erp!producto_erp_link_id (
              nombre_proveedor,
              referencia_proveedor
            )
          `)
          .order('created_at', { ascending: false })
          .limit(500);

        if (dbError) throw new Error(dbError.message);

        if (ingredientes && ingredientes.length > 0) {
          const erpIds = ingredientes
            .map((ing: any) => ing.producto_erp_link_id)
            .filter((id: any) => id !== null && id !== '');

          setLoadingMessage('Obteniendo históricos de precios...');

          let historicPricesMap = new Map<string, any[]>();

          if (erpIds.length > 0) {
            const { data: allHistoricPrices } = await supabase
              .from('historico_precios_erp')
              .select('articulo_erp_id, fecha, precio_calculado')
              .in('articulo_erp_id', erpIds)
              .gte('fecha', `${dateFrom}T00:00:00Z`)
              .lte('fecha', `${dateTo}T23:59:59Z`)
              .order('fecha', { ascending: true });

            if (allHistoricPrices) {
              allHistoricPrices.forEach((price: any) => {
                const id = price.articulo_erp_id;
                if (!historicPricesMap.has(id)) {
                  historicPricesMap.set(id, []);
                }
                historicPricesMap.get(id)?.push(price);
              });
            }
          }

          setLoadingMessage('Procesando variaciones...');

          for (const ing of ingredientes as any[]) {
            const erpData = ing.articulos_erp;
            const proveedor = erpData?.nombre_proveedor || 'Sin Proveedor';
            const referencia = erpData?.referencia_proveedor || 'Sin Ref';

            let startPrice = 0;
            let endPrice = 0;

            const history = historicPricesMap.get(ing.producto_erp_link_id);

            if (history && history.length > 0) {
              startPrice = parseFloat(history[0].precio_calculado) || 0;
              endPrice = parseFloat(history[history.length - 1].precio_calculado) || 0;
            }

            if (startPrice > 0 || endPrice > 0) {
              newData.push({
                id: ing.id,
                nombre: ing.nombre_ingrediente || 'Ingrediente Desconocido',
                tipo: 'ingrediente',
                proveedor,
                referencia,
                startPrice,
                endPrice,
                diff: endPrice - startPrice,
                percent: startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0,
              });
            }
          }
        }

      } else if (type === 'elaboraciones') {
        setLoadingMessage('Cargando histórico de elaboraciones...');

        const { data: historicoElaboraciones } = await supabase
          .from('coste_elaboraciones_historico')
          .select('elaboracion_id, coste_unitario, fecha')
          .gte('fecha', `${dateFrom}T00:00:00Z`)
          .lte('fecha', `${dateTo}T23:59:59Z`)
          .order('fecha', { ascending: true });

        const costoElabMap = new Map<string, any[]>();
        if (historicoElaboraciones) {
          historicoElaboraciones.forEach((h: any) => {
            const id = h.elaboracion_id;
            if (!costoElabMap.has(id)) {
              costoElabMap.set(id, []);
            }
            costoElabMap.get(id)?.push(h);
          });
        }

        const { data: elaboraciones } = await supabase
          .from('elaboraciones')
          .select('id, nombre')
          .limit(500);

        if (elaboraciones) {
          for (const elab of elaboraciones as any[]) {
            const costos = costoElabMap.get(elab.id);
            let startPrice = 0;
            let endPrice = 0;

            if (costos && costos.length > 0) {
              startPrice = parseFloat(costos[0].coste_unitario) || 0;
              endPrice = parseFloat(costos[costos.length - 1].coste_unitario) || 0;
            }

            if (startPrice > 0 || endPrice > 0) {
              newData.push({
                id: elab.id,
                nombre: elab.nombre,
                tipo: 'elaboracion',
                startPrice,
                endPrice,
                diff: endPrice - startPrice,
                percent: startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0,
              });
            }
          }
        }

      } else if (type === 'recetas') {
        setLoadingMessage('Auditando fichas técnicas de recetas...');

        const { data: historicoRecetas } = await supabase
          .from('coste_recetas_historico')
          .select('receta_id, coste_materia_prima, fecha')
          .gte('fecha', `${dateFrom}T00:00:00Z`)
          .lte('fecha', `${dateTo}T23:59:59Z`)
          .order('fecha', { ascending: true });

        const costoMap = new Map<string, any[]>();
        if (historicoRecetas) {
          historicoRecetas.forEach((h: any) => {
            const id = h.receta_id;
            if (!costoMap.has(id)) {
              costoMap.set(id, []);
            }
            costoMap.get(id)?.push(h);
          });
        }

        const { data: recetas } = await supabase
          .from('recetas')
          .select('id, nombre, categoria')
          .limit(500);

        if (recetas) {
          for (const receta of recetas as any[]) {
            const costos = costoMap.get(receta.id);
            let startPrice = 0;
            let endPrice = 0;

            if (costos && costos.length > 0) {
              startPrice = parseFloat(costos[0].coste_materia_prima) || 0;
              endPrice = parseFloat(costos[costos.length - 1].coste_materia_prima) || 0;
            }

            if (startPrice > 0 || endPrice > 0) {
              newData.push({
                id: receta.id,
                nombre: receta.nombre,
                tipo: 'receta',
                categoria: receta.categoria || 'Sin Categoría',
                startPrice,
                endPrice,
                diff: endPrice - startPrice,
                percent: startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0,
              });
            }
          }
        }
      }

      // Generate snapshots based on real data
      setLoadingMessage('Generando gráficos de tendencias...');
      const newSnapshots: EscandalloSnapshot[] = [];

      if (newData.length > 0 && dateFrom && dateTo) {
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);

        const avgStartPrice = newData.reduce((acc, item) => acc + item.startPrice, 0) / newData.length;
        const avgEndPrice = newData.reduce((acc, item) => acc + item.endPrice, 0) / newData.length;

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = format(d, 'yyyy-MM-dd');
          const totalTime = endDate.getTime() - startDate.getTime();
          const currentTime = d.getTime() - startDate.getTime();
          const progress = totalTime === 0 ? 1 : currentTime / totalTime;
          const interpolatedPrice = avgStartPrice + (avgEndPrice - avgStartPrice) * progress;

          newSnapshots.push({
            fecha: dateStr,
            precio: Number(interpolatedPrice.toFixed(2)),
            cantidad: newData.length,
          });
        }
      }

      setData(newData);
      setSnapshots(newSnapshots);

    } catch (e) {
      console.error('Error in useEscandalloAnalyticsNew:', e);
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [type, dateFrom, dateTo, isValidRange]);

  useEffect(() => {
    if (isValidRange) fetchAndCalculate();
  }, [isValidRange, fetchAndCalculate]);

  return { data, snapshots, isLoading, loadingMessage, error };
}
