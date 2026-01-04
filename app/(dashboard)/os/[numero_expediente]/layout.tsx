"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import osModules from '@/components/os/modules';
import OsModulesDialog from '@/components/os/OsModulesDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

    const modules = osModules;

export default function OSDetailsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || '';
    const params = useParams() as { numero_expediente?: string } | null;
    const osId = params?.numero_expediente || '';

    return (
        <div className="container mx-auto px-4">
            <main className="py-4">
                {children}
            </main>
        </div>
    );
}
