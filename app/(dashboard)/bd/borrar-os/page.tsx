

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Trash2, ShieldAlert, AlertTriangle, Search, CheckCircle2, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

type DataSet = {
  key: string;
  table: string;
  name: string;
  description: string;
  idField?: string;
  labelField?: string;
};

const EVENT_DATA: DataSet[] = [
    { key: 'serviceOrders', table: 'eventos', name: 'Órdenes de Servicio (Catering)', description: 'Elimina todos los eventos de catering.', idField: 'id', labelField: 'numero_expediente' },
    { key: 'entregas', table: 'entregas', name: 'Pedidos de Entrega', description: 'Elimina todos los pedidos de la vertical de Entregas.', idField: 'id', labelField: 'numero_pedido' },
];

const RELATED_DATA: DataSet[] = [
    { key: 'comercialBriefings', table: 'comercial_briefings', name: 'Briefings Comerciales', description: 'Hitos, servicios y detalles de cada evento.', idField: 'id', labelField: 'os_id' },
    { key: 'comercialAjustes', table: 'comercial_ajustes', name: 'Ajustes Comerciales', description: 'Gastos extra y ajustes de facturación.', idField: 'id', labelField: 'concepto' },
    { key: 'gastronomyOrders', table: 'gastronomia_orders', name: 'Pedidos de Gastronomía', description: 'Pedidos de cocina para cada hito.', idField: 'id', labelField: 'os_id' },
    { key: 'materialOrders', table: 'material_orders', name: 'Pedidos de Material', description: 'Pedidos de Almacén, Bodega, Bio y Alquiler.', idField: 'id', labelField: 'os_id' },
    { key: 'transporteOrders', table: 'pedidos_transporte', name: 'Pedidos de Transporte', description: 'Todos los servicios de transporte asignados.', idField: 'id', labelField: 'os_id' },
    { key: 'hieloOrders', table: 'pedidos_hielo', name: 'Pedidos de Hielo', description: 'Todos los pedidos de hielo.', idField: 'id', labelField: 'os_id' },
    { key: 'decoracionOrders', table: 'pedidos_decoracion', name: 'Pedidos de Decoración', description: 'Gastos de decoración asociados a eventos.', idField: 'id', labelField: 'concepto' },
    { key: 'atipicoOrders', table: 'atipico_orders', name: 'Pedidos Atípicos', description: 'Gastos varios asociados a eventos.', idField: 'id', labelField: 'concepto' },
    { key: 'pruebasMenu', table: 'pruebas_menu', name: 'Pruebas de Menú', description: 'Toda la información de las pruebas de menú.', idField: 'id', labelField: 'os_id' },
    { key: 'pickingSheets', table: 'hojas_picking', name: 'Hojas de Picking (Almacén)', description: 'Todo el progreso de picking de material.', idField: 'id', labelField: 'os_id' },
    { key: 'returnSheets', table: 'hojas_retorno', name: 'Hojas de Retorno (Almacén)', description: 'Todo el progreso de gestión de retornos.', idField: 'id', labelField: 'os_id' },
    { key: 'materialItems', table: 'pedidos_material', name: 'Líneas de Pedido de Material', description: 'Artículos individuales de pedidos de material.', idField: 'id', labelField: 'nombre_articulo' },
    { key: 'personalMice', table: 'personal_mice_asignaciones', name: 'Personal MICE', description: 'Asignaciones de personal para eventos MICE.', idField: 'id', labelField: 'personal_id' },
    { key: 'personalExterno', table: 'personal_externo_eventos', name: 'Personal Externo', description: 'Asignaciones de personal externo a eventos.', idField: 'id', labelField: 'evento_id' },
    { key: 'personalExternoAjustes', table: 'personal_externo_ajustes', name: 'Ajustes de Personal Externo', description: 'Gastos extra y ajustes de personal externo.', idField: 'id', labelField: 'concepto' },
    { key: 'personalEntrega', table: 'personal_entrega', name: 'Personal de Entregas', description: 'Asignaciones de personal para la vertical de Entregas.', idField: 'id', labelField: 'entrega_id' },
    { key: 'pedidosEntrega', table: 'pedidos_entrega', name: 'Líneas de Pedido de Entrega', description: 'Artículos individuales de pedidos de entrega.', idField: 'id', labelField: 'nombre_articulo' },
    { key: 'ctaRealCosts', table: 'cta_real_costs', name: 'Costes Reales CTA', description: 'Datos de costes reales para la cuenta de explotación.', idField: 'id', labelField: 'os_id' },
    { key: 'ctaComentarios', table: 'cta_comentarios', name: 'Comentarios CTA', description: 'Comentarios y análisis de la cuenta de explotación.', idField: 'id', labelField: 'os_id' },
    { key: 'ordenesFabricacion', table: 'cpr_ordenes_fabricacion', name: 'Órdenes de Fabricación (CPR)', description: 'Todos los lotes de producción.', idField: 'id', labelField: 'id' },
    { key: 'stockElaboraciones', table: 'cpr_stock_elaboraciones', name: 'Stock de Elaboraciones', description: 'Inventario de elaboraciones producidas por CPR.', idField: 'elaboracion_id', labelField: 'elaboracion_id' },
    { key: 'pickingStates', table: 'cpr_picking_states', name: 'Picking de Gastronomía (CPR)', description: 'Toda la logística de picking de comida.', idField: 'id', labelField: 'os_id' },
    { key: 'solicitudesPersonal', table: 'cpr_solicitudes_personal', name: 'Solicitudes de Personal (CPR)', description: 'Peticiones de personal para producción.', idField: 'id', labelField: 'id' },
    { key: 'cesionesPersonal', table: 'cpr_cesiones_personal', name: 'Cesiones de Personal (CPR)', description: 'Personal cedido entre partidas.', idField: 'id', labelField: 'id' },
    { key: 'mermas', table: 'os_mermas', name: 'Mermas de Material', description: 'Registros de material perdido o roto.', idField: 'id', labelField: 'os_id' },
    { key: 'devoluciones', table: 'os_devoluciones', name: 'Devoluciones de Material', description: 'Registros de material devuelto.', idField: 'id', labelField: 'os_id' },
    { key: 'activityLogs', table: 'activity_logs', name: 'Registro de Actividad de Portales', description: 'Log de acciones de usuarios externos.', idField: 'id', labelField: 'accion' },
];

