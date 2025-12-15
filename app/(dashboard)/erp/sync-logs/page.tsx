'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format, formatDistanceToNow, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';

interface SyncLog {
  id: string;
  created_at: string;
  user_id: string | null;
  type: string;
  status: 'success' | 'error' | 'cancelled';
  log: string;
  duration_ms: number | null;
  extra: any;
}

interface LogStatistics {
  totalLogs: number;
  successCount: number;
  errorCount: number;
  cancelledCount: number;
  avgDuration: number;
  lastSync: string | null;
}

const ITEMS_PER_PAGE = 15;

export default function SyncLogsPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error' | 'cancelled'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedLogForModal, setSelectedLogForModal] = useState<SyncLog | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  
  const { toast } = useToast();

  // Cargar logs desde Supabase
  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtro de fechas
      const startDate = new Date();
      if (dateRange === '7d') startDate.setDate(startDate.getDate() - 7);
      else if (dateRange === '30d') startDate.setDate(startDate.getDate() - 30);
      else if (dateRange === '90d') startDate.setDate(startDate.getDate() - 90);

      if (dateRange !== 'all') {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading logs:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los logs.' });
        setLogs([]);
      } else {
        setLogs(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Error inesperado.' });
      setLogs([]);
    } finally {
      setIsLoading(false);
      setCurrentPage(1);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    loadLogs();
    setIsMounted(true);
  }, [loadLogs]);

  // Filtrar logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;
      if (searchTerm && !log.log.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [logs, searchTerm, statusFilter]);

  // Paginación
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);

  // Estadísticas
  const stats = useMemo<LogStatistics>(() => {
    const successCount = logs.filter(l => l.status === 'success').length;
    const errorCount = logs.filter(l => l.status === 'error').length;
    const cancelledCount = logs.filter(l => l.status === 'cancelled').length;
    const validDurations = logs.filter(l => l.duration_ms).map(l => l.duration_ms!);
    const avgDuration = validDurations.length > 0 ? validDurations.reduce((a, b) => a + b, 0) / validDurations.length : 0;
    const lastSync = logs.length > 0 ? logs[0].created_at : null;

    return {
      totalLogs: logs.length,
      successCount,
      errorCount,
      cancelledCount,
      avgDuration,
      lastSync,
    };
  }, [logs]);

  // Exportar a CSV
  const handleExport = () => {
    if (filteredLogs.length === 0) {
      toast({ variant: 'destructive', title: 'Sin datos', description: 'No hay logs para exportar.' });
      return;
    }

    const csvContent = [
      ['ID', 'Fecha', 'Tipo', 'Estado', 'Duración (ms)', 'Líneas de Log'],
      ...filteredLogs.map(log => [
        log.id,
        format(parseISO(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.type,
        log.status,
        log.duration_ms || '-',
        log.log.split('\n').length,
      ]),
    ]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sync-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast({ title: 'Exportado', description: 'Los logs se han exportado correctamente.' });
  };

  // Copiar log al portapapeles
  const copyLogToClipboard = (log: string) => {
    navigator.clipboard.writeText(log);
    toast({ title: 'Copiado', description: 'Log copiado al portapapeles.' });
  };

  if (!isMounted) return <LoadingSkeleton title="Cargando logs de sincronización..." />;

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* CONTENIDO PRINCIPAL (sin header duplicado) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-muted/50">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Total Sincronizaciones</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{stats.totalLogs}</div>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/30">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-medium text-emerald-700 uppercase flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Exitosas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-emerald-700">{stats.successCount}</div>
            </CardContent>
          </Card>

          <Card className="border-red-100 bg-red-50/30">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-medium text-red-700 uppercase flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Errores
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-red-700">{stats.errorCount}</div>
            </CardContent>
          </Card>

          <Card className="border-yellow-100 bg-yellow-50/30">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-medium text-yellow-700 uppercase flex items-center gap-1">
                <Clock className="h-3 w-3" /> Canceladas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-yellow-700">{stats.cancelledCount}</div>
            </CardContent>
          </Card>

          <Card className="border-muted/50">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Duración Media</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{(stats.avgDuration / 1000).toFixed(1)}s</div>
            </CardContent>
          </Card>
        </div>

        {/* FILTROS */}
        <Card className="border-muted/50">
          <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filtros
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsLoading(true);
                  loadLogs();
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleExport}
                disabled={filteredLogs.length === 0}
                title="Exportar CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en logs..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9"
              />
            </div>

            {/* Estado */}
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="success">✅ Exitosas</SelectItem>
                <SelectItem value="error">❌ Errores</SelectItem>
                <SelectItem value="cancelled">⏸️ Canceladas</SelectItem>
              </SelectContent>
            </Select>

            {/* Rango de fechas */}
            <Select value={dateRange} onValueChange={(val: any) => setDateRange(val)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Rango de fechas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 días</SelectItem>
                <SelectItem value="30d">Últimos 30 días</SelectItem>
                <SelectItem value="90d">Últimos 90 días</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* TABLA DE LOGS (DESKTOP) */}
        {isLoading ? (
          <LoadingSkeleton title="Cargando logs..." />
        ) : filteredLogs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold">No hay logs disponibles</h3>
              <p className="text-sm text-muted-foreground mt-1">Intenta ajustar los filtros o realizar una sincronización.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* TABLA DESKTOP */}
            <div className="hidden md:block border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Duración</TableHead>
                    <TableHead className="text-right">Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map(log => (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition">
                      <TableCell className="w-12">
                        {log.status === 'success' && (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> OK
                          </Badge>
                        )}
                        {log.status === 'error' && (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                            <AlertCircle className="h-3 w-3 mr-1" /> Error
                          </Badge>
                        )}
                        {log.status === 'cancelled' && (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                            <Clock className="h-3 w-3 mr-1" /> Cancelada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{format(parseISO(log.created_at), 'dd/MM/yyyy HH:mm:ss')}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(parseISO(log.created_at), { addSuffix: true, locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {log.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {log.duration_ms ? (
                          <div>
                            <div className="font-medium text-sm">{(log.duration_ms / 1000).toFixed(2)}s</div>
                            <div className="text-xs text-muted-foreground">{log.duration_ms}ms</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            expandedLogId === log.id ? setExpandedLogId(null) : setExpandedLogId(log.id)
                          }
                        >
                          {expandedLogId === log.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLogForModal(log)}
                          title="Ver en detalle"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* VISTA MÓVIL (TARJETAS) */}
            <div className="md:hidden space-y-3">
              {paginatedLogs.map(log => (
                <Card key={log.id} className="border-muted/50">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {log.status === 'success' && (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">
                              ✅ OK
                            </Badge>
                          )}
                          {log.status === 'error' && (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">
                              ❌ Error
                            </Badge>
                          )}
                          {log.status === 'cancelled' && (
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">
                              ⏸️ Cancelada
                            </Badge>
                          )}
                          <Badge variant="secondary" className="capitalize text-xs">
                            {log.type}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium">
                          {format(parseISO(log.created_at), 'dd MMM yyyy, HH:mm', { locale: es })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(parseISO(log.created_at), { addSuffix: true, locale: es })}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        {log.duration_ms && (
                          <div className="font-semibold">{(log.duration_ms / 1000).toFixed(2)}s</div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {/* CONTENIDO EXPANDIBLE */}
                  {expandedLogId === log.id && (
                    <CardContent className="p-4 pt-2 border-t space-y-3">
                      {/* Resumen de detalles */}
                      {log.extra && (
                        <div className="bg-muted/50 p-3 rounded text-xs space-y-1">
                          <div className="font-semibold">Detalles:</div>
                          {log.extra.count && (
                            <div>
                              📊 Artículos sincronizados: <span className="font-mono">{log.extra.count}</span>
                            </div>
                          )}
                          {log.extra.priceChanges && (
                            <div>
                              💰 Cambios de precio: <span className="font-mono">{log.extra.priceChanges}</span>
                            </div>
                          )}
                          {log.extra.error && (
                            <div className="text-red-600">
                              ⚠️ Error: <span className="font-mono">{log.extra.error}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Log preview */}
                      <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs overflow-auto max-h-48">
                        {log.log.split('\n').slice(0, 10).join('\n')}
                        {log.log.split('\n').length > 10 && (
                          <div className="text-gray-500 mt-2">... ({log.log.split('\n').length - 10} más líneas)</div>
                        )}
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => copyLogToClipboard(log.log)}
                        >
                          <Copy className="h-3 w-3 mr-1" /> Copiar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => setSelectedLogForModal(log)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" /> Ver en detalle
                        </Button>
                      </div>
                    </CardContent>
                  )}

                  {/* BOTÓN PARA EXPANDIR */}
                  {expandedLogId !== log.id && (
                    <CardContent className="p-4 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setExpandedLogId(log.id)}
                      >
                        <ChevronDown className="h-4 w-4 mr-2" /> Ver detalles
                      </Button>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {/* PAGINACIÓN */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <div className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL CON DETALLE COMPLETO */}
      <AlertDialog open={!!selectedLogForModal} onOpenChange={() => setSelectedLogForModal(null)}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {selectedLogForModal?.status === 'success' && (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
              {selectedLogForModal?.status === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              {selectedLogForModal?.status === 'cancelled' && (
                <Clock className="h-5 w-5 text-yellow-600" />
              )}
              Log de Sincronización
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {selectedLogForModal &&
                `${format(parseISO(selectedLogForModal.created_at), 'dd/MM/yyyy HH:mm:ss')} • Duración: ${selectedLogForModal.duration_ms ? (selectedLogForModal.duration_ms / 1000).toFixed(2) + 's' : '-'}`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedLogForModal && (
            <div className="flex-1 overflow-auto space-y-4">
              {/* Metadatos */}
              <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium ml-2 capitalize">{selectedLogForModal.type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estado:</span>
                    <span className="font-medium ml-2">
                      {selectedLogForModal.status === 'success' && '✅ Exitosa'}
                      {selectedLogForModal.status === 'error' && '❌ Error'}
                      {selectedLogForModal.status === 'cancelled' && '⏸️ Cancelada'}
                    </span>
                  </div>
                  {selectedLogForModal.extra?.count && (
                    <div>
                      <span className="text-muted-foreground">Artículos:</span>
                      <span className="font-medium ml-2">{selectedLogForModal.extra.count}</span>
                    </div>
                  )}
                  {selectedLogForModal.extra?.priceChanges && (
                    <div>
                      <span className="text-muted-foreground">Cambios de precio:</span>
                      <span className="font-medium ml-2">{selectedLogForModal.extra.priceChanges}</span>
                    </div>
                  )}
                </div>
                {selectedLogForModal.extra?.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm">
                    <strong>Error:</strong> {selectedLogForModal.extra.error}
                  </div>
                )}
              </div>

              {/* Log completo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Log completo ({selectedLogForModal.log.split('\n').length} líneas):</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyLogToClipboard(selectedLogForModal.log)}
                  >
                    <Copy className="h-4 w-4 mr-1" /> Copiar
                  </Button>
                </div>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
                  {selectedLogForModal.log}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setSelectedLogForModal(null)}>
              Cerrar
            </Button>
            {selectedLogForModal && (
              <Button
                variant="secondary"
                onClick={() => {
                  copyLogToClipboard(selectedLogForModal.log);
                  setSelectedLogForModal(null);
                }}
              >
                <Copy className="h-4 w-4 mr-2" /> Copiar y cerrar
              </Button>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
