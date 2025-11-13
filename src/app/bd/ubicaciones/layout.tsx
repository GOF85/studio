
'use client';

import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, MapPin } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function UbicacionesLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="container mx-auto">
             <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <MapPin />
                        Gestión de Ubicaciones de Almacén
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Define las zonas específicas dentro de cada centro de producción.
                    </p>
                </div>
                 <Button asChild variant="outline">
                    <Link href="/bd/centros">
                        <Factory className="mr-2"/>Gestionar Centros
                    </Link>
                </Button>
             </div>
            <Suspense fallback={<LoadingSkeleton title="Cargando Ubicaciones..." />}>
                 {children}
            </Suspense>
        </div>
    )
}
