
'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown, UserCog } from 'lucide-react';
import type { CategoriaPersonal, Proveedor } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { formatCurrency, downloadCSVTemplate } from '@/lib/utils';
import { useDataStore } from '@/hooks/use-data-store';

const CSV_HEADERS = ["id", "proveedorId", "nombreProveedor", "categoria", "precioHora"];

function TiposPersonalPageContent() {
  const { data, isLoaded, loadAllData } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, delimiter: ',' | ';') => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      complete: (results) => {
        const headers = results.meta.fields || [];
        if (!CSV_HEADERS.every(field => headers.includes(field))) {
          toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.` });
          return;
        }

        const importedData: CategoriaPersonal[] = results.data.map((item: any, index: number) => ({
          id: item.id || `TPE-${Date.now()}-${index}`,
          proveedorId: item.proveedorId,
          nombreProveedor: item.nombreProveedor,
          categoria: item.categoria,
          precioHora: parseFloat(item.precioHora) || 0,
        }));

        localStorage.setItem('tiposPersonal', JSON.stringify(importedData));
        loadAllData(); // Refresh store
        toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
      },
      error: (error) => toast({ variant: 'destructive', title: 'Error de importación', description: error.message }),
    });
    if (event.target) event.target.value = '';
  };

  const handleExportCSV = () => {
    if (data.tiposPersonal.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos' });
      return;
    }
    const csv = Papa.unparse(data.tiposPersonal, { columns: CSV_HEADERS });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'catalogo_personal_externo.csv';
    link.click();
    toast({ title: 'Exportación completada' });
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    const updatedData = data.tiposPersonal.filter(i => i.id !== itemToDelete);
    localStorage.setItem('tiposPersonal', JSON.stringify(updatedData));
    loadAllData(); // Refresh store
    toast({ title: 'Categoría eliminada' });
    setItemToDelete(null);
  };

  const filteredItems = useMemo(() => {
    if (!isLoaded) return [];
    return data.tiposPersonal.filter(item => {
      const term = searchTerm.toLowerCase();
      return (
        (item.nombreProveedor || '').toLowerCase().includes(term) ||
        item.categoria.toLowerCase().includes(term)
      );
    });
  }, [isLoaded, data.tiposPersonal, searchTerm]);

  if (!isLoaded) {
    return <LoadingSkeleton title="Cargando Catálogo de Personal Externo..." />;
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          placeholder="Buscar por proveedor o categoría..."
          className="flex-grow max-w-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex-grow flex justify-end gap-2">
          <Button onClick={() => router.push('/bd/tipos-personal/nuevo')}>
            <PlusCircle className="mr-2" />
            Nueva Categoría
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon"><Menu /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                <FileUp size={16} className="mr-2" />Importar CSV
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleImportCSV(e, ';')} />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadCSVTemplate(CSV_HEADERS, 'plantilla_tipos_personal.csv')}>
                <FileDown size={16} className="mr-2" />Descargar Plantilla
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileDown size={16} className="mr-2" />Exportar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor (ETT)</TableHead>
              <TableHead>Categoría Profesional</TableHead>
              <TableHead>Precio/Hora</TableHead>
              <TableHead className="text-right w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/bd/tipos-personal/${item.id}`)}>
                  <TableCell className="font-medium">{item.nombreProveedor}</TableCell>
                  <TableCell>{item.categoria}</TableCell>
                  <TableCell>{formatCurrency(item.precioHora)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/bd/tipos-personal/${item.id}`)}>
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
                <TableCell colSpan={4} className="h-24 text-center">
                  No se encontraron registros.
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
              Esta acción no se puede deshacer. Se eliminará permanentemente la categoría de personal.
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
    </>
  );
}


export default function TiposPersonalPage() {
  return (
    <Suspense fallback={<LoadingSkeleton title="Cargando Catálogo..." />}>
      <TiposPersonalPageContent />
    </Suspense>
  )
}
