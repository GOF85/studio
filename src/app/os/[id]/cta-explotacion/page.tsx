

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Euro, Target, Settings, TrendingUp, TrendingDown, RefreshCw, Info, MessageSquare, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { ServiceOrder, ComercialBriefing, GastronomyOrder, MaterialOrder, TransporteOrder, HieloOrder, DecoracionOrder, AtipicoOrder, PersonalMiceOrder, PersonalExternoOrder, PruebaMenuData, CtaExplotacionObjetivos, PersonalExternoAjuste, ObjetivosGasto, ReturnSheet } from '@/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { GASTO_LABELS } from '@/lib/constants';

type CostRow = {
  label: string;
  presupuesto: number;
  cierre: number;
  real: number;
  objetivo: number;
  objetivo_pct: number;
  comentario?: string;
};

const formatCurrency = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`;

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

const calculatePersonalTotal = (orders: {precioHora?: number; horaEntrada: string; horaSalida: string; cantidad?: number}[]) => {
    return orders.reduce((sum, order) => {
        const hours = calculateHours(order.horaEntrada, order.horaSalida);
        const quantity = order.cantidad || 1;
        const price = order.precioHora || 0;
        return sum + (hours * price * quantity);
    }, 0);
};

export default function CtaExplotacionPage() {
  const router = useRouter();
  const params = useParams();
  const osId = params.id as string;
  const { toast } = useToast();

  const [ctaData, setCtaData] = useState<{
    serviceOrder: ServiceOrder | null;
    objetivosPlantillas: ObjetivosGasto[];
    objetivos: ObjetivosGasto;
    costes: Omit<CostRow, 'objetivo' | 'objetivo_pct' | 'real' | 'comentario'>[];
    facturacionNeta: number;
  } | null>(null);

  const [realCostInputs, setRealCostInputs] = useState<Record<string, number>>({});
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [editingComment, setEditingComment] = useState<{label: string, text: string} | null>(null);

  const loadData = useCallback(() => {
    if (!osId) return;

    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId) || null;

    const storedPlantillas = JSON.parse(localStorage.getItem('objetivosGastoPlantillas') || '[]') as ObjetivosGasto[];
    const storedComentarios = JSON.parse(localStorage.getItem('ctaComentarios') || '{}')[osId] || {};
    setComentarios(storedComentarios);
    
    let appliedObjetivos: ObjetivosGasto;
    const plantillaGuardadaId = currentOS?.objetivoGastoId;
    
    const defaultObjetivos: ObjetivosGasto = { name: 'Por defecto', id: 'default', gastronomia: 0, bodega: 0, consumibles: 0, hielo: 0, almacen: 0, alquiler: 0, transporte: 0,
            decoracion: 0, atipicos: 0, personalMice: 0, personalExterno: 0, costePruebaMenu: 0 };

    if (plantillaGuardadaId) {
        const plantilla = storedPlantillas.find(p => p.id === plantillaGuardadaId);
        appliedObjetivos = plantilla || (storedPlantillas.length > 0 ? storedPlantillas[0] : defaultObjetivos);
    } else if (storedPlantillas.length > 0) {
        appliedObjetivos = storedPlantillas[0];
        if (currentOS) {
            const osIndex = allServiceOrders.findIndex(os => os.id === osId);
            if (osIndex !== -1) {
              allServiceOrders[osIndex] = { ...allServiceOrders[osIndex], objetivoGastoId: storedPlantillas[0].id };
              localStorage.setItem('serviceOrders', JSON.stringify(allServiceOrders));
            }
        }
    } else {
        appliedObjetivos = defaultObjetivos;
    }


    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const currentBriefing = allBriefings.find(b => b.osId === osId);
    const totalBriefing = currentBriefing?.items.reduce((acc, item) => acc + (item.asistentes * item.precioUnitario) + (item.importeFijo || 0), 0) || 0;
    
    const allAjustes = JSON.parse(localStorage.getItem('comercialAjustes') || '{}')[osId] || [];
    const totalAjustes = allAjustes.reduce((sum: number, ajuste: {importe: number}) => sum + ajuste.importe, 0);
    const facturacionBruta = totalBriefing + totalAjustes;

    const agencyCommission = (facturacionBruta * (currentOS?.agencyPercentage || 0) / 100) + (currentOS?.agencyCommissionValue || 0);
    const spaceCommission = (facturacionBruta * (currentOS?.spacePercentage || 0) / 100) + (currentOS?.spaceCommissionValue || 0);
    const netRevenue = facturacionBruta - agencyCommission - spaceCommission;

    const getModuleTotal = (orders: {total?: number, precio?: number}[]) => orders.reduce((sum, order) => sum + (order.total ?? order.precio ?? 0), 0);
    
    const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const allHieloOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
    const allTransporteOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    const allDecoracionOrders = JSON.parse(localStorage.getItem('decoracionOrders') || '[]') as DecoracionOrder[];
    const allAtipicoOrders = JSON.parse(localStorage.getItem('atipicosOrders') || '[]') as AtipicoOrder[];
    const allPersonalMiceOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[];
    const allPersonalExternoOrders = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
    const allPruebasMenu = JSON.parse(localStorage.getItem('pruebasMenu') || '[]') as PruebaMenuData[];
    const pruebaMenu = allPruebasMenu.find(p => p.osId === osId);
    
    const allPersonalExternoAjustes = JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}') as {[key: string]: PersonalExternoAjuste[]};
    const personalExternoAjustes = allPersonalExternoAjustes[osId] || [];
    
    const allReturnSheets = Object.values(JSON.parse(localStorage.getItem('returnSheets') || '{}') as Record<string, ReturnSheet>).filter(s => s.osId === osId);
    let devolucionesPorCategoria: Record<string, number> = {};
    allReturnSheets.forEach(sheet => {
        sheet.items.forEach(item => {
            const state = sheet.itemStates[`${item.orderId}_${item.itemCode}`];
            if (state && item.sentQuantity > state.returnedQuantity) {
                const perdida = (item.sentQuantity - state.returnedQuantity) * item.price;
                const categoria = item.category; // Assuming order items have a category field
                if (categoria) {
                    devolucionesPorCategoria[categoria] = (devolucionesPorCategoria[categoria] || 0) + perdida;
                }
            }
        });
    });

    const getCierreCost = (label: string, presupuesto: number) => {
        const categoria = Object.keys(GASTO_LABELS).find(key => GASTO_LABELS[key as keyof typeof GASTO_LABELS] === label);
        const perdida = categoria ? (devolucionesPorCategoria[categoria as string] || 0) : 0;
        return presupuesto - perdida;
    };
    
    const personalExternoRealCost = (allPersonalExternoOrders.filter(o => o.osId === osId)).reduce((acc, order) => {
      const realHours = calculateHours(order.horaEntradaReal, order.horaSalidaReal);
      const price = order.precioHora || 0;
      return acc + realHours * price * (order.cantidad || 1);
    }, 0);
    const personalExternoTotalAjustes = personalExternoAjustes.reduce((sum, ajuste) => sum + ajuste.ajuste, 0);
    
    const personalMiceRealCost = (allPersonalMiceOrders.filter(o => o.osId === osId)).reduce((acc, order) => {
        const realHours = calculateHours(order.horaEntradaReal, order.horaSalidaReal);
        const price = order.precioHora || 0;
        return acc + realHours * price;
    }, 0);
    const costePruebaTotal = pruebaMenu?.costePruebaMenu || 0;
    
    const newCostes = [
      { label: GASTO_LABELS.gastronomia, presupuesto: getModuleTotal(allGastroOrders.filter(o => o.osId === osId)), cierre: getModuleTotal(allGastroOrders.filter(o => o.osId === osId)) },
      { label: GASTO_LABELS.bodega, presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bodega')), cierre: getCierreCost(GASTO_LABELS.bodega, getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bodega'))) },
      { label: GASTO_LABELS.consumibles, presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bio')), cierre: getCierreCost(GASTO_LABELS.consumibles, getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bio')))},
      { label: GASTO_LABELS.hielo, presupuesto: getModuleTotal(allHieloOrders.filter(o => o.osId === osId)), cierre: getModuleTotal(allHieloOrders.filter(o => o.osId === osId)) },
      { label: GASTO_LABELS.almacen, presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Almacen')), cierre: getCierreCost(GASTO_LABELS.almacen, getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Almacen')))},
      { label: GASTO_LABELS.alquiler, presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Alquiler')), cierre: getCierreCost(GASTO_LABELS.alquiler, getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Alquiler')))},
      { label: GASTO_LABELS.transporte, presupuesto: getModuleTotal(allTransporteOrders.filter(o => o.osId === osId)), cierre: getModuleTotal(allTransporteOrders.filter(o => o.osId === osId)) },
      { label: GASTO_LABELS.decoracion, presupuesto: getModuleTotal(allDecoracionOrders.filter(o => o.osId === osId)), cierre: getModuleTotal(allDecoracionOrders.filter(o => o.osId === osId)) },
      { label: GASTO_LABELS.atipicos, presupuesto: getModuleTotal(allAtipicoOrders.filter(o => o.osId === osId)), cierre: getModuleTotal(allAtipicoOrders.filter(o => o.osId === osId)) },
      { label: GASTO_LABELS.personalMice, presupuesto: calculatePersonalTotal(allPersonalMiceOrders.filter(o => o.osId === osId)), cierre: personalMiceRealCost },
      { label: GASTO_LABELS.personalExterno, presupuesto: calculatePersonalTotal(allPersonalExternoOrders.filter(o => o.osId === osId)), cierre: personalExternoRealCost + personalExternoTotalAjustes },
      { label: GASTO_LABELS.costePruebaMenu, presupuesto: costePruebaTotal, cierre: costePruebaTotal },
    ];
    
    const initialRealCosts = Object.fromEntries(newCostes.map(c => [c.label, c.cierre]));
    setRealCostInputs(initialRealCosts);

    setCtaData({
        serviceOrder: currentOS,
        objetivosPlantillas: storedPlantillas,
        objetivos: appliedObjetivos,
        costes: newCostes,
        facturacionNeta: netRevenue,
    });
  }, [osId, router, toast]);

  useEffect(() => {
    if (osId) {
      loadData();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
      router.push('/pes');
    }
  }, [osId, router, toast, loadData]);
  
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
     const numericValue = parseFloat(value) || 0;
     setRealCostInputs(prev => ({...prev, [label]: numericValue}));
  }

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
    const totalReal = processedCostes.reduce((sum, row) => sum + row.real, 0);
    const totalObjetivo = processedCostes.reduce((sum, row) => sum + row.objetivo, 0);
    return { totalPresupuesto, totalCierre, totalReal, totalObjetivo };
  }, [processedCostes]);

  if (!ctaData) {
    return <LoadingSkeleton title="Cargando Cuenta de Explotación..." />;
  }
  
  const { serviceOrder, facturacionNeta, objetivos, objetivosPlantillas } = ctaData;

  const ingresosAsistente = serviceOrder?.asistentes ? facturacionNeta / serviceOrder.asistentes : 0;
  
  const rentabilidadPresupuesto = facturacionNeta - totals.totalPresupuesto;
  const repercusionHQPresupuesto = rentabilidadPresupuesto * 0.25;
  const rentabilidadPostHQPresupuesto = rentabilidadPresupuesto - repercusionHQPresupuesto;
  
  const rentabilidadCierre = facturacionNeta - totals.totalCierre;
  const repercusionHQCierre = rentabilidadCierre * 0.25;
  const rentabilidadPostHQCierre = rentabilidadCierre - repercusionHQCierre;

  const rentabilidadReal = facturacionNeta - totals.totalReal;
  const repercusionHQReal = rentabilidadReal * 0.25;
  const rentabilidadPostHQReal = rentabilidadReal - repercusionHQReal;

  if (!serviceOrder) {
    return <LoadingSkeleton title="Cargando Cuenta de Explotación..." />;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
          <Card>
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2"><Euro/>Análisis de Costes</CardTitle>
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
                  </div>
                  <CardDescription>
                      Plantilla de objetivos aplicada: <strong>{objetivos.name}</strong>.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="p-2 w-[180px] sticky left-0 bg-background z-10">Partida</TableHead>
                            <TableHead colSpan={2} className="p-2 text-center border-l border-r bg-blue-50">Presupuesto</TableHead>
                            <TableHead colSpan={2} className="p-2 text-center border-l border-r bg-amber-50">Cierre</TableHead>
                            <TableHead colSpan={2} className="p-2 text-center border-l border-r bg-green-50">Real</TableHead>
                            <TableHead colSpan={2} className="p-2 text-center border-l border-r">Objetivo</TableHead>
                            <TableHead colSpan={2} className="p-2 text-center border-l">Desviación (Real vs. Obj.)</TableHead>
                            <TableHead className="p-2 w-10"></TableHead>
                        </TableRow>
                        <TableRow>
                            <TableHead className="p-2 sticky left-0 bg-background z-10"></TableHead>
                            <TableHead className="p-2 text-right border-l bg-blue-50">€</TableHead>
                            <TableHead className="p-2 text-right border-r bg-blue-50">% s/Fact.</TableHead>
                            <TableHead className="p-2 text-right border-l bg-amber-50">€ <Tooltip><TooltipTrigger asChild><span className="ml-1.5 cursor-help"><Info className="h-3 w-3 inline text-muted-foreground"/></span></TooltipTrigger><TooltipContent><p>Calculado restando las mermas de devoluciones al presupuesto.</p></TooltipContent></Tooltip></TableHead>
                            <TableHead className="p-2 text-right border-r bg-amber-50">% s/Fact.</TableHead>
                            <TableHead className="p-2 text-right border-l bg-green-50">€ <Tooltip><TooltipTrigger asChild><span className="ml-1.5 cursor-help"><Info className="h-3 w-3 inline text-muted-foreground"/></span></TooltipTrigger><TooltipContent><p>El valor Real es editable para realizar ajustes manuales.</p></TooltipContent></Tooltip></TableHead>
                            <TableHead className="p-2 text-right border-r bg-green-50">% s/Fact.</TableHead>
                            <TableHead className="p-2 text-right border-l">€</TableHead>
                            <TableHead className="p-2 text-right border-r">%</TableHead>
                            <TableHead className="p-2 text-right border-l">€</TableHead>
                            <TableHead className="p-2 text-right border-r">%</TableHead>
                            <TableHead className="p-2"></TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                            <TableCell className="py-2 px-2 sticky left-0 bg-muted/50 z-10">Facturación Neta</TableCell>
                            <TableCell colSpan={10} className="py-2 px-2 text-right text-primary">{formatCurrency(facturacionNeta)}</TableCell>
                            <TableCell className="py-2 px-2"></TableCell>
                        </TableRow>
                        {processedCostes.map(row => {
                            const pctSFactPresupuesto = facturacionNeta > 0 ? row.presupuesto / facturacionNeta : 0;
                            const pctSFactCierre = facturacionNeta > 0 ? row.cierre / facturacionNeta : 0;
                            const pctSFactReal = facturacionNeta > 0 ? row.real / facturacionNeta : 0;
                            const desviacion = row.objetivo - row.real;
                            const desviacionPct = row.objetivo > 0 ? desviacion / row.objetivo : 0;
                            
                            return (
                                <TableRow key={row.label} className="hover:bg-accent/50">
                                    <TableCell className="py-1 px-2 font-medium sticky left-0 bg-background z-10">{row.label}</TableCell>
                                    {/* Presupuesto */}
                                    <TableCell className="py-1 px-2 text-right font-mono border-l bg-blue-50/50">{formatCurrency(row.presupuesto)}</TableCell>
                                    <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-r bg-blue-50/50">{formatPercentage(pctSFactPresupuesto)}</TableCell>
                                    {/* Cierre */}
                                    <TableCell className="py-1 px-2 text-right font-mono border-l bg-amber-50/50">{formatCurrency(row.cierre)}</TableCell>
                                    <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-r bg-amber-50/50">{formatPercentage(pctSFactCierre)}</TableCell>
                                    {/* Real */}
                                    <TableCell className="py-1 px-2 text-right border-l bg-green-50/50">
                                        <Input type="number" step="0.01" value={realCostInputs[row.label] ?? 0} onChange={(e) => handleRealCostInputChange(row.label, e.target.value)} className="h-7 text-right w-28 ml-auto" />
                                    </TableCell>
                                    <TableCell className={cn("py-1 px-2 text-right font-mono border-r bg-green-50/50", pctSFactReal > row.objetivo_pct && row.objetivo_pct > 0 && "text-destructive font-bold")}>{formatPercentage(pctSFactReal)}</TableCell>
                                    {/* Objetivo */}
                                    <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-l">{formatCurrency(row.objetivo)}</TableCell>
                                    <TableCell className="py-1 px-2 text-right font-mono text-muted-foreground border-r">{formatPercentage(row.objetivo_pct)}</TableCell>
                                    {/* Desviación */}
                                    <TableCell className={cn("py-1 px-2 text-right font-mono border-l", desviacion < 0 && "text-destructive font-bold", desviacion > 0 && "text-green-600 font-bold")}>
                                        {formatCurrency(desviacion)}
                                    </TableCell>
                                    <TableCell className={cn("py-1 px-2 text-right font-mono border-r", desviacion < 0 && "text-destructive font-bold", desviacion > 0 && "text-green-600 font-bold")}>
                                        {formatPercentage(desviacionPct)}
                                    </TableCell>
                                    <TableCell className="py-1 px-2 text-center">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingComment({ label: row.label, text: row.comentario || '' })}>
                                                    <MessageSquare className={cn("h-4 w-4 text-muted-foreground", row.comentario && "text-primary")} />
                                                </Button>
                                            </TooltipTrigger>
                                            {row.comentario && <TooltipContent><p>{row.comentario}</p></TooltipContent>}
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
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
                              <TableCell className="text-right">{formatCurrency(facturacionNeta)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(facturacionNeta)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(facturacionNeta)}</TableCell>
                          </TableRow>
                          <TableRow>
                              <TableCell className="font-medium">Total Costes</TableCell>
                              <TableCell className="text-right">{formatCurrency(totals.totalPresupuesto)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(totals.totalCierre)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(totals.totalReal)}</TableCell>
                          </TableRow>
                           <TableRow className="font-bold bg-muted/50">
                              <TableCell>Rentabilidad</TableCell>
                              <TableCell className={cn("text-right", rentabilidadPresupuesto >= 0 ? 'text-primary' : 'text-destructive')}>{formatCurrency(rentabilidadPresupuesto)}</TableCell>
                              <TableCell className={cn("text-right", rentabilidadCierre >= 0 ? 'text-primary' : 'text-destructive')}>{formatCurrency(rentabilidadCierre)}</TableCell>
                              <TableCell className={cn("text-right", rentabilidadReal >= 0 ? 'text-primary' : 'text-destructive')}>{formatCurrency(rentabilidadReal)}</TableCell>
                          </TableRow>
                           <TableRow>
                              <TableCell className="font-medium">Repercusión HQ (25%)</TableCell>
                              <TableCell className="text-right">{formatCurrency(repercusionHQPresupuesto)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(repercusionHQCierre)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(repercusionHQReal)}</TableCell>
                          </TableRow>
                           <TableRow className="font-bold bg-muted/50">
                              <TableCell>Rentabilidad Post-HQ</TableCell>
                              <TableCell className={cn("text-right", rentabilidadPostHQPresupuesto >= 0 ? 'text-primary' : 'text-destructive')}>{formatCurrency(rentabilidadPostHQPresupuesto)}</TableCell>
                              <TableCell className={cn("text-right", rentabilidadPostHQCierre >= 0 ? 'text-primary' : 'text-destructive')}>{formatCurrency(rentabilidadPostHQCierre)}</TableCell>
                              <TableCell className={cn("text-right", rentabilidadPostHQReal >= 0 ? 'text-primary' : 'text-destructive')}>{formatCurrency(rentabilidadPostHQReal)}</TableCell>
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
