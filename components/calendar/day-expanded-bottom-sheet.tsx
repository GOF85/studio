'use client';

import { memo, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CalendarEventRow } from './calendar-event-row';
import { cn } from '@/lib/utils';

export interface CalendarEvent {
  date: Date;
  osId: string;
  serviceNumber: string;
  horaInicio: string;
  space: string;
  finalClient: string;
  asistentes: number;
  status: string;
  respMetre?: string;
  respPase?: string;
  respProjectManager?: string;
  respMetrePhone?: string;
  respPasePhone?: string;
  respProjectManagerPhone?: string;
  respMetreMail?: string;
  respPaseMail?: string;
  respProjectManagerMail?: string;
}

export interface DayExpandedBottomSheetProps {
  day: Date;
  osEvents: { [osId: string]: CalendarEvent[] };
  isOpen: boolean;
  onClose: () => void;
  onEventClick: (serviceNumber: string) => void;
  router: any;
}

const DayExpandedBottomSheetComponent = ({
  day,
  osEvents,
  isOpen,
  onClose,
  onEventClick,
  router,
}: DayExpandedBottomSheetProps) => {
  const isMobile = useIsMobile();

  // Ordenar eventos cronológicamente
  const sortedEvents = useMemo(() => {
    const allEvents = Object.values(osEvents).flat();
    return allEvents.sort((a, b) => {
      const timeA = parseInt(a.horaInicio.replace(':', '')) || 0;
      const timeB = parseInt(b.horaInicio.replace(':', '')) || 0;
      return timeA - timeB;
    });
  }, [osEvents]);

  // Calcular total de pax del día
  const totalDayPax = useMemo(
    () => sortedEvents.reduce((acc, event) => acc + event.asistentes, 0),
    [sortedEvents]
  );

  // Formatear fecha con estilo
  const formattedDate = useMemo(
    () => format(day, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }),
    [day]
  );

  const handleEventClick = useCallback(
    (serviceNumber: string) => {
      onEventClick(serviceNumber);
    },
    [onEventClick]
  );

  const contentComponent = (
    <div className="w-full h-full flex flex-col">
      {/* Header sticky */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3 mb-4 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-lg font-semibold capitalize">
            {formattedDate}
          </h2>
        </div>
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="shrink-0 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* ScrollArea para eventos */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-3 pb-6">
          {sortedEvents.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">Sin eventos programados para este día</p>
            </div>
          ) : (
            sortedEvents.map((event, index) => (
              <CalendarEventRow
                key={`${event.osId}-${index}`}
                event={event}
                onViewDetails={handleEventClick}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer con total */}
      {sortedEvents.length > 0 && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t px-4 py-3 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Total del día
            </span>
            <Badge variant="default" className="text-lg px-3 py-1">
              {totalDayPax} pax
            </Badge>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-2xl flex flex-col overflow-hidden"
        >
          {contentComponent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col overflow-hidden p-0">
        <DialogTitle className="sr-only">{formattedDate}</DialogTitle>
        {contentComponent}
      </DialogContent>
    </Dialog>
  );
};

export const DayExpandedBottomSheet = memo(DayExpandedBottomSheetComponent);
DayExpandedBottomSheet.displayName = 'DayExpandedBottomSheet';
