'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Database, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import {
    migrateAllData,
    isMigrationNeeded,
    getMigrationSummary,
    type MigrationProgress
} from '@/lib/migrate-localStorage';

export default function MigrationPage() {
    const [isChecking, setIsChecking] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationNeeded, setMigrationNeeded] = useState<boolean | null>(null);
    const [summary, setSummary] = useState<Record<string, number>>({});
    const [progress, setProgress] = useState<MigrationProgress | null>(null);

    const checkMigration = () => {
        setIsChecking(true);
        setTimeout(() => {
            const needed = isMigrationNeeded();
            const dataSummary = getMigrationSummary();
            setMigrationNeeded(needed);
            setSummary(dataSummary);
            setIsChecking(false);
        }, 500);
    };

    const startMigration = async () => {
        setIsMigrating(true);
        try {
            await migrateAllData((prog) => {
                setProgress(prog);
            });
        } catch (error) {
            console.error('Migration error:', error);
        } finally {
            setIsMigrating(false);
        }
    };

    const totalItems = Object.values(summary).reduce((a, b) => a + b, 0);
    const progressPercentage = progress
        ? (progress.completed / progress.total) * 100
        : 0;

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Migración de Datos</h1>
                <p className="text-muted-foreground">
                    Transfiere tus datos de localStorage a Supabase para mayor seguridad y rendimiento.
                </p>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        Estado de la Migración
                    </CardTitle>
                    <CardDescription>
                        Verifica si tienes datos pendientes de migrar desde el navegador a la base de datos.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {migrationNeeded === null && (
                        <Button
                            onClick={checkMigration}
                            disabled={isChecking}
                            className="w-full"
                        >
                            {isChecking ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verificando...
                                </>
                            ) : (
                                'Verificar Datos Pendientes'
                            )}
                        </Button>
                    )}

                    {migrationNeeded === false && (
                        <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>
                                ✅ No hay datos pendientes de migración. Todos tus datos están en Supabase.
                            </AlertDescription>
                        </Alert>
                    )}

                    {migrationNeeded === true && !progress && (
                        <>
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    Se encontraron <strong>{totalItems} registros</strong> en localStorage que pueden ser migrados.
                                </AlertDescription>
                            </Alert>

                            <div className="bg-muted p-4 rounded-lg space-y-2">
                                <p className="font-semibold mb-2">Resumen de datos encontrados:</p>
                                {Object.entries(summary).map(([key, count]) => (
                                    count > 0 && (
                                        <div key={key} className="flex justify-between text-sm">
                                            <span className="capitalize">{key}:</span>
                                            <span className="font-mono">{count} registros</span>
                                        </div>
                                    )
                                ))}
                            </div>

                            <Alert className="bg-blue-50 border-blue-200">
                                <AlertDescription className="text-sm">
                                    <strong>Nota:</strong> Tus datos se respaldarán automáticamente antes de ser eliminados de localStorage.
                                </AlertDescription>
                            </Alert>

                            <Button
                                onClick={startMigration}
                                disabled={isMigrating}
                                className="w-full"
                                size="lg"
                            >
                                {isMigrating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Migrando...
                                    </>
                                ) : (
                                    'Iniciar Migración'
                                )}
                            </Button>
                        </>
                    )}

                    {progress && (
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span>Progreso: {progress.completed} / {progress.total}</span>
                                    <span>{Math.round(progressPercentage)}%</span>
                                </div>
                                <Progress value={progressPercentage} className="h-2" />
                                <p className="text-sm text-muted-foreground mt-2">
                                    {progress.current === 'Completado' ? 'Migración completada' : `Migrando: ${progress.current}...`}
                                </p>
                            </div>

                            {progress.results.length > 0 && (
                                <div className="space-y-2">
                                    <p className="font-semibold text-sm">Resultados:</p>
                                    {progress.results.map((result, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                {result.success ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-600" />
                                                )}
                                                <span className="capitalize">{result.entity}</span>
                                            </div>
                                            <span className="font-mono">
                                                {result.success
                                                    ? `${result.itemsProcessed} migrados`
                                                    : result.error || 'Error'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {progress.current === 'Completado' && (
                                <Alert className="bg-green-50 border-green-200">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <AlertDescription>
                                        ✅ Migración completada exitosamente. Tus datos ahora están en Supabase.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>¿Por qué migrar?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                        <strong>✅ Mayor seguridad:</strong> Tus datos estarán respaldados en la nube, no solo en tu navegador.
                    </p>
                    <p>
                        <strong>✅ Mejor rendimiento:</strong> Caché inteligente y sincronización automática entre pestañas.
                    </p>
                    <p>
                        <strong>✅ Sin pérdida de datos:</strong> No perderás información si borras el caché del navegador.
                    </p>
                    <p>
                        <strong>✅ Acceso multi-dispositivo:</strong> Accede a tus datos desde cualquier navegador.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
