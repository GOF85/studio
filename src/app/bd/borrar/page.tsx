'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
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
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';

type DatabaseKey = 'personal' | 'espacios' | 'precios' | 'gastronomiaDB' | 'alquilerDB' | 'tipoServicio' | 'proveedoresTransporte' | 'proveedorHielo' | 'atipicosDB';

const DATABASES: { key: DatabaseKey; name: string; description: string }[] = [
    { key: 'personal', name: 'Personal', description: 'Contiene todos los empleados y contactos.' },
    { key: 'espacios', name: 'Espacios', description: 'Contiene todos los espacios y sus detalles.' },
    { key: 'precios', name: 'Precios', description: 'Contiene todos los productos con sus precios.' },
    { key: 'gastronomiaDB', name: 'Gastronomía (Platos)', description: 'Contiene todos los platos y sus recetas.' },
    { key: 'alquilerDB', name: 'Alquiler', description: 'Contiene los artículos de alquiler de proveedores.' },
    { key: 'tipoServicio', name: 'Tipo Servicio', description: 'Contiene los diferentes tipos de servicio para los eventos.' },
    { key: 'proveedoresTransporte', name: 'Proveedores de Transporte', description: 'Contiene los proveedores de transporte.' },
    { key: 'proveedorHielo', name: 'Proveedores de Hielo', description: 'Contiene los proveedores de hielo.' },
    { key: 'atipicosDB', name: 'Atípicos (Gastos Varios)', description: 'Contiene los conceptos de gastos varios.' },
];

export default function BorrarBdPage() {
    const [dbToDelete, setDbToDelete] = useState<DatabaseKey | null>(null);
    const { toast } = useToast();

    const handleDelete = () => {
        if (!dbToDelete) return;
        
        localStorage.removeItem(dbToDelete);
        
        const dbName = DATABASES.find(db => db.key === dbToDelete)?.name || 'La base de datos';
        toast({
            title: 'Base de datos eliminada',
            description: `${dbName} ha sido vaciada correctamente.`,
        });
        
        setDbToDelete(null);
    };

    const selectedDbName = dbToDelete ? DATABASES.find(db => db.key === dbToDelete)?.name : '';

    return (
        <>
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-3 mb-8">
                        <Trash2 className="h-8 w-8 text-destructive" />
                        <h1 className="text-3xl font-headline font-bold">Borrar Bases de Datos</h1>
                    </div>
                    
                    <Card className="border-destructive bg-destructive/5">
                        <CardHeader>
                            <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
                            <CardDescription className="text-destructive/80">
                                Las acciones en esta página son irreversibles. Una vez que eliminas una base de datos, 
                                toda su información se pierde para siempre. Procede con extrema precaución.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <div className="mt-8 space-y-4">
                        {DATABASES.map((db) => (
                            <Card key={db.key}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold">{db.name}</h3>
                                        <p className="text-sm text-muted-foreground">{db.description}</p>
                                    </div>
                                    <Button variant="destructive" onClick={() => setDbToDelete(db.key)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Vaciar
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </main>

             <AlertDialog open={!!dbToDelete} onOpenChange={(open) => !open && setDbToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Vas a eliminar permanentemente todos los datos de la base de datos de <strong>{selectedDbName}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDbToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={handleDelete}
                        >
                            Sí, entiendo las consecuencias. Vaciar base de datos.
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