const MASTER_DATA: DataSet[] = [
    { key: 'recetas', table: 'recetas', name: 'Recetario', description: 'Todas las recetas del sistema.', idField: 'id', labelField: 'nombre' },
    { key: 'elaboraciones', table: 'elaboraciones', name: 'Elaboraciones', description: 'Sub-recetas y componentes base.', idField: 'id', labelField: 'nombre' },
    { key: 'articulosErp', table: 'articulos_erp', name: 'Artículos ERP', description: 'Catálogo de productos sincronizados del ERP.', idField: 'id', labelField: 'nombre' },
    { key: 'ingredientesInternos', table: 'ingredientes_internos', name: 'Ingredientes Internos', description: 'Mapeo de ingredientes para escandallos.', idField: 'id', labelField: 'nombre_ingrediente' },
    { key: 'personal', table: 'personal', name: 'Plantilla de Personal', description: 'Base de datos de trabajadores.', idField: 'id', labelField: 'nombre' },
    { key: 'proveedores', table: 'proveedores', name: 'Proveedores', description: 'Catálogo de proveedores externos.', idField: 'id', labelField: 'nombre' },
];

type ItemToDelete = {
    id: string;
    label: string;
    checked: boolean;
};

function DataSetCard({ db, count, onDelete }: { db: DataSet; count: number; onDelete: (db: DataSet) => void; }) {
    return (
        <div className="group relative overflow-hidden rounded-[2rem] bg-card/40 backdrop-blur-md border border-border/40 p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:bg-destructive/[0.02]">
            <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-destructive/10 text-destructive shadow-inner group-hover:scale-110 transition-transform">
                        <Trash2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-black text-sm tracking-tight text-foreground">{db.name}</h3>
                        <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">{db.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-full bg-muted/50 border border-border/40">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{count} registros</span>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onDelete(db)} 
                        disabled={count === 0}
                        className="rounded-xl font-black text-[10px] uppercase tracking-widest h-9 px-4 hover:bg-destructive hover:text-white transition-all disabled:opacity-20"
                    >
                        Borrar
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function BorrarOsPage() {
    const { toast } = useToast();
    const [isMounted, setIsMounted] = useState(false);
    const [dataSetToView, setDataSetToView] = useState<DataSet | null>(null);
    const [itemsToDelete, setItemsToDelete] = useState<ItemToDelete[]>([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [dbCounts, setDbCounts] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchCounts();
    }, []);

    const fetchCounts = async () => {
        setIsLoading(true);
        const counts: Record<string, number> = {};
        
        for (const db of [...EVENT_DATA, ...RELATED_DATA, ...MASTER_DATA]) {
            try {
                const { count, error } = await supabase
                    .from(db.table)
                    .select('*', { count: 'exact', head: true });
                
                if (error) throw error;
                counts[db.key] = count || 0;
            } catch (e) {
                console.error(`Error fetching count for ${db.table}:`, e);
                counts[db.key] = 0;
            }
        }
        
        setDbCounts(counts);
        setIsLoading(false);
        setIsMounted(true);
    };

    const handleOpenDialog = async (db: DataSet) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from(db.table)
                .select('*')
                .limit(100); // Limit to 100 for safety in this view
            
            if (error) throw error;

            const items: ItemToDelete[] = (data || []).map((item: any) => ({
                id: item[db.idField || 'id'],
                label: item[db.labelField || 'id'] || item.id || 'Sin etiqueta',
                checked: true
            }));
            
            setItemsToDelete(items);
            setDataSetToView(db);
        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleAll = (checked: boolean | "indeterminate") => {
        if (checked === 'indeterminate') return;
        setItemsToDelete(items => items.map(item => ({ ...item, checked })));
    }

    const handleToggleItem = (id: string) => {
        setItemsToDelete(items => items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
    }

    const handleDeleteSelected = async () => {
        if (!dataSetToView) return;

        const idsToDelete = itemsToDelete.filter(item => item.checked).map(item => item.id);
        if (idsToDelete.length === 0) return;

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from(dataSetToView.table)
                .delete()
                .in(dataSetToView.idField || 'id', idsToDelete);

            if (error) throw error;

            toast({
                title: 'Datos Eliminados',
                description: `Se han borrado ${idsToDelete.length} registros de: ${dataSetToView.name}.`,
            });

            await fetchCounts();
            setDataSetToView(null);
            setItemsToDelete([]);
            setIsConfirmOpen(false);
        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const numSelected = itemsToDelete.filter(i => i.checked).length;

    if (!isMounted || (isLoading && Object.keys(dbCounts).length === 0)) {
        return <LoadingSkeleton title="Cargando Gestión de Datos..." />;
    }
    
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Premium Header Section */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/40 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-destructive/10 rounded-full blur-[100px]" />
                
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 rounded-[2rem] bg-destructive/10 text-destructive shadow-inner">
                            <ShieldAlert className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter text-foreground">Gestión de Datos</h1>
                            <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-widest">Zona de Peligro • Supabase Database Hub</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button 
                            onClick={fetchCounts}
                            variant="outline"
                            className="rounded-2xl font-black px-6 h-12 border-border/40 bg-background/40 backdrop-blur-md hover:bg-muted transition-all"
                        >
                            Refrescar Conteos
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-12 pb-20">
                {/* Warning Banner */}
                <div className="rounded-[2rem] bg-destructive/5 border border-destructive/20 p-8 flex items-start gap-6 shadow-inner">
                    <div className="p-3 rounded-2xl bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-destructive tracking-tight">Advertencia de Seguridad</h2>
                        <p className="text-sm font-medium text-destructive/70 leading-relaxed">
                            Estas acciones son masivas e irreversibles. Usa los diálogos para revisar y confirmar qué registros se eliminarán. 
                            Borrar datos maestros puede afectar la integridad de todo el sistema.
                        </p>
                    </div>
                </div>

                {/* Sections */}
                <div className="space-y-8">
                    <section>
                        <div className="flex items-center gap-3 mb-6 ml-2">
                            <div className="w-1 h-6 bg-destructive rounded-full" />
                            <h2 className="text-xl font-black tracking-tight uppercase text-muted-foreground/80">Registros Principales</h2>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {EVENT_DATA.map(db => (
                                <DataSetCard key={db.key} db={db} count={dbCounts[db.key] || 0} onDelete={handleOpenDialog} />
                            ))}
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-3 mb-2 ml-2">
                            <div className="w-1 h-6 bg-destructive rounded-full" />
                            <h2 className="text-xl font-black tracking-tight uppercase text-muted-foreground/80">Datos Vinculados a Eventos</h2>
                        </div>
                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-6 ml-6">
                            Limpieza selectiva de módulos específicos
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {RELATED_DATA.map(db => (
                                <DataSetCard key={db.key} db={db} count={dbCounts[db.key] || 0} onDelete={handleOpenDialog} />
                            ))}
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-3 mb-2 ml-2">
                            <div className="w-1 h-6 bg-destructive rounded-full" />
                            <h2 className="text-xl font-black tracking-tight uppercase text-muted-foreground/80 text-destructive">Datos Maestros (Configuración)</h2>
                        </div>
                        <p className="text-[10px] font-black text-destructive/40 uppercase tracking-[0.2em] mb-6 ml-6">
                            ¡CUIDADO! Base fundamental del sistema
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {MASTER_DATA.map(db => (
                                <DataSetCard key={db.key} db={db} count={dbCounts[db.key] || 0} onDelete={handleOpenDialog} />
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            {/* Dialogs */}
            <Dialog open={!!dataSetToView} onOpenChange={(open) => !open && setDataSetToView(null)}>
                <DialogContent className="rounded-[2.5rem] border-border/40 shadow-2xl max-w-2xl overflow-hidden p-0">
                    <div className="p-8 bg-muted/30 border-b border-border/40">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tighter">Borrar registros: {dataSetToView?.name}</DialogTitle>
                            <DialogDescription className="font-medium">
                                Revisa los registros que se van a eliminar. Desmarca los que quieras conservar.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    
                    <div className="p-6">
                        <div className="rounded-[1.5rem] border border-border/40 bg-background/40 overflow-hidden">
                            <ScrollArea className="h-72">
                                <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                        <TableRow className="hover:bg-transparent border-border/40">
                                            <TableHead className="w-12 pl-6">
                                                <Checkbox 
                                                    checked={numSelected > 0 && numSelected === itemsToDelete.length ? true : (numSelected > 0 ? "indeterminate" : false)}
                                                    onCheckedChange={handleToggleAll}
                                                    className="rounded-md border-border/40 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                                                />
                                            </TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground/50">ID / Nombre del Registro</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {itemsToDelete.length > 0 ? itemsToDelete.map(item => (
                                            <TableRow key={item.id} className="border-border/40 hover:bg-destructive/[0.02]">
                                                <TableCell className="pl-6">
                                                    <Checkbox 
                                                        checked={item.checked} 
                                                        onCheckedChange={() => handleToggleItem(item.id)}
                                                        className="rounded-md border-border/40 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono text-[10px] text-muted-foreground py-3">{item.label}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={2} className="h-48 text-center">
                                                    <div className="flex flex-col items-center justify-center text-muted-foreground/20">
                                                        <XCircle className="h-12 w-12 mb-2 opacity-10" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest">No hay registros</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-muted/30 border-t border-border/40 gap-2">
                        <Button variant="outline" onClick={() => setDataSetToView(null)} className="rounded-xl h-12 font-bold">Cancelar</Button>
                        <Button 
                            variant="destructive" 
                            onClick={() => setIsConfirmOpen(true)} 
                            disabled={numSelected === 0}
                            className="rounded-xl h-12 font-black px-8 shadow-lg shadow-destructive/20"
                        >
                            Eliminar ({numSelected}) Seleccionados
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tighter">¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium">
                          Vas a eliminar permanentemente <strong className="text-destructive">{numSelected}</strong> registros de <strong>{dataSetToView?.name}</strong>. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl h-12 font-bold">Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteSelected} 
                            className="rounded-xl h-12 font-black bg-destructive hover:bg-destructive/90 text-white px-8"
                        >
                            Sí, entiendo. Borrar seleccionados.
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
