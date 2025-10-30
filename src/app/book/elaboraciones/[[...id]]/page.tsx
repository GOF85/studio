

'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, FieldErrors, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { recipeDescriptionGenerator } from '@/ai/flows/recipe-description-generator';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';

import { Loader2, Save, X, BookHeart, Utensils, Sprout, GlassWater, Percent, PlusCircle, GripVertical, Trash2, Eye, Soup, Info, ChefHat, Package, Factory, Sparkles, TrendingUp, FilePenLine, Link as LinkIcon, Component, MoreHorizontal, Copy, Download, Upload, Menu, AlertTriangle, CheckCircle, RefreshCw, Pencil } from 'lucide-react';
import type { Receta, Elaboracion, IngredienteInterno, MenajeDB, ArticuloERP, Alergeno, Personal, CategoriaReceta, SaborPrincipal, TipoCocina, PartidaProduccion, ElaboracionEnReceta, ComponenteElaboracion } from '@/types';
import { SABORES_PRINCIPALES } from '@/types';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { Combobox } from '@/components/ui/combobox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency, formatUnit, cn } from '@/lib/utils';
import Image from 'next/image';
import { AllergenBadge } from '@/components/icons/allergen-badge';
import { ElaborationForm, type ElaborationFormValues } from '@/components/book/elaboration-form';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ComponenteSelector } from '@/components/book/componente-selector';
import { Label } from '@/components/ui/label';


const CSV_HEADERS_ELABORACIONES = [ "id", "nombre", "produccionTotal", "unidadProduccion", "instruccionesPreparacion", "fotosProduccionURLs", "videoProduccionURL", "formatoExpedicion", "ratioExpedicion", "tipoExpedicion", "costePorUnidad", "partidaProduccion" ];
const CSV_HEADERS_COMPONENTES = [ "id_elaboracion_padre", "tipo_componente", "id_componente", "cantidad", "merma" ];

type ElaboracionConAlergenos = Elaboracion & { alergenosCalculados?: Alergeno[] };
type IngredienteConERP = IngredienteInterno & { erp?: ArticuloERP };

const calculateElabAlergenos = (elaboracion: Elaboracion, ingredientesMap: Map<string, IngredienteInterno>): Alergeno[] => {
    if (!elaboracion || !elaboracion.componentes) {
      return [];
    }
    const elabAlergenos = new Set<Alergeno>();
    elaboracion.componentes.forEach(comp => {
        if(comp.tipo === 'ingrediente') {
            const ingData = ingredientesMap.get(comp.componenteId);
            if (ingData) {
              (ingData.alergenosPresentes || []).forEach(a => elabAlergenos.add(a));
              (ingData.alergenosTrazas || []).forEach(a => elabAlergenos.add(a));
            }
        }
    });
    return Array.from(elabAlergenos);
};

