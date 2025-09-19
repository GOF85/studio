'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, FileDown, FileUp, Building } from 'lucide-react';
import type { Espacio } from '@/types';
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
import { Card, CardHeader, CardContent } from '@/components/ui/card';

const CSV_HEADERS = [ "id", "espacio", "escaparateMICE", "carpetaDRIVE", "calle", "nombreContacto1", "telefonoContacto1", "emailContacto1", "canonEspacioPorcentaje", "canonEspacioFijo", "canonMcPorcentaje", "canonMcFijo", "comisionAlquilerMcPorcentaje", "precioOrientativoAlquiler", "horaLimiteCierre", "aforoCocktail", "aforoBanquete", "auditorio", "aforoAuditorio", "zonaExterior", "capacidadesPorSala", "numeroDeSalas", "tipoDeEspacio", "tipoDeEventos", "ciudad", "directorio", "descripcion", "comentariosVarios", "equipoAudiovisuales", "cocina", "accesibilidadAsistentes", "pantalla", "plato", "accesoVehiculos", "aparcamiento", "conexionWifi", "homologacion", "comentariosMarketing"];

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
    if (!storedEspacios || JSON.parse(storedEspacios).length === 0) {
      const dummyEspacios: Espacio[] = [
        {
          id: '1',
          espacio: 'Finca La Reunión',
          escaparateMICE: 'Sí',
          carpetaDRIVE: 'https://example.com/drive1',
          calle: 'Calle Falsa 123',
          nombreContacto1: 'Ana Torres',
          telefonoContacto1: '611223344',
          emailContacto1: 'ana.torres@example.com',
          canonEspacioPorcentaje: 10,
          canonEspacioFijo: 0,
          canonMcPorcentaje: 15,
          canonMcFijo: 0,
          comisionAlquilerMcPorcentaje: 5,
          precioOrientativoAlquiler: '2000€ - 5000€',
          horaLimiteCierre: '02:00',
          aforoCocktail: 200,
          aforoBanquete: 150,
          auditorio: 'Sí',
          aforoAuditorio: 100,
          zonaExterior: 'Sí',
          capacidadesPorSala: 'Salón Principal (150p), Jardín (200p)',
          numeroDeSalas: 2,
          tipoDeEspacio: 'Finca',
          tipoDeEventos: 'Bodas, Corporativos',
          ciudad: 'Madrid',
          directorio: 'Bodas.net',
          descripcion: 'Espectacular finca a las afueras de Madrid con amplios, jardines y un salón principal de gran capacidad.',
          comentariosVarios: 'Parking propio para 100 coches.',
          equipoAudiovisuales: 'Básico (proyector y pantalla)',
          cocina: 'Sí, equipada',
          accesibilidadAsistentes: 'Sí',
          pantalla: 'Sí',
          plato: 'No',
          accesoVehiculos: 'Sí',
          aparcamiento: 'Sí',
          conexionWifi: 'Sí',
          homologacion: 'Sí',
          comentariosMarketing: 'Ideal para eventos de lujo.'
        },
      ];
      storedEspacios = JSON.stringify(dummyEspacios);
      localStorage.setItem('espacios', storedEspacios);
      setEspacios(dummyEspacios);
      toast({
        title: 'Datos de prueba cargados',
        description: 'Se ha cargado un espacio de ejemplo.',
      });
    } else {
      setEspacios(JSON.parse(storedEspacios));
    }
    setIsMounted(true);
  }, [toast]);
  
  const cities = useMemo(() => {
    if (!espacios) return ['all'];
    const allCities = espacios.map(e => e.ciudad).filter(Boolean); // Filter out empty strings
    return ['all', ...Array.from(new Set(allCities))];
  }, [espacios]);

  const filteredEspacios = useMemo(() => {
    return espacios.filter(e => {
      const matchesCity = selectedCity === 'all' || e.ciudad === selectedCity;
      const matchesSearch = searchTerm.trim() === '' ||
        e.espacio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.tipoDeEspacio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.emailContacto1 || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCity && matchesSearch;
    });
  }, [espacios, searchTerm, selectedCity]);


  const handleExportCSV = () => {
    if (espacios.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay espacios para exportar.' });
      return;
    }
    const csv = Papa.unparse(espacios);
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
        
        const importedData: Espacio[] = results.data.map(item => ({
            id: item.id || Date.now().toString() + Math.random(),
            espacio: item.espacio || '',
            escaparateMICE: item.escaparateMICE || '',
            carpetaDRIVE: item.carpetaDRIVE || '',
            calle: item.calle || '',
            nombreContacto1: item.nombreContacto1 || '',
            telefonoContacto1: item.telefonoContacto1 || '',
            emailContacto1: item.emailContacto1 || '',
            canonEspacioPorcentaje: parseCurrency(item.canonEspacioPorcentaje),
            canonEspacioFijo: parseCurrency(item.canonEspacioFijo),
            canonMcPorcentaje: parseCurrency(item.canonMcPorcentaje),
            canonMcFijo: parseCurrency(item.canonMcFijo),
            comisionAlquilerMcPorcentaje: parseCurrency(item.comisionAlquilerMcPorcentaje),
            precioOrientativoAlquiler: item.precioOrientativoAlquiler || '',
            horaLimiteCierre: item.horaLimiteCierre || '',
            aforoCocktail: Number(item.aforoCocktail) || 0,
            aforoBanquete: Number(item.aforoBanquete) || 0,
            auditorio: item.auditorio || '',
            aforoAuditorio: Number(item.aforoAuditorio) || 0,
            zonaExterior: item.zonaExterior || '',
            capacidadesPorSala: item.capacidadesPorSala || '',
            numeroDeSalas: Number(item.numeroDeSalas) || 0,
            tipoDeEspacio: item.tipoDeEspacio || '',
            tipoDeEventos: item.tipoDeEventos || '',
            ciudad: item.ciudad || '',
            directorio: item.directorio || '',
            descripcion: item.descripcion || '',
            comentariosVarios: item.comentariosVarios || '',
            equipoAudiovisuales: item.equipoAudiovisuales || '',
            cocina: item.cocina || '',
            accesibilidadAsistentes: item.accesibilidadAsistentes || '',
            pantalla: item.pantalla || '',
            plato: item.plato || '',
            accesoVehiculos: item.accesoVehiculos || '',
            aparcamiento: item.aparcamiento || '',
            conexionWifi: item.conexionWifi || '',
            homologacion: item.homologacion || '',
            comentariosMarketing: item.comentariosMarketing || '',
        }));
        
        localStorage.setItem('espacios', JSON.stringify(importedData));
        setEspacios(importedData);
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
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Building />Gestión de Espacios</h1>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/espacios/nuevo">
                <PlusCircle className="mr-2" />
                Nuevo Espacio
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
                <TableHead>Espacio</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Tipo de Espacio</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEspacios.length > 0 ? (
                filteredEspacios.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.espacio}</TableCell>
                    <TableCell>{e.ciudad}</TableCell>
                    <TableCell>{e.tipoDeEspacio}</TableCell>
                    <TableCell>{e.nombreContacto1}</TableCell>
                    <TableCell>{e.emailContacto1}</TableCell>
                    <TableCell className="text-right">
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
