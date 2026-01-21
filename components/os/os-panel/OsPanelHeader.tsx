'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, History, FileText, MoreVertical, Star, Share2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AutoSaveIndicator } from '@/components/os/os-panel/AutoSaveIndicator';
import type { OsPanelFormValues } from '@/types/os-panel';
import { useToast } from '@/hooks/use-toast';
import { differenceInCalendarDays, parse } from 'date-fns';

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
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();
  
  // Memoize VIP state to prevent flickering on reload
  const vipState = useMemo(() => isVip, [isVip]);

  // Calculate duration in days
  const durationDays = useMemo(() => {
    if (!fechaInicio || !fechaFin) return null;
    try {
      // Dates come formatted as DD/MM/YYYY from page.tsx (toLocaleDateString('es-ES'))
      const start = parse(fechaInicio, 'd/M/yyyy', new Date());
      const end = parse(fechaFin, 'd/M/yyyy', new Date());
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
      
      const diff = differenceInCalendarDays(end, start) + 1;
      return diff > 0 ? diff : 1;
    } catch (e) {
      console.error('Error calculating duration:', e);
      return null;
    }
  }, [fechaInicio, fechaFin]);

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

  return (
    <div className={`sticky top-12 z-40 backdrop-blur border-b transition-all duration-200 ${
      vipState 
        ? 'bg-amber-50/90 border-amber-200' 
        : 'bg-white/80 border-muted'
    }`}>
      <div className="container mx-auto px-4 py-2">
        {/* Header Content */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
               <AutoSaveIndicator status={syncStatus} />
               {vipState && (
                 <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
               )}
             </div>

             <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100/50 rounded text-slate-700 text-xs">
                <span className="font-bold text-slate-900 mr-1">{numeroExpediente}</span>
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-semibold whitespace-nowrap">
                    {fechaInicio} {fechaFin && `— ${fechaFin}`}
                </span>
                {durationDays && (
                    <span className="ml-1 text-[10px] text-slate-500 font-normal whitespace-nowrap">
                        ({durationDays} {durationDays === 1 ? 'día' : 'días'})
                    </span>
                )}
              </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onHistorialClick}
              title="Historial de cambios (Cmd+H)"
              type="button"
              className="h-8 px-2 text-slate-600 hover:text-slate-900"
            >
              <History className="h-4 w-4 mr-1.5" />
              <span className="text-xs font-medium hidden sm:inline">Historial</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onExportClick}
              title="Exportar a PDF"
              type="button"
              className="h-8 px-2 text-slate-600 hover:text-slate-900"
            >
              <FileText className="h-4 w-4 mr-1.5" />
              <span className="text-xs font-medium hidden sm:inline">PDF</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              disabled={isSharing}
              title="Compartir enlace"
              type="button"
              className="h-8 px-2 text-slate-600 hover:text-slate-900"
            >
              <Share2 className={`h-4 w-4 mr-1.5 ${isSharing ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-medium hidden sm:inline">Compartir</span>
            </Button>

            <div className="w-px h-4 bg-slate-200 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={onMoreClick}
              type="button"
              className="h-8 w-8 p-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
