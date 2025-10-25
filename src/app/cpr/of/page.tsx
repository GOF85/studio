
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, Search, PlusCircle, Trash2, Calendar as CalendarIcon, ChefHat, CheckSquare } from 'lucide-react';
import type { OrdenFabricacion, PartidaProduccion, ServiceOrder, ComercialBriefing, GastronomyOrder, Receta, Elaboracion, ExcedenteProduccion } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { formatNumber, formatUnit } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type NecesidadItem = {
  id: string; // elaboracionId
  nombre: string;
  cantidad: number;
  unidad: string;
  osIDs: Set<string>;
  partida: PartidaProduccion;
  tipoExpedicion: 'REFRIGERADO' | 'CONGELADO' | 'SECO';
};

const statusVariant: { [key in OrdenFabricacion['estado']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  'Pendiente': 'secondary',
  'Asignada': 'secondary',
  'En Proceso': 'outline',
  'Finalizado': 'default',
  'Incidencia': 'destructive',
  'Validado': 'default',
};

const partidaColorClasses: Record<PartidaProduccion, string> = {
    FRIO: 'bg-green-100/50 hover:bg-green-100/80',
    CALIENTE: 'bg-red-100/50 hover:bg-red-100/80',
    PASTELERIA: 'bg-blue-100/50 hover:bg-blue-100/80',
    EXPEDICION: 'bg-yellow-100/50 hover:bg-yellow-100/80'
};

const partidas: PartidaProduccion[] = ['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION'];
const statusOptions = Object.keys(statusVariant) as OrdenFabricacion['estado'][];

export default function OfPage() {
  const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [partidaFilter, setPartidaFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [necesidades, setNecesidades] = useState<Record<string, NecesidadItem[]>>({});
  const [selectedNecesidades, setSelectedNecesidades] = useState<Record<string, Set<string>>>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(addDays(new Date(), 7)),
  });

  const router = useRouter();
  const { toast } = useToast();
  
  const loadData = useCallback(() => {
    let storedOFs = localStorage.getItem('ordenesFabricacion');
    const allOFs = storedOFs ? JSON.parse(storedOFs) : [];
    setOrdenes(allOFs);

    if (!dateRange?.from) {
      setNecesidades({});
      return;
    }
    
    // --- LÓGICA DE CÁLCULO DE NECESIDADES ---
    const serviceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]).filter(os => os.status === 'Confirmado');
    const gastronomyOrders = JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[];
    const recetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const elaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const stockElaboraciones: Record<string, { cantidadTotal: number }> = JSON.parse(localStorage.getItem('stockElaboraciones') || '{}');

    const recetasMap = new Map(recetas.map(r => [r.id, r]));
    const elabMap = new Map(elaboraciones.map(e => [e.id, e]));

    const necesidadesAgregadas: Record<string, NecesidadItem> = {};

    serviceOrders.forEach(os => {
        try {
            const osDate = new Date(os.startDate);
            if (!isWithinInterval(osDate, { start: dateRange.from!, end: dateRange.to || dateRange.from! })) return;
            
            const gastroOrdersForOS = gastronomyOrders.filter(go => go.osId === os.id);
            
            gastroOrdersForOS.forEach(gastroOrder => {
                (gastroOrder.items || []).forEach(item => {
                    if (item.type !== 'item') return;
                    
                    const receta = recetasMap.get(item.id);
                    if (!receta || !receta.elaboraciones) return;

                    receta.elaboraciones.forEach(elabEnReceta => {
                        const elab = elabMap.get(elabEnReceta.elaboracionId);
                        if (!elab) return;
                        
                        const id = elab.id;
                        if (!necesidadesAgregadas[id]) {
                            necesidadesAgregadas[id] = {
                                id,
                                nombre: elab.nombre,
                                cantidad: 0,
                                unidad: elab.unidadProduccion,
                                osIDs: new Set(),
                                partida: elab.partidaProduccion,
                                tipoExpedicion: elab.tipoExpedicion,
                            };
                        }
                        
                        necesidadesAgregadas[id].cantidad += (item.quantity || 1) * elabEnReceta.cantidad;
                        necesidadesAgregadas[id].osIDs.add(os.id);
                    });
                });
            });
        } catch (e) {
            console.warn(`Could not process OS ${os.id}`, e);
        }
    });

    const necesidadesPorFecha: Record<string, NecesidadItem[]> = {};

    Object.values(necesidadesAgregadas).forEach(necesidad => {
        const ofsExistentes = allOFs.filter((of: OrdenFabricacion) => of.elaboracionId === necesidad.id);
        const cantidadEnProduccion = ofsExistentes.reduce((sum:number, of:OrdenFabricacion) => sum + of.cantidadTotal, 0);
        const cantidadEnStock = stockElaboraciones[necesidad.id]?.cantidadTotal || 0;
        
        let cantidadNeta = necesidad.cantidad - cantidadEnProduccion - cantidadEnStock;

        if (cantidadNeta > 0) {
            necesidad.cantidad = cantidadNeta;
            // Simplified date grouping
            const fechaKey = new Date().toISOString().split('T')[0]; // Using today for all for now
            if(!necesidadesPorFecha[fechaKey]) necesidadesPorFecha[fechaKey] = [];
            necesidadesPorFecha[fechaKey].push(necesidad);
        }
    });

    setNecesidades(necesidadesPorFecha);
    setIsMounted(true);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, dateRange]);


  const filteredAndSortedItems = useMemo(() => {
    return ordenes
      .filter(item => {
        const searchMatch = searchTerm === '' || 
                            item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.elaboracionNombre.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'all' || item.estado === statusFilter;
        const partidaMatch = partidaFilter === 'all' || item.partidaAsignada === partidaFilter;
        return searchMatch && statusMatch && partidaMatch;
      })
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
  }, [ordenes, searchTerm, statusFilter, partidaFilter]);
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPartidaFilter('all');
    setSelectedRows(new Set());
  };

  const handleSelectRow = (id: string, checked: boolean | 'indeterminate') => {
    const newSelected = new Set(selectedRows);
    if (checked) newSelected.add(id);
    else newSelected.delete(id);
    setSelectedRows(newSelected);
  };
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) setSelectedRows(new Set(filteredAndSortedItems.map(item => item.id)));
    else setSelectedRows(new Set());
  };
  
  const handleGenerateOFs = (fecha: string) => {
    const seleccionados = selectedNecesidades[fecha];
    if (!seleccionados || seleccionados.size === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No hay necesidades seleccionadas para generar OFs.' });
      return;
    }
    
    let allOFs: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
    const lastIdNumber = allOFs.reduce((max, of) => {
      const numPart = of.id.split('-')[2];
      const num = numPart ? parseInt(numPart) : 0;
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    
    let currentIdCounter = lastIdNumber;
    
    const nuevasOFs: OrdenFabricacion[] = [];
    
    seleccionados.forEach(elabId => {
      const necesidad = necesidades[fecha].find(n => n.id === elabId);
      if (!necesidad) return;
      
      currentIdCounter++;
      
      const newOF: OrdenFabricacion = {
        id: `OF-${new Date().getFullYear()}-${(currentIdCounter).toString().padStart(3, '0')}`,
        fechaCreacion: new Date().toISOString(),
        fechaProduccionPrevista: fecha,
        elaboracionId: necesidad.id,
        elaboracionNombre: necesidad.nombre,
        cantidadTotal: necesidad.cantidad,
        unidad: necesidad.unidad as any,
        partidaAsignada: necesidad.partida,
        tipoExpedicion: necesidad.tipoExpedicion,
        estado: 'Pendiente',
        osIDs: Array.from(necesidad.osIDs),
        incidencia: false,
        okCalidad: false,
      };
      nuevasOFs.push(newOF);
    });

    const updatedOFs = [...allOFs, ...nuevasOFs];
    localStorage.setItem('ordenesFabricacion', JSON.stringify(updatedOFs));
    setOrdenes(updatedOFs);
    
    toast({ title: 'Órdenes de Fabricación Creadas', description: `${nuevasOFs.length} OFs se han añadido a la lista.` });
    
    // Clear selection and reload needs
    setSelectedNecesidades(prev => ({...prev, [fecha]: new Set()}));
    loadData();
  };

  const handleSelectNecesidad = (fecha: string, elabId: string, checked: boolean) => {
    setSelectedNecesidades(prev => {
      const newSelection = new Set(prev[fecha] || []);
      if (checked) newSelection.add(elabId);
      else newSelection.delete(elabId);
      return { ...prev, [fecha]: newSelection };
    });
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Órdenes de Fabricación..." />;
  }

  const ceilToTwoDecimals = (num?: number | null) => {
    if (num === null || num === undefined) return '-';
    return formatNumber(num, 2);
  }

  return (
    <>
      <div className="space-y-4">
        <Accordion type="multiple" className="w-full space-y-4">
           <AccordionItem value="necesidades" className="border-none">
              <Card>
                 <AccordionTrigger className="p-4">
                    <CardTitle className="text-lg flex items-center gap-2"><CheckSquare/>Necesidades de Producción Pendientes</CardTitle>
                 </AccordionTrigger>
                 <AccordionContent className="p-4 pt-0">
                    <div className="space-y-4">
                      {Object.keys(necesidades).length > 0 ? Object.entries(necesidades).map(([fecha, items]) => (
                        <div key={fecha}>
                          <div className="flex justify-between items-center mb-2">
                             <h4 className="font-semibold">Para el {format(parseISO(fecha), 'dd/MM/yyyy')}</h4>
                             <Button size="sm" onClick={() => handleGenerateOFs(fecha)} disabled={!selectedNecesidades[fecha] || selectedNecesidades[fecha].size === 0}>
                                  Generar OF para la selección ({selectedNecesidades[fecha]?.size || 0})
                              </Button>
                          </div>
                          <div className="border rounded-lg">
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead className="w-12"><Checkbox onCheckedChange={(checked) => {
                                                const allIds = new Set(items.map(i => i.id));
                                                setSelectedNecesidades(prev => ({...prev, [fecha]: checked ? allIds : new Set()}));
                                          }}/></TableHead>
                                          <TableHead>Elaboración</TableHead>
                                          <TableHead>Partida</TableHead>
                                          <TableHead className="text-right">Cantidad Necesaria</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {items.map(item => (
                                          <TableRow key={item.id}>
                                              <TableCell><Checkbox checked={selectedNecesidades[fecha]?.has(item.id)} onCheckedChange={(checked) => handleSelectNecesidad(fecha, item.id, !!checked)}/></TableCell>
                                              <TableCell>{item.nombre}</TableCell>
                                              <TableCell><Badge variant="secondary">{item.partida}</Badge></TableCell>
                                              <TableCell className="text-right font-mono">{formatNumber(item.cantidad, 2)} {formatUnit(item.unidad)}</TableCell>
                                          </TableRow>
                                      ))}
                                  </TableBody>
                              </Table>
                          </div>
                        </div>
                      )) : (
                        <p className="text-muted-foreground text-center py-4">No hay necesidades de producción en el rango de fechas seleccionado.</p>
                      )}
                    </div>
                 </AccordionContent>
              </Card>
           </AccordionItem>
        </Accordion>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Factory/>Órdenes de Fabricación Creadas</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-end mb-4">
                  <Button asChild>
                      <Link href="/cpr/of/nuevo">
                        <PlusCircle className="mr-2"/>
                        Nueva OF Manual
                      </Link>
                  </Button>
                </div>

                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-grow">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                              type="search"
                              placeholder="Buscar por Nº de Lote o Elaboración..."
                              className="pl-8 w-full"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                          />
                      </div>
                      <Select value={partidaFilter} onValueChange={setPartidaFilter}>
                          <SelectTrigger className="w-full sm:w-[240px]">
                              <SelectValue placeholder="Filtrar por partida" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Todas las Partidas</SelectItem>
                              {partidas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Estado:</span>
                      <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant={statusFilter === 'all' ? 'default' : 'outline'} onClick={() => setStatusFilter('all')}>Todos</Button>
                          {statusOptions.map(s => (
                              <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>{s}</Button>
                          ))}
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-muted-foreground ml-auto">Limpiar Filtros</Button>
                  </div>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox 
                            checked={selectedRows.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Lote / OF</TableHead>
                        <TableHead>Elaboración</TableHead>
                        <TableHead>Cant. Planificada</TableHead>
                        <TableHead>Cant. Producida</TableHead>
                        <TableHead>Fecha Prevista</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedItems.length > 0 ? (
                        filteredAndSortedItems.map(of => (
                          <TableRow
                            key={of.id}
                            onClick={() => router.push(`/cpr/of/${of.id}`)}
                            className={cn(
                                "cursor-pointer", 
                                of.partidaAsignada && partidaColorClasses[of.partidaAsignada],
                                selectedRows.has(of.id) && 'bg-primary/10 hover:bg-primary/20'
                            )}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox 
                                    checked={selectedRows.has(of.id)}
                                    onCheckedChange={(checked) => handleSelectRow(of.id, checked)}
                                />
                            </TableCell>
                            <TableCell className="font-medium">{of.id}</TableCell>
                            <TableCell>{of.elaboracionNombre}</TableCell>
                            <TableCell>{ceilToTwoDecimals(of.cantidadTotal)} {formatUnit(of.unidad)}</TableCell>
                            <TableCell>{ceilToTwoDecimals(of.cantidadReal)} {of.cantidadReal ? formatUnit(of.unidad) : ''}</TableCell>
                            <TableCell>{format(new Date(of.fechaProduccionPrevista), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariant[of.estado]}>{of.estado}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center">
                            No se encontraron órdenes de fabricación.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}

    