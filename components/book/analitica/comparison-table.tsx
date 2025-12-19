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
import { ArrowUp, ArrowDown, ArrowUpDown, Info, Minus } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { VariacionItem, EscandalloSnapshot } from '@/hooks/use-escandallo-analytics-mejorado';

// Tipos de ordenación local
type SortBy = 'nombre' | 'startPrice' | 'endPrice' | 'diff' | 'percent';
type SortDir = 'asc' | 'desc';

interface ComparisonTableProps {
  data: VariacionItem[];
  snapshots: EscandalloSnapshot[];
  isLoading: boolean;
  searchTerm?: string;
  filterVariation?: 'todos' | 'aumentos' | 'reducciones';
  minPercent?: number;
  onRowClick?: (item: VariacionItem) => void; // Prop clave para el modal
}

export function ComparisonTable({
  data,
  snapshots,
  isLoading,
  searchTerm = '',
  filterVariation = 'todos',
  minPercent = 0,
  onRowClick, // Recibimos el handler
}: ComparisonTableProps) {
  const [sortBy, setSortBy] = useState<SortBy>('percent'); // Default: mayor impacto %
  const [sortDir, setSortDir] = useState<SortDir>('desc'); // Default: descendente

  // Lógica de Filtrado y Ordenación
  const filteredData = useMemo(() => {
    let filtered = [...data]; // Copia para no mutar original

    // 1. Filtro Texto
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.nombre.toLowerCase().includes(searchLower) || 
          item.proveedor?.toLowerCase().includes(searchLower)
      );
    }

    // 2. Filtro Tipo Variación
    if (filterVariation === 'aumentos') {
      filtered = filtered.filter((item) => item.diff > 0);
    } else if (filterVariation === 'reducciones') {
      filtered = filtered.filter((item) => item.diff < 0);
    }

    // 3. Filtro % Mínimo (Valor absoluto)
    if (minPercent > 0) {
      filtered = filtered.filter((item) => Math.abs(item.percent) >= minPercent);
    }

    // 4. Ordenación Dinámica
    filtered.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortBy) {
        case 'nombre':
          aVal = a.nombre.toLowerCase();
          bVal = b.nombre.toLowerCase();
          break;
        case 'startPrice':
          aVal = a.startPrice;
          bVal = b.startPrice;
          break;
        case 'endPrice':
          aVal = a.endPrice;
          bVal = b.endPrice;
          break;
        case 'diff':
          aVal = a.diff;
          bVal = b.diff;
          break;
        case 'percent':
          // Ordenar por magnitud absoluta del cambio (impacto)
          aVal = Math.abs(a.percent);
          bVal = Math.abs(b.percent);
          break;
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

  // Handler para cambiar orden al hacer click en cabecera
  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc'); // Nuevo criterio empieza desc por defecto
    }
  };

  // Estados de carga y vacío
  if (isLoading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center border rounded-lg bg-muted/5 animate-pulse gap-3">
        <div className="h-2 w-1/3 bg-muted rounded" />
        <div className="h-2 w-1/4 bg-muted rounded" />
        <div className="h-2 w-1/5 bg-muted rounded" />
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="w-full p-12 text-center border-2 border-dashed rounded-lg bg-muted/5 text-muted-foreground flex flex-col items-center gap-2">
        <Info className="w-8 h-8 opacity-20" />
        <p className="font-medium">No se encontraron resultados</p>
        <p className="text-xs">Prueba a ajustar los filtros o el rango de fechas</p>
      </div>
    );
  }

  // Renderizado Tabla
  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
      <Table>
        <TableHeader className="bg-muted/10">
          <TableRow className="hover:bg-transparent">
            {/* NOMBRE */}
            <TableHead
              className="cursor-pointer hover:bg-muted/20 w-[40%] h-10 transition-colors"
              onClick={() => handleSort('nombre')}
            >
              <div className="flex items-center gap-1 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Concepto
                {sortBy === 'nombre' ? (
                   <span className="text-[10px] ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>
                ) : <ArrowUpDown className="w-3 h-3 opacity-20 ml-1" />}
              </div>
            </TableHead>

            {/* PRECIO INICIAL */}
            <TableHead
              className="cursor-pointer hover:bg-muted/20 text-right h-10 transition-colors"
              onClick={() => handleSort('startPrice')}
            >
              <div className="flex items-center justify-end gap-1 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Inicial
                {sortBy === 'startPrice' && <span className="text-[10px] ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>}
              </div>
            </TableHead>

            {/* PRECIO FINAL */}
            <TableHead
              className="cursor-pointer hover:bg-muted/20 text-right h-10 transition-colors"
              onClick={() => handleSort('endPrice')}
            >
              <div className="flex items-center justify-end gap-1 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Final
                {sortBy === 'endPrice' && <span className="text-[10px] ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>}
              </div>
            </TableHead>

            {/* DIFERENCIA (€) */}
            <TableHead
              className="cursor-pointer hover:bg-muted/20 text-right h-10 transition-colors"
              onClick={() => handleSort('diff')}
            >
              <div className="flex items-center justify-end gap-1 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Var. €
                {sortBy === 'diff' && <span className="text-[10px] ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>}
              </div>
            </TableHead>

            {/* PORCENTAJE (%) */}
            <TableHead
              className="cursor-pointer hover:bg-muted/20 text-right h-10 transition-colors w-[100px]"
              onClick={() => handleSort('percent')}
            >
              <div className="flex items-center justify-end gap-1 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                %
                {sortBy === 'percent' && <span className="text-[10px] ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filteredData.map((item) => {
            const isIncrease = item.diff > 0;
            const isDecrease = item.diff < 0;
            const isNeutral = item.diff === 0;

            // Colores semánticos: Subida coste = Rojo (Malo), Bajada = Verde (Bueno)
            const diffColor = isIncrease ? 'text-rose-600' : isDecrease ? 'text-emerald-600' : 'text-muted-foreground';
            
            // Highlight filas con cambios grandes (>5%)
            const rowHighlight = Math.abs(item.percent) > 5 ? (isIncrease ? 'bg-rose-50/10' : 'bg-emerald-50/10') : '';

            return (
              <TableRow 
                key={item.id} 
                className={cn(
                    "group transition-colors border-b border-muted/40 last:border-0",
                    onRowClick ? "cursor-pointer hover:bg-muted/50 active:bg-muted/70" : "",
                    rowHighlight
                )}
                onClick={() => onRowClick && onRowClick(item)} // ACTION CLICK
              >
                
                {/* 1. NOMBRE & DETALLES */}
                <TableCell className="py-3 pl-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                        {item.nombre}
                    </span>
                    
                    <div className="flex items-center gap-2">
                        {/* Tipo de Item (Badge sutil) */}
                        <span className={cn(
                            "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border",
                            item.tipo === 'receta' ? "bg-blue-50 text-blue-700 border-blue-100" :
                            item.tipo === 'elaboracion' ? "bg-amber-50 text-amber-700 border-amber-100" :
                            item.tipo === 'articulo_erp' ? "bg-purple-50 text-purple-700 border-purple-100" :
                            "bg-slate-50 text-slate-700 border-slate-100"
                        )}>
                            {item.tipo === 'articulo_erp' ? 'ART. ERP' : item.tipo}
                        </span>

                        {/* Subtítulo Contextual */}
                        {item.tipo === 'ingrediente' && item.proveedor && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                {item.proveedor}
                            </span>
                        )}
                        {item.tipo === 'receta' && item.categoria && (
                            <span className="text-[10px] text-muted-foreground">
                                {item.categoria}
                            </span>
                        )}
                        {item.tipo === 'articulo_erp' && item.categoria && (
                            <span className="text-[10px] text-muted-foreground">
                                Fam: {item.categoria}
                            </span>
                        )}
                    </div>
                  </div>
                </TableCell>

                {/* 2. PRECIO INICIAL */}
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {formatCurrency(item.startPrice)}
                </TableCell>

                {/* 3. PRECIO FINAL */}
                <TableCell className="text-right font-mono text-xs font-medium text-foreground">
                  {formatCurrency(item.endPrice)}
                </TableCell>

                {/* 4. VARIACIÓN € */}
                <TableCell className="text-right">
                  <div className={cn("font-mono text-xs font-medium", diffColor)}>
                    {isIncrease ? '+' : ''}{formatCurrency(item.diff)}
                  </div>
                </TableCell>

                {/* 5. VARIACIÓN % (Badge) */}
                <TableCell className="text-right pr-4">
                  <div className="flex justify-end">
                    <Badge 
                        variant="outline"
                        className={cn(
                            "font-mono font-bold text-[10px] border-0 px-2 h-5 min-w-[55px] justify-center",
                            isIncrease ? 'bg-rose-100 text-rose-700' : 
                            isDecrease ? 'bg-emerald-100 text-emerald-700' : 
                            'bg-gray-100 text-gray-500'
                        )}
                    >
                        {isIncrease && <ArrowUp className="w-2.5 h-2.5 mr-1" />}
                        {isDecrease && <ArrowDown className="w-2.5 h-2.5 mr-1" />}
                        {isNeutral && <Minus className="w-2.5 h-2.5 mr-1" />}
                        {Math.abs(item.percent).toFixed(1)}%
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}