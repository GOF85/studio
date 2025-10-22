

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, BookHeart, ChevronLeft, ChevronRight, Eye, Copy, AlertTriangle, Menu, FileUp, FileDown } from 'lucide-react';
import type { Receta, CategoriaReceta } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

const ITEMS_PER_PAGE = 20;

// Headers for CSV export/import, including all fields of a Receta
const CSV_HEADERS = [ "id", "nombre", "visibleParaComerciales", "descripcionComercial", "responsableEscandallo", "categoria", "partidaProduccion", "estacionalidad", "tipoDieta", "porcentajeCosteProduccion", "elaboraciones", "menajeAsociado", "instruccionesMiseEnPlace", "instruccionesRegeneracion", "instruccionesEmplatado", "perfilSaborPrincipal", "perfilSaborSecundario", "perfilTextura", "tipoCocina", "temperaturaServicio", "tecnicaCoccionPrincipal", "potencialMiseEnPlace", "formatoServicioIdeal", "equipamientoCritico", "dificultadProduccion", "estabilidadBuffet", "escalabilidad", "etiquetasTendencia", "costeMateriaPrima", "gramajeTotal", "precioVenta", "alergenos", "requiereRevision" ];


export default function RecetasPage() {
  const [items, setItems] = useState<Receta[]>([]);
  const [categories, setCategories] = useState<CategoriaReceta[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showVisibleOnly, setShowVisibleOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
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
        const matchesVisibility = !showVisibleOnly || item.visibleParaComerciales;
        const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.categoria || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.categoria === selectedCategory;
      return matchesVisibility && matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, showVisibleOnly, selectedCategory]);

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
        elaboraciones: JSON.stringify(item.elaboraciones),
        menajeAsociado: JSON.stringify(item.menajeAsociado),
        perfilSaborSecundario: JSON.stringify(item.perfilSaborSecundario),
        perfilTextura: JSON.stringify(item.perfilTextura),
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


  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Recetas..." />;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between mb-6">
          <div></div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/book/recetas/nueva">
                <PlusCircle className="mr-2" />
                Nueva Receta
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
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 items-center">
            <div className="lg:col-span-1">
                <Input 
                    placeholder="Buscar por nombre o categoría..."
                    className="w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="lg:col-span-2 flex items-center justify-between gap-4">
                 <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Filtrar por categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Categorías</SelectItem>
                        {categories.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
                <div className="flex items-center space-x-2 whitespace-nowrap">
                    <Checkbox id="visible-comerciales" checked={showVisibleOnly} onCheckedChange={(checked) => setShowVisibleOnly(Boolean(checked))} />
                    <label htmlFor="visible-comerciales" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"><Eye size={16}/>Mostrar solo visibles</label>
                </div>
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
                <TableHead className="py-2">Nombre Receta</TableHead>
                <TableHead className="py-2">Categoría</TableHead>
                <TableHead className="py-2">Partida Producción</TableHead>
                <TableHead className="py-2">Coste M.P.</TableHead>
                <TableHead className="py-2">Precio Venta</TableHead>
                <TableHead className="w-12 text-right py-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length > 0 ? (
                paginatedItems.map(item => (
                  <TableRow key={item.id} onClick={() => router.push(`/book/recetas/${item.id}`)} className="cursor-pointer">
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
                    <TableCell className="py-2 text-right">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); router.push(`/book/recetas/nueva?cloneId=${item.id}`); }}>
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
                  <TableCell colSpan={6} className="h-24 text-center">
                    No se encontraron recetas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
    </TooltipProvider>
  );
}
