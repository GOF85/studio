'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Database, X } from 'lucide-react';
import { isMigrationNeeded } from '@/lib/migrate-localStorage';

/**
 * Migration Banner Component
 * Shows a notification if user has data in localStorage that can be migrated
 * Can be dismissed and won't show again for 7 days
 */
export function MigrationBanner() {
    const [showBanner, setShowBanner] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Check if banner was dismissed
        const dismissed = localStorage.getItem('migration_banner_dismissed');
        if (dismissed) {
            const dismissedDate = new Date(dismissed);
            const now = new Date();
            const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

            // Show again after 7 days
            if (daysSinceDismissed < 7) {
                setIsChecking(false);
                return;
            }
        }

        // Check if migration is needed
        const needed = isMigrationNeeded();
        setShowBanner(needed);
        setIsChecking(false);
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('migration_banner_dismissed', new Date().toISOString());
        setShowBanner(false);
    };

    if (isChecking || !showBanner) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-md">
            <Alert className="bg-blue-50 border-blue-200 shadow-lg">
                <Database className="h-4 w-4 text-blue-600" />
                <AlertDescription className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <p className="font-semibold text-blue-900 mb-1">
                            Migración de Datos Disponible
                        </p>
                        <p className="text-sm text-blue-800 mb-3">
                            Tienes datos en tu navegador que pueden ser migrados a Supabase para mayor seguridad.
                        </p>
                        <div className="flex gap-2">
                            <Link href="/migration">
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                    Migrar Ahora
                                </Button>
                            </Link>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleDismiss}
                                className="border-blue-300"
                            >
                                Recordar después
                            </Button>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={handleDismiss}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    );
}
