"use client";

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function OSDetailsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="container mx-auto px-4">
            <main className="py-4">
                {children}
            </main>
        </div>
    );
}
