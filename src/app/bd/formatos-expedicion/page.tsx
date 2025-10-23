
'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, PlusCircle, Menu, FileUp, FileDown, Package } from 'lucide-react';
import type { FormatoExpedicion } from '@/types';
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
import Papa from 'papaparse';

const CSV_HEADERS = ["id", "nombre"];

function FormatosExpedicionPageContent() {
  const [items, setItems] = useState<FormatoExpedicion[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);

  useEffect(() => {
    let storedData = localStorage.getItem('formatosExpedicionDB');
    setItems(storedData ? JSON.parse(storedData) : []);
    setIsMounted(true);
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleDelete = () => {
    if (!itemToDelete) return;
    const updatedData = items.filter(i => i.id !== itemToDelete);
    localStorage.setItem('formatosExpedicionDB', JSON.stringify(updatedData));
    setItems(updatedData);
    toast({ title: 'Formato eliminado' });
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
            toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas: ${CSV_HEADERS.join(', ')}`});
            setIsImportAlertOpen(false);
            return;
        }
        
        const existingIds = new Set(items.map(item => item.id));
        const importedData: FormatoExpedicion[] = results.data.map((item: any, index: number) => {
          let id = item.id;
          if (!id || id.trim() === '' || existingIds.has(id)) {
            id = `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`;
          }
          existingIds.add(id);
          return { ...item, id };
        });
        
        localStorage.setItem('formatosExpedicionDB', JSON.stringify(importedData));
        setItems(importedData);
        toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
        setIsImportAlertOpen(false);
      },
      error: (error) => {
        toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
        setIsImportAlertOpen(false);
      }
    });
    if(event.target) event.target.value = '';
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
        link.setAttribute('download', `formatos_expedicion.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Exportación completada' });
    };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Formatos de Expedición..." />;
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input 
          placeholder="Buscar por nombre..."
          className="flex-grow max-w-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex-grow flex justify-end gap-2">
            <Button onClick={() => router.push('/bd/formatos-expedicion/nuevo')}>
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
              <TableHead>Nombre del Formato</TableHead>
              <TableHead className="text-right w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/bd/formatos-expedicion/${item.id}`)}>
                  <TableCell className="font-medium">{item.nombre}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/bd/formatos-expedicion/${item.id}`)}>
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
                <TableCell colSpan={2} className="h-24 text-center">
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
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro.
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

export default function FormatosExpedicionPage() {
    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando Formatos de Expedición..." />}>
            <FormatosExpedicionPageContent />
        </Suspense>
    )
}
