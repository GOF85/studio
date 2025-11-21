'use client';

import { Leaf } from 'lucide-react';
import { useOsData } from '../os-context';

export default function BioLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    const { serviceOrder } = useOsData();
    return (
        <div>
             <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-headline font-bold flex items-center gap-3"><Leaf />Módulo de Bio (Consumibles)</h1>
                   <div className="text-muted-foreground mt-2 space-y-1">
                      <p>OS: {serviceOrder?.serviceNumber} - {serviceOrder?.client}</p>
                  </div>
                </div>
             </div>
            {children}
        </div>
    )
}
