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
import { PedidoPendiente } from '@/types';
import { ArrowRight } from 'lucide-react';

interface ChangeContextModalProps {
  isOpen: boolean;
  pedido: PedidoPendiente | null;
  onClose: () => void;
  onConfirm: (newSolicita: 'Sala' | 'Cocina') => void;
  isLoading?: boolean;
}

export function ChangeContextModal({
  isOpen,
  pedido,
  onClose,
  onConfirm,
  isLoading = false,
}: ChangeContextModalProps) {
  const [confirmStep, setConfirmStep] = useState(false);

  if (!pedido) return null;

  const newContext = pedido.solicita === 'Sala' ? 'Cocina' : 'Sala';

  const handleConfirm = () => {
    onConfirm(newContext as 'Sala' | 'Cocina');
    setConfirmStep(false);
  };

  const handleClose = () => {
    setConfirmStep(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar contexto del pedido</DialogTitle>
          <DialogDescription>
            {pedido.fecha_entrega} • {pedido.localizacion}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current context */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 mb-2">Contexto actual</p>
            <p className="text-lg font-semibold text-gray-900">
              {pedido.solicita}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {pedido.cantidad_articulos} artículos •{' '}
              {Math.round(pedido.cantidad_unidades)} unidades
            </p>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
          </div>

          {/* New context */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-600 mb-2">Nuevo contexto</p>
            <p className="text-lg font-semibold text-blue-900">
              {newContext}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Los artículos se moverán automáticamente
            </p>
          </div>

          {/* Warning */}
          {!confirmStep && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                ⚠️ Si ya existe un pedido con contexto <strong>{newContext}</strong> para esta
                fecha y localización, esta operación podría causar un conflicto.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Cambiando...' : `Cambiar a ${newContext}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
