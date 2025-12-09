/**
 * Componente para renderizar tablas como tarjetas apiladas en móvil
 * Mobile-First: Vista de tarjetas para dispositivos móviles
 */

'use client';

import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MobileTableColumn<T = any> {
  /**
   * Clave del campo en el objeto de datos
   */
  key: string;
  /**
   * Etiqueta a mostrar en la tarjeta móvil
   */
  label: string;
  /**
   * Función opcional para formatear el valor
   */
  format?: (value: any, row: T) => ReactNode;
  /**
   * Si es true, este campo se muestra como título principal de la tarjeta
   */
  isTitle?: boolean;
  /**
   * Si es true, este campo se oculta en la vista móvil
   */
  hideOnMobile?: boolean;
}

interface MobileTableViewProps<T = any> {
  /**
   * Datos a renderizar
   */
  data: T[];
  /**
   * Columnas de la tabla
   */
  columns: MobileTableColumn<T>[];
  /**
   * Función para renderizar acciones (botones) en cada tarjeta
   */
  renderActions?: (row: T, index: number) => ReactNode;
  /**
   * Clase CSS adicional para el contenedor
   */
  className?: string;
  /**
   * Clase CSS adicional para cada tarjeta
   */
  cardClassName?: string;
  /**
   * Mostrar indicador de carga al final
   */
  isLoading?: boolean;
  /**
   * Ref del elemento centinela para infinite scroll
   */
  sentinelRef?: React.RefObject<HTMLDivElement>;
  /**
   * Mensaje cuando no hay datos
   */
  emptyMessage?: string;
}

/**
 * Vista móvil de tabla como tarjetas apiladas
 */
export function MobileTableView<T extends Record<string, any>>({
  data,
  columns,
  renderActions,
  className,
  cardClassName,
  isLoading = false,
  sentinelRef,
  emptyMessage = 'No hay datos disponibles',
}: MobileTableViewProps<T>) {
  // Filtrar columnas visibles en móvil
  const visibleColumns = columns.filter((col) => !col.hideOnMobile);
  const titleColumn = visibleColumns.find((col) => col.isTitle) || visibleColumns[0];

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12 text-muted-foreground', className)}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {data.map((row, index) => {
        const titleValue = titleColumn
          ? titleColumn.format
            ? titleColumn.format(row[titleColumn.key], row)
            : row[titleColumn.key]
          : null;

        return (
          <div
            key={index}
            className={cn(
              'bg-card text-card-foreground rounded-xl border shadow-sm p-4 flex flex-col gap-3',
              cardClassName
            )}
          >
            {/* Título principal */}
            {titleValue && (
              <div className="font-semibold text-base pb-2 border-b">
                {titleValue}
              </div>
            )}

            {/* Campos */}
            <div className="space-y-2">
              {visibleColumns
                .filter((col) => col !== titleColumn)
                .map((column) => {
                  const value = row[column.key];
                  const formattedValue = column.format ? column.format(value, row) : value;

                  if (formattedValue === null || formattedValue === undefined || formattedValue === '') {
                    return null;
                  }

                  return (
                    <div key={column.key} className="flex justify-between items-start gap-2">
                      <span className="text-muted-foreground text-sm font-medium min-w-[100px]">
                        {column.label}:
                      </span>
                      <span className="text-sm text-right flex-1 break-words">
                        {formattedValue}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Acciones */}
            {renderActions && (
              <div className="flex gap-2 pt-2 border-t">
                {renderActions(row, index)}
              </div>
            )}
          </div>
        );
      })}

      {/* Elemento centinela para infinite scroll */}
      {sentinelRef && (
        <div ref={sentinelRef} className="h-4 w-full" />
      )}

      {/* Indicador de carga */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

