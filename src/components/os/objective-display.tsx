

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ServiceOrder, ObjetivosGasto } from '@/types';
import { Target, Info, RefreshCw } from 'lucide-react';
import { GASTO_LABELS } from '@/lib/constants';
import { formatCurrency, formatPercentage } from '@/lib/utils';
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
      const plantilla = storedPlantillas.find(p => p.id === plantillaGuardadaId) || storedPlantillas[0];

      if (!plantilla) return;
      
      const objectivePct = (plantilla[moduleName] || 0) / 100;
      const objectiveValue = facturacionNeta * objectivePct;

      const budgetValue = currentOS.costes?.[moduleName] || 0; // Read pre-calculated cost

      setData({
        objective: objectiveValue,
        objectivePct,
        budget: budgetValue,
        facturacionNeta,
      });
    }
  }, [osId, moduleName, isMounted, updateKey]);

  if (!isMounted || !data) {
    return (
      <div className="flex items-center gap-2 text-sm font-semibold p-2 rounded-md border bg-card animate-pulse">
        <Target className="h-5 w-5 text-primary"/>
        <div className="h-4 bg-muted rounded w-48"></div>
      </div>
    );
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
