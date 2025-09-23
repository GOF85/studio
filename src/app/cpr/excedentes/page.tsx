
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { differenceInDays, format, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { PackagePlus, Search, AlertTriangle } from 'lucide-react';
import type { OrdenFabricacion, Elaboracion, ServiceOrder, Receta, GastronomyOrder, ExcedenteProduccion } from '@/types';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Excedente = {
  ofId: string;
  elaboracionId: string;
  elaboracionNombre: string;
  cantidadExcedente: number;
  unidad: string;
  fechaProduccion: string;
  eventosOrigen: string[];
};

export default function ExcedentesPage() {
  const [excedentes, setExcedentes] = useState<Excedente[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const calcularExcedentes = useCallback(() => {
    // --- DATA LOADING ---
    const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.status === 'Confirmado');
    const allGastroOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    const allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const allOrdenesFabricacion = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];

    const recetasMap = new Map(allRecetas.map(r => [r.id, r]));
    const elaboracionesMap = new Map(allElaboraciones.map(e => [e.id, e]));
    const serviceOrderMap = new Map(allServiceOrders.map(os => [os.id, os]));
    
    // --- CALCULATIONS ---
    const necesidadesPorElaboracion = new Map<string, {
        necesidadBruta: number;
        produccionAcumulada: number;
        elaboracion: Elaboracion;
        eventos: Set<string>;
    }>();

    // 1. Calcular necesidad bruta total de todas las OS confirmadas
    allGastroOrders.forEach(gastroOrder => {
      const serviceOrder = serviceOrderMap.get(gastroOrder.osId);
      if (!serviceOrder) return;

      (gastroOrder.items || []).forEach(item => {
        if (item.type === 'item') {
          const receta = recetasMap.get(item.id);
          if (receta) {
            receta.elaboraciones.forEach(elabEnReceta => {
              const elaboracion = elaboracionesMap.get(elabEnReceta.elaboracionId);
              if (elaboracion) {
                const cantidadNecesaria = Number(item.quantity || 0) * Number(elabEnReceta.cantidad);
                if (isNaN(cantidadNecesaria) || cantidadNecesaria <= 0) return;

                let registro = necesidadesPorElaboracion.get(elaboracion.id);
                if (!registro) {
                  registro = { necesidadBruta: 0, produccionAcumulada: 0, elaboracion, eventos: new Set() };
                  necesidadesPorElaboracion.set(elaboracion.id, registro);
                }
                registro.necesidadBruta += cantidadNecesaria;
                registro.eventos.add(serviceOrder.serviceNumber);
              }
            });
          }
        }
      });
    });

    // 2. Sumar toda la producción de todas las OFs
    allOrdenesFabricacion.forEach(of => {
      let registro = necesidadesPorElaboracion.get(of.elaboracionId);
      const cantidadProducida = (of.estado === 'Finalizado' || of.estado === 'Validado' || of.estado === 'Incidencia') && of.cantidadReal !== null 
        ? Number(of.cantidadReal) 
        : Number(of.cantidadTotal);
      
      if (!registro) {
         const elaboracion = elaboracionesMap.get(of.elaboracionId);
         if (elaboracion) {
            registro = { necesidadBruta: 0, produccionAcumulada: 0, elaboracion, eventos: new Set() };
            necesidadesPorElaboracion.set(elaboracion.id, registro);
         }
      }

      if (registro && !isNaN(cantidadProducida)) {
          registro.produccionAcumulada += cantidadProducida;
          of.osIDs.forEach(osId => {
              const os = serviceOrderMap.get(osId);
              if (os) registro.eventos.add(os.serviceNumber);
          })
      }
    });

    // 3. Calcular excedentes
    const excedentesCalculados: Excedente[] = [];
    necesidadesPorElaboracion.forEach((registro, elabId) => {
      const diferencia = registro.produccionAcumulada - registro.necesidadBruta;
      
      if (diferencia > 0.001) { // Si hay excedente significativo
        // Encontrar la OF más reciente para esta elaboración para usar como lote de referencia
        const ofsParaElab = allOrdenesFabricacion
            .filter(of => of.elaboracionId === elabId)
            .sort((a,b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());

        const ofReferencia = ofsParaElab.length > 0 ? ofsParaElab[0] : null;

        excedentesCalculados.push({
          ofId: ofReferencia?.id || `EXCEDENTE-${elabId}`,
          elaboracionId: elabId,
          elaboracionNombre: registro.elaboracion.nombre,
          cantidadExcedente: diferencia,
          unidad: registro.elaboracion.unidadProduccion,
          fechaProduccion: ofReferencia?.fechaFinalizacion || ofReferencia?.fechaCreacion || new Date().toISOString(),
          eventosOrigen: Array.from(registro.eventos),
        });
      }
    });

    setExcedentes(excedentesCalculados);
    setIsMounted(true);
  }, []);

  useEffect(() => {
    calcularExcedentes();
  }, [calcularExcedentes]);

  const filteredItems = useMemo(() => {
    return excedentes.filter(item => 
      item.elaboracionNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ofId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [excedentes, searchTerm]);

  if (!isMounted) {
    return <LoadingSkeleton title="Calculando Excedentes..." />;
  }

  return (
    <TooltipProvider>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
              <PackagePlus />
              Gestión de Excedentes
            </h1>
            <p className="text-muted-foreground mt-1">Revisa y gestiona los sobrantes de producción.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por elaboración o lote de origen..."
            className="flex-grow max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Elaboración</TableHead>
                <TableHead>Lote Origen (OF)</TableHead>
                <TableHead>Cantidad Excedente</TableHead>
                <TableHead>Fecha Producción</TableHead>
                <TableHead>Eventos Origen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const diasDesdeProduccion = differenceInDays(new Date(), new Date(item.fechaProduccion));
                  const necesitaAtencion = diasDesdeProduccion > 3;

                  return (
                    <TableRow 
                        key={item.ofId}
                        className={cn("cursor-pointer", necesitaAtencion && 'bg-destructive/10 hover:bg-destructive/20')}
                        onClick={() => router.push(`/cpr/excedentes/${item.ofId}`)}
                    >
                        <TableCell className="font-medium flex items-center gap-2">
                             {necesitaAtencion && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <AlertTriangle className="h-4 w-4 text-destructive"/>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Revisar por fecha de caducidad próxima.</p>
                                    </TooltipContent>
                                </Tooltip>
                             )}
                            {item.elaboracionNombre}
                        </TableCell>
                        <TableCell><Badge variant="secondary">{item.ofId}</Badge></TableCell>
                        <TableCell>{item.cantidadExcedente.toFixed(2)} {item.unidad}</TableCell>
                        <TableCell>{format(new Date(item.fechaProduccion), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{item.eventosOrigen.join(', ')}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No se encontraron excedentes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
