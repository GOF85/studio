'use client';

import { useState } from 'react';
import { EscandalloAjuste, aceptarEscandallosSugeridos } from '@/lib/escandallo-update-helper';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface EscandalloSugeridoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ajustes: EscandalloAjuste[];
  elaboracionId: string;
  onSuccess: () => void;
}

export function EscandalloSugeridoDialog({
  isOpen,
  onClose,
  ajustes,
  elaboracionId,
  onSuccess,
}: EscandalloSugeridoDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAjustes, setSelectedAjustes] = useState<Set<string>>(
    new Set(ajustes.map(a => a.componenteId))
  );

  const toggleAjuste = (componenteId: string) => {
    const newSelected = new Set(selectedAjustes);
    if (newSelected.has(componenteId)) {
      newSelected.delete(componenteId);
    } else {
      newSelected.add(componenteId);
    }
    setSelectedAjustes(newSelected);
  };

  const handleAplicar = async () => {
    try {
      setIsLoading(true);

      const ajustesSeleccionados = ajustes.filter(a =>
        selectedAjustes.has(a.componenteId)
      );

      if (ajustesSeleccionados.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Sin cambios',
          description: 'Selecciona al menos un componente para actualizar',
        });
        return;
      }

      const result = await aceptarEscandallosSugeridos(
        elaboracionId,
        ajustesSeleccionados
      );

      if (!result.success) {
        throw new Error(result.error || 'Error aplicando cambios');
      }

      toast({
        title: 'Escandalos actualizados',
        description: `${ajustesSeleccionados.length} componentes han sido ajustados`,
      });

      onSuccess();
      onClose();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e?.message || 'Error al aplicar cambios',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cambioPositivo = ajustes.reduce((sum, a) => sum + (a.cambioAbsoluto > 0 ? 1 : 0), 0);
  const cambioNegativo = ajustes.length - cambioPositivo;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Escandalos Sugeridos Basados en Producción
          </DialogTitle>
          <DialogDescription className="text-sm">
            Se han analizado <strong>{ajustes[0]?.produccionesAnalizadas || 0}</strong> producciones recientes.
            Los cambios sugeridos mejorarán la precisión de tus recetas.
          </DialogDescription>
        </DialogHeader>

        {/* ESTADÍSTICAS RESUMEN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-blue-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{ajustes.length}</div>
            <div className="text-xs text-muted-foreground">Componentes afectados</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-600 font-bold">
              <TrendingUp className="h-4 w-4" />
              {cambioNegativo}
            </div>
            <div className="text-xs text-muted-foreground">Reducir cantidad</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-orange-600 font-bold">
              <TrendingUp className="h-4 w-4" />
              {cambioPositivo}
            </div>
            <div className="text-xs text-muted-foreground">Aumentar cantidad</div>
          </div>
        </div>

        {/* TABLA DE AJUSTES */}
        <div className="border rounded-lg overflow-hidden bg-white">
          <Table className="text-xs sm:text-sm">
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead className="py-2 px-2 sm:px-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedAjustes.size === ajustes.length}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedAjustes(new Set(ajustes.map(a => a.componenteId)));
                      } else {
                        setSelectedAjustes(new Set());
                      }
                    }}
                    className="rounded"
                  />
                </TableHead>
                <TableHead className="py-2 px-2 sm:px-3 font-semibold">Componente</TableHead>
                <TableHead className="py-2 px-2 sm:px-3 font-semibold text-right">Actual</TableHead>
                <TableHead className="py-2 px-2 sm:px-3 font-semibold text-right">Sugerido</TableHead>
                <TableHead className="py-2 px-2 sm:px-3 font-semibold text-right">Cambio</TableHead>
                <TableHead className="py-2 px-2 sm:px-3 font-semibold text-right">Prod.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ajustes.map(ajuste => {
                const isSelected = selectedAjustes.has(ajuste.componenteId);
                const isPositive = ajuste.cambioAbsoluto > 0;

                return (
                  <TableRow
                    key={ajuste.componenteId}
                    className={`border-b ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <TableCell className="py-2 px-2 sm:px-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAjuste(ajuste.componenteId)}
                        className="rounded cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="py-2 px-2 sm:px-3 font-medium">
                      {ajuste.nombreComponente}
                    </TableCell>
                    <TableCell className="py-2 px-2 sm:px-3 text-right font-mono text-slate-600">
                      {ajuste.escandalloActual.toFixed(6)}
                    </TableCell>
                    <TableCell className="py-2 px-2 sm:px-3 text-right font-mono font-semibold">
                      {ajuste.escandalloSugerido.toFixed(6)}
                    </TableCell>
                    <TableCell
                      className={`py-2 px-2 sm:px-3 text-right font-mono font-semibold ${
                        isPositive ? 'text-orange-600' : 'text-green-600'
                      }`}
                    >
                      {isPositive ? '+' : ''}{ajuste.cambioPorcentaje.toFixed(2)}%
                      <div className="text-[9px] text-muted-foreground">
                        ({isPositive ? '+' : ''}{ajuste.cambioAbsoluto.toFixed(6)})
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 sm:px-3 text-right text-muted-foreground text-[10px]">
                      {ajuste.produccionesAnalizadas}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* INFO */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
          <div className="font-semibold mb-1">📊 Cómo funciona</div>
          <div className="text-xs leading-relaxed">
            Los cambios se calculan analizando cuántos ingredientes necesitaste realmente vs. los
            planificado en tus últimas producciones. Los escandalos se ajustan gradualmente para
            mejorar la precisión sin cambios drásticos.
          </div>
        </div>

        {/* FOOTER */}
        <DialogFooter className="flex gap-2 pt-3 border-t flex-col-reverse sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="text-sm"
          >
            Rechazar
          </Button>
          <Button
            onClick={handleAplicar}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
            disabled={isLoading || selectedAjustes.size === 0}
          >
            {isLoading ? 'Aplicando...' : `Aplicar ${selectedAjustes.size} Cambios`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
