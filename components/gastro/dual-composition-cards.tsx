'use client'

import { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Utensils, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DualCompositionCardsProps {
  regularLabel?: string
  allergenLabel?: string
  regularContent: ReactNode
  allergenContent?: ReactNode
  showAllergenCard?: boolean
  className?: string
}

/**
 * Displays dual composition cards for regular and allergen menus
 * Used in gastronomia detail page
 */
export function DualCompositionCards({
  regularLabel = 'Menú Regular',
  allergenLabel = 'Menú Alérgeno 🔴',
  regularContent,
  allergenContent,
  showAllergenCard = false,
  className,
}: DualCompositionCardsProps) {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6', className)}>
      {/* Regular Menu Card */}
      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/40 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-emerald-500" />
            <CardTitle className="text-[12px] font-black uppercase tracking-widest flex items-center gap-2">
              <Utensils className="h-4 w-4 text-emerald-600" />
              {regularLabel}
            </CardTitle>
          </div>
        </div>
        <CardContent className="p-1">{regularContent}</CardContent>
      </Card>

      {/* Allergen Menu Card */}
      {showAllergenCard && (
        <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border/40 bg-red-500/5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-red-500" />
              <CardTitle className="text-[12px] font-black uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                {allergenLabel}
              </CardTitle>
            </div>
            <Badge variant="destructive" className="text-[10px]">
              ⚠️ Especial
            </Badge>
          </div>
          <CardContent className="p-1">{allergenContent || <p className="text-xs text-muted-foreground p-4">No hay menú alérgeno configurado.</p>}</CardContent>
        </Card>
      )}
    </div>
  )
}
