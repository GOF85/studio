'use client'

import { useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Users, Calendar, Clock, Utensils } from 'lucide-react'
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
import { useObjetivosGasto, useObjetivosGastoPlantillas } from '@/hooks/use-objetivos-gasto'
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

  // Definir columnas para la vista móvil (optimizada)
  const mobileColumns: MobileTableColumn<EnrichedBriefingItem>[] = [
    {
      key: 'descripcion',
      label: 'Descripción',
      isTitle: true,
      format: (value, row) => (
        <div className="flex items-center justify-between">
          <span className="truncate">{value}</span>
          <div className="flex items-center gap-2 text-[12px] font-bold text-muted-foreground">
            <Users className="h-4 w-4 text-amber-500" />
            <span>{row.asistentes}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'dateTime',
      label: '',
      format: (_v, row) => (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(row.fecha), 'dd/MM/yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="font-bold">{row.horaInicio}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'comentarios',
      label: '',
      format: (_v, row) => row.comentarios || '-',
    },
  ]

  // CTA / objetivos: presupuesto de gastronomía y objetivo
  const { data: objetivos } = useObjetivosGasto(serviceOrder?.id)
  const { data: plantillas } = useObjetivosGastoPlantillas()

  const presupuesto = useMemo(() => {
    const safeOrders = gastronomyOrders || []
    return safeOrders.reduce((acc, o: any) => acc + (o.total || 0), 0)
  }, [gastronomyOrders])

  const objetivoValue = useMemo(() => {
    const objetivoTemplate = objetivos || plantillas?.find((p: any) => p.nombre?.toLowerCase() === 'micecatering')
    const objetivoPct = (objetivoTemplate?.gastronomia || 0) / 100
    const facturacionNeta = (serviceOrder?.facturacion as number) || 0
    return facturacionNeta * objetivoPct
  }, [objetivos, plantillas, serviceOrder])

  const desviacionPct = useMemo(() => {
    if (!objetivoValue || objetivoValue === 0) return 0
    return ((presupuesto - objetivoValue) / objetivoValue) * 100
  }, [presupuesto, objetivoValue])

  if (isLoading) {
    return <LoadingSkeleton title="Cargando Módulo de Gastronomía..." />
  }

  return (
    <div className="space-y-2">
      {/* Header Premium Sticky */}
      <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-2">
        <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center h-12">
            <Utensils className="h-6 w-6 text-emerald-800" aria-hidden="true" />
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex flex-col items-end justify-center leading-none">
              <div className="text-[9px] font-black uppercase text-muted-foreground">Presupuesto</div>
              <div className="font-bold text-sm">{presupuesto.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
            </div>

            <div className="flex flex-col items-end justify-center leading-none">
              <div className="text-[9px] font-black uppercase text-muted-foreground">Objetivo</div>
              <div className="font-bold text-sm">{objetivoValue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
            </div>

            <div className="flex flex-col items-end justify-center leading-none">
              <div className="text-[9px] font-black uppercase text-muted-foreground">Desviación</div>
              <div className={cn('font-bold text-sm', desviacionPct > 0 ? 'text-red-500' : 'text-emerald-600')}>
                {isFinite(desviacionPct) ? `${desviacionPct.toFixed(2)}%` : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
        <CardHeader className="py-2 px-3 border-b border-border/40 bg-muted/10">
          <CardTitle className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Pedidos Gastronomía
          </CardTitle>
        </CardHeader>
        <CardContent className="p-1">
          {/* Vista Móvil: Tarjetas Apiladas */}
          <div className="md:hidden p-1 space-y-1">
            <MobileTableView
              data={sortedBriefingItems}
              columns={mobileColumns}
              compact
              cardClassName="p-1 gap-1"
              className="space-y-1"
              onCardClick={(item) => router.push(`/os/${osId}/gastronomia/${item.id}`)}
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
                  <TableHead className="h-8 px-2 text-[10px] font-black uppercase tracking-widest">Fecha</TableHead>
                  <TableHead className="h-8 px-2 text-[10px] font-black uppercase tracking-widest">Hora</TableHead>
                  <TableHead className="h-8 px-2 text-[10px] font-black uppercase tracking-widest">Descripción</TableHead>
                  <TableHead className="h-8 px-2 text-[10px] font-black uppercase tracking-widest">PAX</TableHead>
                  <TableHead className="h-8 px-2 text-[10px] font-black uppercase tracking-widest">Comentarios</TableHead>
                  <TableHead className="h-8 px-2 text-right text-[10px] font-black uppercase tracking-widest">Estado</TableHead>
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
                        item.descripcion?.toLowerCase?.() === 'prueba de menu' &&
                          'bg-orange-500/5 hover:bg-orange-500/10',
                      )}
                    >
                      <TableCell className="py-1 px-2 text-[11px] font-medium text-muted-foreground">
                        {format(new Date(item.fecha), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="py-1 px-2 text-[11px] font-bold">
                        {item.horaInicio}
                      </TableCell>
                      <TableCell className="py-1 px-2 min-w-[200px] text-[11px] font-bold uppercase tracking-wider">
                        {item.descripcion}
                      </TableCell>
                      <TableCell className="py-1 px-2 text-[11px] font-mono">
                        {item.asistentes}
                      </TableCell>
                      <TableCell className="py-1 px-2 min-w-[200px] text-[11px] text-muted-foreground italic">
                        {item.comentarios || '-'}
                      </TableCell>
                      <TableCell className="py-1 px-2 text-right">
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
                    <TableCell colSpan={6} className="h-20 text-center text-[11px] text-muted-foreground">
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
