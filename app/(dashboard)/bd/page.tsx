'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  usePersonal,
  useEspacios,
  useArticulos,
  useTiposServicio,
  useArticulosERP,
  useFamiliasERP,
  usePlantillasPedidos,
  useFormatosExpedicion,
  useProveedores,
  useTiposPersonal,
  usePersonalExternoDB,
  useTiposTransporte,
  useObjetivosGastoPlantillas,
  useCategoriasRecetas,
  useCostesFijosCPR,
  useObjetivosCPR,
  useDecoracionCatalogo,
  useEventos
} from '@/hooks/use-data-queries';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Database, ArrowRight, ShoppingBag, Percent, Package, Soup, Users, Truck, Target, FilePlus2, UserPlus, Flower2, Layers, BookHeart, CreditCard, Banknote, Factory, MapPin, Search, LayoutGrid, ListFilter, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type DatabaseEntry = {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  path: string;
  icon: React.ElementType;
  isDestructive?: boolean;
};

const serviceOrdersDatabasesList: Omit<DatabaseEntry, 'itemCount'>[] = [
  { id: 'os-main', name: 'Órdenes de Servicio', description: 'Listado global y eliminación de expedientes.', path: '/bd/os', icon: FileText, isDestructive: true },
  { id: 'os-delete', name: 'Borrado Masivo (Danger Store)', description: 'Utilidad avanzada de limpieza de datos.', path: '/bd/borrar-os', icon: Database, isDestructive: true },
];

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
  const { data: personal, isLoading: isLoadingPersonal } = usePersonal();
  const { data: espacios, isLoading: isLoadingEspacios } = useEspacios();
  const { data: articulos, isLoading: isLoadingArticulos } = useArticulos();
  const { data: tipoServicio, isLoading: isLoadingTiposServicio } = useTiposServicio();
  const { data: ingredientesERP, isLoading: isLoadingERP } = useArticulosERP();
  const { data: familiasERP, isLoading: isLoadingFamilias } = useFamiliasERP();
  const { data: pedidoPlantillas, isLoading: isLoadingPlantillas } = usePlantillasPedidos();
  const { data: formatosExpedicionDB, isLoading: isLoadingFormatos } = useFormatosExpedicion();
  const { data: proveedores, isLoading: isLoadingProveedores } = useProveedores();
  const { data: tiposPersonal, isLoading: isLoadingTiposPersonal } = useTiposPersonal();
  const { data: personalExternoDB, isLoading: isLoadingPersonalExterno } = usePersonalExternoDB();
  const { data: tiposTransporte, isLoading: isLoadingTransporte } = useTiposTransporte();
  const { data: objetivosGastoPlantillas, isLoading: isLoadingObjetivosGasto } = useObjetivosGastoPlantillas();
  const { data: categoriasRecetas, isLoading: isLoadingCategorias } = useCategoriasRecetas();
  const { data: costesFijosCPR, isLoading: isLoadingCostesFijos } = useCostesFijosCPR();
  const { data: objetivosCPR, isLoading: isLoadingObjetivosCPR } = useObjetivosCPR();
  const { data: decoracionCatalogo, isLoading: isLoadingDecoracion } = useDecoracionCatalogo();
  const { data: eventos, isLoading: isLoadingEventos } = useEventos();

  // Atípicos query (local to this page since it's not in use-data-queries yet)
  const { data: atipicosCatalogo, isLoading: isLoadingAtipicos } = useQuery({
    queryKey: ['atipicosCatalogo'],
    queryFn: async () => {
      const { data, error } = await supabase.from('atipicos_catalogo').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const updateCounts = useCallback((dbs: Omit<DatabaseEntry, 'itemCount'>[]) => {
    return dbs.map(db => {
      let count = 0;
      if (db.path === '/bd/os') count = (eventos || []).length;
      if (db.path === '/bd/borrar-os') count = (eventos || []).length;
      if (db.path === '/bd/personal') count = (personal || []).length;
      if (db.path === '/bd/espacios') count = (espacios || []).length;
      if (db.path === '/bd/articulos') count = (articulos || []).filter((a: any) => a.tipoArticulo === 'micecatering').length;
      if (db.path === '/bd/tipo-servicio') count = (tipoServicio || []).length;
      if (db.path === '/bd/atipicos-db') count = (atipicosCatalogo || []).length;
      if (db.path === '/bd/decoracion-db') count = (decoracionCatalogo || []).length;
      if (db.path === '/bd/articulos-entregas') count = (articulos || []).filter((a: any) => a.tipoArticulo === 'entregas').length;
      if (db.path === '/bd/erp') count = (ingredientesERP || []).length;
      if (db.path === '/bd/familiasERP') count = (familiasERP || []).length;
      if (db.path === '/bd/plantillas-pedidos') count = (pedidoPlantillas || []).length;
      if (db.path === '/bd/formatos-expedicion') count = (formatosExpedicionDB || []).length;
      if (db.path === '/bd/proveedores') count = (proveedores || []).length;
      if (db.path === '/bd/tipos-personal') count = (tiposPersonal || []).length;
      if (db.path === '/bd/personal-externo-db') count = (personalExternoDB || []).length;
      if (db.path === '/bd/tipos-transporte') count = (tiposTransporte || []).length;
      if (db.path === '/bd/objetivos-gasto') count = (objetivosGastoPlantillas || []).length;
      if (db.path === '/bd/categorias-recetas') count = (categoriasRecetas || []).length;
      if (db.path === '/bd/costes-fijos-cpr') count = (costesFijosCPR || []).length;
      if (db.path === '/bd/objetivos-cpr') count = (objetivosCPR || []).length;
      return { ...db, itemCount: count };
    });
  }, [personal, espacios, articulos, tipoServicio, atipicosCatalogo, decoracionCatalogo, ingredientesERP, familiasERP, pedidoPlantillas, formatosExpedicionDB, proveedores, tiposPersonal, personalExternoDB, tiposTransporte, objetivosGastoPlantillas, categoriasRecetas, costesFijosCPR, objetivosCPR, eventos]);

  const serviceOrdersDatabases = useMemo(() => updateCounts(serviceOrdersDatabasesList), [updateCounts]);
  const generalDatabases = useMemo(() => updateCounts(generalDatabasesList), [updateCounts]);
  const erpDatabases = useMemo(() => updateCounts(erpDatabasesList), [updateCounts]);
  const recursosHumanosDatabases = useMemo(() => updateCounts(recursosHumanosDatabasesList), [updateCounts]);
  const espaciosDatabases = useMemo(() => updateCounts(espaciosDatabasesList), [updateCounts]);
  const bookGastronomicoDBs = useMemo(() => updateCounts(bookGastronomicoList), [updateCounts]);
  const entregasDatabases = useMemo(() => updateCounts(entregasDatabasesList), [updateCounts]);
  const providerDatabases = useMemo(() => updateCounts(providerDatabasesList), [updateCounts]);
  const cprDatabases = useMemo(() => updateCounts(cprDatabasesList), [updateCounts]);

  const isInitialLoading = isLoadingPersonal || isLoadingEspacios || isLoadingArticulos || isLoadingTiposServicio || isLoadingERP || isLoadingFamilias || isLoadingPlantillas || isLoadingFormatos || isLoadingProveedores || isLoadingTiposPersonal || isLoadingPersonalExterno || isLoadingTransporte || isLoadingCategorias || isLoadingCostesFijos || isLoadingObjetivosCPR || isLoadingAtipicos || isLoadingDecoracion || isLoadingEventos;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || isInitialLoading) {
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

  const totalRegistros = [
    ...serviceOrdersDatabases,
    ...generalDatabases,
    ...erpDatabases,
    ...recursosHumanosDatabases,
    ...espaciosDatabases,
    ...bookGastronomicoDBs,
    ...entregasDatabases,
    ...providerDatabases,
    ...cprDatabases,
  ].reduce((acc, db) => acc + (db.itemCount || 0), 0);

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

  const renderTable = (dbs: DatabaseEntry[], title: string, icon: React.ReactNode, description?: string) => {
    const filteredDbs = filterDatabases(dbs);

    if (filteredDbs.length === 0 && searchTerm) {
      return null;
    }

    return (
      <Card className="group h-full flex flex-col bg-card/60 backdrop-blur-md border-border/40 shadow-xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="p-6 pb-4 space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm">
                {icon}
              </div>
              {title}
            </CardTitle>
            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-bold px-2.5 py-0.5 rounded-lg">
              {filteredDbs.length}
            </Badge>
          </div>
          {description && (
            <CardDescription className="text-xs font-medium text-muted-foreground/70 line-clamp-1 pl-1">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-6 pt-0 flex-1">
          <div className="space-y-2.5">
            {filteredDbs.length > 0 ? (
              filteredDbs.map(db => (
                <Link
                  key={db.id}
                  href={db.path}
                  className="group/item flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-background/40 border border-border/40 hover:bg-primary/5 hover:border-primary/20 hover:shadow-md transition-all duration-300 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={cn(
                      "p-2.5 rounded-xl transition-all duration-300",
                      db.isDestructive ? "bg-red-100/50 group-hover/item:bg-red-200/50" : "bg-muted/50 group-hover/item:bg-primary/10"
                    )}>
                      <db.icon size={18} className={cn(
                        "transition-colors",
                        db.isDestructive ? "text-red-500 group-hover/item:text-red-600" : "text-muted-foreground group-hover/item:text-primary"
                      )} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn(
                        "font-bold text-sm tracking-tight truncate transition-colors",
                        db.isDestructive ? "text-red-700/80 group-hover/item:text-red-700" : "group-hover/item:text-primary"
                      )}>{db.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={cn("h-1 w-1 rounded-full", db.isDestructive ? "bg-red-400" : "bg-primary/40")} />
                        <p className="text-[11px] font-bold text-muted-foreground/60 truncate uppercase tracking-wider">
                          {db.itemCount.toLocaleString()} registro{db.itemCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-1.5 rounded-full bg-muted/30 group-hover/item:bg-primary/10 transition-colors">
                    <ArrowRight size={14} className="text-muted-foreground/40 group-hover/item:text-primary group-hover/item:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-xs font-bold text-muted-foreground/40 italic uppercase tracking-widest">Sin resultados</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/40 p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-5">
              <div className="p-4 rounded-[2rem] bg-primary/10 text-primary shadow-inner group hover:scale-110 transition-transform duration-500">
                <Database className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">Sistema Central</span>
                  <div className="h-1 w-1 rounded-full bg-primary/40" />
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">v2.5</span>
                </div>
                <h1 className="text-4xl font-black tracking-tighter text-foreground">Bases de Datos</h1>
                <p className="text-base font-medium text-muted-foreground/70 mt-1">Gestión centralizada y auditoría de activos del sistema</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="px-6 py-4 rounded-[2rem] bg-background/60 border border-border/40 backdrop-blur-sm shadow-xl hover:shadow-primary/5 transition-all duration-500 group">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1 group-hover:text-primary transition-colors">Total Bases</p>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-black text-primary tracking-tighter">{totalBases}</p>
                <span className="text-xs font-bold text-muted-foreground/40">módulos</span>
              </div>
            </div>
            <div className="px-6 py-4 rounded-[2rem] bg-background/60 border border-border/40 backdrop-blur-sm shadow-xl hover:shadow-primary/5 transition-all duration-500 group">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1 group-hover:text-primary transition-colors">Registros Totales</p>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-black text-primary tracking-tighter">{totalRegistros.toLocaleString()}</p>
                <span className="text-xs font-bold text-muted-foreground/40">items</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 relative max-w-3xl group">
          <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors pointer-events-none" />
          <Input
            placeholder="Buscar en todas las bases de datos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-14 h-14 bg-background/40 border-border/40 rounded-[1.25rem] focus:ring-primary/20 focus:border-primary/30 transition-all text-base font-medium shadow-inner"
          />
        </div>
      </div>

      {/* Bento Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {renderTable(serviceOrdersDatabases, 'Órdenes de Servicio', <FileText className="h-5 w-5" />, 'Expedientes y Datos Maestros')}
        {renderTable(erpDatabases, 'Datos ERP', <Database className="h-5 w-5" />, 'Sincronización con el sistema central')}
        {renderTable(recursosHumanosDatabases, 'Recursos Humanos', <Users className="h-5 w-5" />, 'Gestión de personal y contactos')}
        {renderTable(espaciosDatabases, 'Espacios', <MapPin className="h-5 w-5" />, 'Catálogo de venues y salas')}
        {renderTable(generalDatabases, 'Generales', <LayoutGrid className="h-5 w-5" />, 'Configuraciones maestras de catering')}
        {renderTable(bookGastronomicoDBs, 'Book Gastronómico', <BookHeart className="h-5 w-5" />, 'Recetas, categorías y formatos')}
        {renderTable(entregasDatabases, 'Entregas', <Truck className="h-5 w-5" />, 'Logística y artículos de servicio')}
        {renderTable(providerDatabases, 'Proveedores', <ListFilter className="h-5 w-5" />, 'Gestión de compras y servicios externos')}
        {renderTable(cprDatabases, 'Centro Producción', <Factory className="h-5 w-5" />, 'Costes y objetivos del CPR')}
      </div>
    </div>
  );
}
