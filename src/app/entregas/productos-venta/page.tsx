
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, Pencil, Trash2, Package, CheckCircle2 } from 'lucide-react';
import type { ProductoVenta } from '@/types';
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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ProductosVentaPage() {
  const [items, setItems] = useState<ProductoVenta[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  
  useEffect(() => {
    let storedData = localStorage.getItem('productosVenta');
    setItems(storedData ? JSON.parse(storedData) : []);
    setIsMounted(true);
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleDelete = () => {
    if (!itemToDelete) return;

    const updatedData = items.filter(i => i.id !== itemToDelete);
    localStorage.setItem('productosVenta', JSON.stringify(updatedData));
    setItems(updatedData);
    toast({ title: 'Producto de Venta eliminado' });
    setItemToDelete(null);
  };

  const calculateCost = (item: ProductoVenta) => {
    return item.componentes.reduce((total, comp) => total + comp.coste * comp.cantidad, 0);
  }
  
  const calculateMargin = (item: ProductoVenta) => {
      const cost = calculateCost(item);
      const margin = item.pvp > 0 ? ((item.pvp - cost) / item.pvp) * 100 : 0;
      return margin;
  }

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Productos de Venta..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Package />Productos de Venta</h1>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/entregas/productos-venta/nuevo">
                <PlusCircle className="mr-2" />
                Nuevo Producto
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
                <TableHead>Nombre del Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Coste</TableHead>
                <TableHead>PVP</TableHead>
                <TableHead>Margen</TableHead>
                <TableHead>Producido por Partner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const margin = calculateMargin(item);
                  return (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/entregas/productos-venta/${item.id}`)}>
                        <TableCell className="font-medium">{item.nombre}</TableCell>
                        <TableCell><Badge variant="outline">{item.categoria}</Badge></TableCell>
                        <TableCell>{formatCurrency(calculateCost(item))}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(item.pvp)}</TableCell>
                        <TableCell className={cn("font-bold", margin < 30 ? 'text-destructive' : 'text-green-600')}>{margin.toFixed(2)}%</TableCell>
                        <TableCell>
                          {item.producidoPorPartner && <CheckCircle2 className="text-green-600" />}
                        </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No se encontraron productos de venta.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

       <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el producto. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
