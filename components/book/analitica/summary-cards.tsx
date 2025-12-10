'use client';

import { Card, CardContent } from '@/components/ui/card';
import { getVariationAlert } from '@/lib/escandallo-helpers';
import { formatCurrency } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface SummaryCardsProps {
  totalItems: number;
  avgVariation: number;
  maxIncrease: { nombre: string; percent: number; diff: number };
  maxDecrease: { nombre: string; percent: number; diff: number };
  isLoading: boolean;
}

/**
 * 4 cards KPI: Total items, promedio, mayor aumento, mayor reducción
 * Cada card con borde izquierdo coloreado según tipo
 */
export function SummaryCards({
  totalItems,
  avgVariation,
  maxIncrease,
  maxDecrease,
  isLoading,
}: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const avgAlert = getVariationAlert(avgVariation);
  const maxIncreaseAlert = getVariationAlert(maxIncrease.percent);
  const maxDecreaseAlert = getVariationAlert(maxDecrease.percent);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Card 1: Total Items */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-6">
          <div className="text-3xl font-bold text-blue-600">{totalItems}</div>
          <p className="text-sm text-muted-foreground mt-2">Items Afectados</p>
        </CardContent>
      </Card>

      {/* Card 2: Average Variation */}
      <Card className={`border-l-4 ${avgAlert.border}`}>
        <CardContent className="pt-6">
          <div className={`text-3xl font-bold ${avgAlert.color}`}>
            {avgVariation > 0 ? '+' : ''}{avgVariation.toFixed(2)}%
          </div>
          <p className="text-sm text-muted-foreground mt-2">Var. Promedio</p>
        </CardContent>
      </Card>

      {/* Card 3: Max Increase */}
      <Card className={`border-l-4 ${maxIncreaseAlert.border}`}>
        <CardContent className="pt-6">
          {maxIncrease.nombre !== '-' ? (
            <>
              <div className={`text-2xl font-bold ${maxIncreaseAlert.color} flex items-center gap-2`}>
                <TrendingUp className="h-5 w-5" />
                {maxIncrease.percent > 0 ? '+' : ''}{maxIncrease.percent.toFixed(2)}%
              </div>
              <p className="text-sm text-muted-foreground mt-1 truncate">{maxIncrease.nombre}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(maxIncrease.diff)}</p>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-gray-400">-</div>
              <p className="text-sm text-muted-foreground mt-2">Sin aumentos</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Card 4: Max Decrease */}
      <Card className={`border-l-4 border-l-green-600`}>
        <CardContent className="pt-6">
          {maxDecrease.nombre !== '-' ? (
            <>
              <div className={`text-2xl font-bold text-green-700 flex items-center gap-2`}>
                <TrendingDown className="h-5 w-5" />
                {maxDecrease.percent.toFixed(2)}%
              </div>
              <p className="text-sm text-muted-foreground mt-1 truncate">{maxDecrease.nombre}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(maxDecrease.diff)}</p>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-gray-400">-</div>
              <p className="text-sm text-muted-foreground mt-2">Sin reducciones</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
