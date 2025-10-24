
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { ServiceOrder, ComercialBriefing, ComercialBriefingItem } from '@/types';

// Este es un componente de depuración para identificar por qué la página no se renderiza.
// Muestra la información más básica que puede obtener.

export default function PedidoGastronomiaDebugPage() {
    const router = useRouter();
    const params = useParams();
    const [error, setError] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    
    // Extraemos los IDs de forma segura
    const osId = params?.id as string | undefined;
    const briefingItemId = params?.briefingItemId as string | undefined;

    const [debugData, setDebugData] = useState<{
        os: ServiceOrder | null,
        briefing: ComercialBriefing | null,
        hito: ComercialBriefingItem | null
    }>({ os: null, briefing: null, hito: null });

    useEffect(() => {
        setIsMounted(true);
        if (osId && briefingItemId) {
            try {
                const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
                const currentOS = allServiceOrders.find(o => o.id === osId) || null;
                
                const allBriefings = JSON.parse(localStorage.getItem('comercialBriefings') || '[]') as ComercialBriefing[];
                const currentBriefing = allBriefings.find(b => b.osId === osId) || null;
                
                const currentHito = currentBriefing?.items.find(item => item.id === briefingItemId) || null;

                setDebugData({
                    os: currentOS,
                    briefing: currentBriefing,
                    hito: currentHito
                });

            } catch (e: any) {
                setError(`Error al leer desde localStorage: ${e.message}`);
            }
        } else {
            setError("No se encontraron los IDs necesarios (osId, briefingItemId) en la URL.");
        }
    }, [osId, briefingItemId]);

    if (!isMounted) {
        // Este esqueleto debería aparecer si el componente al menos se monta
        return <LoadingSkeleton title="Iniciando componente de depuración..." />;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2" /> Volver
                </Button>
            </div>
            <Card className="bg-yellow-50 border-yellow-300">
                <CardHeader>
                    <CardTitle>PÁGINA DE DEPURACIÓN</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 font-mono text-xs">
                    <p>Si ves esto, el componente SE HA RENDERIZADO. Ahora podemos ver qué datos está recibiendo.</p>
                    
                    <div>
                        <h3 className="font-bold text-base mb-1">Parámetros de la URL:</h3>
                        <pre className="p-2 bg-background rounded-md">
                            {JSON.stringify({ osId, briefingItemId }, null, 2)}
                        </pre>
                    </div>

                    {error && (
                        <div>
                            <h3 className="font-bold text-base mb-1 text-destructive">Error Capturado:</h3>
                            <pre className="p-2 bg-destructive/10 text-destructive rounded-md">{error}</pre>
                        </div>
                    )}
                    
                    <div>
                        <h3 className="font-bold text-base mb-1">ServiceOrder Encontrada:</h3>
                        <pre className="p-2 bg-background rounded-md max-h-40 overflow-y-auto">
                            {JSON.stringify(debugData.os, null, 2) || "null"}
                        </pre>
                    </div>

                     <div>
                        <h3 className="font-bold text-base mb-1">Briefing Encontrado:</h3>
                        <pre className="p-2 bg-background rounded-md max-h-40 overflow-y-auto">
                           {JSON.stringify(debugData.briefing, null, 2) || "null"}
                        </pre>
                    </div>
                    
                    <div>
                        <h3 className="font-bold text-base mb-1">Hito Encontrado:</h3>
                        <pre className="p-2 bg-background rounded-md max-h-40 overflow-y-auto">
                            {JSON.stringify(debugData.hito, null, 2) || "null"}
                        </pre>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
