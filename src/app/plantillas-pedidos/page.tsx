
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, FilePlus2, MoreHorizontal, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import type { PedidoPlantilla } from '@/types';
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
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Badge } from '@/components/ui/badge';

export default function PlantillasPedidosPage() {
  const [plantillas, setPlantillas] = useState<PedidoPlantilla[]>([]);
  const [plantillaToDelete, setPlantillaToDelete] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let storedData = localStorage.getItem('pedidoPlantillas');
    setPlantillas(storedData ? JSON.parse(storedData) : []);
    setIsMounted(true);
  }, []);

  const handleDelete = () => {
    if (!plantillaToDelete) return;
    const updatedData = plantillas.filter(p => p.id !== plantillaToDelete);
    localStorage.setItem('pedidoPlantillas', JSON.stringify(updatedData));
    setPlantillas(updatedData);
    toast({ title: 'Plantilla eliminada' });
    setPlantillaToDelete(null);
  };

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Plantillas de Pedidos..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
            <div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/configuracion')} className="mb-2">
                    <ArrowLeft className="mr-2" />
                    Volver a Configuración
                </Button>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><FilePlus2 />Plantillas de Pedidos</h1>
            </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/plantillas-pedidos/nuevo">
                <PlusCircle className="mr-2" />
                Nueva Plantilla
              </Link>
            </Button>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-2">Nombre de la Plantilla</TableHead>
                <TableHead className="p-2">Tipo de Pedido</TableHead>
                <TableHead className="p-2">Nº de Artículos</TableHead>
                <TableHead className="text-right p-2">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plantillas.length > 0 ? (
                plantillas.map(item => (
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/plantillas-pedidos/${item.id}`)}>
                    <TableCell className="font-medium p-2">{item.nombre}</TableCell>
                    <TableCell className="p-2"><Badge variant="outline">{item.tipo}</Badge></TableCell>
                    <TableCell className="p-2">{item.items.length}</TableCell>
                    <TableCell className="text-right p-2">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/plantillas-pedidos/${item.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => {e.stopPropagation(); setPlantillaToDelete(item.id)}}>
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
                    No has creado ninguna plantilla de pedido todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <AlertDialog open={!!plantillaToDelete} onOpenChange={(open) => !open && setPlantillaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la plantilla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPlantillaToDelete(null)}>Cancelar</AlertDialogCancel>
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
