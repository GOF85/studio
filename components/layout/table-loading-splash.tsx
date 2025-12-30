'use client';

import React from 'react';
import { ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TableLoadingSplash({ 
    isLoading, 
    type = 'articulos' 
}: { 
    isLoading: boolean;
    type?: 'articulos' | 'entregas';
}) {
    const getMessage = () => {
        switch (type) {
            case 'entregas':
                return 'Cargando entregas...';
            case 'articulos':
            default:
                return 'Cargando artículos...';
        }
    };

    return (
        <div 
            className={cn(
                "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-all duration-500 ease-in-out",
                isLoading ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
            )}
        >
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700">
                <div className={cn(
                    "p-4 rounded-full mb-4 shadow-lg animate-bounce",
                    type === 'entregas' ? "bg-orange-100" : "bg-emerald-100"
                )}>
                    <ChefHat className={cn(
                        "w-16 h-16",
                        type === 'entregas' ? "text-orange-600" : "text-emerald-600"
                    )} />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                    MICE <span className={type === 'entregas' ? "text-orange-600" : "text-emerald-600"}>Catering</span>
                </h1>
                <p className="text-muted-foreground text-sm">
                    {getMessage()}
                </p>
            </div>
        </div>
    );
}
