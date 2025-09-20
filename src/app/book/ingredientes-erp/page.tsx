'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, FileDown, FileUp, Package } from 'lucide-react';
import type { IngredienteERP } from '@/types';
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
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

const CSV_HEADERS = ["id", "IdERP", "nombreProductoERP", "referenciaProveedor", "nombreProveedor", "familiaCategoria", "precio", "unidad"];

export default function IngredientesERPPage() {
  const [items, setItems] = useState<IngredienteERP[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let storedData = localStorage.getItem('ingredientesERP');
    if (!storedData || JSON.parse(storedData).length === 0) {
      const dummyData: IngredienteERP[] = [
        { id: 'erp-1', IdERP: 'ERP001', nombreProductoERP: 'Harina de Trigo (Saco 25kg)', referenciaProveedor: 'HT25', nombreProveedor: 'Harinas Molineras', familiaCategoria: 'Secos', precio: 15.00, unidad: 'KILO' },
        { id: 'erp-2', IdERP: 'ERP002', nombreProductoERP: 'Huevo Campero (Caja 30 und)', referenciaProveedor: 'HC30', nombreProveedor: 'Granjas del Sol', familiaCategoria: 'Frescos', precio: 5.50, unidad: 'UNIDAD' },
        { id: 'erp-3', IdERP: 'ERP003', nombreProductoERP: 'Leche Entera (Litro)', referenciaProveedor: 'LE01', nombreProveedor: 'Lácteos El Prado', familiaCategoria: 'Lácteos', precio: 1.10, unidad: 'LITRO' },
      ];
      storedData = JSON.stringify(dummyData);
      localStorage.setItem('ingredientesERP', storedData);
      setItems(dummyData);
    } else {
      setItems(JSON.parse(storedData));
    }
    setIsMounted(true);
  }, []);
  
  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.nombreProductoERP.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nombreProveedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.referenciaProveedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.IdERP.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);


  const handleExportCSV = () => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay ingredientes para exportar.' });
      return;
    }
    const csv = Papa.unparse(items);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'ingredientes-erp.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada' });
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
        
        const importedData: IngredienteERP[] = results.data.map(item => ({
            id: item.id || Date.now().toString() + Math.random(),
            IdERP: item.IdERP || '',
            nombreProductoERP: item.nombreProductoERP || '',
            referenciaProveedor: item.referenciaProveedor || '',
            nombreProveedor: item.nombreProveedor || '',
            familiaCategoria: item.familiaCategoria || '',
            precio: parseCurrency(item.precio),
            unidad: ['KILO', 'LITRO', 'UNIDAD'].includes(item.unidad) ? item.unidad : 'UNIDAD',
        }));
        
        localStorage.setItem('ingredientesERP', JSON.stringify(importedData));
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
    localStorage.setItem('ingredientesERP', JSON.stringify(updatedData));
    setItems(updatedData);
    toast({ title: 'Ingrediente eliminado', description: 'El registro se ha eliminado correctamente.' });
    setItemToDelete(null);
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Materia Prima..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Package />Materia Prima (ERP)</h1>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/book/ingredientes-erp/nuevo">
                <PlusCircle className="mr-2" />
                Nuevo Ingrediente ERP
              </Link>
            </Button>
          </div>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">Importar y Exportar</h2>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
             <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleImportCSV}
            />
            <Button variant="outline" className="w-full md:w-auto" onClick={handleImportClick}>
              <FileUp className="mr-2" />
              Importar CSV
            </Button>
            <Button variant="outline" className="w-full md:w-auto" onClick={handleExportCSV}>
              <FileDown className="mr-2" />
              Exportar CSV
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por nombre, Id. ERP, proveedor o referencia..."
            className="flex-grow max-w-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Id. ERP</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Ref. Proveedor</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nombreProductoERP}</TableCell>
                    <TableCell>{item.IdERP}</TableCell>
                    <TableCell>{item.nombreProveedor}</TableCell>
                    <TableCell>{item.referenciaProveedor}</TableCell>
                    <TableCell>{item.familiaCategoria}</TableCell>
                    <TableCell>{item.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                    <TableCell>{item.unidad}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/book/ingredientes-erp/${item.id}`)}>
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
                  <TableCell colSpan={8} className="h-24 text-center">
                    No se encontraron ingredientes que coincidan con la búsqueda.
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el registro del ingrediente.
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
