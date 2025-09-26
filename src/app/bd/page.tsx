
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
import { Database, PlusCircle, ArrowRight, ShoppingBag, Percent, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type DatabaseEntry = {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  path: string;
};

const generalDatabasesList: DatabaseEntry[] = [
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
    { id: '19', name: 'Formatos de Expedición', description: 'Define los formatos de empaquetado para producción.', itemCount: 0, path: '/formatos-expedicion' },
];

const entregasDatabasesList: DatabaseEntry[] = [
    { id: '20', name: 'Packs de Venta (Entregas)', description: 'Define los productos compuestos para la vertical de Entregas.', itemCount: 0, path: '/packs-de-venta' },
    { id: '21', name: 'Márgenes por Categoría', description: 'Configura los márgenes de beneficio para el cálculo de PVP.', itemCount: 0, path: '/margenes-categoria' },
];

export default function BdPage() {
  const [generalDatabases, setGeneralDatabases] = useState<DatabaseEntry[]>(generalDatabasesList);
  const [entregasDatabases, setEntregasDatabases] = useState<DatabaseEntry[]>(entregasDatabasesList);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const updateCounts = (dbs: DatabaseEntry[]) => {
        return dbs.map(db => {
            let count = 0;
            if (db.path === '/personal') count = JSON.parse(localStorage.getItem('personal') || '[]').length;
            if (db.path === '/espacios') count = JSON.parse(localStorage.getItem('espacios') || '[]').length;
            if (db.path === '/precios') count = JSON.parse(localStorage.getItem('precios') || '[]').length;
            if (db.path === '/alquiler-db') count = JSON.parse(localStorage.getItem('alquilerDB') || '[]').length;
            if (db.path === '/tipo-servicio') count = JSON.parse(localStorage.getItem('tipoServicio') || '[]').length;
            if (db.path === '/proveedores-transporte') count = JSON.parse(localStorage.getItem('proveedoresTransporte') || '[]').length;
            if (db.path === '/proveedor-hielo') count = JSON.parse(localStorage.getItem('proveedorHielo') || '[]').length;
            if (db.path === '/atipicos-db') count = JSON.parse(localStorage.getItem('atipicosDB') || '[]').length;
            if (db.path === '/decoracion-db') count = JSON.parse(localStorage.getItem('decoracionDB') || '[]').length;
            if (db.path === '/proveedores-personal') count = JSON.parse(localStorage.getItem('proveedoresPersonal') || '[]').length;
            if (db.path === '/book/ingredientes-erp') count = JSON.parse(localStorage.getItem('ingredientesERP') || '[]').length;
            if (db.path === '/menaje-db') count = JSON.parse(localStorage.getItem('menajeDB') || '[]').length;
            if (db.path === '/categorias-recetas') count = JSON.parse(localStorage.getItem('categoriasRecetas') || '[]').length;
            if (db.path === '/tipos-cocina') count = JSON.parse(localStorage.getItem('tiposCocina') || '[]').length;
            if (db.path === '/plantillas-pedidos') count = JSON.parse(localStorage.getItem('pedidoPlantillas') || '[]').length;
            if (db.path === '/contenedores-db') count = JSON.parse(localStorage.getItem('contenedoresDB') || '[]').length;
            if (db.path === '/formatos-expedicion') count = JSON.parse(localStorage.getItem('formatosExpedicionDB') || '[]').length;
            if (db.path === '/packs-de-venta') count = JSON.parse(localStorage.getItem('packsDeVenta') || '[]').length;
            if (db.path === '/margenes-categoria') count = JSON.parse(localStorage.getItem('margenesCategoria') || '[]').length;
            return { ...db, itemCount: count };
        });
    }

    setGeneralDatabases(updateCounts(generalDatabasesList));
    setEntregasDatabases(updateCounts(entregasDatabasesList));
  }, []);

  if (!isMounted) return null;
  
  const renderTable = (dbs: DatabaseEntry[], title: string, icon: React.ReactNode, description?: string) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-3">{icon} {title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Nº de Registros</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dbs.length > 0 ? (
                        dbs.map(db => (
                            <TableRow key={db.id}>
                            <TableCell className="font-medium">{db.name}</TableCell>
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
                            <TableCell colSpan={3} className="h-24 text-center">
                            Aún no hay bases de datos en esta categoría.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
  )

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

        <div className="space-y-8">
            {renderTable(generalDatabases, 'Bases de Datos Generales y de Catering', <Database/>)}
            {renderTable(entregasDatabases, 'Bases de Datos de Entregas', <Package/>, 'Configuraciones específicas para la vertical de Entregas MICE.')}
        </div>
      </main>
    </>
  );
}
