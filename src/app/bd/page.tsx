'use client';

import { useState } from 'react';
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
import { Database, PlusCircle, ArrowRight } from 'lucide-react';

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
  ]);

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
