'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Database, ArrowRight, ShoppingBag, Percent, Package, Soup, Users, Truck, Target, FilePlus2, UserPlus, Flower2, Layers, BookHeart, CreditCard, Banknote, Factory, MapPin, Search, LayoutGrid, ListFilter, FileText, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type DatabaseEntry = {
  id: string;
  name: string;
  description: string;
  path: string;
  icon: React.ElementType;
  isDestructive?: boolean;
};

const serviceOrdersDatabases: DatabaseEntry[] = [
  { id: 'os-main', name: 'Órdenes de Servicio', description: 'Listado global y eliminación de expedientes.', path: '/bd/os', icon: FileText, isDestructive: true },
  { id: 'os-delete', name: 'Borrado Masivo (Danger Store)', description: 'Utilidad avanzada de limpieza de datos.', path: '/bd/borrar-os', icon: Database, isDestructive: true },
];

const generalDatabases: DatabaseEntry[] = [
  { id: '3', name: 'Artículos MICE', description: 'Gestión de artículos de Almacén, Bodega, Bio y Alquiler.', path: '/bd/articulos', icon: Package },
  { id: '6', name: 'Tipo Servicio (Briefing)', description: 'Gestión de los tipos de servicio para el comercial.', path: '/bd/tipo-servicio', icon: Soup },
  { id: '9', name: 'Atípicos (Conceptos)', description: 'Gestión de conceptos de gastos varios.', path: '/bd/atipicos-db', icon: Percent },
  { id: '10', name: 'Objetivos de Gasto', description: 'Plantillas para el análisis de rentabilidad.', path: '/bd/objetivos-gasto', icon: Target },
  { id: '12', name: 'Decoración (Conceptos)', description: 'Gestión de conceptos de decoración.', path: '/bd/decoracion-db', icon: Flower2 },
  { id: '17', name: 'Plantillas de Pedidos', description: 'Crea y gestiona plantillas para agilizar pedidos.', path: '/bd/plantillas-pedidos', icon: FilePlus2 },
];

const erpDatabases: DatabaseEntry[] = [
  { id: '13', name: 'Base de Datos ERP', description: 'Gestión de precios y productos de proveedores.', path: '/bd/erp', icon: Package },
  { id: '14', name: 'Familias ERP', description: 'Relaciona códigos de familia ERP con Familia y Categoría.', path: '/bd/familiasERP', icon: Layers },
  { id: 'sync-logs', name: 'Logs de Sincronización', description: 'Historial de sincronizaciones con Factusol.', path: '/erp/sync-logs', icon: History },
];

const recursosHumanosDatabases: DatabaseEntry[] = [
  { id: '1', name: 'Personal Interno', description: 'Gestión de empleados y contactos de MICE.', path: '/bd/personal', icon: Users },
];

const espaciosDatabases: DatabaseEntry[] = [
  { id: '2', name: 'Espacios', description: 'Gestión de espacios para eventos.', path: '/bd/espacios', icon: ShoppingBag },
];

const entregasDatabases: DatabaseEntry[] = [
  { id: '3a', name: 'Artículos Entregas', description: 'Gestión de artículos para entregas y servicios.', path: '/bd/articulos-entregas', icon: Truck },
];

const bookGastronomicoDBs: DatabaseEntry[] = [
  { id: '15', name: 'Categorías de Recetas', description: 'Gestiona las categorías para clasificar las recetas.', path: '/bd/categorias-recetas', icon: BookHeart },
  { id: '19', name: 'Formatos de Expedición', description: 'Define los formatos de empaquetado para producción.', path: '/bd/formatos-expedicion', icon: Package },
  { id: '20', name: 'Ingredientes Internos', description: 'Base de datos de ingredientes internos.', path: '/book/ingredientes', icon: Soup },
];

const providerDatabases: DatabaseEntry[] = [
  { id: '25', name: 'Proveedores', description: 'Base de datos central de proveedores.', path: '/bd/proveedores', icon: Users },
  { id: '29', name: 'Tipos de Servicio (Proveedores)', description: 'Asigna tipos de servicio a cada proveedor.', path: '/bd/proveedores-tipos', icon: Users },
  { id: '26', name: 'Catálogo de Personal Externo', description: 'Categorías y precios del personal de ETTs.', path: '/bd/tipos-personal', icon: Users },
  { id: '28', name: 'Personal Externo', description: 'Base de datos de trabajadores de ETTs.', path: '/bd/personal-externo-db', icon: UserPlus },
  { id: '27', name: 'Catálogo de Transporte', description: 'Vehículos y precios de las empresas de transporte.', path: '/bd/tipos-transporte', icon: Truck },
];

