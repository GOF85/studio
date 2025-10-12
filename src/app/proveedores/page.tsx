
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, FileDown, FileUp, Users, Menu } from 'lucide-react';
import type { Proveedor } from '@/types';
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
import { Badge } from '@/components/ui/badge';

const CSV_HEADERS = ["id", "cif", "IdERP", "nombreEmpresa", "nombreComercial", "direccionFacturacion", "codigoPostal", "ciudad", "provincia", "pais", "emailContacto", "telefonoContacto", "iban", "formaDePagoHabitual", "tipos"];

export default function ProveedoresPage() {
  const [items, setItems] = useState<Proveedor[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let storedData = localStorage.getItem('proveedores');
    setItems(storedData ? JSON.parse(storedData) : []);
    setIsMounted(true);
  }, []);
  
  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.nombreComercial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cif.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tipos.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.IdERP || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);


  const handleExportCSV = () => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay proveedores para exportar.' });
      return;
    }
     const dataToExport = items.map(item => ({
      ...item,
      tipos: item.tipos.join('|') // Convert array to a string for CSV
    }));

    const csv = Papa.unparse(dataToExport, {
      columns: CSV_HEADERS
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'proveedores.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada', description: 'El archivo proveedores.csv se ha descargado.' });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
            const importedData: Proveedor[] = results.data.map(item => ({
                ...item,
                tipos: typeof item.tipos === 'string' ? item.tipos.split('|') : [],
            }));
            
            localStorage.setItem('proveedores', JSON.stringify(importedData));
            setItems(importedData);
            toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error de importación', description: 'El archivo CSV podría estar corrupto o mal formateado.'})
        }
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
    localStorage.setItem('proveedores', JSON.stringify(updatedData));
    setItems(updatedData);
    toast({ title: 'Proveedor eliminado', description: 'El registro se ha eliminado correctamente.' });
    setItemToDelete(null);
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Proveedores..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
            <div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/bd')} className="mb-2">
                    Volver a Bases de Datos
                </Button>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Base de Datos de Proveedores</h1>
            </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/proveedores/nuevo">
                <PlusCircle className="mr-2" />
                Nuevo Proveedor
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
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por nombre, CIF, tipo o IdERP..."
            className="flex-grow max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-2">Nombre Comercial</TableHead>
                <TableHead className="p-2">CIF</TableHead>
                <TableHead className="p-2">IdERP</TableHead>
                <TableHead className="p-2">Tipos de Proveedor</TableHead>
                <TableHead className="text-right p-2">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium p-2">{item.nombreComercial}</TableCell>
                    <TableCell className="p-2">{item.cif}</TableCell>
                    <TableCell className="p-2 font-mono">{item.IdERP}</TableCell>
                    <TableCell className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {item.tipos.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right p-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/proveedores/${item.id}`)}>
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
                  <TableCell colSpan={5} className="h-24 text-center">
                    No se encontraron proveedores que coincidan con la búsqueda.
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el registro del proveedor.
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
