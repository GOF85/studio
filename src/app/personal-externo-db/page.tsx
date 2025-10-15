

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ArrowLeft, UserPlus } from 'lucide-react';
import type { PersonalExternoDB, Proveedor } from '@/types';
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
import { Badge } from '@/components/ui/badge';

export default function PersonalExternoDBPage() {
  const [items, setItems] = useState<PersonalExternoDB[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let storedData = localStorage.getItem('personalExternoDB');
    setItems(storedData ? JSON.parse(storedData) : []);
    let storedProveedores = localStorage.getItem('proveedores');
    setProveedores(storedProveedores ? JSON.parse(storedProveedores) : []);
    setIsMounted(true);
  }, []);
  
  const getProviderName = (proveedorId: string) => {
    const proveedor = proveedores.find(p => p.id === proveedorId);
    return proveedor?.nombreComercial || 'Desconocido';
  }

  const filteredItems = useMemo(() => {
    return items.map(item => ({
        ...item,
        proveedorNombre: getProviderName(item.proveedorId)
    })).filter(item => 
      item.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.proveedorNombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm, proveedores]);

  const handleDelete = () => {
    if (!itemToDelete) return;
    const updatedData = items.filter(e => e.id !== itemToDelete);
    localStorage.setItem('personalExternoDB', JSON.stringify(updatedData));
    setItems(updatedData);
    toast({ title: 'Registro eliminado', description: 'El trabajador ha sido eliminado de la base de datos.' });
    setItemToDelete(null);
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Personal Externo..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
            <div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/bd')} className="mb-2">
                    <ArrowLeft className="mr-2" />
                    Volver a Bases de Datos
                </Button>
                <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><UserPlus />Base de Datos de Personal Externo</h1>
            </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/personal-externo-db/nuevo">
                <PlusCircle className="mr-2" />
                Nuevo Trabajador
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por nombre, DNI o proveedor..."
            className="flex-grow max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-2">Nombre Completo</TableHead>
                <TableHead className="p-2">DNI</TableHead>
                <TableHead className="p-2">Proveedor</TableHead>
                <TableHead className="p-2">Nombre Compacto</TableHead>
                <TableHead className="text-right p-2">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium p-2">{item.nombreCompleto}</TableCell>
                    <TableCell className="p-2 font-mono">{item.id}</TableCell>
                    <TableCell className="p-2"><Badge variant="outline">{item.proveedorNombre}</Badge></TableCell>
                    <TableCell className="p-2 font-mono">{item.nombreCompacto}</TableCell>
                    <TableCell className="text-right p-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/personal-externo-db/${item.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setItemToDelete(item.id)}>
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
                  <TableCell colSpan={5} className="h-24 text-center">
                    No se encontraron trabajadores que coincidan con la búsqueda.
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el registro del trabajador.
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
