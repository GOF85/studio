

'use client';

import { useMemo } from 'react';
import type { ServiceOrder, ObjetivosGasto, PersonalExterno, ComercialBriefing, GastronomyOrder } from '@/types';
import { Target, Info, RefreshCw } from 'lucide-react';
import { GASTO_LABELS } from '@/lib/constants';
import { formatCurrency, formatPercentage, formatNumber, calculateHours } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from '@/components/ui/separator';
import { useEventos, useComercialBriefings, useComercialAjustes, useObjetivosGastoPlantillas, usePersonalExterno, usePersonalExternoAjustes, useMaterialOrders, useTransporteOrders, useDecoracionOrders, useAtipicoOrders, useGastronomyOrders } from '@/hooks/use-data-queries';

type ModuleName = keyof typeof GASTO_LABELS;

interface ObjectiveDisplayProps {
  osId: string;
  moduleName: ModuleName;
  updateKey?: number; // To force re-render
}


export function ObjectiveDisplay({ osId, moduleName, updateKey }: ObjectiveDisplayProps) {
  // Eliminada toda lógica localStorage. Solo se usan hooks Supabase.
  // Obtener datos desde Supabase hooks
  const { data: eventos } = useEventos();
  const { data: briefings } = useComercialBriefings(osId);
  const { data: ajustes } = useComercialAjustes(osId);
  const { data: plantillas } = useObjetivosGastoPlantillas();
  const { data: personalExternoArr } = usePersonalExterno(osId);
  const { data: personalExternoAjustes } = usePersonalExternoAjustes(osId);
  const { data: materialOrders } = useMaterialOrders(osId);
  const { data: transporteOrders } = useTransporteOrders(osId);
  const { data: decoracionOrders } = useDecoracionOrders(osId);
  const { data: atipicoOrders } = useAtipicoOrders(osId);
  const { data: gastronomyOrders } = useGastronomyOrders(osId);

        const data = useMemo(() => {
          if (!eventos || !osId || !moduleName || !plantillas) return null;
          const currentOS = eventos.find(os => os.id === osId || os.serviceNumber === osId);
          if (!currentOS) return null;

          // Briefing y ajustes
          const currentBriefing = briefings && briefings.length > 0 ? briefings[0] : null;
          const totalBriefing = currentBriefing?.items?.reduce((acc: number, item: any) => acc + (item.asistentes * item.precioUnitario) + (item.importeFijo || 0), 0) || 0;
          const totalAjustes = (ajustes || []).reduce((sum: number, ajuste: {importe: number}) => sum + ajuste.importe, 0);
          const facturacionBruta = totalBriefing + totalAjustes;

          const agencyCommission = (facturacionBruta * (currentOS.agencyPercentage || 0) / 100) + (currentOS.agencyCommissionValue || 0);
          const spaceCommission = (facturacionBruta * (currentOS.spacePercentage || 0) / 100) + (currentOS.spaceCommissionValue || 0);
          const facturacionNeta = facturacionBruta - agencyCommission - spaceCommission;

          // Plantilla
          const plantillaGuardadaId = currentOS.objetivoGastoId || null;
          const plantilla = plantillas.find((p: ObjetivosGasto) => p.id === plantillaGuardadaId) || plantillas.find((p: ObjetivosGasto) => p.nombre.toLowerCase() === 'micecatering') || plantillas[0];
          if (!plantilla) return null;
          const objectivePct = (plantilla[moduleName] || 0) / 100;
          const objectiveValue = facturacionNeta * objectivePct;

          let budgetValue = 0;
          if (moduleName === 'personal_externo') {
            const personalExternoData = Array.isArray(personalExternoArr) ? personalExternoArr.find((p: any) => p.osId === osId) : null;
            const allPersonalExternoAjustes = Array.isArray(personalExternoAjustes) ? personalExternoAjustes : [];
            const costeTurnos = personalExternoData?.turnos?.reduce((sum: number, turno: any) => {
              const plannedHours = calculateHours(turno.horaEntrada, turno.horaSalida);
              const asignaciones = turno.asignaciones || [];
              const quantity = asignaciones.length > 0 ? asignaciones.length : 1;
              return sum + (plannedHours * (turno.precioHora || 0) * quantity);
            }, 0) || 0;
            const costeAjustes = allPersonalExternoAjustes.reduce((sum: number, ajuste: any) => sum + ajuste.importe, 0);
            budgetValue = costeTurnos + costeAjustes;
          } else {
            switch(moduleName) {
              case 'gastronomia':
                budgetValue = (gastronomyOrders || []).filter((o: any) => o.osId === osId).reduce((sum: number, o: any) => sum + (o.total || 0), 0);
                break;
              case 'bodega':
                budgetValue = (materialOrders || []).filter((o: any) => o.osId === osId && o.type === 'Bodega').reduce((s: number, o: any) => s + o.total, 0);
                break;
              case 'consumibles':
                budgetValue = (materialOrders || []).filter((o: any) => o.osId === osId && o.type === 'Bio').reduce((s: number, o: any) => s + o.total, 0);
                break;
              case 'almacen':
                budgetValue = (materialOrders || []).filter((o: any) => o.osId === osId && o.type === 'Almacen').reduce((s: number, o: any) => s + o.total, 0);
                break;
              case 'alquiler':
                budgetValue = (materialOrders || []).filter((o: any) => o.osId === osId && o.type === 'Alquiler').reduce((s: number, o: any) => s + o.total, 0);
                break;
              case 'transporte':
                budgetValue = (transporteOrders || []).filter((o: any) => o.osId === osId).reduce((s: number, o: any) => s + o.precio, 0);
                break;
              case 'decoracion':
                budgetValue = (decoracionOrders || []).filter((o: any) => o.osId === osId).reduce((s: number, o: any) => s + o.precio, 0);
                break;
              case 'atipicos':
                budgetValue = (atipicoOrders || []).filter((o: any) => o.osId === osId).reduce((s: number, o: any) => s + o.precio, 0);
                break;
              default:
                budgetValue = 0;
            }
          }
          return {
            objective: objectiveValue,
            objectivePct,
            budget: budgetValue,
            facturacionNeta
          };
        }, [eventos, osId, moduleName, plantillas, briefings, ajustes, personalExternoArr, personalExternoAjustes, materialOrders, transporteOrders, decoracionOrders, atipicoOrders, gastronomyOrders, updateKey]);


    if (!data) return null;

    // Calculate if budget is exceeded
    const budgetPct = data.facturacionNeta ? data.budget / data.facturacionNeta : 0;
    const isExceeded = data.budget > data.objective;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
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

  

    
