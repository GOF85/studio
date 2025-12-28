
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, Search, Calendar as CalendarIcon, CheckCircle, Pencil } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

import type { CesionStorage, Personal } from '@/types';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { calculateHours, formatNumber, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import { useCprCesionesPersonal } from '@/hooks/use-cpr-data';
import { usePersonal } from '@/hooks/use-data-queries';
import { supabase } from '@/lib/supabase';

export default function ValidacionCesionesPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [showValidated, setShowValidated] = useState(false);

  const { toast } = useToast();

  const { data: cesiones = [], isLoading: loadingCesiones, refetch: refetchCesiones } = useCprCesionesPersonal();
  const { data: personal = [], isLoading: loadingPersonal } = usePersonal();

  const personalMap = useMemo(() => {
    return new Map(personal.map(p => [p.nombreCompleto, p]));
  }, [personal]);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const filteredCesiones = useMemo(() => {
    return cesiones.filter(c => {
      const isValidated = c.estado === 'Cerrado';
      if (!showValidated && isValidated) {
        return false;
      }

      const searchMatch = searchTerm === '' ||
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.centroCoste.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (personalMap.get(c.nombre)?.departamento || '').toLowerCase().includes(searchTerm.toLowerCase());

      const dateMatch = !dateFilter || isSameDay(new Date(c.fecha), dateFilter);

      return searchMatch && dateMatch;
    }).sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [cesiones, searchTerm, dateFilter, showValidated, personalMap]);
  
  const handleSaveHours = async (id: string, horaEntradaReal: string, horaSalidaReal: string) => {
    try {
        const { error } = await supabase
            .from('cpr_cesiones_personal')
            .update({
                hora_entrada_real: horaEntradaReal,
                hora_salida_real: horaSalidaReal,
                estado: 'Cerrado',
            })
            .eq('id', id);

        if (error) throw error;

        await refetchCesiones();
        toast({ title: 'Horas Validadas', description: `Se ha guardado el horario real para la cesión.` });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message
        });
    }
  };


  if (!isMounted || loadingCesiones || loadingPersonal) {
    return <LoadingSkeleton title="Cargando Validación de Horas..." />;
  }

  return (
    <div>
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><UserCheck />Validación de Horas (Cesiones)</h1>
        </div>

      <div className="flex gap-4 mb-4">
        <Input 
          placeholder="Buscar por empleado, dpto..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFilter ? format(dateFilter, 'PPP', { locale: es }) : <span>Filtrar por fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateFilter}
              onSelect={setDateFilter}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <div className="flex items-center space-x-2">
          <Checkbox id="show-validated" checked={showValidated} onCheckedChange={(checked) => setShowValidated(Boolean(checked))} />
          <Label htmlFor="show-validated">Mostrar validados</Label>
        </div>
        <Button variant="secondary" onClick={() => { setSearchTerm(''); setDateFilter(undefined); }}>Limpiar Filtros</Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Dpto. Origen</TableHead>
                        <TableHead>Dpto. Destino</TableHead>
                        <TableHead>Horario Plan.</TableHead>
                        <TableHead className="w-24">H. Entrada Real</TableHead>
                        <TableHead className="w-24">H. Salida Real</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredCesiones.length > 0 ? filteredCesiones.map(cesion => {
                        const dptoOrigen = personalMap.get(cesion.nombre)?.departamento || 'N/A';
                        const horasPlan = calculateHours(cesion.horaEntrada, cesion.horaSalida);
                        const isClosed = cesion.estado === 'Cerrado';
                        
                        return (
                            <TableRow key={cesion.id} className={cn(isClosed && 'bg-green-50/50')}>
                                <TableCell>{cesion.fecha ? format(new Date(cesion.fecha), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                <TableCell className="font-semibold">{cesion.nombre}</TableCell>
                                <TableCell><Badge variant="outline">{dptoOrigen}</Badge></TableCell>
                                <TableCell><Badge variant="secondary">{cesion.centroCoste}</Badge></TableCell>
                                <TableCell>{cesion.horaEntrada} - {cesion.horaSalida} ({formatNumber(horasPlan, 2)}h)</TableCell>
                                <TableCell>
                                    <Input
                                        type="time"
                                        defaultValue={cesion.horaEntradaReal || cesion.horaEntrada}
                                        className="h-8"
                                        onBlur={(e) => handleSaveHours(cesion.id, e.target.value, cesion.horaSalidaReal || cesion.horaSalida)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="time"
                                        defaultValue={cesion.horaSalidaReal || cesion.horaSalida}
                                        className="h-8"
                                        onBlur={(e) => handleSaveHours(cesion.id, cesion.horaEntradaReal || cesion.horaEntrada, e.target.value)}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant={isClosed ? "secondary" : "default"} onClick={() => handleSaveHours(cesion.id, cesion.horaEntradaReal || cesion.horaEntrada, cesion.horaSalidaReal || cesion.horaSalida)}>
                                        <CheckCircle className="mr-2 h-4 w-4"/>{isClosed ? 'Re-validar' : 'Validar'}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    }) : (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">No hay cesiones pendientes de validación para los filtros seleccionados.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  )
}

    