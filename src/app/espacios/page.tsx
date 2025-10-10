
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, FileDown, FileUp, Building, ArrowLeft, Menu } from 'lucide-react';
import type { Espacio } from '@/types';
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
import { Badge } from '@/components/ui/badge';


// Aplanar el objeto Espacio para la exportación a CSV
const flattenObject = (obj: any, parentKey = '', res: { [key: string]: any } = {}): { [key: string]: any } => {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      const propName = parentKey ? parentKey + '.' + key : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        flattenObject(obj[key], propName, res);
      } else if (Array.isArray(obj[key])) {
        res[propName] = JSON.stringify(obj[key]);
      } else {
        res[propName] = obj[key];
      }
    }
  }
  return res;
};

// Reconstruir el objeto Espacio desde un objeto aplanado del CSV
const unflattenObject = (data: { [key: string]: any }): Espacio => {
  const result: any = {};
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const keys = key.split('.');
      keys.reduce((acc, part, index) => {
        if (index === keys.length - 1) {
            try {
                // Intentar parsear si es un array JSON
                acc[part] = JSON.parse(data[key]);
            } catch (e) {
                // Si no es JSON, asignar el valor directamente
                acc[part] = data[key];
            }
        } else {
          if (!acc[part]) {
            acc[part] = {};
          }
        }
        return acc[part];
      }, result);
    }
  }
  return result as Espacio;
};

export default function EspaciosPage() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [espacioToDelete, setEspacioToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let storedEspacios = localStorage.getItem('espacios');
    setEspacios(storedEspacios ? JSON.parse(storedEspacios) : []);
    setIsMounted(true);
  }, []);
  
  const cities = useMemo(() => {
    if (!espacios) return ['all'];
    const allCities = espacios.map(e => e.identificacion.ciudad).filter(Boolean);
    return ['all', ...Array.from(new Set(allCities))];
  }, [espacios]);

  const filteredEspacios = useMemo(() => {
    return espacios.filter(e => {
      const matchesCity = selectedCity === 'all' || e.identificacion.ciudad === selectedCity;
      const matchesSearch = searchTerm.trim() === '' ||
        e.identificacion.nombreEspacio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.identificacion.tipoDeEspacio.some(tipo => tipo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        e.contactos.some(c => c.email.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCity && matchesSearch;
    });
  }, [espacios, searchTerm, selectedCity]);

  const handleExportCSV = () => {
    if (espacios.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay espacios para exportar.' });
      return;
    }
    const flattenedData = espacios.map(espacio => flattenObject(espacio));
    const csv = Papa.unparse(flattenedData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'espacios.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada', description: 'El archivo espacios.csv se ha descargado.' });
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
            const importedData: Espacio[] = results.data.map(unflattenObject);
            localStorage.setItem('espacios', JSON.stringify(importedData));
            setEspacios(importedData);
            toast({ title: 'Importación completada', description: `Se han importado ${importedData.length} registros.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error de importación', description: 'El formato del archivo CSV no es válido. Verifica que las columnas y los datos JSON sean correctos.' });
            console.error("Error al parsear CSV:", error);
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
    if (!espacioToDelete) return;
    const updatedEspacios = espacios.filter(e => e.id !== espacioToDelete);
    localStorage.setItem('espacios', JSON.stringify(updatedEspacios));
    setEspacios(updatedEspacios);
    toast({ title: 'Espacio eliminado', description: 'El registro se ha eliminado correctamente.' });
    setEspacioToDelete(null);
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Gestión de Espacios..." />;
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
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Building />Gestión de Espacios</h1>
            </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/espacios/nuevo">
                <PlusCircle className="mr-2" />
                Nuevo Espacio
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
            placeholder="Buscar por espacio, tipo, email..."
            className="flex-grow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-full md:w-[240px]">
              <SelectValue placeholder="Filtrar por ciudad" />
            </SelectTrigger>
            <SelectContent>
              {cities.map(city => (
                <SelectItem key={city} value={city}>
                  {city === 'all' ? 'Todas las ciudades' : city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-2">Espacio</TableHead>
                <TableHead className="p-2">Ciudad</TableHead>
                <TableHead className="p-2">Tipo de Espacio</TableHead>
                <TableHead className="p-2">Contacto</TableHead>
                <TableHead className="p-2">Email</TableHead>
                <TableHead className="text-right p-2">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEspacios.length > 0 ? (
                filteredEspacios.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium p-2">{e.identificacion.nombreEspacio}</TableCell>
                    <TableCell className="p-2">{e.identificacion.ciudad}</TableCell>
                    <TableCell className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {e.identificacion.tipoDeEspacio.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="p-2">{e.contactos[0]?.nombre || 'N/A'}</TableCell>
                    <TableCell className="p-2">{e.contactos[0]?.email || 'N/A'}</TableCell>
                    <TableCell className="text-right p-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/espacios/${e.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setEspacioToDelete(e.id)}>
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
                    No se encontraron espacios que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <AlertDialog open={!!espacioToDelete} onOpenChange={(open) => !open && setEspacioToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el registro del espacio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEspacioToDelete(null)}>Cancelar</AlertDialogCancel>
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
