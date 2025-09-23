'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, BookHeart, ChevronLeft, ChevronRight, Eye, Copy } from 'lucide-react';
import type { Receta, CategoriaReceta } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const ITEMS_PER_PAGE = 20;

export default function RecetasPage() {
  const [items, setItems] = useState<Receta[]>([]);
  const [categories, setCategories] = useState<CategoriaReceta[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showVisibleOnly, setShowVisibleOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const router = useRouter();
  
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

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Recetas..." />;
  }

  return (
    <TooltipProvider>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><BookHeart />Gestión de Recetas</h1>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/book/recetas/nueva">
                <PlusCircle className="mr-2" />
                Nueva Receta
              </Link>
            </Button>
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
                        disabled={currentPage === totalPages}
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
                <TableHead className="py-2">Precio Venta Rec.</TableHead>
                <TableHead className="w-12 text-right py-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length > 0 ? (
                paginatedItems.map(item => (
                  <TableRow key={item.id} onClick={() => router.push(`/book/recetas/${item.id}`)} className="cursor-pointer">
                    <TableCell className="font-medium py-2">{item.nombre}</TableCell>
                    <TableCell className="py-2">{item.categoria}</TableCell>
                    <TableCell className="py-2">{item.partidaProduccion}</TableCell>
                    <TableCell className="py-2">{(item.costeMateriaPrima || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                    <TableCell className="font-bold text-primary py-2">{(item.precioVentaRecomendado || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
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
      </main>
    </TooltipProvider>
  );
}
