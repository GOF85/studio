'use client';

import React, { useEffect, useState } from 'react';
import { ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';

// CAMBIO AQUÍ: Añadido "default"
export default function SplashScreen() {
    const [show, setShow] = useState(true);
    const [opacity, setOpacity] = useState(100);

    useEffect(() => {
        const hasShown = sessionStorage.getItem('splash-shown');
        
        if (hasShown) {
            setShow(false);
            return;
        }

        const timer = setTimeout(() => {
            setOpacity(0);
            setTimeout(() => {
                setShow(false);
                sessionStorage.setItem('splash-shown', 'true');
            }, 500); 
        }, 2000); 

        return () => clearTimeout(timer);
    }, []);

    if (!show) return null;

    return (
        <div 
            className={cn(
                "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ease-in-out",
                opacity === 0 ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
        >
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700">
                <div className="p-4 bg-emerald-100 rounded-full mb-4 shadow-lg animate-bounce">
                    <ChefHat className="w-16 h-16 text-emerald-600" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    MICE <span className="text-emerald-600">Catering</span>
                </h1>
            </div>
        </div>
    );
}