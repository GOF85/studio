
'use client';

import { useState, useEffect } from 'react';
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
import { Trash2, ShieldAlert } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';

type DataSet = {
  key: string;
  name: string;
  description: string;
};

const EVENT_DATA: DataSet[] = [
    { key: 'serviceOrders', name: 'Órdenes de Servicio (Catering)', description: 'Elimina todos los eventos de catering.' },
    { key: 'entregas', name: 'Pedidos de Entrega', description: 'Elimina todos los pedidos de la vertical de Entregas.' },
];

const RELATED_DATA: DataSet[] = [
    { key: 'comercialBriefings', name: 'Briefings Comerciales', description: 'Hitos, servicios y detalles de cada evento.' },
    { key: 'gastronomyOrders', name: 'Pedidos de Gastronomía', description: 'Pedidos de cocina para cada hito.' },
    { key: 'materialOrders', name: 'Pedidos de Material', description: 'Pedidos de Almacén, Bodega, Bio y Alquiler.' },
    { key: 'transporteOrders', name: 'Pedidos de Transporte', description: 'Todos los servicios de transporte asignados.' },
    { key: 'hieloOrders', name: 'Pedidos de Hielo', description: 'Todos los pedidos de hielo.' },
    { key: 'decoracionOrders', name: 'Pedidos de Decoración', description: 'Gastos de decoración asociados a eventos.' },
    { key: 'atipicoOrders', name: 'Pedidos Atípicos', description: 'Gastos varios asociados a eventos.' },
    { key: 'personalMiceOrders', name: 'Asignaciones Personal MICE', description: 'Turnos de personal interno.' },
    { key: 'personalExterno', name: 'Asignaciones Personal Externo', description: 'Turnos de personal de ETTs.' },
    { key: 'pruebasMenu', name: 'Pruebas de Menú', description: 'Toda la información de las pruebas de menú.' },
    { key: 'pickingSheets', name: 'Hojas de Picking (Almacén)', description: 'Todo el progreso de picking de material.' },
    { key: 'returnSheets', name: 'Hojas de Retorno (Almacén)', description: 'Todo el progreso de gestión de retornos.' },
    { key: 'ordenesFabricacion', name: 'Órdenes de Fabricación (CPR)', description: 'Todos los lotes de producción.' },
    { key: 'stockElaboraciones', name: 'Stock de Elaboraciones', description: 'Inventario de elaboraciones producidas por CPR.' },
    { key: 'pickingStates', name: 'Picking de Gastronomía (CPR)', description: 'Toda la logística de picking de comida.' },
    { key: 'excedentesProduccion', name: 'Excedentes de Producción', description: 'Sobrantes de producción guardados.' },
    { key: 'pedidosEntrega', name: 'Confección de Entregas', description: 'Contenido de cada pedido de entrega.' },
    { key: 'personalEntrega', name: 'Personal de Entregas', description: 'Turnos de personal para la vertical de entregas.' },
    { key: 'partnerPedidosStatus', name: 'Estado Pedidos de Partner', description: 'Estado de los pedidos del portal de partners.' },
    { key: 'activityLogs', name: 'Registro de Actividad de Portales', description: 'Log de acciones de usuarios externos.' },
];

type ItemToDelete = {
    id: string;
    label: string;
    checked: boolean;
};

type DataSetCardProps = {
    db: DataSet;
    count: number;
    onDelete: (db: DataSet) => void;
};

