
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Shuffle, Search, Calendar as CalendarIcon, Users } from 'lucide-react';
import type { PersonalMiceOrder, ServiceOrder, Personal } from '@/types';
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
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, calculateHours, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function CesionesPersonalPage() {
  const [cesiones, setCesiones] = useState<PersonalMiceOrder[]>([]);
  const [serviceOrdersMap, setServiceOrdersMap] = useState<Map<string, ServiceOrder>>(new Map());
  const [personalMap, setPersonalMap] = useState<Map<string, Personal>>(new Map());
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const router = useRouter();

  useEffect(() => {
    const allCesiones = (JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[]);
    setCesiones(allCesiones);
    
    const allServiceOrders = (JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[]);
    setServiceOrdersMap(new Map(allServiceOrders.map(os => [os.id, os])));

    const allPersonal = (JSON.parse(localStorage.getItem('personal') || '[]') as Personal[]);
    setPersonalMap(new Map(allPersonal.map(p => [p.nombre, p])));

    setIsMounted(true);
  }, []);
  
  const getDepartment = (nombre: string) => {
    return personalMap.get(nombre)?.departamento || 'N/A';
  }

  const filteredCesiones = useMemo(() => {
    return cesiones.filter(c => {
      const os = serviceOrdersMap.get(c.osId);
      const searchMatch = searchTerm === '' ||
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (os && os.serviceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      let dateMatch = true;
      if (dateRange?.from && os) {
          const osDate = new Date(os.startDate);
          if (dateRange.to) {
              dateMatch = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
          } else {
              dateMatch = isWithinInterval(osDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
          }
      }
      return searchMatch && dateMatch;
    }).sort((a,b) => {
        const osA = serviceOrdersMap.get(a.osId);
        const osB = serviceOrdersMap.get(b.osId);
        if(!osA || !osB) return 0;
        return new Date(osA.startDate).getTime() - new Date(osB.startDate).getTime();
    });
  }, [cesiones, searchTerm, dateRange, serviceOrdersMap]);

  return (
    <main>
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Shuffle />Cesiones de Personal Interno</h1>
        </div>

        <div className="flex gap-4 mb-4">
            <Input 
              placeholder="Buscar por empleado, OS..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Popover>
                <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "PPP", { locale: es })} - {format(dateRange.to, "PPP", { locale: es })} </>) : (format(dateRange.from, "PPP", { locale: es }))) : (<span>Filtrar por fecha de evento...</span>)}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
                </PopoverContent>
            </Popover>
            <Button variant="secondary" onClick={() => { setSearchTerm(''); setDateRange(undefined); }}>Limpiar</Button>
        </div>
        
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>OS</TableHead>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Departamento Origen</TableHead>
                        <TableHead>Centro de Coste Destino</TableHead>
                        <TableHead>Horas Plan.</TableHead>
                        <TableHead>Horas Reales</TableHead>
                        <TableHead>Coste Plan.</TableHead>
                        <TableHead>Coste Real</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredCesiones.length > 0 ? filteredCesiones.map(cesion => {
                        const os = serviceOrdersMap.get(cesion.osId);
                        const horasPlan = calculateHours(cesion.horaEntrada, cesion.horaSalida);
                        const horasReal = calculateHours(cesion.horaEntradaReal, cesion.horaSalidaReal);
                        const costePlan = horasPlan * cesion.precioHora;
                        const costeReal = horasReal > 0 ? horasReal * cesion.precioHora : costePlan;

                        return (
                            <TableRow key={cesion.id} className="cursor-pointer" onClick={() => router.push(`/os/${cesion.osId}/personal-mice`)}>
                                <TableCell><Badge variant="outline">{os?.serviceNumber}</Badge></TableCell>
                                <TableCell className="font-semibold">{cesion.nombre}</TableCell>
                                <TableCell>{getDepartment(cesion.nombre)}</TableCell>
                                <TableCell>{cesion.centroCoste}</TableCell>
                                <TableCell className="font-mono">{horasPlan.toFixed(2)}h</TableCell>
                                <TableCell className="font-mono">{horasReal > 0 ? `${horasReal.toFixed(2)}h` : '-'}</TableCell>
                                <TableCell className="font-mono">{formatCurrency(costePlan)}</TableCell>
                                <TableCell className="font-mono font-bold">{formatCurrency(costeReal)}</TableCell>
                            </TableRow>
                        );
                    }) : (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">No hay cesiones de personal que coincidan con los filtros.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    </main>
  );
}
