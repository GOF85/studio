
'use client';

import * as React from "react"
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Euro, Target, Settings, TrendingUp, TrendingDown, RefreshCw, Info, MessageSquare, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { ServiceOrder, ComercialBriefing, GastronomyOrder, MaterialOrder, TransporteOrder, HieloOrder, DecoracionOrder, AtipicoOrder, PersonalMiceOrder, PersonalExterno, PruebaMenuData, CtaExplotacionObjetivos, PersonalExternoAjuste, ObjetivosGasto, ReturnSheet, CategoriaPersonal } from '@/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { GASTO_LABELS } from '@/lib/constants';
import { formatNumber, formatCurrency, formatPercentage, calculateHours } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";

type CostRow = {
  label: string;
  presupuesto: number;
  cierre: number;
  real: number;
  objetivo: number;
  objetivo_pct: number;
  comentario?: string;
};

const calculatePersonalMiceTotal = (orders: PersonalMiceOrder[], type: 'planned' | 'real') => {
    return orders.reduce((sum, order) => {
        const hours = type === 'real' && order.horaEntradaReal && order.horaSalidaReal 
            ? calculateHours(order.horaEntradaReal, order.horaSalidaReal)
            : calculateHours(order.horaEntrada, order.horaSalida);
        const price = order.precioHora || 0;
        return sum + (hours * price);
    }, 0);
};

const calculatePersonalExternoTotal = (personalExterno: PersonalExterno | null, ajustes: PersonalExternoAjuste[], type: 'planned' | 'real') => {
    if (!personalExterno) return 0;

    const costeTurnos = personalExterno.turnos.reduce((sum, turno) => {
        if (type === 'real') {
            return sum + (turno.asignaciones || []).reduce((sumAsignacion, asignacion) => {
                const realHours = calculateHours(asignacion.horaEntradaReal, asignacion.horaSalidaReal);
                const hoursToUse = realHours > 0 ? realHours : calculateHours(turno.horaEntrada, turno.horaSalida);
                return sumAsignacion + hoursToUse * (turno.precioHora || 0);
            }, 0);
        }
        // Planned cost
        const plannedHours = calculateHours(turno.horaEntrada, turno.horaSalida);
        const quantity = (turno.asignaciones || []).length > 0 ? turno.asignaciones.length : 1;
        return sum + (plannedHours * (turno.precioHora || 0) * quantity);
    }, 0);

    const costeAjustes = ajustes.reduce((sum, ajuste) => sum + ajuste.importe, 0);
    
    return costeTurnos + costeAjustes;
};


