

'use client';

import { useState, useRef } from 'react';
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
import { Trash2, ShieldAlert, Download, Loader2, Upload, Search, History } from 'lucide-react';
import Link from 'next/link';

type DatabaseKey = 'personal' | 'espacios' | 'articulos' | 'tipoServicio' | 'tiposPersonal' | 'tiposTransporte' | 'atipicosDB' | 'decoracionDB' | 'pedidoPlantillas' | 'formatosExpedicionDB' | 'proveedores' | 'solicitudesPersonalCPR' | 'stockMovimientos';

const ALL_DATABASE_KEYS = [
    'personal', 'espacios', 'articulos', 'tipoServicio', 'tiposPersonal', 'tiposTransporte',
    'atipicosDB', 'personalMiceOrders', 'decoracionDB', 
    'tiposCocina', 'pedidoPlantillas', 'formatosExpedicionDB', 'proveedores', 'serviceOrders', 
    'entregas', 'comercialBriefings', 'gastronomyOrders', 'materialOrders', 'transporteOrders', 
    'hieloOrders', 'decoracionOrders', 'atipicoOrders', 'personalExternoOrders', 'pruebasMenu', 
    'pickingSheets', 'returnSheets', 'ordenesFabricacion', 'pickingStates', 'excedentesProduccion', 
    'pedidosEntrega', 'personalEntrega', 'partnerPedidosStatus', 'activityLogs', 'ctaRealCosts', 
    'ctaComentarios', 'objetivosGastoPlantillas', 'defaultObjetivoGastoId', 'ingredientesERP', 
    'ingredientesInternos', 'elaboraciones', 'recetas', 'categoriasRecetas', 'portalUsers',
    'comercialAjustes', 'personalExternoAjustes', 'productosVenta', 'pickingEntregasState', 'stockElaboraciones',
    'solicitudesPersonalCPR', 'stockMovimientos'
];

const DATABASES: { key: DatabaseKey; name: string; description: string }[] = [
    { key: 'personal', name: 'Personal', description: 'Contiene todos los empleados y contactos.' },
    { key: 'espacios', name: 'Espacios', description: 'Contiene todos los espacios y sus detalles.' },
    { key: 'articulos', name: 'Artículos MICE', description: 'Catálogo de artículos de Almacén, Bodega, Bio y Menaje.' },
    { key: 'tipoServicio', name: 'Tipo Servicio', description: 'Contiene los diferentes tipos de servicio para los eventos.' },
    { key: 'tiposTransporte', name: 'Catálogo de Transporte', description: 'Vehículos y precios de las empresas de transporte.' },
    { key: 'tiposPersonal', name: 'Catálogo de Personal Externo', description: 'Categorías y precios del personal de ETTs.' },
    { key: 'atipicosDB', name: 'Atípicos (Conceptos)', description: 'Contiene los conceptos de gastos varios.' },
    { key: 'decoracionDB', name: 'Decoración (Conceptos)', description: 'Contiene los conceptos de decoración.' },
    { key: 'pedidoPlantillas', name: 'Plantillas de Pedidos', description: 'Contiene las plantillas para agilizar la creación de pedidos.' },
    { key: 'formatosExpedicionDB', name: 'Formatos de Expedición', description: 'Contiene los formatos de empaquetado para producción.' },
    { key: 'proveedores', name: 'Proveedores', description: 'Contiene la información fiscal y de contacto de proveedores.' },
    { key: 'solicitudesPersonalCPR', name: 'Solicitudes Personal CPR', description: 'Contiene las solicitudes de personal para el CPR.' },
];

export default function BorrarBdPage() {
    const [dbToDelete, setDbToDelete] = useState<DatabaseKey | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleBackup = () => {
        setIsDownloading(true);
        try {
            const backupData: Record<string, any> = {};
            ALL_DATABASE_KEYS.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        backupData[key] = JSON.parse(data);
                    } catch (e) {
                        backupData[key] = data;
                    }
                }
            });

            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.download = `mice_backup_${date}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast({
                title: 'Copia de Seguridad Creada',
                description: 'El archivo de respaldo se ha descargado correctamente.',
            });

        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Error al crear la copia',
                description: 'No se pudo generar el archivo de respaldo.',
            });
            console.error("Backup failed:", error);
        } finally {
            setIsDownloading(false);
        }
    };
    
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("El archivo no se pudo leer.");
                }
                const data = JSON.parse(text);
                
                // Clear existing data
                localStorage.clear();
                
                // Restore data from backup
                for (const key in data) {
                    if (Object.prototype.hasOwnProperty.call(data, key)) {
                        localStorage.setItem(key, JSON.stringify(data[key]));
                    }
                }
                
                toast({
                    title: 'Restauración completada',
                    description: 'Los datos se han importado correctamente. La página se recargará.',
                });
                
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Error de importación',
                    description: 'El archivo JSON no es válido o está corrupto.',
                });
                console.error("Import failed:", error);
            } finally {
                 setIsUploading(false);
                 if(fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

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
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-3 mb-8">
                        <Trash2 className="h-8 w-8 text-destructive" />
                        <h1 className="text-3xl font-headline font-bold">Borrar Bases de Datos</h1>
                    </div>
                    
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-primary">
                                Copia de Seguridad y Restauración
                            </CardTitle>
                            <CardDescription>
                                Descarga una copia de seguridad de todos los datos o restaura la aplicación a un estado anterior desde un archivo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex gap-4">
                             <input 
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".json"
                                onChange={handleFileChange}
                            />
                            <Button onClick={handleBackup} disabled={isDownloading} variant="outline">
                                {isDownloading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                )}
                                {isDownloading ? 'Generando...' : 'Descargar Copia'}
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={isUploading}>
                                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                        Restaurar Copia
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción es irreversible y **borrará todos los datos actuales** de la aplicación. Serán reemplazados por los datos del archivo de copia de seguridad que selecciones.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleImportClick}>Entiendo, continuar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>

                    <Card className="border-destructive bg-destructive/5 mb-8">
                        <CardHeader className="flex-row items-center gap-4">
                            <ShieldAlert className="w-10 h-10 text-destructive flex-shrink-0" />
                            <div>
                                <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
                                <CardDescription className="text-destructive/80">
                                    Las acciones en esta página son irreversibles. Una vez que eliminas los datos, se pierden para siempre. Procede con extrema precaución.
                                </CardDescription>
                            </div>
                        </CardHeader>
                         <CardContent className="flex flex-wrap gap-4">
                            <Link href="/bd/borrar-os">
                                <Button variant="destructive">
                                    Limpieza de Datos de Eventos <Trash2 className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                             <Link href="/bd/inspector">
                                <Button variant="secondary">
                                    Inspeccionar Datos <Search className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                        <History className="mr-2 h-4 w-4" /> Borrar Movimientos de Inventario
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Vaciar historial de movimientos?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción eliminará permanentemente **todos** los registros de movimientos del inventario de materia prima. El stock actual no se verá afectado.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => { localStorage.removeItem('stockMovimientos'); toast({ title: 'Historial de movimientos eliminado.' }); }}>Sí, vaciar historial</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>

                    <h2 className="text-2xl font-headline font-semibold mb-4">Bases de Datos Maestras</h2>
                    <div className="space-y-4">
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
