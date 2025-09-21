'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { BookHeart, ChefHat, Component, Package, GlassWater, ChevronRight, ChevronLeft } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { Receta } from '@/types';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

const ITEMS_PER_PAGE = 20;

export default function BookDashboardPage() {
  const [allRecipes, setAllRecipes] = useState<Receta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  
  useEffect(() => {
    setIsMounted(true);
    const storedRecipes = localStorage.getItem('recetas');
    if (storedRecipes) {
      setAllRecipes(JSON.parse(storedRecipes));
    }
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
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-headline font-bold flex items-center gap-3"><BookHeart size={24}/>Book Gastronómico</h1>
            <Button asChild>
                <Link href="/book/recetas/nueva">Nueva Receta</Link>
            </Button>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Button asChild variant="outline" className="justify-start h-12 text-base">
                <Link href="/book/elaboraciones"><Component size={18} className="mr-2"/>Elaboraciones</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start h-12 text-base">
                <Link href="/book/ingredientes"><ChefHat size={18} className="mr-2"/>Ingredientes</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start h-12 text-base">
                <Link href="/book/ingredientes-erp"><Package size={18} className="mr-2"/>Materia Prima (ERP)</Link>
            </Button>
             <Button asChild variant="outline" className="justify-start h-12 text-base">
                <Link href="/menaje-db"><GlassWater size={18} className="mr-2"/>Menaje</Link>
            </Button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Input 
            placeholder="Buscar recetas por nombre o categoría..."
            className="flex-grow max-w-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center justify-start gap-2 mb-4">
            <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
            >
                <ChevronLeft className="h-4 w-4" />
                Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
            >
                Siguiente
                <ChevronRight className="h-4 w-4" />
            </Button>
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
