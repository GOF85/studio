
'use client';

import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory } from 'lucide-react';

export default function CentrosLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="container mx-auto">
             <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Factory />
                        Gestión de Centros de Producción
                    </CardTitle>
                    <CardDescription>
                        Define los almacenes, cocinas centrales o satélite de tu organización. Cada centro tendrá sus propias ubicaciones de almacenaje.
                    </CardDescription>
                </CardHeader>
             </Card>
            <Suspense fallback={<LoadingSkeleton title="Cargando Centros..." />}>
                 {children}
            </Suspense>
        </div>
    )
}
