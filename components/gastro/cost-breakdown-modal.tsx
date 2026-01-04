'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CostBreakdownModalProps {
  regularPax: number
  regularTotal: number
  allergenPax?: number
  allergenTotal?: number
  currency?: 'EUR' | 'USD'
}

export function CostBreakdownModal({
  regularPax,
  regularTotal,
  allergenPax = 0,
  allergenTotal = 0,
  currency = 'EUR',
}: CostBreakdownModalProps) {
  const [open, setOpen] = useState(false)

  const regularCostPerPax = regularPax > 0 ? regularTotal / regularPax : 0
  const allergenCostPerPax = allergenPax > 0 ? allergenTotal / allergenPax : 0

  const formatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  })

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          'h-8 text-[10px] font-black uppercase tracking-widest border-border/40 hover:bg-blue-500/5',
          'flex items-center gap-1'
        )}
        onClick={() => setOpen(true)}
      >
        📊 Desglose
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm w-full p-0 rounded-lg z-50">
          <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/40">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold">Desglose de Costos</DialogTitle>
              <DialogClose className="h-6 w-6" />
            </div>
          </DialogHeader>

          <div className="px-4 py-4 space-y-4">
            {/* Regular Menu */}
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-emerald-800">Menú Regular</h3>
              <div className="grid grid-cols-2 gap-4 text-xs p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div>
                  <p className="text-muted-foreground">Asistentes</p>
                  <p className="font-bold text-sm">{regularPax}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Costo Total</p>
                  <p className="font-bold text-sm">{formatter.format(regularTotal)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Costo por Persona</p>
                  <p className="font-bold text-base">{formatter.format(regularCostPerPax)}</p>
                </div>
              </div>
            </div>

            {/* Allergen Menu (if exists) */}
            {allergenPax > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-red-700">Menú Alérgeno</h3>
                <div className="grid grid-cols-2 gap-4 text-xs p-3 rounded-lg bg-red-50 border border-red-200">
                  <div>
                    <p className="text-muted-foreground">Asistentes</p>
                    <p className="font-bold text-sm">{allergenPax}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Costo Total</p>
                    <p className="font-bold text-sm">{formatter.format(allergenTotal)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Costo por Persona</p>
                    <p className="font-bold text-base">{formatter.format(allergenCostPerPax)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Combined Total */}
            <div className="pt-2 border-t border-border/40 space-y-2">
              <h3 className="font-bold text-sm">Total Combinado</h3>
              <div className="grid grid-cols-2 gap-4 text-xs p-3 rounded-lg bg-muted/50 border border-border/40">
                <div>
                  <p className="text-muted-foreground">Asistentes Totales</p>
                  <p className="font-bold text-sm">{regularPax + allergenPax}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Costo Total</p>
                  <p className="font-bold text-sm">{formatter.format(regularTotal + allergenTotal)}</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
