
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
import { Database, PlusCircle, ArrowRight, ShoppingBag, Percent, Package, Soup, Users, Truck, AlertTriangle, Target, FilePlus2, UserPlus, Flower2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


type DatabaseEntry = {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  path: string;
  icon: React.ElementType;
};

const generalDatabasesList: Omit<DatabaseEntry, 'itemCount'>[] = [
    { id: '1', name: 'Personal Interno', description: 'Gestión de empleados y contactos de MICE.', path: '/bd/personal', icon: Users },
    { id: '2', name: 'Espacios', description: 'Gestión de espacios para eventos.', path: '/bd/espacios', icon: ShoppingBag },
    { id: '3', name: 'Artículos MICE', description: 'Gestión de artículos de Almacén, Bodega, Bio y Alquiler.', path: '/bd/articulos', icon: Package },
    { id: '6', name: 'Tipo Servicio (Briefing)', description: 'Gestión de los tipos de servicio para el comercial.', path: '/bd/tipo-servicio', icon: Soup },
    { id: '9', name: 'Atípicos (Conceptos)', description: 'Gestión de conceptos de gastos varios.', path: '/bd/atipicos-db', icon: Percent },
    { id: '10', name: 'Objetivos de Gasto', description: 'Plantillas para el análisis de rentabilidad.', path: '/bd/objetivos-gasto', icon: Target },
    { id: '12', name: 'Decoración (Conceptos)', description: 'Gestión de conceptos de decoración.', path: '/bd/decoracion-db', icon: Flower2 },
    { id: '13', name: 'Base de Datos ERP', description: 'Gestión de precios y productos de proveedores.', path: '/bd/erp', icon: Package },
    { id: '17', name: 'Plantillas de Pedidos', description: 'Crea y gestiona plantillas para agilizar pedidos.', path: '/bd/plantillas-pedidos', icon: FilePlus2 },
    { id: '19', name: 'Formatos de Expedición', description: 'Define los formatos de empaquetado para producción.', path: '/bd/formatos-expedicion', icon: Package },
];

const providerDatabasesList: Omit<DatabaseEntry, 'itemCount'>[] = [
    { id: '25', name: 'Proveedores', description: 'Base de datos central de proveedores.', path: '/bd/proveedores', icon: Users },
    { id: '26', name: 'Catálogo de Personal Externo', description: 'Categorías y precios del personal de ETTs.', path: '/bd/tipos-personal', icon: Users },
    { id: '28', name: 'Personal Externo', description: 'Base de datos de trabajadores de ETTs.', path: '/bd/personal-externo-db', icon: UserPlus },
    { id: '27', name: 'Catálogo de Transporte', description: 'Vehículos y precios de las empresas de transporte.', path: '/bd/tipos-transporte', icon: Truck },
];


export default function BdPage() {
  const [generalDatabases, setGeneralDatabases] = useState<DatabaseEntry[]>([]);
  const [providerDatabases, setProviderDatabases] = useState<DatabaseEntry[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const countItems = (key: string) => {
        try {
          return (JSON.parse(localStorage.getItem(key) || '[]')).length;
        } catch (e) {
          console.error(`Error parsing localStorage key ${key}:`, e);
          return 0;
        }
    };
    
    const updateCounts = (dbs: Omit<DatabaseEntry, 'itemCount'>[]) => {
        return dbs.map(db => {
            let count = 0;
            if (db.path === '/bd/personal') count = countItems('personal');
            if (db.path === '/bd/espacios') count = countItems('espacios');
            if (db.path === '/bd/articulos') count = countItems('articulos');
            if (db.path === '/bd/tipo-servicio') count = countItems('tipoServicio');
            if (db.path === '/bd/atipicos-db') count = countItems('atipicosDB');
            if (db.path === '/bd/decoracion-db') count = countItems('decoracionDB');
            if (db.path === '/bd/erp') count = countItems('articulosERP');
            if (db.path === '/bd/plantillas-pedidos') count = countItems('pedidoPlantillas');
            if (db.path === '/bd/formatos-expedicion') count = countItems('formatosExpedicionDB');
            if (db.path === '/bd/proveedores') count = countItems('proveedores');
            if (db.path === '/bd/tipos-personal') count = countItems('tiposPersonal');
            if (db.path === '/bd/personal-externo-db') count = countItems('personalExternoDB');
            if (db.path === '/bd/tipos-transporte') count = countItems('tiposTransporte');
            if (db.path === '/bd/objetivos-gasto') count = countItems('objetivosGastoPlantillas');
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
                            <TableCell className="font-medium p-2 flex items-center gap-2"><db.icon size={16} />{db.name}</TableCell>
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
