

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, BookHeart, ChevronLeft, ChevronRight, Eye, Copy, AlertTriangle, Menu, FileUp, FileDown, MoreHorizontal, Pencil, Trash2, Archive, CheckSquare, RefreshCw, Loader2 } from 'lucide-react';
import type { Receta, CategoriaReceta, Elaboracion, IngredienteInterno, ArticuloERP, ComponenteElaboracion } from '@/types';
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const ITEMS_PER_PAGE = 20;

const CSV_HEADERS = [ "id", "nombre", "visibleParaComerciales", "isArchived", "descripcionComercial", "responsableEscandallo", "categoria", "partidaProduccion", "estacionalidad", "tipoDieta", "porcentajeCosteProduccion", "elaboraciones", "menajeAsociado", "instruccionesMiseEnPlace", "instruccionesRegeneracion", "instruccionesEmplatado", "perfilSaborPrincipal", "perfilSaborSecundario", "perfilTextura", "tipoCocina", "recetaOrigen", "temperaturaServicio", "tecnicaCoccionPrincipal", "potencialMiseEnPlace", "formatoServicioIdeal", "equipamientoCritico", "dificultadProduccion", "estabilidadBuffet", "escalabilidad", "etiquetasTendencia", "costeMateriaPrima", "gramajeTotal", "precioVenta", "alergenos", "requiereRevision" ];

