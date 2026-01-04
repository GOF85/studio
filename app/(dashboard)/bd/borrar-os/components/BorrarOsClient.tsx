'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { TableCount } from '@/services/borrar-os-service';

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
                        <h3 className="font-black text-lg tracking-tighter uppercase">{db.name}</h3>
                        <p className="text-xs text-muted-foreground font-medium">{db.description}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Badge variant={count > 0 ? "destructive" : "outline"} className="rounded-full px-4 py-1 font-black text-xs">
                        {count} REGISTROS
                    </Badge>
                    {count > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onDelete(db)}
                            className="h-8 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-destructive hover:text-white transition-all"
                        >
                            Limpiar
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

interface BorrarOsClientProps {
  initialCounts: TableCount[];
}

export function BorrarOsClient({ initialCounts }: BorrarOsClientProps) {
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [selectedDb, setSelectedDb] = useState<DataSet | null>(null);
    const [items, setItems] = useState<ItemToDelete[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const countsMap: Record<string, number> = {};
        initialCounts.forEach(c => {
            countsMap[c.table] = c.count;
        });
        setCounts(countsMap);
        setLoading(false);
    }, [initialCounts]);

    const fetchCounts = async () => {
        setLoading(true);
        const allTables = [...EVENT_DATA, ...RELATED_DATA, ...MASTER_DATA].map(d => d.table);
        const newCounts: Record<string, number> = {};
        
        for (const table of allTables) {
            const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
            if (!error) newCounts[table] = count || 0;
        }
        
        setCounts(newCounts);
        setLoading(false);
    };

    const handleOpenDelete = async (db: DataSet) => {
        setSelectedDb(db);
        setLoadingItems(true);
        setItems([]);
        
        const { data, error } = await supabase
            .from(db.table)
            .select(`${db.idField || 'id'}, ${db.labelField || 'id'}`)
            .limit(1000);

        if (!error && data) {
            setItems((data as any[]).map((item) => {
                const row = item as Record<string, any>;
                return {
                    id: String(row[db.idField || 'id']),
                    label: String(row[db.labelField || 'id']),
                    checked: false,
                } as ItemToDelete;
            }));
        }
        setLoadingItems(false);
    };

    const handleDeleteSelected = async () => {
        if (!selectedDb) return;
        const idsToDelete = items.filter(i => i.checked).map(i => i.id);
        if (idsToDelete.length === 0) return;

        setIsDeleting(true);
        const { error } = await supabase
            .from(selectedDb.table)
            .delete()
            .in(selectedDb.idField || 'id', idsToDelete);

        if (error) {
            toast({ variant: 'destructive', title: 'Error al eliminar', description: error.message });
        } else {
            toast({ title: 'Eliminado con éxito', description: `Se han eliminado ${idsToDelete.length} registros.` });
            setSelectedDb(null);
            fetchCounts();
        }
        setIsDeleting(false);
        setIsConfirmOpen(false);
    };

    const filteredItems = items.filter(i => 
        i.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <LoadingSkeleton />;

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3 text-destructive">
                        <ShieldAlert className="h-10 w-10" />
                        ZONA DE PELIGRO
                    </h1>
                    <p className="text-muted-foreground font-medium mt-1">
                        Herramientas de mantenimiento para limpieza masiva de datos. Úsalo con precaución.
                    </p>
                </div>
                <Button variant="outline" onClick={fetchCounts} className="rounded-xl font-bold h-12 px-6 border-border/40">
                    Actualizar Contadores
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Eventos y Pedidos */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 px-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <h2 className="font-black text-sm uppercase tracking-widest text-muted-foreground">Eventos y Pedidos</h2>
                    </div>
                    <div className="grid gap-4">
                        {EVENT_DATA.map(db => (
                            <DataSetCard key={db.key} db={db} count={counts[db.table] || 0} onDelete={handleOpenDelete} />
                        ))}
                    </div>
                </div>

                {/* Datos Relacionados */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center gap-2 px-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <h2 className="font-black text-sm uppercase tracking-widest text-muted-foreground">Datos Relacionados y Logs</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {RELATED_DATA.map(db => (
                            <DataSetCard key={db.key} db={db} count={counts[db.table] || 0} onDelete={handleOpenDelete} />
                        ))}
                    </div>
                </div>

                {/* Datos Maestros */}
                <div className="lg:col-span-3 space-y-6 mt-4">
                    <div className="flex items-center gap-2 px-2">
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                        <h2 className="font-black text-sm uppercase tracking-widest text-destructive">Datos Maestros (CRÍTICO)</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {MASTER_DATA.map(db => (
                            <DataSetCard key={db.key} db={db} count={counts[db.table] || 0} onDelete={handleOpenDelete} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Diálogo de Selección de Items */}
            <Dialog open={!!selectedDb} onOpenChange={(open) => !open && setSelectedDb(null)}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col rounded-[2rem] border-border/40 shadow-2xl bg-background/95 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                            <Trash2 className="h-6 w-6 text-destructive" />
                            Limpiar {selectedDb?.name}
                        </DialogTitle>
                        <DialogDescription className="font-medium">
                            Selecciona los registros específicos que deseas eliminar de la tabla <code className="bg-muted px-1 rounded">{selectedDb?.table}</code>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center gap-4 py-4">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Buscar por ID o Etiqueta..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-12 bg-muted/30 border-none rounded-xl focus-visible:ring-primary"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setItems(prev => prev.map(i => ({ ...i, checked: true })))}
                                className="rounded-xl font-bold"
                            >
                                Seleccionar Todo
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setItems(prev => prev.map(i => ({ ...i, checked: false })))}
                                className="rounded-xl font-bold"
                            >
                                Desmarcar Todo
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden border border-border/40 rounded-2xl bg-card/30">
                        <ScrollArea className="h-full">
                            <Table>
                                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                    <TableRow className="hover:bg-transparent border-border/40">
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest">ID</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Referencia / Etiqueta</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingItems ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-32 text-center">
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <LoadingSkeleton />
                                                    <span className="text-xs font-bold uppercase tracking-widest">Cargando registros...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-32 text-center text-muted-foreground font-bold uppercase text-xs tracking-widest">
                                                No se encontraron registros
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredItems.map((item) => (
                                            <TableRow key={item.id} className="hover:bg-destructive/[0.02] border-border/40 transition-colors">
                                                <TableCell>
                                                    <Checkbox 
                                                        checked={item.checked}
                                                        onCheckedChange={(checked) => {
                                                            setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !!checked } : i));
                                                        }}
                                                        className="rounded-md border-destructive/30 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono text-[10px] text-muted-foreground">{item.id}</TableCell>
                                                <TableCell className="font-bold text-sm uppercase">{item.label}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>

                    <DialogFooter className="pt-6 gap-4">
                        <div className="flex-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            <Badge variant="outline" className="rounded-full">{items.filter(i => i.checked).length} seleccionados</Badge>
                            de {items.length} totales
                        </div>
                        <Button variant="ghost" onClick={() => setSelectedDb(null)} className="rounded-xl font-bold h-12 px-6">
                            Cancelar
                        </Button>
                        <Button 
                            variant="destructive" 
                            disabled={items.filter(i => i.checked).length === 0}
                            onClick={() => setIsConfirmOpen(true)}
                            className="rounded-xl font-black h-12 px-8 shadow-lg shadow-destructive/20 transition-all active:scale-95"
                        >
                            Eliminar Seleccionados
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alerta de Confirmación Final */}
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent className="rounded-[2rem] border-border/40 shadow-2xl bg-background/95 backdrop-blur-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-3 text-destructive">
                            <ShieldAlert className="h-8 w-8" />
                            ¿ESTÁS ABSOLUTAMENTE SEGURO?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="font-medium text-muted-foreground">
                            Estás a punto de eliminar <span className="text-destructive font-black">{items.filter(i => i.checked).length} registros</span> de la tabla <span className="font-black text-foreground">{selectedDb?.name}</span>.
                            <br /><br />
                            Esta acción es <span className="underline decoration-destructive font-bold">irreversible</span> y podría causar inconsistencias si los datos están relacionados con otros módulos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-4">
                        <AlertDialogCancel className="rounded-xl h-12 font-bold">No, cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteSelected}
                            disabled={isDeleting}
                            className="rounded-xl h-12 font-black bg-destructive hover:bg-destructive/90 text-white px-8"
                        >
                            {isDeleting ? 'Eliminando...' : 'Sí, eliminar permanentemente'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
