'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Target } from 'lucide-react';
import type { ObjetivosGasto } from '@/types';
import { Header } from '@/components/layout/header';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export default function ObjetivosGastoPage() {
  const [plantillas, setPlantillas] = useState<ObjetivosGasto[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [plantillaToDelete, setPlantillaToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let storedData = localStorage.getItem('objetivosGastoPlantillas');
    setPlantillas(storedData ? JSON.parse(storedData) : []);
    setIsMounted(true);
  }, []);
  
  const filteredItems = useMemo(() => {
    return plantillas.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [plantillas, searchTerm]);

  const handleDelete = () => {
    if (!plantillaToDelete) return;
    const updatedData = plantillas.filter(e => e.id !== plantillaToDelete);
    localStorage.setItem('objetivosGastoPlantillas', JSON.stringify(updatedData));
    setPlantillas(updatedData);
    toast({ title: 'Plantilla eliminada', description: 'La plantilla se ha eliminado correctamente.' });
    setPlantillaToDelete(null);
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Plantillas de Objetivos..." />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Target />Plantillas de Objetivos de Gasto</h1>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/objetivos-gasto/nuevo">
                <PlusCircle className="mr-2" />
                Nueva Plantilla
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
                <TableHead>Nombre de la Plantilla</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/objetivos-gasto/${item.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setPlantillaToDelete(item.id)}>
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
                  <TableCell colSpan={2} className="h-24 text-center">
                    No se encontraron plantillas que coincidan con la búsqueda.
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente la plantilla de objetivos.
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
