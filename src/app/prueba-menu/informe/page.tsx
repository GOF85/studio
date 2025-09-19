'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Printer, UtensilsCrossed, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { ServiceOrder, PruebaMenuData, ComercialBriefingItem, ComercialBriefing } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';

export default function InformePruebaMenuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get('osId');
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [briefingItems, setBriefingItems] = useState<ComercialBriefingItem[]>([]);
  const [menuTestData, setMenuTestData] = useState<PruebaMenuData | null>(null);

  const loadAllData = useCallback(() => {
    if (!osId) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha especificado una Orden de Servicio.' });
      router.push('/pes');
      return;
    }

    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const currentOS = allServiceOrders.find(os => os.id === osId);
    setServiceOrder(currentOS || null);

    const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
    const currentBriefing = allBriefings.find(b => b.osId === osId);
    setBriefingItems(currentBriefing?.items || []);

    const allMenuTests = JSON.parse(localStorage.getItem('pruebasMenu') || '[]') as PruebaMenuData[];
    const currentMenuTest = allMenuTests.find(mt => mt.osId === osId);
    setMenuTestData(currentMenuTest || { osId, items: [], observacionesGenerales: '' });

    setIsMounted(true);
  }, [osId, router, toast]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);
  
  const handlePrint = () => window.print();

  if (!isMounted || !serviceOrder) {
    return <LoadingSkeleton title="Generando Informe..." />;
  }


  const renderSection = (mainCategory: 'BODEGA' | 'GASTRONOMÍA') => {
    if (!menuTestData) return null;
    const sectionItems = menuTestData.items.filter(item => item.mainCategory === mainCategory);

    return (
      <section className="mb-4">
        <h4 className="text-lg font-bold mb-2 pb-1 border-b-2 border-gray-300">{mainCategory}</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Referencia</TableHead>
              <TableHead className="w-1/2">Observaciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sectionItems.length > 0 ? sectionItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className={cn("font-medium", item.type === 'header' && "bg-gray-100 font-bold")}>
                  {item.referencia}
                </TableCell>
                <TableCell className="border-l">
                  <div className="space-y-3 py-1">
                    <div className="h-px border-b border-dashed border-gray-400"></div>
                    <div className="h-px border-b border-dashed border-gray-400"></div>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-gray-500">
                  No hay elementos en esta sección.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    );
  };


  return (
    <>
      <div className="no-print">
        <Header/>
         <div className="container mx-auto px-4 pt-8 flex items-center justify-between">
            <div>
                <Button variant="ghost" size="sm" onClick={() => router.push(`/prueba-menu?osId=${osId}`)} className="mb-2">
                    <ArrowLeft className="mr-2" />
                    Volver
                </Button>
                <h1 className="text-3xl font-headline font-bold">Informe de Prueba de Menú</h1>
            </div>
            <Button onClick={handlePrint}><Printer className="mr-2" /> Imprimir / Guardar PDF</Button>
        </div>
      </div>
      
      <main className="container mx-auto px-4 py-4 bg-background">
        <div className="printable-area max-w-4xl mx-auto bg-white p-8 shadow-lg rounded-lg border my-4">
          <header className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-primary flex items-center gap-3"><ClipboardCheck/> Prueba de Menú</h1>
              <p className="text-lg font-semibold">{serviceOrder.serviceNumber} - {serviceOrder.client}</p>
            </div>
            <div className="flex items-center gap-3 text-primary">
              <UtensilsCrossed className="h-8 w-8" />
              <h2 className="text-2xl font-headline font-bold">CateringStock</h2>
            </div>
          </header>

          <section className="mb-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm border p-3 rounded-md">
              <div><strong>Nº PAX:</strong> {serviceOrder.pax}</div>
              <div><strong>Fecha Evento:</strong> {format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')}</div>
              <div className="col-span-2"><strong>Servicios:</strong> {briefingItems.map(i => i.descripcion).join(', ') || '-'}</div>
            </div>
          </section>

          <Separator className="my-4" />

          {renderSection('BODEGA')}
          {renderSection('GASTRONOMÍA')}

          <section className="mt-4">
             <h4 className="text-lg font-bold mb-2 pb-1 border-b-2 border-gray-300">Observaciones Generales</h4>
             <div className="border rounded-lg p-2 min-h-[120px] space-y-4">
                <div className="h-px border-b border-dashed border-gray-400"></div>
                <div className="h-px border-b border-dashed border-gray-400"></div>
                <div className="h-px border-b border-dashed border-gray-400"></div>
             </div>
          </section>

          <footer className="text-center text-xs text-gray-500 pt-6 border-t mt-6">
            Informe generado el {format(new Date(), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
          </footer>
        </div>
      </main>
    </>
  );
}
