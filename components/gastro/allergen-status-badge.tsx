'use client'

import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface AllergenStatusBadgeProps {
  asistentesAlergenos?: number
  itemsCount?: number
  approvedCount?: number
  allApproved?: boolean
  className?: string
}

/**
 * Status badge showing allergen menu configuration status
 * Used in detail pages to quickly show allergen state
 */
export function AllergenStatusBadge({
  asistentesAlergenos = 0,
  itemsCount = 0,
  approvedCount = 0,
  allApproved = false,
  className,
}: AllergenStatusBadgeProps) {
  if (asistentesAlergenos === 0) {
    return (
      <Badge variant="outline" className={cn('text-xs gap-1', className)}>
        <Circle className="h-2 w-2" />
        Sin alérgenos
      </Badge>
    )
  }

  if (itemsCount === 0) {
    return (
      <Badge variant="secondary" className={cn('text-xs gap-1', className)}>
        <AlertTriangle className="h-3 w-3 text-amber-500" />
        {asistentesAlergenos} pax | 0 items
      </Badge>
    )
  }

  return (
    <Badge 
      variant={allApproved ? 'default' : 'secondary'} 
      className={cn('text-xs gap-1', className)}
    >
      {allApproved ? (
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
      ) : (
        <AlertTriangle className="h-3 w-3 text-amber-500" />
      )}
      {asistentesAlergenos} pax | {itemsCount} items{approvedCount > 0 ? ` (${approvedCount} ✓)` : ''}
    </Badge>
  )
}