const cprDatabases: DatabaseEntry[] = [
  { id: '30', name: 'Costes Fijos CPR', description: 'Define los gastos estructurales mensuales del CPR.', path: '/bd/costes-fijos-cpr', icon: Banknote },
  { id: '31', name: 'Objetivos Mensuales CPR', description: 'Establece los presupuestos para la Cta. de Explotación del CPR.', path: '/bd/objetivos-cpr', icon: CreditCard },
];


export default function BdPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <LoadingSkeleton title="Cargando Bases de Datos..." />;
  }

  const totalBases =
    serviceOrdersDatabases.length +
    generalDatabases.length +
    erpDatabases.length +
    recursosHumanosDatabases.length +
    espaciosDatabases.length +
    bookGastronomicoDBs.length +
    entregasDatabases.length +
    providerDatabases.length +
    cprDatabases.length;

  const normalize = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filterDatabases = (dbs: DatabaseEntry[]): DatabaseEntry[] => {
    if (!searchTerm) return dbs;
    const term = normalize(searchTerm);
    return dbs.filter(db =>
      normalize(db.name).includes(term) ||
      (db.description && normalize(db.description).includes(term))
    );
  };

  const renderTable = (dbs: DatabaseEntry[], title: string, icon: React.ReactNode) => {
    const filteredDbs = filterDatabases(dbs);

    if (filteredDbs.length === 0 && searchTerm) {
      return null;
    }

    return (
      <Card className="bg-card/40 backdrop-blur-md border-border/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-border/10 bg-muted/5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">
              <div className="p-1 rounded-md bg-primary/10 text-primary">
                {icon}
              </div>
              {title}
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 h-5 bg-primary/5 text-primary border-none">
              {filteredDbs.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-2">
          <div className="grid grid-cols-1 gap-1">
            {filteredDbs.length > 0 ? (
              filteredDbs.map(db => (
                <Link
                  key={db.id}
                  href={db.path}
                  className={cn(
                    "group flex items-center justify-between gap-3 p-2.5 rounded-lg transition-all duration-200",
                    db.isDestructive 
                      ? "hover:bg-red-50 text-red-700/80 hover:text-red-700" 
                      : "hover:bg-primary/5 text-foreground hover:text-primary"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "p-1.5 rounded-md transition-colors",
                      db.isDestructive ? "bg-red-100 group-hover:bg-red-200" : "bg-muted group-hover:bg-primary/10"
                    )}>
                      <db.icon size={14} className={cn(
                        db.isDestructive ? "text-red-500" : "text-muted-foreground group-hover:text-primary"
                      )} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs leading-tight">{db.name}</p>
                    </div>
                  </div>
                  <ArrowRight size={12} className="text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              ))
            ) : (
              <div className="py-4 text-center">
                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Sin resultados</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Compact Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Bases de Datos</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary/70 px-1.5 py-0 h-4">
                {totalBases} Módulos
              </Badge>
            </div>
          </div>
        </div>

        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors pointer-events-none" />
          <Input
            placeholder="Buscar base de datos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 bg-card/40 border-border/40 rounded-xl focus:ring-primary/20 focus:border-primary/30 transition-all text-sm"
          />
        </div>
      </div>

      {/* Compact Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {renderTable(serviceOrdersDatabases, 'Órdenes de Servicio', <FileText size={14} />)}
        {renderTable(erpDatabases, 'Datos ERP', <Database size={14} />)}
        {renderTable(recursosHumanosDatabases, 'Recursos Humanos', <Users size={14} />)}
        {renderTable(espaciosDatabases, 'Espacios', <MapPin size={14} />)}
        {renderTable(generalDatabases, 'Generales', <LayoutGrid size={14} />)}
        {renderTable(bookGastronomicoDBs, 'Book Gastronómico', <BookHeart size={14} />)}
        {renderTable(entregasDatabases, 'Entregas', <Truck size={14} />)}
        {renderTable(providerDatabases, 'Proveedores', <ListFilter size={14} />)}
        {renderTable(cprDatabases, 'Centro Producción', <Factory size={14} />)}
      </div>
    </div>
  );
}
