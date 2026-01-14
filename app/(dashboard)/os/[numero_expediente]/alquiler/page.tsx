'use client'

import { useState, useMemo, useCallback, memo, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { PlusCircle, Eye, Trash2, FileText, Archive, AlertTriangle, Plus, Calendar, MapPin, Package } from 'lucide-react'
import {
  NewPedidoModal,
  ChangeContextModal,
  PDFGenerationModal,
  SentOrderDetailsModal,
  EditItemsModal,
  AgregarReferenciasModal,
  EnviarPedidosModal,
} from '@/components/pedidos/modals'
import { SubPedidoCard } from '@/components/pedidos/sub-pedido-card'
import {
  useCreatePedidoPendiente,
  useDeletePedidoPendiente,
  useChangePedidoContext,
  useUpdatePedidoPendiente,
  usePedidosPendientes,
  useProveedoresAlquiler,
  useAgregarItemsAPedido,
  useUpdatePedidoContexto,
  useBuscarArticulosProveedor,
} from '@/hooks/use-pedidos-pendientes'
import { useUpdateSubpedidoComplete } from '@/hooks/use-update-subpedido-complete'
import { useGeneratePDFMulti, usePedidosEnviados } from '@/hooks/use-pedidos-enviados'
import { useDeletePedidoEnviado } from '@/hooks/use-delete-pedido-enviado'
import { PedidoPendiente, PedidoEnviado } from '@/types'
import { useAuth } from '@/providers/auth-provider'
import type { OrderItem, PickingSheet, ComercialBriefingItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSkeleton } from '@/components/layout/loading-skeleton'
import { BriefingSummaryTrigger } from '@/components/os/briefing-summary-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  useMaterialOrders,
  usePickingSheets,
  useReturnSheets,
  useEvento,
} from '@/hooks/use-data-queries'
import { useComercialBriefing, useComercialAjustes } from '@/hooks/use-briefing-data'
import {
  useUpdateMaterialOrderItem,
  useDeleteMaterialOrderItem,
} from '@/hooks/mutations/use-material-mutations'
import { useObjetivosGasto, useObjetivosGastoPlantillas } from '@/hooks/use-objetivos-gasto'
import { getThumbnail } from '@/lib/image-utils'
import { useArticulos } from '@/hooks/use-data-queries'

interface ModalState {
  newPedido: boolean
  changeContext: boolean
  generatePDF: boolean
  viewDetails: boolean
  editItems: boolean
  agregarReferencias: boolean
  enviarPedidos: boolean
}

interface SelectedData {
  contextPedido: PedidoPendiente | null
  detailsPedido: PedidoEnviado | null
  selectedForPDF: string[]
  editItemsPedido: PedidoPendiente | null
}

type ItemWithOrderInfo = OrderItem & {
  orderContract: string
  orderId: string
  orderStatus?: PickingSheet['status']
  solicita?: 'Sala' | 'Cocina'
  tipo?: string
  deliveryDate?: string
  deliveryLocation?: string
  ajustes?: { tipo: string; cantidad: number; fecha: string; comentario: string }[]
  imageUrl?: string
  imagenes?: any
  subcategoria?: string
}

type BlockedOrderInfo = {
  sheetId: string
  status: PickingSheet['status']
  items: OrderItem[]
}

type StatusColumn = 'Asignado' | 'En Preparación' | 'Listo'

const statusMap: Record<PickingSheet['status'], StatusColumn> = {
  Pendiente: 'En Preparación',
  'En Proceso': 'En Preparación',
  Listo: 'Listo',
}

