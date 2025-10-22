

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Component, FileDown, FileUp, Menu, AlertTriangle, Copy } from 'lucide-react';
import type { Elaboracion, Receta } from '@/types';
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
import autoTable from 'jspdf-autotable';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency, formatUnit } from '@/lib/utils';

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
    setItems(storedData ? JSON.parse(storedData) : []);
    setIsMounted(true);
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleAttemptDelete = (elaboracion: Elaboracion) => {
    const allRecetas: Receta[] = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
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
    doc.text('Las siguientes recetas se han visto afectadas y necesitan revisión:', 14, 42);
    
    const tableColumn = ["ID Receta", "Nombre Receta"];
    const tableRows: (string | number)[][] = [];

    affectedRecipes.forEach(recipe => {
      const recipeData = [
        recipe.id,
        recipe.nombre,
      ];
      tableRows.push(recipeData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50, 
      styles: { minCellHeight: 8 }, 
      headStyles: { fillColor: '#e5e7eb', textColor: '#374151' } 
    });
    
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
        // Marcar recetas afectadas para revisión
        let allRecetas: Receta[] = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
        const affectedRecipeIds = new Set(affectedRecipes.map(r => r.id));
        const updatedRecetas = allRecetas.map(r => {
            if (affectedRecipeIds.has(r.id)) {
                return { ...r, requiereRevision: true };
            }
            return r;
        });
        localStorage.setItem('recetas', JSON.stringify(updatedRecetas));
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
    <TooltipProvider>
       <div className="flex items-center justify-between gap-4 mb-6">
          <Input 
            placeholder="Buscar por nombre..."
            className="flex-grow max-w-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
        
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Elaboración</TableHead>
                <TableHead>Producción Total</TableHead>
                <TableHead>Coste / Unidad</TableHead>
                <TableHead className="text-right w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <TableRow key={item.id} >
                    <TableCell className="font-medium cursor-pointer" onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>{item.nombre}</TableCell>
                    <TableCell className="cursor-pointer" onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>{item.produccionTotal} {formatUnit(item.unidadProduccion)}</TableCell>
                    <TableCell className="cursor-pointer" onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>{formatCurrency(item.costePorUnidad)} / {formatUnit(item.unidadProduccion)}</TableCell>
                    <TableCell className="text-right">
                       <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); router.push(`/book/elaboraciones/nuevo?cloneId=${item.id}`); }}>
                                    <Copy className="h-4 w-4"/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Clonar</p>
                            </TooltipContent>
                        </Tooltip>
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
                    <span className="font-bold text-destructive">¡Atención! Esta elaboración está siendo utilizada en {affectedRecipes.length} receta(s) que serán marcadas para revisión:</span>
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
      </TooltipProvider>
    </>
  );
}
