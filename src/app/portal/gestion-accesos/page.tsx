
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
import { Badge } from '@/components/ui/badge';

export default function GestionAccesosPage() {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let storedUsers = localStorage.getItem('portalUsers');
    setUsers(storedUsers ? JSON.parse(storedUsers) : []);
    
    let storedProveedores = localStorage.getItem('proveedores');
    setProveedores(storedProveedores ? JSON.parse(storedProveedores) : []);

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
  
