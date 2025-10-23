'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Component, FileDown, FileUp, Menu, AlertTriangle, Copy, Download, Upload } from 'lucide-react';
import type { Elaboracion, Receta, IngredienteInterno, ArticuloERP, ComponenteElaboracion } from '@/types';
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
  DropdownMenuSeparator,
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const CSV_HEADERS_ELABORACIONES = [ "id", "nombre", "produccionTotal", "unidadProduccion", "instruccionesPreparacion", "fotosProduccionURLs", "videoProduccionURL", "formatoExpedicion", "ratioExpedicion", "tipoExpedicion", "costePorUnidad", "partidaProduccion" ];
const CSV_HEADERS_COMPONENTES = [ "id_elaboracion_padre", "tipo_componente", "id_componente", "cantidad", "merma" ];


export default function ElaboracionesPage() {
  const [items, setItems] = useState<Elaboracion[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<Elaboracion | null>(null);
  const [affectedRecipes, setAffectedRecipes] = useState<Receta[]>([]);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<'elaboraciones' | 'componentes' | null>(null);

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

  const handleExportElaboracionesCSV = () => {
    const dataToExport = items.map(item => {
        const { componentes, ...rest } = item;
        return {
            ...rest,
            fotosProduccionURLs: JSON.stringify(item.fotosProduccionURLs || []),
        };
    });
    const csv = Papa.unparse(dataToExport, { columns: CSV_HEADERS_ELABORACIONES });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'elaboraciones.csv');
    link.click();
    toast({ title: 'Exportación de Elaboraciones Completada' });
  }

  const handleExportComponentesCSV = () => {
    const allComponentes: any[] = [];
    items.forEach(elab => {
        (elab.componentes || []).forEach(comp => {
            allComponentes.push({
                id_elaboracion_padre: elab.id,
                tipo_componente: comp.tipo,
                id_componente: comp.componenteId,
                cantidad: comp.cantidad,
                merma: comp.merma,
            });
        });
    });
     const csv = Papa.unparse(allComponentes, { columns: CSV_HEADERS_COMPONENTES });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'componentes.csv');
    link.click();
    toast({ title: 'Exportación de Componentes Completada' });
  }

  const handleImportClick = (type: 'elaboraciones' | 'componentes') => {
    setImportType(type);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !importType) return;
    
    Papa.parse<any>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            if (importType === 'elaboraciones') {
                const importedData: Elaboracion[] = results.data.map(item => ({
                    ...item,
                    produccionTotal: parseFloat(item.produccionTotal) || 0,
                    costePorUnidad: parseFloat(item.costePorUnidad) || 0,
                    ratioExpedicion: parseFloat(item.ratioExpedicion) || 0,
                    componentes: [], // Initialize with empty components
                    fotosProduccionURLs: JSON.parse(item.fotosProduccionURLs || '[]'),
                }));
                localStorage.setItem('elaboraciones', JSON.stringify(importedData));
                setItems(importedData);
                toast({ title: 'Importación de Elaboraciones completada', description: `Se importaron ${importedData.length} registros. Ahora importa los componentes.` });
            } else if (importType === 'componentes') {
                let elaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
                const elabMap = new Map(elaboraciones.map(e => [e.id, e]));

                results.data.forEach((compData: any) => {
                    const elab = elabMap.get(compData.id_elaboracion_padre);
                    if (elab) {
                        const newComponent: ComponenteElaboracion = {
                            id: `${compData.id_componente}-${Date.now()}`,
                            tipo: compData.tipo_componente,
                            componenteId: compData.id_componente,
                            nombre: 'temp', // This should be enriched after
                            cantidad: parseFloat(compData.cantidad) || 0,
                            merma: parseFloat(compData.merma) || 0,
                            costePorUnidad: 0, // This should be enriched after
                        };
                        if (!elab.componentes) elab.componentes = [];
                        elab.componentes.push(newComponent);
                    }
                });
                
                // Here you would typically re-enrich names and costs, for simplicity we just save
                localStorage.setItem('elaboraciones', JSON.stringify(Array.from(elabMap.values())));
                setItems(Array.from(elabMap.values()));
                toast({ title: 'Importación de Componentes completada', description: `Se procesaron ${results.data.length} componentes.` });
            }
        },
        error: (err) => toast({ variant: 'destructive', title: 'Error de importación', description: err.message })
    });

    if(event.target) event.target.value = '';
    setImportType(null);
  }

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Elaboraciones..." />;
  }

  return (
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
              <DropdownMenuLabel>Exportar a CSV</DropdownMenuLabel>
              <DropdownMenuItem onSelect={handleExportElaboracionesCSV}>
                <Download size={16} className="mr-2" />
                Elaboraciones (Maestro)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportComponentesCSV}>
                <Download size={16} className="mr-2" />
                Componentes (Detalle)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Importar desde CSV</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => handleImportClick('elaboraciones')}>
                <Upload size={16} className="mr-2" />
                Elaboraciones (Maestro)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleImportClick('componentes')}>
                <Upload size={16} className="mr-2" />
                Componentes (Detalle)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".csv"
        onChange={handleFileSelected}
      />
      
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/book/elaboraciones/nuevo?cloneId=${item.id}`)}>
                          <Copy className="mr-2 h-4 w-4" /> Clonar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleAttemptDelete(item)}}>
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
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
                  <span className="font-bold text-destructive">¡Atención! Esta elaboración se usa en {affectedRecipes.length} receta(s) que serán marcadas para revisión:</span>
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
  );
}
