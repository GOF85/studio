
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Package, Menu, FileUp, FileDown, Search } from 'lucide-react';
import type { ArticuloCatering } from '@/types';
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
import { Checkbox } from '@/components/ui/checkbox';
import Papa from 'papaparse';
import { ARTICULO_CATERING_CATEGORIAS } from '@/types';

const CSV_HEADERS = ["id", "nombre", "categoria", "precioVenta", "precioAlquiler", "producidoPorPartner", "partnerId", "recetaId"];

export default function ArticulosPage() {
  const [items, setItems] = useState<ArticuloCatering[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isPartnerFilter, setIsPartnerFilter] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  
  const handleExportCSV = () => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay artículos para exportar.' });
      return;
    }
    const dataToExport = items.map(item => ({
        id: item.id,
        nombre: item.nombre,
        categoria: item.categoria,
        precioVenta: item.precioVenta,
        precioAlquiler: item.precioAlquiler,
        producidoPorPartner: item.producidoPorPartner || false,
        partnerId: item.partnerId || '',
        recetaId: item.recetaId || '',
    }));

    const csv = Papa.unparse(dataToExport, { header: true, columns: CSV_HEADERS });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'articulos_catering.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada' });
  };
  
  const parseBoolean = (value: any) => {
    const s = String(value).toLowerCase().trim();
    return s === 'true' || s === '1';
  }

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
        const hasAllHeaders = CSV_HEADERS.every(field => results.meta.fields?.includes(field));
        if (!hasAllHeaders) {
            toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas: ${CSV_HEADERS.join(', ')}`});
            return;
        }

        const importedData: ArticuloCatering[] = results.data.map(item => ({
            id: item.id || Date.now().toString() + Math.random(),
            nombre: item.nombre || '',
            categoria: ARTICULO_CATERING_CATEGORIAS.includes(item.categoria) ? item.categoria : 'Otros',
            precioVenta: parseFloat(item.precioVenta) || 0,
            precioAlquiler: parseFloat(item.precioAlquiler) || 0,
            producidoPorPartner: parseBoolean(item.producidoPorPartner),
            partnerId: item.partnerId || undefined,
            recetaId: item.recetaId || undefined,
        }));
        
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

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Artículos..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Package />Gestión de Artículos MICE</h1>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/bd/articulos/nuevo">
                <PlusCircle className="mr-2" />
                Nuevo Artículo
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                      <Menu />
                  </Button>
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
      </main>

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
                        Selecciona el tipo de delimitador que utiliza tu archivo CSV. Normalmente es una coma (,) para archivos de USA/UK o un punto y coma (;) para archivos de Europa.
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