const AlquilerHeaderMetrics = memo(({ totalPlanned, facturacion = 0, osId }: { totalPlanned: number; facturacion: number; osId: string }) => {
  // Objetivos de Gasto
  const { data: objetivos } = useObjetivosGasto(osId)
  const { data: plantillas } = useObjetivosGastoPlantillas()

  const { objetivoValue, objetivoPctLabel } = useMemo(() => {
    const objetivoTemplate = objetivos || plantillas?.find((p: any) => {
      const name = p.nombre?.toLowerCase() || p.name?.toLowerCase() || ''
      return name === 'micecatering' || name === 'mice catering' || name === 'general'
    })
    
    const pct = objetivoTemplate?.alquiler || 0
    const objetivoPct = (Number(pct) || 0) / 100
    
    return { 
      objetivoValue: facturacion * objetivoPct, 
      objetivoPctLabel: `${Number(pct).toFixed(1)}%` 
    }
  }, [objetivos, plantillas, facturacion])

  const desviacionPct = useMemo(() => {
    if (!objetivoValue || objetivoValue === 0) return 0
    return ((totalPlanned - objetivoValue) / objetivoValue) * 100
  }, [totalPlanned, objetivoValue])

  const planificadoPctFacturacion = useMemo(() => {
    if (!facturacion || facturacion === 0) return '0%'
    return `${((totalPlanned / facturacion) * 100).toFixed(1)}%`
  }, [totalPlanned, facturacion])

  return (
    <div className="flex items-center gap-1.5">
      {/* Presupuesto Actual */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 px-2.5 py-0.5 border rounded-lg transition-all cursor-help shrink-0 ${
            totalPlanned < objetivoValue
              ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200/50'
              : 'bg-red-50/50 dark:bg-red-500/5 border-red-200/50'
          }`}>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${
              totalPlanned < objetivoValue
                ? 'text-emerald-600/70'
                : 'text-red-600/70'
            }`}>Planificado</span>
            <div className="flex items-baseline gap-0">
              <span className={`font-black text-xs md:text-sm tabular-nums ${
                totalPlanned < objetivoValue
                  ? 'text-emerald-700'
                  : 'text-red-700'
              }`}>
                {formatCurrency(totalPlanned).split(',')[0]}
              </span>
              <span className={`text-[8px] font-bold ${
                totalPlanned < objetivoValue
                  ? 'text-emerald-600/60'
                  : 'text-red-600/60'
              }`}>
                ,{formatCurrency(totalPlanned).split(',')[1]}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-bold">
          {planificadoPctFacturacion} de facturación
        </TooltipContent>
      </Tooltip>

      {/* Objetivo de Gasto */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-2.5 py-0.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 rounded-lg transition-all cursor-help shrink-0">
            <span className="text-[9px] font-bold uppercase text-muted-foreground/70 tracking-wider">Objetivo</span>
            <div className="flex items-baseline gap-0">
              <span className="font-black text-xs md:text-sm text-zinc-700 dark:text-zinc-300 tabular-nums">
                {formatCurrency(objetivoValue).split(',')[0]}
              </span>
              <span className="text-[8px] font-bold text-zinc-500/60 text-zinc-400">
                ,{formatCurrency(objetivoValue).split(',')[1]}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-bold flex flex-col gap-1">
          <span>{objetivoPctLabel} de facturación (Objetivo)</span>
        </TooltipContent>
      </Tooltip>

      {/* Desviación */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-2 px-2.5 py-0.5 border rounded-lg transition-all cursor-help shrink-0",
            desviacionPct > 1 
              ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30" 
              : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30"
          )}>
            <div className="flex flex-col">
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                desviacionPct > 1 ? "text-red-600/70" : "text-emerald-600/70"
              )}>Desviación</span>
            </div>
            <div className="flex items-center gap-1.5">
              {desviacionPct > 1 && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
              <span className={cn(
                "font-black text-sm md:text-base tabular-nums",
                desviacionPct > 1 ? "text-red-700" : "text-emerald-700"
              )}>
                {desviacionPct > 0 ? '+' : ''}{desviacionPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-bold">
          {desviacionPct > 0 ? 'Sobre el presupuesto objetivo' : 'Bajo el presupuesto objetivo'}
          <div className="text-[10px] text-muted-foreground mt-1 font-mono">
            Diferencia: {formatCurrency(totalPlanned - objetivoValue)}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  )
})

AlquilerHeaderMetrics.displayName = 'AlquilerHeaderMetrics'

