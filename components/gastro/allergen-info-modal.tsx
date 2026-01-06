'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ALLERGEN_LIST, type AllergendId } from '@/lib/allergen-constants'

interface AllergenInfoModalProps {
  allergenIds: AllergendId[]
  dishName?: string
  trigger?: 'icon' | 'badge' // Type of trigger element
}

export function AllergenInfoModal({ allergenIds, dishName, trigger = 'icon' }: AllergenInfoModalProps) {
  const [open, setOpen] = useState(false)

  if (!allergenIds || allergenIds.length === 0) {
    return null
  }

  const allergenInfo = allergenIds
    .map((id) => ALLERGEN_LIST.find((a) => a.id === id))
    .filter(Boolean)

  if (allergenInfo.length === 0) {
    return null
  }

  return (
    <>
      {trigger === 'icon' && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 hover:bg-transparent"
          onClick={() => setOpen(true)}
          title="Ver información de alérgenos"
        >
          <Info className="h-4 w-4 text-red-500" />
        </Button>
      )}

      {trigger === 'badge' && (
        <Badge
          variant="destructive"
          className="cursor-pointer text-[10px] gap-1"
          onClick={() => setOpen(true)}
        >
          🔴 Alérgeno
        </Badge>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm w-full p-0 rounded-lg">
          <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold">Información de Alérgenos</DialogTitle>
                <DialogDescription className="sr-only">
                  Lista de alérgenos presentes para el plato {dishName || 'seleccionado'}.
                </DialogDescription>
                {dishName && <p className="text-xs text-muted-foreground mt-1">{dishName}</p>}
              </div>
              <DialogClose className="h-6 w-6" />
            </div>
          </DialogHeader>

          <div className="px-4 py-4 space-y-3">
            <div className="space-y-2">
              {allergenInfo.map((allergen) => (
                <div
                  key={allergen!.id}
                  className="flex items-start gap-3 p-2 rounded-md bg-muted/30 border border-border/40"
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{allergen!.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{allergen!.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground">
              <p>⚠️ Este plato contiene o puede contener los alérgenos indicados arriba.</p>
              <p className="mt-2">Contacta con cocina si necesitas información adicional sobre trazas.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
