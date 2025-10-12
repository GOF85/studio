
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, FileDown, FileUp, Users, Menu } from 'lucide-react';
import type { Personal } from '@/types';
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
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const CSV_HEADERS = ["id", "nombre", "apellidos", "iniciales", "departamento", "categoria", "telefono", "mail", "dni", "precioHora"];

export default function PersonalPage() {
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [personToDelete, setPersonToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let storedPersonal = localStorage.getItem('personal');
    setPersonal(storedPersonal ? JSON.parse(storedPersonal) : []);
    setIsMounted(true);
  }, []);
  
  const departments = useMemo(() => {
    if (!personal) return ['all'];
    const allDepartments = personal.map(p => p.departamento).filter(Boolean); // Filter out empty strings
    return ['all', ...Array.from(new Set(allDepartments))];
  }, [personal]);

  const filteredPersonal = useMemo(() => {
    return personal.filter(p => {
      const matchesDepartment = selectedDepartment === 'all' || p.departamento === selectedDepartment;
      const fullName = `${p.nombre} ${p.apellidos}`.toLowerCase();
      const matchesSearch = searchTerm.trim() === '' ||
        fullName.includes(searchTerm.toLowerCase()) ||
        p.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.mail || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDepartment && matchesSearch;
    });
  }, [personal, searchTerm, selectedDepartment]);


  const handleExportCSV = () => {
    if (personal.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay personal para exportar.' });
      return;
    }
    const csv = Papa.unparse(personal, { header: true, delimiter: ";" });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
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
    if (!file) {
      return;
    }
    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";",
      complete: (results) => {
        const headers = results.meta.fields || [];
        const hasAllHeaders = CSV_HEADERS.every(field => headers.includes(field));

        if (!hasAllHeaders) {
            toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.`});
            return;
        }
        
        const importedData: Personal[] = results.data.map((item: any) => ({
            id: item.id || Date.now().toString() + Math.random(),
            nombre: item.nombre || '',
            apellidos: item.apellidos || '',
            iniciales: item.iniciales || '',
            departamento: item.departamento || '',
            categoria: item.categoria || '',
            telefono: item.telefono || '',
            mail: item.mail || '',
            dni: item.dni || '',
            precioHora: parseCurrency(item.precioHora),
        }));

        localStorage.setItem('personal', JSON.stringify(importedData));
        setPersonal(importedData);
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
    if (!personToDelete) return;
    const updatedData = personal.filter(e => e.id !== personToDelete);
    localStorage.setItem('personal', JSON.stringify(updatedData));
    setPersonal(updatedData);
    toast({ title: 'Empleado eliminado', description: 'El registro se ha eliminado correctamente.' });
    setPersonToDelete(null);
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Gestión de Personal..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Users />Gestión de Personal</h1>
            <div className="flex gap-2">
                <Button asChild>
                <Link href="/personal/nuevo">
                    <PlusCircle className="mr-2" />
                    Nuevo Empleado
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
            placeholder="Buscar por nombre, categoría, mail..."
            className="flex-grow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-full md:w-[240px]">
              <SelectValue placeholder="Filtrar por departamento" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(dep => (
                <SelectItem key={dep} value={dep}>
                  {dep === 'all' ? 'Todos los departamentos' : dep}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-2 w-12">Ini.</TableHead>
                <TableHead className="p-2">Nombre Completo</TableHead>
                <TableHead className="p-2">Departamento</TableHead>
                <TableHead className="p-2">Categoría</TableHead>
                <TableHead className="p-2">Teléfono</TableHead>
                <TableHead className="p-2">Mail</TableHead>
                <TableHead className="p-2">Precio/Hora</TableHead>
                <TableHead className="text-right p-2">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPersonal.length > 0 ? (
                filteredPersonal.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs p-2">{p.iniciales}</TableCell>
                    <TableCell className="font-medium p-2">{`${p.nombre} ${p.apellidos}`}</TableCell>
                    <TableCell className="p-2">{p.departamento}</TableCell>
                    <TableCell className="p-2">{p.categoria}</TableCell>
                    <TableCell className="p-2">{p.telefono}</TableCell>
                    <TableCell className="p-2">{p.mail}</TableCell>
                    <TableCell className="p-2">{formatCurrency(p.precioHora)}</TableCell>
                    <TableCell className="text-right p-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/personal/${p.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setPersonToDelete(p.id)}>
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
                    No se encontraron empleados que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

       <AlertDialog open={!!personToDelete} onOpenChange={(open) => !open && setPersonToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el registro del empleado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPersonToDelete(null)}>Cancelar</AlertDialogCancel>
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
