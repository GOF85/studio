'use client';

import { differenceInCalendarDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Calendar } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import type { OsPanelFormValues, PersonalLookup } from '@/types/os-panel';

interface EspacioTabProps {
  form: UseFormReturn<OsPanelFormValues>;
  osData: any;
  personalLookup: PersonalLookup;
}

// Helper functions
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  try {
    return format(new Date(dateString), 'd MMM', { locale: es });
  } catch {
    return '—';
  }
};

const calculateDuration = (start: string | null | undefined, end: string | null | undefined): string => {
  if (!start || !end) return '—';
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffDays = differenceInCalendarDays(endDate, startDate) + 1;
    const safeDays = Math.max(diffDays, 1);
    return safeDays === 1 ? '1 día' : `${safeDays} días`;
  } catch {
    return '—';
  }
};

export function EspacioTab({
  form,
  osData,
  personalLookup,
}: EspacioTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
      {/* Fechas - Compact inline layout */}
      <Card className="border-0 bg-slate-50 shadow-sm h-full">
        <CardContent className="pt-4 h-full flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-blue-600">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <span>FECHAS</span>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-baseline gap-2 text-muted-foreground">
              <span className="font-medium text-foreground">{formatDate(osData?.start_date)}</span>
              <span className="text-xs">•</span>
              <span className="font-medium text-foreground">{formatDate(osData?.end_date)}</span>
              <span className="text-xs">•</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                {calculateDuration(osData?.start_date, osData?.end_date)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cliente - Final client emphasized */}
      <Card className="border-0 bg-white shadow-sm border border-gray-200 h-full">
        <CardContent className="pt-4 h-full flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-purple-600">
            <span>👥</span>
            <span>CLIENTE</span>
          </div>
          <div className="space-y-1">
            {osData?.client && (
              <div className="text-xs text-muted-foreground truncate">
                {osData.client}
              </div>
            )}
            <div className="text-base font-bold text-foreground line-clamp-2">
              {osData?.final_client || '—'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Espacio - With MapPin icon and Maps link */}
      <Card className="border-0 bg-green-50 shadow-sm h-full">
        <CardContent className="pt-4 h-full flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-emerald-600">
            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
            <span>ESPACIO</span>
          </div>
          <div className="space-y-2">
            {osData?.space && (
              <div className="text-sm font-medium text-foreground truncate">
                {osData.space}
              </div>
            )}
            {osData?.space_address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(osData.space_address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground line-clamp-2 underline-offset-2 hover:underline"
              >
                {osData.space_address}
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inspection - Placeholder for future feature */}
      <Card className="border-0 bg-gray-100 shadow-sm opacity-60 h-full">
        <CardContent className="pt-4 h-full flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-amber-600">
            <span>🔍</span>
            <span>INSPECCIÓN</span>
          </div>
          <div className="flex items-center justify-center h-14 text-xs text-muted-foreground italic">
            Próximamente
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
