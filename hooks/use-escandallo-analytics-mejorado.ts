'use client';

import { useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { isBefore, parseISO, endOfDay, eachDayOfInterval, format } from 'date-fns';

export interface VariacionItem {
  id: string;
  nombre: string;
  tipo: 'ingrediente' | 'elaboracion' | 'receta' | 'articulo_erp';
  startPrice: number;
  endPrice: number;
  diff: number;
  percent: number;
  categoria?: string;
  proveedor?: string;
}

export interface EscandalloSnapshot {
  fecha: string;
  precio: number;
  cantidad?: number;
}

export interface UseEscandalloAnalyticsReturn {
  data: VariacionItem[];
  snapshots: EscandalloSnapshot[];
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  calculateHistory: (item: VariacionItem) => EscandalloSnapshot[];
}

// --- UTILIDADES ---
const safeFloat = (input: any): number => {
    if (input === null || input === undefined) return 0;
    if (typeof input === 'number') return input;
    if (typeof input === 'string') {
        let clean = input.trim();
        if (!clean) return 0;
        if (clean.includes(',') && clean.includes('.')) {
            if (clean.indexOf('.') < clean.indexOf(',')) {
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
                clean = clean.replace(/,/g, '');
            }
        } else if (clean.includes(',')) {
            clean = clean.replace(',', '.');
        }
        clean = clean.replace(/[^0-9.-]/g, '');
        return parseFloat(clean) || 0;
    }
    return 0;
};

// Tipo para el almacén de datos crudos
type RawDataStore = {
    articulosErp: any[];
    historicoErp: any[];
    ingredientes: any[];
    elaboraciones: any[];
    componentes: any[];
    recetas: any[];
    historyMap: Map<string, any[]>;
};

export function useEscandalloAnalyticsNew(
  activeTab: 'recetas' | 'elaboraciones' | 'ingredientes' | 'articulos',
  dateFrom: string,
  dateTo: string
): UseEscandalloAnalyticsReturn {
  // Inicialización directa
  const rawDataRef = useRef<RawDataStore>({ 
      articulosErp: [], 
      historicoErp: [], 
      ingredientes: [], 
      elaboraciones: [], 
      componentes: [], 
      recetas: [], 
      historyMap: new Map() 
  });

  const isValidRange = useMemo(() => {
    if (!dateFrom || !dateTo) return false;
    try {
      return new Date(dateFrom) <= new Date(dateTo);
    } catch { return false; }
  }, [dateFrom, dateTo]);

  const { data: queryData, isLoading, error } = useQuery({
    queryKey: ['escandalloAnalytics', activeTab, dateFrom, dateTo],
    queryFn: async () => {
      if (!isValidRange) return { results: [], snapshots: [] };

      // 1. CARGA MASIVA
      const [erpRes, histRes, ingRes, elabRes, compRes, recRes] = await Promise.all([
        supabase.from('articulos_erp').select('id, erp_id, nombre, precio_compra, precio, familia_categoria, nombre_proveedor'),
        supabase.from('historico_precios_erp')
            .select('articulo_erp_id, fecha, precio_calculado')
            .lte('fecha', `${dateTo}T23:59:59Z`)
            .order('fecha', { ascending: true }), 
        supabase.from('ingredientes_internos').select('id, nombre_ingrediente, producto_erp_link_id'),
        supabase.from('elaboraciones').select('id, nombre, produccion_total, coste_unitario'),
        supabase.from('elaboracion_componentes').select('elaboracion_padre_id, componente_id, cantidad_neta'),
        supabase.from('recetas').select('id, nombre, categoria, elaboraciones, porcentaje_coste_produccion')
      ]);

      if (erpRes.error) throw erpRes.error;

      const store = rawDataRef.current; 
      store.articulosErp = erpRes.data || [];
      store.historicoErp = histRes.data || [];
      store.ingredientes = ingRes.data || [];
      store.elaboraciones = elabRes.data || [];
      store.componentes = compRes.data || [];
      store.recetas = recRes.data || [];
      store.historyMap.clear();

      store.historicoErp.forEach((h: any) => {
          if (!store.historyMap.has(h.articulo_erp_id)) store.historyMap.set(h.articulo_erp_id, []);
          store.historyMap.get(h.articulo_erp_id)?.push(h);
      });

      store.articulosErp.forEach((art: any) => {
          const historyByUuid = store.historyMap.get(art.id);
          if (historyByUuid && art.erp_id) {
              store.historyMap.set(String(art.erp_id), historyByUuid);
          }
      });

      const currentPriceMap = new Map<string, number>();
      const erpInfoMap = new Map<string, any>();
      
      store.articulosErp.forEach((art: any) => {
          const p = safeFloat(art.precio_compra) || safeFloat(art.precio);
          currentPriceMap.set(art.id, p);
          if (art.erp_id) currentPriceMap.set(String(art.erp_id), p);
          
          const info = { nombre: art.nombre, proveedor: art.nombre_proveedor, cat: art.familia_categoria };
          erpInfoMap.set(art.id, info);
          if (art.erp_id) erpInfoMap.set(String(art.erp_id), info);
      });

      const getErpPriceAtDate = (linkId: string | null, targetDate: string): number => {
          if (!linkId) return 0;
          const linkStr = String(linkId);
          let history = store.historyMap.get(linkStr);
          if (!history) {
              const art = store.articulosErp.find((a: any) => a.id === linkStr || String(a.erp_id) === linkStr);
              if (art) {
                  const altId = art.id === linkStr ? String(art.erp_id) : art.id;
                  if (altId) history = store.historyMap.get(altId);
              }
          }
          if (!history || history.length === 0) return currentPriceMap.get(linkStr) || 0;
          const targetTime = endOfDay(parseISO(targetDate)).getTime();
          for (let i = history.length - 1; i >= 0; i--) {
              if (parseISO(history[i].fecha).getTime() <= targetTime) return safeFloat(history[i].precio_calculado);
          }
          return safeFloat(history[0].precio_calculado);
      };

      const ingCostStart = new Map<string, number>();
      const ingCostEnd = new Map<string, number>();
      const results: VariacionItem[] = [];

      store.ingredientes.forEach((ing: any) => {
          const start = getErpPriceAtDate(ing.producto_erp_link_id, dateFrom);
          const end = getErpPriceAtDate(ing.producto_erp_link_id, dateTo);
          ingCostStart.set(ing.id, start);
          ingCostEnd.set(ing.id, end);
          if (activeTab === 'ingredientes') {
              const info = erpInfoMap.get(String(ing.producto_erp_link_id)) || {};
              if (start > 0 || end > 0) {
                  results.push({
                      id: ing.id,
                      nombre: ing.nombre_ingrediente,
                      tipo: 'ingrediente',
                      startPrice: start,
                      endPrice: end,
                      diff: end - start,
                      percent: start > 0 ? ((end - start)/start)*100 : 0,
                      proveedor: info.proveedor
                  });
              }
          }
      });

      const elabCostStart = new Map<string, number>();
      const elabCostEnd = new Map<string, number>();

      if (activeTab !== 'ingredientes' && activeTab !== 'articulos') {
          store.elaboraciones.forEach((elab: any) => {
              const comps = store.componentes.filter((c: any) => c.elaboracion_padre_id === elab.id);
              let totalStart = 0;
              let totalEnd = 0;
              comps.forEach((c: any) => {
                  const pS = ingCostStart.get(c.componente_id) || 0;
                  const pE = ingCostEnd.get(c.componente_id) || 0;
                  const q = safeFloat(c.cantidad_neta);
                  totalStart += pS * q;
                  totalEnd += pE * q;
              });
              const divisor = safeFloat(elab.produccion_total) || 1;
              const uStart = totalStart / divisor;
              const uEnd = totalEnd / divisor;
              elabCostStart.set(elab.id, uStart);
              elabCostEnd.set(elab.id, uEnd);
              if (activeTab === 'elaboraciones') {
                  results.push({
                      id: elab.id,
                      nombre: elab.nombre,
                      tipo: 'elaboracion',
                      startPrice: uStart,
                      endPrice: uEnd,
                      diff: uEnd - uStart,
                      percent: uStart > 0 ? ((uEnd - uStart)/uStart)*100 : 0
                  });
              }
          });
      }

      if (activeTab === 'recetas') {
          store.recetas.forEach((receta: any) => {
              let totalStart = 0;
              let totalEnd = 0;
              let elabs: any[] = [];
              if (typeof receta.elaboraciones === 'string') try { elabs = JSON.parse(receta.elaboraciones); } catch {}
              else if (Array.isArray(receta.elaboraciones)) elabs = receta.elaboraciones;
              elabs.forEach((item: any) => {
                  let id = typeof item === 'string' ? item : (item.elaboracionId || item.elaboracion_id || item.id);
                  if (id && id.length > 36) id = id.substring(0, 36);
                  const qty = typeof item === 'object' ? (safeFloat(item.cantidad) || 1) : 1;
                  const elabId = elabCostStart.has(id) ? id : [...elabCostStart.keys()].find(k => k.startsWith(id));
                  if (elabId) {
                      totalStart += (elabCostStart.get(elabId) || 0) * qty;
                      totalEnd += (elabCostEnd.get(elabId) || 0) * qty;
                  }
              });
              const margen = safeFloat(receta.porcentaje_coste_produccion);
              const pStart = totalStart * (1 + margen/100);
              const pEnd = totalEnd * (1 + margen/100);
              if (pStart > 0 || pEnd > 0) {
                  results.push({
                      id: receta.id,
                      nombre: receta.nombre,
                      tipo: 'receta',
                      categoria: receta.categoria,
                      startPrice: pStart,
                      endPrice: pEnd,
                      diff: pEnd - pStart,
                      percent: pStart > 0 ? ((pEnd - pStart)/pStart)*100 : 0
                  });
              }
          });
      }

      if (activeTab === 'articulos') {
          store.articulosErp.forEach((art: any) => {
              const start = getErpPriceAtDate(art.id, dateFrom);
              const end = getErpPriceAtDate(art.id, dateTo);
              if (start > 0 || end > 0) {
                  results.push({
                      id: art.id,
                      nombre: art.nombre,
                      tipo: 'articulo_erp',
                      categoria: art.familia_categoria,
                      proveedor: art.nombre_proveedor,
                      startPrice: start,
                      endPrice: end,
                      diff: end - start,
                      percent: start > 0 ? ((end - start)/start)*100 : 0
                  });
              }
          });
      }

      results.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
      
      let snapshots: EscandalloSnapshot[] = [];
      if (results.length > 0) {
          const avgS = results.reduce((s, i) => s + i.startPrice, 0) / results.length;
          const avgE = results.reduce((s, i) => s + i.endPrice, 0) / results.length;
          snapshots = [
              { fecha: dateFrom, precio: avgS, cantidad: results.length },
              { fecha: dateTo, precio: avgE, cantidad: results.length }
          ];
      }

      return { results, snapshots };
    },
    enabled: isValidRange,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const data = queryData?.results || [];
  const snapshots = queryData?.snapshots || [];

  // --- CALCULO ON-DEMAND ---
  const calculateHistory = useCallback((item: VariacionItem): EscandalloSnapshot[] => {
      const store = rawDataRef.current;
      if (!store.articulosErp.length) return [];

      const getPrice = (linkId: string, d: Date) => {
          if (!linkId) return 0;
          const ls = String(linkId);
          let history = store.historyMap.get(ls);
          if (!history) {
              const art = store.articulosErp.find((a:any) => a.id === ls || String(a.erp_id) === ls);
              if (art) {
                  const altId = art.id === ls ? String(art.erp_id) : art.id;
                  if (altId) history = store.historyMap.get(altId);
              }
          }
          if (!history || !history.length) {
              const art = store.articulosErp.find((a:any) => a.id === ls || String(a.erp_id) === ls);
              return art ? (safeFloat(art.precio_compra) || safeFloat(art.precio)) : 0;
          }
          const t = endOfDay(d).getTime();
          for(let i=history.length-1; i>=0; i--) {
              if (parseISO(history[i].fecha).getTime() <= t) return safeFloat(history[i].precio_calculado);
          }
          return safeFloat(history[0].precio_calculado);
      };

      const calcCost = (objId: string, type: string, d: Date): number => {
          if (type === 'articulo_erp') return getPrice(objId, d);
          if (type === 'ingrediente') {
              const ing = store.ingredientes.find((x:any) => x.id === objId);
              return ing ? getPrice(ing.producto_erp_link_id, d) : 0;
          }
          if (type === 'elaboracion') {
              const elab = store.elaboraciones.find((x:any) => x.id === objId);
              if (!elab) return 0;
              const comps = store.componentes.filter((c:any) => c.elaboracion_padre_id === objId);
              let tot = 0;
              comps.forEach((c:any) => {
                  tot += calcCost(c.componente_id, 'ingrediente', d) * safeFloat(c.cantidad_neta);
              });
              return tot / (safeFloat(elab.produccion_total) || 1);
          }
          if (type === 'receta') {
              const rec = store.recetas.find((x:any) => x.id === objId);
              if (!rec) return 0;
              let elabs: any[] = [];
              if (typeof rec.elaboraciones === 'string') try { elabs = JSON.parse(rec.elaboraciones); } catch {}
              else if (Array.isArray(rec.elaboraciones)) elabs = rec.elaboraciones;
              let tot = 0;
              elabs.forEach((e:any) => {
                  let eid = typeof e === 'string' ? e : (e.elaboracionId || e.id);
                  if (eid && eid.length > 36) eid = eid.substring(0, 36);
                  const eqty = typeof e === 'object' ? (safeFloat(e.cantidad) || 1) : 1;
                  const foundElab = store.elaboraciones.find((el:any) => el.id === eid || el.id.startsWith(eid));
                  if (foundElab) tot += calcCost(foundElab.id, 'elaboracion', d) * eqty;
              });
              return tot * (1 + safeFloat(rec.porcentaje_coste_produccion)/100);
          }
          return 0;
      };

      const days = eachDayOfInterval({ start: parseISO(dateFrom), end: parseISO(dateTo) });
      const points: EscandalloSnapshot[] = [];
      const step = days.length > 90 ? Math.ceil(days.length / 60) : 1;
      for (let i=0; i<days.length; i+=step) {
          points.push({
              fecha: format(days[i], 'yyyy-MM-dd'),
              precio: calcCost(item.id, item.tipo, days[i]),
              cantidad: 1
          });
      }
      return points;
  }, [dateFrom, dateTo]);

  return { 
    data, 
    snapshots, 
    isLoading, 
    loadingMessage: isLoading ? 'Calculando variaciones...' : '', 
    error: error ? (error as Error).message : null, 
    calculateHistory 
  };
}