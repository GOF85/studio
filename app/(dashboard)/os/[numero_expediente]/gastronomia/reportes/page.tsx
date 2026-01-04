'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import { useEvento } from '@/hooks/use-data-queries'
import { useGastronomyOrders } from '@/hooks/use-briefing-data'
import { useComercialBriefing } from '@/hooks/use-briefing-data'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function GastronomiaRentabilidadPage() {
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''

  const { data: serviceOrder, isLoading: isLoadingOrder } = useEvento(osId)
  const { data: gastronomyOrders = [], isLoading: isLoadingGastro } = useGastronomyOrders(
    serviceOrder?.id || osId,
  )
  const { data: briefing, isLoading: isLoadingBriefing } = useComercialBriefing(
    serviceOrder?.id || osId,
  )

  const isLoading = isLoadingOrder || isLoadingGastro || isLoadingBriefing

  // Calculate profitability metrics
  const metrics = useMemo(() => {
    const regular = {
      totalCost: 0,
      totalRevenue: 0,
      totalPax: 0,
      itemCount: 0,
      costPerPax: 0,
    }
    const alergenos = {
      totalCost: 0,
      totalRevenue: 0,
      totalPax: 0,
      itemCount: 0,
      costPerPax: 0,
    }

    gastronomyOrders.forEach((order) => {
      // Regular items
      order.items?.forEach((item) => {
        if (item.type === 'item') {
          regular.totalCost += item.costeMateriaPrima || 0
          regular.totalRevenue += (item.precioVenta || 0) * (item.quantity || 0)
          regular.itemCount++
        }
      })

      // Allergen items
      order.itemsAlergenos?.forEach((item) => {
        if (item.type === 'item') {
          alergenos.totalCost += item.costeMateriaPrima || 0
          alergenos.totalRevenue += (item.precioVenta || 0) * (item.quantity || 0)
          alergenos.itemCount++
        }
      })

      // PAX counts
      briefing?.items?.forEach((bItem) => {
        const gastroItem = gastronomyOrders.find((o) => o.id === bItem.id)
        if (gastroItem) {
          regular.totalPax += bItem.asistentes || 0
          alergenos.totalPax += order.asistentesAlergenos || 0
        }
      })
    })

    regular.costPerPax = regular.totalPax > 0 ? regular.totalCost / regular.totalPax : 0
    alergenos.costPerPax = alergenos.totalPax > 0 ? alergenos.totalCost / alergenos.totalPax : 0

    const regularMargin = regular.totalRevenue > 0 
      ? ((regular.totalRevenue - regular.totalCost) / regular.totalRevenue) * 100 
      : 0
    const allergenoMargin = alergenos.totalRevenue > 0 
      ? ((alergenos.totalRevenue - alergenos.totalCost) / alergenos.totalRevenue) * 100 
      : 0

    return { regular, alergenos, regularMargin, allergenoMargin }
  }, [gastronomyOrders, briefing])

  const chartData = useMemo(() => {
    return [
      {
        name: 'Menú Regular',
        revenue: metrics.regular.totalRevenue,
        cost: metrics.regular.totalCost,
        margin: metrics.regular.totalRevenue - metrics.regular.totalCost,
      },
      {
        name: 'Menú Alérgeno',
        revenue: metrics.alergenos.totalRevenue,
        cost: metrics.alergenos.totalCost,
        margin: metrics.alergenos.totalRevenue - metrics.alergenos.totalCost,
      },
    ]
  }, [metrics])

  if (isLoading) {
    return <LoadingSkeleton title="Cargando reportes de rentabilidad..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-4 -mx-4 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-black tracking-tight">Rentabilidad: Regular vs Alérgenos</h1>
          <p className="text-sm text-muted-foreground">Análisis comparativo de márgenes y costos por línea de menú</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Regular Summary */}
        <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Menú Regular</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Ingresos</span>
              <span className="text-lg font-bold text-emerald-600">
                {metrics.regular.totalRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Costos</span>
              <span className="text-lg font-bold text-red-500">
                {metrics.regular.totalCost.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/40">
              <span className="text-xs font-bold text-muted-foreground">Margen</span>
              <span className={cn('text-lg font-black', metrics.regularMargin > 0 ? 'text-emerald-600' : 'text-red-500')}>
                {metrics.regularMargin.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Allergen Summary */}
        <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Menú Alérgeno 🔴</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Ingresos</span>
              <span className="text-lg font-bold text-red-600">
                {metrics.alergenos.totalRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Costos</span>
              <span className="text-lg font-bold text-red-500">
                {metrics.alergenos.totalCost.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/40">
              <span className="text-xs font-bold text-muted-foreground">Margen</span>
              <span className={cn('text-lg font-black', metrics.allergenoMargin > 0 ? 'text-emerald-600' : 'text-red-500')}>
                {metrics.allergenoMargin.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Cost Per PAX */}
        <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Costo / PAX</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Regular</span>
              <span className="text-lg font-bold">
                {metrics.regular.costPerPax.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Alérgeno</span>
              <span className="text-lg font-bold text-red-600">
                {metrics.alergenos.costPerPax.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/40">
              <span className="text-xs font-bold text-muted-foreground">Diferencia</span>
              <span className={cn('text-lg font-black', 
                metrics.alergenos.costPerPax > metrics.regular.costPerPax ? 'text-red-500' : 'text-emerald-600'
              )}>
                {(metrics.alergenos.costPerPax - metrics.regular.costPerPax).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Item Count */}
        <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ítems</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Menú Regular</span>
              <Badge variant="secondary">{metrics.regular.itemCount}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Menú Alérgeno</span>
              <Badge variant="destructive">{metrics.alergenos.itemCount}</Badge>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/40">
              <span className="text-xs font-bold text-muted-foreground">Total</span>
              <Badge>{metrics.regular.itemCount + metrics.alergenos.itemCount}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Cost */}
        <Card className="bg-background/60 backdrop-blur-md border-border/40">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Ingresos vs Costos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip 
                  formatter={(value) => (value as number).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Ingresos" />
                <Bar dataKey="cost" fill="#ef4444" name="Costos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Margin Comparison */}
        <Card className="bg-background/60 backdrop-blur-md border-border/40">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Margen de Ganancia (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  { name: 'Menú Regular', margin: metrics.regularMargin },
                  { name: 'Menú Alérgeno', margin: metrics.allergenoMargin },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip 
                  formatter={(value) => `${(value as number).toFixed(2)}%`}
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="margin" fill="#f59e0b" name="Margen (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card className="bg-background/60 backdrop-blur-md border-border/40">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-widest">Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
            <TrendingUp className={cn('h-5 w-5 flex-shrink-0 mt-0.5', 
              metrics.regularMargin > metrics.allergenoMargin ? 'text-emerald-500' : 'text-amber-500'
            )} />
            <div className="text-sm">
              <p className="font-bold">
                {metrics.regularMargin > metrics.allergenoMargin 
                  ? 'Menú Regular más rentable'
                  : 'Menú Alérgeno más rentable'}
              </p>
              <p className="text-xs text-muted-foreground">
                Diferencia de margen: {Math.abs(metrics.regularMargin - metrics.allergenoMargin).toFixed(1)}%
              </p>
            </div>
          </div>

          {metrics.alergenos.totalPax > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-lg flex-shrink-0">🔴</span>
              <div className="text-sm">
                <p className="font-bold">Demanda de alérgenos</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.alergenos.totalPax} personas solicitaron menú especial ({((metrics.alergenos.totalPax / (metrics.regular.totalPax + metrics.alergenos.totalPax)) * 100).toFixed(1)}%)
                </p>
              </div>
            </div>
          )}

          {metrics.regular.totalCost > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
              <TrendingDown className="h-5 w-5 flex-shrink-0 mt-0.5 text-blue-500" />
              <div className="text-sm">
                <p className="font-bold">Costo por persona</p>
                <p className="text-xs text-muted-foreground">
                  Regular: {metrics.regular.costPerPax.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} vs Alérgeno: {metrics.alergenos.costPerPax.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
