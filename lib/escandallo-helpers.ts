/**
 * Helpers para análisis de diferencias de escandallo
 * Lógica pura para calcular alertas, colores y tendencias
 */

export interface VariacionAlert {
  color: string;
  bg: string;
  border: string;
  badge: string | null;
  badgeColor: string;
  needsAlert: boolean;
}

/**
 * Determina colores y badge basado en el porcentaje de variación
 */
export const getVariationAlert = (percent: number): VariacionAlert => {
  if (percent < -5) {
    return {
      color: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200',
      badge: '✓ OK',
      badgeColor: 'bg-green-100 text-green-800',
      needsAlert: false,
    };
  }
  if (percent < -1) {
    return {
      color: 'text-green-600',
      bg: 'bg-green-25',
      border: 'border-green-100',
      badge: null,
      badgeColor: '',
      needsAlert: false,
    };
  }
  if (percent <= 1) {
    return {
      color: 'text-gray-500',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      badge: null,
      badgeColor: '',
      needsAlert: false,
    };
  }
  if (percent <= 5) {
    return {
      color: 'text-yellow-700',
      bg: 'bg-yellow-50',
      border: 'border-yellow-100',
      badge: null,
      badgeColor: '',
      needsAlert: false,
    };
  }
  if (percent <= 10) {
    return {
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      badge: '⚠️ VIGILAR',
      badgeColor: 'bg-amber-100 text-amber-800',
      needsAlert: true,
    };
  }
  return {
    color: 'text-red-900',
    bg: 'bg-red-50',
    border: 'border-red-300',
    badge: '🚨 REVISAR',
    badgeColor: 'bg-red-100 text-red-800',
    needsAlert: true,
  };
};

/**
 * Determina el color del gráfico basado en porcentaje
 */
export const getChartColor = (percent: number): string => {
  if (percent < -5) return '#15803d'; // green-700
  if (percent < 1) return '#6b7280'; // gray-500
  if (percent < 5) return '#eab308'; // yellow-400
  if (percent < 10) return '#b45309'; // amber-700
  return '#ef4444'; // red-500
};

/**
 * Extrae datos de sparkline de un array de valores históricos
 * Retorna los últimos 30 puntos
 */
export const getSparklineData = (historicalValues: number[]): number[] => {
  if (!historicalValues || historicalValues.length === 0) {
    return [];
  }
  return historicalValues.slice(-30);
};

/**
 * Calcula la tendencia general basada en primer y último valor
 */
export const calculateTrend = (data: number[]): 'up' | 'down' | 'stable' => {
  if (data.length < 2) return 'stable';
  const finalChange = data[data.length - 1] - data[0];
  const percentChange = (finalChange / data[0]) * 100;

  if (Math.abs(percentChange) < 1) return 'stable';
  return percentChange > 0 ? 'up' : 'down';
};

/**
 * Genera el color de sparkline basado en tendencia
 */
export const getSparklineColor = (data: number[]): string => {
  const trend = calculateTrend(data);
  if (trend === 'up') return '#ef4444'; // red
  if (trend === 'down') return '#22c55e'; // green
  return '#9ca3af'; // gray
};

/**
 * Formatea puntos SVG para polyline
 */
export const generateSparklinePoints = (data: number[]): string => {
  if (data.length === 0) return '';

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const points = data.map((val, i) => {
    const x = (i / data.length) * 60;
    const y = 20 - ((val - minVal) / range) * 20;
    return `${x},${y}`;
  });

  return points.join(' L ');
};

/**
 * Valida si un rango de fechas es válido
 */
export const isValidDateRange = (dateFrom: string | null, dateTo: string | null): boolean => {
  if (!dateFrom || !dateTo) return false;
  try {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    return from < to && !isNaN(from.getTime()) && !isNaN(to.getTime());
  } catch {
    return false;
  }
};

/**
 * Calcula estadísticas resumidas para KPI cards
 */
export const calculateSummaryStats = (
  items: Array<{
    nombre: string;
    percent: number;
    diff: number;
  }>
) => {
  if (items.length === 0) {
    return {
      totalItems: 0,
      avgVariation: 0,
      maxIncrease: { nombre: '-', percent: 0, diff: 0 },
      maxDecrease: { nombre: '-', percent: 0, diff: 0 },
    };
  }

  const avgVariation = items.reduce((sum, item) => sum + item.percent, 0) / items.length;

  const increases = items.filter((item) => item.percent > 0).sort((a, b) => b.percent - a.percent);
  const decreases = items.filter((item) => item.percent < 0).sort((a, b) => a.percent - b.percent);

  return {
    totalItems: items.length,
    avgVariation,
    maxIncrease: increases[0] || { nombre: '-', percent: 0, diff: 0 },
    maxDecrease: decreases[0] || { nombre: '-', percent: 0, diff: 0 },
  };
};
