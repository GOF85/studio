
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Landmark, ArrowLeft, FileUp, FileDown, Menu } from 'lucide-react';
import type { DatosFiscales, TipoEntidadFiscal } from '@/types';
import { TIPO_ENTIDAD_FISCAL } from '@/types';
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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Papa from 'papaparse';

const CSV_HEADERS = ["id", "cif", "nombreEmpresa", "nombreComercial", "direccionFacturacion", "codigoPostal", "ciudad", "provincia", "pais", "emailContacto", "telefonoContacto", "iban", "formaDePagoHabitual", "tipo"];


export default function DatosFiscalesPage() {
  const [items, setItems] = useState<DatosFiscales[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let storedData = localStorage.getItem('datosFiscales');
    setItems(storedData ? JSON.parse(storedData) : []);
    setIsMounted(true);
  }, []);
  
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const searchMatch = 
        item.nombreEmpresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.nombreComercial || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cif.toLowerCase().includes(searchTerm.toLowerCase());
      const typeMatch = tipoFilter === 'all' || item.tipo === tipoFilter;
      return searchMatch && typeMatch;
    });
  }, [items, searchTerm, tipoFilter]);


  const handleDelete = () => {
    if (!itemToDelete) return;
    const updatedData = items.filter(e => e.id !== itemToDelete);
    localStorage.setItem('datosFiscales', JSON.stringify(updatedData));
    setItems(updatedData);
    toast({ title: 'Entidad eliminada', description: 'Los datos fiscales se han eliminado correctamente.' });
    setItemToDelete(null);
  };
  
    const handleExportCSV = () => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay datos para exportar.' });
      return;
    }
    const csv = Papa.unparse(items, { header: true });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'datos_fiscales.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada' });
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
        console.log('Resultados de PapaParse:', results);

        const headers = results.meta.fields || [];
        const hasAllHeaders = CSV_HEADERS.every(field => headers.includes(field));

        if (!hasAllHeaders) {
            toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.`});
            if(event.target) event.target.value = '';
            return;
        }
        
        const importedData: DatosFiscales[] = results.data.map((item: any) => ({
          id: item.id || Date.now().toString(),
          cif: item.cif || '',
          nombreEmpresa: item.nombreEmpresa || '',
          nombreComercial: item.nombreComercial || '',
          direccionFacturacion: item.direccionFacturacion || '',
          codigoPostal: item.codigoPostal || '',
          ciudad: item.ciudad || '',
          provincia: item.provincia || '',
          pais: item.pais || 'España',
          emailContacto: item.emailContacto || '',
          telefonoContacto: item.telefonoContacto || '',
          iban: item.iban || '',
          formaDePagoHabitual: item.formaDePagoHabitual || '',
          tipo: TIPO_ENTIDAD_FISCAL.includes(item.tipo) ? item.tipo : 'Cliente',
        }));

        console.log('Datos importados y mapeados:', importedData);
        
        localStorage.setItem('datosFiscales', JSON.stringify(importedData));
        setItems(importedData);
        toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
        if(event.target) event.target.value = '';
      },
      error: (error: any) => {
        console.error("Error en PapaParse:", error);
        toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        if(event.target) event.target.value = '';
      }
    });
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Datos Fiscales..." />;
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
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Landmark />Base de Datos Fiscales</h1>
            </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/datos-fiscales/nuevo">
                <PlusCircle className="mr-2" />
                Nueva Entidad
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
            placeholder="Buscar por nombre, CIF..."
            className="flex-grow max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
           <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los Tipos</SelectItem>
                    {TIPO_ENTIDAD_FISCAL.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-2">Razón Social</TableHead>
                <TableHead className="p-2">CIF/NIF</TableHead>
                <TableHead className="p-2">Tipo</TableHead>
                <TableHead className="text-right p-2">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium p-2">{item.nombreEmpresa}</TableCell>
                    <TableCell className="p-2">{item.cif}</TableCell>
                    <TableCell className="p-2"><Badge variant="outline">{item.tipo}</Badge></TableCell>
                    <TableCell className="text-right p-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/datos-fiscales/${item.id}`)}>
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
                  <TableCell colSpan={4} className="h-24 text-center">
                    No se encontraron entidades fiscales que coincidan con la búsqueda.
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de la entidad.
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