export default function CtaExplotacionPage() {
  const router = useRouter();
  const params = useParams();
  const osId = params.numero_expediente as string;
  const { toast } = useToast();
  const [updateKey, setUpdateKey] = useState(Date.now());

  const [ctaData, setCtaData] = useState<{
    serviceOrder: ServiceOrder | null;
    objetivosPlantillas: ObjetivosGasto[];
    objetivos: ObjetivosGasto;
    costes: Omit<CostRow, 'objetivo' | 'objetivo_pct' | 'real' | 'comentario'>[];
    facturacionNeta: number;
  } | null>(null);

  const [realCostInputs, setRealCostInputs] = useState<Record<string, number | undefined>>({});
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [editingComment, setEditingComment] = useState<{label: string, text: string} | null>(null);

  const loadData = useCallback(() => {
    if (!osId) return;

    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId) || null;

    const storedPlantillas = JSON.parse(localStorage.getItem('objetivosGastoPlantillas') || '[]') as ObjetivosGasto[];
    const storedComentarios = JSON.parse(localStorage.getItem('ctaComentarios') || '{}')[osId] || {};
    setComentarios(storedComentarios);
    
    // Load real costs from localStorage for persistence
    const storedRealCosts = JSON.parse(localStorage.getItem('ctaRealCosts') || '{}')[osId] || {};
    setRealCostInputs(storedRealCosts);
    
    let appliedObjetivos: ObjetivosGasto;
    let plantillaGuardadaId = currentOS?.objetivoGastoId;
    
    const defaultObjetivos: ObjetivosGasto = { name: 'Por defecto', id: 'default', gastronomia: 0, bodega: 0, consumibles: 0, hielo: 0, almacen: 0, alquiler: 0, transporte: 0,
            decoracion: 0, atipicos: 0, personalMice: 0, personalExterno: 0, costePruebaMenu: 0 };
    
    if (!plantillaGuardadaId) {
        plantillaGuardadaId = localStorage.getItem('defaultObjetivoGastoId');
    }

    if (plantillaGuardadaId) {
        const plantilla = storedPlantillas.find(p => p.id === plantillaGuardadaId);
        appliedObjetivos = plantilla || (storedPlantillas.length > 0 ? storedPlantillas[0] : defaultObjetivos);
    } else if (storedPlantillas.length > 0) {
        appliedObjetivos = storedPlantillas.find(p => p.name === 'Micecatering') || storedPlantillas[0];
    } else {
        appliedObjetivos = defaultObjetivos;
    }

    if (currentOS && !currentOS.objetivoGastoId) {
        const osIndex = allServiceOrders.findIndex(os => os.id === osId);
        if (osIndex !== -1) {
            allServiceOrders[osIndex] = { ...allServiceOrders[osIndex], objetivoGastoId: appliedObjetivos.id };
            localStorage.setItem('serviceOrders', JSON.stringify(allServiceOrders));
        }
    }


    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const currentBriefing = allBriefings.find(b => b.osId === osId);
    const totalBriefing = currentBriefing?.items.reduce((acc, item) => acc + (item.asistentes * item.precioUnitario) + (item.importeFijo || 0), 0) || 0;
    
    const allAjustes = (JSON.parse(localStorage.getItem('comercialAjustes') || '{}')[osId] || []) as { importe: number }[];
    const totalAjustes = allAjustes.reduce((sum: number, ajuste: {importe: number}) => sum + ajuste.importe, 0);
    const facturacionBruta = totalBriefing + totalAjustes;

    const agencyCommission = (facturacionBruta * (currentOS?.agencyPercentage || 0) / 100) + (currentOS?.agencyCommissionValue || 0);
    const spaceCommission = (facturacionBruta * (currentOS?.spacePercentage || 0) / 100) + (currentOS?.spaceCommissionValue || 0);
    const netRevenue = facturacionBruta - agencyCommission - spaceCommission;

    const getModuleTotal = (orders: {total?: number, precio?: number}[]) => orders.reduce((sum, order) => sum + (order.total ?? order.precio ?? 0), 0);
    
    const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    const gastronomyCost = allGastroOrders.filter(o => o.osId === osId).reduce((sum, order) => {
        const orderCost = (order.items || []).reduce((itemSum, item) => {
            if (item.type === 'item') {
                return itemSum + (item.costeMateriaPrima || 0) * (item.quantity || 0);
            }
            return itemSum;
        }, 0);
        return sum + orderCost;
    }, 0);

    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const allHieloOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
    const allTransporteOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    const allDecoracionOrders = JSON.parse(localStorage.getItem('decoracionOrders') || '[]') as DecoracionOrder[];
    const allAtipicoOrders = JSON.parse(localStorage.getItem('atipicosOrders') || '[]') as AtipicoOrder[];
    const allPersonalMiceOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[];
    const allPruebasMenu = JSON.parse(localStorage.getItem('pruebasMenu') || '[]') as PruebaMenuData[];
    const pruebaMenu = allPruebasMenu.find(p => p.osId === osId);
    
    const allPersonalExterno = JSON.parse(localStorage.getItem('personalExterno') || '[]') as PersonalExterno[];
    const personalExternoData = allPersonalExterno.find(p => p.osId === osId) || null;
    const allPersonalExternoAjustes = (JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}')[osId] || []) as PersonalExternoAjuste[];
    
    const allReturnSheets = Object.values(JSON.parse(localStorage.getItem('returnSheets') || '{}') as Record<string, ReturnSheet>).filter(s => s.osId === osId);
    let devolucionesPorCategoria: Record<string, number> = {};
    allReturnSheets.forEach(sheet => {
        sheet.items.forEach(item => {
            const itemKey = `${item.orderId}_${item.itemCode}`;
            const state = sheet.itemStates[itemKey];
            if (state && item.sentQuantity > state.returnedQuantity) {
                const perdida = (item.sentQuantity - state.returnedQuantity) * item.price;
                const categoria = item.category;
                if (categoria) {
                    devolucionesPorCategoria[categoria] = (devolucionesPorCategoria[categoria] || 0) + perdida;
                }
            }
        });
    });

    const getCierreCost = (label: string, presupuesto: number) => {
        const categoria = Object.keys(GASTO_LABELS).find(key => GASTO_LABELS[key as keyof typeof GASTO_LABELS] === label);
        const perdida = categoria ? (devolucionesPorCategoria[categoria as string] || 0) : 0;
        return presupuesto + perdida; // Sumamos la pérdida como un coste adicional
    };
    
    const costePersonalExternoPresupuesto = calculatePersonalExternoTotal(personalExternoData, allPersonalExternoAjustes, 'planned');
    const costePersonalExternoCierre = calculatePersonalExternoTotal(personalExternoData, allPersonalExternoAjustes, 'real');
    
    const newCostes = [
      { label: GASTO_LABELS.gastronomia, presupuesto: gastronomyCost, cierre: gastronomyCost },
      { label: GASTO_LABELS.bodega, presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bodega')), cierre: getCierreCost(GASTO_LABELS.bodega, getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bodega'))) },
      { label: GASTO_LABELS.consumibles, presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bio')), cierre: getCierreCost(GASTO_LABELS.consumibles, getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bio')))},
      { label: GASTO_LABELS.hielo, presupuesto: getModuleTotal(allHieloOrders.filter(o => o.osId === osId)), cierre: getModuleTotal(allHieloOrders.filter(o => o.osId === osId)) },
      { label: GASTO_LABELS.almacen, presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Almacen')), cierre: getCierreCost(GASTO_LABELS.almacen, getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Almacen')))},
      { label: GASTO_LABELS.alquiler, presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Alquiler')), cierre: getCierreCost(GASTO_LABELS.alquiler, getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Alquiler')))},
      { label: GASTO_LABELS.transporte, presupuesto: getModuleTotal(allTransporteOrders.filter(o => o.osId === osId)), cierre: getModuleTotal(allTransporteOrders.filter(o => o.osId === osId)) },
      { label: GASTO_LABELS.decoracion, presupuesto: getModuleTotal(allDecoracionOrders.filter(o => o.osId === osId)), cierre: getModuleTotal(allDecoracionOrders.filter(o => o.osId === osId)) },
      { label: GASTO_LABELS.atipicos, presupuesto: getModuleTotal(allAtipicoOrders.filter(o => o.osId === osId)), cierre: getModuleTotal(allAtipicoOrders.filter(o => o.osId === osId)) },
      { label: GASTO_LABELS.personalMice, presupuesto: calculatePersonalMiceTotal(allPersonalMiceOrders.filter(o => o.osId === osId), 'planned'), cierre: calculatePersonalMiceTotal(allPersonalMiceOrders.filter(o => o.osId === osId), 'real') },
      { label: GASTO_LABELS.personalExterno, presupuesto: costePersonalExternoPresupuesto, cierre: costePersonalExternoCierre },
      { label: GASTO_LABELS.costePruebaMenu, presupuesto: pruebaMenu?.costePruebaMenu || 0, cierre: pruebaMenu?.costePruebaMenu || 0 },
    ];
    
    setCtaData({
        serviceOrder: currentOS,
        objetivosPlantillas: storedPlantillas,
        objetivos: appliedObjetivos,
        costes: newCostes,
        facturacionNeta: netRevenue,
    });
  }, [osId, updateKey]);

  useEffect(() => {
    if (osId) {
      loadData();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
      router.push('/pes');
    }
  }, [osId, router, toast, loadData]);
  
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && (event.key.includes('Orders') || event.key.includes('Ajustes') || event.key.includes('Briefings') || event.key.includes('ctaRealCosts'))) {
        setUpdateKey(Date.now());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  const handleObjetivoChange = (plantillaId: string) => {
    if (!osId || !ctaData) return;
    const plantilla = ctaData.objetivosPlantillas.find(p => p.id === plantillaId);
    if(plantilla) {
        setCtaData(prev => prev ? {...prev, objetivos: plantilla} : null);

        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const osIndex = allServiceOrders.findIndex(os => os.id === osId);
        if (osIndex !== -1) {
            allServiceOrders[osIndex] = { ...allServiceOrders[osIndex], objetivoGastoId: plantillaId };
            localStorage.setItem('serviceOrders', JSON.stringify(allServiceOrders));
            setCtaData(prev => prev ? {...prev, serviceOrder: allServiceOrders[osIndex]} : null);
            toast({ title: 'Plantilla aplicada', description: `Se ha aplicado la plantilla "${plantilla.name}".`});
        }
    }
  };
  
  const handleRealCostInputChange = (label: string, value: string) => {
    const numericValue = value === '' ? undefined : parseFloat(value) || 0;
    setRealCostInputs(prev => ({...prev, [label]: numericValue}));
  }

  const handleSaveRealCost = (label: string, value: string) => {
    const numericValue = value === '' ? undefined : parseFloat(value) || 0;
    const allCosts = JSON.parse(localStorage.getItem('ctaRealCosts') || '{}');
    if (!allCosts[osId]) {
      allCosts[osId] = {};
    }
    allCosts[osId][label] = numericValue;
    localStorage.setItem('ctaRealCosts', JSON.stringify(allCosts));
    toast({ title: "Coste Real Guardado", description: "El valor se ha guardado localmente."});
  };

  const handleSaveComentario = () => {
    if (!editingComment) return;
    const newComentarios = { ...comentarios, [editingComment.label]: editingComment.text };
    setComentarios(newComentarios);
    
    const allComentarios = JSON.parse(localStorage.getItem('ctaComentarios') || '{}');
    allComentarios[osId] = newComentarios;
    localStorage.setItem('ctaComentarios', JSON.stringify(allComentarios));
    
    setEditingComment(null);
    toast({ title: "Comentario guardado" });
  };
  
  const processedCostes: CostRow[] = useMemo(() => {
    if (!ctaData) return [];
    return ctaData.costes.map(coste => {
        const keyMap: {[key: string]: keyof Omit<ObjetivosGasto, 'id' | 'name'>} = {
            [GASTO_LABELS.gastronomia]: 'gastronomia', [GASTO_LABELS.bodega]: 'bodega', [GASTO_LABELS.consumibles]: 'consumibles', [GASTO_LABELS.hielo]: 'hielo',
            [GASTO_LABELS.almacen]: 'almacen', [GASTO_LABELS.alquiler]: 'alquiler', [GASTO_LABELS.transporte]: 'transporte', [GASTO_LABELS.decoracion]: 'decoracion',
            [GASTO_LABELS.atipicos]: 'atipicos', [GASTO_LABELS.personalMice]: 'personalMice', [GASTO_LABELS.personalExterno]: 'personalExterno',
            [GASTO_LABELS.costePruebaMenu]: 'costePruebaMenu'
        }
        const objKey = keyMap[coste.label];
        const objetivo_pct = (objKey && ctaData.objetivos?.[objKey] / 100) || 0;
        const realValue = realCostInputs[coste.label] ?? coste.cierre;
        return {
            ...coste,
            real: realValue,
            objetivo: ctaData.facturacionNeta * objetivo_pct,
            objetivo_pct: objetivo_pct,
            comentario: comentarios[coste.label] || '',
        }
    });
  }, [ctaData, realCostInputs, comentarios]);
  
  const totals = useMemo(() => {
    if (!processedCostes) return { totalPresupuesto: 0, totalCierre: 0, totalReal: 0, totalObjetivo: 0 };
    const totalPresupuesto = processedCostes.reduce((sum, row) => sum + row.presupuesto, 0);
    const totalCierre = processedCostes.reduce((sum, row) => sum + row.cierre, 0);
    const totalReal = processedCostes.reduce((sum, row) => sum + (row.real ?? row.cierre), 0);
    const totalObjetivo = processedCostes.reduce((sum, row) => sum + row.objetivo, 0);
    return { totalPresupuesto, totalCierre, totalReal, totalObjetivo };
  }, [processedCostes]);

  if (!ctaData) {
    return <LoadingSkeleton title="Cargando Cuenta de Explotación..." />;
  }
  
  const { serviceOrder, facturacionNeta, objetivos, objetivosPlantillas } = ctaData;

  const ingresosAsistente = serviceOrder?.asistentes ? facturacionNeta / serviceOrder.asistentes : 0;
  
  const rentabilidadPresupuesto = facturacionNeta - totals.totalPresupuesto;
  const rentabilidadPctPresupuesto = facturacionNeta > 0 ? rentabilidadPresupuesto / facturacionNeta : 0;
  const repercusionHQPresupuesto = rentabilidadPresupuesto * 0.25;
  const rentabilidadPostHQPresupuesto = rentabilidadPresupuesto - repercusionHQPresupuesto;
  const rentabilidadPostHQPctPresupuesto = facturacionNeta > 0 ? rentabilidadPostHQPresupuesto / facturacionNeta : 0;

  const rentabilidadCierre = facturacionNeta - totals.totalCierre;
  const rentabilidadPctCierre = facturacionNeta > 0 ? rentabilidadCierre / facturacionNeta : 0;
  const repercusionHQCierre = rentabilidadCierre * 0.25;
  const rentabilidadPostHQCierre = rentabilidadCierre - repercusionHQCierre;
  const rentabilidadPostHQPctCierre = facturacionNeta > 0 ? rentabilidadPostHQCierre / facturacionNeta : 0;

  const rentabilidadReal = facturacionNeta - totals.totalReal;
  const rentabilidadPctReal = facturacionNeta > 0 ? rentabilidadReal / facturacionNeta : 0;
  const repercusionHQReal = rentabilidadReal * 0.25;
  const rentabilidadPostHQReal = rentabilidadReal - repercusionHQReal;
  const rentabilidadPostHQPctReal = facturacionNeta > 0 ? rentabilidadPostHQReal / facturacionNeta : 0;

  if (!serviceOrder) {
    return <LoadingSkeleton title="Cargando Cuenta de Explotación..." />;
  }
  
  const renderCostRow = (row: CostRow) => {
    const pctSFactPresupuesto = facturacionNeta > 0 ? row.presupuesto / facturacionNeta : 0;
    const pctSFactCierre = facturacionNeta > 0 ? row.cierre / facturacionNeta : 0;
    const pctSFactReal = facturacionNeta > 0 ? row.real / facturacionNeta : 0;
    const desviacion = row.objetivo - row.real;
    const desviacionPct = row.objetivo > 0 ? desviacion / row.objetivo : 0;
    
    return (
        <TableRow key={row.label} className="hover:bg-muted/50">
            <TableCell className={cn("p-0 font-medium sticky left-0 bg-background z-10", row.comentario && 'bg-amber-100')}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 h-full w-full px-2 py-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingComment({ label: row.label, text: row.comentario || '' })}>
                                <MessageSquare className={cn("h-4 w-4 text-muted-foreground", row.comentario && "text-amber-600 font-bold")} />
                            </Button>
                            {row.label}
                        </div>
                    </TooltipTrigger>
                    {row.comentario && <TooltipContent><p>{row.comentario}</p></TooltipContent>}
                </Tooltip>
            </TableCell>
            <TableCell className="py-1 px-2 text-right font-mono border-l bg-blue-50/50">{formatCurrency(row.presupuesto)}</TableCell>
            <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-r bg-blue-50/50">{formatPercentage(pctSFactPresupuesto)}</TableCell>
            
            <TableCell className="py-1 px-2 text-right font-mono border-l bg-amber-50/50">{formatCurrency(row.cierre)}</TableCell>
            <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-r bg-amber-50/50">{formatPercentage(pctSFactCierre)}</TableCell>

            <TableCell className="py-1 px-2 text-right border-l bg-green-50/50">
                <Input
                    type="number"
                    step="0.01"
                    placeholder={formatNumber(row.cierre, 2)}
                    value={realCostInputs[row.label] === undefined ? '' : realCostInputs[row.label]}
                    onChange={(e) => handleRealCostInputChange(row.label, e.target.value)}
                    onBlur={(e) => handleSaveRealCost(row.label, e.target.value)}
                    className="h-7 text-right w-28 ml-auto"
                />
            </TableCell>
            <TableCell className={cn("py-1 px-2 text-right font-mono border-r bg-green-50/50", pctSFactReal > row.objetivo_pct && row.objetivo_pct > 0 && "text-destructive font-bold")}>{formatPercentage(pctSFactReal)}</TableCell>
            
            <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-l">{formatCurrency(row.objetivo)}</TableCell>
            <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-r">{formatPercentage(row.objetivo_pct)}</TableCell>
            
            <TableCell className={cn("py-1 px-2 text-right font-mono border-l", desviacion < 0 && "text-destructive font-bold", desviacion > 0 && "text-green-600 font-bold")}>{formatCurrency(desviacion)}</TableCell>
            <TableCell className={cn("py-1 px-2 text-right font-mono border-r", desviacion < 0 && "text-destructive font-bold", desviacion > 0 && "text-green-600 font-bold")}>{formatPercentage(desviacionPct)}</TableCell>
        </TableRow>
    );
  };


  return (
    <TooltipProvider>
      <div className="space-y-6">
          <Card>
              <CardHeader className="flex-row items-center justify-between">
                  <div className="flex items-baseline gap-4">
                      <CardTitle className="flex items-center gap-2"><Euro/>Análisis de Costes</CardTitle>
                       <CardDescription>
                            Plantilla de objetivos aplicada: <strong>{objetivos.name}</strong>.
                        </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                      <Button onClick={loadData} variant="outline" size="sm">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Actualizar Totales
                      </Button>
                      <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon"><Settings/></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Plantilla de Objetivos</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                              {objetivosPlantillas.map(p => (
                                  <DropdownMenuItem key={p.id} onSelect={() => handleObjetivoChange(p.id)}>
                                      {p.name}
                                  </DropdownMenuItem>
                              ))}
                          </DropdownMenuGroup>
                      </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-t bg-primary/10 p-2 text-right">
                    <span className="text-lg font-bold">Facturación Neta: <span className="text-primary">{formatCurrency(facturacionNeta)}</span></span>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="p-2 sticky left-0 bg-muted/50 z-10 w-48">Partida</TableHead>
                                <TableHead colSpan={2} className="p-2 text-center border-l border-r">Presupuesto</TableHead>
                                <TableHead colSpan={2} className="p-2 text-center border-l border-r">
                                    Cierre
                                    <Tooltip><TooltipTrigger asChild><span className="ml-1.5 cursor-help"><Info className="h-3 w-3 inline text-muted-foreground"/></span></TooltipTrigger><TooltipContent><p>Presupuesto menos devoluciones y mermas.</p></TooltipContent></Tooltip>
                                </TableHead>
                                <TableHead colSpan={2} className="p-2 text-center border-l border-r">
                                    Real
                                </TableHead>
                                <TableHead colSpan={2} className="p-2 text-center border-l border-r">Objetivo</TableHead>
                                <TableHead colSpan={2} className="p-2 text-center border-l">Desviación (Real vs. Obj.)</TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                             {processedCostes.map(renderCostRow)}
                        </TableBody>
                    </Table>
                </div>
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp/>Análisis de Rentabilidad</CardTitle>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead className="w-1/4">Concepto</TableHead>
                              <TableHead className="text-right">Presupuesto</TableHead>
                              <TableHead className="text-right">Cierre</TableHead>
                              <TableHead className="text-right">Real</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                           <TableRow>
                              <TableCell className="font-medium">Facturación Neta</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(facturacionNeta)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(facturacionNeta)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(facturacionNeta)}</TableCell>
                          </TableRow>
                          <TableRow>
                              <TableCell className="font-medium">Total Costes</TableCell>
                              <TableCell className="text-right">{formatCurrency(totals.totalPresupuesto)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(totals.totalCierre)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(totals.totalReal)}</TableCell>
                          </TableRow>
                           <TableRow className="bg-muted/50">
                              <TableCell className="font-bold">Rentabilidad</TableCell>
                              <TableCell className={cn("text-right font-bold", rentabilidadPresupuesto >= 0 ? 'text-primary' : 'text-destructive')}>
                                {formatCurrency(rentabilidadPresupuesto)}
                              </TableCell>
                              <TableCell className={cn("text-right font-bold", rentabilidadCierre >= 0 ? 'text-primary' : 'text-destructive')}>
                                {formatCurrency(rentabilidadCierre)}
                              </TableCell>
                              <TableCell className={cn("text-right font-bold", rentabilidadReal >= 0 ? 'text-primary' : 'text-destructive')}>
                                {formatCurrency(rentabilidadReal)}
                              </TableCell>
                          </TableRow>
                           <TableRow>
                              <TableCell className="font-medium">Repercusión HQ (25%)</TableCell>
                              <TableCell className="text-right">{formatCurrency(repercusionHQPresupuesto)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(repercusionHQCierre)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(repercusionHQReal)}</TableCell>
                          </TableRow>
                           <TableRow className="bg-muted/50">
                              <TableCell className="font-bold">Rentabilidad Post-HQ</TableCell>
                              <TableCell className={cn("text-right font-bold", rentabilidadPostHQPresupuesto >= 0 ? 'text-primary' : 'text-destructive')}>
                                {formatCurrency(rentabilidadPostHQPresupuesto)}
                              </TableCell>
                              <TableCell className={cn("text-right font-bold", rentabilidadPostHQCierre >= 0 ? 'text-primary' : 'text-destructive')}>
                                {formatCurrency(rentabilidadPostHQCierre)}
                              </TableCell>
                              <TableCell className={cn("text-right font-bold", rentabilidadPostHQReal >= 0 ? 'text-primary' : 'text-destructive')}>
                                {formatCurrency(rentabilidadPostHQReal)}
                              </TableCell>
                          </TableRow>
                          <TableRow>
                              <TableCell className="font-medium">Ingresos / Asistente</TableCell>
                              <TableCell className="text-right" colSpan={3}>{formatCurrency(ingresosAsistente)}</TableCell>
                          </TableRow>
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
      </div>
      <Dialog open={!!editingComment} onOpenChange={() => setEditingComment(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Comentario para: {editingComment?.label}</DialogTitle>
                <DialogDescription>Añade una nota explicativa para esta partida de coste.</DialogDescription>
            </DialogHeader>
            <Textarea 
                value={editingComment?.text || ''}
                onChange={(e) => setEditingComment(prev => prev ? {...prev, text: e.target.value} : null)}
                rows={5}
            />
            <DialogFooter>
                <DialogClose asChild><Button variant="secondary">Cerrar</Button></DialogClose>
                <Button onClick={handleSaveComentario}><Save className="mr-2"/>Guardar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
