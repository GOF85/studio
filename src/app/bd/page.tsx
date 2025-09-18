'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { Database, PlusCircle, ArrowRight, Users } from 'lucide-react';

// Placeholder type
type DatabaseEntry = {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  path: string;
};

export default function BdPage() {
  const [databases, setDatabases] = useState<DatabaseEntry[]>([
    { id: '1', name: 'Personal', description: 'Gestión de empleados y contactos.', itemCount: 0, path: '/personal' },
    { id: '2', name: 'Espacios', description: 'Gestión de espacios para eventos.', itemCount: 0, path: '/espacios' },
    { id: '3', name: 'Precios', description: 'Gestión de precios de productos.', itemCount: 0, path: '/precios' },
    { id: '4', name: 'Gastronomía (Platos)', description: 'Gestión de platos y menús.', itemCount: 0, path: '/gastronomia-db' },
    { id: '5', name: 'Alquiler', description: 'Gestión de artículos de alquiler a proveedores.', itemCount: 0, path: '/alquiler-db' },
    { id: '6', name: 'Tipo Servicio', description: 'Gestión de los tipos de servicio.', itemCount: 0, path: '/tipo-servicio' },
  ]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const personal = JSON.parse(localStorage.getItem('personal') || '[]').length;
    const espacios = JSON.parse(localStorage.getItem('espacios') || '[]').length;
    const precios = JSON.parse(localStorage.getItem('precios') || '[]').length;
    const gastronomia = JSON.parse(localStorage.getItem('gastronomiaDB') || '[]').length;
    const alquiler = JSON.parse(localStorage.getItem('alquilerDB') || '[]').length;
    const tipoServicio = JSON.parse(localStorage.getItem('tipoServicio') || '[]').length;
    
    setDatabases(prev => prev.map(db => {
      if (db.id === '1') return { ...db, itemCount: personal };
      if (db.id === '2') return { ...db, itemCount: espacios };
      if (db.id === '3') return { ...db, itemCount: precios };
      if (db.id === '4') return { ...db, itemCount: gastronomia };
      if (db.id === '5') return { ...db, itemCount: alquiler };
      if (db.id === '6') return { ...db, itemCount: tipoServicio };
      return db;
    }));
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8" />
            <h1 className="text-3xl font-headline font-bold">Gestión de Bases de Datos</h1>
          </div>
          <Button disabled>
            <PlusCircle className="mr-2" />
            Nueva Base de Datos
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Nº de Registros</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {databases.length > 0 ? (
                  databases.map(db => (
                    <TableRow key={db.id}>
                      <TableCell className="font-medium">{db.name}</TableCell>
                      <TableCell>{db.description}</TableCell>
                      <TableCell>{db.itemCount}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={db.path}>
                            Gestionar <ArrowRight className="ml-2" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Aún no hay bases de datos configuradas.
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