function DataSetCard({ db, count, onDelete }: DataSetCardProps) {
    return (
        <Card>
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">{db.name}</h3>
                    <p className="text-sm text-muted-foreground">{db.description}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">{count} registros</Badge>
                    <Button variant="destructive" onClick={() => onDelete(db)} disabled={count === 0}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Borrar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function BorrarOsPage() {
    const { toast } = useToast();
    const [isMounted, setIsMounted] = useState(false);
    const [dataSetToView, setDataSetToView] = useState<DataSet | null>(null);
    const [itemsToDelete, setItemsToDelete] = useState<ItemToDelete[]>([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [dbCounts, setDbCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        const counts: Record<string, number> = {};
        [...EVENT_DATA, ...RELATED_DATA].forEach(db => {
            const dataString = localStorage.getItem(db.key);
            const data = dataString ? JSON.parse(dataString) : [];
            counts[db.key] = Array.isArray(data) ? data.length : Object.keys(data).length;
        });
        setDbCounts(counts);
        setIsMounted(true);
    }, []);

    const handleOpenDialog = (db: DataSet) => {
        const dataString = localStorage.getItem(db.key);
        const data = dataString ? JSON.parse(dataString) : [];
        
        const items = (Array.isArray(data) ? data : Object.values(data)).map((item: any) => ({
            id: item.id || item.osId, // Use osId as fallback for some data structures
            label: item.serviceNumber || item.name || item.concepto || item.ofId || item.id || item.osId,
            checked: true
        }));
        
        setItemsToDelete(items);
        setDataSetToView(db);
    };

    const handleToggleAll = (checked: boolean | "indeterminate") => {
        if (checked === 'indeterminate') return;
        setItemsToDelete(items => items.map(item => ({ ...item, checked })));
    }

    const handleToggleItem = (id: string) => {
        setItemsToDelete(items => items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
    }

    const handleDeleteSelected = () => {
        if (!dataSetToView) return;

        const idsToDelete = new Set(itemsToDelete.filter(item => item.checked).map(item => item.id));
        
        const dataString = localStorage.getItem(dataSetToView.key);
        const data = dataString ? JSON.parse(dataString) : [];

        const isArray = Array.isArray(data);
        let newData;

        if (isArray) {
            newData = data.filter((item: any) => !idsToDelete.has(item.id || item.osId));
        } else { // Handle object-based storage like pickingStates
            newData = Object.entries(data).reduce((acc, [key, value]) => {
                const item = value as any;
                if (!idsToDelete.has(item.id || item.osId || key)) {
                    acc[key] = value;
                }
                return acc;
            }, {} as Record<string, any>);
        }

        localStorage.setItem(dataSetToView.key, JSON.stringify(newData));
        
        toast({
            title: 'Datos Eliminados',
            description: `Se han borrado ${idsToDelete.size} registros de: ${dataSetToView.name}.`,
        });

        // Update counts
        setDbCounts(prev => ({ ...prev, [dataSetToView.key]: Array.isArray(newData) ? newData.length : Object.keys(newData).length }));

        setDataSetToView(null);
        setItemsToDelete([]);
        setIsConfirmOpen(false);
    };

    const numSelected = itemsToDelete.filter(i => i.checked).length;

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Limpieza de Datos..." />;
    }
    
    return (
        <>
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto">
                     <div className="flex items-center gap-3 mb-8">
                        <Trash2 className="h-8 w-8 text-destructive" />
                        <h1 className="text-3xl font-headline font-bold">Limpieza de Datos de Eventos</h1>
                    </div>

                    <Card className="border-destructive bg-destructive/5 mb-8">
                        <CardHeader className="flex-row items-center gap-4">
                            <ShieldAlert className="w-10 h-10 text-destructive flex-shrink-0" />
                            <div>
                                <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
                                <CardDescription className="text-destructive/80">
                                    Estas acciones son masivas. Usa los diálogos para revisar y confirmar qué registros se eliminarán.
                                </CardDescription>
                            </div>
                        </CardHeader>
                    </Card>

                    <h2 className="text-2xl font-headline font-semibold mb-4 mt-8">Registros Principales</h2>
                     <div className="space-y-4">
                        {EVENT_DATA.map(db => (
                            <DataSetCard key={db.key} db={db} count={dbCounts[db.key] || 0} onDelete={handleOpenDialog} />
                        ))}
                    </div>
                    
                    <h2 className="text-2xl font-headline font-semibold mb-4 mt-8">Datos Vinculados a Eventos</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Aquí puedes borrar datos de módulos específicos si necesitas limpiar solo una parte del sistema. Borrar los registros principales de arriba no elimina automáticamente estos datos.
                    </p>
                    <div className="space-y-4">
                         {RELATED_DATA.map(db => (
                           <DataSetCard key={db.key} db={db} count={dbCounts[db.key] || 0} onDelete={handleOpenDialog} />
                        ))}
                    </div>
                </div>
            </main>

            <Dialog open={!!dataSetToView} onOpenChange={(open) => !open && setDataSetToView(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Borrar registros de: {dataSetToView?.name}</DialogTitle>
                        <DialogDescription>
                            Revisa los registros que se van a eliminar. Desmarca los que quieras conservar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="border rounded-lg">
                        <ScrollArea className="h-72">
                            <Table>
                                <TableHeader className="sticky top-0 bg-secondary">
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox 
                                                checked={numSelected > 0 && numSelected === itemsToDelete.length ? true : (numSelected > 0 ? "indeterminate" : false)}
                                                onCheckedChange={handleToggleAll}
                                            />
                                        </TableHead>
                                        <TableHead>ID / Nombre</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {itemsToDelete.length > 0 ? itemsToDelete.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Checkbox checked={item.checked} onCheckedChange={() => handleToggleItem(item.id)}/>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{item.label}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={2} className="h-24 text-center">No hay registros para mostrar.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setDataSetToView(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => setIsConfirmOpen(true)} disabled={numSelected === 0}>
                            Eliminar ({numSelected}) Seleccionados
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Vas a eliminar permanentemente <strong>{numSelected}</strong> registros de <strong>{dataSetToView?.name}</strong>. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelected}>Sí, entiendo. Borrar seleccionados.</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
