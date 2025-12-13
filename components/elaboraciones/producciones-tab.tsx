'use client';

import { useState, useEffect } from 'react';
import { ElaboracionProduccion, MediaProducciones } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Edit2, TrendingDown, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calcularMediaProducciones, calcularConfianza, formatearAjuste } from '@/lib/elaboraciones-helpers';
import { supabase } from '@/lib/supabase';

interface ProduccionesTabProps {
  elaboracionId: string;
  componentesBase: any[];
  cantidadPlanificada: number;
  onProduccionesLoaded?: (media: MediaProducciones) => void;
  onAñadirClick: () => void;
}

export function ProduccionesTab({
  elaboracionId,
  componentesBase,
  cantidadPlanificada,
  onProduccionesLoaded,
  onAñadirClick,
}: ProduccionesTabProps) {
  const [producciones, setProducciones] = useState<ElaboracionProduccion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaProducciones | null>(null);
  const { toast } = useToast();

  // Cargar producciones
  useEffect(() => {
    const loadProducciones = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('elaboracion_producciones')
          .select('*')
          .eq('elaboracion_id', elaboracionId)
          .order('fecha_produccion', { ascending: false });

        if (error) throw error;

        const typedData: ElaboracionProduccion[] = (data || []).map((p: any) => ({
          ...p,
          componentes_utilizados: p.componentes_utilizados || [],
        }));

        setProducciones(typedData);

        // Calcular media
        const mediaCalc = calcularMediaProducciones(
          typedData,
          componentesBase,
          cantidadPlanificada
        );
        setMedia(mediaCalc);

        if (onProduccionesLoaded) {
          onProduccionesLoaded(mediaCalc);
        }
      } catch (e: any) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: e.message });
      } finally {
        setIsLoading(false);
      }
    };

    loadProducciones();
  }, [elaboracionId, componentesBase, cantidadPlanificada, onProduccionesLoaded, toast]);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('elaboracion_producciones')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setProducciones(producciones.filter(p => p.id !== deleteId));
      setDeleteId(null);
      toast({ description: 'Producción eliminada.' });

      // Recalcular media
      const nuevosProducciones = producciones.filter(p => p.id !== deleteId);
      const mediaCalc = calcularMediaProducciones(
        nuevosProducciones,
        componentesBase,
        cantidadPlanificada
      );
      setMedia(mediaCalc);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando producciones...</div>;
  }

  const confianza = media ? calcularConfianza(media.totalProducciones, media.variabilidad) : 'baja';

  return (
    <div className="space-y-6">
      {/* STATS CARD */}
      {media && media.totalProducciones > 0 && (
        <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Producciones</p>
              <p className="text-2xl font-bold text-foreground">{media.totalProducciones}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Rendimiento Promedio</p>
              <p className="text-2xl font-bold text-foreground">{(media.rendimiento_promedio * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Variabilidad</p>
              <p className="text-2xl font-bold text-foreground">{(media.variabilidad * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Confianza</p>
              <div className="flex items-center gap-2 mt-1">
                {confianza === 'alta' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                {confianza === 'media' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                {confianza === 'baja' && <AlertCircle className="h-5 w-5 text-orange-600" />}
                <span className="text-sm font-semibold capitalize">{confianza}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AJUSTES SUGERIDOS */}
      {media && media.ajustes_sugeridos.length > 0 && media.totalProducciones >= 2 && (
        <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
          <h3 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Ajustes Sugeridos en Componentes
          </h3>
          <div className="space-y-2 text-sm">
            {media.ajustes_sugeridos.filter(a => Math.abs(a.ajuste_porcentaje) > 2).map(ajuste => (
              <div key={ajuste.componenteId} className="flex justify-between items-center p-2 bg-white rounded border border-amber-100">
                <div>
                  <p className="font-medium">{ajuste.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {ajuste.cantidad_actual.toFixed(2)} → {ajuste.cantidad_sugerida.toFixed(2)}
                  </p>
                </div>
                <div className={`font-bold text-sm ${ajuste.ajuste_porcentaje > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatearAjuste(ajuste.ajuste_porcentaje)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOTÓN AÑADIR PRODUCCIÓN */}
      <div className="flex justify-end">
        <Button 
          type="button" 
          onClick={onAñadirClick} 
          className="bg-green-600 hover:bg-green-700"
        >
          + Registrar Producción
        </Button>
      </div>

      {/* TABLA DE PRODUCCIONES */}
      {producciones.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed bg-muted/20">
          <p className="text-muted-foreground text-sm">No hay producciones registradas aún</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs">Fecha</TableHead>
                <TableHead className="text-xs">Responsable</TableHead>
                <TableHead className="text-xs text-right">Cantidad Producida</TableHead>
                <TableHead className="text-xs text-center">Componentes</TableHead>
                <TableHead className="text-xs text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {producciones.map(produccion => (
                <TableRow key={produccion.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-medium">
                    {formatDate(produccion.fecha_produccion)}
                  </TableCell>
                  <TableCell className="text-xs">{produccion.responsable}</TableCell>
                  <TableCell className="text-xs text-right font-semibold">
                    {produccion.cantidad_real_producida.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-center">
                    <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-[10px] font-semibold">
                      {produccion.componentes_utilizados?.length || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-right flex gap-1 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                      onClick={() => setEditingId(produccion.id)}
                      title="Editar"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(produccion.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Producción</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro? Se eliminará la producción y se recalculará la media.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
            Eliminar
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
