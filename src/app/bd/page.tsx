

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Database, PlusCircle, ArrowRight, ShoppingBag, Percent, Package, Soup, Users, Truck, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


type DatabaseEntry = {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  path: string;
};

const generalDatabasesList: DatabaseEntry[] = [
    { id: '1', name: 'Personal Interno', description: 'Gestión de empleados y contactos de MICE.', itemCount: 0, path: '/personal' },
    { id: '2', name: 'Espacios', description: 'Gestión de espacios para eventos.', itemCount: 0, path: '/espacios' },
    { id: '3', name: 'Artículos MICE', description: 'Gestión de artículos de Almacén, Bodega, Bio y Alquiler.', itemCount: 0, path: '/articulos' },
    { id: '6', name: 'Tipo Servicio (Briefing)', description: 'Gestión de los tipos de servicio para el comercial.', itemCount: 0, path: '/tipo-servicio' },
    { id: '9', name: 'Atípicos (Conceptos)', description: 'Gestión de conceptos de gastos varios.', itemCount: 0, path: '/atipicos-db' },
    { id: '12', name: 'Decoración (Conceptos)', description: 'Gestión de conceptos de decoración.', itemCount: 0, path: '/decoracion-db' },
    { id: '13', name: 'Book: Materia Prima (ERP)', description: 'Gestión de precios y productos de proveedores.', itemCount: 0, path: '/book/ingredientes-erp' },
    { id: '17', name: 'Plantillas de Pedidos', description: 'Crea y gestiona plantillas para agilizar pedidos.', itemCount: 0, path: '/plantillas-pedidos' },
    { id: '19', name: 'Formatos de Expedición', description: 'Define los formatos de empaquetado para producción.', itemCount: 0, path: '/formatos-expedicion' },
];

const providerDatabasesList: DatabaseEntry[] = [
    { id: '25', name: 'Proveedores', description: 'Base de datos central de proveedores.', itemCount: 0, path: '/proveedores' },
    { id: '26', name: 'Catálogo de Personal Externo', description: 'Categorías y precios del personal de ETTs.', itemCount: 0, path: '/tipos-personal' },
    { id: '27', name: 'Catálogo de Transporte', description: 'Vehículos y precios de las empresas de transporte.', itemCount: 0, path: '/tipos-transporte' },
];


export default function BdPage() {
  const [generalDatabases, setGeneralDatabases] = useState<DatabaseEntry[]>(generalDatabasesList);
  const [providerDatabases, setProviderDatabases] = useState<DatabaseEntry[]>(providerDatabasesList);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const countItems = (key: string) => JSON.parse(localStorage.getItem(key) || '[]').length;
    
    const updateCounts = (dbs: DatabaseEntry[]) => {
        return dbs.map(db => {
            let count = 0;
            if (db.path === '/personal') count = countItems('personal');
            if (db.path === '/espacios') count = countItems('espacios');
            if (db.path === '/articulos') count = countItems('articulos');
            if (db.path === '/tipo-servicio') count = countItems('tipoServicio');
            if (db.path === '/atipicos-db') count = countItems('atipicosDB');
            if (db.path === '/decoracion-db') count = countItems('decoracionDB');
            if (db.path === '/book/ingredientes-erp') count = countItems('ingredientesERP');
            if (db.path === '/plantillas-pedidos') count = countItems('pedidoPlantillas');
            if (db.path === '/formatos-expedicion') count = countItems('formatosExpedicionDB');
            if (db.path === '/proveedores') count = countItems('proveedores');
            if (db.path === '/tipos-personal') count = countItems('tiposPersonal');
            if (db.path === '/tipos-transporte') count = countItems('tiposTransporte');
            return { ...db, itemCount: count };
        });
    }

    setGeneralDatabases(updateCounts(generalDatabasesList));
    setProviderDatabases(updateCounts(providerDatabasesList));
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
                        <TableHead className="p-2">Nombre</TableHead>
                        <TableHead className="p-2">Nº Registros</TableHead>
                        <TableHead className="text-right p-2">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dbs.length > 0 ? (
                        dbs.map(db => (
                            <TableRow key={db.id}>
                            <TableCell className="font-medium p-2">{db.name}</TableCell>
                            <TableCell className="p-2">{db.itemCount}</TableCell>
                            <TableCell className="text-right p-2">
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

        <div className="grid md:grid-cols-2 gap-8">
            {renderTable(generalDatabases, 'Bases de Datos Generales y de Catering', <Database/>)}
            {renderTable(providerDatabases, 'Bases de Datos de Proveedores', <Users/>, 'Gestión centralizada de todos los proveedores y sus catálogos de servicios.')}
        </div>

        <div className="mt-12">
            <Accordion type="single" collapsible>
                <AccordionItem value="danger-zone">
                    <Card className="border-destructive bg-destructive/5">
                        <AccordionTrigger className="p-4 text-destructive hover:no-underline">
                           <div className="flex items-center gap-3">
                             <AlertTriangle/>
                             <CardTitle className="text-destructive">Administración / Zona de Peligro</CardTitle>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <CardContent>
                                <CardDescription className="text-destructive/80 mb-4">
                                    Acciones irreversibles como la eliminación masiva de datos. Procede con extrema precaución.
                                </CardDescription>
                                <Button asChild variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive">
                                  <Link href="/bd/borrar">Borrar Bases de Datos Maestras <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                </Button>
                           </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            </Accordion>
        </div>

      </main>
    </>
  );
}
