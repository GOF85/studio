'use client';

import { useState, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown, RefreshCw, ScrollText, Search, Plus, Users } from 'lucide-react';
import type { Proveedor } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { downloadCSVTemplate, cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Papa from 'papaparse';
import { useProveedores, useDeleteProveedor, useUpsertProveedor, useDeleteProveedoresBulk } from '@/hooks/use-data-queries';
import { useQueryClient } from '@tanstack/react-query';

const CSV_HEADERS = ["id", "cif", "IdERP", "nombreEmpresa", "nombreComercial", "direccionFacturacion", "codigoPostal", "ciudad", "provincia", "pais", "emailContacto", "telefonoContacto", "iban", "formaDePagoHabitual"];

function ProveedoresPageContent() {
  const { data: items, isLoading } = useProveedores();
  const proveedores = items || [];
  const deleteProveedor = useDeleteProveedor();
  const bulkDeleteMutation = useDeleteProveedoresBulk();
  const upsertProveedor = useUpsertProveedor();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebugLog, setShowDebugLog] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

  const filteredItems = useMemo(() => {
    return proveedores.filter(item => {
      const term = searchTerm.toLowerCase();
      const searchMatch =
        (item.nombreComercial || '').toLowerCase().includes(term) ||
        (item.nombreFiscal || '').toLowerCase().includes(term) ||
        (item.cif || '').toLowerCase().includes(term);

      return searchMatch;
    });
  }, [proveedores, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(item => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
      toast({ title: 'Proveedores eliminados', description: `Se han eliminado ${selectedIds.size} proveedores.` });
      setSelectedIds(new Set());
      setIsBulkDeleteConfirmOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteProveedor.mutateAsync(itemToDelete);
      toast({ title: 'Proveedor eliminado' });
    } catch (error: any) {
      console.error('Error deleting provider:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Error al eliminar: ' + error.message });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleExportCSV = () => {
    if (proveedores.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay proveedores para exportar.' });
      return;
    }
    const dataToExport = proveedores.map(item => ({
      id: item.id,
      cif: item.cif,
      IdERP: item.IdERP,
      nombreEmpresa: item.nombreFiscal,
      nombreComercial: item.nombreComercial,
      direccionFacturacion: item.direccionFacturacion,
      codigoPostal: item.codigoPostal,
      ciudad: item.ciudad,
      provincia: item.provincia,
      pais: item.pais,
      emailContacto: item.emailContacto,
      telefonoContacto: item.telefonoContacto,
      iban: item.iban,
      formaDePagoHabitual: item.formaDePagoHabitual
    }));
    const csv = Papa.unparse(dataToExport, { columns: CSV_HEADERS });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'proveedores.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada' });
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
    const file = event.target.files?.[0];
    if (!file) {
      setIsImportAlertOpen(false);
      return;
    }

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      complete: async (results) => {
        if (!results.meta.fields || !CSV_HEADERS.every(field => results.meta.fields?.includes(field))) {
          // Check for alternative headers if exact match fails
          const hasBasicHeaders = results.meta.fields?.includes('nombreComercial') || results.meta.fields?.includes('nombre_comercial');
          if (!hasBasicHeaders) {
            toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener al menos la columna nombreComercial.` });
            return;
          }
        }

        try {
          setIsSyncing(true);
          let successCount = 0;
          let errorCount = 0;

          for (const row of results.data) {
            try {
              const proveedorData: Partial<Proveedor> = {
                nombreComercial: row.nombreComercial || row.nombre_comercial || '',
                nombreFiscal: row.nombreFiscal || row.nombre_fiscal || row.nombreEmpresa || row.nombre_empresa || '',
                cif: row.cif || '',
                IdERP: row.IdERP || row.id_erp || '',
                direccionFacturacion: row.direccionFacturacion || row.direccion_facturacion || '',
                ciudad: row.ciudad || '',
                codigoPostal: row.codigoPostal || row.codigo_postal || '',
                provincia: row.provincia || '',
                pais: row.pais || 'España',
                telefonoContacto: row.telefonoContacto || row.telefono_contacto || '',
                emailContacto: row.emailContacto || row.email_contacto || '',
                iban: row.iban || '',
                formaDePagoHabitual: row.formaDePagoHabitual || row.forma_de_pago_habitual || '',
              };

              await upsertProveedor.mutateAsync(proveedorData);
              successCount++;
            } catch (err) {
              console.error('Error importing row:', err, row);
              errorCount++;
            }
          }

          toast({ title: 'Importación finalizada', description: `Se importaron ${successCount} proveedores. Errores: ${errorCount}` });
        } catch (error: any) {
          console.error('Error importing CSV:', error);
          toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        } finally {
          setIsSyncing(false);
          setIsImportAlertOpen(false);
        }
      },
      error: (error) => {
        toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        setIsImportAlertOpen(false);
      }
    });

    if (event.target) {
      event.target.value = '';
    }
  };

  const handleFactusolSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    setDebugLog([]);
    toast({ title: 'Sincronizando...', description: 'Conectando con Factusol...' });

    try {
      const response = await fetch('/api/factusol/sync-proveedores', { method: 'POST' });
      const result = await response.json();

      if (result.debugLog) {
        setDebugLog(result.debugLog);
      }

      if (result.success) {
        toast({ title: 'Sincronización completada', description: `Se han sincronizado ${result.count} proveedores.` });
        queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      } else {
        toast({ variant: 'destructive', title: 'Error de sincronización', description: result.error || 'Error desconocido' });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Error al conectar con el servidor de sincronización.' });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton title="Cargando Proveedores..." />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header Premium */}
      <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ScrollText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic">Proveedores</h1>
              <p className="text-[10px] font-bold text-muted-foreground/60 tracking-[0.2em] uppercase">Gestión de proveedores y catálogos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                className="h-11 px-6 rounded-xl font-black uppercase tracking-tighter flex items-center gap-2 animate-in fade-in slide-in-from-right-4"
                onClick={() => setIsBulkDeleteConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar ({selectedIds.size})
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 px-6 rounded-xl font-bold flex items-center gap-2 border-border/40 hover:bg-accent transition-all">
                  <Menu className="h-4 w-4" />
                  Acciones
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-border/40 p-2 shadow-2xl">
                <DropdownMenuItem onSelect={() => setIsImportAlertOpen(true)} className="rounded-xl p-3 font-bold">
                  <FileUp size={18} className="mr-3 text-primary" />Importar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadCSVTemplate(CSV_HEADERS, 'plantilla_proveedores.csv')} className="rounded-xl p-3 font-bold">
                  <FileDown size={18} className="mr-3 text-primary" />Descargar Plantilla
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} className="rounded-xl p-3 font-bold">
                  <FileDown size={18} className="mr-3 text-primary" />Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => handleFactusolSync(e as any)} disabled={isSyncing} className="rounded-xl p-3 font-bold">
                  {isSyncing ? <RefreshCw className="mr-3 h-4 w-4 animate-spin text-primary" /> : <RefreshCw className="mr-3 h-4 w-4 text-primary" />}
                  Sincronizar Factusol
                </DropdownMenuItem>
                {debugLog.length > 0 && (
                  <DropdownMenuItem onSelect={() => setShowDebugLog(true)} className="rounded-xl p-3 font-bold">
                    <ScrollText className="mr-3 h-4 w-4 text-primary" /> Ver Log
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              className="h-11 px-6 rounded-xl font-black bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
              onClick={() => router.push('/bd/proveedores/nuevo')}
            >
              <Plus className="h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 gap-4 bg-card/50 backdrop-blur-sm p-6 rounded-[2rem] border border-border/40 shadow-sm">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar por nombre, CIF o empresa..."
                className="pl-11 h-12 rounded-2xl border-border/40 bg-background/50 focus:ring-primary/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-card rounded-[2rem] border border-border/40 shadow-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/40 h-16 bg-muted/30">
                  <TableHead className="w-[50px] pl-8">
                    <Checkbox 
                      checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                      onCheckedChange={toggleSelectAll}
                      className="rounded-md border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </TableHead>
                  <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Nombre Comercial</TableHead>
                  <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">CIF</TableHead>
                  <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Contacto</TableHead>
                  <TableHead className="font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Ciudad</TableHead>
                  <TableHead className="text-right pr-8 font-black uppercase tracking-tighter text-[11px] text-muted-foreground/70">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <TableRow 
                      key={item.id} 
                      className={cn(
                        "group h-20 border-b border-border/20 transition-colors",
                        selectedIds.has(item.id) ? "bg-primary/5" : "hover:bg-primary/[0.02]"
                      )}
                      onClick={() => router.push(`/bd/proveedores/${item.id}`)}
                    >
                      <TableCell className="pl-8" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          className="rounded-md border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-sm tracking-tight uppercase group-hover:text-primary transition-colors">{item.nombreComercial}</span>
                          <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-0.5">ID: {item.id.slice(0, 8)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground/60">
                        {item.cif}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-muted-foreground/70">{item.emailContacto || '-'}</span>
                          <span className="text-[10px] font-medium text-muted-foreground/40">{item.telefonoContacto || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-xs text-muted-foreground/60 uppercase">
                        {item.ciudad || '-'}
                      </TableCell>
                      <TableCell className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                            onClick={() => router.push(`/bd/proveedores/${item.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                            onClick={() => setItemToDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground/30">
                        <ScrollText className="h-16 w-16 mb-4 opacity-10" />
                        <p className="text-lg font-black uppercase tracking-widest">No se encontraron proveedores</p>
                        <p className="text-sm font-medium mt-1">Prueba a cambiar los filtros de búsqueda</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={showDebugLog} onOpenChange={setShowDebugLog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto rounded-[2rem] border-border/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter">Log de Sincronización</DialogTitle>
            <DialogDescription className="font-medium">Detalle del proceso de sincronización con Factusol</DialogDescription>
          </DialogHeader>
          <div className="bg-slate-950 text-slate-50 p-6 rounded-2xl font-mono text-xs space-y-2 shadow-inner">
            {debugLog.map((line, i) => (
              <div key={i} className="border-b border-slate-800/50 pb-2 last:border-0">{line}</div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              Esta acción no se puede deshacer. Se eliminará permanentemente el proveedor y todos sus catálogos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl h-12 font-black bg-destructive hover:bg-destructive/90 text-white px-8"
              onClick={handleDelete}
            >
              Eliminar Proveedor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              ¿Eliminar {selectedIds.size} proveedores?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              Estás a punto de eliminar {selectedIds.size} proveedores de forma permanente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl h-12 font-black bg-destructive hover:bg-destructive/90 text-white px-8"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar todos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
        <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter">Importar Archivo CSV</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              Selecciona el tipo de delimitador que utiliza tu archivo CSV. El fichero debe tener cabeceras que coincidan con el modelo de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-4">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, fileInputRef.current?.getAttribute('data-delimiter') as ',' | ';')} />
            <Button 
              variant="outline"
              className="rounded-xl h-12 font-bold flex-1"
              onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ','); fileInputRef.current?.click(); }}
            >
              Comas ( , )
            </Button>
            <Button 
              variant="outline"
              className="rounded-xl h-12 font-bold flex-1"
              onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ';'); fileInputRef.current?.click(); }}
            >
              Punto y Coma ( ; )
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ProveedoresPage() {
  return (
    <Suspense fallback={<LoadingSkeleton title="Cargando Proveedores..." />}>
      <ProveedoresPageContent />
    </Suspense>
  )
}