function ElaboracionesListPage() {
  const [items, setItems] = useState<(ElaboracionConAlergenos & { usageCount: number; usedIn: string[] })[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOrphanedOnly, setShowOrphanedOnly] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<'elaboraciones' | 'componentes' | null>(null);

  const loadData = useCallback(() => {
    const storedRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];
    const storedElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
    const storedIngredientes = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
    const ingredientesMap = new Map(storedIngredientes.map(i => [i.id, i]));

    const usageMap = new Map<string, string[]>();
    storedRecetas.forEach(receta => {
        (receta.elaboraciones || []).forEach(elabEnReceta => {
            const currentUses = usageMap.get(elabEnReceta.elaboracionId) || [];
            if (!currentUses.includes(receta.nombre)) {
                usageMap.set(elabEnReceta.elaboracionId, [...currentUses, receta.nombre]);
            }
        });
    });

    const elaboracionesConDatos = storedElaboraciones.map((elab: Elaboracion) => {
        const usedInRecetas = usageMap.get(elab.id) || [];
        return {
          ...elab,
          alergenosCalculados: calculateElabAlergenos(elab, ingredientesMap),
          usageCount: usedInRecetas.length,
          usedIn: usedInRecetas
        }
    });

    setItems(elaboracionesConDatos);
    setIsMounted(true);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const filteredItems = useMemo(() => {
    return items.filter(item => {
        const searchMatch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const orphanMatch = !showOrphanedOnly || item.usageCount === 0;
        return searchMatch && orphanMatch;
    });
  }, [items, searchTerm, showOrphanedOnly]);

  const handleDelete = () => {
    if (selectedItems.size === 0) return;

    // Check if any selected item is in use
    const itemsInUse = Array.from(selectedItems).filter(id => {
      const item = items.find(i => i.id === id);
      return item && item.usageCount > 0;
    });

    if (itemsInUse.length > 0) {
        toast({
            variant: 'destructive',
            title: 'Error al eliminar',
            description: `${itemsInUse.length} de las elaboraciones seleccionadas están en uso y no pueden ser eliminadas.`,
        });
        return;
    }

    const updatedData = items.filter(i => !selectedItems.has(i.id));
    localStorage.setItem('elaboraciones', JSON.stringify(updatedData));
    setItems(updatedData);
    toast({ title: `${selectedItems.size} elaboraciones eliminadas` });
    setSelectedItems(new Set());
    setShowDeleteConfirm(false);
  };
  
  const handleSelect = (itemId: string) => {
    setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
            newSet.delete(itemId);
        } else {
            newSet.add(itemId);
        }
        return newSet;
    });
  };
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) {
        setSelectedItems(new Set(filteredItems.map(i => i.id)));
    } else {
        setSelectedItems(new Set());
    }
  };

  const handleExportElaboracionesCSV = () => {
    const dataToExport = items.map(item => {
        const { componentes, alergenosCalculados, usageCount, usedIn, ...rest } = item;
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
                const importedData: Elaboracion[] = results.data.map((item:any) => ({
                    ...item,
                    produccionTotal: parseFloat(item.produccionTotal) || 0,
                    costePorUnidad: parseFloat(item.costePorUnidad) || 0,
                    ratioExpedicion: parseFloat(item.ratioExpedicion) || 0,
                    componentes: [],
                    fotosProduccionURLs: JSON.parse(item.fotosProduccionURLs || '[]'),
                }));
                localStorage.setItem('elaboraciones', JSON.stringify(importedData));
                loadData();
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
                            nombre: 'temp', 
                            cantidad: parseFloat(compData.cantidad) || 0,
                            merma: parseFloat(compData.merma) || 0,
                            costePorUnidad: 0,
                        };
                        if (!elab.componentes) elab.componentes = [];
                        elab.componentes.push(newComponent);
                    }
                });
                
                localStorage.setItem('elaboraciones', JSON.stringify(Array.from(elabMap.values())));
                loadData();
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
  
  const numSelected = selectedItems.size;

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
            <Input 
              placeholder="Buscar por nombre..."
              className="flex-grow max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex items-center space-x-2">
                <Checkbox id="orphan-filter" checked={showOrphanedOnly} onCheckedChange={(checked) => setShowOrphanedOnly(!!checked)} />
                <Label htmlFor="orphan-filter">Elaboraciones Huérfanas</Label>
            </div>
        </div>
        <div className="flex gap-2">
          {numSelected > 0 && (
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="mr-2"/>Borrar Selección ({numSelected})</Button>
          )}
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
              <TableHead className="w-12">
                <Checkbox
                    checked={numSelected > 0 && numSelected === filteredItems.length}
                    onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Nombre Elaboración</TableHead>
              <TableHead>Coste / Ud.</TableHead>
              <TableHead>Presente en Recetas</TableHead>
              <TableHead>Alérgenos</TableHead>
              <TableHead className="text-right w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <TableRow key={item.id} >
                  <TableCell>
                    <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={() => handleSelect(item.id)} />
                  </TableCell>
                  <TableCell className="font-medium cursor-pointer" onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>{item.nombre}</TableCell>
                  <TableCell className="cursor-pointer" onClick={() => router.push(`/book/elaboraciones/${item.id}`)}>{formatCurrency(item.costePorUnidad)} / {formatUnit(item.unidadProduccion)}</TableCell>
                  <TableCell className="text-center font-semibold">
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <span className="cursor-default">{item.usageCount}</span>
                        </TooltipTrigger>
                        {item.usedIn && item.usedIn.length > 0 && (
                            <TooltipContent>
                                <ul className="list-disc pl-4 text-xs">
                                    {item.usedIn.map(recetaName => <li key={recetaName}>{recetaName}</li>)}
                                </ul>
                            </TooltipContent>
                        )}
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(item.alergenosCalculados || []).map(alergeno => (
                            <AllergenBadge key={alergeno} allergen={alergeno} />
                        ))}
                      </div>
                    </TableCell>
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No se encontraron elaboraciones.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

     <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive" />
              ¿Confirmar Borrado Masivo?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Vas a eliminar permanentemente <strong>{numSelected}</strong> elaboraciones. Las elaboraciones que estén en uso en alguna receta no se podrán eliminar. ¿Estás seguro?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={handleDelete}
          >
            Sí, eliminar selección
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </TooltipProvider>
  );
}

