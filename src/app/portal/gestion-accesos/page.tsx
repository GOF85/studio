
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, UserCog, ArrowLeft } from 'lucide-react';
import type { PortalUser, Proveedor } from '@/types';
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

export default function GestionAccesosPage() {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let storedUsers = localStorage.getItem('portalUsers');
    setUsers(storedUsers ? JSON.parse(storedUsers) : []);
    
    let storedProveedores = localStorage.getItem('proveedores');
    setProveedores(storedProveedores ? JSON.parse(storedProveedores) : []);

    setIsMounted(true);
  }, []);
  
  const proveedorMap = useMemo(() => {
    return new Map(proveedores.map(p => [p.id, p.nombreComercial]));
  }, [proveedores]);

  const filteredItems = useMemo(() => {
    return users.filter(user => 
      user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.roles || []).some(r => r.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (proveedorMap.get(user.proveedorId || '') || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm, proveedorMap]);

  const handleDelete = () => {
    if (!userToDelete) return;
    const updatedData = users.filter(u => u.id !== userToDelete);
    localStorage.setItem('portalUsers', JSON.stringify(updatedData));
    setUsers(updatedData);
    toast({ title: 'Usuario eliminado', description: 'El usuario del portal ha sido eliminado.' });
    setUserToDelete(null);
  };
  
  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Gestión de Accesos..." />;
  }

  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
            <div/>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/portal/gestion-accesos/nuevo">
                <PlusCircle className="mr-2" />
                Nuevo Usuario
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            placeholder="Buscar por nombre, email, rol o proveedor..."
            className="flex-grow max-w-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="p-2">Nombre</TableHead>
                <TableHead className="p-2">Email</TableHead>
                <TableHead className="p-2">Roles</TableHead>
                <TableHead className="p-2">Proveedor Asociado</TableHead>
                <TableHead className="text-right p-2">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium p-2">{user.nombre}</TableCell>
                    <TableCell className="p-2">{user.email}</TableCell>
                    <TableCell className="p-2">
                        <div className="flex flex-wrap gap-1">
                            {(user.roles || []).map(role => <Badge key={role}>{role}</Badge>)}
                        </div>
                    </TableCell>
                    <TableCell className="p-2">{user.proveedorId ? proveedorMap.get(user.proveedorId) || 'N/A' : '-'}</TableCell>
                    <TableCell className="text-right p-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/portal/gestion-accesos/${user.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setUserToDelete(user.id)}>
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
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la cuenta del usuario y su acceso a los portales.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar Usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
