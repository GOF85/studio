"use client";

import React from 'react';
import { usePathname, useParams } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';

const modules = [];

export default function OSDetailsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || '';
    const params = useParams() as { numero_expediente?: string } | null;
    const osId = params?.numero_expediente || '';

    // DEBUG LOG
    React.useEffect(() => {
        console.debug('[OSDetailsLayout] Layout mounted/updated:', {
            osId,
            pathname,
        });
    }, [osId, pathname]);

    return (
        <div className="container mx-auto px-4">
            <main className="py-4">
                {children}
            </main>
        </div>
    );
}
