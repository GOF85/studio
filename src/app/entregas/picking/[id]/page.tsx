
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks } from 'lucide-react';

export default function PickingEntregaPlaceholderPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    
    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-96">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-3"><ListChecks className="w-8 h-8"/> Hoja de Picking (En desarrollo)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Esta será la interfaz para que el personal de almacén realice el picking del pedido de entrega.</p>
                        <p className="text-sm mt-2">Hito ID: {id}</p>
                        <Button className="mt-4" onClick={() => router.back()}>Volver</Button>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
