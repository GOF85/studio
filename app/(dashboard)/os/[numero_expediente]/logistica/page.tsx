'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { DevolucionesWizard } from '@/components/os/logistics/devoluciones-wizard'
import { OSDashboardSummary } from '@/components/os/logistics/os-dashboard-summary'
import { LogisticsLogs } from '@/components/os/logistics/logistics-logs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList, LayoutDashboard, Lock, Unlock, Loader2, ArrowLeft, Package } from 'lucide-react'
import { useOSEstadoCierre, useLogisticaLogs } from '@/hooks/use-os-logistics'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import type { OSEstadoCierre } from '@/types'

export default function LogisticaPage() {
  const params = useParams() ?? {}
  const osId = (params.numero_expediente as string) || ''
  const { toast } = useToast()
  const router = useRouter()

  const { loadEstadoCierre, updateEstadoCierre } = useOSEstadoCierre()
  const { saveLog } = useLogisticaLogs()

  const [estado, setEstado] = useState<OSEstadoCierre | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const fetchEstado = async () => {
      const data = await loadEstadoCierre(osId)
      setEstado(data)
      setIsLoading(false)
    }
    if (osId) fetchEstado()
  }, [osId, loadEstadoCierre])

  const handleToggleCierre = async () => {
    setIsProcessing(true)
    try {
      const nuevoEstado: OSEstadoCierre = {
        os_id: osId,
        cerrada: !estado?.cerrada,
        fecha_cierre: !estado?.cerrada ? new Date().toISOString() : undefined,
        usuario_cierre:
          (await (await import('@/lib/supabase')).supabase.auth.getUser()).data.user?.id ||
          undefined,
      }

      await updateEstadoCierre(nuevoEstado)
      setEstado(nuevoEstado)

      await saveLog(osId, nuevoEstado.cerrada ? 'CIERRE_OS' : 'REAPERTURA_OS', {
        motivo: nuevoEstado.cerrada ? 'Cierre manual' : 'Reapertura manual',
      })

      toast({
        title: nuevoEstado.cerrada ? 'OS Cerrada' : 'OS Reabierta',
        description: nuevoEstado.cerrada
          ? 'Ya no se pueden registrar más devoluciones o mermas.'
          : 'Se ha habilitado de nuevo el registro de logística.',
      })
    } catch (error) {
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <main className="space-y-6">
      {/* Header Premium Sticky */}
      <div className="sticky top-12 z-30 bg-background/60 backdrop-blur-md border-b border-border/40 mb-6">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <div className="flex items-center">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Package className="h-5 w-5 text-blue-500" />
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button
              variant={estado?.cerrada ? 'outline' : 'destructive'}
              size="sm"
              onClick={handleToggleCierre}
              disabled={isProcessing}
              className="h-8 text-[10px] font-black uppercase tracking-widest border-border/40"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : estado?.cerrada ? (
                <Unlock className="mr-2 h-3.5 w-3.5" />
              ) : (
                <Lock className="mr-2 h-3.5 w-3.5" />
              )}
              {estado?.cerrada ? 'Reabrir Logística' : 'Cerrar Logística'}
            </Button>
          </div>
        </div>
      </div>

      {estado?.cerrada && (
        <Card className="bg-amber-500/10 backdrop-blur-md border-amber-500/20 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <CardContent className="py-4 px-6">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <Lock className="h-5 w-5" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest">Módulo Bloqueado</p>
                <p className="text-[10px] font-medium opacity-80">
                  Esta Orden de Servicio está CERRADA para logística. No se permiten nuevos registros.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <OSDashboardSummary osId={osId} />

      <Tabs defaultValue="wizard" className="w-full">
        <TabsList className="bg-background/50 backdrop-blur-md border border-border/40 p-1 h-12 gap-1">
          <TabsTrigger 
            value="wizard"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-[10px] font-black uppercase tracking-widest h-full px-6 transition-all"
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Asistente de Retorno
          </TabsTrigger>
          <TabsTrigger 
            value="history"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-[10px] font-black uppercase tracking-widest h-full px-6 transition-all"
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Historial y Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wizard" className="mt-6 focus-visible:outline-none">
          <div className={estado?.cerrada ? 'opacity-50 pointer-events-none grayscale' : ''}>
            <DevolucionesWizard osId={osId} />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6 focus-visible:outline-none">
          <LogisticsLogs osId={osId} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
