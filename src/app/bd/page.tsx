
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useDataStore } from '@/hooks/use-data-store';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Database, PlusCircle, ArrowRight, ShoppingBag, Percent, Package, Soup, Users, Truck, Target, FilePlus2, UserPlus, Flower2, Layers, BookHeart, CreditCard, Banknote, Factory } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';



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
  { id: '14', name: 'Familias ERP', description: 'Relaciona códigos de familia ERP con Familia y Categoría.', path: '/bd/familiasERP', icon: Layers },
  { id: '17', name: 'Plantillas de Pedidos', description: 'Crea y gestiona plantillas para agilizar pedidos.', path: '/bd/plantillas-pedidos', icon: FilePlus2 },
];

const bookGastronomicoList: Omit<DatabaseEntry, 'itemCount'>[] = [
  { id: '15', name: 'Categorías de Recetas', description: 'Gestiona las categorías para clasificar las recetas.', path: '/bd/categorias-recetas', icon: BookHeart },
  { id: '19', name: 'Formatos de Expedición', description: 'Define los formatos de empaquetado para producción.', path: '/bd/formatos-expedicion', icon: Package },
];

const providerDatabasesList: Omit<DatabaseEntry, 'itemCount'>[] = [
  { id: '25', name: 'Proveedores', description: 'Base de datos central de proveedores.', path: '/bd/proveedores', icon: Users },
  { id: '29', name: 'Tipos de Servicio (Proveedores)', description: 'Asigna tipos de servicio a cada proveedor.', path: '/bd/proveedores-tipos', icon: Users },
  { id: '26', name: 'Catálogo de Personal Externo', description: 'Categorías y precios del personal de ETTs.', path: '/bd/tipos-personal', icon: Users },
  { id: '28', name: 'Personal Externo', description: 'Base de datos de trabajadores de ETTs.', path: '/bd/personal-externo-db', icon: UserPlus },
  { id: '27', name: 'Catálogo de Transporte', description: 'Vehículos y precios de las empresas de transporte.', path: '/bd/tipos-transporte', icon: Truck },
];

const cprDatabasesList: Omit<DatabaseEntry, 'itemCount'>[] = [
  { id: '30', name: 'Costes Fijos CPR', description: 'Define los gastos estructurales mensuales del CPR.', path: '/bd/costes-fijos-cpr', icon: Banknote },
  { id: '31', name: 'Objetivos Mensuales CPR', description: 'Establece los presupuestos para la Cta. de Explotación del CPR.', path: '/bd/objetivos-cpr', icon: CreditCard },
];


export default function BdPage() {
  const { data, loadAllData } = useDataStore();
  const [generalDatabases, setGeneralDatabases] = useState<DatabaseEntry[]>([]);
  const [bookGastronomicoDBs, setBookGastronomicoDBs] = useState<DatabaseEntry[]>([]);
  const [providerDatabases, setProviderDatabases] = useState<DatabaseEntry[]>([]);
  const [cprDatabases, setCprDatabases] = useState<DatabaseEntry[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (!isMounted) return;

    const updateCounts = (dbs: Omit<DatabaseEntry, 'itemCount'>[]) => {
      return dbs.map(db => {
        let count = 0;
        if (db.path === '/bd/personal') count = data.personal?.length || 0;
        if (db.path === '/bd/espacios') count = data.espacios?.length || 0;
        if (db.path === '/bd/articulos') count = data.articulos?.length || 0;
        if (db.path === '/bd/tipo-servicio') count = data.tipoServicio?.length || 0;
        if (db.path === '/bd/atipicos-db') count = data.atipicosDB?.length || 0;
        if (db.path === '/bd/decoracion-db') count = data.decoracionDB?.length || 0;
        if (db.path === '/bd/erp') count = data.ingredientesERP?.length || 0;
        if (db.path === '/bd/familiasERP') count = data.familiasERP?.length || 0;
        if (db.path === '/bd/plantillas-pedidos') count = data.pedidoPlantillas?.length || 0;
        if (db.path === '/bd/formatos-expedicion') count = data.formatosExpedicionDB?.length || 0;
        if (db.path === '/bd/proveedores') count = data.proveedores?.length || 0;
        if (db.path === '/bd/tipos-personal') count = data.tiposPersonal?.length || 0;
        if (db.path === '/bd/personal-externo-db') count = data.personalExternoDB?.length || 0;
        if (db.path === '/bd/tipos-transporte') count = data.tiposTransporte?.length || 0;
        if (db.path === '/bd/objetivos-gasto') count = data.objetivosGastoPlantillas?.length || 0;
        if (db.path === '/bd/categorias-recetas') count = data.categoriasRecetas?.length || 0;
        if (db.path === '/bd/costes-fijos-cpr') count = data.costesFijosCPR?.length || 0;
        if (db.path === '/bd/objetivos-cpr') count = data.objetivosCPR?.length || 0;
        return { ...db, itemCount: count };
      });
    }

    setGeneralDatabases(updateCounts(generalDatabasesList));
    setBookGastronomicoDBs(updateCounts(bookGastronomicoList));
    setProviderDatabases(updateCounts(providerDatabasesList));
    setCprDatabases(updateCounts(cprDatabasesList));
  }, [isMounted, data]);

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
      <div className="py-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8" />
            <h1 className="text-3xl font-headline font-bold">Gestión de Bases de Datos</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {renderTable(generalDatabases, 'Bases de Datos Generales y de Catering', <Database />)}
          <div className="space-y-8">
            {renderTable(bookGastronomicoDBs, 'Bases de datos Book Gastronómico', <BookHeart />, 'Gestión de categorías y formatos para el sistema de recetas.')}
            {renderTable(providerDatabases, 'Bases de Datos de Proveedores', <Users />, 'Gestión centralizada de todos los proveedores y sus catálogos de servicios.')}
            {renderTable(cprDatabases, 'Configuración del CPR', <Factory />, 'Parámetros para la cuenta de explotación del Centro de Producción.')}
          </div>
        </div>
      </div>
    </>
  );
}
