/**
 * Hook to detect and monitor changes in gastronomy orders
 * Useful for notifying kitchen (Cocina) when items change
 */

import { useEffect, useRef, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import type { GastronomyOrder } from '@/types'

interface ChangeDetectionOptions {
  debounceMs?: number
  onChangeDetected?: (changes: GastronomyOrderChanges) => void
}

export interface GastronomyOrderChanges {
  itemsAdded: number
  itemsRemoved: number
  itemsModified: number
  priceChanges: boolean
  allergenChanges: boolean
  timestamp: Date
}

export function useGastronomyOrderChanges(
  order: GastronomyOrder | null,
  options: ChangeDetectionOptions = {},
) {
  const { debounceMs = 1000, onChangeDetected } = options
  const { toast } = useToast()
  const previousOrderRef = useRef<GastronomyOrder | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const detectChanges = useCallback(
    (prev: GastronomyOrder | null, curr: GastronomyOrder | null): GastronomyOrderChanges | null => {
      if (!prev || !curr) return null

      let itemsAdded = 0
      let itemsRemoved = 0
      let itemsModified = 0
      let priceChanges = false
      let allergenChanges = false

      // Compare regular items
      const prevRegularIds = new Set(prev.items?.map((i) => i.id) || [])
      const currRegularIds = new Set(curr.items?.map((i) => i.id) || [])

      // Items added
      itemsAdded = Array.from(currRegularIds).filter((id) => !prevRegularIds.has(id)).length

      // Items removed
      itemsRemoved = Array.from(prevRegularIds).filter((id) => !currRegularIds.has(id)).length

      // Items modified
      curr.items?.forEach((currItem) => {
        const prevItem = prev.items?.find((i) => i.id === currItem.id)
        if (prevItem) {
          if (
            currItem.quantity !== prevItem.quantity ||
            currItem.precioVenta !== prevItem.precioVenta ||
            currItem.costeMateriaPrima !== prevItem.costeMateriaPrima
          ) {
            itemsModified++
            priceChanges = true
          }
        }
      })

      // Check allergen changes
      if (curr.asistentesAlergenos !== prev.asistentesAlergenos) {
        allergenChanges = true
      }

      const itemsAlergenesCurr = new Set(curr.itemsAlergenos?.map((i) => i.id) || [])
      const itemsAlergenesPrev = new Set(prev.itemsAlergenos?.map((i) => i.id) || [])

      if (itemsAlergenesCurr.size !== itemsAlergenesPrev.size) {
        allergenChanges = true
      }

      const hasChanges = itemsAdded > 0 || itemsRemoved > 0 || itemsModified > 0 || allergenChanges

      if (!hasChanges) return null

      return {
        itemsAdded,
        itemsRemoved,
        itemsModified,
        priceChanges,
        allergenChanges,
        timestamp: new Date(),
      }
    },
    [],
  )

  useEffect(() => {
    if (!order) return

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      const changes = detectChanges(previousOrderRef.current, order)

      if (changes) {
        // Notify callback
        if (onChangeDetected) {
          onChangeDetected(changes)
        }

        // Show toast notification
        const changesList: string[] = []
        if (changes.itemsAdded > 0) changesList.push(`+${changes.itemsAdded} platos`)
        if (changes.itemsRemoved > 0) changesList.push(`-${changes.itemsRemoved} platos`)
        if (changes.itemsModified > 0) changesList.push(`${changes.itemsModified} modificados`)
        if (changes.allergenChanges) changesList.push('Cambios en alérgenos')

        toast({
          title: '⚠️ Cambios detectados',
          description: changesList.join(', '),
          duration: 5000,
        })
      }

      previousOrderRef.current = order
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [order, detectChanges, debounceMs, onChangeDetected, toast])

  return null
}
