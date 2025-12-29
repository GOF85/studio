'use client';

import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface PageLoadingIndicatorProps {
    message?: string;
    progress?: number;
    variant?: 'bar' | 'skeleton';
}

export function PageLoadingIndicator({
    message = 'Cargando...',
    progress,
    variant = 'skeleton'
}: PageLoadingIndicatorProps) {
    if (variant === 'bar') {
        return (
            <div className="relative">
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-md space-y-4 px-4">
                        <ProgressBar progress={progress} />
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">{message}</p>
                            {progress !== undefined && (
                                <p className="text-xs text-muted-foreground mt-1">{Math.round(progress)}%</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <ProgressBar progress={progress} />
            <main className="container mx-auto px-4 py-8 animate-pulse">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Skeleton className="h-8 w-48 mb-3" />
                        <Skeleton className="h-5 w-64" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>

                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/3" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    </CardContent>
                </Card>

                {message && (
                    <div className="fixed bottom-4 right-4 bg-background border rounded-md px-4 py-2 shadow-lg">
                        <p className="text-sm text-muted-foreground">{message}</p>
                    </div>
                )}
            </main>
        </>
    );
}
