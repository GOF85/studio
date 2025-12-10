'use client';

import { useMemo } from 'react';
import { getSparklineColor, generateSparklinePoints } from '@/lib/escandallo-helpers';

interface SparklineProps {
  data: number[];
  itemId: string;
}

/**
 * Mini gráfico de 30 días mostrando tendencia de variación
 * Ancho: 60px, Alto: 20px
 * Color según tendencia: verde (bajada), rojo (subida), gris (estable)
 */
export function Sparkline({ data, itemId }: SparklineProps) {
  const { points, color } = useMemo(() => {
    if (data.length === 0) {
      return { points: '', color: '#9ca3af' };
    }

    const sparklineColor = getSparklineColor(data);
    const sparklinePoints = generateSparklinePoints(data);

    return { points: sparklinePoints, color: sparklineColor };
  }, [data]);

  if (data.length === 0) {
    return <div className="text-xs text-muted-foreground">N/A</div>;
  }

  return (
    <svg width="60" height="20" className="inline-block" viewBox="0 0 60 20">
      <defs>
        <linearGradient id={`grad-${itemId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {points && (
        <>
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={`M 0,20 L ${points} L 60,20 Z`}
            fill={`url(#grad-${itemId})`}
          />
        </>
      )}
    </svg>
  );
}
