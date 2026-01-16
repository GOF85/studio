'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, History, FileText, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import type { OsPanelFormValues } from '@/types/os-panel';

interface OsPanelHeaderProps {
  numeroExpediente: string;
  espacio: string;
  cliente: string;
  clienteFinal?: string;
  fechaInicio?: string;
  fechaFin?: string;
  isVip?: boolean;
  completionPercentage?: number;
  syncStatus: 'idle' | 'syncing' | 'saved' | 'error';
  onHistorialClick?: () => void;
  onExportClick?: () => void;
  onMoreClick?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export function OsPanelHeader({
  numeroExpediente,
  espacio,
  cliente,
  clienteFinal,
  fechaInicio,
  fechaFin,
  isVip = false,
  completionPercentage = 0,
  syncStatus,
  onHistorialClick,
  onExportClick,
  onMoreClick,
  isCollapsed = false,
  onToggleCollapse,
}: OsPanelHeaderProps) {
  const [isOpen, setIsOpen] = useState(!isCollapsed);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggleCollapse?.(!newState);
  };

  // Color for completion percentage
  const getCompletionColor = () => {
    if (completionPercentage < 30) return 'destructive';
    if (completionPercentage < 70) return 'outline';
    return 'default';
  };

  return (
    <div className="sticky top-12 z-40 bg-white/80 backdrop-blur border-b border-muted">
      <div className="container mx-auto px-4 py-3">
        {/* Header Content */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Title and info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="font-black text-lg truncate">
                OS {numeroExpediente}
              </h2>
              {isVip && (
                <Badge className="bg-amber-100 text-amber-900 px-2 py-1 text-xs font-semibold flex-shrink-0">
                  VIP
                </Badge>
              )}
              <Badge variant={getCompletionColor()} className="text-xs flex-shrink-0">
                {completionPercentage}%
              </Badge>
            </div>

            {/* Info row */}
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground truncate">
                {espacio}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span>{cliente}</span>
                {clienteFinal && <span>• {clienteFinal}</span>}
                {fechaInicio && (
                  <>
                    <span>•</span>
                    <span>
                      {fechaInicio}
                      {fechaFin && ` - ${fechaFin}`}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <AutoSaveIndicator status={syncStatus} />

            <Button
              variant="ghost"
              size="sm"
              onClick={onHistorialClick}
              title="Historial de cambios (Cmd+H)"
              className="h-9 w-9 p-0"
            >
              <History className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onExportClick}
              title="Exportar a PDF"
              className="h-9 w-9 p-0"
            >
              <FileText className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onMoreClick}
              title="Más opciones"
              className="h-9 w-9 p-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {/* Toggle collapse */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="h-9 w-9 p-0 ml-2"
            >
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Details (collapsed) */}
        {!isOpen && (
          <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-3 pb-2 border-t pt-2">
            <div>
              <div className="font-semibold text-foreground">Espacio</div>
              {espacio}
            </div>
            <div>
              <div className="font-semibold text-foreground">Cliente</div>
              {cliente}
            </div>
            {clienteFinal && (
              <div>
                <div className="font-semibold text-foreground">Cliente Final</div>
                {clienteFinal}
              </div>
            )}
            {fechaInicio && (
              <div>
                <div className="font-semibold text-foreground">Fechas</div>
                {fechaFin ? `${fechaInicio} - ${fechaFin}` : fechaInicio}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
