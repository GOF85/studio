
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Activity, ArrowLeft } from 'lucide-react';
import type { ActivityLog } from '@/types';
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

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    const storedLogs = JSON.parse(localStorage.getItem('activityLogs') || '[]') as ActivityLog[];
    // Sort logs by newest first
    storedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setLogs(storedLogs);
    setIsMounted(true);
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log =>
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Registro de Actividad..." />;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          placeholder="Buscar en los registros..."
          className="flex-grow max-w-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="p-2">Fecha y Hora</TableHead>
              <TableHead className="p-2">Usuario (Rol)</TableHead>
              <TableHead className="p-2">Acción</TableHead>
              <TableHead className="p-2">Detalles</TableHead>
              <TableHead className="p-2">Entidad Afectada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium p-2 text-xs">{format(new Date(log.timestamp), 'dd/MM/yy HH:mm:ss', { locale: es })}</TableCell>
                  <TableCell className="p-2">{log.userName} ({log.userRole})</TableCell>
                  <TableCell className="p-2 font-semibold">{log.action}</TableCell>
                  <TableCell className="p-2 text-sm text-muted-foreground">{log.details}</TableCell>
                  <TableCell className="p-2 font-mono text-xs">{log.entityId}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No hay registros de actividad.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
