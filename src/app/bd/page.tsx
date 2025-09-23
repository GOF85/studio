
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
import { Database, PlusCircle, ArrowRight, Users, UserPlus, GlassWater, BookText, FilePlus2, Package as PackageIcon } from 'lucide-react';

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
    { id: '5', name: 'Alquiler', description: 'Gestión de artículos de alquiler a proveedores.', itemCount: 0, path: '/alquiler-db' },
    { id: '6', name: 'Tipo Servicio', description: 'Gestión de los tipos de servicio.', itemCount: 0, path: '/tipo-servicio' },
    { id: '7', name: 'Proveedores de Transporte', description: 'Gestión de proveedores de transporte.', itemCount: 0, path: '/proveedores-transporte' },
    { id: '8', name: 'Proveedores de Hielo', description: 'Gestión de proveedores de hielo.', itemCount: 0, path: '/proveedor-hielo' },
    { id: '9', name: 'Atípicos (Gastos Varios)', description: 'Gestión de conceptos de gastos varios.', itemCount: 0, path: '/atipicos-db' },
    { id: '12', name: 'Decoración (Gastos Varios)', description: 'Gestión de conceptos de decoración.', itemCount: 0, path: '/decoracion-db' },
    { id: '11', name: 'Proveedores de Personal', description: 'Gestión de proveedores de personal externo.', itemCount: 0, path: '/proveedores-personal' },
    { id: '13', name: 'Book: Materia Prima (ERP)', description: 'Gestión de precios y productos de proveedores.', itemCount: 0, path: '/book/ingredientes-erp' },
    { id: '14', name: 'Book: Menaje', description: 'Gestión del menaje para los emplatados.', itemCount: 0, path: '/menaje-db' },
    { id: '15', name: 'Book: Categorías de Recetas', description: 'Gestión de las categorías para las recetas del book.', itemCount: 0, path: '/categorias-recetas' },
    { id: '16', name: 'Book: Tipos de Cocina', description: 'Gestión de los tipos de cocina/origen para las recetas.', itemCount: 0, path: '/tipos-cocina' },
    { id: '17', name: 'Plantillas de Pedidos', description: 'Crea y gestiona plantillas para agilizar pedidos.', itemCount: 0, path: '/plantillas-pedidos' },
    { id: '18', name: 'Contenedores Isotérmicos', description: 'Gestión de los contenedores para logística.', itemCount: 0, path: '/contenedores-db' },
  ]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const personal = JSON.parse(localStorage.getItem('personal') || '[]').length;
    const espacios = JSON.parse(localStorage.getItem('espacios') || '[]').length;
    const precios = JSON.parse(localStorage.getItem('precios') || '[]').length;
    const alquiler = JSON.parse(localStorage.getItem('alquilerDB') || '[]').length;
    const tipoServicio = JSON.parse(localStorage.getItem('tipoServicio') || '[]').length;
    const proveedoresTransporte = JSON.parse(localStorage.getItem('proveedoresTransporte') || '[]').length;
    const proveedorHielo = JSON.parse(localStorage.getItem('proveedorHielo') || '[]').length;
    const atipicos = JSON.parse(localStorage.getItem('atipicosDB') || '[]').length;
    const decoracion = JSON.parse(localStorage.getItem('decoracionDB') || '[]').length;
    const proveedoresPersonal = JSON.parse(localStorage.getItem('proveedoresPersonal') || '[]').length;
    const ingredientesERP = JSON.parse(localStorage.getItem('ingredientesERP') || '[]').length;
    const menajeDB = JSON.parse(localStorage.getItem('menajeDB') || '[]').length;
    const categoriasRecetas = JSON.parse(localStorage.getItem('categoriasRecetas') || '[]').length;
    const tiposCocina = JSON.parse(localStorage.getItem('tiposCocina') || '[]').length;
    const pedidoPlantillas = JSON.parse(localStorage.getItem('pedidoPlantillas') || '[]').length;
    const contenedores = JSON.parse(localStorage.getItem('contenedoresDB') || '[]').length;
    
    setDatabases(prev => prev.map(db => {
      if (db.id === '1') return { ...db, itemCount: personal };
      if (db.id === '2') return { ...db, itemCount: espacios };
      if (db.id === '3') return { ...db, itemCount: precios };
      if (db.id === '5') return { ...db, itemCount: alquiler };
      if (db.id === '6') return { ...db, itemCount: tipoServicio };
      if (db.id === '7') return { ...db, itemCount: proveedoresTransporte };
      if (db.id === '8') return { ...db, itemCount: proveedorHielo };
      if (db.id === '9') return { ...db, itemCount: atipicos };
      if (db.id === '12') return { ...db, itemCount: decoracion };
      if (db.id === '11') return { ...db, itemCount: proveedoresPersonal };
      if (db.id === '13') return { ...db, itemCount: ingredientesERP };
      if (db.id === '14') return { ...db, itemCount: menajeDB };
      if (db.id === '15') return { ...db, itemCount: categoriasRecetas };
      if (db.id === '16') return { ...db, itemCount: tiposCocina };
      if (db.id === '17') return { ...db, itemCount: pedidoPlantillas };
      if (db.id === '18') return { ...db, itemCount: contenedores };
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
