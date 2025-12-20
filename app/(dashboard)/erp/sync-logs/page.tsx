'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
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
  TrendingUp,
  TrendingDown,
  Code2,
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
import { GlobalLoadingIndicator } from '@/components/layout/global-loading-indicator';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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

function SyncLogsPageInner() {
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

  // Calcular tendencia (comparar con logs de hace 7 días)
  const previousWeekLogs = logs.filter(l => {
    const logDate = parseISO(l.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 14);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    return logDate >= fourteenDaysAgo && logDate < sevenDaysAgo;
  });

  const previousWeekSuccess = previousWeekLogs.filter(l => l.status === 'success').length;
  const successTrend = previousWeekSuccess > 0 
    ? ((stats.successCount - previousWeekSuccess) / previousWeekSuccess * 100).toFixed(0)
    : 0;

  if (!isMounted) return <GlobalLoadingIndicator />;

  return (
    <main className="min-h-screen bg-background pb-10">
      {/* LAYOUT: SIDEBAR + MAIN CONTENT */}
      <div className="flex gap-6 px-4 sm:px-6 lg:px-8 py-6 items-start">
        
        {/* ==================== SIDEBAR (280px fixed on desktop) ==================== */}
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-20 space-y-6">
            {/* ESTADÍSTICAS MEJORADAS */}
            <div className="space-y-3">
            {/* Total */}
            <Card className="border-muted/50 hover:border-muted transition-colors">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Total</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-3xl font-bold">{stats.totalLogs}</div>
                <div className="text-xs text-muted-foreground mt-1">sincronizaciones registradas</div>
              </CardContent>
            </Card>

            {/* Exitosas con trending */}
            <Card className="border-emerald-100/50 bg-emerald-50/30 hover:border-emerald-200 transition-colors">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-emerald-700 uppercase flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Exitosas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-bold text-emerald-700">{stats.successCount}</div>
                  {successTrend !== 0 && (
                    <div className={`flex items-center gap-1 text-xs font-semibold ${parseFloat(successTrend as string) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {parseFloat(successTrend as string) > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(parseFloat(successTrend as string))}%
                    </div>
                  )}
                </div>
                <div className="text-xs text-emerald-600 mt-1">
                  {stats.totalLogs > 0 ? ((stats.successCount / stats.totalLogs * 100).toFixed(1)) : 0}% tasa de éxito
                </div>
              </CardContent>
            </Card>

            {/* Errores */}
            <Card className="border-red-100/50 bg-red-50/30 hover:border-red-200 transition-colors">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-red-700 uppercase flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Errores
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-3xl font-bold text-red-700">{stats.errorCount}</div>
                <div className="text-xs text-red-600 mt-1">
                  {stats.totalLogs > 0 ? ((stats.errorCount / stats.totalLogs * 100).toFixed(1)) : 0}% tasa de error
                </div>
              </CardContent>
            </Card>

            {/* Canceladas */}
            <Card className="border-yellow-100/50 bg-yellow-50/30 hover:border-yellow-200 transition-colors">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-yellow-700 uppercase flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Canceladas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-3xl font-bold text-yellow-700">{stats.cancelledCount}</div>
                <div className="text-xs text-yellow-600 mt-1">
                  {stats.totalLogs > 0 ? ((stats.cancelledCount / stats.totalLogs * 100).toFixed(1)) : 0}% canceladas
                </div>
              </CardContent>
            </Card>

            {/* Duración Media */}
            <Card className="border-muted/50 hover:border-muted transition-colors">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Duración Media</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-3xl font-bold">{(stats.avgDuration / 1000).toFixed(1)}s</div>
                <div className="text-xs text-muted-foreground mt-1">{stats.avgDuration.toFixed(0)}ms promedio</div>
              </CardContent>
            </Card>

            {/* Última sincronización */}
            {stats.lastSync && (
              <Card className="border-muted/50 bg-muted/20">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Última sincronización</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-sm font-medium">{format(parseISO(stats.lastSync), 'dd/MM HH:mm', { locale: es })}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(parseISO(stats.lastSync), { addSuffix: true, locale: es })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* DIVISOR */}
          <div className="h-px bg-border" />

          {/* FILTROS EN SIDEBAR */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Filtros</h3>

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
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Estado - Chips */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Estado</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'success', 'error', 'cancelled'] as const).map(status => (
                  <Badge
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    className={`cursor-pointer transition-colors ${
                      statusFilter === status ? '' : 'hover:border-muted-foreground/50'
                    } ${
                      status === 'success' && statusFilter === status ? 'bg-emerald-600 hover:bg-emerald-700' :
                      status === 'error' && statusFilter === status ? 'bg-red-600 hover:bg-red-700' :
                      status === 'cancelled' && statusFilter === status ? 'bg-yellow-600 hover:bg-yellow-700' :
                      ''
                    }`}
                    onClick={() => {
                      setStatusFilter(status);
                      setCurrentPage(1);
                    }}
                  >
                    {status === 'all' && 'Todos'}
                    {status === 'success' && '✅ Exitosas'}
                    {status === 'error' && '❌ Errores'}
                    {status === 'cancelled' && '⏸️ Canceladas'}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Rango de fechas */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Rango de fechas</label>
              <Select value={dateRange} onValueChange={(val: any) => {
                setDateRange(val);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Rango de fechas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 días</SelectItem>
                  <SelectItem value="30d">Últimos 30 días</SelectItem>
                  <SelectItem value="90d">Últimos 90 días</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* DIVISOR */}
          <div className="h-px bg-border" />

          {/* BOTONES DE ACCIÓN */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Acciones</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoading(true);
                loadLogs();
              }}
              className="w-full flex items-center justify-center gap-2 h-9"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar logs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
              className="w-full flex items-center justify-center gap-2 h-9"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
          </div>
        </aside>

        {/* ==================== MAIN CONTENT (flex-1) ==================== */}
        <main className="flex-1 flex flex-col gap-4 min-w-0">
          
          {/* HEADER CON TÍTULOS Y FILTROS MOBILE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Logs de Sincronización</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredLogs.length} de {logs.length} registros
                </p>
              </div>
              {/* Botones de acción (MOBILE) */}
              <div className="lg:hidden flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setIsLoading(true);
                    loadLogs();
                  }}
                  title="Actualizar"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExport}
                  disabled={filteredLogs.length === 0}
                  title="Exportar"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* FILTROS MOBILE/TABLET */}
            <div className="lg:hidden space-y-3 bg-muted/30 p-4 rounded-lg">
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
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* Estado y Fechas en grid */}
              <div className="grid grid-cols-2 gap-3">
                <Select value={statusFilter} onValueChange={(val: any) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="success">✅ Exitosas</SelectItem>
                    <SelectItem value="error">❌ Errores</SelectItem>
                    <SelectItem value="cancelled">⏸️ Canceladas</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateRange} onValueChange={(val: any) => {
                  setDateRange(val);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Fechas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">7 días</SelectItem>
                    <SelectItem value="30d">30 días</SelectItem>
                    <SelectItem value="90d">90 días</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* TABLA / CONTENIDO PRINCIPAL */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {isLoading ? (
              <GlobalLoadingIndicator />
            ) : filteredLogs.length === 0 ? (
              <Card className="border-dashed h-full flex items-center justify-center">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold">No hay logs disponibles</h3>
                  <p className="text-sm text-muted-foreground mt-1">Intenta ajustar los filtros o realizar una sincronización.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* TABLA DESKTOP */}
                <div className="hidden md:block border rounded-lg overflow-hidden bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-12">Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Duración</TableHead>
                        <TableHead className="text-right w-16">Detalles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.map((log) => (
                        <React.Fragment key={log.id}>
                          {/* ROW PRINCIPAL */}
                          <TableRow 
                            className="hover:bg-muted/30 transition-colors cursor-pointer border-b"
                            onClick={() => expandedLogId === log.id ? setExpandedLogId(null) : setExpandedLogId(log.id)}
                          >
                            <TableCell className="w-12">
                              {log.status === 'success' && (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> OK
                                </Badge>
                              )}
                              {log.status === 'error' && (
                                <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
                                  <AlertCircle className="h-3 w-3 mr-1" /> Error
                                </Badge>
                              )}
                              {log.status === 'cancelled' && (
                                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
                                  <Clock className="h-3 w-3 mr-1" /> Cancel.
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="font-medium">{format(parseISO(log.created_at), 'dd MMM yyyy', { locale: es })}</div>
                              <div className="text-xs text-muted-foreground">{format(parseISO(log.created_at), 'HH:mm:ss')}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize font-normal">
                                {log.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {log.duration_ms ? (
                                <div>
                                  <div className="font-semibold text-sm">{(log.duration_ms / 1000).toFixed(2)}s</div>
                                  <div className="text-xs text-muted-foreground">{log.duration_ms}ms</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLogForModal(log);
                                }}
                                title="Ver en detalle"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* ROW EXPANDIBLE INLINE */}
                          {expandedLogId === log.id && (
                            <TableRow className="bg-muted/20 border-l-2 border-l-amber-500 hover:bg-muted/20">
                              <TableCell colSpan={5} className="p-0">
                                <div className="p-6 space-y-4">
                                  <Tabs defaultValue="preview" className="w-full">
                                    <TabsList className="grid w-full grid-cols-3">
                                      <TabsTrigger value="preview">Preview</TabsTrigger>
                                      <TabsTrigger value="detalles">Detalles</TabsTrigger>
                                      <TabsTrigger value="full">Log Completo</TabsTrigger>
                                    </TabsList>

                                    {/* PREVIEW */}
                                    <TabsContent value="preview" className="space-y-3">
                                      <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-auto max-h-48 whitespace-pre-wrap break-words border border-gray-800">
                                        {log.log.split('\n').slice(0, 15).join('\n')}
                                        {log.log.split('\n').length > 15 && (
                                          <div className="text-gray-500 mt-2">... ({log.log.split('\n').length - 15} más líneas)</div>
                                        )}
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyLogToClipboard(log.log)}
                                        className="w-full"
                                      >
                                        <Copy className="h-4 w-4 mr-2" /> Copiar log
                                      </Button>
                                    </TabsContent>

                                    {/* DETALLES */}
                                    <TabsContent value="detalles" className="space-y-3">
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="bg-muted/50 p-3 rounded">
                                          <div className="text-xs text-muted-foreground uppercase font-semibold">ID</div>
                                          <div className="font-mono text-xs mt-1 truncate">{log.id}</div>
                                        </div>
                                        <div className="bg-muted/50 p-3 rounded">
                                          <div className="text-xs text-muted-foreground uppercase font-semibold">Líneas</div>
                                          <div className="font-semibold mt-1">{log.log.split('\n').length}</div>
                                        </div>
                                      </div>

                                      {log.extra && (
                                        <div className="bg-muted/50 p-4 rounded space-y-2 text-sm">
                                          <div className="font-semibold">Metadatos:</div>
                                          {log.extra.count && (
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">📊 Artículos:</span>
                                              <span className="font-mono font-semibold">{log.extra.count}</span>
                                            </div>
                                          )}
                                          {log.extra.priceChanges && (
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">💰 Cambios de precio:</span>
                                              <span className="font-mono font-semibold">{log.extra.priceChanges}</span>
                                            </div>
                                          )}
                                          {log.extra.error && (
                                            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-xs">
                                              <strong>❌ Error:</strong> {log.extra.error}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </TabsContent>

                                    {/* LOG COMPLETO */}
                                    <TabsContent value="full" className="space-y-3">
                                      <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-auto max-h-64 whitespace-pre-wrap break-words border border-gray-800">
                                        {log.log}
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyLogToClipboard(log.log)}
                                        className="w-full"
                                      >
                                        <Copy className="h-4 w-4 mr-2" /> Copiar log completo
                                      </Button>
                                    </TabsContent>
                                  </Tabs>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* VISTA MÓVIL (TARJETAS) */}
                <div className="md:hidden space-y-3">
                  {paginatedLogs.map(log => (
                    <Card key={log.id} className="border-muted/50 overflow-hidden">
                      <CardHeader 
                        className="p-4 pb-2 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => expandedLogId === log.id ? setExpandedLogId(null) : setExpandedLogId(log.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {log.status === 'success' && (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs border-emerald-200">
                                  ✅ OK
                                </Badge>
                              )}
                              {log.status === 'error' && (
                                <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs border-red-200">
                                  ❌ Error
                                </Badge>
                              )}
                              {log.status === 'cancelled' && (
                                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs border-yellow-200">
                                  ⏸️ Cancel.
                                </Badge>
                              )}
                              <Badge variant="secondary" className="capitalize text-xs font-normal">
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
                          <div className="text-right text-xs flex flex-col items-end gap-1">
                            {log.duration_ms && (
                              <div className="font-semibold text-sm">{(log.duration_ms / 1000).toFixed(2)}s</div>
                            )}
                            {expandedLogId === log.id ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      {/* CONTENIDO EXPANDIBLE */}
                      {expandedLogId === log.id && (
                        <CardContent className="p-4 pt-2 border-t space-y-3">
                          <Tabs defaultValue="preview" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
                              <TabsTrigger value="detalles" className="text-xs">Detalles</TabsTrigger>
                              <TabsTrigger value="full" className="text-xs">Log</TabsTrigger>
                            </TabsList>

                            {/* PREVIEW */}
                            <TabsContent value="preview" className="space-y-2">
                              <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs overflow-auto max-h-40 whitespace-pre-wrap break-words border border-gray-800">
                                {log.log.split('\n').slice(0, 10).join('\n')}
                                {log.log.split('\n').length > 10 && (
                                  <div className="text-gray-500 mt-1">... ({log.log.split('\n').length - 10} más)</div>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyLogToClipboard(log.log)}
                                className="w-full text-xs h-8"
                              >
                                <Copy className="h-3 w-3 mr-1" /> Copiar
                              </Button>
                            </TabsContent>

                            {/* DETALLES */}
                            <TabsContent value="detalles" className="space-y-2 text-sm">
                              {log.extra && (
                                <div className="bg-muted/50 p-3 rounded space-y-1 text-xs">
                                  {log.extra.count && (
                                    <div className="flex justify-between">
                                      <span>📊 Artículos:</span>
                                      <span className="font-mono font-semibold">{log.extra.count}</span>
                                    </div>
                                  )}
                                  {log.extra.priceChanges && (
                                    <div className="flex justify-between">
                                      <span>💰 Cambios:</span>
                                      <span className="font-mono font-semibold">{log.extra.priceChanges}</span>
                                    </div>
                                  )}
                                  {log.extra.error && (
                                    <div className="bg-red-50 border border-red-200 rounded p-2 text-red-800 mt-2">
                                      <strong>❌ Error:</strong> {log.extra.error}
                                    </div>
                                  )}
                                </div>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedLogForModal(log)}
                                className="w-full text-xs h-8"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" /> Ver completo
                              </Button>
                            </TabsContent>

                            {/* LOG COMPLETO */}
                            <TabsContent value="full" className="space-y-2">
                              <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs overflow-auto max-h-40 whitespace-pre-wrap break-words border border-gray-800">
                                {log.log}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyLogToClipboard(log.log)}
                                className="w-full text-xs h-8"
                              >
                                <Copy className="h-3 w-3 mr-1" /> Copiar todo
                              </Button>
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>

                {/* PAGINACIÓN */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-6">
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
        </main>
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

export default function SyncLogsPage() {
    return (
        <Suspense fallback={<div>Cargando ...</div>}>
            <SyncLogsPageInner />
        </Suspense>
    );
}
