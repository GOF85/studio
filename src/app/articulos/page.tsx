
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, FileDown, FileUp, Package, ArrowLeft, Star, Menu } from 'lucide-react';
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
import Papa from 'papaparse';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const CSV_HEADERS = ["id", "erpId", "nombre", "categoria", "subcategoria", "esHabitual", "precioVenta", "precioAlquiler", "precioReposicion", "stockSeguridad", "tipo", "loc", "imagen", "producidoPorPartner", "partnerId", "recetaId"];

export default function ArticulosPage() {
  const [items, setItems] = useState<ArticuloCatering[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let storedData = localStorage.getItem('articulos');
    setItems(storedData ? JSON.parse(storedData) : []);
    setIsMounted(true);
  }, []);
  
  const { categories, types } = useMemo(() => {
    const allCategories = new Set(items.map(i => i.categoria));
    const allTypes = new Set(items.map(i => i.tipo).filter(Boolean) as string[]);
    return {
        categories: ['all', ...Array.from(allCategories)],
        types: ['all', ...Array.from(allTypes)],
    }
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      (item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (item.subcategoria || '').toLowerCase().includes(searchTerm.toLowerCase()) || (item.erpId || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
      (categoryFilter === 'all' || item.categoria === categoryFilter) &&
      (typeFilter === 'all' || item.tipo === typeFilter)
    );
  }, [items, searchTerm, categoryFilter, typeFilter]);


  const handleExportCSV = () => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay artículos para exportar.' });
      return;
    }
    const csv = Papa.unparse(items);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'articulos_mice.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada', description: 'El archivo articulos_mice.csv se ha descargado.' });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const parseCurrency = (value: string | number) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleaned = value.replace(/[€\s]/g, '').replace(',', '.');
        const number = parseFloat(cleaned);
        return isNaN(number) ? 0 : number;
    }
    return 0;
  };
  
  const parseBoolean = (value: any) => {
    return value === 'true' || value === true;
  }

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const hasAllHeaders = CSV_HEADERS.every(field => headers.includes(field));

        if (!hasAllHeaders) {
            toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.`});
            return;
        }
        
        const importedData: ArticuloCatering[] = results.data.map((item: any) => ({
            id: item.id || Date.now().toString() + Math.random(),
            erpId: item.erpId || undefined,
            nombre: item.nombre || '',
            categoria: item.categoria || 'Varios',
            subcategoria: item.subcategoria || undefined,
            esHabitual: parseBoolean(item.esHabitual),
            precioVenta: parseCurrency(item.precioVenta),
            precioAlquiler: parseCurrency(item.precioAlquiler),
            precioReposicion: parseCurrency(item.precioReposicion),
            stockSeguridad: Number(item.stockSeguridad) || 0,
            tipo: item.tipo || undefined,
            loc: item.loc || undefined,
            imagen: item.imagen || undefined,
            producidoPorPartner: parseBoolean(item.producidoPorPartner),
            partnerId: item.partnerId || undefined,
            recetaId: item.recetaId || undefined,
        }));
        
        localStorage.setItem('articulos', JSON.stringify(importedData));
        setItems(importedData);
        toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
      },
      error: (error) => {
        toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
      }
    });
    if(event.target) {
        event.target.value = '';
    }
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    const updatedData = items.filter(e => e.id !== itemToDelete);
    localStorage.setItem('articulos', JSON.stringify(updatedData));
    setItems(updatedData);
    toast({ title: 'Artículo eliminado', description: 'El registro se ha eliminado correctamente.' });
    setItemToDelete(null);
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Catálogo de Artículos..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
            <div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/bd')} className="mb-2">
                    <ArrowLeft className="mr-2" />
                    Volver a Bases de Datos
                </Button>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Package />Catálogo de Artículos MICE</h1>
            </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por nombre, subcategoría o ID ERP..."
            className="flex-grow max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
           <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'Todas las categorías' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[240px]">
                    <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                    {types.map(t => (
                        <SelectItem key={t} value={t}>{t === 'all' ? 'Todos los tipos' : t}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="flex gap-2 ml-auto">
                <Button asChild>
                    <Link href="/articulos/nuevo">
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
                        <DropdownMenuItem onClick={handleImportClick}>
                            <FileUp className="mr-2" />
                            Importar CSV
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv"
                                onChange={handleImportCSV}
                            />
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportCSV}>
                            <FileDown className="mr-2" />
                            Exportar CSV
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-2 w-10"></TableHead>
                <TableHead className="p-2">Nombre</TableHead>
                <TableHead className="p-2">Categoría</TableHead>
                <TableHead className="p-2">Tipo</TableHead>
                <TableHead className="p-2">P. Venta</TableHead>
                <TableHead className="p-2">P. Alquiler</TableHead>
                <TableHead className="p-2">P. Reposición</TableHead>
                <TableHead className="text-right p-2">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/articulos/${item.id}`)}>
                    <TableCell className="p-2">
                        {item.esHabitual && <Star className="h-5 w-5 text-amber-400 fill-amber-400" />}
                    </TableCell>
                    <TableCell className="font-medium p-2">{item.nombre}</TableCell>
                    <TableCell className="p-2"><Badge variant="outline">{item.categoria}</Badge></TableCell>
                    <TableCell className="p-2 font-mono text-xs">{item.tipo}</TableCell>
                    <TableCell className="p-2">{formatCurrency(item.precioVenta)}</TableCell>
                    <TableCell className="p-2">{formatCurrency(item.precioAlquiler)}</TableCell>
                    <TableCell className="p-2">{formatCurrency(item.precioReposicion)}</TableCell>
                    <TableCell className="text-right p-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/articulos/${item.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id); }}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No se encontraron artículos que coincidan con la búsqueda.
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el artículo.
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
