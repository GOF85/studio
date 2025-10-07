
'use client';

import { useState } from 'react';
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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Trash2, ShieldAlert, FileText, Package } from 'lucide-react';
import Link from 'next/link';

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
    { key: 'personalExternoOrders', name: 'Asignaciones Personal Externo', description: 'Turnos de personal de ETTs.' },
    { key: 'pruebasMenu', name: 'Pruebas de Menú', description: 'Toda la información de las pruebas de menú.' },
    { key: 'pickingSheets', name: 'Hojas de Picking (Almacén)', description: 'Todo el progreso de picking de material.' },
    { key: 'returnSheets', name: 'Hojas de Retorno (Almacén)', description: 'Todo el progreso de gestión de retornos.' },
    { key: 'ordenesFabricacion', name: 'Órdenes de Fabricación (CPR)', description: 'Todos los lotes de producción.' },
    { key: 'pickingStates', name: 'Picking de Gastronomía (CPR)', description: 'Toda la logística de picking de comida.' },
    { key: 'excedentesProduccion', name: 'Excedentes de Producción', description: 'Sobrantes de producción guardados.' },
    { key: 'pedidosEntrega', name: 'Confección de Entregas', description: 'Contenido de cada pedido de entrega.' },
    { key: 'personalEntrega', name: 'Personal de Entregas', description: 'Turnos de personal para la vertical de entregas.' },
    { key: 'partnerPedidosStatus', name: 'Estado Pedidos de Partner', description: 'Estado de los pedidos del portal de partners.' },
    { key: 'activityLogs', name: 'Registro de Actividad de Portales', description: 'Log de acciones de usuarios externos.' },
];


export default function BorrarOsPage() {
    const [dataSetToDelete, setDataSetToDelete] = useState<DataSet | null>(null);
    const { toast } = useToast();

    const handleDelete = () => {
        if (!dataSetToDelete) return;
        
        localStorage.removeItem(dataSetToDelete.key);
        
        toast({
            title: 'Datos Eliminados',
            description: `Se han borrado todos los registros de: ${dataSetToDelete.name}.`,
        });
        
        setDataSetToDelete(null);
    };

    const renderDeleteButton = (db: DataSet) => (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Borrar Todos
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Vas a eliminar permanentemente todos los registros de <strong>{db.name}</strong>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => {
                            localStorage.removeItem(db.key);
                            toast({
                                title: 'Datos Eliminados',
                                description: `Se han borrado todos los registros de: ${db.name}.`,
                            });
                        }}
                    >
                        Sí, entiendo. Borrar todo.
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

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
                                    Estas acciones son masivas e irreversibles. Úsalas para limpiar completamente los datos de prueba y empezar de cero.
                                </CardDescription>
                            </div>
                        </CardHeader>
                    </Card>

                    <h2 className="text-2xl font-headline font-semibold mb-4 mt-8">Registros Principales</h2>
                     <div className="space-y-4">
                        {EVENT_DATA.map((db) => (
                            <Card key={db.key}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold">{db.name}</h3>
                                        <p className="text-sm text-muted-foreground">{db.description}</p>
                                    </div>
                                    {renderDeleteButton(db)}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    
                    <h2 className="text-2xl font-headline font-semibold mb-4 mt-8">Datos Vinculados a Eventos</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Aquí puedes borrar datos de módulos específicos si necesitas limpiar solo una parte del sistema. Ten en cuenta que borrar los registros principales de arriba no elimina automáticamente estos datos.
                    </p>
                    <div className="space-y-4">
                        {RELATED_DATA.map((db) => (
                            <Card key={db.key}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold">{db.name}</h3>
                                        <p className="text-sm text-muted-foreground">{db.description}</p>
                                    </div>
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Vaciar
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer. Vas a eliminar permanentemente todos los registros de <strong>{db.name}</strong>.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-destructive hover:bg-destructive/90"
                                                    onClick={() => {
                                                        localStorage.removeItem(db.key);
                                                        toast({
                                                            title: 'Datos Eliminados',
                                                            description: `Se han borrado todos los registros de: ${db.name}.`,
                                                        });
                                                    }}
                                                >
                                                    Sí, entiendo. Borrar todo.
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
}
