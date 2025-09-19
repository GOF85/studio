
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Printer, UtensilsCrossed } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { ServiceOrder, ComercialBriefing, GastronomyOrder, MaterialOrder, TransporteOrder, HieloOrder } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatCurrency = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

export default function InformePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [briefing, setBriefing] = useState<ComercialBriefing | null>(null);
  const [costs, setCosts] = useState<{ label: string, total: number }[]>([]);
  const [facturacionNeta, setFacturacionNeta] = useState(0);

  const loadAllData = useCallback(() => {
    if (!osId) return;

    // Load Service Order
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    setServiceOrder(currentOS || null);

    // Load Briefing
    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const currentBriefing = allBriefings.find(b => b.osId === osId);
    setBriefing(currentBriefing || null);

    // Calculate Net Revenue
    const totalBriefing = currentBriefing?.items.reduce((acc, item) => acc + (item.asistentes * item.precioUnitario), 0) || 0;
    const totalPercentage = (currentOS?.agencyPercentage || 0) + (currentOS?.spacePercentage || 0);
    const netRevenue = totalBriefing * (1 - totalPercentage / 100);
    setFacturacionNeta(netRevenue);

    // Calculate Costs
    const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
    const allHieloOrders = JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[];
    const allTransporteOrders = JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[];

    const getModuleTotal = (orders: {total?: number}[]) => orders.reduce((sum, order) => sum + (order.total || 0), 0);

    const calculatedCosts = [
      { label: 'Gastronomía', total: getModuleTotal(allGastroOrders.filter(o => o.osId === osId)) },
      { label: 'Bodega', total: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bodega')) },
      { label: 'Consumibles (Bio)', total: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Bio')) },
      { label: 'Hielo', total: getModuleTotal(allHieloOrders.filter(o => o.osId === osId)) },
      { label: 'Almacén', total: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Almacén')) },
      { label: 'Alquiler material', total: getModuleTotal(allMaterialOrders.filter(o => o.osId === osId && o.type === 'Alquiler')) },
      { label: 'Transporte', total: getModuleTotal(allTransporteOrders.filter(o => o.osId === osId)) },
    ];
    setCosts(calculatedCosts);

  }, [osId]);

  useEffect(() => {
    if (osId) {
      loadAllData();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
      router.push('/pes');
    }
    setIsMounted(true);
  }, [osId, router, toast, loadAllData]);

  const sortedBriefingItems = useMemo(() => {
    if (!briefing?.items) return [];
    return [...briefing.items].sort((a, b) => {
      const dateComparison = a.fecha.localeCompare(b.fecha);
      if (dateComparison !== 0) return dateComparison;
      return a.horaInicio.localeCompare(b.horaInicio);
    });
  }, [briefing]);

  const totalCosts = useMemo(() => costs.reduce((sum, c) => sum + c.total, 0), [costs]);
  const rentabilidad = facturacionNeta - totalCosts;
  
  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Generando Informe..." />;
  }

  const handlePrint = () => window.print();

  return (
    <>
      <Header className="no-print" />
      <main className="container mx-auto px-4 py-8 bg-background">
        <div className="flex items-center justify-between mb-8 no-print">
          <div>
            <Button variant="ghost" size="sm" onClick={() => router.push(`/os?id=${osId}`)} className="mb-2">
              <ArrowLeft className="mr-2" />
              Volver a la OS
            </Button>
            <h1 className="text-3xl font-headline font-bold">Informe de Servicio</h1>
          </div>
          <Button onClick={handlePrint}><Printer className="mr-2" /> Imprimir / Guardar PDF</Button>
        </div>

        <div className="printable-area max-w-4xl mx-auto bg-white p-12 shadow-lg rounded-lg border">
          {/* Header */}
          <header className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-3xl font-bold text-primary">{serviceOrder.serviceNumber}</h1>
              <p className="text-lg font-semibold">{serviceOrder.client}</p>
              {serviceOrder.finalClient && <p className="text-muted-foreground">para {serviceOrder.finalClient}</p>}
            </div>
            <div className="flex items-center gap-3 text-primary">
              <UtensilsCrossed className="h-10 w-10" />
              <h2 className="text-3xl font-headline font-bold">CateringStock</h2>
            </div>
          </header>

          {/* Service Details */}
          <section className="mb-8">
            <h3 className="text-xl font-semibold border-b-2 border-primary pb-2 mb-4">Detalles del Servicio</h3>
            <div className="grid grid-cols-3 gap-x-8 gap-y-2 text-sm">
              <div><strong className="font-medium">Nº Servicio:</strong> {serviceOrder.serviceNumber}</div>
              <div><strong className="font-medium">Fecha Inicio:</strong> {format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')}</div>
              <div><strong className="font-medium">Fecha Fin:</strong> {format(new Date(serviceOrder.endDate), 'dd/MM/yyyy')}</div>
              <div><strong className="font-medium">Cliente:</strong> {serviceOrder.client}</div>
              <div><strong className="font-medium">PAX:</strong> {serviceOrder.pax}</div>
              <div><strong className="font-medium">Estado:</strong> {serviceOrder.status}</div>
              <div className="col-span-3"><strong className="font-medium">Espacio:</strong> {serviceOrder.space} ({serviceOrder.spaceAddress})</div>
            </div>
          </section>
          
          <Separator className="my-8" />
          
          {/* Responsibles */}
          <section className="mb-8">
            <h3 className="text-xl font-semibold border-b-2 border-primary pb-2 mb-4">Responsables</h3>
            <div className="grid grid-cols-3 gap-x-8 gap-y-2 text-sm">
              <div><strong className="font-medium">Metre:</strong> {serviceOrder.respMetre || 'N/A'}</div>
              <div><strong className="font-medium">Pase:</strong> {serviceOrder.respPase || 'N/A'}</div>
              <div><strong className="font-medium">Comercial:</strong> {serviceOrder.comercial || 'N/A'}</div>
            </div>
          </section>

          <Separator className="my-8" />

          {/* Briefing */}
          {sortedBriefingItems.length > 0 && (
            <section className="mb-8">
                <h3 className="text-xl font-semibold border-b-2 border-primary pb-2 mb-4">Briefing Comercial</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Servicio</TableHead>
                            <TableHead>Sala</TableHead>
                            <TableHead>Asist.</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedBriefingItems.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{format(new Date(item.fecha), 'dd/MM/yy')} {item.horaInicio}</TableCell>
                                <TableCell>{item.descripcion}</TableCell>
                                <TableCell>{item.sala}</TableCell>
                                <TableCell>{item.asistentes}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.asistentes * item.precioUnitario)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </section>
          )}
          
          {/* Financial Summary */}
          <section className="page-break-before:always">
             <h3 className="text-xl font-semibold border-b-2 border-primary pb-2 mb-4">Análisis de Rentabilidad</h3>
             <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold mb-2">Desglose de Costes</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Partida</TableHead>
                        <TableHead className="text-right">Importe Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costs.map(cost => (
                        <TableRow key={cost.label}>
                          <TableCell>{cost.label}</TableCell>
                          <TableCell className="text-right">{formatCurrency(cost.total)}</TableCell>
                        </TableRow>
                      ))}
                       <TableRow className="font-bold border-t-2">
                          <TableCell>Total Costes Presupuestados</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalCosts)}</TableCell>
                        </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold mb-2">Resumen Financiero</h4>
                  <div className="border rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Facturación Neta:</span>
                      <span className="font-medium">{formatCurrency(facturacionNeta)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Costes:</span>
                      <span className="font-medium">{formatCurrency(totalCosts)}</span>
                    </div>
                     <Separator />
                    <div className="flex justify-between font-bold text-base text-primary">
                      <span>Rentabilidad:</span>
                      <span>{formatCurrency(rentabilidad)}</span>
                    </div>
                  </div>
                   <div className="border rounded-lg p-4 space-y-3 text-sm">
                     <div className="flex justify-between">
                      <span className="text-muted-foreground">Ingresos / Pax:</span>
                      <span className="font-medium">{serviceOrder.pax > 0 ? formatCurrency(facturacionNeta / serviceOrder.pax) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Repercusión HQ (25%):</span>
                      <span className="font-medium">{formatCurrency(rentabilidad * 0.25)}</span>
                    </div>
                     <Separator />
                    <div className="flex justify-between font-bold text-base text-primary">
                      <span>Rentabilidad Post-HQ:</span>
                      <span>{formatCurrency(rentabilidad - (rentabilidad * 0.25))}</span>
                    </div>
                   </div>
                </div>
             </div>
          </section>

          {/* Footer */}
          <footer className="text-center text-xs text-muted-foreground pt-12 border-t mt-12">
            Informe generado el {format(new Date(), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
          </footer>
        </div>
      </main>
    </>
  );
}

