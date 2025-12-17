'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, RefreshCw, BarChart3 } from 'lucide-react';
import { useCostosRecetasDashboard } from '@/hooks/use-costos-recetas-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CostosRecetasDashboardProps {
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

export function CostosRecetasDashboard({
  autoRefresh = true,
  refreshIntervalMs = 30000,
}: CostosRecetasDashboardProps) {
  const {
    recetas,
    alertas,
    isLoading,
    error,
    totalAlertas,
    alertasCriticas,
    margenPromedio,
    costoPromedio,
    refetch,
  } = useCostosRecetasDashboard(autoRefresh ? refreshIntervalMs : 0);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="space-y-6 pb-20">
      {/* Header + Botón Refresh */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 shadow-sm">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold tracking-tight text-foreground leading-none">
                  Dashboard de Costos
                </h1>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-1">
                  Cocina - Monitoreo en Tiempo Real
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              {isLoading ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {error && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <p className="text-red-700 text-sm">❌ Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Alertas Críticas */}
          <Card className={cn(
            'border-2 transition-all',
            alertasCriticas > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className={cn(
                  'h-4 w-4',
                  alertasCriticas > 0 ? 'text-red-600' : 'text-green-600'
                )} />
                Alertas Críticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn(
                'text-3xl font-bold tracking-tight',
                alertasCriticas > 0 ? 'text-red-700' : 'text-green-700'
              )}>
                {alertasCriticas}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                de {totalAlertas} cambios detectados
              </p>
            </CardContent>
          </Card>

          {/* Margen Promedio */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Margen Promedio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn(
                'text-3xl font-bold tracking-tight',
                margenPromedio >= 40 ? 'text-emerald-600' : margenPromedio >= 30 ? 'text-yellow-600' : 'text-red-600'
              )}>
                {margenPromedio.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {margenPromedio >= 40 ? '✓ Saludable' : margenPromedio >= 30 ? '⚠ Aceptable' : '⚠ Revisar'}
              </p>
            </CardContent>
          </Card>

          {/* Coste Promedio */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Coste Promedio MP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tracking-tight text-blue-600">
                €{costoPromedio.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Por receta
              </p>
            </CardContent>
          </Card>

          {/* Total Recetas */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Recetas Monitoreadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tracking-tight text-indigo-600">
                {recetas.length}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Con histórico disponible
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sección de Alertas */}
        {alertas.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Cambios Detectados en Últimos 7 Días
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {alertas.map((alerta) => (
                  <div
                    key={`${alerta.recetaId}-${alerta.timestamp}`}
                    className={cn(
                      'p-3 rounded-lg border-l-4 transition-all',
                      alerta.severidad === 'critico'
                        ? 'bg-red-100 border-red-500 text-red-900'
                        : alerta.severidad === 'alto'
                        ? 'bg-orange-100 border-orange-500 text-orange-900'
                        : 'bg-yellow-100 border-yellow-500 text-yellow-900'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{alerta.recetaNombre}</p>
                        <p className="text-xs opacity-85 mt-1">
                          <span className="font-mono">{alerta.costePrevio.toFixed(2)}€</span>
                          {' '}→{' '}
                          <span className="font-mono font-bold">{alerta.costeActual.toFixed(2)}€</span>
                        </p>
                        <p className={cn(
                          'text-xs font-bold mt-1',
                          alerta.cambioAbsoluto > 0 ? 'text-red-700' : 'text-green-700'
                        )}>
                          {alerta.cambioAbsoluto > 0 ? '📈 +' : '📉 '}{alerta.cambioAbsoluto.toFixed(2)}€
                          {' '}({alerta.cambioPercentaje.toFixed(1)}%)
                        </p>
                        <p className="text-xs opacity-70 mt-1">
                          💰 Margen: {alerta.margenActual.toFixed(1)}%
                        </p>
                      </div>
                      <Badge
                        variant={alerta.severidad === 'critico' ? 'destructive' : 'secondary'}
                        className="ml-2 whitespace-nowrap"
                      >
                        {alerta.severidad === 'critico'
                          ? '🚨 CRÍTICO'
                          : alerta.severidad === 'alto'
                          ? '⚠️ ALTO'
                          : '⚡ MEDIO'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabla de Recetas */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b bg-muted/5">
            <CardTitle className="text-base">Estado de Recetas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">Receta</th>
                    <th className="text-right py-3 px-4 font-semibold">Precio Venta</th>
                    <th className="text-right py-3 px-4 font-semibold">Coste MP</th>
                    <th className="text-right py-3 px-4 font-semibold">Margen</th>
                    <th className="text-center py-3 px-4 font-semibold whitespace-nowrap">7 días</th>
                    <th className="text-center py-3 px-4 font-semibold whitespace-nowrap">30 días</th>
                    <th className="text-center py-3 px-4 font-semibold">Tendencia</th>
                  </tr>
                </thead>
                <tbody>
                  {recetas.length > 0 ? (
                    recetas.map((receta) => (
                      <tr key={receta.recetaId} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 font-medium">{receta.nombre}</td>
                        <td className="text-right py-3 px-4 font-mono">€{receta.precioVenta.toFixed(2)}</td>
                        <td className="text-right py-3 px-4 font-mono">€{receta.costemateriaprima.toFixed(2)}</td>
                        <td className={cn(
                          'text-right py-3 px-4 font-semibold',
                          receta.margenBruto >= 40 ? 'text-emerald-600' : 'text-orange-600'
                        )}>
                          {receta.margenBruto.toFixed(1)}%
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={cn(
                            'font-mono font-semibold',
                            receta.cambio7dias > 0 ? 'text-red-600' : 'text-emerald-600'
                          )}>
                            {receta.cambio7dias > 0 ? '+' : ''}{receta.cambio7dias.toFixed(2)}€
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={cn(
                            'font-mono font-semibold',
                            receta.cambio30dias > 0 ? 'text-red-600' : 'text-emerald-600'
                          )}>
                            {receta.cambio30dias > 0 ? '+' : ''}{receta.cambio30dias.toFixed(2)}€
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          {receta.tendencia === 'subida' ? (
                            <TrendingUp className="h-4 w-4 text-red-500 inline" />
                          ) : receta.tendencia === 'bajada' ? (
                            <TrendingDown className="h-4 w-4 text-emerald-500 inline" />
                          ) : (
                            <span className="text-muted-foreground text-lg">→</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 px-4 text-center text-muted-foreground">
                        {isLoading ? 'Cargando datos...' : 'No hay recetas disponibles'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
