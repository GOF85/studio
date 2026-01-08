'use client'

import { useState } from 'react'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetTrigger
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { History, User, Info, CheckCircle2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ActivityLogSheetProps {
  entityId: string
  entityType?: string
  buttonClassName?: string
}

export function ActivityLogSheet({ 
  entityId, 
  entityType = 'OS',
  buttonClassName 
}: ActivityLogSheetProps) {
  const [open, setOpen] = useState(false)

  const { data: logs, isLoading } = useQuery({
    queryKey: ['activity-logs', entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entidad_id', entityId)
        .eq('entidad', entityType)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      
      return (data || []).map((log: any) => {
        let name = 'Usuario';
        let displayMessage = '';

        try {
            const parsed = typeof log.detalles === 'string' ? JSON.parse(log.detalles) : log.detalles;
            if (parsed?.userName) name = parsed.userName;
            
            // Extraer el mensaje descriptivo
            if (parsed?.originalDetails) {
                displayMessage = parsed.originalDetails;
            } else if (typeof log.detalles === 'string' && !log.detalles.startsWith('{')) {
                displayMessage = log.detalles;
            } else {
                // Si es un objeto complejo que no sea el nuestro, mostrarlo bonito o filtrado
                const { userName: _, userRole: __, ...rest } = parsed || {};
                displayMessage = Object.keys(rest).length > 0 ? JSON.stringify(rest) : '';
            }
        } catch (e) {
            displayMessage = log.detalles;
        }

        return {
            ...log,
            displayUserName: name,
            displayMessage: displayMessage || log.accion // Fallback al nombre de la acción
        };
      });
    },
    enabled: open
  })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className={cn("h-8 w-8", buttonClassName)}
          title="Ver historial de cambios"
        >
          <History className="h-4 w-4" />
          <span className="sr-only">Historial</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md border-l border-border/40 p-0">
        <div className="p-6 pb-2">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <History className="h-4 w-4 text-blue-500" />
              Historial de Cambios
            </SheetTitle>
            <SheetDescription className="sr-only">
              Historial detallado de cambios para esta entidad.
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="h-[calc(100vh-130px)] px-6">
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-3 w-1/4" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ))
            ) : logs && logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="relative pl-6 pb-3 last:pb-0">
                  {/* Línea vertical conectora */}
                  <div className="absolute left-[11px] top-6 bottom-0 w-[1px] bg-border/40 last:hidden" />
                  
                  {/* Icono de estado reducido */}
                  <div className="absolute left-0 top-0.5 h-6 w-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center z-10">
                    <CheckCircle2 className="h-3 w-3 text-blue-500" />
                  </div>

                  <div className="bg-muted/20 rounded-md p-2 border border-border/30">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                          <User className="h-2.5 w-2.5 text-muted-foreground" />
                          {log.displayUserName}
                        </span>
                        <Badge variant="outline" className="h-4 px-1 text-[9px] uppercase font-medium bg-background border-blue-100 text-blue-700 pointer-events-none">
                          {log.accion}
                        </Badge>
                      </div>
                      <span className="text-[9px] text-muted-foreground whitespace-nowrap mt-0.5">
                        {format(new Date(log.created_at), "d MMM, HH:mm", { locale: es })}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {log.displayMessage}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Info className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No hay registros de actividad aún</p>
                <p className="text-xs text-muted-foreground/60">Los cambios que realices aparecerán aquí.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
