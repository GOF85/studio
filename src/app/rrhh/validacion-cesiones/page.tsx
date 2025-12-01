
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, Search, Calendar as CalendarIcon, CheckCircle, Pencil } from 'lucide-react';
import { format, isSameDay, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

import type { CesionStorage, Personal } from '@/types';
import { Button } from '@/components/ui/button';
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

export default function ValidacionCesionesPage() {
  const [cesiones, setCesiones] = useState<CesionStorage[]>([]);
  const [personalMap, setPersonalMap] = useState<Map<string, Personal>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [showValidated, setShowValidated] = useState(false);

  const { toast } = useToast();

  const loadData = useCallback(() => {
    const storedData = (JSON.parse(localStorage.getItem('cesionesPersonal') || '[]') as CesionStorage[]);
    setCesiones(storedData);

    const storedPersonal = (JSON.parse(localStorage.getItem('personal') || '[]') as Personal[]);
    setPersonalMap(new Map(storedPersonal.map(p => [p.nombreCompleto, p])));

  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
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
  
  const handleSaveHours = (id: string, horaEntradaReal: string, horaSalidaReal: string) => {
    const allCesiones = JSON.parse(localStorage.getItem('cesionesPersonal') || '[]') as CesionStorage[];
    const index = allCesiones.findIndex(c => c.id === id);

    if (index > -1) {
        allCesiones[index] = {
            ...allCesiones[index],
            horaEntradaReal,
            horaSalidaReal,
            estado: 'Cerrado',
        };
        localStorage.setItem('cesionesPersonal', JSON.stringify(allCesiones));
        setCesiones(allCesiones);
        toast({ title: 'Horas Validadas', description: `Se ha guardado el horario real para la cesión.` });
    }
  };



    