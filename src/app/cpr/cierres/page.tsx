
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, subMonths, addMonths, isAfter, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calculator, Download, AlertTriangle, Save, History, ArrowRight } from 'lucide-react';
import type { CierreInventario, StockArticuloUbicacion, ArticuloERP, StockMovimiento, OrdenFabricacion, IngredienteInterno, Elaboracion, HistoricoPreciosERP, Ubicacion } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatNumber, formatUnit } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function KpiCard({ title, value, description }: { title: string; value: string; description?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function CierresInventarioPage() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [cierres, setCierres] = useState<CierreInventario[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const [valorComprasManual, setValorComprasManual] = useState(0);
  const router = useRouter();

  const loadCierres = useCallback(() => {
    const storedCierres = JSON.parse(localStorage.getItem('cierresInventario') || '[]') as CierreInventario[];
    setCierres(storedCierres);
  }, []);

  useEffect(() => {
    loadCierres();
    setIsMounted(true);
  }, [loadCierres]);

  const selectedCierre = useMemo(() => {
    const monthKey = format(currentMonth, 'yyyy-MM');
    return cierres.find(c => c.mes === monthKey);
  }, [currentMonth, cierres]);

  const handleRealizarCierre = () => {
    const mesActual = format(currentMonth, 'yyyy-MM');
    if (cierres.some(c => c.mes === mesActual)) {
        toast({ variant: 'destructive', title: 'Error', description: `El cierre para ${format(currentMonth, 'MMMM yyyy', {locale: es})} ya ha sido realizado.`});
        return;
    }
    
    // --- Lógica de Cálculo ---
    const allStock = JSON.parse(localStorage.getItem('stockArticuloUbicacion') || '{}') as Record<string, StockArticuloUbicacion>;
    const allArticulos = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
    const allUbicaciones = JSON.parse(localStorage.getItem('ubicaciones') || '[]') as Ubicacion[];
    const articulosMap = new Map(allArticulos.map(a => [a.idreferenciaerp, a]));
    const ubicacionesMap = new Map(allUbicaciones.map(u => [u.id, u.nombre]));
    
    const allOFs = (JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[]).filter(of => of.estado === 'Finalizado' || of.estado === 'Validado');
    const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const elaboracionesMap = new Map(allElaboraciones.map(e => [e.id, e]));
    const ingredientesMap = new Map((JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[]).map(i => [i.id, i]));
    const historicoPrecios = JSON.parse(localStorage.getItem('historicoPreciosERP') || '[]') as HistoricoPreciosERP[];
    
    const valorInventarioFinal = Object.values(allStock).reduce((sum, item) => {
        const articulo = articulosMap.get(item.articuloErpId);
        return sum + (item.stockTeorico * (articulo?.precio || 0));
    }, 0);

    const snapshotInventario = Object.values(allStock).map(item => {
        const articulo = articulosMap.get(item.articuloErpId);
        return {
            articuloErpId: item.articuloErpId,
            nombreProducto: articulo?.nombreProductoERP || 'Desconocido',
            ubicacionId: item.ubicacionId,
            ubicacionNombre: ubicacionesMap.get(item.ubicacionId) || 'Desconocida',
            stock: item.stockTeorico,
            unidad: articulo?.unidad || 'ud',
            valoracion: item.stockTeorico * (articulo?.precio || 0)
        };
    });

    const mesAnteriorKey = format(subMonths(currentMonth, 1), 'yyyy-MM');
    const cierreAnterior = cierres.find(c => c.mes === mesAnteriorKey);
    const valorInventarioInicial = cierreAnterior?.valorInventarioFinal || 0;
    
    const inicioMes = startOfMonth(currentMonth);
    const finMes = endOfMonth(currentMonth);

    const ofsDelMes = allOFs.filter(of => {
        if (!of.fechaFinalizacion) return false;
        const fechaFin = new Date(of.fechaFinalizacion);
        return fechaFin >= inicioMes && fechaFin <= finMes;
    });

    const calculateHistoricalCost = (elaboracionId: string, eventDate: Date): number => {
        const getPrecioHistorico = (erpId: string): number => {
             const relevantPrices = historicoPrecios
                .filter(h => h.articuloErpId === erpId && new Date(h.fecha) <= startOfDay(eventDate))
                .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            const latestPrice = articulosMap.get(erpId)?.precio || 0;
            return relevantPrices.length > 0 ? relevantPrices[0].precioCalculado : latestPrice;
        };
        
        const calculateElabCost = (elabId: string): number => {
            const elab = elaboracionesMap.get(elabId);
            if (!elab) return 0;
            
            const costeComponentes = (elab.componentes || []).reduce((sum, comp) => {
                let componentCost = 0;
                if (comp.tipo === 'ingrediente') {
                    const ingrediente = ingredientesMap.get(comp.componenteId);
                    const erpItem = ingrediente ? articulosMap.get(ingrediente.productoERPlinkId) : undefined;
                    if(erpItem) componentCost = getPrecioHistorico(erpItem.idreferenciaerp) * comp.cantidad;
                } else componentCost = calculateElabCost(comp.componenteId) * comp.cantidad;
                return sum + (componentCost * (1 + (comp.merma || 0) / 100));
            }, 0);
            return elab.produccionTotal > 0 ? costeComponentes / elab.produccionTotal : 0;
        }
        return calculateElabCost(elaboracionId);
    };

    const valorConsumoTrazado = ofsDelMes.reduce((sum, of) => {
        const costeUnitarioHistorico = calculateHistoricalCost(of.elaboracionId, new Date(of.fechaFinalizacion!));
        return sum + (costeUnitarioHistorico * (of.cantidadReal || of.cantidadTotal));
    }, 0);

    const valorConsumoNoTrazado = (valorInventarioInicial + valorComprasManual) - valorInventarioFinal;
    const valorMermaDesconocida = valorConsumoNoTrazado - valorConsumoTrazado;


    const nuevoCierre: CierreInventario = {
        id: `CPR_${mesActual}`,
        centroId: 'CPR_MAD',
        mes: mesActual,
        fechaInicio: inicioMes.toISOString(),
        fechaCierre: new Date().toISOString(),
        valorInventarioInicial,
        valorInventarioFinal,
        valorCompras: valorComprasManual,
        valorConsumoTrazado,
        valorMermaDesconocida,
        valorConsumoNoTrazado,
        snapshotInventario,
    };
    
    const updatedCierres = [...cierres, nuevoCierre];
    localStorage.setItem('cierresInventario', JSON.stringify(updatedCierres));
    loadCierres();

    toast({ title: 'Cierre Realizado', description: `Se ha guardado el cierre para ${format(currentMonth, 'MMMM yyyy', {locale: es})}.`});
  };

  const isFutureMonth = isAfter(currentMonth, startOfMonth(new Date()));


  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Cierres de Inventario..." />;
  }

  return (
    <main>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-headline font-bold">Cierres de Inventario</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft /></Button>
          <span className="text-xl font-semibold w-48 text-center capitalize">{format(currentMonth, 'MMMM yyyy', { locale: es })}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} disabled={isFutureMonth}><ChevronRight /></Button>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={!!selectedCierre || isFutureMonth}><Calculator className="mr-2"/>Realizar Cierre Mensual</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar cierre de inventario?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción creará una "foto" del estado actual del inventario para el mes de <strong>{format(currentMonth, 'MMMM yyyy', {locale: es})}</strong>.
                Introduce el valor total de las compras de materia prima de este mes (según facturas de proveedores).
              </AlertDialogDescription>
            </AlertDialogHeader>
             <div className="py-4">
                <Label htmlFor="valor-compras">Valor Total Compras del Mes (€)</Label>
                <Input id="valor-compras" type="number" placeholder="Introduce el total de facturas de proveedores" value={valorComprasManual} onChange={e => setValorComprasManual(parseFloat(e.target.value) || 0)} />
             </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleRealizarCierre} disabled={valorComprasManual <= 0}>Sí, realizar cierre</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {selectedCierre ? (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard title="Inventario Inicial" value={formatCurrency(selectedCierre.valorInventarioInicial)} />
                <KpiCard title="Compras del Mes" value={formatCurrency(selectedCierre.valorCompras)} />
                <KpiCard title="Consumo Trazado (OFs)" value={formatCurrency(selectedCierre.valorConsumoTrazado)} />
                <KpiCard title="Inventario Final" value={formatCurrency(selectedCierre.valorInventarioFinal)} />
            </div>
            <Card>
                <CardHeader><CardTitle>Análisis de Consumo y Mermas</CardTitle></CardHeader>
                <CardContent className="text-lg">
                    <div className="flex justify-around items-center">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Consumo Contable Total</p>
                            <p className="font-bold">{formatCurrency(selectedCierre.valorConsumoNoTrazado)}</p>
                        </div>
                         <span className="text-3xl font-light text-muted-foreground">-</span>
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Consumo Trazado (OFs)</p>
                            <p className="font-bold">{formatCurrency(selectedCierre.valorConsumoTrazado)}</p>
                        </div>
                        <span className="text-3xl font-light text-muted-foreground">=</span>
                         <div className="text-center">
                            <p className="text-sm text-muted-foreground">Merma Desconocida</p>
                            <p className="font-bold text-destructive">{formatCurrency(selectedCierre.valorMermaDesconocida)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardHeader>
            <Calculator className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4">Pendiente de Cierre</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No se ha realizado el cierre de inventario para este mes.</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-8">
        <h3 className="text-2xl font-headline font-semibold mb-4">Historial de Cierres</h3>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Mes</TableHead>
                            <TableHead className="text-right">Inv. Inicial</TableHead>
                            <TableHead className="text-right">Compras</TableHead>
                            <TableHead className="text-right">Consumo Trazado</TableHead>
                            <TableHead className="text-right">Inv. Final</TableHead>
                            <TableHead className="text-right">Merma Desconocida</TableHead>
                            <TableHead className="text-right">Detalle</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cierres.sort((a,b) => b.mes.localeCompare(a.mes)).map(c => (
                            <TableRow key={c.id}>
                                <TableCell className="font-semibold capitalize">{format(new Date(`${c.mes}-02`), 'MMMM yyyy', {locale: es})}</TableCell>
                                <TableCell className="text-right">{formatCurrency(c.valorInventarioInicial)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(c.valorCompras)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(c.valorConsumoTrazado)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(c.valorInventarioFinal)}</TableCell>
                                <TableCell className="text-right font-bold text-destructive">{formatCurrency(c.valorMermaDesconocida)}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="ghost" size="sm">
                                        <Link href={`/cpr/cierres/${c.id}`}>Ver detalle <ArrowRight className="ml-2 h-4 w-4"/></Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
      </div>
    </main>
  );
}
