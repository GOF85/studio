'use client';

import { getVariationAlert } from '@/lib/escandallo-helpers';
import { formatCurrency } from '@/lib/utils';
import type { VariacionItem } from '@/hooks/use-escandallo-analytics';

interface RowExpandedProps {
  item: VariacionItem;
}

/**
 * Fila expandida mostrando cascada de componentes
 * Tabla interna con cantidad, coste antes/después, contribución %
 */
export function RowExpanded({ item }: RowExpandedProps) {
  if (!item.detalles?.componentes || item.detalles.componentes.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No hay desglose disponible
      </div>
    );
  }

  const totalDiff = item.diff;

  return (
    <div className="space-y-4 py-4 px-6">
      <div className="font-semibold text-sm">Contribución de componentes:</div>

      <div className="rounded border border-dashed space-y-2">
        {item.detalles.componentes.map((comp) => {
          // Calcular contribución de este componente al cambio total
          const contribucionPorcent = totalDiff !== 0 ? (Math.abs(comp.diff || 0) / Math.abs(totalDiff)) * 100 : 0;
          const compAlert = getVariationAlert(comp.percent || 0);

          return (
            <div
              key={comp.id}
              className={`p-3 rounded border-l-2 ${compAlert.bg} ${compAlert.border}`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{comp.nombre}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {comp.tipo === 'ingrediente' ? '🥗 Ingrediente' : '📦 Elaboración'} · Cantidad:{' '}
                    {comp.cantidad}
                  </div>
                </div>

                <div className="text-right flex-shrink-0 space-y-1">
                  <div className={`font-semibold text-sm ${compAlert.color}`}>
                    {(comp.percent ?? 0) > 0 ? '+' : ''}{(comp.percent ?? 0).toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(comp.diff ?? 0) > 0 ? '+' : ''}{formatCurrency(comp.diff ?? 0)}
                  </div>
                  {contribucionPorcent > 0 && (
                    <div className="text-xs font-semibold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5 inline-block">
                      {contribucionPorcent.toFixed(1)}% del cambio
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
