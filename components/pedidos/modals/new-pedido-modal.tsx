'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Calendar, Clock } from 'lucide-react';
import { Proveedor } from '@/types';

interface NewPedidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    fechaEntrega: string;
    horaEntrega: string; // NEW
    localizacion: string;
    solicita: 'Sala' | 'Cocina';
    proveedorId: string;
    nombreComercialProveedor?: string;
  }) => void;
  isLoading?: boolean;
  availableLocations?: string[];
  defaultFecha?: string;
  proveedores?: Proveedor[];
}

export function NewPedidoModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  availableLocations = ['Salón', 'Cocina', 'Barra', 'Terraza'],
  defaultFecha = '',
  proveedores = [],
}: NewPedidoModalProps) {
  const [fechaEntrega, setFechaEntrega] = useState(defaultFecha);
  const [horaEntrega, setHoraEntrega] = useState('10:00');
  const [localizacion, setLocalizacion] = useState('');
  const [solicita, setSolicita] = useState<'Sala' | 'Cocina'>('Sala');
  const [proveedorId, setProveedorId] = useState('');

  const validateHora = (hora: string): boolean => {
    if (!hora) return false;
    const [hh, mm] = hora.split(':').map(Number);
    return hh >= 8 && hh <= 22 && mm >= 0 && mm <= 59;
  };

  const handleSubmit = () => {
    if (!fechaEntrega || !localizacion || !proveedorId) {
      return;
    }
    // Get the selected provider's nombre_comercial
    const selectedProveedor = proveedores.find(p => p.id === proveedorId);
    onSubmit({
      fechaEntrega,
      horaEntrega,
      localizacion,
      solicita,
      proveedorId,
      nombreComercialProveedor: selectedProveedor?.nombre_comercial,
    });
    // Reset form
    setFechaEntrega('');
    setHoraEntrega('10:00');
    setLocalizacion('');
    setSolicita('Sala');
    setProveedorId('');
  };

  // Get today's date in ISO format
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Crear nuevo pedido de alquiler</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* FILA 1: FECHA, HORA, UBICACIÓN, SOLICITANTE */}
          <div className="grid grid-cols-4 gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            
            {/* Fecha Entrega */}
            <div>
              <Label htmlFor="fecha" className="text-[9px] font-bold uppercase text-blue-700 dark:text-blue-300 block mb-2">Fecha de Entrega</Label>
              <input
                id="fecha"
                type="date"
                min={today}
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full h-8 px-2 text-[11px] border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900"
              />
            </div>

            {/* Hora Entrega with Popover */}
            <div>
              <Label className="text-[9px] font-bold uppercase text-blue-700 dark:text-blue-300 block mb-2">Hora</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full h-8 px-2 text-[11px] border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium transition-colors">
                    <Clock className="h-3.5 w-3.5" />
                    {horaEntrega}
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
                          value={horaEntrega.split(':')[0] || '10'}
                          onChange={(e) => {
                            const mm = horaEntrega.split(':')[1] || '00';
                            setHoraEntrega(`${e.target.value}:${mm}`);
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
                          value={horaEntrega.split(':')[1] || '00'}
                          onChange={(e) => {
                            const hh = horaEntrega.split(':')[0] || '10';
                            setHoraEntrega(`${hh}:${e.target.value}`);
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
                      <span className="text-sm font-bold text-blue-600">{horaEntrega}</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Ubicación */}
            <div>
              <Label htmlFor="localizacion" className="text-[9px] font-bold uppercase text-blue-700 dark:text-blue-300 block mb-2">Ubicación</Label>
              <Select value={localizacion} onValueChange={setLocalizacion}>
                <SelectTrigger id="localizacion" className="h-8 text-[11px]">
                  <SelectValue placeholder="Ubicación" />
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
              <Label htmlFor="solicita" className="text-[9px] font-bold uppercase text-blue-700 dark:text-blue-300 block mb-2">Solicitante</Label>
              <Select
                value={solicita}
                onValueChange={(value) =>
                  setSolicita(value as 'Sala' | 'Cocina')
                }
              >
                <SelectTrigger id="solicita" className="h-8 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sala" className="text-[10px]">Sala</SelectItem>
                  <SelectItem value="Cocina" className="text-[10px]">Cocina</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* FILA 2: PROVEEDOR */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-lg">
            <Label htmlFor="proveedor" className="text-[9px] font-bold uppercase text-slate-700 dark:text-slate-300 block mb-2">Proveedor Alquiler</Label>
            <Select value={proveedorId} onValueChange={setProveedorId}>
              <SelectTrigger id="proveedor" className="h-8 text-[11px] border-green-300 dark:border-green-900 focus:ring-green-500">
                <SelectValue placeholder="Selecciona proveedor..." />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {proveedores.map((proveedor) => (
                  <SelectItem key={proveedor.id} value={proveedor.id} className="text-[10px]">
                    {(proveedor.nombre_comercial || 'Sin nombre')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="h-9 text-[12px]">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!fechaEntrega || !localizacion || !proveedorId || isLoading}
            className="h-9 text-[12px]"
          >
            {isLoading ? 'Creando...' : 'Crear pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
