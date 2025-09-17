'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, FileDown, FileUp } from 'lucide-react';
import type { Personal } from '@/types';
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
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

export default function PersonalPage() {
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const storedPersonal = localStorage.getItem('personal');
    if (storedPersonal) {
      setPersonal(JSON.parse(storedPersonal));
    }
  }, []);
  
  const handleExportCSV = () => {
    if (personal.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay personal para exportar.' });
      return;
    }
    const csv = Papa.unparse(personal);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'personal.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada', description: 'El archivo personal.csv se ha descargado.' });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    Papa.parse<Personal>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const requiredFields = ['id', 'nombre', 'departamento', 'categoria', 'telefono', 'mail'];
        const headers = results.meta.fields || [];
        const hasAllHeaders = requiredFields.every(field => headers.includes(field));

        if (!hasAllHeaders) {
            toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas: ${requiredFields.join(', ')}`});
            return;
        }
        
        const importedData = results.data;
        localStorage.setItem('personal', JSON.stringify(importedData));
        setPersonal(importedData);
        toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
      },
      error: (error) => {
        toast({ variant: 'destructive', title: 'Error de importación', description: error.message });
      }
    });
    // Reset file input
    if(event.target) {
        event.target.value = '';
    }
  };


  if (!isMounted) {
    return null; // or a loading skeleton
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-headline font-bold">Gestión de Personal</h1>
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
              <Link href="#">
                <PlusCircle className="mr-2" />
                Nuevo Empleado
              </Link>
            </Button>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Mail</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personal.length > 0 ? (
                personal.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell>{p.departamento}</TableCell>
                    <TableCell>{p.categoria}</TableCell>
                    <TableCell>{p.telefono}</TableCell>
                    <TableCell>{p.mail}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {}}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => {}}>
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
                    No hay personal registrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </>
  );
}
