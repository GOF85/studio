
'use client';

import { useDataStore } from '@/hooks/use-data-store';
import { Progress } from '../ui/progress';
import { Factory } from 'lucide-react';

export function LoadingScreen() {
    const { loadingMessage, loadingProgress } = useDataStore();

    return (
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
            <div className="w-full max-w-md text-center space-y-4">
                <Factory className="mx-auto h-12 w-12 text-primary animate-pulse" />
                <h1 className="text-2xl font-headline font-semibold">Cargando MICE Catering...</h1>
                <div className="space-y-2">
                    <Progress value={loadingProgress} />
                    <p className="text-sm text-muted-foreground">{loadingMessage}</p>
                </div>
