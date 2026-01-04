'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { EvolutionChart } from './evolution-chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { VariacionItem, EscandalloSnapshot } from '@/hooks/use-escandallo-analytics';

interface ItemHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: VariacionItem | null;
  calculateHistory?: (item: VariacionItem) => EscandalloSnapshot[];
}

export function ItemHistoryModal({ isOpen, onClose, item, calculateHistory }: ItemHistoryModalProps) {
  const [history, setHistory] = useState<EscandalloSnapshot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setLoading(true);
      // Timeout para no bloquear la animación de apertura del modal
      setTimeout(() => {
          const data = calculateHistory ? calculateHistory(item) : [];
          setHistory(data);
          setLoading(false);
      }, 50);
    }
  }, [isOpen, item, calculateHistory]);

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Histórico de {item.nombre}</DialogTitle>
        <DialogDescription className="sr-only">
          Consulta el histórico de precios y cambios del ítem seleccionado.
        </DialogDescription>
        
        {/* HEADER FIJO */}
        <DialogHeader className="px-6 py-4 border-b bg-background z-10">
          <DialogTitle className="text-xl flex items-center gap-2">
            {item.nombre}
            <Badge variant="secondary" className="text-xs font-normal uppercase">
              {item.tipo.replace('_', ' ')}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Histórico detallado del {format(parseISO(history[0]?.fecha || new Date().toISOString()), 'dd/MM/yyyy')} al presente
          </DialogDescription>
        </DialogHeader>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* GRÁFICA */}
          <div className="h-[300px] w-full border rounded-lg p-4 bg-white shadow-sm shrink-0">
             <EvolutionChart snapshots={history} isLoading={loading} activeTab={item.tipo + 's'} />
          </div>

          {/* TABLA */}
          <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
             <div className="bg-muted/30 px-4 py-3 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Registro diario de precios
             </div>
             
             {/* El scroll lo maneja el div padre (flex-1 overflow-y-auto), aquí solo pintamos la tabla completa */}
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead className="w-[150px]">Fecha</TableHead>
                   <TableHead>Precio</TableHead>
                   <TableHead className="text-right">Variación</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {loading ? (
                     <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">Generando histórico...</TableCell></TableRow>
                 ) : (
                     // Filtramos para no mostrar 300 días iguales
                     history.filter((h, i, arr) => i === 0 || i === arr.length - 1 || Math.abs(h.precio - arr[i-1].precio) > 0.0001)
                     .reverse()
                     .map((snap, i, arr) => {
                         const prev = arr[i+1]; 
                         const diff = prev ? snap.precio - prev.precio : 0;
                         const hasChange = Math.abs(diff) > 0.0001;
                         
                         return (
                           <TableRow key={snap.fecha} className="hover:bg-muted/5">
                             <TableCell className="font-medium text-sm">
                               {format(parseISO(snap.fecha), 'd MMM yyyy', { locale: es })}
                             </TableCell>
                             <TableCell className="font-mono text-sm">
                               {formatCurrency(snap.precio)}
                             </TableCell>
                             <TableCell className="text-right">
                                {hasChange ? (
                                  <Badge 
                                    variant="outline" 
                                    className={`font-mono font-normal border-0 ${
                                      diff > 0 
                                        ? "bg-rose-50 text-rose-700" 
                                        : "bg-emerald-50 text-emerald-700"
                                    }`}
                                  >
                                      {diff > 0 ? '▲' : '▼'} {formatCurrency(Math.abs(diff))}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground/30 text-xs">-</span>
                                )}
                             </TableCell>
                           </TableRow>
                         );
                     })
                 )}
               </TableBody>
             </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}