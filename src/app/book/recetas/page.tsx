'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, BookHeart, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Receta } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

const ITEMS_PER_PAGE = 20;

export default function RecetasPage() {
  const [items, setItems] = useState<Receta[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const router = useRouter();
  
  useEffect(() => {
    let storedData = localStorage.getItem('recetas');
    setItems(storedData ? JSON.parse(storedData) : []);
    setIsMounted(true);
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.categoria || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

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
    <>
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
        
        <div className="flex items-center justify-between gap-4 mb-4">
          <Input 
            placeholder="Buscar por nombre o categoría..."
            className="flex-grow max-w-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
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
                disabled={currentPage === totalPages}
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
                    No se encontraron recetas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </>
  );
}
