
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import type { ServiceOrder, ComercialBriefing, ComercialBriefingItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useToast } from '@/hooks/use-toast';
import { Form } from '@/components/ui/form';
import { format } from 'date-fns';

const formSchema = z.object({});
type FormValues = z.infer<typeof formSchema>;

function PedidoGastronomiaForm({ osId, briefingItemId }: { osId: string; briefingItemId: string }) {
    const router = useRouter();
    const { toast } = useToast();
    
    const [debugOs, setDebugOs] = useState<ServiceOrder | null>(null);
    const [debugBriefing, setDebugBriefing] = useState<ComercialBriefing | null>(null);
    const [debugHito, setDebugHito] = useState<ComercialBriefingItem | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    useEffect(() => {
        if (!osId || !briefingItemId) {
            setError("Los IDs de la URL no están disponibles.");
            setIsMounted(true);
            return;
        }

        try {
            const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
            const currentOS = allServiceOrders.find(os => os.id === osId);
            setDebugOs(currentOS || null);

            if (currentOS) {
                const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
                const currentBriefing = allBriefings.find(b => b.osId === osId);
                setDebugBriefing(currentBriefing || null);

                if (currentBriefing) {
                    const currentHito = currentBriefing.items.find(item => item.id === briefingItemId);
                    setDebugHito(currentHito || null);
                     if (!currentHito) {
                        setError(`Hito no encontrado con ID: ${briefingItemId}`);
                    }
                } else {
                     setError(`Briefing no encontrado para OS ID: ${osId}`);
                }
            } else {
                setError(`Orden de Servicio no encontrada con ID: ${osId}`);
            }
        } catch (e: any) {
            console.error("Error al cargar datos:", e);
            setError(`Error al leer datos: ${e.message}`);
        } finally {
            setIsMounted(true);
        }
    }, [osId, briefingItemId]);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando datos del pedido..." />;
    }

    return (
        <main>
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/os/${osId}/gastronomia`)}>
                    <ArrowLeft className="mr-2" /> Volver al listado
                </Button>
            </div>

            <h1 className="text-2xl font-bold mb-4">Página de Depuración de Pedido</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardHeader><CardTitle>Parámetros URL</CardTitle></CardHeader>
                    <CardContent className="text-xs max-h-48 overflow-y-auto"><pre>{JSON.stringify({ osId, briefingItemId }, null, 2)}</pre></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>ServiceOrder Encontrada</CardTitle></CardHeader>
                    <CardContent className="text-xs max-h-48 overflow-y-auto"><pre>{JSON.stringify(debugOs, null, 2) || "No encontrado"}</pre></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>ComercialBriefing Encontrado</CardTitle></CardHeader>
                    <CardContent className="text-xs max-h-48 overflow-y-auto"><pre>{JSON.stringify(debugBriefing, null, 2) || "No encontrado"}</pre></CardContent>
                </Card>
                <Card className="col-span-full">
                    <CardHeader><CardTitle>BriefingItem (Hito) Encontrado</CardTitle></CardHeader>
                    <CardContent className="text-xs max-h-48 overflow-y-auto"><pre>{JSON.stringify(debugHito, null, 2) || "No encontrado"}</pre></CardContent>
                </Card>
                {error && (
                    <Card className="col-span-full border-destructive">
                        <CardHeader><CardTitle className="text-destructive">Errores de Carga</CardTitle></CardHeader>
                        <CardContent className="text-xs text-destructive font-mono"><pre>{error}</pre></CardContent>
                    </Card>
                )}
            </div>
            
            {debugHito ? (
                <Form {...form}>
                    <form>
                        <Card>
                            <CardHeader>
                                <CardTitle>{debugHito.descripcion}</CardTitle>
                                <CardDescription>
                                    Fecha: {format(new Date(debugHito.fecha), 'dd/MM/yyyy')} | Asistentes: {debugHito.asistentes}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="font-semibold">Datos cargados correctamente. La interfaz del formulario iría aquí.</p>
                                <pre className="text-xs mt-4 bg-muted p-2 rounded-md">
                                    {JSON.stringify({
                                        gastro_status: debugHito.gastro_status,
                                        gastro_items: debugHito.gastro_items,
                                    }, null, 2)}
                                </pre>
                            </CardContent>
                        </Card>
                    </form>
                </Form>
            ) : (
                <Card className="border-destructive">
                   <CardHeader><CardTitle>Fallo en la Carga de Datos del Hito</CardTitle></CardHeader>
                   <CardContent><p>La información para este hito no se pudo cargar. Revisa los datos de depuración de arriba para identificar el problema.</p></CardContent>
                </Card>
            )}
        </main>
    );
}


export default function PedidoGastronomiaPage({ params }: { params: { id: string; briefingItemId: string } }) {
    if (!params || !params.id || !params.briefingItemId) {
        return <LoadingSkeleton title="Cargando..." />;
    }

    return <PedidoGastronomiaForm osId={params.id} briefingItemId={params.briefingItemId} />;
}
