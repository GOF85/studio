'use client'

import { useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Utensils } from 'lucide-react'
import type {
  ServiceOrder,
  ComercialBriefing,
  ComercialBriefingItem,
  GastronomyOrderItem,
  GastronomyOrderStatus,
  GastronomyOrder,
} from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import { cn } from '@/lib/utils'
import { MobileTableView, type MobileTableColumn } from '@/components/ui/mobile-table-view'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { useComercialBriefing, useGastronomyOrders } from '@/hooks/use-briefing-data'
import { useEvento } from '@/hooks/use-data-queries'

const statusVariant: {
  [key in GastronomyOrderStatus]: 'default' | 'secondary' | 'outline' | 'destructive'
} = {
  Pendiente: 'secondary',
  'En preparación': 'outline',
  Listo: 'default',
  Incidencia: 'destructive',
}

type EnrichedBriefingItem = ComercialBriefingItem & {
  gastro_status?: GastronomyOrderStatus
}

export default function GastronomiaPage() {
  const router = useRouter()
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const { toast } = useToast()

  const { data: serviceOrder } = useEvento(osId)

  const { data: briefing, isLoading: isLoadingBriefing } = useComercialBriefing(
    serviceOrder?.id || osId,
  )
  const { data: gastronomyOrders, isLoading: isLoadingOrders } = useGastronomyOrders(
    serviceOrder?.id || osId,
  )

  const briefingItems = useMemo(() => {
    if (!briefing?.items) return []

    const safeGastronomyOrders = gastronomyOrders || []
    return briefing.items
      .filter((item) => item.conGastronomia)
      .map((item) => {
        const order = safeGastronomyOrders.find((o) => o.id === item.id)
        return {
          ...item,
          gastro_status: (order?.status || 'Pendiente') as GastronomyOrderStatus,
        }
      })
  }, [briefing, gastronomyOrders])

  const isLoading = isLoadingBriefing || isLoadingOrders

  const sortedBriefingItems = useMemo(() => {
    return [...briefingItems].sort((a, b) => {
      const dateA = new Date(a.fecha)
      const dateB = new Date(b.fecha)
      const dateComparison = dateA.getTime() - dateB.getTime()
      if (dateComparison !== 0) return dateComparison
      return a.horaInicio.localeCompare(b.horaInicio)
    })
  }, [briefingItems])

  // Hook para infinite scroll (sin paginación, mostrar todos)
  const sentinelRef = useInfiniteScroll({
    fetchNextPage: () => {},
    hasNextPage: false,
    isFetchingNextPage: false,
    enabled: false,
  })

  // Definir columnas para la vista móvil
  const mobileColumns: MobileTableColumn<EnrichedBriefingItem>[] = [
    { key: 'descripcion', label: 'Descripción', isTitle: true },
    { key: 'fecha', label: 'Fecha', format: (value) => format(new Date(value), 'dd/MM/yyyy') },
    { key: 'horaInicio', label: 'Hora' },
    { key: 'asistentes', label: 'Asistentes' },
    { key: 'comentarios', label: 'Comentarios' },
    {
      key: 'gastro_status',
      label: 'Estado',
      format: (value) => (
        <Badge variant={statusVariant[(value as GastronomyOrderStatus) || 'Pendiente']}>
          {value || 'Pendiente'}
        </Badge>
      ),
    },
  ]

  if (isLoading) {
    return <LoadingSkeleton title="Cargando Módulo de Gastronomía..." />
  }

  return (
    <div className="space-y-6">
      {/* Header Premium Sticky */}
      <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <div className="flex items-center">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <Utensils className="h-5 w-5 text-orange-500" />
            </div>
          </div>

          <div className="flex-1" />
        </div>
      </div>

      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
        <CardHeader className="py-4 border-b border-border/40 bg-muted/10">
          <CardTitle className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Pedidos Generados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Vista Móvil: Tarjetas Apiladas */}
          <div className="md:hidden p-4 space-y-4">
            <MobileTableView
              data={sortedBriefingItems}
              columns={mobileColumns}
              renderActions={(item) => (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/os/${osId}/gastronomia/${item.id}`)}
                  className="w-full h-8 text-[10px] font-bold uppercase tracking-wider border-border/40"
                >
                  Ver Detalles
                </Button>
              )}
              sentinelRef={sentinelRef}
              isLoading={false}
              emptyMessage="No hay pedidos de gastronomía."
            />
          </div>

          {/* Vista Escritorio: Tabla Tradicional */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 border-b border-border/40">
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-widest">Fecha</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-widest">Hora</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-widest">Descripción</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-widest">PAX</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-widest">Comentarios</TableHead>
                  <TableHead className="h-10 px-4 text-right text-[10px] font-black uppercase tracking-widest">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBriefingItems.length > 0 ? (
                  sortedBriefingItems.map((item) => (
                    <TableRow
                      key={item.id}
                      onClick={() => router.push(`/os/${osId}/gastronomia/${item.id}`)}
                      className={cn(
                        'cursor-pointer hover:bg-muted/30 transition-colors border-b border-border/40',
                        item.descripcion.toLowerCase() === 'prueba de menu' &&
                          'bg-orange-500/5 hover:bg-orange-500/10',
                      )}
                    >
                      <TableCell className="py-2 px-4 text-[11px] font-medium text-muted-foreground">
                        {format(new Date(item.fecha), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="py-2 px-4 text-[11px] font-bold">
                        {item.horaInicio}
                      </TableCell>
                      <TableCell className="py-2 px-4 min-w-[200px] text-[11px] font-bold uppercase tracking-wider">
                        {item.descripcion}
                      </TableCell>
                      <TableCell className="py-2 px-4 text-[11px] font-mono">
                        {item.asistentes}
                      </TableCell>
                      <TableCell className="py-2 px-4 min-w-[200px] text-[11px] text-muted-foreground italic">
                        {item.comentarios || '-'}
                      </TableCell>
                      <TableCell className="py-2 px-4 text-right">
                        <Badge 
                          variant={statusVariant[item.gastro_status || 'Pendiente']}
                          className="text-[9px] font-black uppercase tracking-widest px-2 py-0 h-5"
                        >
                          {item.gastro_status || 'Pendiente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-[11px] text-muted-foreground">
                      No hay pedidos de gastronomía. Activa la opción "Con gastronomía" en los hitos
                      del briefing comercial.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
