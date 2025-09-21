'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Component, FileDown, FileUp, Menu, AlertTriangle } from 'lucide-react';
import type { Elaboracion, Receta } from '@/types';
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
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import Papa from 'papaparse';
import jsPDF from 'jspdf';

const CSV_HEADERS = [ "id", "nombre", "produccionTotal", "unidadProduccion", "componentes", "instruccionesPreparacion", "fotosProduccionURLs", "videoProduccionURL", "formatoExpedicion", "ratioExpedicion", "tipoExpedicion", "costePorUnidad" ];


export default function ElaboracionesPage() {
  const [items, setItems] = useState<Elaboracion[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<Elaboracion | null>(null);
  const [affectedRecipes, setAffectedRecipes] = useState<Receta[]>([]);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    let storedData = localStorage.getItem('elaboraciones');
    if (!storedData || JSON.parse(storedData).length === 0) {
      const dummyData: Elaboracion[] = [
        {
          id: 'elab-1',
          nombre: 'Salsa Boloñesa Clásica',
          produccionTotal: 5,
          unidadProduccion: 'KILO',
          componentes: [],
          instruccionesPreparacion: 'Pochar verduras, añadir carne, etc.',
          fotosProduccionURLs: [],
          formatoExpedicion: 'Barqueta 1kg',
          ratioExpedicion: 1,
          tipoExpedicion: 'REFRIGERADO',
        },
        {
          id: 'elab-2',
          nombre: 'Bechamel Ligera',
          produccionTotal: 2,
          unidadProduccion: 'LITRO',
          componentes: [],
          instruccionesPreparacion: 'Derretir mantequilla, añadir harina y luego leche.',
          fotosProduccionURLs: [],
          formatoExpedicion: 'Manga Pastelera',
          ratioExpedicion: 1,
          tipoExpedicion: 'REFRIGERADO',
        },
      ];
      storedData = JSON.stringify(dummyData);
      localStorage.setItem('elaboraciones', storedData);
      setItems(dummyData);
    } else {
      setItems(JSON.parse(storedData));
    }
    setIsMounted(true);
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleAttemptDelete = (elaboracion: Elaboracion) => {
    const allRecetas: Receta[] = JSON.parse(localStorage.getItem('recetas') || '[]');
    const recipesUsingElaboracion = allRecetas.filter(receta => 
      receta.elaboraciones.some(e => e.elaboracionId === elaboracion.id)
    );
    setAffectedRecipes(recipesUsingElaboracion);
    setItemToDelete(elaboracion);
  };

  const generateReportAndToast = (deletedItemName: string) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Informe de Eliminación de Elaboración', 14, 22);
    doc.setFontSize(12);
    doc.text(`Se ha eliminado la elaboración: "${deletedItemName}"`, 14, 32);
    doc.text('Las siguientes recetas se han visto afectadas:', 14, 42);
    
    const tableColumn = ["ID Receta", "Nombre Receta"];
    const tableRows: (string | number)[][] = [];

    affectedRecipes.forEach(recipe => {
      const recipeData = [
        recipe.id,
        recipe.nombre,
      ];
      tableRows.push(recipeData);
    });

    (doc as any).autoTable(tableColumn, tableRows, { startY: 50 });
    
    doc.save(`informe_eliminacion_${deletedItemName.replace(/\s+/g, '_')}.pdf`);

    toast({
        title: 'Informe generado',
        description: 'Se ha descargado un PDF con las recetas afectadas.'
    });
  };

  const handleDelete = () => {
    if (!itemToDelete) return;

    if (affectedRecipes.length > 0) {
        generateReportAndToast(itemToDelete.nombre);
    }

    const updatedData = items.filter(i => i.id !== itemToDelete.id);
    localStorage.setItem('elaboraciones', JSON.stringify(updatedData));
    setItems(updatedData);
    toast({ title: 'Elaboración eliminada' });
    setItemToDelete(null);
    setAffectedRecipes([]);
  }

  const handleExportCSV = () => {
    if (items.length === 0) {
        toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay elaboraciones para exportar.' });
        return;
    }

    const dataToExport = items.map(item => ({
        ...item,
        componentes: JSON.stringify(item.componentes),
        fotosProduccionURLs: JSON.stringify(item.fotosProduccionURLs),
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'elaboraciones.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada', description: 'El archivo elaboraciones.csv se ha descargado.' });
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
            const headers = results.meta.fields || [];
            const hasAllHeaders = CSV_HEADERS.every(field => headers.includes(field));

            if (!hasAllHeaders) {
                toast({ variant: 'destructive', title: 'Error de formato', description: `El CSV debe contener las columnas correctas.`});
                return;
            }
            
            const importedData: Elaboracion[] = results.data.map(item => {
                let componentes = [];
                let fotos = [];
                try {
                    componentes = JSON.parse(item.componentes || '[]');
                    fotos = JSON.parse(item.fotosProduccionURLs || '[]');
                } catch(e) {
                    console.error("Error parsing JSON fields for item:", item.id);
                }

                return {
                    id: item.id || Date.now().toString() + Math.random(),
                    nombre: item.nombre || '',
                    produccionTotal: parseFloat(item.produccionTotal) || 0,
                    unidadProduccion: item.unidadProduccion || 'UNIDAD',
                    componentes: componentes,
                    instruccionesPreparacion: item.instruccionesPreparacion || '',
                    fotosProduccionURLs: fotos,
                    videoProduccionURL: item.videoProduccionURL || '',
                    formatoExpedicion: item.formatoExpedicion || '',
                    ratioExpedicion: parseFloat(item.ratioExpedicion) || 0,
                    tipoExpedicion: item.tipoExpedicion || 'REFRIGERADO',
                    costePorUnidad: parseFloat(item.costePorUnidad) || 0,
                };
            });
            
            localStorage.setItem('elaboraciones', JSON.stringify(importedData));
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


  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Elaboraciones..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Component />Gestión de Elaboraciones</h1>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/book/elaboraciones/nuevo">
                <PlusCircle className="mr-2" />
                Nueva Elaboración
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
                       <FileUp size={16} className="mr-2"/>Importar CSV
                       <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".csv"
                        onChange={handleImportCSV}
                      />
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={handleExportCSV}>
                       <FileDown size={16} className="mr-2"/>Exportar CSV
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por nombre..."
            className="flex-grow max-w-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Elaboración</TableHead>
                <TableHead>Producción Total</TableHead>
                <TableHead>Coste / Unidad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <TableRow key={item.id} onClick={() => router.push(`/book/elaboraciones/${item.id}`)} className="cursor-pointer">
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{item.produccionTotal} {item.unidadProduccion}</TableCell>
                    <TableCell>{(item.costePorUnidad || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} / {item.unidadProduccion}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {e.stopPropagation(); router.push(`/book/elaboraciones/${item.id}`)}}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => {e.stopPropagation(); handleAttemptDelete(item)}}>
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
                    No se encontraron elaboraciones.
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
            <AlertDialogTitle className="flex items-center gap-2">
                {affectedRecipes.length > 0 && <AlertTriangle className="text-destructive" />}
                ¿Estás seguro?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {affectedRecipes.length > 0 ? (
                <div>
                    <p className="font-bold text-destructive">¡Atención! Esta elaboración está siendo utilizada en {affectedRecipes.length} receta(s):</p>
                    <ul className="list-disc pl-5 mt-2 text-sm text-muted-foreground max-h-40 overflow-y-auto">
                        {affectedRecipes.map(r => <li key={r.id}>{r.nombre}</li>)}
                    </ul>
                    <p className="mt-3">Si continúas, se generará un informe en PDF con las recetas afectadas. Esta acción no se puede deshacer.</p>
                </div>
              ) : (
                'Esta acción no se puede deshacer. Se eliminará permanentemente la elaboración.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setItemToDelete(null); setAffectedRecipes([]); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {affectedRecipes.length > 0 ? 'Generar Informe y Eliminar' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
