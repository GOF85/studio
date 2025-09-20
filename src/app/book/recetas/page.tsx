'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, BookHeart } from 'lucide-react';
import type { Receta } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

export default function RecetasPage() {
  const [items, setItems] = useState<Receta[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
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
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por nombre o categoría..."
            className="flex-grow max-w-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Receta</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Coste Materia Prima</TableHead>
                <TableHead>Precio Venta Rec.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <TableRow key={item.id} onClick={() => router.push(`/book/recetas/${item.id}`)} className="cursor-pointer">
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{item.categoria}</TableCell>
                    <TableCell>{item.responsableEscandallo}</TableCell>
                    <TableCell>{(item.costeMateriaPrima || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
                     <TableCell className="font-bold text-primary">{(item.precioVentaRecomendado || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</TableCell>
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
