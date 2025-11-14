'use client';

import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Archive } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Activity } from 'lucide-react';


export default function InventarioLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isMovimientos = pathname.includes('/movimientos');

    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
                        <Archive />
                        {isMovimientos ? 'Movimientos de Inventario' : 'Inventario de Materia Prima'}
                    </h1>
                </div>
                {!isMovimientos && (
                     <Link href="/cpr/inventario/movimientos">
                        <Button variant="outline">
                            <Activity className="mr-2"/>Ver Movimientos
                        </Button>
                    </Link>
                )}
             </div>
            <Suspense fallback={<LoadingSkeleton title="Cargando Inventario..." />}>
                 {children}
            </Suspense>
        </div>
    )
}