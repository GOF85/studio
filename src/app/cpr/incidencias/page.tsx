
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Search } from 'lucide-react';
import type { OrdenFabricacion, PartidaProduccion } from '@/types';
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
import { format } from 'date-fns';

const partidas: PartidaProduccion[] = ['FRIO', 'CALIENTE', 'PASTELERIA', 'EXPEDICION'];

export default function IncidenciasPage() {
  const [ordenes, setOrdenes] = useState<OrdenFabricacion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [partidaFilter, setPartidaFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    let storedData = localStorage.getItem('ordenesFabricacion');
    if (storedData) {
        const allOFs = JSON.parse(storedData) as OrdenFabricacion[];
        setOrdenes(allOFs.filter(of => of.estado === 'Incidencia'));
    }
  }, []);

  const filteredItems = useMemo(() => {
    return ordenes.filter(item => {
      const searchMatch = searchTerm === '' || 
                          item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.elaboracionNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.responsable || '').toLowerCase().includes(searchTerm.toLowerCase());
      const partidaMatch = partidaFilter === 'all' || item.partidaAsignada === partidaFilter;
      return searchMatch && partidaMatch;
    });
  }, [ordenes, searchTerm, partidaFilter]);

