'use client'

import { useState, useMemo, memo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Users, Clock, Utensils, BookOpen, ListCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn, calculateHours } from '@/lib/utils'
import type { ComercialBriefingItem } from '@/types'

interface BriefingSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: ComercialBriefingItem[]
}

export const BriefingSummaryDialog = memo(function BriefingSummaryDialog({ 
  open, 
  onOpenChange, 
  items 
}: BriefingSummaryDialogProps) {
  // Agrupar y pre-procesar por días para evitar cálculos en el render
  const processedGroups = useMemo(() => {
    const groups: Record<string, any[]> = {}
    
    items.forEach((item) => {
      const dateKey = item.fecha
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push({
        ...item,
        durationStr: calculateDurationLabel(item.horaInicio, item.horaFin)
      })
    })
    
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, dayItems]) => ({
        fecha,
        fechaLabel: format(new Date(fecha), 'EEEE, d MMMM', { locale: es }),
        items: dayItems.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
      }))
  }, [items])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full p-0 rounded-lg overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Resumen de Servicios</DialogTitle>
              <DialogDescription className="sr-only">
                Desglose de servicios y horarios del briefing comercial.
              </DialogDescription>
            </div>
          </div>
          <DialogClose className="absolute right-4 top-4" />
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
          {items.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12 bg-muted/10 rounded-xl border border-dashed border-border/40">
              No hay servicios registrados en el briefing comercial.
            </div>
          ) : (
            processedGroups.map((group) => (
              <div key={group.fecha} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 bg-blue-50/50 px-3 py-1 rounded-full border border-blue-100">
                    {group.fechaLabel}
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
                
                <div className="grid gap-3">
                  {group.items.map((item) => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "group relative rounded-xl border p-4 transition-all duration-200 hover:shadow-md",
                          item.conGastronomia 
                            ? "bg-emerald-50/50 border-emerald-200/60 hover:border-emerald-300" 
                            : "bg-background border-border/60 hover:border-border hover:bg-muted/5"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              {item.conGastronomia && (
                                <div className="p-1 rounded-md bg-emerald-100 text-emerald-700">
                                  <Utensils className="h-3.5 w-3.5" />
                                </div>
                              )}
                              <h4 className="font-bold text-sm tracking-tight text-foreground uppercase">
                                {item.descripcion}
                              </h4>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted-foreground">
                              <div className="flex items-center gap-1.5 font-semibold">
                                <Clock className="h-3.5 w-3.5 text-blue-500" />
                                <span className="text-foreground">{item.horaInicio} - {item.horaFin}</span>
                                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-black italic">
                                  {item.durationStr}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 font-semibold">
                                <Users className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-foreground">{item.asistentes} PAX</span>
                              </div>
                            </div>

                            {item.comentarios && (
                              <div className="bg-muted/20 rounded-md p-2 mt-2">
                                <p className="text-[11px] text-muted-foreground/80 italic line-clamp-2 leading-relaxed">
                                  "{item.comentarios}"
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})

function calculateDurationLabel(start: string, end: string): string {
  const hours = calculateHours(start, end)
  if (hours === 0) return '0h'
  
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  
  if (minutes === 0) return `${wholeHours}h`
  if (wholeHours === 0) return `${minutes}m`
  return `${wholeHours}h ${minutes}m`
}

export function BriefingSummaryTrigger({ items }: { items: any[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-[9px] font-black uppercase tracking-tight bg-zinc-900 text-zinc-50 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-50 transition-all duration-200 shadow-lg shadow-zinc-900/20 px-2"
        onClick={() => setOpen(true)}
      >
        <ListCheck className="h-3 w-3" />
        <span className="hidden md:inline ml-1.5">Briefing</span>
      </Button>
      <BriefingSummaryDialog open={open} onOpenChange={setOpen} items={items} />
    </>
  )
}
