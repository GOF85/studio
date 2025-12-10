'use client';

import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';

interface AlertBadgeProps {
  percent: number;
  className?: string;
}

/**
 * Badge que se muestra solo si |percent| >= 5%
 * Indica: REVISAR (>10%), VIGILAR (5-10%), OK (<-5%)
 */
export function AlertBadge({ percent, className }: AlertBadgeProps) {
  if (Math.abs(percent) < 5) return null;

  const isCritical = percent > 10;
  const isReduction = percent < -5;

  return (
    <Badge
      variant={isCritical ? 'destructive' : isReduction ? 'secondary' : 'outline'}
      className={`ml-1 text-xs ${className}`}
    >
      {isCritical ? (
        <>
          <AlertCircle className="h-3 w-3 mr-1" />
          REVISAR
        </>
      ) : percent > 5 ? (
        <>
          <AlertTriangle className="h-3 w-3 mr-1" />
          VIGILAR
        </>
      ) : (
        <>
          <CheckCircle className="h-3 w-3 mr-1" />
          OK
        </>
      )}
    </Badge>
  );
}
