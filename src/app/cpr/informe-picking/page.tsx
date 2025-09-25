

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, Search } from 'lucide-react';
import type { ServiceOrder, PickingState, OrdenFabricacion, Elaboracion, ComercialBriefing, ComercialBriefingItem } from '@/types';
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

type PickingReportItem = {
    os: ServiceOrder;
    state: PickingState;
}

export default function InformePickingPage() {
  const [reportItems, setReportItems] = useState<PickingReportItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
    const allPickingStates = JSON.parse(localStorage.getItem('pickingStates') || '{}') as {[key: string]: PickingState};
    
    const items: PickingReportItem[] = allServiceOrders
        .filter(os => allPickingStates[os.id] && allPickingStates[os.id].itemStates.length > 0)
        .map(os => ({
            os,
            state: allPickingStates[os.id]
        }));
        
    setReportItems(items);
    setIsMounted(true);
  }, []);

  const filteredItems = useMemo(() => {
    return reportItems.filter(item => 
      item.os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.os.client.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reportItems, searchTerm]);
  
  const handlePrint = (item: PickingReportItem) => {
    const doc = new jsPDF();
    const allBriefings: ComercialBriefing[] = JSON.parse(localStorage.getItem('comercialBriefings') || '[]');
    const allOFs: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]');
    
    const currentBriefing = allBriefings.find(b => b.osId === item.os.id);
    if (!currentBriefing) return;

    doc.setFontSize(18);
    doc.text(`Informe de Picking: OS ${item.os.serviceNumber}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Cliente: ${item.os.client}`, 14, 30);
    doc.text(`Fecha: ${format(new Date(item.os.startDate), 'dd/MM/yyyy', {locale: es})}`, 14, 36);

    let finalY = 45;

    const hitos = currentBriefing.items.filter(i => item.state.assignedContainers.some(c => c.hitoId === i.id));
    
    hitos.forEach(hito => {
        if (finalY > 250) {
            doc.addPage();
            finalY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text(`Hito: ${hito.descripcion} (${format(new Date(hito.fecha), 'dd/MM/yy')} ${hito.horaInicio})`, 14, finalY);
        finalY += 8;

        const containersForHito = item.state.assignedContainers.filter(c => c.hitoId === hito.id);
        
        containersForHito.forEach(container => {
            const containerItems = item.state.itemStates.filter(i => i.containerId === container.id);
            if(containerItems.length === 0) return;

            if (finalY > 260) {
                doc.addPage();
                finalY = 20;
            }
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`Contenedor: ${container.tipo} #${container.numero}`, 16, finalY);
            finalY += 6;

            const tableBody = containerItems.map(assignedLote => {
                const loteInfo = allOFs.find(of => of.id === assignedLote.ofId);
                return [
                    loteInfo?.elaboracionNombre || 'Desconocido',
                    assignedLote.ofId,
                    `${formatNumber(assignedLote.quantity, 2)} ${formatUnit(loteInfo?.unidad || 'Uds')}`
                ];
            });

            autoTable(doc, {
                startY: finalY,
                head: [['Elaboración', 'Lote (OF)', 'Cantidad']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [230, 230, 230], textColor: 20 },
                styles: { fontSize: 9 },
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
            <Printer />
            Informe de Picking
          </h1>
          <p className="text-muted-foreground mt-1">Consulta los resúmenes de picking para cada Orden de Servicio.</p>
        </div>
      </div>

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
                  <TableCell>{format(new Date(item.os.startDate), 'dd/MM/yyyy')}</TableCell>
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
