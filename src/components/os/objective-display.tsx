

'use client';

import { useMemo } from 'react';
import { Target } from 'lucide-react';
import { GASTO_LABELS } from '@/lib/constants';
import { formatCurrency, formatPercentage, calculateHours } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from '@/components/ui/separator';
import { useEventos, useComercialBriefings, useComercialAjustes, useObjetivosGasto, usePersonalExterno, usePersonalExternoAjustes, useMaterialOrders, useGastronomyOrders, useHieloOrders, useTransporteOrders, useDecoracionOrders, useAtipicoOrders, usePersonalMiceOrders, usePruebasMenu } from '@/hooks/use-data-queries';
import { Skeleton } from '@/components/ui/skeleton';
import { ComercialBriefingItem } from '@/types';

type ModuleName = keyof typeof GASTO_LABELS;

interface ObjectiveDisplayProps {
  osId: string;
  moduleName: ModuleName;
  updateKey?: number; // To force re-render
}


export function ObjectiveDisplay({ osId, moduleName, updateKey }: ObjectiveDisplayProps) {
  const { data: eventosData, isLoading: isLoadingEventos } = useEventos();
  const { data: comercialBriefingsData, isLoading: isLoadingBriefings } = useComercialBriefings(osId);
  const { data: comercialAjustesData, isLoading: isLoadingAjustes } = useComercialAjustes(osId);
  const { data: objetivosGastoData, isLoading: isLoadingObjetivos } = useObjetivosGasto();
  const { data: personalExternoData, isLoading: isLoadingPersonalExterno } = usePersonalExterno(osId);
  const { data: personalExternoAjustesData, isLoading: isLoadingPersonalExternoAjustes } = usePersonalExternoAjustes(osId);
  const { data: materialOrdersData, isLoading: isLoadingMaterial } = useMaterialOrders(osId);
  const { data: gastronomyOrdersData, isLoading: isLoadingGastro } = useGastronomyOrders(osId);
  const { data: hieloOrdersData, isLoading: isLoadingHielo } = useHieloOrders(osId);
  const { data: transporteOrdersData, isLoading: isLoadingTransporte } = useTransporteOrders(osId);
  const { data: decoracionOrdersData, isLoading: isLoadingDecoracion } = useDecoracionOrders(osId);
  const { data: atipicosOrdersData, isLoading: isLoadingAtipicos } = useAtipicoOrders(osId);
  const { data: personalMiceOrdersData, isLoading: isLoadingMice } = usePersonalMiceOrders(osId);
  const { data: pruebasMenuData, isLoading: isLoadingPruebasMenu } = usePruebasMenu(osId);


  const data = useMemo(() => {
    if (isLoadingEventos || isLoadingBriefings || isLoadingAjustes || isLoadingObjetivos) return null;
    
    const currentOS = eventosData?.find(os => os.id === osId);
    if (!currentOS) return null;

    const currentBriefing = comercialBriefingsData?.[0];
    const allAjustes = comercialAjustesData || [];
    
    const totalBriefing = currentBriefing?.items.reduce((acc:number, item:ComercialBriefingItem) => acc + (item.asistentes * item.precioUnitario) + (item.importeFijo || 0), 0) || 0;
    const totalAjustes = allAjustes.reduce((sum: number, ajuste: {importe: number}) => sum + ajuste.importe, 0);
    const facturacionBruta = totalBriefing + totalAjustes;
    
    const agencyCommission = (facturacionBruta * (currentOS.agencyPercentage || 0) / 100) + (currentOS.agencyCommissionValue || 0);
    const spaceCommission = (facturacionBruta * (currentOS.spacePercentage || 0) / 100) + (currentOS.spaceCommissionValue || 0);
    const facturacionNeta = facturacionBruta - agencyCommission - spaceCommission;

    const plantilla = objetivosGastoData?.find(p => p.id === currentOS.objetivoGastoId) || objetivosGastoData?.find(p => p.name === 'Micecatering') || objetivosGastoData?.[0];

    if (!plantilla) return null;
    
    const objectivePct = (plantilla[moduleName] || 0) / 100;
    const objectiveValue = facturacionNeta * objectivePct;

    let budgetValue = 0;
    
    if (moduleName === 'personalExterno') {
      if (isLoadingPersonalExterno || isLoadingPersonalExternoAjustes) return null;
      const personalExternoDataUnico = personalExternoData?.[0] || null;
      const costeTurnos = personalExternoDataUnico?.turnos.reduce((sum, turno) => {
        const plannedHours = calculateHours(turno.horaEntrada, turno.horaSalida);
        const quantity = (turno.asignaciones || []).length > 0 ? turno.asignaciones.length : 1;
        return sum + (plannedHours * (turno.precioHora || 0) * quantity);
      }, 0) || 0;

      const costeAjustes = personalExternoAjustesData?.reduce((sum: number, ajuste) => sum + ajuste.importe, 0) || 0;
      budgetValue = costeTurnos + costeAjustes;
    } else {
      if (isLoadingMaterial || isLoadingGastro || isLoadingHielo || isLoadingTransporte || isLoadingDecoracion || isLoadingAtipicos || isLoadingMice || isLoadingPruebasMenu) return null;
      switch(moduleName) {
        case 'gastronomia':
          budgetValue = gastronomyOrdersData?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
          break;
        case 'bodega':
          budgetValue = materialOrdersData?.filter(o => o.type === 'Bodega').reduce((s, o) => s + o.total, 0) || 0;
          break;
        case 'consumibles':
          budgetValue = materialOrdersData?.filter(o => o.type === 'Bio').reduce((s, o) => s + o.total, 0) || 0;
          break;
        case 'hielo':
          budgetValue = hieloOrdersData?.reduce((s, o) => s + o.total, 0) || 0;
          break;
        case 'almacen':
          budgetValue = materialOrdersData?.filter(o => o.type === 'Almacen').reduce((s, o) => s + o.total, 0) || 0;
          break;
        case 'alquiler':
          budgetValue = materialOrdersData?.filter(o => o.type === 'Alquiler').reduce((s, o) => s + o.total, 0) || 0;
          break;
        case 'transporte':
          budgetValue = transporteOrdersData?.reduce((s, o) => s + o.precio, 0) || 0;
          break;
        case 'decoracion':
          budgetValue = decoracionOrdersData?.reduce((s, o) => s + o.precio, 0) || 0;
          break;
        case 'atipicos':
          budgetValue = atipicosOrdersData?.reduce((s, o) => s + o.precio, 0) || 0;
          break;
        case 'personalMice':
          budgetValue = personalMiceOrdersData?.reduce((sum, order) => {
            const hours = calculateHours(order.horaEntrada, order.horaSalida);
            return sum + (hours * (order.precioHora || 0));
          }, 0) || 0;
          break;
        case 'costePruebaMenu':
          const prueba = pruebasMenuData?.[0];
          budgetValue = prueba?.costePruebaMenu || 0;
          break;
      }
    }

    return {
      objective: objectiveValue,
      objectivePct,
      budget: budgetValue,
      facturacionNeta,
    };
  }, [
    osId, moduleName, 
    eventosData, comercialBriefingsData, comercialAjustesData, objetivosGastoData,
    personalExternoData, personalExternoAjustesData, materialOrdersData, gastronomyOrdersData,
    hieloOrdersData, transporteOrdersData, decoracionOrdersData, atipicosOrdersData,
    personalMiceOrdersData, pruebasMenuData,
    isLoadingEventos, isLoadingBriefings, isLoadingAjustes, isLoadingObjetivos,
    isLoadingPersonalExterno, isLoadingPersonalExternoAjustes, isLoadingMaterial,
    isLoadingGastro, isLoadingHielo, isLoadingTransporte, isLoadingDecoracion,
    isLoadingAtipicos, isLoadingMice, isLoadingPruebasMenu
  ]);

  const isLoading = isLoadingEventos || isLoadingBriefings || isLoadingAjustes || isLoadingObjetivos || (data === null);

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (!data) {
    return null;
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

  

    
