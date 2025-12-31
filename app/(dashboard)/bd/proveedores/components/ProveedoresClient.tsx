'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown, RefreshCw, ScrollText, Search, Plus, Users, ChevronLeft, ChevronRight, X, History } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Papa from 'papaparse';
import { useProveedores, useProveedoresPaginated, useDeleteProveedor, useUpsertProveedor, useDeleteProveedoresBulk } from '@/hooks/use-data-queries';
import { useQueryClient } from '@tanstack/react-query';

const CSV_HEADERS = ["id", "cif", "IdERP", "nombreEmpresa", "nombreComercial", "direccionFacturacion", "codigoPostal", "ciudad", "provincia", "pais", "emailContacto", "telefonoContacto", "iban", "formaDePagoHabitual"];

interface ProveedoresClientProps {
  initialData: {
    items: Proveedor[];
    totalCount: number;
    totalPages: number;
  };
}

export function ProveedoresClient({ initialData }: ProveedoresClientProps) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: paginatedData, isLoading } = useProveedoresPaginated(page, pageSize, debouncedSearch, initialData);
  const { data: allItems } = useProveedores();
  
  const filteredItems = paginatedData?.items || [];
  const totalPages = paginatedData?.totalPages || 0;
  const totalCount = paginatedData?.totalCount || 0;

  const deleteProveedor = useDeleteProveedor();
  const bulkDeleteMutation = useDeleteProveedoresBulk();
  const upsertProveedor = useUpsertProveedor();
  const queryClient = useQueryClient();

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/factusol/sync-proveedores', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Sincronización completada",
          description: `Se han sincronizado ${result.count || 0} proveedores.`,
        });
        queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error: any) {
      toast({
        title: "Error en la sincronización",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

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

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteProveedor.mutateAsync(itemToDelete);
      toast({ title: "Proveedor eliminado", description: "El registro ha sido eliminado correctamente." });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar el registro.", variant: "destructive" });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
      toast({ title: "Registros eliminados", description: `${selectedIds.size} registros han sido eliminados.` });
      setSelectedIds(new Set());
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron eliminar los registros.", variant: "destructive" });
    } finally {
      setIsBulkDeleteConfirmOpen(false);
    }
  };

  const handleExport = () => {
    if (!allItems) return;
    const csv = Papa.unparse(allItems);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `proveedores_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const { data: rows } = results;
        let successCount = 0;
        let errorCount = 0;

        for (const row of rows as any[]) {
          try {
            await upsertProveedor.mutateAsync({
              id: row.id || undefined,
              cif: row.cif,
              IdERP: row.IdERP,
              nombreFiscal: row.nombreFiscal || row.nombreEmpresa,
              nombreComercial: row.nombreComercial,
              direccionFacturacion: row.direccionFacturacion,
              codigoPostal: row.codigoPostal,
              ciudad: row.ciudad,
              provincia: row.provincia,
              pais: row.pais,
              emailContacto: row.emailContacto,
              telefonoContacto: row.telefonoContacto,
              iban: row.iban,
              formaDePagoHabitual: row.formaDePagoHabitual
            });
            successCount++;
          } catch (err) {
            errorCount++;
          }
        }

        toast({
          title: "Importación completada",
          description: `Éxito: ${successCount}, Errores: ${errorCount}`,
          variant: errorCount > 0 ? "destructive" : "default"
        });
      }
    });
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
                <p className="text-sm text-muted-foreground">
                  {totalCount} proveedores registrados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setIsBulkDeleteConfirmOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar ({selectedIds.size})
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSync}
                disabled={isSyncing}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Factusol'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open('/erp/sync-logs', '_blank')}
              >
                <History className="mr-2 h-4 w-4" />
                Ver Logs
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="mr-2 h-4 w-4" />
                Importar
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              <Button size="sm" onClick={() => router.push('/bd/proveedores/nuevo')}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Proveedor
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleFileUpload}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, CIF o ID ERP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nombre Comercial</TableHead>
                  <TableHead>CIF</TableHead>
                  <TableHead>ID ERP</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No se encontraron proveedores
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.nombreComercial}</span>
                          <span className="text-xs text-muted-foreground">{item.nombreFiscal}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{item.cif}</TableCell>
                      <TableCell className="text-sm">{item.IdERP}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span>{item.emailContacto}</span>
                          <span className="text-muted-foreground">{item.telefonoContacto}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.ciudad}, {item.provincia}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/bd/proveedores/${item.id}`)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setItemToDelete(item.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {filteredItems.length} de {totalCount} proveedores
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <div className="text-sm font-medium">
                Página {page} de {totalPages || 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || isLoading}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro del proveedor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectedIds.size} registros?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente todos los registros seleccionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
              Eliminar todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
