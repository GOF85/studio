
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import type { PackDeVenta } from '@/types';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';

export default function PacksDeVentaPage() {
  const [packs, setPacks] = useState<PackDeVenta[]>([]);
  const [packToDelete, setPackToDelete] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let storedData = localStorage.getItem('packsDeVenta');
    setPacks(storedData ? JSON.parse(storedData) : []);
    setIsMounted(true);
  }, []);

  const handleDelete = () => {
    if (!packToDelete) return;
    const updatedData = packs.filter(p => p.id !== packToDelete);
    localStorage.setItem('packsDeVenta', JSON.stringify(updatedData));
    setPacks(updatedData);
    toast({ title: 'Pack eliminado' });
    setPackToDelete(null);
  };
  
  const filteredItems = packs.filter(pack => 
    pack.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Packs de Venta..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
            <div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/bd')} className="mb-2">
                    <ArrowLeft className="mr-2" />
                    Volver a Bases de Datos
                </Button>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><ShoppingBag />Packs de Venta</h1>
            </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/packs-de-venta/nuevo">
                <PlusCircle className="mr-2" />
                Nuevo Pack
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por nombre..."
            className="flex-grow max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-2">Nombre del Pack</TableHead>
                <TableHead className="p-2">Nº Componentes</TableHead>
                <TableHead className="p-2">PVP</TableHead>
                <TableHead className="text-right p-2">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/packs-de-venta/${item.id}`)}>
                    <TableCell className="font-medium p-2">{item.nombre}</TableCell>
                    <TableCell className="p-2">{item.componentes.length}</TableCell>
                    <TableCell className="p-2">{formatCurrency(item.pvp)}</TableCell>
                    <TableCell className="text-right p-2">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/packs-de-venta/${item.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => {e.stopPropagation(); setPackToDelete(item.id)}}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No has creado ningún pack de venta todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <AlertDialog open={!!packToDelete} onOpenChange={(open) => !open && setPackToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el pack de venta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPackToDelete(null)}>Cancelar</AlertDialogCancel>
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
