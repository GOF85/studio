
'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import type { ArticuloCatering } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Checkbox } from '@/components/ui/checkbox';
import Papa from 'papaparse';
import { ARTICULO_CATERING_CATEGORIAS } from '@/types';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown } from 'lucide-react';

const CSV_HEADERS = ["id", "nombre", "categoria", "precioVenta", "precioAlquiler", "producidoPorPartner", "partnerId", "recetaId"];

function ArticulosPageContent() {
  const [items, setItems] = useState<ArticuloCatering[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isPartnerFilter, setIsPartnerFilter] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

  useEffect(() => {
    let storedData = localStorage.getItem('articulos');
    setItems(storedData ? JSON.parse(storedData) : []);
    setIsMounted(true);
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
        const term = searchTerm.toLowerCase();
        const searchMatch = 
          (item.nombre || '').toLowerCase().includes(term) ||
          (item.id || '').toLowerCase().includes(term);
        const categoryMatch = categoryFilter === 'all' || item.categoria === categoryFilter;
        const partnerMatch = !isPartnerFilter || item.producidoPorPartner;
        return searchMatch && categoryMatch && partnerMatch;
    });
  }, [items, searchTerm, categoryFilter, isPartnerFilter]);

  const handleDelete = () => {
    if (!itemToDelete) return;
    const updatedData = items.filter(i => i.id !== itemToDelete);
    localStorage.setItem('articulos', JSON.stringify(updatedData));
    setItems(updatedData);
    toast({ title: 'Artículo eliminado' });
    setItemToDelete(null);
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
          complete: (results) => {
            if (!results.meta.fields || !CSV_HEADERS.every(field => results.meta.fields?.includes(field))) {
                toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.`});
                return;
            }
            
            const existingIds = new Set(items.map(item => item.id));
            const importedData: ArticuloCatering[] = results.data.map((item: any, index: number) => {
                let id = item.id;
                if (!id || id.trim() === '' || existingIds.has(id)) {
                    id = `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`;
                }
                existingIds.add(id);

                return {
                  ...item,
                  id,
                  precioVenta: parseFloat(item.precioVenta) || 0,
                  precioAlquiler: parseFloat(item.precioAlquiler) || 0,
                  producidoPorPartner: item.producidoPorPartner === 'true'
                };
            });
            
            localStorage.setItem('articulos', JSON.stringify(importedData));
            setItems(importedData);
            toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
            setIsImportAlertOpen(false);
          },
          error: (error) => {
            toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
            setIsImportAlertOpen(false);
          }
        });
        if(event.target) {
            event.target.value = '';
        }
    };
    
    const handleExportCSV = () => {
        if (items.length === 0) {
            toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay registros para exportar.' });
            return;
        }

        const csv = Papa.unparse(items, { columns: CSV_HEADERS });
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `articulos.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Exportación completada' });
    };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Artículos..." />;
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input 
          placeholder="Buscar por nombre o ID..."
          className="flex-grow max-w-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue placeholder="Filtrar por categoría" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todas las Categorías</SelectItem>
                {ARTICULO_CATERING_CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
        </Select>
          <div className="flex items-center space-x-2">
            <Checkbox id="partner-filter" checked={isPartnerFilter} onCheckedChange={(checked) => setIsPartnerFilter(Boolean(checked))} />
            <label htmlFor="partner-filter" className="text-sm font-medium">Producido por Partner</label>
          </div>
          <div className="flex-grow flex justify-end gap-2">
            <Button onClick={() => router.push('/bd/articulos/nuevo')}>
                <PlusCircle className="mr-2" />
                Nuevo
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon"><Menu /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setIsImportAlertOpen(true)}>
                        <FileUp size={16} className="mr-2"/>Importar CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCSV}>
                        <FileDown size={16} className="mr-2"/>Exportar CSV
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio Venta</TableHead>
              <TableHead>Precio Alquiler</TableHead>
              <TableHead className="text-right w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/bd/articulos/${item.id}`)}>
                  <TableCell className="font-medium">{item.nombre}</TableCell>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.categoria}</TableCell>
                  <TableCell>{item.precioVenta.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                  <TableCell>{item.precioAlquiler > 0 ? item.precioAlquiler.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/bd/articulos/${item.id}`)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id)}}>
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No se encontraron artículos.
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
              Esta acción no se puede deshacer. Se eliminará permanentemente el artículo.
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

export default function ArticulosPage() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando Artículos..." />}>
            <ArticulosPageContent />
        </Suspense>
    )
}
