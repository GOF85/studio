'use client';

import { useEffect, useState } from 'react';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AutoSaveIndicatorProps {
  status: 'idle' | 'syncing' | 'saved' | 'error';
  lastSyncTime?: Date | null;
}

export function AutoSaveIndicator({
  status,
  lastSyncTime,
}: AutoSaveIndicatorProps) {
  const [isVisible, setIsVisible] = useState(status !== 'idle');

  useEffect(() => {
    if (status === 'idle') {
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
    setIsVisible(true);
  }, [status]);

  if (!isVisible && status === 'idle') {
    return null;
  }

  const getIcon = () => {
    switch (status) {
      case 'syncing':
        return <Loader2 className="h-4 w-4 animate-spin text-amber-500" />;
      case 'saved':
        return <Check className="h-4 w-4 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getTooltipText = () => {
    switch (status) {
      case 'syncing':
        return 'Guardando...';
      case 'saved':
        if (!lastSyncTime) return 'Guardado';
        const now = new Date();
        const diffMs = now.getTime() - lastSyncTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins === 0) return 'Guardado hace unos segundos';
        if (diffMins === 1) return 'Guardado hace 1 minuto';
        if (diffMins < 60) return `Guardado hace ${diffMins} minutos`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours === 1) return 'Guardado hace 1 hora';
        return `Guardado hace ${diffHours} horas`;
      case 'error':
        return 'Error al guardar';
      default:
        return '';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center h-9 w-9 flex-shrink-0 rounded-md hover:bg-muted transition-colors cursor-help">
            {getIcon()}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {getTooltipText()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
