
'use client';

import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

export default function CentrosLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="container mx-auto">
             <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <Factory />
                        Gestión de Centros y Ubicaciones
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Define los almacenes, cocinas centrales o satélite y luego organiza sus ubicaciones internas (pasillos, estanterías, cámaras).
                    </p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/bd/ubicaciones">
                        <MapPin className="mr-2"/>Ver todas las ubicaciones
                    </Link>
                </Button>
             </div>
            <Suspense fallback={<LoadingSkeleton title="Cargando Centros..." />}>
                 {children}
            </Suspense>
        </div>
    )
}
