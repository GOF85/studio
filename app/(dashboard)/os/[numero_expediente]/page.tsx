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
  const { data: serviceOrder, isLoading } = useEvento(osId)

  useEffect(() => {
    if (!isLoading && osId) {
      const serviceNumber = serviceOrder?.serviceNumber
      router.replace(`/os/${serviceNumber || osId}/info`)
    }
  }, [osId, router, serviceOrder, isLoading])

  return <LoadingSkeleton title="Cargando Orden de Servicio..." />
}
