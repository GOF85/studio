
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { differenceInDays, format, startOfToday, addDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { PackagePlus, Search, AlertTriangle, Euro } from 'lucide-react';
import type { OrdenFabricacion, Elaboracion, ServiceOrder, Receta, GastronomyOrder, ExcedenteProduccion, StockElaboracion, PickingState, LoteAsignado } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatNumber, formatUnit, formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type StockDisplayItem = {
  elaboracionId: string;
  elaboracionNombre: string;
  cantidadTotal: number;
  unidad: string;
  valoracion: number;
  caducidadProxima: string;
  estado: 'Apto' | 'Revisar';
};

export default function ExcedentesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const [stock, setStock] = useState<StockDisplayItem[]>([]);
  const [elaboracionesMap, setElaboracionesMap] = useState<Map<string, Elaboracion>>(new Map());

  useEffect(() => {
    const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const elabMap = new Map(allElaboraciones.map(e => [e.id, e]));
    setElaboracionesMap(elabMap);
    
    const allStock = JSON.parse(localStorage.getItem('stockElaboraciones') || '{}') as Record<string, StockElaboracion>;
    const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as Record<string, PickingState>;
    const allOFs = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
    const ofsMap = new Map(allOFs.map(of => [of.id, of]));

    // Calcular las cantidades asignadas en todos los pickings
    const assignedQuantities: Record<string, number> = {};
    Object.values(allPickingStates).forEach(pickingState => {
        (pickingState.itemStates || []).forEach(loteAsignado => {
            const of = ofsMap.get(loteAsignado.ofId);
            if (of) {
                const elabId = of.elaboracionId;
                assignedQuantities[elabId] = (assignedQuantities[elabId] || 0) + loteAsignado.quantity;
            }
        });
    });
    
    const stockItems: StockDisplayItem[] = Object.values(allStock).map(item => {
        const elab = elabMap.get(item.elaboracionId);
        const lotes = item.lotes || [];
        
        let caducidadProxima = 'N/A';
        let estado: 'Apto' | 'Revisar' = 'Apto';
        
        if (lotes.length > 0) {
            const sortedLotes = [...lotes].sort((a, b) => new Date(a.fechaCaducidad).getTime() - new Date(b.fechaCaducidad).getTime());
            const proximaFecha = new Date(sortedLotes[0].fechaCaducidad);
            caducidadProxima = format(proximaFecha, 'dd/MM/yyyy');
            if (isBefore(proximaFecha, new Date())) {
                estado = 'Revisar';
            }
        }
        
        const cantidadAsignada = assignedQuantities[item.elaboracionId] || 0;
        const cantidadDisponible = item.cantidadTotal - cantidadAsignada;
        const costeUnitario = elab?.costePorUnidad || 0;

        return {
            elaboracionId: item.elaboracionId,
            elaboracionNombre: elab?.nombre || 'Desconocido',
            cantidadTotal: cantidadDisponible,
            unidad: item.unidad,
            valoracion: cantidadDisponible * costeUnitario,
            caducidadProxima,
            estado
        };
    }).filter(item => item.cantidadTotal > 0.01);

    setStock(stockItems);
  }, []);

  const filteredItems = useMemo(() => {
    return stock.filter(item => 
      item.elaboracionNombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stock, searchTerm]);

  const totalStockValue = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + item.valoracion, 0);
  }, [filteredItems]);

