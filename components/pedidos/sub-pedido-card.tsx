'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { ChevronDown, ChevronUp, Plus, Trash2, Edit2, Package, X, Package2, Calendar, MapPin, Clock, AlertCircle, CheckCircle, Send } from 'lucide-react';
import { PedidoPendiente, PedidoItem, type SubpedidoStatus } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useProveedor } from '@/hooks/use-data-queries';

// ============================================================================
// Status Configuration - Visual styling for sub-pedido states
// ============================================================================

const statusConfig: Record<SubpedidoStatus, {
  bg: string;
  text: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = {
  pending: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-100',
    label: 'PENDIENTE',
    icon: <Clock className="h-4 w-4" />,
    description: 'En edición'
  },
  review: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-100',
    label: 'PARA REVISAR',
    icon: <AlertCircle className="h-4 w-4" />,
    description: 'Listo para revisar'
  },
  confirmed: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-800 dark:text-emerald-100',
    label: 'CONFIRMADO',
    icon: <CheckCircle className="h-4 w-4" />,
    description: 'Confirmado'
  },
  sent: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-800 dark:text-gray-100',
    label: 'ENVIADO',
    icon: <Send className="h-4 w-4" />,
    description: 'Enviado al proveedor'
  },
  cancelled: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-100',
    label: 'CANCELADO',
    icon: <X className="h-4 w-4" />,
    description: 'Cancelado'
  },
};

interface SubPedidoCardProps {
  pedido: PedidoPendiente;
  // Consolidar en un solo callback que recibe TODOS los cambios
  onSaveComplete?: (updates: {
    fechaEntrega?: string;
    horaEntrega?: string; // NEW
    localizacion?: string;
    solicita?: 'Sala' | 'Cocina';
    fechaRecogida?: string; // NEW
    horaRecogida?: string; // NEW
    lugarRecogida?: 'Evento' | 'Instalaciones'; // NEW
    items?: PedidoItem[];
  }) => void;
  // Legacy callbacks (mantenemos para compatibilidad)
  onEdit?: (updates: {
    fechaEntrega?: string;
    horaEntrega?: string; // NEW
    localizacion?: string;
    solicita?: 'Sala' | 'Cocina';
    fechaRecogida?: string; // NEW
    horaRecogida?: string; // NEW
    lugarRecogida?: 'Evento' | 'Instalaciones'; // NEW
  }) => void;
  onAddReferencias: () => void;
  onUpdateItems?: (items: PedidoItem[]) => void;
  onDelete: () => void;
  isLoading?: boolean;
  availableLocations: string[];
}

