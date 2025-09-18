'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, FileDown, FileUp, Utensils } from 'lucide-react';
import type { GastronomiaDBItem } from '@/types';
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

const CSV_HEADERS = ["id", "referencia", "categoria", "imagenRef", "imagenEmpl", "precio", "gramaje"];

export default function GastronomiaDBPage() {
  const [gastronomia, setGastronomia] = useState<GastronomiaDBItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let storedData = localStorage.getItem('gastronomiaDB');
    if (!storedData || JSON.parse(storedData).length === 0) {
      const dummyData: GastronomiaDBItem[] = [
        {
          id: '1',
          referencia: 'Solomillo de ternera',
          categoria: 'Carnes',
          imagenRef: 'https://picsum.photos/seed/solomillo-ref/100',
          imagenEmpl: 'https://picsum.photos/seed/solomillo-empl/100',
          precio: 28.50,
          gramaje: 250,
        },
        {
          id: '2',
          referencia: 'Tarta de queso',
          categoria: 'Postres',
          imagenRef: 'https://picsum.photos/seed/tarta-ref/100',
          imagenEmpl: 'https://picsum.photos/seed/tarta-empl/100',
          precio: 8.00,
          gramaje: 150,
        },
      ];
      storedData = JSON.stringify(dummyData);
      localStorage.setItem('gastronomiaDB', storedData);
      setGastronomia(dummyData);
      toast({
        title: 'Datos de prueba cargados',
        description: 'Se han cargado platos de ejemplo.',
      });
    } else {
      setGastronomia(JSON.parse(storedData));
    }
    setIsMounted(true);
  }, []);
  
  const categories = useMemo(() => {
    if (!gastronomia) return [];
    const allCats = gastronomia.map(g => g.categoria).filter(Boolean); // Filter out empty strings
    return ['all', ...Array.from(new Set(allCats))];
  }, [gastronomia]);

  const filteredItems = useMemo(() => {
    return gastronomia.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.categoria === selectedCategory;
      const matchesSearch = searchTerm.trim() === '' ||
        item.referencia.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [gastronomia, searchTerm, selectedCategory]);


  const handleExportCSV = () => {
    if (gastronomia.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay platos para exportar.' });
      return;
    }
    const csv = Papa.unparse(gastronomia);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'gastronomia-db.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada', description: 'El archivo gastronomia-db.csv se ha descargado.' });
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
        
        const importedData: GastronomiaDBItem[] = results.data.map(item => ({
            id: item.id || Date.now().toString() + Math.random().toString(),
            referencia: item.referencia || '',
            categoria: item.categoria || '',
            imagenRef: item.imagenRef || '',
            imagenEmpl: item.imagenEmpl || '',
            precio: parseCurrency(item.precio),
            gramaje: Number(item.gramaje) || 0,
        }));
        
        localStorage.setItem('gastronomiaDB', JSON.stringify(importedData));
        setGastronomia(importedData);
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
    const updatedData = gastronomia.filter(e => e.id !== itemToDelete);
    localStorage.setItem('gastronomiaDB', JSON.stringify(updatedData));
    setGastronomia(updatedData);
    toast({ title: 'Plato eliminado', description: 'El registro se ha eliminado correctamente.' });
    setItemToDelete(null);
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Base de Datos de Gastronomía..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Utensils />Base de Datos de Gastronomía</h1>
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
              <Link href="/gastronomia-db/nuevo">
                <PlusCircle className="mr-2" />
                Nuevo Plato
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por referencia..."
            className="flex-grow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
        </div>


        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Imágenes</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Gramaje</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.referencia}</TableCell>
                    <TableCell>{item.categoria}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {item.imagenRef && <Image src={item.imagenRef} alt={`Ref ${item.referencia}`} width={40} height={40} className="rounded-md object-cover"/>}
                        {item.imagenEmpl && <Image src={item.imagenEmpl} alt={`Empl ${item.referencia}`} width={40} height={40} className="rounded-md object-cover"/>}
                      </div>
                    </TableCell>
                    <TableCell>{item.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                    <TableCell>{item.gramaje ? `${item.gramaje} g` : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/gastronomia-db/${item.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setItemToDelete(item.id)}>
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
                    No se encontraron platos que coincidan con la búsqueda.
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el registro del plato.
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


