

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
        observaciones: of.observacionesIncidencia || ''
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
            observacionesIncidencia: incidentData.observaciones,
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


