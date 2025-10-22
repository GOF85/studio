

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookHeart, ChefHat, Component, Package, GlassWater, ChevronRight, ChevronLeft, PlusCircle, Menu, Sprout } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { Receta } from '@/types';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

const ITEMS_PER_PAGE = 20;

export default function BookDashboardPage() {
  const [allRecipes, setAllRecipes] = useState<Receta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  
  useEffect(() => {
    const storedRecipes = localStorage.getItem('recetas');
    setAllRecipes(storedRecipes ? JSON.parse(storedRecipes) : []);
    setIsMounted(true);
  }, []);

  const filteredRecipes = useMemo(() => {
    if (!searchTerm) {
      return allRecipes;
    }
    return allRecipes.filter(recipe => 
        recipe.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (recipe.categoria || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allRecipes, searchTerm]);
  
  const totalPages = Math.ceil(filteredRecipes.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecipes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRecipes, currentPage]);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Book Gastronómico..." />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
            <div></div>
            <div className="flex gap-2">
                <Button asChild>
                    <Link href="/book/recetas/nueva"><PlusCircle className="mr-2"/>Nueva Receta</Link>
                </Button>
            </div>
        </div>
        
        <div className="flex items-center justify-between gap-4 mb-4">
          <Input 
            placeholder="Buscar recetas por nombre o categoría..."
            className="flex-grow max-w-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
           <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages || 1}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
            >
                <ChevronLeft className="h-4 w-4" />
                Anterior
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
            >
                Siguiente
                <ChevronRight className="h-4 w-4" />
            </Button>
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
                    <TableCell className="font-bold text-primary py-2">{(item.precioVenta || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {searchTerm ? 'No se encontraron recetas.' : 'Aún no se ha creado ninguna receta.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}

