
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useDataStore } from '@/hooks/use-data-store';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Database, ArrowRight, ShoppingBag, Percent, Package, Soup, Users, Truck, Target, FilePlus2, UserPlus, Flower2, Layers, BookHeart, CreditCard, Banknote, Factory, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';



type DatabaseEntry = {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  path: string;
  icon: React.ElementType;
};

const generalDatabasesList: Omit<DatabaseEntry, 'itemCount'>[] = [
  { id: '3', name: 'Artículos MICE', description: 'Gestión de artículos de Almacén, Bodega, Bio y Alquiler.', path: '/bd/articulos', icon: Package },
  { id: '6', name: 'Tipo Servicio (Briefing)', description: 'Gestión de los tipos de servicio para el comercial.', path: '/bd/tipo-servicio', icon: Soup },
  { id: '9', name: 'Atípicos (Conceptos)', description: 'Gestión de conceptos de gastos varios.', path: '/bd/atipicos-db', icon: Percent },
  { id: '10', name: 'Objetivos de Gasto', description: 'Plantillas para el análisis de rentabilidad.', path: '/bd/objetivos-gasto', icon: Target },
  { id: '12', name: 'Decoración (Conceptos)', description: 'Gestión de conceptos de decoración.', path: '/bd/decoracion-db', icon: Flower2 },
  { id: '17', name: 'Plantillas de Pedidos', description: 'Crea y gestiona plantillas para agilizar pedidos.', path: '/bd/plantillas-pedidos', icon: FilePlus2 },
];

const erpDatabasesList: Omit<DatabaseEntry, 'itemCount'>[] = [
  { id: '13', name: 'Base de Datos ERP', description: 'Gestión de precios y productos de proveedores.', path: '/bd/erp', icon: Package },
  { id: '14', name: 'Familias ERP', description: 'Relaciona códigos de familia ERP con Familia y Categoría.', path: '/bd/familiasERP', icon: Layers },
];

const recursosHumanosDatabasesList: Omit<DatabaseEntry, 'itemCount'>[] = [
  { id: '1', name: 'Personal Interno', description: 'Gestión de empleados y contactos de MICE.', path: '/bd/personal', icon: Users },
];

const espaciosDatabasesList: Omit<DatabaseEntry, 'itemCount'>[] = [
  { id: '2', name: 'Espacios', description: 'Gestión de espacios para eventos.', path: '/bd/espacios', icon: ShoppingBag },
];

const entregasDatabasesList: Omit<DatabaseEntry, 'itemCount'>[] = [
  { id: '3a', name: 'Artículos Entregas', description: 'Gestión de artículos para entregas y servicios.', path: '/bd/articulos-entregas', icon: Truck },
];

