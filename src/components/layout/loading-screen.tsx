
'use client';

import { Factory } from 'lucide-react';
import { Progress } from '../ui/progress';

export function LoadingScreen() {
    return (
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
            <div className="w-full max-w-md text-center space-y-4">
                <Factory className="mx-auto h-12 w-12 text-primary animate-pulse" />
                <h1 className="text-2xl font-headline font-semibold">Cargando MICE Catering...</h1>
                <p className="text-sm text-muted-foreground">Por favor, espera un momento.</p>
            </div>
        </div>
    );
}
