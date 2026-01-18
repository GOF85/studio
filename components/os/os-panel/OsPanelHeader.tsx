'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, History, FileText, MoreVertical, Star, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AutoSaveIndicator } from '@/components/os/os-panel/AutoSaveIndicator';
import type { OsPanelFormValues } from '@/types/os-panel';
import { useToast } from '@/hooks/use-toast';

interface OsPanelHeaderProps {
  numeroExpediente: string;
  osId?: string; // Add this to help with sharing
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
  osId,
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
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();
  
  // Memoize VIP state to prevent flickering on reload
  const vipState = useMemo(() => isVip, [isVip]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggleCollapse?.(!newState);
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      const response = await fetch('/api/os/panel/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ osId: osId || numeroExpediente }),
      });
      const data = await response.json();
      if (data.url) {
        await navigator.clipboard.writeText(data.url);
        toast({
          title: "¡Enlace copiado!",
          description: "El enlace de gestión de solo lectura ha sido copiado al portapapeles.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error al compartir",
        description: "No se pudo generar el enlace de acceso.",
      });
    } finally {
      setIsSharing(false);
    }
  };

  // Color for completion percentage
  const getCompletionColor = () => {
    if (completionPercentage < 30) return 'destructive';
    if (completionPercentage < 70) return 'outline';
    return 'default';
  };

  return (
    <div className={`sticky top-12 z-40 backdrop-blur border-b transition-colors ${
      vipState 
        ? 'bg-amber-50/90 border-amber-200' 
        : 'bg-white/80 border-muted'
    }`}>
      <div className="container mx-auto px-4 py-3">
        {/* Header Content */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Title and info - COMPACT 2 LINES */}
          <div className="flex-1 min-w-0">
            {/* Line 1: Number + VIP star + Completion */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                {vipState && (
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500 flex-shrink-0" />
                )}
                <h2 className="font-black text-lg truncate text-foreground">
                  OS {numeroExpediente}
                </h2>
              </div>
              <Badge variant={getCompletionColor()} className="text-xs flex-shrink-0 ml-auto sm:ml-2">
                {completionPercentage}%
              </Badge>
            </div>

            {/* Line 2: Space + Client + Dates - COMPACT */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-foreground truncate">{espacio}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground truncate">{clienteFinal || cliente}</span>
              {fechaInicio && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground whitespace-nowrap text-xs">
                    {fechaInicio}
                    {fechaFin && ` - ${fechaFin}`}
                  </span>
                </>
              )}
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
              type="button"
              className="h-9 w-9 p-0"
            >
              <History className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onExportClick}
              title="Exportar a PDF"
              type="button"
              className="h-9 w-9 p-0"
            >
              <FileText className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              disabled={isSharing}
              title="Compartir enlace de solo lectura"
              type="button"
              className="h-9 w-9 p-0"
            >
              <Share2 className={`h-4 w-4 ${isSharing ? 'animate-pulse' : ''}`} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onMoreClick}
              title="Más opciones"
              type="button"
              className="h-9 w-9 p-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {/* Toggle collapse */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              type="button"
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
