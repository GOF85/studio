'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown, Building2, RefreshCw, ScrollText } from 'lucide-react';
import type { Proveedor, TipoProveedor } from '@/types';
import { TIPO_PROVEEDOR_OPCIONES } from '@/types';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { downloadCSVTemplate } from '@/lib/utils';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Papa from 'papaparse';
import { Badge } from '@/components/ui/badge';

const CSV_HEADERS = ["id", "cif", "IdERP", "nombreEmpresa", "nombreComercial", "direccionFacturacion", "codigoPostal", "ciudad", "provincia", "pais", "emailContacto", "telefonoContacto", "iban", "formaDePagoHabitual"];

function ProveedoresPageContent() {
  const [items, setItems] = useState<Proveedor[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebugLog, setShowDebugLog] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

  const loadProveedores = async () => {
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('nombre_comercial', { ascending: true });

    if (error) {
      console.error('Error loading proveedores:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los proveedores.' });
    } else {
      // Map Supabase columns to Proveedor type
      const mappedItems = (data || []).map((row: any) => ({
        id: row.id,
        nombreComercial: row.nombre_comercial,
        nombreFiscal: row.nombre_fiscal,
        cif: row.cif || '',
        IdERP: row.id_erp || '',
        direccionFacturacion: row.direccion_facturacion || '',
        ciudad: row.ciudad || '',
        codigoPostal: row.codigo_postal || '',
        provincia: row.provincia || '',
        pais: row.pais || 'España',
        telefonoContacto: row.telefono_contacto || '',
        emailContacto: row.email_contacto || '',
        contacto: row.contacto || '',
        iban: row.iban || '',
        formaDePagoHabitual: row.forma_de_pago_habitual || '',
      })) as Proveedor[];
      setItems(mappedItems);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    loadProveedores();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const term = searchTerm.toLowerCase();
      const searchMatch =
        (item.nombreComercial || '').toLowerCase().includes(term);

      return searchMatch;
    });
  }, [items, searchTerm]);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from('proveedores')
        .delete()
        .eq('id', itemToDelete);

      if (error) throw error;

      toast({ title: 'Proveedor eliminado' });
      loadProveedores();
    } catch (error: any) {
      console.error('Error deleting provider:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Error al eliminar: ' + error.message });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay proveedores para exportar.' });
      return;
    }
    const dataToExport = items.map(item => ({ ...item }));
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
          toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.` });
          return;
        }

        try {
          const importedData: Partial<Proveedor>[] = results.data.map((item: any) => {
            const { id, ...rest } = item; // Destructure id
            return {
              ...rest,
              // Supabase will generate 'id' if not provided, or use it if it's a UUID.
              // For simplicity, we'll omit it here and let Supabase handle it.
            };
          });

          const { error } = await supabase.from('proveedores').insert(importedData);
          if (error) throw error;

          toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
          loadProveedores();
        } catch (error: any) {
          console.error('Error importing CSV:', error);
          toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        } finally {
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

  const handleFactusolSync = async (e: Event) => {
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
        loadProveedores();
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

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Proveedores..." />;
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          placeholder="Buscar por nombre comercial..."
          className="flex-grow max-w-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex-grow flex justify-end gap-2">
          <Button onClick={() => router.push('/bd/proveedores/nuevo')}>
            <PlusCircle className="mr-2" />
            Nuevo Proveedor
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon"><Menu /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setIsImportAlertOpen(true)}>
                <FileUp size={16} className="mr-2" />Importar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadCSVTemplate(CSV_HEADERS, 'plantilla_proveedores.csv')}>
                <FileDown size={16} className="mr-2" />Descargar Plantilla
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileDown size={16} className="mr-2" />Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleFactusolSync} disabled={isSyncing}>
                {isSyncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sincronizar con Factusol
              </DropdownMenuItem>
              {debugLog.length > 0 && (
                <DropdownMenuItem onSelect={() => setShowDebugLog(true)}>
                  <ScrollText className="mr-2 h-4 w-4" /> Ver Log Sincronización
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={showDebugLog} onOpenChange={setShowDebugLog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log de Sincronización</DialogTitle>
            <DialogDescription>Detalle del proceso de sincronización con Factusol</DialogDescription>
          </DialogHeader>
          <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-xs space-y-1">
            {debugLog.map((line, i) => (
              <div key={i} className="border-b border-slate-800 pb-1 last:border-0">{line}</div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre Comercial</TableHead>
              <TableHead>CIF</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead className="text-right w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/bd/proveedores/${item.id}`)}>
                  <TableCell className="font-medium">{item.nombreComercial}</TableCell>
                  <TableCell>{item.cif}</TableCell>
                  <TableCell>{item.ciudad}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/bd/proveedores/${item.id}`)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id) }}>
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No se encontraron proveedores.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el proveedor y todos sus catálogos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar Archivo CSV</AlertDialogTitle>
            <AlertDialogDescription>
              Selecciona el tipo de delimitador que utiliza tu archivo CSV. El fichero debe tener cabeceras que coincidan con el modelo de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="!justify-center gap-4">
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, fileInputRef.current?.getAttribute('data-delimiter') as ',' | ';')} />
            <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ','); fileInputRef.current?.click(); }}>Delimitado por Comas (,)</Button>
            <Button onClick={() => { fileInputRef.current?.setAttribute('data-delimiter', ';'); fileInputRef.current?.click(); }}>Delimitado por Punto y Coma (;)</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ProveedoresPage() {
  return (
    <Suspense fallback={<LoadingSkeleton title="Cargando Proveedores..." />}>
      <ProveedoresPageContent />
    </Suspense>
  )
}
