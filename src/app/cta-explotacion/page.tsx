

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, DollarSign, Target, Settings, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { ServiceOrder, ComercialBriefing, GastronomyOrder, MaterialOrder, TransporteOrder, HieloOrder, DecoracionOrder, AtipicoOrder, PersonalMiceOrder, PersonalExternoOrder, PruebaMenuData, CtaExplotacionObjetivos, PersonalExternoAjuste, ObjetivosGasto } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

type CostRow = {
  label: string;
  presupuesto: number;
  cierre: number;
  objetivo: number;
  objetivo_pct: number;
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

const labels: Record<keyof Omit<ObjetivosGasto, 'id' | 'name'>, string> = {
    gastronomia: 'Gastronomía',
    bodega: 'Bodega',
    consumibles: 'Consumibles (Bio)',
    hielo: 'Hielo',
    almacen: 'Almacén',
    alquiler: 'Alquiler material',
    transporte: 'Transporte',
    decoracion: 'Decoración',
    atipicos: 'Atípicos',
    personalMice: 'Personal MICE',
    personalExterno: 'Personal Externo',
    costePruebaMenu: 'Coste Prueba de Menu',
}

export default function CtaExplotacionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const { toast } = useToast();

  const [ctaData, setCtaData] = useState<{
    serviceOrder: ServiceOrder | null;
    objetivosPlantillas: ObjetivosGasto[];
    objetivos: CtaExplotacionObjetivos;
    costes: Omit<CostRow, 'objetivo' | 'objetivo_pct'>[];
    facturacionNeta: number;
  } | null>(null);

  const [cierreInputs, setCierreInputs] = useState<Record<string, number>>({});

  const loadData = useCallback(() => {
    if (!osId) return;

    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId) || null;

    const storedPlantillas = JSON.parse(localStorage.getItem('objetivosGastoPlantillas') || '[]') as ObjetivosGasto[];
    
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
    const totalBriefing = currentBriefing?.items.reduce((acc, item) => acc + (item.asistentes * item.precioUnitario), 0) || 0;
    const totalPercentage = (currentOS?.agencyPercentage || 0) + (currentOS?.spacePercentage || 0);
    const netRevenue = totalBriefing * (1 - totalPercentage / 100);

    const getModuleTotal = (orders: {total?: number, precio?: number}[]) => orders.reduce((sum, order) => sum + (order.total ?? order.precio ?? 0), 0);
    
    const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const allHieloOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
    const allTransporteOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];
    const allDecoracionOrders = JSON.parse(localStorage.getItem('decoracionOrders') || '[]') as DecoracionOrder[];
    const allAtipicoOrders = JSON.parse(localStorage.getItem('atipicoOrders') || '[]') as AtipicoOrder[];
    const allPersonalMiceOrders = JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[];
    const allPersonalExternoOrders = JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[];
    const allPruebasMenu = JSON.parse(localStorage.getItem('pruebasMenu') || '[]') as PruebaMenuData[];
    const pruebaMenu = allPruebasMenu.find(p => p.osId === osId);
    
    const allPersonalExternoAjustes = JSON.parse(localStorage.getItem('personalExternoAjustes') || '{}') as {[key: string]: PersonalExternoAjuste[]};
    const personalExternoAjustes = allPersonalExternoAjustes[osId] || [];

    const personalExternoRealCost = (allPersonalExternoOrders.filter(o => o.osId === osId)).reduce((acc, order) => {
      const realHours = calculateHours(order.horaEntradaReal, order.horaSalidaReal);
      const price = order.precioHora || 0;
      return acc + realHours * price * (order.cantidad || 1);
    }, 0);
    
    const personalExternoTotalAjustes = personalExternoAjustes.reduce((sum, ajuste) => sum + ajuste.ajuste, 0);
    const personalExternoCierre = personalExternoRealCost + personalExternoTotalAjustes;
    
    const personalMiceRealCost = (allPersonalMiceOrders.filter(o => o.osId === osId)).reduce((acc, order) => {
        const realHours = calculateHours(order.horaEntradaReal, order.horaSalidaReal);
        const price = order.precioHora || 0;
        return acc + realHours * price;
    }, 0);

    const costePruebaTotal = pruebaMenu?.costePruebaMenu || 0;

    const newCostes = [
      { label: 'Gastronomía', presupuesto: getModuleTotal(allGastroOrders.filter(o => o.osId === osId)), cierre: 0 },
      { label: 'Bodega', presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bodega')), cierre: 0 },
      { label: 'Consumibles (Bio)', presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bio')), cierre: 0 },
      { label: 'Hielo', presupuesto: getModuleTotal(allHieloOrders.filter(o => o.osId === osId)), cierre: 0 },
      { label: 'Almacén', presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Almacén')), cierre: 0 },
      { label: 'Alquiler material', presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Alquiler')), cierre: 0 },
      { label: 'Transporte', presupuesto: getModuleTotal(allTransporteOrders.filter(o => o.osId === osId)), cierre: 0 },
      { label: 'Decoración', presupuesto: getModuleTotal(allDecoracionOrders.filter(o => o.osId === osId)), cierre: 0 },
      { label: 'Atípicos', presupuesto: getModuleTotal(allAtipicoOrders.filter(o => o.osId === osId)), cierre: 0 },
      { label: 'Personal MICE', presupuesto: calculatePersonalTotal(allPersonalMiceOrders.filter(o => o.osId === osId)), cierre: personalMiceRealCost },
      { label: 'Personal Externo', presupuesto: calculatePersonalTotal(allPersonalExternoOrders.filter(o => o.osId === osId)), cierre: personalExternoCierre },
      { label: 'Coste Prueba de Menu', presupuesto: costePruebaTotal, cierre: costePruebaTotal },
    ];
    
    const initialCierres = Object.fromEntries(newCostes.map(c => [c.label, c.cierre]));
    setCierreInputs(initialCierres);

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
  
  const handleCierreInputChange = (label: string, value: string) => {
     const numericValue = parseFloat(value) || 0;
     setCierreInputs(prev => ({...prev, [label]: numericValue}));
  }

  const handleRecalculate = () => {
    if (!ctaData) return;
    const updatedCostes = ctaData.costes.map(c => ({
        ...c,
        cierre: cierreInputs[row.label] ?? c.cierre
    }));

    setCtaData(prev => prev ? {...prev, costes: updatedCostes} : null);
    toast({ title: "Totales actualizados", description: "Los cálculos de rentabilidad han sido actualizados."});
  };
  
  const processedCostes: CostRow[] = useMemo(() => {
    if (!ctaData) return [];
    return ctaData.costes.map(coste => {
        const keyMap: {[key: string]: keyof Omit<ObjetivosGasto, 'id' | 'name'>} = {
            'Gastronomía': 'gastronomia', 'Bodega': 'bodega', 'Consumibles (Bio)': 'consumibles', 'Hielo': 'hielo',
            'Almacén': 'almacen', 'Alquiler material': 'alquiler', 'Transporte': 'transporte', 'Decoración': 'decoracion',
            'Atípicos': 'atipicos', 'Personal MICE': 'personalMice', 'Personal Externo': 'personalExterno',
            'Coste Prueba de Menu': 'costePruebaMenu'
        }
        const objKey = keyMap[coste.label];
        const objetivo_pct = (objKey && ctaData.objetivos?.[objKey] / 100) || 0;
        return {
            ...coste,
            objetivo: ctaData.facturacionNeta * objetivo_pct,
            objetivo_pct: objetivo_pct,
        }
    });
  }, [ctaData]);
  
  const totals = useMemo(() => {
    if (!processedCostes) return { totalPresupuesto: 0, totalCierre: 0, totalObjetivo: 0 };
    const totalPresupuesto = processedCostes.reduce((sum, row) => sum + row.presupuesto, 0);
    const totalCierre = processedCostes.reduce((sum, row) => sum + (cierreInputs[row.label] ?? row.cierre), 0);
    const totalObjetivo = processedCostes.reduce((sum, row) => sum + row.objetivo, 0);
    return { totalPresupuesto, totalCierre, totalObjetivo };
  }, [processedCostes, cierreInputs]);

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

  if (!serviceOrder) {
    return <LoadingSkeleton title="Cargando Cuenta de Explotación..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/os?id=${osId}`)} className="mb-2">
            <ArrowLeft className="mr-2" />
            Volver a la OS
          </Button>
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
            <DollarSign />
            Cuenta de Explotación
          </h1>
          <p className="text-muted-foreground">OS: {serviceOrder.serviceNumber} - {serviceOrder.client}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Análisis de Costes</CardTitle>
                        <Button onClick={handleRecalculate}><RefreshCw className="mr-2 h-4 w-4"/>Actualizar Totales</Button>
                    </div>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="py-2 px-3">Partida</TableHead>
                        <TableHead className="py-2 px-3 text-right">Presupuesto</TableHead>
                        <TableHead className="py-2 px-3 text-right">% s/ Fact.</TableHead>
                        <TableHead className="py-2 px-3 text-right">Cierre</TableHead>
                        <TableHead className="py-2 px-3 text-right">Objetivo MC</TableHead>
                        <TableHead className="py-2 px-3 text-right">Desv. €</TableHead>
                        <TableHead className="py-2 px-3 text-right">Desv. %</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    <TableRow className="font-bold bg-muted/50">
                        <TableCell className="py-1 px-3">Facturación Neta</TableCell>
                        <TableCell className="py-1 px-3 text-right text-primary">{formatCurrency(facturacionNeta)}</TableCell>
                        <TableCell className="py-1 px-3 text-right text-primary">{formatPercentage(1)}</TableCell>
                        <TableCell className="py-1 px-3 text-right text-primary">{formatCurrency(facturacionNeta)}</TableCell>
                        <TableCell className="py-1 px-3 text-right text-primary">{formatCurrency(facturacionNeta)}</TableCell>
                        <TableCell className="py-1 px-3"></TableCell>
                        <TableCell className="py-1 px-3"></TableCell>
                    </TableRow>
                    {processedCostes.map(row => {
                        const cierreActual = cierreInputs[row.label] ?? row.cierre;
                        const pctSFact = facturacionNeta > 0 ? cierreActual / facturacionNeta : 0;
                        const desviacion = row.objetivo - cierreActual;
                        const desviacionPct = row.objetivo > 0 ? desviacion / row.objetivo : 0;
                        return (
                            <TableRow key={row.label}>
                                <TableCell className="py-1 px-3">{row.label}</TableCell>
                                <TableCell className="py-1 px-3 text-right">{formatCurrency(row.presupuesto)}</TableCell>
                                <TableCell className={cn("py-1 px-3 text-right", pctSFact > row.objetivo_pct && row.objetivo_pct > 0 && "text-destructive font-bold")}>{formatPercentage(pctSFact)}</TableCell>
                                <TableCell className="py-1 px-3 text-right">
                                    <Input type="number" step="0.01" value={cierreInputs[row.label] ?? 0} onChange={(e) => handleCierreInputChange(row.label, e.target.value)} className="h-7 text-right bg-secondary/30 w-24" />
                                </TableCell>
                                <TableCell className="py-1 px-3 text-right">{formatCurrency(row.objetivo)}</TableCell>
                                <TableCell className={cn("py-1 px-3 text-right", desviacion < 0 && "text-destructive", desviacion > 0 && "text-green-600")}>
                                    {formatCurrency(desviacion)}
                                </TableCell>
                                <TableCell className={cn("py-1 px-3 text-right", desviacionPct < 0 && "text-destructive", desviacionPct > 0 && "text-green-600")}>
                                    {formatPercentage(desviacionPct)}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp/>Análisis de Rentabilidad</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Concepto</TableHead>
                                <TableHead className="text-right">Presupuesto</TableHead>
                                <TableHead className="text-right">Cierre</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             <TableRow>
                                <TableCell className="font-medium">Facturación Neta</TableCell>
                                <TableCell className="text-right">{formatCurrency(facturacionNeta)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(facturacionNeta)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Total Costes</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.totalPresupuesto)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.totalCierre)}</TableCell>
                            </TableRow>
                             <TableRow className="font-bold bg-muted/30">
                                <TableCell>Rentabilidad</TableCell>
                                <TableCell className={cn("text-right", rentabilidadPresupuesto > 0 ? 'text-primary' : 'text-destructive')}>{formatCurrency(rentabilidadPresupuesto)}</TableCell>
                                <TableCell className={cn("text-right", rentabilidadCierre > 0 ? 'text-primary' : 'text-destructive')}>{formatCurrency(rentabilidadCierre)}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className="font-medium">Repercusión HQ (25%)</TableCell>
                                <TableCell className="text-right">{formatCurrency(repercusionHQPresupuesto)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(repercusionHQCierre)}</TableCell>
                            </TableRow>
                             <TableRow className="font-bold bg-muted/30">
                                <TableCell>Rentabilidad Post-HQ</TableCell>
                                <TableCell className={cn("text-right", rentabilidadPostHQPresupuesto > 0 ? 'text-primary' : 'text-destructive')}>{formatCurrency(rentabilidadPostHQPresupuesto)}</TableCell>
                                <TableCell className={cn("text-right", rentabilidadPostHQCierre > 0 ? 'text-primary' : 'text-destructive')}>{formatCurrency(rentabilidadPostHQCierre)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Ingresos / Asistente</TableCell>
                                <TableCell className="text-right">{formatCurrency(ingresosAsistente)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(ingresosAsistente)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2 pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><Target /> Objetivos de Gasto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                 <Select onValueChange={handleObjetivoChange} value={serviceOrder.objetivoGastoId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar plantilla..." />
                    </SelectTrigger>
                    <SelectContent>
                        {objetivosPlantillas.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground p-3 border rounded-md">
                    {Object.keys(labels).map((key) => {
                        const objKey = key as keyof typeof labels;
                        const value = (objetivos as any)[objKey];
                        if (value === undefined || value === null) return null;
                        return (
                            <div key={key} className="flex justify-between">
                                <span className="font-medium">{labels[objKey]}:</span>
                                <span>{(value || 0).toFixed(2)}%</span>
                            </div>
                        )
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
