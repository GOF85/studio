
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useMemo } from 'react';
import type { ArticuloCatering, Personal, Espacio } from '@/types';
import { PlusCircle, Menu, FileUp, FileDown, Database, Users, Package, Building, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

const bdNavLinks = [
    { title: 'Gestión de Personal', path: '/bd/personal', icon: Users },
    { title: 'Gestión de Espacios', path: '/bd/espacios', icon: Building },
    { title: 'Gestión de Artículos MICE', path: '/bd/articulos', icon: Package },
];

export default function BdLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    
    useEffect(() => {
        setIsMounted(true);
    }, [])

    const currentPage = useMemo(() => {
        return bdNavLinks.find(link => pathname.startsWith(link.path));
    }, [pathname]);

    if (!isMounted) {
        return <div className="h-screen w-full" />;
    }

    return (
        <>
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <Database className="h-5 w-5 text-muted-foreground"/>
                            <span className="text-muted-foreground">Bases de datos</span>
                            {currentPage && (
                                <>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                    <currentPage.icon className="h-5 w-5 text-muted-foreground"/>
                                    <span>{currentPage.title}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
             <main>
                {children}
            </main>
        </>
    );
}
