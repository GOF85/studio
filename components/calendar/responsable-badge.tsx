'use client';

import { memo, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';

export interface ResponsableBadgeProps {
  nombre: string;
  rol: 'metre' | 'pase' | 'project-manager';
  telefono?: string;
  email?: string;
  showTooltip?: boolean;
}

// Extraer iniciales del nombre
const extractInitials = (nombre: string): string => {
  if (!nombre || nombre.trim() === '') return '';
  
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  
  return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
};

// Obtener color según rol
const getRolStyles = (rol: 'metre' | 'pase' | 'project-manager') => {
  switch (rol) {
    case 'metre':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-300 dark:border-blue-700',
      };
    case 'pase':
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-300 dark:border-green-700',
      };
    case 'project-manager':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-300 dark:border-amber-700',
      };
    default:
      return {
        bg: 'bg-slate-100 dark:bg-slate-900/30',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-300 dark:border-slate-700',
      };
  }
};

const getRolLabel = (rol: 'metre' | 'pase' | 'project-manager'): string => {
  switch (rol) {
    case 'metre':
      return 'Metre';
    case 'pase':
      return 'Pase';
    case 'project-manager':
      return 'PM';
    default:
      return '';
  }
};

const ResponsableBadgeComponent = ({
  nombre,
  rol,
  telefono,
  email,
  showTooltip = true,
}: ResponsableBadgeProps) => {
  const isMobile = useIsMobile();
  
  const initials = useMemo(() => extractInitials(nombre), [nombre]);
  const styles = useMemo(() => getRolStyles(rol), [rol]);
  const rolLabel = useMemo(() => getRolLabel(rol), [rol]);

  // Si no hay nombre, mostrar badge "SIN ASIGNAR"
  if (!nombre || nombre.trim() === '') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'h-6 px-2 text-xs font-medium rounded-full border',
          'bg-amber-50 dark:bg-amber-950/30',
          'text-amber-700 dark:text-amber-300',
          'border-amber-300 dark:border-amber-700'
        )}
      >
        SIN ASIGNAR
      </Badge>
    );
  }

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'h-6 w-6 p-0 flex items-center justify-center text-xs font-bold rounded-full border cursor-default',
        'transition-transform duration-200 hover:scale-110',
        styles.bg,
        styles.text,
        styles.border
      )}
    >
      {initials}
    </Badge>
  );

  // No mostrar tooltip en mobile
  if (!showTooltip || isMobile) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent side="top" className="text-sm max-w-xs">
        <div className="font-semibold">{nombre}</div>
        <div className="text-xs text-muted-foreground">{rolLabel}</div>
        {telefono && (
          <div className="text-xs text-muted-foreground">{telefono}</div>
        )}
        {email && (
          <div className="text-xs text-muted-foreground truncate">{email}</div>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

export const ResponsableBadge = memo(ResponsableBadgeComponent);
ResponsableBadge.displayName = 'ResponsableBadge';
