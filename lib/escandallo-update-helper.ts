import { supabase } from './supabase';

export interface ComponenteProducido {
  componenteId: string;
  nombre: string;
  cantidad_planificada: number;
  cantidad_utilizada: number;
  merma: number;
}

export interface EscandalloAjuste {
  componenteId: string;
  nombreComponente: string;
  escandalloActual: number;
  factorPromedio: number;
  escandalloSugerido: number;
  cambioAbsoluto: number;
  cambioPorcentaje: number;
  produccionesAnalizadas: number;
}

/**
 * Calcula escandallos sugeridos basados en el histórico de producciones
 * Usa las últimas N producciones para calcular factores de ajuste
 * 
 * @param elaboracionId - ID de la elaboración
 * @param ultimasNProducciones - Número de producciones a analizar (default: 5)
 * @returns Array de ajustes sugeridos para cada componente
 */
export async function calcularEscandallosSugeridos(
  elaboracionId: string,
  ultimasNProducciones: number = 5
): Promise<EscandalloAjuste[]> {
  try {
    // 1. Obtener últimas N producciones
    const { data: producciones, error: prodError } = await supabase
      .from('elaboracion_producciones')
      .select('id, componentes_utilizados, cantidad_real_producida')
      .eq('elaboracion_id', elaboracionId)
      .order('fecha_produccion', { ascending: false })
      .limit(ultimasNProducciones);

    if (prodError || !producciones || producciones.length === 0) {
      console.warn('No hay producciones para analizar:', prodError?.message);
      return [];
    }

    // 2. Obtener escandallo actual de la elaboración
    const { data: componentes, error: compError } = await supabase
      .from('elaboracion_componentes')
      .select('id, componente_id, cantidad_neta')
      .eq('elaboracion_padre_id', elaboracionId);

    if (compError || !componentes) {
      console.warn('Error obteniendo componentes:', compError?.message);
      return [];
    }

    // Crear map de escandallos actuales
    const escandallosActuales = new Map<string, { id: string; cantidad: number }>();
    componentes.forEach((comp: any) => {
      escandallosActuales.set(comp.componente_id, {
        id: comp.id,
        cantidad: comp.cantidad_neta,
      });
    });

    // 3. Calcular factores por componente
    const factoresPorComponente: Record<string, number[]> = {};
    const nombresComponentes: Record<string, string> = {};

    producciones.forEach((prod: any) => {
      if (!prod.componentes_utilizados || !Array.isArray(prod.componentes_utilizados)) {
        return;
      }

      prod.componentes_utilizados.forEach((comp: ComponenteProducido) => {
        if (comp.cantidad_planificada > 0) {
          const factor = comp.cantidad_utilizada / comp.cantidad_planificada;

          if (!factoresPorComponente[comp.componenteId]) {
            factoresPorComponente[comp.componenteId] = [];
          }
          factoresPorComponente[comp.componenteId].push(factor);
          nombresComponentes[comp.componenteId] = comp.nombre;
        }
      });
    });

    // 4. Calcular promedios y sugerencias
    const ajustes: EscandalloAjuste[] = [];

    for (const [componenteId, factores] of Object.entries(factoresPorComponente)) {
      if (factores.length === 0) continue;

      const factorPromedio = factores.reduce((a, b) => a + b, 0) / factores.length;
      const componenteInfo = escandallosActuales.get(componenteId);
      const escandalloActual = componenteInfo?.cantidad || 0;
      const componenteDbId = componenteInfo?.id;

      // Solo sugerir si hay un cambio significativo (>0.5%)
      if (escandalloActual > 0 && componenteDbId) {
        const escandalloSugerido = escandalloActual * factorPromedio;
        const cambioPorcentaje = ((escandalloSugerido - escandalloActual) / escandalloActual) * 100;

        if (Math.abs(cambioPorcentaje) > 0.5) {
          ajustes.push({
            componenteId: componenteDbId,
            nombreComponente: nombresComponentes[componenteId] || 'Desconocido',
            escandalloActual: parseFloat(escandalloActual.toFixed(6)),
            factorPromedio: parseFloat(factorPromedio.toFixed(6)),
            escandalloSugerido: parseFloat(escandalloSugerido.toFixed(6)),
            cambioAbsoluto: parseFloat((escandalloSugerido - escandalloActual).toFixed(6)),
            cambioPorcentaje: parseFloat(cambioPorcentaje.toFixed(2)),
            produccionesAnalizadas: factores.length,
          });
        }
      }
    }

    return ajustes.sort((a, b) => Math.abs(b.cambioPorcentaje) - Math.abs(a.cambioPorcentaje));
  } catch (e) {
    console.error('Error en calcularEscandallosSugeridos:', e);
    return [];
  }
}

/**
 * Aplica los escandallos sugeridos a la base de datos
 * Actualiza la tabla elaboracion_componentes con los nuevos valores
 *
 * @param elaboracionId - ID de la elaboración
 * @param ajustes - Array de ajustes a aplicar
 * @returns Boolean indicando si fue exitoso
 */
export async function aceptarEscandallosSugeridos(
  elaboracionId: string,
  ajustes: EscandalloAjuste[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Los ajustes ya contienen el ID de la BD (componente.id)
    const actualizaciones = ajustes.map(ajuste => ({
      id: ajuste.componenteId, // Este es el ID de elaboracion_componentes
      cantidad_neta: parseFloat(ajuste.escandalloSugerido.toFixed(6)),
      updated_at: new Date().toISOString(),
    }));

    if (actualizaciones.length > 0) {
      const { error: updateError } = await supabase
        .from('elaboracion_componentes')
        .upsert(actualizaciones, { onConflict: 'id' });

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    }

    return { success: true };
  } catch (e: any) {
    console.error('Error en aceptarEscandallosSugeridos:', e);
    return { success: false, error: e?.message };
  }
}

/**
 * Obtiene estadísticas de producciones para una elaboración
 * Útil para mostrar contexto sobre los ajustes sugeridos
 */
export async function obtenerEstadisticasProduccion(
  elaboracionId: string
): Promise<{
  totalProducciones: number;
  ratioPromedio: number;
  mermaPromedio: number;
  ultimaProduccion: string | null;
} | null> {
  try {
    const { data: producciones, error } = await supabase
      .from('elaboracion_producciones')
      .select('fecha_produccion, cantidad_real_producida, ratio_produccion, componentes_utilizados')
      .eq('elaboracion_id', elaboracionId)
      .order('fecha_produccion', { ascending: false });

    if (error || !producciones) return null;

    if (producciones.length === 0) {
      return {
        totalProducciones: 0,
        ratioPromedio: 0,
        mermaPromedio: 0,
        ultimaProduccion: null,
      };
    }

    // Usar ratio_produccion si está disponible, sino calcular desde componentes
    const ratios = producciones
      .map((p: any) => p.ratio_produccion || (p.cantidad_real_producida || 0) / 1)
      .filter(r => r > 0);

    const mermas = producciones.flatMap((p: any) => 
      (p.componentes_utilizados || []).map((c: any) => c.merma || 0)
    );

    const ratioPromedio = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
    const mermaPromedio = mermas.length > 0 ? mermas.reduce((a, b) => a + b, 0) / mermas.length : 0;

    return {
      totalProducciones: producciones.length,
      ratioPromedio: parseFloat(ratioPromedio.toFixed(4)),
      mermaPromedio: parseFloat(mermaPromedio.toFixed(3)),
      ultimaProduccion: producciones[0]?.fecha_produccion || null,
    };
  } catch (e) {
    console.error('Error en obtenerEstadisticasProduccion:', e);
    return null;
  }
}