function ElaborationFormPage() {
    const router = useRouter();
    const { toast } = useToast();
    const params = useParams();
    const searchParams = useSearchParams();

    const id = Array.isArray(params.id) ? params.id[0] : null;
    const isNew = id === 'nuevo';
    const isEditing = !isNew && id;
    const cloneId = searchParams.get('cloneId');

    const [initialData, setInitialData] = useState<Partial<ElaborationFormValues> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    
    useEffect(() => {
        let elabToLoad: Partial<ElaborationFormValues> | null = null;
        const allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        
        if (cloneId) {
            const elabToClone = allElaboraciones.find(e => e.id === cloneId);
            if (elabToClone) {
                elabToLoad = { ...elabToClone, id: Date.now().toString(), nombre: `${elabToClone.nombre} (Copia)` };
            }
        } else if (isEditing) {
            elabToLoad = allElaboraciones.find(e => e.id === id) || null;
        } else if (isNew) {
            elabToLoad = { 
                id: Date.now().toString(), 
                nombre: '', 
                produccionTotal: 1, 
                unidadProduccion: 'KG', 
                partidaProduccion: 'FRIO', 
                componentes: [],
                tipoExpedicion: 'REFRIGERADO', 
                formatoExpedicion: '', 
                ratioExpedicion: 0,
                instruccionesPreparacion: '', 
                videoProduccionURL: '', 
                fotosProduccionURLs: [],
            };
        }
        
        setInitialData(elabToLoad);
        setIsDataLoaded(true);

    }, [id, isNew, isEditing, cloneId]);

    function onSubmit(data: ElaborationFormValues, costePorUnidad: number) {
        setIsLoading(true);
        let allItems = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
        let message = '';
        
        const dataToSave: Elaboracion = { 
          ...data, 
        };

        if (isEditing && !cloneId) {
          const index = allItems.findIndex(p => p.id === id);
          if (index !== -1) {
            allItems[index] = dataToSave;
            message = 'Elaboración actualizada correctamente.';
          }
        } else {
          allItems.push(dataToSave);
          message = cloneId ? 'Elaboración clonada correctamente.' : 'Elaboración creada correctamente.';
        }

        localStorage.setItem('elaboraciones', JSON.stringify(allItems));
        
        setTimeout(() => {
          toast({ description: message });
          setIsLoading(false);
          router.push('/book/elaboraciones');
        }, 1000);
    }
    
    if (!isDataLoaded) {
      return <LoadingSkeleton title="Cargando elaboración..." />;
    }

    if (!initialData) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la elaboración." });
        router.push('/book/elaboraciones');
        return <LoadingSkeleton title="Redirigiendo..." />;
    }
    
    const pageTitle = cloneId ? 'Clonar Elaboración' : (isNew ? 'Nueva Elaboración' : 'Editar Elaboración');

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Component className="h-8 w-8" />
                    <h1 className="text-3xl font-headline font-bold">{pageTitle}</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => router.push('/book/elaboraciones')}> <X className="mr-2"/> Cancelar</Button>
                    <Button type="submit" form="elaboration-form" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                    <span className="ml-2">{isNew || cloneId ? 'Guardar Elaboración' : 'Guardar Cambios'}</span>
                    </Button>
                </div>
            </div>
            <ElaborationForm
                initialData={initialData}
                onSave={onSubmit}
                isSubmitting={isLoading}
            />
      </main>
    );
}

export default function ElaboracionesPage() {
    const params = useParams();
    const isListPage = !params.id || params.id.length === 0;

    return (
        <Suspense fallback={<LoadingSkeleton title="Cargando elaboraciones..." />}>
            {isListPage ? <ElaboracionesListPage /> : <ElaborationFormPage />}
        </Suspense>
    );
}

