'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Search, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import type { OrdenFabricacion, Personal, StockElaboracion, UnidadMedida, Elaboracion } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { format, parseISO, startOfToday, subDays, isWithinInterval, endOfDay, startOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { useImpersonatedUser } from '@/hooks/use-impersonated-user';


const statusVariant: { [key in OrdenFabricacion['estado']]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  'Pendiente': 'secondary',
  'Asignada': 'secondary',
  'En Proceso': 'outline',
  'Finalizado': 'default',
  'Incidencia': 'destructive',
  'Validado': 'default',
};


export default function CalidadPage() {
  const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [personalCPR, setPersonalCPR] = useState<Personal[]>([]);
  const [ofForIncident, setOfForIncident] = useState<OrdenFabricacion | null>(null);
  const [incidentData, setIncidentData] = useState({ cantidadReal: 0, observaciones: '' });
  const [showAll, setShowAll] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(startOfToday(), 7),
    to: startOfToday(),
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [elaboracionesMap, setElaboracionesMap] = useState<Map<string, Elaboracion>>(new Map());
  const router = useRouter();
  const { toast } = useToast();
  const { impersonatedUser } = useImpersonatedUser();

  useEffect(() => {
    let storedData = localStorage.getItem('ordenesFabricacion');
    if (storedData) {
        setOrdenes(JSON.parse(storedData));
    }
    const allPersonal = JSON.parse(localStorage.getItem('personal') || '[]') as Personal[];
    setPersonalCPR(allPersonal.filter(p => p.departamento === 'CPR'));

    const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    setElaboracionesMap(new Map(allElaboraciones.map(e => [e.id, e])));

    setIsMounted(true);
  }, []);
  
  const handleValidate = (ofId: string) => {
    if (!impersonatedUser) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se ha podido identificar al usuario. Por favor, selecciona un usuario para simular.' });
        return;
    }
    let allOFs: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
    const index = allOFs.findIndex(of => of.id === ofId);
    
    if (index > -1) {
        const validatedOF = {
            ...allOFs[index],
            okCalidad: true,
            estado: 'Validado' as const,
            responsableCalidad: impersonatedUser.nombre,
            fechaValidacionCalidad: new Date().toISOString(),
        };
        allOFs[index] = validatedOF;
        localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
        setOrdenes(allOFs);
        
        // --- Add to Stock ---
        let stock: Record<string, StockElaboracion> = JSON.parse(localStorage.getItem('stockElaboraciones') || '{}');
        const { elaboracionId, cantidadReal, unidad } = validatedOF;
        
        if (!stock[elaboracionId]) {
            stock[elaboracionId] = {
                elaboracionId: elaboracionId,
                cantidadTotal: 0,
                unidad: unidad,
                lotes: []
            };
        }
        
        stock[elaboracionId].cantidadTotal += cantidadReal || 0;
        stock[elaboracionId].lotes.push({
            ofId: validatedOF.id,
            cantidad: cantidadReal || 0,
            fechaCaducidad: addDays(new Date(), 7).toISOString(), // Default 7 days
        });

        localStorage.setItem('stockElaboraciones', JSON.stringify(stock));
        // --- End Add to Stock ---

        toast({ title: 'Lote Validado y Añadido al Stock', description: `La OF ${ofId} ha sido marcada como validada.` });
    }
  };

  const openIncidentDialog = (of: OrdenFabricacion) => {
    setOfForIncident(of);
    setIncidentData({
        cantidadReal: of.cantidadReal ?? of.cantidadTotal,
        observaciones: of.incidenciaObservaciones || ''
    });
  };

  const handleSetIncident = () => {
    if (!ofForIncident) return;
    
    let allOFs: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]') as OrdenFabricacion[];
    const index = allOFs.findIndex(of => of.id === ofForIncident.id);

    if (index > -1) {
        allOFs[index] = {
            ...allOFs[index],
            estado: 'Incidencia',
            incidencia: true,
            cantidadReal: incidentData.cantidadReal,
            incidenciaObservaciones: incidentData.observaciones,
        };
        localStorage.setItem('ordenesFabricacion', JSON.stringify(allOFs));
        setOrdenes(allOFs);
        toast({ title: 'Incidencia Registrada', description: `Se ha registrado una incidencia para la OF ${ofForIncident.id}.`});
        setOfForIncident(null);
    }
  };


  const filteredItems = useMemo(() => {
    return ordenes.filter(item => {
        const isPending = item.estado === 'Finalizado' && !item.okCalidad && !item.incidencia;
        const matchesFilter = showAll || isPending;
        
        const searchMatch = searchTerm === '' || 
                            item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.elaboracionNombre.toLowerCase().includes(searchTerm.toLowerCase());
        
        let dateMatch = true;
        if(dateRange?.from && item.fechaFinalizacion) {
          const itemDate = parseISO(item.fechaFinalizacion);
          if (dateRange.to) {
              dateMatch = isWithinInterval(itemDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
          } else {
              dateMatch = isWithinInterval(itemDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
          }
        } else if (dateRange?.from) {
            dateMatch = false;
        }

        return matchesFilter && searchMatch && dateMatch;
    }).sort((a,b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
  }, [ordenes, searchTerm, showAll, dateRange]);
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setShowAll(false);
    setDateRange({ from: subDays(startOfToday(), 7), to: startOfToday() });
  };


  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Control de Calidad..." />;
  }

  const renderStatusBadge = (of: OrdenFabricacion) => {
    if (of.incidencia) return <Badge variant="destructive">Incidencia</Badge>;
    if (of.okCalidad) return <Badge className="bg-green-600">Validado</Badge>;
    if (of.estado === 'Finalizado') return <Badge variant="secondary">Pendiente Calidad</Badge>;
    return <Badge variant="outline">{of.estado}</Badge>
  }

  return (
    <div>
       <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
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
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal md:w-[300px]", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })} </>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => { setDateRange(range); if(range?.from && range?.to) { setIsDatePickerOpen(false); }}} numberOfMonths={2} locale={es}/>
            </PopoverContent>
        </Popover>
        <div className="flex items-center space-x-2">
            <Checkbox id="showAll" checked={showAll} onCheckedChange={(checked) => setShowAll(Boolean(checked))} />
            <Label htmlFor="showAll">Ver todos los lotes</Label>
        </div>
        <Button variant="secondary" onClick={handleClearFilters}>Limpiar Filtros</Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lote / OF</TableHead>
              <TableHead>Elaboración</TableHead>
              <TableHead>Cantidad Producida</TableHead>
              <TableHead>Valoración Lote</TableHead>
              <TableHead>Fecha Producción</TableHead>
              <TableHead>Responsable</TableHead>
              {showAll && <TableHead>Estado Calidad</TableHead>}
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map(of => {
                  const elab = elaboracionesMap.get(of.elaboracionId);
                  const costeLote = (elab?.costePorUnidad || 0) * (of.cantidadReal || of.cantidadTotal);
                  return (
                <TableRow key={of.id}>
                  <TableCell className="font-medium cursor-pointer" onClick={() => router.push(`/cpr/of/${of.id}`)}>{of.id}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => router.push(`/cpr/of/${of.id}`)}>{of.elaboracionNombre}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => router.push(`/cpr/of/${of.id}`)}>{of.cantidadReal || of.cantidadTotal} {of.unidad}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(costeLote)}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => router.push(`/cpr/of/${of.id}`)}>{of.fechaFinalizacion ? format(new Date(of.fechaFinalizacion), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => router.push(`/cpr/of/${of.id}`)}>
                    <Badge variant="secondary">{of.responsable}</Badge>
                  </TableCell>
                   {showAll && <TableCell>{renderStatusBadge(of)}</TableCell>}
                  <TableCell className="text-right space-x-2">
                     <Button variant="destructive" size="sm" onClick={() => openIncidentDialog(of)} disabled={of.okCalidad || of.incidencia}>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Incidencia
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" disabled={of.okCalidad || of.incidencia}>
                            <CheckCircle className="mr-2 h-4 w-4"/>
                            Validar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Validación de Calidad</AlertDialogTitle>
                              <AlertDialogDescription>
                                  Confirma que el lote <strong>{of.id} ({of.elaboracionNombre})</strong> cumple con los estándares de calidad. Se te asignará como responsable de esta validación. Esta acción añadirá la producción al stock de elaboraciones.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleValidate(of.id)}>Confirmar y Validar</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={showAll ? 8 : 7} className="h-24 text-center">
                  No hay órdenes de fabricación que coincidan con los filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       <AlertDialog open={!!ofForIncident} onOpenChange={(open) => !open && setOfForIncident(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Registrar Incidencia en Lote</AlertDialogTitle>
                    <AlertDialogDescription>
                        Ajusta la cantidad real si es necesario y describe el problema. Esto marcará la OF con una incidencia y la sacará del flujo normal.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="cantidad-incidencia">Cantidad Real Producida ({ofForIncident?.unidad})</Label>
                        <Input 
                            id="cantidad-incidencia" 
                            type="number"
                            step="0.01"
                            value={incidentData.cantidadReal}
                            onChange={(e) => setIncidentData(prev => ({...prev, cantidadReal: parseFloat(e.target.value) || 0}))}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="observaciones-incidencia">Observaciones de la Incidencia</Label>
                        <Textarea 
                            id="observaciones-incidencia"
                            placeholder="Ej: Se quemó parte de la producción, contaminación cruzada, etc."
                            value={incidentData.observaciones}
                            onChange={(e) => setIncidentData(prev => ({...prev, observaciones: e.target.value}))}
                        />
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setOfForIncident(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSetIncident}>Confirmar Incidencia</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