const bookGastronomicoList: Omit<DatabaseEntry, 'itemCount'>[] = [
  { id: '15', name: 'Categorías de Recetas', description: 'Gestiona las categorías para clasificar las recetas.', path: '/bd/categorias-recetas', icon: BookHeart },
  { id: '19', name: 'Formatos de Expedición', description: 'Define los formatos de empaquetado para producción.', path: '/bd/formatos-expedicion', icon: Package },
  { id: '20', name: 'Ingredientes Internos', description: 'Base de datos de ingredientes internos.', path: '/book/ingredientes', icon: Soup },
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
  const [erpDatabases, setErpDatabases] = useState<DatabaseEntry[]>([]);
  const [recursosHumanosDatabases, setRecursosHumanosDatabases] = useState<DatabaseEntry[]>([]);
  const [espaciosDatabases, setEspaciosDatabases] = useState<DatabaseEntry[]>([]);
  const [bookGastronomicoDBs, setBookGastronomicoDBs] = useState<DatabaseEntry[]>([]);
  const [entregasDatabases, setEntregasDatabases] = useState<DatabaseEntry[]>([]);
  const [providerDatabases, setProviderDatabases] = useState<DatabaseEntry[]>([]);
  const [cprDatabases, setCprDatabases] = useState<DatabaseEntry[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    (async () => {
      await loadAllData();
      setIsInitialLoading(false);
    })();
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
        if (db.path === '/bd/articulos-entregas') count = data.articulos?.filter((a: any) => a.tipoArticulo === 'entregas').length || 0;
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
    setErpDatabases(updateCounts(erpDatabasesList));
    setRecursosHumanosDatabases(updateCounts(recursosHumanosDatabasesList));
    setEspaciosDatabases(updateCounts(espaciosDatabasesList));
    setEntregasDatabases(updateCounts(entregasDatabasesList));
    setBookGastronomicoDBs(updateCounts(bookGastronomicoList));
    setProviderDatabases(updateCounts(providerDatabasesList));
    setCprDatabases(updateCounts(cprDatabasesList));
  }, [isMounted, data]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('bd-compact');
    if (stored) setCompactMode(stored === '1');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('bd-compact', compactMode ? '1' : '0');
  }, [compactMode]);

  if (!isMounted || isInitialLoading) {
    return <LoadingSkeleton title="Cargando Bases de Datos..." />;
  }

  const totalBases =
    generalDatabases.length +
    erpDatabases.length +
    recursosHumanosDatabases.length +
    espaciosDatabases.length +
    bookGastronomicoDBs.length +
    entregasDatabases.length +
    providerDatabases.length +
    cprDatabases.length;

  const totalRegistros = [
    ...generalDatabases,
    ...erpDatabases,
    ...recursosHumanosDatabases,
    ...espaciosDatabases,
    ...bookGastronomicoDBs,
    ...entregasDatabases,
    ...providerDatabases,
    ...cprDatabases,
  ].reduce((acc, db) => acc + (db.itemCount || 0), 0);

  const filterDatabases = (dbs: DatabaseEntry[]): DatabaseEntry[] => {
    if (!searchTerm) return dbs;
    return dbs.filter(db => 
      db.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (db.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );
  };

  const renderTable = (dbs: DatabaseEntry[], title: string, icon: React.ReactNode, description?: string) => {
    const filteredDbs = filterDatabases(dbs);
    
    if (filteredDbs.length === 0 && searchTerm) {
      return null; // Hide card if no results match search
    }

    return (
      <Card className="h-full flex flex-col justify-between border-muted/60">
        <CardHeader className="p-3 pb-1">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="text-muted-foreground">{icon}</span> {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-[11px] mt-0.5 line-clamp-2 leading-snug text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-3 pt-0 flex-1 flex flex-col justify-center">
          <div className="divide-y">
            {filteredDbs.length > 0 ? (
              filteredDbs.map(db => (
                <Link
                  key={db.id}
                  href={db.path}
                  prefetch
                  className="w-full flex items-center justify-between gap-2 py-2 px-1 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-ring transition-colors rounded-md first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <db.icon size={compactMode ? 16 : 18} className="text-muted-foreground flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="font-medium text-sm leading-tight truncate">{db.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{db.itemCount} registro{db.itemCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-muted-foreground flex-shrink-0" />
                </Link>
              ))
            ) : (
              <div className="py-6 text-center">
                <p className="text-xs text-muted-foreground">Aún no hay bases de datos en esta categoría.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="px-2 md:px-4 py-3 md:py-4">
      <div className="mb-4 md:mb-5 sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b border-muted/40 pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{totalBases} bases</span>
            <span className="h-4 w-px bg-border" aria-hidden />
            <span>{totalRegistros} registros totales</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground select-none">
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => setCompactMode(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Modo compacto
            </label>
          </div>
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Input
            placeholder="Buscar bases de datos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-md"
          />
        </div>
      </div>
      <div
        className={`grid ${compactMode ? 'gap-2.5' : 'gap-3 md:gap-4'}`}
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${compactMode ? 260 : 300}px, 1fr))`,
        }}
      >
        {renderTable(erpDatabases, 'Datos ERP', <Database />)}
        {renderTable(recursosHumanosDatabases, 'Recursos Humanos', <Users />)}
        {renderTable(espaciosDatabases, 'Espacios', <MapPin />)}
        {renderTable(generalDatabases, 'Bases de Datos Generales y de Catering', <Database />)}
        {renderTable(bookGastronomicoDBs, 'Book Gastronómico', <BookHeart />, 'Categorías y formatos de recetas')}
        {renderTable(entregasDatabases, 'Entregas', <Truck />, 'Gestión de entregas y artículos asociados')}
        {renderTable(providerDatabases, 'Proveedores', <Users />, 'Gestión centralizada de proveedores')}
        {renderTable(cprDatabases, 'Centro de Producción', <Factory />, 'Parámetros y costes del CPR')}
      </div>
    </div>
  );
}