export function SubPedidoCard({
  pedido,
  onSaveComplete,
  onEdit,
  onAddReferencias,
  onUpdateItems,
  onDelete,
  isLoading = false,
  availableLocations = [],
}: SubPedidoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editFecha, setEditFecha] = useState(pedido.fecha_entrega);
  const [editHora, setEditHora] = useState(pedido.hora_entrega);
  const [editLocalizacion, setEditLocalizacion] = useState(pedido.localizacion);
  const [editSolicita, setEditSolicita] = useState<'Sala' | 'Cocina'>(pedido.solicita);
  // NEW: Pickup information
  const [editFechaRecogida, setEditFechaRecogida] = useState(pedido.fecha_recogida || '');
  const [editHoraRecogida, setEditHoraRecogida] = useState(pedido.hora_recogida || '');
  const [editLugarRecogida, setEditLugarRecogida] = useState<'Evento' | 'Instalaciones'>(pedido.lugar_recogida || 'Evento');
  const [editedItems, setEditedItems] = useState<PedidoItem[]>(pedido.items);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingCantidad, setEditingCantidad] = useState<Record<string, number>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch provider name if proveedor_id exists
  const { data: proveedor } = useProveedor(pedido.proveedor_id || '');

  // CRITICAL: Sync editedItems when pedido.items changes (after refetch)
  useEffect(() => {
    setEditedItems(pedido.items);
  }, [pedido.items]);

  const totalValue = editedItems.reduce(
    (sum, item) => sum + (item.priceSnapshot || item.price || 0) * item.cantidad * (item.dias || 1),
    0
  );

  // Consolidar todos los cambios en un solo guardado
  const handleSaveAll = () => {
    if (onSaveComplete) {
      // Nuevo flujo: guardar TODO de una vez
      onSaveComplete({
        fechaEntrega: editFecha,
        horaEntrega: editHora,
        localizacion: editLocalizacion,
        solicita: editSolicita,
        fechaRecogida: editFechaRecogida || undefined,
        horaRecogida: editHoraRecogida || undefined,
        lugarRecogida: editFechaRecogida ? editLugarRecogida : undefined,
        items: editedItems,
      });
    } else if (onEdit && onUpdateItems) {
      // Legacy: guardar por separado (compatibilidad hacia atrás)
      onEdit({
        fechaEntrega: editFecha,
        horaEntrega: editHora,
        localizacion: editLocalizacion,
        solicita: editSolicita,
        fechaRecogida: editFechaRecogida || undefined,
        horaRecogida: editHoraRecogida || undefined,
        lugarRecogida: editFechaRecogida ? editLugarRecogida : undefined,
      });
      onUpdateItems(editedItems);
    }
    setEditMode(false);
  };

  const handleCancelEdit = () => {
    // Revertir todos los cambios
    setEditFecha(pedido.fecha_entrega);
    setEditHora(pedido.hora_entrega || '');
    setEditLocalizacion(pedido.localizacion);
    setEditSolicita(pedido.solicita);
    setEditFechaRecogida(pedido.fecha_recogida || '');
    setEditHoraRecogida(pedido.hora_recogida || '');
    setEditLugarRecogida(pedido.lugar_recogida || 'Evento');
    setEditedItems(pedido.items);
    setSelectedItems(new Set());
    setEditMode(false);
  };

  const handleToggleItem = (itemCode: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemCode)) {
      newSelected.delete(itemCode);
    } else {
      newSelected.add(itemCode);
    }
    setSelectedItems(newSelected);
  };

  const handleDeleteSelectedItems = () => {
    // Actualizar estado local sin llamar onUpdateItems inmediatamente
    setEditedItems((prevItems) =>
      prevItems.filter((item) => !selectedItems.has(item.itemCode))
    );
    setSelectedItems(new Set());
  };

  const handleUpdateCantidad = (itemCode: string, cantidad: number) => {
    // Actualizar estado local sin llamar onUpdateItems inmediatamente
    if (cantidad >= 1) {
      setEditedItems((prevItems) =>
        prevItems.map((item) =>
          item.itemCode === itemCode ? { ...item, cantidad } : item
        )
      );
    }
  };

  const handleUpdateDias = (itemCode: string, dias: number) => {
    // Actualizar estado local sin llamar onUpdateItems inmediatamente
    if (dias >= 1) {
      setEditedItems((prevItems) =>
        prevItems.map((item) =>
          item.itemCode === itemCode ? { ...item, dias } : item
        )
      );
    }
  };

  const handleDeleteItem = () => {
    // Actualizar estado local sin llamar onUpdateItems inmediatamente
    if (!itemToDelete) return;
    setEditedItems((prevItems) =>
      prevItems.filter((item) => item.itemCode !== itemToDelete)
    );
    setItemToDelete(null);
  };

  return (
    <>
      <Card className="bg-background/60 backdrop-blur-md border-border/40 overflow-hidden">
        {/* Cabecera - Click para expandir y entrar en modo edición */}
        <CardHeader
          className="py-2 px-4 border-b border-border/40 cursor-pointer hover:bg-muted/20 transition-colors"
          onClick={() => {
            setIsExpanded(!isExpanded);
            if (!isExpanded && !editMode) {
              setEditMode(true);
            }
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Icono de expansión */}
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Información principal */}
              <div className="flex-1 min-w-0">
                {/* Primera línea: Proveedor · Estado · Solicitante */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {proveedor?.nombre_comercial && (
                    <>
                      <Package2 className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 truncate">
                        {proveedor.nombre_comercial}
                      </span>
                      <span className="text-[8px] text-muted-foreground">•</span>
                    </>
                  )}
                  {/* Status Badge */}
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${statusConfig[pedido.status || 'pending'].bg}`}>
                    <div className={statusConfig[pedido.status || 'pending'].text}>
                      {statusConfig[pedido.status || 'pending'].icon}
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${statusConfig[pedido.status || 'pending'].text}`}>
                      {statusConfig[pedido.status || 'pending'].label}
                    </span>
                  </div>
                  <span className="text-[8px] text-muted-foreground">•</span>
                  <span className="text-[9px] font-semibold text-muted-foreground">
                    Solicitado por:
                  </span>
                  <Badge variant="outline" className="text-[9px] py-0.5 px-2 font-bold">
                    {pedido.solicita}
                  </Badge>
                </div>
                
                {/* Contexto - Mostrar tanto colapsado como expandido */}
                <div className="flex items-center gap-3 flex-wrap text-[10px]">
                  {/* Entrega */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-semibold text-blue-600">Ent:</span>
                    <Calendar className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    <span className="font-bold">
                      {format(new Date(editMode ? editFecha : pedido.fecha_entrega), 'dd/MM', { locale: es })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    <span className="font-medium">
                      {editMode ? editHora : pedido.hora_entrega || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    <span className="font-medium text-[9px]">
                      {editMode ? editLocalizacion : pedido.localizacion}
                    </span>
                  </div>

                  {/* Separador visual */}
                  <span className="text-[8px] text-muted-foreground">|</span>

                  {/* Recogida (si existe) */}
                  {((editMode && editFechaRecogida) || (!editMode && pedido.fecha_recogida)) && (
                    <>
                      <span className="text-[9px] font-semibold text-amber-600">Recog:</span>
                      <Calendar className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      <span className="font-bold">
                        {format(new Date(editMode ? editFechaRecogida : pedido.fecha_recogida!), 'dd/MM', { locale: es })}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        <span className="font-medium">
                          {editMode ? editHoraRecogida : pedido.hora_recogida || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        <span className="font-medium text-[9px]">
                          {editMode ? editLugarRecogida : pedido.lugar_recogida || '—'}
                        </span>
                      </div>
                    </>
                  )}

                  <span className="text-[8px] text-muted-foreground">•</span>
                  <span className="text-[9px] text-muted-foreground">
                    {pedido.items.length} art. • {pedido.cantidad_unidades} ud.
                  </span>
                </div>
              </div>
            </div>

            {/* Importe y Botones de acción en cabecera */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Importe */}
              <div className="mr-2">
                <p className="text-[14px] font-black font-mono text-emerald-600">
                  {formatCurrency(totalValue)}
                </p>
              </div>

              {/* Botón Eliminar Sub-Pedido */}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2.5 text-[10px] font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2.5 text-[10px] font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddReferencias();
                }}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
              
              {/* Botón Guardar (aparece solo cuando está en edit mode) */}
              {editMode && (
                <Button
                  size="sm"
                  className="h-7 px-2.5 text-[10px] font-medium bg-blue-600 hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveAll();
                  }}
                  disabled={isLoading}
                >
                  Guardar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Contenido expandido */}
        {isExpanded && (
          <CardContent className="py-4 px-4 space-y-4">
            {/* Sección de edición de contexto - Siempre visible si está expandido */}
            {editMode && (
              <>
                {/* ENTREGA & RECOGIDA - Grid 2 Columns */}
                <div className="border rounded-lg p-3 bg-blue-500/5 border-blue-500/20">
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
                    
                    {/* COLUMN 1: ENTREGA (4 internal columns) */}
                    <div className="grid grid-cols-4 gap-2">
                      {/* Fecha Entrega */}
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-blue-600 block mb-1">Fecha de Entrega</label>
                        <input
                          type="date"
                          value={editFecha}
                          onChange={(e) => setEditFecha(e.target.value)}
                          className="w-full h-7 px-1.5 text-[10px] border rounded bg-background"
                        />
                      </div>

                      {/* Hora Entrega with Popover */}
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-blue-600 block mb-1">Hora</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="w-full h-7 px-1.5 text-[10px] border rounded bg-background hover:bg-muted flex items-center justify-center gap-1 text-blue-600 font-medium">
                              <Clock className="h-3 w-3" />
                              {editHora}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-4">
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Selecciona hora</h4>
                              <div className="grid grid-cols-2 gap-3">
                                {/* Horas */}
                                <div>
                                  <label className="text-[9px] font-bold uppercase block mb-2 text-gray-600 dark:text-gray-400">Horas</label>
                                  <select
                                    value={editHora.split(':')[0] || '10'}
                                    onChange={(e) => {
                                      const mm = editHora.split(':')[1] || '00';
                                      setEditHora(`${e.target.value}:${mm}`);
                                    }}
                                    className="w-full h-8 px-2 text-[10px] border rounded bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                                      <option key={h} value={String(h).padStart(2, '0')}>
                                        {String(h).padStart(2, '0')}:00
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {/* Minutos */}
                                <div>
                                  <label className="text-[9px] font-bold uppercase block mb-2 text-gray-600 dark:text-gray-400">Minutos</label>
                                  <select
                                    value={editHora.split(':')[1] || '00'}
                                    onChange={(e) => {
                                      const hh = editHora.split(':')[0] || '10';
                                      setEditHora(`${hh}:${e.target.value}`);
                                    }}
                                    className="w-full h-8 px-2 text-[10px] border rounded bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="00">:00</option>
                                    <option value="15">:15</option>
                                    <option value="30">:30</option>
                                    <option value="45">:45</option>
                                  </select>
                                </div>
                              </div>
                              <div className="text-center pt-2 border-t border-border/50">
                                <span className="text-sm font-bold text-blue-600">{editHora}</span>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Ubicación */}
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-blue-600 block mb-1">Ubicación</label>
                        <Select value={editLocalizacion} onValueChange={setEditLocalizacion}>
                          <SelectTrigger className="h-7 text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableLocations.map((loc) => (
                              <SelectItem key={loc} value={loc} className="text-[10px]">
                                {loc}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Solicitante */}
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-blue-600 block mb-1">Solicitante</label>
                        <Select
                          value={editSolicita}
                          onValueChange={(v) => setEditSolicita(v as 'Sala' | 'Cocina')}
                        >
                          <SelectTrigger className="h-7 text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sala" className="text-[10px]">Sala</SelectItem>
                            <SelectItem value="Cocina" className="text-[10px]">Cocina</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* DIVIDER */}
                    <div className="h-auto w-px bg-border/30"></div>

                    {/* COLUMN 2: RECOGIDA (3 fields in one line) */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Fecha Recogida */}
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-amber-600 block mb-1">Fecha Recogida</label>
                        <input
                          type="date"
                          value={editFechaRecogida}
                          onChange={(e) => setEditFechaRecogida(e.target.value)}
                          className="w-full h-7 px-1.5 text-[10px] border rounded bg-background"
                        />
                      </div>

                      {/* Hora Recogida with Popover */}
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-amber-600 block mb-1">Hora</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button 
                              disabled={!editFechaRecogida}
                              className="w-full h-7 px-1.5 text-[10px] border rounded bg-background hover:bg-muted flex items-center justify-center gap-1 text-amber-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Clock className="h-3 w-3" />
                              {editHoraRecogida}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-4">
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Selecciona hora</h4>
                              <div className="grid grid-cols-2 gap-3">
                                {/* Horas */}
                                <div>
                                  <label className="text-[9px] font-bold uppercase block mb-2 text-gray-600 dark:text-gray-400">Horas</label>
                                  <select
                                    value={editHoraRecogida.split(':')[0] || '10'}
                                    onChange={(e) => {
                                      const mm = editHoraRecogida.split(':')[1] || '00';
                                      setEditHoraRecogida(`${e.target.value}:${mm}`);
                                    }}
                                    className="w-full h-8 px-2 text-[10px] border rounded bg-background focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  >
                                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                                      <option key={h} value={String(h).padStart(2, '0')}>
                                        {String(h).padStart(2, '0')}:00
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {/* Minutos */}
                                <div>
                                  <label className="text-[9px] font-bold uppercase block mb-2 text-gray-600 dark:text-gray-400">Minutos</label>
                                  <select
                                    value={editHoraRecogida.split(':')[1] || '00'}
                                    onChange={(e) => {
                                      const hh = editHoraRecogida.split(':')[0] || '10';
                                      setEditHoraRecogida(`${hh}:${e.target.value}`);
                                    }}
                                    className="w-full h-8 px-2 text-[10px] border rounded bg-background focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  >
                                    <option value="00">:00</option>
                                    <option value="15">:15</option>
                                    <option value="30">:30</option>
                                    <option value="45">:45</option>
                                  </select>
                                </div>
                              </div>
                              <div className="text-center pt-2 border-t border-border/50">
                                <span className="text-sm font-bold text-amber-600">{editHoraRecogida}</span>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Ubicación Recogida */}
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-amber-600 block mb-1">Ubicación</label>
                        <Select
                          disabled={!editFechaRecogida}
                          value={editLugarRecogida}
                          onValueChange={(v) => setEditLugarRecogida(v as 'Evento' | 'Instalaciones')}
                        >
                          <SelectTrigger className="h-7 text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Evento" className="text-[10px]">En el Evento</SelectItem>
                            <SelectItem value="Instalaciones" className="text-[10px]">En Nuestras Instalaciones</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Tabla de items */}
            <div className="border rounded-lg overflow-hidden">
              {editedItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="h-9 px-2 text-[10px] font-black uppercase tracking-wider">
                          Foto
                        </TableHead>
                        <TableHead className="h-9 px-2 text-[10px] font-black uppercase tracking-wider">
                          Artículo
                        </TableHead>
                        <TableHead className="h-9 px-2 text-[10px] font-black uppercase tracking-wider text-center w-16">
                          Cantidad
                        </TableHead>
                        <TableHead className="h-9 px-2 text-[10px] font-black uppercase tracking-wider text-right w-16">
                          Precio
                        </TableHead>
                        <TableHead className="h-9 px-2 text-[10px] font-black uppercase tracking-wider text-center w-12">
                          Días
                        </TableHead>
                        <TableHead className="h-9 px-2 text-[10px] font-black uppercase tracking-wider text-right w-24">
                          Total
                        </TableHead>
                        <TableHead className="h-9 px-2 w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editedItems.map((item) => {
                        const isSelected = selectedItems.has(item.itemCode);
                        const itemPrice = item.priceSnapshot || item.price || 0;
                        const itemDias = item.dias || 1;
                        const itemTotal = itemPrice * item.cantidad * itemDias;

                        return (
                          <TableRow
                            key={item.itemCode}
                            className={`border-border/40 transition-colors hover:bg-muted/20`}
                          >
                            <TableCell className="px-0 py-2">
                              {item.imageUrl ? (
                                <button
                                  onClick={() => setSelectedImage(item.imageUrl || null)}
                                  className="relative group"
                                >
                                  <img
                                    src={item.imageUrl}
                                    alt={item.description}
                                    className="h-12 w-12 object-cover rounded border border-border/40 hover:border-primary/60 transition-colors cursor-pointer"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded transition-colors" />
                                </button>
                              ) : (
                                <div className="h-12 w-12 rounded border border-dashed border-border/40 bg-muted/20 flex items-center justify-center">
                                  <span className="text-[8px] text-muted-foreground">Sin foto</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="pl-1 pr-2 py-2">
                              <div>
                                <span className="text-[11px] font-bold line-clamp-2">
                                  {item.description}
                                </span>
                                {item.subcategoria && (
                                  <div className="mt-1">
                                    <Badge variant="outline" className="text-[9px] py-0.5">
                                      {item.subcategoria}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-2 py-2">
                              <input
                                type="number"
                                min={1}
                                value={item.cantidad}
                                onChange={(e) =>
                                  handleUpdateCantidad(
                                    item.itemCode,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-14 h-7 px-2 text-center text-[11px] font-mono font-medium border rounded"
                              />
                            </TableCell>
                            <TableCell className="px-2 py-2 text-right">
                              <span className="text-[11px] font-mono font-black text-emerald-600">
                                {itemPrice.toFixed(2)}€
                              </span>
                            </TableCell>
                            <TableCell className="px-2 py-2">
                              <input
                                type="number"
                                min={1}
                                value={itemDias}
                                onChange={(e) =>
                                  handleUpdateDias(
                                    item.itemCode,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-10 h-7 px-2 text-center text-[11px] font-mono font-medium border rounded"
                              />
                            </TableCell>
                            <TableCell className="px-2 py-2 text-right">
                              <span className="text-[11px] font-mono font-black text-emerald-600">
                                {formatCurrency(itemTotal)}
                              </span>
                            </TableCell>
                            <TableCell className="px-2 py-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setItemToDelete(item.itemCode)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center text-center text-muted-foreground">
                  <div className="text-[9px]">
                    <p className="font-medium">No hay artículos</p>
                    <p className="text-[8px]">Usa "Agregar referencias" para añadir items</p>
                  </div>
                </div>
              )}
            </div>

            {/* Botones de acción en el panel expandido */}
            {selectedItems.size > 0 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-[8px] flex-1"
                  onClick={handleDeleteSelectedItems}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Eliminar {selectedItems.size} seleccionados
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Alert Dialog para confirmar eliminación de item individual */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar artículo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este artículo del pedido?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteItem}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog para confirmar eliminación del sub-pedido completo */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Sub-Pedido</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este sub-pedido completamente? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
            >
              Eliminar Sub-Pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal para ver imagen en pantalla completa */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-2xl p-0 bg-black border-0">
          <VisuallyHidden>
            <DialogTitle>Imagen ampliada</DialogTitle>
          </VisuallyHidden>
          <div className="relative w-full h-auto flex items-center justify-center">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Preview"
                className="w-full h-auto"
              />
            )}
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