function BriefingSummaryDialog({ items }: { items: ComercialBriefingItem[] }) {
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const dateComparison = a.fecha.localeCompare(b.fecha)
      if (dateComparison !== 0) return dateComparison
      return a.horaInicio.localeCompare(b.horaInicio)
    })
  }, [items])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/10 hover:text-blue-600"
        >
          <FileText className="mr-2 h-3.5 w-3.5" />
          Resumen Briefing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-md border-border/40">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-black uppercase tracking-widest">Resumen de Servicios del Briefing</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto rounded-md border border-border/40 mt-4">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Fecha</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Hora</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Descripción</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Observaciones</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">Asistentes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.length > 0 ? (
                sortedItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "border-border/40 group transition-colors",
                      item.conGastronomia ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-muted/20'
                    )}
                  >
                    <TableCell className="px-4 py-2 text-[11px] font-bold">
                      {format(new Date(item.fecha), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-[11px] font-mono text-muted-foreground">
                      {item.horaInicio} - {item.horaFin}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-[11px] font-medium uppercase tracking-tight">
                      {item.descripcion}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-[11px] text-muted-foreground italic">
                      {item.comentarios || '---'}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-right text-[11px] font-black">
                      {item.asistentes}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-[11px] text-muted-foreground italic">
                    No hay servicios en el briefing.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatusCard({
  title,
  items,
  totalQuantity,
  totalValue,
  onClick,
}: {
  title: string
  items: number
  totalQuantity: number
  totalValue: number
  onClick: () => void
}) {
  return (
    <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">
          {items} <span className="text-sm font-normal text-muted-foreground">refs.</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {totalQuantity.toLocaleString('es-ES')} artículos | {formatCurrency(totalValue)}
        </p>
      </CardContent>
    </Card>
  )
}

export default function AlquilerPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  
  // Modals state for pedidos management
  const [modals, setModals] = useState<ModalState>({
    newPedido: false,
    changeContext: false,
    generatePDF: false,
    viewDetails: false,
    editItems: false,
    agregarReferencias: false,
    enviarPedidos: false,
  })

  const [selected, setSelected] = useState<SelectedData>({
    contextPedido: null,
    detailsPedido: null,
    selectedForPDF: [],
    editItemsPedido: null,
  })

  // ✅ Estados para nuevos modales
  const [selectedPedidoForReferencias, setSelectedPedidoForReferencias] = useState<string | null>(null)
  const [selectedProveedorId, setSelectedProveedorId] = useState<string | null>(null)

  const params = useParams() ?? {}
  const numeroExpediente = (params.numero_expediente as string) || ''
  const { toast } = useToast()

  const { data: serviceOrder, isLoading: isLoadingOS } = useEvento(numeroExpediente)
  const { data: materialOrders = [], isLoading: isLoadingOrders, refetch: refetchMaterialOrders } = useMaterialOrders(
    serviceOrder?.numero_expediente,
    'Alquiler',
  )
  const { data: allArticulos } = useArticulos()
  const { data: pickingSheets = [], isLoading: isLoadingPicking } = usePickingSheets(serviceOrder?.id)
  const { data: returnSheets = [], isLoading: isLoadingReturns } = useReturnSheets(serviceOrder?.id)
  const { data: briefing, isLoading: isLoadingBriefing } = useComercialBriefing(serviceOrder?.id)
  const { data: ajustes = [], isLoading: isLoadingAjustes } = useComercialAjustes(serviceOrder?.id)

  // Combined loading state
  const isLoading = isLoadingOS || isLoadingOrders || isLoadingPicking || isLoadingReturns || isLoadingBriefing || isLoadingAjustes

  // Pedidos management mutations and queries
  const createPedido = useCreatePedidoPendiente()
  const deletePedido = useDeletePedidoPendiente()
  const deleteEnviado = useDeletePedidoEnviado()
  const changePedidoContext = useChangePedidoContext()
  const updatePedidoItems = useUpdatePedidoPendiente()
  const updateSubpedidoComplete = useUpdateSubpedidoComplete()
  const generatePDF = useGeneratePDFMulti()
  const agregarItems = useAgregarItemsAPedido()
  const actualizarContexto = useUpdatePedidoContexto()
  const { data: allPedidosPendientes = [], refetch: refetchPedidosPendientes } = usePedidosPendientes(numeroExpediente)
  const { data: allPedidosEnviados = [] } = usePedidosEnviados(numeroExpediente)
  const { data: proveedoresAlquiler = [] } = useProveedoresAlquiler()
  const { data: articulosProveedorData = [] } = useBuscarArticulosProveedor(selectedProveedorId || undefined)

  // Refetch material orders cuando la ventana obtiene el foco o cada 30 segundos
  useEffect(() => {
    const handleFocus = () => {
      refetchMaterialOrders()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetchMaterialOrders])

  // ========== PEDIDOS MANAGEMENT HANDLERS ==========

  const handleOpenNewPedido = () => {
    setModals((m) => ({ ...m, newPedido: true }))
  }

  const handleCloseNewPedido = () => {
    setModals((m) => ({ ...m, newPedido: false }))
  }

  const handleSubmitNewPedido = async (data: {
    fechaEntrega: string
    horaEntrega: string
    localizacion: string
    solicita: 'Sala' | 'Cocina'
    proveedorId: string
    nombreComercialProveedor?: string
  }) => {
    try {
      // Store provider ID for article pre-loading
      setSelectedProveedorId(data.proveedorId)
      
      const pedidoData = {
        osId: numeroExpediente,
        fechaEntrega: data.fechaEntrega,
        horaEntrega: data.horaEntrega,
        localizacion: data.localizacion,
        solicita: data.solicita,
        proveedor_id: data.proveedorId,
        nombreComercialProveedor: data.nombreComercialProveedor,
        items: [],
      }
      
      const newPedido = await createPedido.mutateAsync(pedidoData)
      const newPedidoId = newPedido.id
      handleCloseNewPedido()
      setModals((m) => ({ ...m, agregarReferencias: true }))
      
      toast({ title: 'Pedido creado', description: 'Ahora puedes agregar artículos al pedido' })
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo crear el pedido', variant: 'destructive' })
    }
  }

  const handleDownloadPDF = (pedido: PedidoEnviado) => {
    const fileName = `pedidos-${pedido.numero_expediente}-${pedido.id.substring(0, 8)}.pdf`
    const downloadUrl = `/api/pedidos/download-pdf?fileName=${encodeURIComponent(fileName)}&pedidoId=${pedido.id}`
    
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDeletePedido = async (pedidoId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este pedido?')) {
      try {
        await deletePedido.mutateAsync({ pedidoId, osId: numeroExpediente })
        toast({ title: 'Pedido eliminado', description: 'El pedido ha sido eliminado correctamente' })
      } catch (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar el pedido', variant: 'destructive' })
      }
    }
  }

  const handleOpenChangeContext = (pedido: PedidoPendiente) => {
    setSelected((s) => ({ ...s, contextPedido: pedido }))
    setModals((m) => ({ ...m, changeContext: true }))
  }

  const handleCloseChangeContext = () => {
    setModals((m) => ({ ...m, changeContext: false }))
    setSelected((s) => ({ ...s, contextPedido: null }))
  }

  const handleConfirmChangeContext = async (newSolicita: 'Sala' | 'Cocina') => {
    if (!selected.contextPedido) return
    try {
      await changePedidoContext.mutateAsync({
        pedidoId: selected.contextPedido.id,
        newSolicita,
      })
      handleCloseChangeContext()
      toast({ title: 'Contexto actualizado', description: 'Se ha cambiad el contexto correctamente' })
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo cambiar el contexto', variant: 'destructive' })
    }
  }

  const handleOpenGeneratePDF = (selectedIds: string[]) => {
    setSelected((s) => ({ ...s, selectedForPDF: selectedIds }))
    setModals((m) => ({ ...m, generatePDF: true }))
  }

  const handleCloseGeneratePDF = () => {
    setModals((m) => ({ ...m, generatePDF: false }))
    setSelected((s) => ({ ...s, selectedForPDF: [] }))
  }

  const handleConfirmGeneratePDF = async () => {
    try {
      const result = await generatePDF.mutateAsync({
        osId: numeroExpediente,
        selectedPedidoIds: selected.selectedForPDF,
        generatedBy: user?.id || 'system',
      })
      
      handleCloseGeneratePDF()
      toast({ title: 'PDF generado', description: `${result.consolidatedCount} archivos consolidados` })
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo generar el PDF', variant: 'destructive' })
    }
  }

  const handleOpenViewDetails = (pedido: PedidoEnviado) => {
    setSelected((s) => ({ ...s, detailsPedido: pedido }))
    setModals((m) => ({ ...m, viewDetails: true }))
  }

  const handleCloseViewDetails = () => {
    setModals((m) => ({ ...m, viewDetails: false }))
    setSelected((s) => ({ ...s, detailsPedido: null }))
  }

  const handleOpenEditItems = (pedido: PedidoPendiente) => {
    setSelected((s) => ({ ...s, editItemsPedido: pedido }))
    setModals((m) => ({ ...m, editItems: true }))
  }

  const handleCloseEditItems = () => {
    setModals((m) => ({ ...m, editItems: false }))
    setSelected((s) => ({ ...s, editItemsPedido: null }))
  }

  const handleSaveEditItems = async (items: any[]) => {
    if (!selected.editItemsPedido) return
    try {
      await updatePedidoItems.mutateAsync({
        pedidoId: selected.editItemsPedido.id,
        items,
      })
      handleCloseEditItems()
      toast({ title: 'Items actualizados', description: 'Los items han sido actualizados correctamente' })
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar los items', variant: 'destructive' })
    }
  }

  // ========== NUEVOS HANDLERS PARA TARJETA DE GESTIÓN DE PEDIDOS ==========

  const handleOpenAgregarReferencias = (pedidoId: string) => {
    // Find the pedido and set provider ID
    const pedido = allPedidosPendientes.find(p => p.id === pedidoId)
    if (pedido?.proveedor_id) {
      setSelectedProveedorId(pedido.proveedor_id)
    }
    setSelectedPedidoForReferencias(pedidoId)
    setModals((m) => ({ ...m, agregarReferencias: true }))
  }

  const handleCloseAgregarReferencias = () => {
    setModals((m) => ({ ...m, agregarReferencias: false }))
    setSelectedPedidoForReferencias(null)
    setSelectedProveedorId(null)
  }

  const handleAgregarItemsAEditar = async (items: any[]) => {
    if (!selectedPedidoForReferencias) return
    try {
      // Esperar a que la mutación termine
      await agregarItems.mutateAsync({
        pedidoId: selectedPedidoForReferencias,
        newItems: items,
      })
      
      // CRITICAL: Await refetch para asegurar que los datos se actualizan ANTES de cerrar modal
      await refetchPedidosPendientes()
      
      handleCloseAgregarReferencias()
      toast({ title: 'Items agregados', description: 'Se han agregado los artículos correctamente' })
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron agregar los artículos', variant: 'destructive' })
    }
  }

  const handleSubPedidoEdit = async (pedidoId: string, updates: { fechaEntrega?: string; localizacion?: string; solicita?: 'Sala' | 'Cocina' }) => {
    try {
      await actualizarContexto.mutateAsync({
        pedidoId,
        ...updates,
      })
      toast({ title: 'Sub-pedido actualizado', description: 'Los datos se han modificado correctamente' })
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el sub-pedido', variant: 'destructive' })
    }
  }

  const handleSubPedidoDelete = async (pedidoId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este sub-pedido?')) return
    try {
      await deletePedido.mutateAsync({
        pedidoId,
        osId: numeroExpediente,
      })
      toast({ title: 'Sub-pedido eliminado', description: 'Se ha eliminado correctamente' })
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el sub-pedido', variant: 'destructive' })
    }
  }

  const handleSubPedidoUpdateItems = async (pedidoId: string, items: any[]) => {
    try {
      await updatePedidoItems.mutateAsync({
        pedidoId,
        items,
      })
      toast({ title: 'Items actualizados', description: 'Los cambios se han guardado' })
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron actualizar los items', variant: 'destructive' })
    }
  }

  // NUEVO: Manejo consolidado de guardado de sub-pedido
  const handleSubPedidoSaveComplete = async (
    pedidoId: string,
    updates: {
      fechaEntrega?: string;
      horaEntrega?: string;
      localizacion?: string;
      solicita?: 'Sala' | 'Cocina';
      fechaRecogida?: string;
      horaRecogida?: string;
      lugarRecogida?: 'Evento' | 'Instalaciones';
      items?: any[];
    }
  ) => {
    try {
      await updateSubpedidoComplete.mutateAsync({
        pedidoId,
        osId: numeroExpediente,
        updates,
      })
      toast({ 
        title: 'Sub-pedido guardado', 
        description: 'Todos los cambios se han registrado correctamente en una sola transacción' 
      })
    } catch (error) {
      toast({ 
        title: 'Error al guardar', 
        description: 'No se pudo guardar el sub-pedido',
        variant: 'destructive'
      })
    }
  }

  const handleOpenEnviarPedidos = () => {
    setModals((m) => ({ ...m, enviarPedidos: true }))
  }

  const handleCloseEnviarPedidos = () => {
    setModals((m) => ({ ...m, enviarPedidos: false }))
  }

  const handleConfirmEnviarPedidos = async (selectedPedidoIds: string[], preview: any, comentario?: string) => {
    try {
      const result = await generatePDF.mutateAsync({
        osId: numeroExpediente,
        selectedPedidoIds,
        generatedBy: user?.id || 'system',
        comentario,
      })
      
      handleCloseEnviarPedidos()
      toast({
        title: 'Pedidos consolidados',
        description: `Se han generado ${preview.length} PDF(s) correctamente`,
      })
    } catch (error: any) {
      const errorMessage = error?.message || 'No se pudo consolidar los pedidos';
      toast({
        title: 'Error al consolidar',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  const facturacionNeta = useMemo(() => {
    if (!serviceOrder) return 0

    const totalBriefing =
      briefing?.items?.reduce(
        (acc, item) =>
          acc + item.asistentes * item.precioUnitario + (item.importeFijo || 0),
        0,
      ) || 0
    const totalAjustes =
      ajustes.reduce((sum, ajuste) => sum + ajuste.importe, 0) || 0
    
    const facturacionBruta = totalBriefing + totalAjustes
    
    const agencyCommission =
      (facturacionBruta * (serviceOrder?.agencyPercentage || 0)) / 100 +
      (serviceOrder?.agencyCommissionValue || 0)
    const spaceCommission =
      (facturacionBruta * (serviceOrder?.spacePercentage || 0)) / 100 +
      (serviceOrder?.spaceCommissionValue || 0)
    
    return facturacionBruta - agencyCommission - spaceCommission
  }, [serviceOrder, briefing, ajustes])

  const { allItems, blockedOrders, pendingItems, itemsByStatus, totalValoracionPendiente } =
    useMemo(() => {
      if (!serviceOrder)
        return {
          allItems: [],
          blockedOrders: [],
          pendingItems: [],
          itemsByStatus: { Asignado: [], 'En Preparación': [], Listo: [] },
          totalValoracionPendiente: 0,
        }

      const mermas: Record<string, number> = {}
      const safeReturnSheets = returnSheets || []
      safeReturnSheets.forEach((sheet) => {
        Object.entries(sheet.itemStates).forEach(([key, state]: [string, any]) => {
          const itemInfo = sheet.items.find((i: any) => `${i.orderId}_${i.itemCode}` === key)
          if (
            itemInfo &&
            itemInfo.type === 'Alquiler' &&
            itemInfo.sentQuantity > state.returnedQuantity
          ) {
            const perdida = itemInfo.sentQuantity - state.returnedQuantity
            mermas[itemInfo.itemCode] = (mermas[itemInfo.itemCode] || 0) + perdida
          }
        })
      })

      const statusItems: Record<StatusColumn, ItemWithOrderInfo[]> = {
        Asignado: [],
        'En Preparación': [],
        Listo: [],
      }
      const processedItemKeys = new Set<string>()
      const blocked: BlockedOrderInfo[] = []

      const safePickingSheets = pickingSheets || []
      safePickingSheets.forEach((sheet) => {
        const targetStatus = statusMap[sheet.status] || 'En Preparación'
        const sheetInfo: BlockedOrderInfo = { sheetId: sheet.id, status: sheet.status, items: [] }

        sheet.items.forEach((item) => {
          if (item.type !== 'Alquiler') return

          const uniqueKey = `${item.orderId}-${item.itemCode}`
          const safeMaterialOrders = materialOrders || []
          const orderRef = safeMaterialOrders.find((o) => o.id === item.orderId)

          let cantidadReal = item.quantity
          if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
            const mermaAplicable = Math.min(cantidadReal, mermas[item.itemCode])
            cantidadReal -= mermaAplicable
            mermas[item.itemCode] -= mermaAplicable
          }

          if (cantidadReal > 0) {
            const itemWithInfo: ItemWithOrderInfo = {
              ...item,
              quantity: cantidadReal,
              orderId: sheet.id,
              orderContract: orderRef?.contractNumber || 'N/A',
              orderStatus: sheet.status,
              solicita: orderRef?.solicita,
            }
            statusItems[targetStatus].push(itemWithInfo)
            sheetInfo.items.push(itemWithInfo)
          }
          processedItemKeys.add(uniqueKey)
        })

        if (sheetInfo.items.length > 0) {
          blocked.push(sheetInfo)
        }
      })

      const safeMaterialOrders = materialOrders || []
      
      let matchCount = 0;
      const all = safeMaterialOrders.flatMap((order) =>
        order.items.map((item) => {
          let cantidadAjustada = item.quantity
          ;(item.ajustes || []).forEach((ajuste) => {
            cantidadAjustada += ajuste.cantidad
          })
          
          // Buscar imagen del artículo en allArticulos (only if loaded)
          let imageUrl: string | undefined
          let imagenes: any
          let subcategoria: string | undefined
          
          if (allArticulos && allArticulos.length > 0) {
            const articuloData = allArticulos.find(a => a.id === item.itemCode);
            if (articuloData) {
              imageUrl = getThumbnail(articuloData.imagenes);
              imagenes = articuloData.imagenes;
              subcategoria = articuloData.subcategoria;
            }
          }
          
          return {
            ...item,
            quantity: cantidadAjustada,
            orderId: order.id,
            orderContract: order.contractNumber,
            solicita: order.solicita,
            tipo: item.tipo,
            deliveryDate: order.deliveryDate,
            deliveryLocation: order.deliveryLocation,
            ajustes: item.ajustes,
            imageUrl,
            imagenes,
            subcategoria,
          } as ItemWithOrderInfo
        }),
      )

      const pending = all
        .filter((item) => {
          const uniqueKey = `${item.orderId}-${item.itemCode}`
          let cantidadAjustada = item.quantity
          if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
            const mermaAplicable = Math.min(cantidadAjustada, mermas[item.itemCode])
            cantidadAjustada -= mermaAplicable
            mermas[item.itemCode] -= mermaAplicable
          }
          return !processedItemKeys.has(uniqueKey) && cantidadAjustada > 0
        })
        .map((item) => {
          let cantidadAjustada = item.quantity
          if (mermas[item.itemCode] && mermas[item.itemCode] > 0) {
            cantidadAjustada -= mermas[item.itemCode]
          }
          return { ...item, quantity: cantidadAjustada }
        })

      statusItems['Asignado'] = pending

      const totalValoracionPendiente = pending.reduce(
        (acc, item) => acc + (item.price || 0) * item.quantity,
        0,
      )

      return {
        allItems: all,
        blockedOrders: blocked,
        pendingItems: pending,
        itemsByStatus: statusItems,
        totalValoracionPendiente,
      }
    }, [materialOrders, pickingSheets, returnSheets, allArticulos])

  const totalPlanned = useMemo(() => {
    // Planificado = Sub-pedidos pendientes (no consolidados) + Pedidos consolidados y enviados
    // Es decir, TODOS los gastos en pedidos de alquiler que están "planeados"
    
    // 1. Sub-pedidos pendientes (aún no consolidados)
    const totalSubPedidosPendientes = (allPedidosPendientes || []).reduce((acc, pedido) => {
      const pedidoTotal = (pedido.items || []).reduce((sum, item: any) => {
        return sum + ((item.priceSnapshot || item.price || 0) * (item.cantidad || 0))
      }, 0)
      return acc + pedidoTotal
    }, 0)

    // 2. Pedidos consolidados y ya enviados
    const totalEnviados = (allPedidosEnviados || []).reduce((acc, pedido) => {
      const pedidoTotal = (pedido.items || []).reduce((sum, item: any) => {
        return sum + ((item.price || item.priceSnapshot || 0) * (item.cantidad || 0))
      }, 0)
      return acc + pedidoTotal
    }, 0)

    const total = totalSubPedidosPendientes + totalEnviados
    return total
  }, [allPedidosPendientes, allPedidosEnviados])

  const availableLocations = useMemo(() => {
    if (!briefing?.items || briefing.items.length === 0) {
      return []; // Sin fallback, solo salas del briefing
    }
    const locations = Array.from(new Set(briefing.items.map((item: any) => item.solicita || item.sala || item.ubicacion || item.location).filter(Boolean)));
    return locations;
  }, [briefing]);

  const renderSummaryModal = () => {
    const all = [
      ...itemsByStatus.Asignado,
      ...itemsByStatus['En Preparación'],
      ...itemsByStatus.Listo,
    ]
    const totalValue = all.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0)
    return (
      <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-md border-border/40">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-black uppercase tracking-widest">Resumen de Artículos de Alquiler</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto rounded-md border border-border/40 mt-4">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground w-16">Foto</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Artículo</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">Cantidad</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">Cant. Cajas</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">Valoración</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((item, index) => {
                const isBlocked = !itemsByStatus.Asignado.some(
                  (pi) => pi.itemCode === item.itemCode && pi.orderId === item.orderId,
                )
                const cajas =
                  item.unidadVenta && item.unidadVenta > 0
                    ? (item.quantity / item.unidadVenta).toFixed(2)
                    : '-'
                return (
                  <TableRow key={`${item.itemCode}-${index}`} className="border-border/40 hover:bg-muted/20 transition-colors">
                    <TableCell className="px-2 py-2 w-16">
                      {item.imageUrl ? (
                        <button
                          onClick={() => setSelectedImageUrl(item.imageUrl!)}
                          className="h-12 w-12 rounded overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                        >
                          <img src={item.imageUrl} alt={item.description} className="h-12 w-12 object-cover" />
                        </button>
                      ) : (
                        <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-[11px] font-bold uppercase tracking-tight">{item.description}</TableCell>
                    <TableCell className="px-4 py-2 text-center text-[11px] font-black font-mono">{item.quantity}</TableCell>
                    <TableCell className="px-4 py-2 text-center text-[11px] font-medium text-muted-foreground">{cajas}</TableCell>
                    <TableCell className="px-4 py-2 text-right text-[11px] font-black font-mono">{formatCurrency(item.quantity * (item.price || 0))}</TableCell>
                    <TableCell className="px-4 py-2 text-center">
                      <Badge 
                        variant={isBlocked ? 'destructive' : 'default'}
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
                      >
                        {isBlocked ? 'Bloqueado' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end items-center gap-4 p-4 bg-muted/30 border-t border-border/40 mt-4 rounded-b-lg">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valoración Total</span>
          <span className="text-lg font-black tracking-tight">{formatCurrency(totalValue)}</span>
        </div>
      </DialogContent>
    )
  }

  const renderAggregatorModal = () => {
    return (
      <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-md border-border/40">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-black uppercase tracking-widest">Agregador de Artículos Pendientes</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto rounded-md border border-border/40 mt-4">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground w-12"></TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Artículo</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Solicita</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">Cantidad</TableHead>
                <TableHead className="h-10 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right">Valoración</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingItems.length > 0 ? (
                pendingItems.map((item) => (
                  <TableRow key={item.itemCode + item.orderId} className="border-border/40 hover:bg-muted/20 transition-colors">
                    <TableCell className="px-4 py-2">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        {item.imagenes && item.imagenes.length > 0 ? (
                          <img src={item.imagenes[0].url} alt={item.description} className="w-full h-full object-cover rounded" />
                        ) : (
                          <span className="text-[7px] text-muted-foreground">img</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2 text-[10px] font-bold uppercase tracking-tight">{item.description}</TableCell>
                    <TableCell className="px-4 py-2 text-[10px]">{item.solicita || 'Sala'}</TableCell>
                    <TableCell className="px-4 py-2 text-center text-[10px] font-black font-mono">{item.quantity}</TableCell>
                    <TableCell className="px-4 py-2 text-right text-[10px] font-black font-mono">{formatCurrency(item.quantity * (item.price || 0))}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-[11px] text-muted-foreground italic">
                    No hay artículos pendientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end items-center gap-4 p-4 bg-muted/30 border-t border-border/40 mt-4 rounded-b-lg">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total</span>
          <span className="text-lg font-black tracking-tight">{formatCurrency(totalValoracionPendiente)}</span>
        </div>
      </DialogContent>
    )
  }

  if (isLoading) {
    return <LoadingSkeleton title="Cargando Módulo de Alquiler..." />
  }

  return (
    <TooltipProvider>
      <div className="flex-1">
        {/* Header Premium Sticky */}
        <div className="sticky top-[5.25rem] md:top-[88px] z-30 bg-background/95 backdrop-blur-md border-b border-border/40 transition-none shadow-sm mb-0">
          <div className="max-w-7xl mx-auto px-4 py-0 flex items-center justify-between gap-4 min-h-9 md:min-h-10">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded-lg bg-blue-500/10 border border-blue-500/20 shadow-sm">
                  <Archive className="h-3.5 w-3.5 text-black" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-[10px] font-black uppercase tracking-tight leading-none text-black">Alquiler</h1>
                  <p className="text-[7px] font-bold text-muted-foreground uppercase leading-none opacity-70 truncate max-w-[100px] md:max-w-[180px]">{serviceOrder?.nombre_evento}</p>
                </div>
              </div>

              <div className="h-6 w-px bg-border/40 hidden md:block" />

              <div className="hidden md:block">
                <AlquilerHeaderMetrics 
                  totalPlanned={totalPlanned} 
                  facturacion={facturacionNeta} 
                  osId={serviceOrder?.id || numeroExpediente}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={allItems.length === 0}
                    className="h-7 text-[9px] font-black uppercase tracking-tight border-border/40 hover:bg-blue-500/5 px-2"
                  >
                    <Eye className="mr-1.5 h-3 w-3" />
                    <span className="hidden md:inline">Resumen</span>
                    <span className="inline md:hidden">Res.</span>
                  </Button>
                </DialogTrigger>
                {renderSummaryModal()}
              </Dialog>
              <BriefingSummaryTrigger items={briefing?.items || []} />
            </div>
          </div>
        </div>

        <main className="space-y-4 max-w-7xl mx-auto px-4">

        <Dialog open={!!selectedImageUrl} onOpenChange={(open) => !open && setSelectedImageUrl(null)}>
          <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-md border-border/40 p-0 overflow-visible">
            <DialogHeader className="sr-only">
              <DialogTitle>Imagen ampliada</DialogTitle>
            </DialogHeader>
            <button
              onClick={() => setSelectedImageUrl(null)}
              className="absolute top-2 right-2 rounded-full p-2 bg-background border border-border/40 hover:bg-muted shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring z-50"
              aria-label="Cerrar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6l-12 12M6 6l12 12" />
              </svg>
            </button>
            {selectedImageUrl && (
              <img
                src={selectedImageUrl}
                alt="Imagen ampliada del artículo"
                className="w-full h-auto rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* ========== TARJETA 1: GESTIÓN DE PEDIDOS (Editable) ========== */}
        <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden mt-6">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <CardHeader className="py-2 px-4 border-b border-border/40 flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-[11px] font-black uppercase tracking-widest">
                Gestión de Sub-Pedidos
              </CardTitle>
            </div>
            <Button
              onClick={handleOpenNewPedido}
              className="h-7 text-[9px] font-black uppercase tracking-tight bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 px-2"
            >
              <Plus className="mr-1.5 h-3 w-3" />
              Nuevo Sub-Pedido
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Sub-pedidos */}
              {allPedidosPendientes.length > 0 ? (
                <>
                  {allPedidosPendientes.map((pedido) => (
                    <SubPedidoCard
                      key={pedido.id}
                      pedido={pedido}
                      onSaveComplete={(updates) => handleSubPedidoSaveComplete(pedido.id, updates)}
                      onEdit={(updates) => handleSubPedidoEdit(pedido.id, updates)}
                      onAddReferencias={() => handleOpenAgregarReferencias(pedido.id)}
                      onUpdateItems={(items) => handleSubPedidoUpdateItems(pedido.id, items)}
                      onDelete={() => handleSubPedidoDelete(pedido.id)}
                      isLoading={updatePedidoItems.isPending}
                      availableLocations={availableLocations}
                    />
                  ))}

                  {/* Botón de enviar pedidos */}
                  <div className="pt-3 border-t border-border/40">
                    <Button
                      onClick={handleOpenEnviarPedidos}
                      className="w-full h-8 text-[9px] font-black uppercase tracking-tight bg-blue-600 hover:bg-blue-700"
                      disabled={allPedidosPendientes.length === 0}
                    >
                      <Package className="mr-1.5 h-3 w-3" />
                      Enviar {allPedidosPendientes.length} Sub-Pedido(s)
                    </Button>
                  </div>
                </>
              ) : (
                <div className="h-24 flex items-center justify-center text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package className="h-8 w-8 opacity-20" />
                    <p className="text-[10px] font-medium uppercase tracking-wider">
                      No hay sub-pedidos creados
                    </p>
                    <p className="text-[9px] text-muted-foreground/70">
                      Crea uno nuevo con el botón de arriba
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ========== TARJETA 2: PEDIDOS GESTIONADOS (Solo lectura) ========== */}
        <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden mt-6">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <CardHeader className="py-2 px-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-[11px] font-black uppercase tracking-widest">
                Pedidos Consolidados y Enviados
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {allPedidosEnviados.length > 0 ? (
              <div className="space-y-2">
                {allPedidosEnviados.map((pedido) => {
                  const totalValue = pedido.items.reduce(
                    (sum, item) => sum + (item.priceSnapshot || item.price || 0) * item.cantidad,
                    0
                  );
                  const totalUnidades = pedido.items.reduce((sum, item) => sum + item.cantidad, 0);

                  return (
                    <div
                      key={pedido.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border/40 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black">
                            {format(new Date(pedido.fecha_entrega), 'dd/MM/yyyy', { locale: es })}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {pedido.localizacion}
                          </span>
                        </div>
                        <p className="text-[9px] text-muted-foreground">
                          {pedido.items.length} artículos • {totalUnidades} unidades
                        </p>
                      </div>
                      <div className="text-right mr-3">
                        <p className="text-[10px] font-black font-mono">
                          {formatCurrency(totalValue)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[8px]"
                          onClick={() => handleDownloadPDF(pedido)}
                        >
                          ⬇ PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[8px]"
                          onClick={() => handleOpenViewDetails(pedido)}
                        >
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-6 px-2 text-[8px] bg-red-600/90 hover:bg-red-700"
                          onClick={() => {
                            if (confirm('⚠️ ADVERTENCIA: Solo borra este pedido si realmente queda anulado en el proveedor. ¿Estás seguro de que deseas eliminarlo?')) {
                              deleteEnviado.mutateAsync({ pedidoId: pedido.id, osId: numeroExpediente })
                                .then(() => {
                                  toast({ title: 'Pedido eliminado', description: 'El pedido ha sido eliminado correctamente' })
                                })
                                .catch((error) => {
                                  toast({ title: 'Error', description: error.message || 'No se pudo eliminar el pedido', variant: 'destructive' })
                                })
                            }
                          }}
                          disabled={deleteEnviado.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Eye className="h-8 w-8 opacity-20" />
                  <p className="text-[10px] font-medium uppercase tracking-wider">
                    No hay pedidos enviados
                  </p>
                  <p className="text-[9px] text-muted-foreground/70">
                    Los pedidos aparecerán aquí cuando los envíes
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========== PEDIDOS MODALS ========== */}
        <NewPedidoModal
          isOpen={modals.newPedido}
          onClose={handleCloseNewPedido}
          onSubmit={handleSubmitNewPedido}
          isLoading={createPedido.isPending}
          availableLocations={availableLocations}
          defaultFecha={serviceOrder?.startDate ? (typeof serviceOrder.startDate === 'string' ? serviceOrder.startDate.split('T')[0] : serviceOrder.startDate.toISOString().split('T')[0]) : ''}
          proveedores={proveedoresAlquiler}
        />

        <AgregarReferenciasModal
          isOpen={modals.agregarReferencias}
          onClose={handleCloseAgregarReferencias}
          onAdd={handleAgregarItemsAEditar}
          isLoading={agregarItems.isPending}
          proveedores={proveedoresAlquiler}
          articulosDelProveedor={articulosProveedorData}
          selectedProveedor={selectedProveedorId || undefined}
          onProveedorChange={setSelectedProveedorId}
        />

        <EnviarPedidosModal
          isOpen={modals.enviarPedidos}
          onClose={handleCloseEnviarPedidos}
          onConfirm={handleConfirmEnviarPedidos}
          isLoading={generatePDF.isPending}
          pedidosPendientes={allPedidosPendientes}
        />

        <SentOrderDetailsModal
          isOpen={modals.viewDetails}
          pedido={selected.detailsPedido}
          onClose={handleCloseViewDetails}
        />
        </main>
      </div>
    </TooltipProvider>
  )
}
