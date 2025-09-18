'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, FileDown, FileUp, DollarSign } from 'lucide-react';
import type { Precio, PrecioCategoria } from '@/types';
import { PRECIO_CATEGORIAS } from '@/types';
import { Header } from '@/components/layout/header';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

const CSV_HEADERS = ["id", "producto", "categoria", "loc", "precioUd", "precioAlquilerUd", "imagen"];

export default function PreciosPage() {
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PrecioCategoria | 'all'>('all');
  const [precioToDelete, setPrecioToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let storedPrecios = localStorage.getItem('precios');
    if (!storedPrecios || JSON.parse(storedPrecios).length === 0) {
      const dummyPrecios: Precio[] = [
        {
          id: '1',
          producto: 'Vino Tinto Reserva',
          categoria: 'BODEGA',
          loc: 'P-1-A',
          precioUd: 15.50,
          precioAlquilerUd: 0,
          imagen: 'https://picsum.photos/seed/vino_tinto/100',
        },
        {
          id: '2',
          producto: 'Silla Tiffany',
          categoria: 'ALMACEN',
          loc: 'P-3-B',
          precioUd: 25.00,
          precioAlquilerUd: 5.00,
          imagen: 'https://picsum.photos/seed/silla_tiffany/100',
        },
      ];
      storedPrecios = JSON.stringify(dummyPrecios);
      localStorage.setItem('precios', storedPrecios);
      setPrecios(dummyPrecios);
      toast({
        title: 'Datos de prueba cargados',
        description: 'Se han cargado precios de ejemplo.',
      });
    } else {
      setPrecios(JSON.parse(storedPrecios));
    }
    setIsMounted(true);
  }, [toast]);
  
  const filteredPrecios = useMemo(() => {
    return precios.filter(p => {
      const matchesCategory = selectedCategory === 'all' || p.categoria === selectedCategory;
      const matchesSearch = searchTerm.trim() === '' ||
        p.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.loc.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [precios, searchTerm, selectedCategory]);


  const handleExportCSV = () => {
    if (precios.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay precios para exportar.' });
      return;
    }
    const csv = Papa.unparse(precios);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'precios.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada', description: 'El archivo precios.csv se ha descargado.' });
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
        
        const importedData: Precio[] = results.data.map(item => ({
            id: item.id || Date.now().toString() + Math.random(),
            producto: item.producto || '',
            categoria: PRECIO_CATEGORIAS.includes(item.categoria) ? item.categoria : PRECIO_CATEGORIAS[0],
            loc: item.loc || '',
            precioUd: parseCurrency(item.precioUd),
            precioAlquilerUd: parseCurrency(item.precioAlquilerUd),
            imagen: item.imagen || '',
        }));
        
        localStorage.setItem('precios', JSON.stringify(importedData));
        setPrecios(importedData);
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
    if (!precioToDelete) return;
    const updatedPrecios = precios.filter(e => e.id !== precioToDelete);
    localStorage.setItem('precios', JSON.stringify(updatedPrecios));
    setPrecios(updatedPrecios);
    toast({ title: 'Precio eliminado', description: 'El registro se ha eliminado correctamente.' });
    setPrecioToDelete(null);
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Gestión de Precios..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><DollarSign />Gestión de Precios</h1>
          <div className="flex gap-2">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleImportCSV}
            />
            <Button variant="outline" onClick={handleImportClick}>
              <FileUp className="mr-2" />
              Importar CSV
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <FileDown className="mr-2" />
              Exportar CSV
            </Button>
            <Button asChild>
              <Link href="/precios/nuevo">
                <PlusCircle className="mr-2" />
                Nuevo Precio
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por producto, localización..."
            className="flex-grow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as PrecioCategoria | 'all')}>
            <SelectTrigger className="w-full md:w-[240px]">
              <SelectValue placeholder="Filtrar por categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {PRECIO_CATEGORIAS.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Localización</TableHead>
                <TableHead>Precio Ud.</TableHead>
                <TableHead>Precio Alquiler Ud.</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrecios.length > 0 ? (
                filteredPrecios.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.producto}</TableCell>
                    <TableCell>{p.categoria}</TableCell>
                    <TableCell>{p.loc}</TableCell>
                    <TableCell>{p.precioUd.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                    <TableCell>{p.precioAlquilerUd.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/precios/${p.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setPrecioToDelete(p.id)}>
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
                  <TableCell colSpan={6} className="h-24 text-center">
                    No se encontraron precios que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <AlertDialog open={!!precioToDelete} onOpenChange={(open) => !open && setPrecioToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el registro del precio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPrecioToDelete(null)}>Cancelar</AlertDialogCancel>
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
