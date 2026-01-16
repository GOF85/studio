'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import { useEvento } from '@/hooks/use-data-queries'

// This page just redirects to the first sub-page of the OS module.
export default function OsPage() {
  const router = useRouter()
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''

  useEffect(() => {
    if (osId) {
      // Redirect to control-panel (new dashboard)
      router.replace(`/os/${osId}/control-panel?tab=espacio`)
    }
  }, [osId, router])

  return <LoadingSkeleton title="Cargando Panel de Control..." />
}
