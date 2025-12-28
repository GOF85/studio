
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Activity, ArrowLeft } from 'lucide-react';
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
import { useActivityLogs } from '@/hooks/use-data-queries';

export default function ActivityLogPage() {
  const { data: logs = [], isLoading } = useActivityLogs();
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const filteredLogs = useMemo(() => {
    return logs.filter(log =>
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entityId || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  if (isLoading) {
    return <LoadingSkeleton title="Cargando Registro de Actividad..." />;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push('/portal')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
          <Activity className="text-primary" />
          Registro de Actividad
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          placeholder="Buscar en los registros..."
          className="flex-grow max-w-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="p-3">Fecha y Hora</TableHead>
              <TableHead className="p-3">Usuario (Rol)</TableHead>
              <TableHead className="p-3">Acción</TableHead>
              <TableHead className="p-3">Detalles</TableHead>
              <TableHead className="p-3">Entidad Afectada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium p-3 text-xs whitespace-nowrap">
                    {log.timestamp ? format(new Date(log.timestamp), 'dd/MM/yy HH:mm:ss', { locale: es }) : 'N/A'}
                  </TableCell>
                  <TableCell className="p-3">
                    <div className="font-medium">{log.userName}</div>
                    <div className="text-xs text-muted-foreground">{log.userRole}</div>
                  </TableCell>
                  <TableCell className="p-3 font-semibold">{log.action}</TableCell>
                  <TableCell className="p-3 text-sm text-muted-foreground">{log.details}</TableCell>
                  <TableCell className="p-3 font-mono text-xs">{log.entityId}</TableCell>
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
