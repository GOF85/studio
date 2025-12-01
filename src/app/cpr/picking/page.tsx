

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, ListChecks, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, UtensilsCrossed, RefreshCw } from 'lucide-react';
import type { ServiceOrder, PickingState, PedidoEntrega, ProductoVenta, EntregaHito, ComercialBriefing, ComercialBriefingItem, Receta, OrdenFabricacion, GastronomyOrder } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';


const ITEMS_PER_PAGE = 20;

type HitoDePicking = ComercialBriefingItem & {
    serviceOrder: ServiceOrder;
    expedicion: string;
    pickingStatus: PickingState['status'];
};

export default function PickingPage() {
  const [allHitos, setAllHitos] = useState<HitoDePicking[]>([]);
  const [pickingStates, setPickingStates] = useState<Record<string, PickingState>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const { toast } = useToast();

  const loadData = useCallback(() => {
    const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.vertical !== 'Entregas');
    const allBriefings = (JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[]);
    const allPickingStatesData = JSON.parse(localStorage.getItem('pickingStates') || '{}') as Record<string, PickingState>;

    setPickingStates(allPickingStatesData);
    
    const osMap = new Map(allServiceOrders.map(os => [os.id, os]));
    const hitosDePicking: HitoDePicking[] = [];

    allBriefings.forEach(briefing => {
        const serviceOrder = osMap.get(briefing.osId);
        if (serviceOrder && briefing.items) {
            briefing.items.forEach((hito, index) => {
                // Correctly find the picking state by hito ID, not OS ID
                const pickingState = allPickingStatesData[hito.id];
                hitosDePicking.push({
                    ...hito,
                    serviceOrder,
                    expedicion: `${serviceOrder.serviceNumber}.${(index + 1).toString().padStart(2, '0')}`,
                    pickingStatus: pickingState?.status || 'Pendiente',
                });
            });
        }
    });
      
    setAllHitos(hitosDePicking.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
  }, []);

  useEffect(() => {
    loadData();
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pickingStates' || e.key === 'comercialBriefings' || e.key === 'gastronomyOrders') {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadData]);
  
  const progressMap = useMemo(() => {
    const newProgressMap = new Map<string, { checked: number; total: number; percentage: number; isComplete: boolean; }>();
    if (!isMounted) return newProgressMap;

    const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const allOFs = (JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[]);
    const ofsMap = new Map(allOFs.map(of => [of.id, of]));

    allHitos.forEach(hito => {
      let progress = { checked: 0, total: 0, percentage: 100, isComplete: true };
      
      if (hito.conGastronomia) {
          const gastroOrder = allGastroOrders.find(go => go.id === hito.id);
          const gastroItems = gastroOrder?.items?.filter(item => item.type === 'item') || [];

          const elaboracionesNecesarias = new Set<string>();
          gastroItems.forEach(item => {
              const receta = allRecetas.find(r => r.id === item.id);
              if (receta) {
                  (receta.elaboraciones || []).forEach(elab => {
                      elaboracionesNecesarias.add(elab.elaboracionId);
                  });
              }
          });

          const totalItems = elaboracionesNecesarias.size;

          if (totalItems === 0) {
              progress = { checked: 0, total: 0, percentage: 100, isComplete: true };
          } else {
              const hitoPickingState = pickingStates[hito.id];
              const elaboracionesAsignadas = new Set<string>();

              if (hitoPickingState?.itemStates) {
                  hitoPickingState.itemStates.forEach(assignedLote => {
                      const of = ofsMap.get(assignedLote.ofId);
                      if (of && elaboracionesNecesarias.has(of.elaboracionId)) {
                          elaboracionesAsignadas.add(of.elaboracionId);
                      }
                  });
              }
              
              const checkedCount = elaboracionesAsignadas.size;
              const percentage = totalItems > 0 ? (checkedCount / totalItems) * 100 : 100;
              
              progress = {
                  checked: checkedCount,
                  total: totalItems,
                  percentage: percentage,
                  isComplete: checkedCount >= totalItems,
              };
          }
      }
      newProgressMap.set(hito.id, progress);
    });

    return newProgressMap;
  }, [allHitos, pickingStates, isMounted]);

  const filteredHitos = useMemo(() => {
    return allHitos.filter(hito => {
      const searchMatch = 
        hito.expedicion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hito.serviceOrder.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hito.serviceOrder.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (hito.serviceOrder.finalClient || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        hito.descripcion.toLowerCase().includes(searchTerm.toLowerCase());

      let dateMatch = true;
      if(dateRange?.from) {
        const hitoDate = new Date(hito.fecha);
        if (dateRange.to) {
            dateMatch = isWithinInterval(hitoDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
        } else {
            dateMatch = isWithinInterval(hitoDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
        }
      }

      return searchMatch && dateMatch;
    });
  }, [allHitos, searchTerm, dateRange]);

  const { incompleteHitos, completeHitos } = useMemo(() => {
    const incomplete: typeof filteredHitos = [];
    const complete: typeof filteredHitos = [];

    filteredHitos.forEach(hito => {
      const progress = progressMap.get(hito.id);
      if (progress?.isComplete) {
        complete.push(hito);
      } else {
        incomplete.push(hito);
      }
    });

    return { incompleteHitos: incomplete, completeHitos: complete };
  }, [filteredHitos, progressMap]);

  const paginatedHitos = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return incompleteHitos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [incompleteHitos, currentPage]);

  const totalPages = Math.ceil(incompleteHitos.length / ITEMS_PER_PAGE);

  const handleRefresh = () => {
    loadData();
    toast({ title: "Datos actualizados", description: "El estado de todos los pickings ha sido recalculado." });
  };

