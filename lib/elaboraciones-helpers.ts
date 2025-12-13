import { ElaboracionProduccion, ComponenteElaboracion, MediaProducciones, AjusteComponente } from '@/types';

/**
 * Calcula la media de producciones y devuelve ajustes sugeridos
 * @param producciones Array de producciones registradas
 * @param componentesBase Componentes base de la elaboración
 * @param cantidadPlanificada Cantidad total planificada para la elaboración
 * @returns Objeto con análisis de media y ajustes sugeridos
 */
export function calcularMediaProducciones(
  producciones: ElaboracionProduccion[],
  componentesBase: ComponenteElaboracion[],
  cantidadPlanificada: number
): MediaProducciones {
  
  if (producciones.length === 0) {
    return {
      totalProducciones: 0,
      rendimiento_promedio: 1,
      ajustes_sugeridos: [],
      variabilidad: 0,
    };
  }

  // Calcular rendimiento promedio (cantidad_real / cantidad_planificada)
  const rendimientos = producciones.map(p => p.cantidad_real_producida / cantidadPlanificada);
  const rendimiento_promedio = rendimientos.reduce((a, b) => a + b, 0) / rendimientos.length;

  // Calcular variabilidad (desviación estándar)
  const media = rendimiento_promedio;
  const varianzas = rendimientos.map(r => Math.pow(r - media, 2));
  const variabilidad = Math.sqrt(varianzas.reduce((a, b) => a + b, 0) / rendimientos.length);

  // Calcular ajustes sugeridos por componente
  const ajustes_sugeridos = componentesBase.map(comp => {
    // Promediar cantidades reales utilizadas para este componente
    const cantidadesReales = producciones
      .flatMap(p => p.componentes_utilizados)
      .filter(cu => cu.componenteId === comp.componenteId)
      .map(cu => cu.cantidad_real);

    if (cantidadesReales.length === 0) {
      return {
        componenteId: comp.componenteId,
        nombre: comp.nombre,
        ajuste_porcentaje: 0,
        ajuste_cantidad: 0,
        cantidad_actual: comp.cantidad,
        cantidad_sugerida: comp.cantidad,
      };
    }

    const cantidad_promedio = cantidadesReales.reduce((a, b) => a + b, 0) / cantidadesReales.length;
    const ajuste_porcentaje = ((cantidad_promedio - comp.cantidad) / comp.cantidad) * 100;
    const ajuste_cantidad = cantidad_promedio - comp.cantidad;

    return {
      componenteId: comp.componenteId,
      nombre: comp.nombre,
      ajuste_porcentaje,
      ajuste_cantidad,
      cantidad_actual: comp.cantidad,
      cantidad_sugerida: cantidad_promedio,
    };
  });

  return {
    totalProducciones: producciones.length,
    rendimiento_promedio,
    ajustes_sugeridos,
    variabilidad,
  };
}

/**
 * Aplica los ajustes sugeridos a los componentes base
 */
export function aplicarAjustesAProducciones(
  componentesBase: ComponenteElaboracion[],
  ajustes: AjusteComponente[]
): ComponenteElaboracion[] {
  return componentesBase.map(comp => {
    const ajuste = ajustes.find(a => a.componenteId === comp.componenteId);
    if (ajuste) {
      return {
        ...comp,
        cantidad: ajuste.cantidad_sugerida,
      };
    }
    return comp;
  });
}

/**
 * Formatea el porcentaje de ajuste para mostrar en UI
 */
export function formatearAjuste(porcentaje: number): string {
  const sign = porcentaje > 0 ? '+' : '';
  return `${sign}${porcentaje.toFixed(1)}%`;
}

/**
 * Calcula el nivel de confianza en los ajustes basado en variabilidad y número de muestras
 */
export function calcularConfianza(totalProducciones: number, variabilidad: number): 'baja' | 'media' | 'alta' {
  // Baja: <3 producciones o variabilidad > 20%
  // Media: 3-5 producciones y variabilidad 10-20%
  // Alta: >5 producciones y variabilidad < 10%
  
  if (totalProducciones < 3 || variabilidad > 0.2) return 'baja';
  if (totalProducciones < 5 && variabilidad <= 0.2) return 'media';
  return 'alta';
}