export default function RecetasPage() {
  const [items, setItems] = useState<Receta[]>([]);
  const [categories, setCategories] = useState<CategoriaReceta[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const storedRecipes = localStorage.getItem('recetas');
    setItems(storedRecipes ? JSON.parse(storedRecipes) : []);
    
    const storedCategories = localStorage.getItem('categoriasRecetas');
    setCategories(storedCategories ? JSON.parse(storedCategories) : []);

    setIsMounted(true);
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
        const matchesVisibility = statusFilter === 'all' || (statusFilter === 'archived' ? item.isArchived : !item.isArchived);
        const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.categoria || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.categoria === selectedCategory;
      return matchesVisibility && matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, statusFilter, selectedCategory]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };
  
  const handleExportCSV = () => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No hay datos', description: 'No hay recetas para exportar.' });
      return;
    }
    const dataToExport = items.map(item => ({
        ...item,
        isArchived: !!item.isArchived,
        elaboraciones: JSON.stringify(item.elaboraciones),
        menajeAsociado: JSON.stringify(item.menajeAsociado),
        perfilSaborSecundario: JSON.stringify(item.perfilSaborSecundario),
        perfilTextura: JSON.stringify(item.perfilTextura),
        tipoCocina: JSON.stringify(item.tipoCocina),
        formatoServicioIdeal: JSON.stringify(item.formatoServicioIdeal),
        equipamientoCritico: JSON.stringify(item.equipamientoCritico),
        etiquetasTendencia: JSON.stringify(item.etiquetasTendencia),
        alergenos: JSON.stringify(item.alergenos),
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'recetas.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Exportación completada', description: 'El archivo recetas.csv se ha descargado.' });
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const safeJsonParse = (jsonString: string, fallback: any = []) => {
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        return fallback;
    }
  }

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
        
        const importedData: Receta[] = results.data.map(item => ({
          ...item,
          visibleParaComerciales: item.visibleParaComerciales === 'true',
          isArchived: item.isArchived === 'true',
          requiereRevision: item.requiereRevision === 'true',
          porcentajeCosteProduccion: parseFloat(item.porcentajeCosteProduccion) || 0,
          costeMateriaPrima: parseFloat(item.costeMateriaPrima) || 0,
          gramajeTotal: parseFloat(item.gramajeTotal) || 0,
          precioVenta: parseFloat(item.precioVenta) || 0,
          dificultadProduccion: parseInt(item.dificultadProduccion) || 3,
          estabilidadBuffet: parseInt(item.estabilidadBuffet) || 3,
          elaboraciones: safeJsonParse(item.elaboraciones),
          menajeAsociado: safeJsonParse(item.menajeAsociado),
          perfilSaborSecundario: safeJsonParse(item.perfilSaborSecundario),
          perfilTextura: safeJsonParse(item.perfilTextura),
          tipoCocina: safeJsonParse(item.tipoCocina),
          formatoServicioIdeal: safeJsonParse(item.formatoServicioIdeal),
          equipamientoCritico: safeJsonParse(item.equipamientoCritico),
          etiquetasTendencia: safeJsonParse(item.etiquetasTendencia),
          alergenos: safeJsonParse(item.alergenos),
        }));
        
        localStorage.setItem('recetas', JSON.stringify(importedData));
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

  const handleMassAction = (action: 'archive' | 'delete') => {
    let updatedItems = [...items];
    if (action === 'archive') {
      updatedItems = items.map(item => selectedItems.has(item.id) ? { ...item, isArchived: true } : item);
      toast({ title: `${selectedItems.size} recetas archivadas.` });
    } else if (action === 'delete') {
      updatedItems = items.filter(item => !selectedItems.has(item.id));
      toast({ title: `${selectedItems.size} recetas eliminadas.` });
    }
    
    localStorage.setItem('recetas', JSON.stringify(updatedItems));
    setItems(updatedItems);
    setSelectedItems(new Set());
    setItemToDelete(null);
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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        setSelectedItems(new Set(filteredItems.map(item => item.id)));
    } else {
        setSelectedItems(new Set());
    }
  }
  
  const handleRecalculateAll = () => {
    setIsRecalculating(true);
    
    // Simulating async operation
    setTimeout(() => {
        try {
            // 1. Load all necessary data
            const allErp = JSON.parse(localStorage.getItem('articulosERP') || '[]') as ArticuloERP[];
            const allIngredientes = JSON.parse(localStorage.getItem('ingredientesInternos') || '[]') as IngredienteInterno[];
            let allElaboraciones = JSON.parse(localStorage.getItem('elaboraciones') || '[]') as Elaboracion[];
            let allRecetas = JSON.parse(localStorage.getItem('recetas') || '[]') as Receta[];

            const erpMap = new Map(allErp.map(item => [item.idreferenciaerp, item]));
            const ingredientesMap = new Map(allIngredientes.map(item => [item.id, item]));

            // 2. Recalculate all elaborations
            const elabCostesMap = new Map<string, number>();

            allElaboraciones.forEach(elab => {
                let costeTotalComponentes = 0;
                (elab.componentes || []).forEach(comp => {
                    if (comp.tipo === 'ingrediente') {
                        const ing = ingredientesMap.get(comp.componenteId);
                        const erpItem = ing ? erpMap.get(ing.productoERPlinkId) : undefined;
                        const costeReal = erpItem ? (erpItem.precioCompra / (erpItem.unidadConversion || 1)) * (1 - (erpItem.descuento || 0) / 100) : 0;
                        const costeConMerma = costeReal * (1 + (comp.merma || 0) / 100);
                        costeTotalComponentes += costeConMerma * comp.cantidad;
                    } else { // sub-elaboration
                        const costeSubElab = elabCostesMap.get(comp.componenteId) || 0;
                        const costeConMerma = costeSubElab * (1 + (comp.merma || 0) / 100);
                        costeTotalComponentes += costeConMerma * comp.cantidad;
                    }
                });
                const costePorUnidad = elab.produccionTotal > 0 ? costeTotalComponentes / elab.produccionTotal : 0;
                elab.costePorUnidad = costePorUnidad;
                elabCostesMap.set(elab.id, costePorUnidad);
            });
            
            localStorage.setItem('elaboraciones', JSON.stringify(allElaboraciones));

            // 3. Recalculate all recipes
            allRecetas = allRecetas.map(receta => {
                const costeMateriaPrima = (receta.elaboraciones || []).reduce((sum, elabEnReceta) => {
                    const elabCoste = elabCostesMap.get(elabEnReceta.elaboracionId) || 0;
                    const costeConMerma = elabCoste * (1 + (elabEnReceta.merma || 0) / 100);
                    return sum + (costeConMerma * elabEnReceta.cantidad);
                }, 0);

                const precioVenta = costeMateriaPrima * (1 + (receta.porcentajeCosteProduccion || 0) / 100);
                
                return { ...receta, costeMateriaPrima, precioVenta };
            });

            localStorage.setItem('recetas', JSON.stringify(allRecetas));
            setItems(allRecetas);
            
            toast({ title: "¡Éxito!", description: "Se han recalculado y guardado los costes de todas las recetas." });

        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron recalcular los costes.' });
        } finally {
            setIsRecalculating(false);
        }
    }, 500); // Small delay to show loading state
  }


  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Recetas..." />;
  }
  
  const numSelected = selectedItems.size;

  return (
    <>
    <TooltipProvider>
      <div className="flex items-center justify-between mb-6">
          <Input 
            placeholder="Buscar recetas por nombre o categoría..."
            className="flex-grow max-w-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex gap-2">
             {numSelected > 0 && (
              <>
                <Button variant="outline" onClick={() => handleMassAction('archive')}><Archive className="mr-2"/>Archivar ({numSelected})</Button>
                <Button variant="destructive" onClick={() => setItemToDelete('mass')}><Trash2 className="mr-2"/>Borrar ({numSelected})</Button>
              </>
            )}
             <Button variant="outline" size="icon" onClick={handleRecalculateAll} disabled={isRecalculating}>
              {isRecalculating ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            </Button>
            <Button asChild>
              <Link href="/book/recetas/nueva"><PlusCircle className="mr-2"/>Nueva Receta</Link>
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
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 items-center">
            <div className="lg:col-span-1">
                 <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Filtrar por categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Categorías</SelectItem>
                        {categories.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="lg:col-span-2 flex items-center justify-between gap-4">
                 <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                    <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="active">Activas</SelectItem>
                        <SelectItem value="archived">Archivadas</SelectItem>
                        <SelectItem value="all">Todas</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground">
                        Pág. {currentPage}/{totalPages || 1}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                   <Checkbox
                        checked={numSelected > 0 && numSelected === paginatedItems.length}
                        onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedItems);
                            paginatedItems.forEach(item => {
                                if (checked) newSelected.add(item.id);
                                else newSelected.delete(item.id);
                            });
                            setSelectedItems(newSelected);
                        }}
                    />
                </TableHead>
                <TableHead className="py-2">Nombre Receta</TableHead>
                <TableHead className="py-2">Categoría</TableHead>
                <TableHead className="py-2">Partida Producción</TableHead>
                <TableHead className="py-2">Coste M.P.</TableHead>
                <TableHead className="py-2">PVP Teórico</TableHead>
                <TableHead className="w-24 text-right py-2">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length > 0 ? (
                paginatedItems.map(item => (
                  <TableRow 
                    key={item.id} 
                    className={cn(item.isArchived && "bg-secondary/50 text-muted-foreground", "cursor-pointer")}
                    onClick={() => router.push(`/book/recetas/${item.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => handleSelect(item.id)}
                        />
                    </TableCell>
                    <TableCell className="font-medium py-2 flex items-center gap-2">
                        {item.requiereRevision && (
                            <Tooltip>
                                <TooltipTrigger>
                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Esta receta necesita revisión.</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {item.nombre}
                    </TableCell>
                    <TableCell className="py-2">{item.categoria}</TableCell>
                    <TableCell className="py-2">{item.partidaProduccion}</TableCell>
                    <TableCell className="py-2">{formatCurrency(item.costeMateriaPrima)}</TableCell>
                    <TableCell className="font-bold text-primary py-2">{formatCurrency(item.precioVenta)}</TableCell>
                    <TableCell className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/book/recetas/${item.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/book/recetas/nueva?cloneId=${item.id}`); }}>
                            <Copy className="mr-2 h-4 w-4" /> Clonar
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
                  <TableCell colSpan={7} className="h-24 text-center">
                    No se encontraron recetas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
    </TooltipProvider>
    <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete === 'mass'
                ? `Esta acción no se puede deshacer. Se eliminarán permanentemente las ${numSelected} recetas seleccionadas.`
                : 'Esta acción no se puede deshacer. Se eliminará permanentemente la receta.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => handleMassAction('delete')}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

