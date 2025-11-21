
'use client';

import { FilePlus } from 'lucide-react';
import { OsContextProvider } from '../os-context';

export default function AtipicosLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
        <OsContextProvider>
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><FilePlus />Módulo de Atípicos</h1>
                </div>
             </div>
            {children}
        </div>
        </OsContextProvider>
    )
}

