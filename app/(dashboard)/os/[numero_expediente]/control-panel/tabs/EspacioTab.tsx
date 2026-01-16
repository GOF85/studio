'use client';

import { differenceInCalendarDays } from 'date-fns';
import { MapPin, ExternalLink, Info } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OsPanelFormValues, PersonalLookup } from '@/types/os-panel';

interface EspacioTabProps {
  form: UseFormReturn<OsPanelFormValues>;
  osData: any;
  personalLookup: PersonalLookup;
}

export function EspacioTab({
  form,
  osData,
  personalLookup,
}: EspacioTabProps) {
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateDuration = (start: string, end: string): string => {
    if (!start || !end) return '—';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffDays = differenceInCalendarDays(endDate, startDate) + 1;
    const safeDays = Math.max(diffDays, 1);
    return `${safeDays} día${safeDays !== 1 ? 's' : ''}`;
  };

  const getGoogleMapsUrl = (address: string | null | undefined): string => {
    if (!address) return '';
    return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Fechas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            📅 FECHAS
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Información de fechas del servicio
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="font-semibold block mb-1">Inicio:</span>
            <span className="text-muted-foreground">
              {formatDate(osData?.start_date)}
            </span>
          </div>
          <div>
            <span className="font-semibold block mb-1">Fin:</span>
            <span className="text-muted-foreground">
              {formatDate(osData?.end_date)}
            </span>
          </div>
          <div>
            <span className="font-semibold block mb-1">Duración:</span>
            <span className="text-muted-foreground">
              {calculateDuration(osData?.start_date, osData?.end_date)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cliente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            👥 CLIENTE
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Información del cliente del evento
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="font-semibold block mb-1">Cliente:</span>
            <span className="text-muted-foreground">{osData?.client || '—'}</span>
          </div>
          <div>
            <span className="font-semibold block mb-1">Cliente Final:</span>
            <span className="text-muted-foreground">
              {osData?.final_client || '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Espacio */}
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            🏢 ESPACIO
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Datos del espacio donde se realiza el evento
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <span className="font-semibold text-sm block mb-1">Nombre:</span>
            <span className="text-muted-foreground text-sm">
              {osData?.space || '—'}
            </span>
          </div>

          <div>
            <span className="font-semibold text-sm block mb-1">Dirección:</span>
            <span className="text-muted-foreground text-sm">
              {osData?.space_address || '—'}
            </span>
          </div>

          {osData?.space_address && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 mt-2"
              asChild
            >
              <a
                href={getGoogleMapsUrl(osData.space_address)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin className="h-4 w-4" />
                Ver en Google Maps
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Inspección (próximamente) */}
      <Card className="md:col-span-2 lg:col-span-1 opacity-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            🔗 INSPECCIÓN
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Acceso a fotos y detalles del espacio (próximamente disponible)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm italic">
            Próximamente disponible
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
