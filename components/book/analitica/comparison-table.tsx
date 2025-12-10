'use client';

import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { VariacionItem, EscandalloSnapshot } from '@/hooks/use-escandallo-analytics';

// Helper local para formato de moneda (para asegurar que funcione sin imports externos)
const formatMoney = (val: number) => 
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

type SortBy = 'nombre' | 'startPrice' | 'endPrice' | 'diff' | 'percent';
type SortDir = 'asc' | 'desc';

interface ComparisonTableProps {
  data: VariacionItem[];
  snapshots: EscandalloSnapshot[];
  isLoading: boolean;
  searchTerm?: string;
  filterVariation?: 'todos' | 'aumentos' | 'reducciones';
  minPercent?: number;
}

export function ComparisonTable({
  data,
  snapshots,
  isLoading,
  searchTerm = '',
  filterVariation = 'todos',
  minPercent = 0,
}: ComparisonTableProps) {
  const [sortBy, setSortBy] = useState<SortBy>('percent');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Filtrar y Ordenar datos
  const filteredData = useMemo(() => {
    let filtered = data;

    // 1. Búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.nombre.toLowerCase().includes(searchLower) || item.id.toLowerCase().includes(searchLower)
      );
    }

    // 2. Filtro Variación
    if (filterVariation === 'aumentos') {
      filtered = filtered.filter((item) => item.percent > 0);
    } else if (filterVariation === 'reducciones') {
      filtered = filtered.filter((item) => item.percent < 0);
    }

    // 3. Filtro % Mínimo
    if (minPercent > 0) {
      filtered = filtered.filter((item) => Math.abs(item.percent) >= minPercent);
    }

    // 4. Ordenación
    filtered.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      if (sortBy === 'nombre') {
        aVal = a.nombre.toLowerCase();
        bVal = b.nombre.toLowerCase();
      } else if (sortBy === 'startPrice') {
        aVal = a.startPrice;
        bVal = b.startPrice;
      } else if (sortBy === 'endPrice') {
        aVal = a.endPrice;
        bVal = b.endPrice;
      } else if (sortBy === 'diff') {
        aVal = a.diff;
        bVal = b.diff;
      } else if (sortBy === 'percent') {
        aVal = a.percent;
        bVal = b.percent;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      const numA = Number(aVal);
      const numB = Number(bVal);
      return sortDir === 'asc' ? numA - numB : numB - numA;
    });

    return filtered;
  }, [data, searchTerm, filterVariation, minPercent, sortBy, sortDir]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-muted/10 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="border border-dashed rounded-lg p-8 text-center bg-muted/5">
        <p className="text-base font-medium text-muted-foreground">No hay datos para mostrar</p>
        <p className="text-sm text-muted-foreground mt-1">
          Intenta cambiar los filtros o el rango de fechas.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <Table>
        <TableHeader className="bg-muted/5">
          <TableRow>
            <TableHead
              className="cursor-pointer hover:bg-muted/10 w-[40%] font-semibold text-xs uppercase tracking-wider"
              onClick={() => handleSort('nombre')}
            >
              <div className="flex items-center gap-1">
                Nombre
                {sortBy === 'nombre' ? (
                   <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
              </div>
            </TableHead>

            <TableHead
              className="cursor-pointer hover:bg-muted/10 text-right font-semibold text-xs uppercase tracking-wider"
              onClick={() => handleSort('startPrice')}
            >
              <div className="flex items-center justify-end gap-1">
                Inicial
                {sortBy === 'startPrice' && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </div>
            </TableHead>

            <TableHead
              className="cursor-pointer hover:bg-muted/10 text-right font-semibold text-xs uppercase tracking-wider"
              onClick={() => handleSort('endPrice')}
            >
              <div className="flex items-center justify-end gap-1">
                Final
                {sortBy === 'endPrice' && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </div>
            </TableHead>

            <TableHead
              className="cursor-pointer hover:bg-muted/10 text-right font-semibold text-xs uppercase tracking-wider"
              onClick={() => handleSort('diff')}
            >
              <div className="flex items-center justify-end gap-1">
                Var. €
                {sortBy === 'diff' && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </div>
            </TableHead>

            <TableHead
              className="cursor-pointer hover:bg-muted/10 text-right font-semibold text-xs uppercase tracking-wider"
              onClick={() => handleSort('percent')}
            >
              <div className="flex items-center justify-end gap-1">
                Var. %
                {sortBy === 'percent' && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filteredData.map((item) => {
            // Estilos dinámicos
            const isIncrease = item.diff > 0;
            const isDecrease = item.diff < 0;
            const diffColor = isIncrease ? 'text-rose-600' : isDecrease ? 'text-emerald-600' : 'text-gray-500';
            const rowBg = isIncrease && item.percent > 10 ? 'bg-rose-50/30' : 'hover:bg-muted/5';

            return (
              <TableRow key={item.id} className={`${rowBg} transition-colors group`}>
                
                {/* 1. CELDA NOMBRE CON SUBTÍTULOS SOLICITADOS */}
                <TableCell className="py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground text-sm">{item.nombre}</span>
                    
                    {/* INGREDIENTES: Proveedor | Referencia */}
                    {item.tipo === 'ingrediente' && (
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5 font-medium">
                            {item.proveedor || 'Prov. Desconocido'} <span className="text-muted-foreground/30 px-1">|</span> {item.referencia || 'S/R'}
                        </span>
                    )}

                    {/* RECETAS: Categoría (Badge) */}
                    {item.tipo === 'receta' && (
                        <div className="mt-1">
                            <Badge variant="secondary" className="text-[10px] font-normal text-muted-foreground h-5 px-1.5 bg-muted border border-muted-foreground/20 rounded-sm">
                                {item.categoria || 'General'}
                            </Badge>
                        </div>
                    )}
                    
                    {/* ELABORACIONES: Nada (vacío) */}
                  </div>
                </TableCell>

                <TableCell className="text-right text-muted-foreground text-sm font-mono">
                  {formatMoney(item.startPrice)}
                </TableCell>

                <TableCell className="text-right font-medium text-sm font-mono">
                  {formatMoney(item.endPrice)}
                </TableCell>

                <TableCell className={`text-right text-sm font-mono font-medium ${diffColor}`}>
                  {item.diff > 0 ? '+' : ''}{formatMoney(item.diff)}
                </TableCell>

                <TableCell className="text-right">
                  <Badge 
                    variant="outline"
                    className={`font-mono font-bold border-0 ${
                        isIncrease 
                        ? 'bg-rose-50 text-rose-700' 
                        : isDecrease 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isIncrease ? <ArrowUp className="w-3 h-3 mr-1" /> : isDecrease ? <ArrowDown className="w-3 h-3 mr-1" /> : null}
                    {Math.abs(item.percent).toFixed(2)}%
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}