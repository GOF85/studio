

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ServiceOrder, ObjetivosGasto } from '@/types';
import { Target, Info, RefreshCw } from 'lucide-react';
import { GASTO_LABELS } from '@/lib/constants';
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from '@/components/ui/separator';

type ModuleName = keyof typeof GASTO_LABELS;

interface ObjectiveDisplayProps {
  osId: string;
  moduleName: ModuleName;
  updateKey?: number; // To force re-render
}

const calculateHours = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    try {
        const startTime = new Date(`1970-01-01T${start}:00`);
        const endTime = new Date(`1970-01-01T${end}:00`);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 0;
        const diff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        return diff > 0 ? diff : 0;
    } catch (e) {
        return 0;
    }
}

export function ObjectiveDisplay({ osId, moduleName, updateKey }: ObjectiveDisplayProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [data, setData] = useState<{
    objective: number;
    objectivePct: number;
    budget: number;
    facturacionNeta: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        setIsMounted(true);
    }
  }, []);

  useEffect(() => {
    if (isMounted && osId && moduleName) {
      const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
      const currentOS = allServiceOrders.find(os => os.id === osId);

      if (!currentOS) return;
      
      const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as any[];
      const allAjustes = (JSON.parse(localStorage.getItem('comercialAjustes') || '{}')[osId] || []) as { importe: number }[];
      const currentBriefing = allBriefings.find(b => b.osId === osId);
      const totalBriefing = currentBriefing?.items.reduce((acc:number, item:any) => acc + (item.asistentes * item.precioUnitario) + (item.importeFijo || 0), 0) || 0;
      const totalAjustes = allAjustes.reduce((sum: number, ajuste: {importe: number}) => sum + ajuste.importe, 0);
      const facturacionBruta = totalBriefing + totalAjustes;
      
      const agencyCommission = (facturacionBruta * (currentOS.agencyPercentage || 0) / 100) + (currentOS.agencyCommissionValue || 0);
      const spaceCommission = (facturacionBruta * (currentOS.spacePercentage || 0) / 100) + (currentOS.spaceCommissionValue || 0);
      const facturacionNeta = facturacionBruta - agencyCommission - spaceCommission;

      const storedPlantillas = JSON.parse(localStorage.getItem('objetivosGastoPlantillas') || '[]') as ObjetivosGasto[];
      const plantillaGuardadaId = currentOS.objetivoGastoId || localStorage.getItem('defaultObjetivoGastoId');
      const plantilla = storedPlantillas.find(p => p.id === plantillaGuardadaId) || storedPlantillas.find(p => p.name === 'Micecatering') || storedPlantillas[0];

      if (!plantilla) return;
      
      const objectivePct = (plantilla[moduleName] || 0) / 100;
      const objectiveValue = facturacionNeta * objectivePct;

      let budgetValue = 0;
      const materialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as any[];
      
      switch(moduleName) {
        case 'gastronomia':
            const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as any[];
            budgetValue = allGastroOrders.filter(o => o.osId === osId).reduce((sum, o) => sum + (o.total || 0), 0);
            break;
        case 'bodega':
            budgetValue = materialOrders.filter(o => o.osId === osId && o.type === 'Bodega').reduce((s, o) => s + o.total, 0);
            break;
        case 'consumibles':
            budgetValue = materialOrders.filter(o => o.osId === osId && o.type === 'Bio').reduce((s, o) => s + o.total, 0);
            break;
        case 'hielo':
            const allHieloOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as any[];
            budgetValue = allHieloOrders.filter(o => o.osId === osId).reduce((s, o) => s + o.total, 0);
            break;
        case 'almacen':
             budgetValue = materialOrders.filter(o => o.osId === osId && o.type === 'Almacen').reduce((s, o) => s + o.total, 0);
            break;
        case 'alquiler':
             budgetValue = materialOrders.filter(o => o.osId === osId && o.type === 'Alquiler').reduce((s, o) => s + o.total, 0);
            break;
        case 'transporte':
            const allTransporteOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as any[];
            budgetValue = allTransporteOrders.filter(o => o.osId === osId).reduce((s, o) => s + o.precio, 0);
            break;
        case 'decoracion':
            const allDecoracionOrders = JSON.parse(localStorage.getItem('decoracionOrders') || '[]') as any[];
            budgetValue = allDecoracionOrders.filter(o => o.osId === osId).reduce((s, o) => s + o.precio, 0);
            break;
        case 'atipicos':
            const allAtipicoOrders = JSON.parse(localStorage.getItem('atipicosOrders') || '[]') as any[];
            budgetValue = allAtipicoOrders.filter(o => o.osId === osId).reduce((s, o) => s + o.precio, 0);
            break;
        case 'personalMice':
            const allPersonalMiceOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as any[];
            budgetValue = allPersonalMiceOrders.filter(o => o.osId === osId).reduce((sum, order) => {
                const hours = calculateHours(order.horaEntrada, order.horaSalida);
                return sum + (hours * (order.precioHora || 0));
            }, 0);
            break;
        case 'personalExterno':
            const allPersonalExternoOrders = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as any[];
            const allPersonalExternoAjustes = (JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}')[osId] || []) as {ajuste: number}[];
            const costeTurnos = allPersonalExternoOrders.filter(o => o.osId === osId).reduce((sum, order) => {
                const hours = calculateHours(order.horaEntrada, order.horaSalida);
                return sum + (hours * (order.precioHora || 0) * (order.cantidad || 1));
            }, 0);
            const costeAjustes = allPersonalExternoAjustes.reduce((sum: number, ajuste) => sum + ajuste.ajuste, 0);
            budgetValue = costeTurnos + costeAjustes;
            break;
        case 'costePruebaMenu':
             const allPruebasMenu = JSON.parse(localStorage.getItem('pruebasMenu') || '[]') as any[];
             const prueba = allPruebasMenu.find(p => p.osId === osId);
             budgetValue = prueba?.costePruebaMenu || 0;
             break;
      }

      setData({
        objective: objectiveValue,
        objectivePct,
        budget: budgetValue,
        facturacionNeta,
      });
    }
  }, [osId, moduleName, isMounted, updateKey]);

  if (!isMounted || !data) {
    return null; // Or a loading skeleton
  }

  const isExceeded = data.budget > data.objective;
  const budgetPct = data.facturacionNeta > 0 ? data.budget / data.facturacionNeta : 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
              "flex items-center gap-2 text-sm font-semibold p-2 rounded-md border",
              isExceeded ? "bg-amber-100 border-amber-300" : "bg-card"
            )}>
              <Target className="h-5 w-5 text-primary"/>
              <span className="font-normal text-muted-foreground">Objetivos de gasto:</span>
              <span>{formatCurrency(data.objective)} ({formatPercentage(data.objectivePct)})</span>
              <span className="text-muted-foreground mx-1">/</span>
               <div className={cn(isExceeded ? "text-destructive" : "text-green-600")}>
                <span>Actual: {formatCurrency(data.budget)} ({formatPercentage(budgetPct)})</span>
              </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
            <div className="space-y-1 text-xs p-1">
                <p>El presupuesto actual de este módulo es <strong>{formatCurrency(data.budget)}</strong></p>
                <p>El objetivo es <strong>{formatCurrency(data.objective)}</strong></p>
                <Separator className="my-2"/>
                 <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Desviación:</span>
                    <span className={cn("font-bold", isExceeded ? "text-destructive" : "text-green-600")}>
                        {formatCurrency(data.budget - data.objective)}
                    </span>
                </div>
            </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
