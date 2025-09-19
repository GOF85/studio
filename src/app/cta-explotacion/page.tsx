
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, DollarSign, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { ServiceOrder, ComercialBriefing, GastronomyOrder, MaterialOrder, TransporteOrder, HieloOrder, DecoracionOrder, AtipicoOrder, PersonalMiceOrder, PersonalExternoOrder, PruebaMenuData, CtaExplotacionObjetivos, PersonalExternoAjuste } from '@/types';

type CostRow = {
  label: string;
  presupuesto: number;
  cierre: number;
  objetivo: number;
  objetivo_pct: number;
};

const formatCurrency = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`;

const calculateHours = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    try {
        const startTime = new Date(`1970-01-01T${start}:00`);
        const endTime = new Date(`1970-01-01T${end}:00`);
        const diff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        return diff > 0 ? diff : 0;
    } catch (e) {
        return 0;
    }
}

export default function CtaExplotacionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [objetivos, setObjetivos] = useState<CtaExplotacionObjetivos>({
    gastronomia: 0,
    bodega: 0,
    consumibles: 0,
    hielo: 0,
    almacen: 0,
    alquiler: 0,
    transporte: 0,
    decoracion: 0,
    atipicos: 0,
    personalMice: 0,
    personalExterno: 0,
    costePruebaMenu: 0,
  });
  
  const [costes, setCostes] = useState<Omit<CostRow, 'objetivo' | 'objetivo_pct'>[]>([]);
  const [facturacionNeta, setFacturacionNeta] = useState(0);

  const loadData = useCallback(() => {
    if (!osId) return;

    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    setServiceOrder(currentOS || null);

    const allObjectives = JSON.parse(localStorage.getItem('ctaExplotacionObjetivos') || '{}') as {[key: string]: CtaExplotacionObjetivos};
    if (allObjectives[osId]) {
      setObjetivos(allObjectives[osId]);
    }

    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const currentBriefing = allBriefings.find(b => b.osId === osId);
    const totalBriefing = currentBriefing?.items.reduce((acc, item) => acc + (item.asistentes * item.precioUnitario), 0) || 0;
    const totalPercentage = (currentOS?.agencyPercentage || 0) + (currentOS?.spacePercentage || 0);
    const netRevenue = totalBriefing * (1 - totalPercentage / 100);
    setFacturacionNeta(netRevenue);

    const getModuleTotal = (orders: {total?: number, precio?: number}[]) => orders.reduce((sum, order) => sum + (order.total ?? order.precio ?? 0), 0);
    
    const calculatePersonalTotal = (orders: {precioHora: number; horaEntrada: string; horaSalida: string; cantidad?: number}[]) => {
        return orders.reduce((sum, order) => {
            const hours = calculateHours(order.horaEntrada, order.horaSalida);
            const quantity = order.cantidad || 1;
            return sum + (hours * order.precioHora * quantity);
        }, 0);
    }
    
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
      return acc + realHours * (order.precioHora || 0) * (order.cantidad || 1);
    }, 0);
    
    const personalExternoTotalAjustes = personalExternoAjustes.reduce((sum, ajuste) => sum + ajuste.ajuste, 0);
    const personalExternoCierre = personalExternoRealCost + personalExternoTotalAjustes;
    
    const personalMiceRealCost = (allPersonalMiceOrders.filter(o => o.osId === osId)).reduce((acc, order) => {
        const realHours = calculateHours(order.horaEntradaReal, order.horaSalidaReal);
        return acc + realHours * (order.precioHora || 0);
    }, 0);

    const decoracionTotal = getModuleTotal(allDecoracionOrders.filter(o => o.osId === osId));


    const newCostes = [
      { label: 'Gastronomía', presupuesto: getModuleTotal(allGastroOrders.filter(o => o.osId === osId)), cierre: 0 },
      { label: 'Bodega', presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bodega')), cierre: 0 },
      { label: 'Consumibles (Bio)', presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bio')), cierre: 0 },
      { label: 'Hielo', presupuesto: getModuleTotal(allHieloOrders.filter(o => o.osId === osId)), cierre: 0 },
      { label: 'Almacén', presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Almacén')), cierre: 0 },
      { label: 'Alquiler material', presupuesto: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Alquiler')), cierre: 0 },
      { label: 'Transporte', presupuesto: getModuleTotal(allTransporteOrders.filter(o => o.osId === osId)), cierre: 0 },
      { label: 'Decoración', presupuesto: decoracionTotal, cierre: decoracionTotal },
      { label: 'Atípicos', presupuesto: getModuleTotal(allAtipicoOrders.filter(o => o.osId === osId)), cierre: 0 },
      { label: 'Personal MICE', presupuesto: calculatePersonalTotal(allPersonalMiceOrders.filter(o => o.osId === osId)), cierre: personalMiceRealCost },
      { label: 'Personal Externo', presupuesto: calculatePersonalTotal(allPersonalExternoOrders.filter(o => o.osId === osId)), cierre: personalExternoCierre },
      { label: 'Coste Prueba de Menu', presupuesto: pruebaMenu?.costePruebaMenu || 0, cierre: pruebaMenu?.costePruebaMenu || 0 },
    ];
    setCostes(newCostes);
  }, [osId]);

  useEffect(() => {
    if (osId) {
      loadData();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
      router.push('/pes');
    }
    setIsMounted(true);
  }, [osId, router, toast, loadData]);

  const handleObjetivoChange = (key: keyof CtaExplotacionObjetivos, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const newObjetivos = { ...objetivos, [key]: numericValue };
    setObjetivos(newObjetivos);
    
    const allObjectives = JSON.parse(localStorage.getItem('ctaExplotacionObjetivos') || '{}');
    allObjectives[osId!] = newObjetivos;
    localStorage.setItem('ctaExplotacionObjetivos', JSON.stringify(allObjectives));
  };
  
  const handleCierreChange = (label: string, value: string) => {
     const numericValue = parseFloat(value) || 0;
     setCostes(prevCostes => prevCostes.map(c => c.label === label ? {...c, cierre: numericValue} : c));
  }
  
  const processedCostes: CostRow[] = useMemo(() => {
    return costes.map(coste => {
        const keyMap: {[key: string]: keyof CtaExplotacionObjetivos} = {
            'Gastronomía': 'gastronomia', 'Bodega': 'bodega', 'Consumibles (Bio)': 'consumibles', 'Hielo': 'hielo',
            'Almacén': 'almacen', 'Alquiler material': 'alquiler', 'Transporte': 'transporte', 'Decoración': 'decoracion',
            'Atípicos': 'atipicos', 'Personal MICE': 'personalMice', 'Personal Externo': 'personalExterno',
            'Coste Prueba de Menu': 'costePruebaMenu'
        }
        const objKey = keyMap[coste.label];
        const objetivo_pct = (objKey && objetivos[objKey] / 100) || 0;
        return {
            ...coste,
            objetivo: facturacionNeta * objetivo_pct,
            objetivo_pct: objetivo_pct,
        }
    });
  }, [costes, objetivos, facturacionNeta]);
  
  const totals = useMemo(() => {
    const totalPresupuesto = processedCostes.reduce((sum, row) => sum + row.presupuesto, 0);
    const totalCierre = processedCostes.reduce((sum, row) => sum + row.cierre, 0);
    const totalObjetivo = processedCostes.reduce((sum, row) => sum + row.objetivo, 0);
    return { totalPresupuesto, totalCierre, totalObjetivo };
  }, [processedCostes]);

  const rentabilidad = facturacionNeta - totals.totalPresupuesto;
  const ingresosAsistente = serviceOrder?.asistentes ? facturacionNeta / serviceOrder.asistentes : 0;
  const repercusionHQ = rentabilidad * 0.25;
  const rentabilidadPostHQ = rentabilidad - repercusionHQ;

  if (!isMounted || !serviceOrder) {
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
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Análisis de Costes</CardTitle>
              <CardDescription>Presupuesto inicial vs. cierre y objetivos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2 px-3">Partida</TableHead>
                    <TableHead className="text-right py-2 px-3">Presupuesto</TableHead>
                    <TableHead className="text-right py-2 px-3">% s/ Fact.</TableHead>
                    <TableHead className="text-right py-2 px-3">Cierre</TableHead>
                    <TableHead className="text-right py-2 px-3">Objetivo MC</TableHead>
                    <TableHead className="text-right py-2 px-3">Desv. (Obj-Pres)</TableHead>
                    <TableHead className="text-right py-2 px-3">Desv. % (Obj-Pres)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell className="py-2 px-3">Facturación Neta</TableCell>
                    <TableCell className="text-right text-primary py-2 px-3">{formatCurrency(facturacionNeta)}</TableCell>
                    <TableCell className="text-right text-primary py-2 px-3">{formatPercentage(1)}</TableCell>
                    <TableCell className="text-right text-primary py-2 px-3">{formatCurrency(facturacionNeta)}</TableCell>
                    <TableCell className="text-right text-primary py-2 px-3">{formatCurrency(facturacionNeta)}</TableCell>
                    <TableCell className="py-2 px-3"></TableCell>
                    <TableCell className="py-2 px-3"></TableCell>
                  </TableRow>
                  {processedCostes.map(row => {
                    const pctSFact = facturacionNeta > 0 ? row.presupuesto / facturacionNeta : 0;
                    const desviacion = row.objetivo - row.presupuesto;
                    const desviacionPct = row.presupuesto > 0 ? desviacion / row.presupuesto : 0;
                    const isReadOnly = ['Personal Externo', 'Personal MICE', 'Coste Prueba de Menu', 'Decoración'].includes(row.label);
                    return (
                        <TableRow key={row.label}>
                            <TableCell className="py-2 px-3">{row.label}</TableCell>
                            <TableCell className="text-right py-2 px-3">{formatCurrency(row.presupuesto)}</TableCell>
                            <TableCell className={cn("text-right py-2 px-3", pctSFact > row.objetivo_pct && row.objetivo_pct > 0 && "text-destructive font-bold")}>{formatPercentage(pctSFact)}</TableCell>
                            <TableCell className="text-right py-2 px-3">
                                <Input type="number" step="0.01" value={row.cierre} onChange={(e) => handleCierreChange(row.label, e.target.value)} className="h-8 text-right bg-secondary/30" readOnly={isReadOnly} />
                            </TableCell>
                            <TableCell className="text-right py-2 px-3">{formatCurrency(row.objetivo)}</TableCell>
                            <TableCell className={cn("text-right py-2 px-3", desviacion < 0 && "text-destructive", desviacion > 0 && "text-green-600")}>
                                {formatCurrency(desviacion)}
                            </TableCell>
                             <TableCell className={cn("text-right py-2 px-3", desviacionPct < 0 && "text-destructive", desviacionPct > 0 && "text-green-600")}>
                                {formatPercentage(desviacionPct)}
                             </TableCell>
                        </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target /> Objetivos de Gasto</CardTitle>
                <CardDescription>Define el % máximo de gasto por partida.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.keys(objetivos).map(key => (
                  <div key={key} className="flex items-center justify-between">
                    <label htmlFor={`obj-${key}`} className="capitalize text-sm font-medium">{key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}</label>
                    <div className="flex items-center gap-2">
                        <Input 
                            id={`obj-${key}`} 
                            type="number" 
                            className="w-20 h-8 text-right" 
                            value={objetivos[key as keyof CtaExplotacionObjetivos]}
                            onChange={(e) => handleObjetivoChange(key as keyof CtaExplotacionObjetivos, e.target.value)}
                        />
                        <span>%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Análisis de Rentabilidad</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span>Rentabilidad</span>
                        <span className={cn(rentabilidad > 0 ? 'text-primary' : 'text-destructive')}>{formatCurrency(rentabilidad)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Ingresos / Asistente</span>
                        <span>{formatCurrency(ingresosAsistente)}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span>Repercusión HQ (25%)</span>
                        <span>{formatCurrency(repercusionHQ)}</span>
                    </div>
                     <div className="flex justify-between items-center text-lg font-bold">
                        <span>Rentabilidad Post-HQ</span>
                        <span className={cn(rentabilidadPostHQ > 0 ? 'text-primary' : 'text-destructive')}>{formatCurrency(rentabilidadPostHQ)}</span>
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
