

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
    { key: 'solicitudesPersonalCPR', name: 'Solicitudes de Personal CPR', description: 'Peticiones de personal de apoyo para producción.' },
];

type ItemToDelete = {
    id: string;
    label: string;
    checked: boolean;
};

function DataSetCard({ db, count, onDelete }: { db: DataSet; count: number; onDelete: (db: DataSet) => void; }) {
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
    const [dataSetToView, setDataSetToView] = useState<DataSet | null>(null);
    const [itemsToDelete, setItemsToDelete] = useState<ItemToDelete[]>([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [dbCounts, setDbCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        const counts: Record<string, number> = {};
        [...EVENT_DATA, ...RELATED_DATA].forEach(db => {
            const dataString = localStorage.getItem(db.key);
            if (dataString) {
                try {
                    const data = JSON.parse(dataString);
                    counts[db.key] = Array.isArray(data) ? data.length : Object.keys(data).length;
                } catch (e) {
                    counts[db.key] = 0;
                }
            } else {
                counts[db.key] = 0;
            }
        });
        setDbCounts(counts);
    }, []);

    const handleOpenDialog = (db: DataSet) => {
        const dataString = localStorage.getItem(db.key);
        const data = dataString ? JSON.parse(dataString) : [];
        
        let items: ItemToDelete[] = [];

        if (Array.isArray(data)) {
            items = data.map((item: any) => ({
                id: item.id || item.osId,
                label: item.serviceNumber || item.name || item.concepto || item.ofId || item.id || item.osId,
                checked: true
            }));
        } else if (typeof data === 'object' && data !== null) {
            // Handle object-based storage like stockElaboraciones
            items = Object.keys(data).map(key => {
                const item = data[key];
                return {
                    id: key, // The key is the ID (e.g., elaboracionId)
                    label: item.elaboracionNombre || item.serviceNumber || item.name || key,
                    checked: true,
                };
            });
        }
        
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

        let newData;

        if (Array.isArray(data)) {
            newData = data.filter((item: any) => !idsToDelete.has(item.id || item.osId));
        } else { // Handle object-based storage
            newData = Object.entries(data).reduce((acc, [key, value]) => {
                if (!idsToDelete.has(key)) {
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

