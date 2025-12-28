
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, Search } from 'lucide-react';
import type { ServiceOrder, PickingState, OrdenFabricacion, Elaboracion, ComercialBriefing, ComercialBriefingItem, GastronomyOrder, Receta } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency, formatNumber, formatUnit } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEventos, useComercialBriefings, useGastronomyOrders, useRecetas } from '@/hooks/use-data-queries';
import { useCprPickingStates, useCprOrdenesFabricacion } from '@/hooks/use-cpr-data';

type PickingReportItem = {
    os: ServiceOrder;
    state: PickingState;
}

export default function InformePickingPage() {
  const { data: allServiceOrders = [] } = useEventos();
  const { data: allPickingStates = [] } = useCprPickingStates();
  const { data: allBriefings = [] } = useComercialBriefings();
  const { data: allOFs = [] } = useCprOrdenesFabricacion();
  const { data: allGastroOrders = [] } = useGastronomyOrders();
  const { data: allRecetas = [] } = useRecetas();

  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const reportItems = useMemo(() => {
    return allServiceOrders
        .filter(os => {
            const state = allPickingStates.find(ps => ps.osId === os.id);
            return state && state.itemStates.length > 0;
        })
        .map(os => ({
            os,
            state: allPickingStates.find(ps => ps.osId === os.id)!
        }));
  }, [allServiceOrders, allPickingStates]);

  const filteredItems = useMemo(() => {
    return reportItems.filter(item => 
      item.os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.os.client.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reportItems, searchTerm]);
  
  const handlePrint = (item: PickingReportItem) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    
    const getRecetaForElaboracion = (elaboracionId: string, osId: string): string => {
        const gastroOrders = allGastroOrders.filter(o => o.osId === osId);
        for (const order of gastroOrders) {
            for (const item of (order.items || [])) {
                if(item.type === 'item') {
                    const receta = allRecetas.find(r => r.id === item.id);
                    if(receta && receta.elaboraciones.some(e => e.elaboracionId === elaboracionId)) {
                        return receta.nombre;
                    }
                }
            }
        }
        return 'Directa';
    };


    const currentBriefing = allBriefings.find(b => b.osId === item.os.id);
    if (!currentBriefing) return;

    let finalY = 40;

    const hitos = currentBriefing.items.filter(i => item.state.assignedContainers.some(c => c.hitoId === i.id));
    
    hitos.forEach(hito => {
        if (finalY > 780) { // Check for page break
            doc.addPage();
            finalY = 40;
        }
        
        const hitoIndex = currentBriefing.items.findIndex(h => h.id === hito.id);
        const expedicionNumero = `${item.os.serviceNumber}.${(hitoIndex + 1).toString().padStart(2, '0')}`;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`Carambuco (Refrigerado)`, 40, finalY);
        finalY += 20;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Servicio:`, 40, finalY);
        doc.setFont('helvetica', 'normal');
        doc.text(hito.descripcion, 85, finalY);
        finalY += 20;

        autoTable(doc, {
            body: [
                ['Cliente:', item.os.client],
                ['Espacio:', item.os.space],
                ['Fecha:', `${format(new Date(hito.fecha), 'dd/MM/yy')} ${hito.horaInicio}`],
                ['Exp:', expedicionNumero],
                ['OS:', item.os.serviceNumber],
            ],
            startY: finalY,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 1 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });
        finalY = (doc as any).lastAutoTable.finalY + 15;

        const containersForHito = item.state.assignedContainers.filter(c => c.hitoId === hito.id);
        
        containersForHito.forEach(container => {
            const containerItems = item.state.itemStates.filter(i => i.containerId === container.id);
            if(containerItems.length === 0) return;

            if (finalY > 780) {
                doc.addPage();
                finalY = 40;
            }

            const tableBody = containerItems.map(assignedLote => {
                const loteInfo = allOFs.find(of => of.id === assignedLote.ofId);
                const recetaNombre = loteInfo ? getRecetaForElaboracion(loteInfo.elaboracionId, item.os.id) : '-';
                return [
                    loteInfo?.elaboracionNombre || 'Desconocido',
                    recetaNombre,
                    `${formatNumber(assignedLote.quantity, 2)} ${formatUnit(loteInfo?.unidad || 'Uds')}`
                ];
            });

            autoTable(doc, {
                startY: finalY,
                head: [['Elaboración', 'Receta', 'Cant.']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [230, 230, 230], textColor: 20 },
                styles: { fontSize: 8, cellPadding: 2, overflow: 'ellipsize' },
                columnStyles: { 
                    0: { cellWidth: 'auto' }, 
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 50, halign: 'right' }
                }
            });

            finalY = (doc as any).lastAutoTable.finalY + 10;
        });
    });

    doc.save(`Informe_Picking_${item.os.serviceNumber}.pdf`);
  }

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Informe de Picking..." />;
  }

  return (
    <div>
       <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por Nº de Servicio o Cliente..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Servicio</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Nº Contenedores</TableHead>
              <TableHead>Nº Lotes Asignados</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <TableRow
                  key={item.os.id}
                  onClick={() => router.push(`/cpr/picking/${item.os.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium"><Badge variant="secondary">{item.os.serviceNumber}</Badge></TableCell>
                  <TableCell>{item.os.client}</TableCell>
                  <TableCell>{item.os.startDate ? format(new Date(item.os.startDate), 'dd/MM/yyyy') : '—'}</TableCell>
                  <TableCell>{item.state.assignedContainers.length}</TableCell>
                  <TableCell>{item.state.itemStates.length}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handlePrint(item)}}>
                        <Printer className="mr-2 h-4 w-4"/> Imprimir Informe
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No hay Órdenes de Servicio con picking realizado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
