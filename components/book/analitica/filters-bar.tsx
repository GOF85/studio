'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FiltersBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterVariation: 'todos' | 'aumentos' | 'reducciones';
  onFilterChange: (type: 'todos' | 'aumentos' | 'reducciones') => void;
  minPercent: number;
  onMinPercentChange: (percent: number) => void;
}

/**
 * Barra de filtros: búsqueda, tipo variación, mínimo %
 * Todos los cambios se reflejan en URL
 */
export function FiltersBar({
  searchTerm,
  onSearchChange,
  filterVariation,
  onFilterChange,
  minPercent,
  onMinPercentChange,
}: FiltersBarProps) {
  return (
    <div className="space-y-4 p-4 bg-muted/40 rounded-lg border border-dashed mb-6">
      {/* Search */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Buscar</Label>
        <Input
          placeholder="Nombre, referencia..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Filter: Variation Type */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Tipo de Variación</Label>
        <div className="flex flex-wrap gap-4">
          {(['todos', 'aumentos', 'reducciones'] as const).map((option) => (
            <label key={option} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="variation"
                value={option}
                checked={filterVariation === option}
                onChange={(e) => onFilterChange(e.target.value as any)}
                className="cursor-pointer w-4 h-4"
              />
              <span className="text-sm font-medium">
                {option === 'todos'
                  ? 'Todos'
                  : option === 'aumentos'
                    ? 'Solo Aumentos'
                    : 'Solo Reducciones'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Filter: Minimum Percent */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Variación mínima: <span className="font-bold">{minPercent}%</span>
        </Label>
        <input
          type="range"
          min="0"
          max="50"
          step="1"
          value={minPercent}
          onChange={(e) => onMinPercentChange(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="text-xs text-muted-foreground mt-1">
          Mostrar solo items con cambio {'>'}= ±{minPercent}%
        </div>
      </div>
    </div>
  );
}
