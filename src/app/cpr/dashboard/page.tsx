
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cprNav } from '@/lib/cpr-nav';
import { Separator } from '@/components/ui/separator';
import { Factory } from 'lucide-react';

const workflowSections = {
  planificar: {
    title: '1. Planificar',
    description: '¿Qué tenemos que producir?',
    modules: ['Planificación y OFs', 'Solicitudes de Personal']
  },
  ejecutar: {
    title: '2. Ejecutar',
    description: 'Manos a la obra.',
    modules: ['Taller de Producción', 'Picking y Logística', 'Control de Calidad']
  },
  analizar: {
    title: '3. Analizar y Supervisar',
    description: '¿Cómo vamos y qué ha pasado?',
    modules: ['Stock Elaboraciones', 'Productividad', 'Informe de Picking', 'Trazabilidad', 'Incidencias']
  }
};

function WorkflowSection({ title, description, modules }: { title: string, description: string, modules: typeof cprNav }) {
    if (modules.length === 0) return null;
    return (
        <div className="space-y-4">
             <div>
                <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link href={item.href} key={item.href}>
                            <Card className="hover:bg-accent transition-colors h-full">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3 text-base">
                                        <Icon className="h-5 w-5" />
                                        {item.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">{item.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

export default function CprDashboardPage() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <LoadingSkeleton title="Cargando Panel de control de Producción..." />;
    }

    return (
        <main>
             <div className="flex items-center gap-4 mb-8">
                <Factory className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="text-4xl font-headline font-bold tracking-tight">Panel de Producción</h1>
                    <p className="text-lg text-muted-foreground mt-1">Visión general del flujo de trabajo en el Centro de Producción.</p>
                </div>
            </div>
            <div className="space-y-8">
                <WorkflowSection 
                    title={workflowSections.planificar.title}
                    description={workflowSections.planificar.description}
                    modules={cprNav.filter(item => workflowSections.planificar.modules.includes(item.title))}
                />
                <Separator />
                 <WorkflowSection 
                    title={workflowSections.ejecutar.title}
                    description={workflowSections.ejecutar.description}
                    modules={cprNav.filter(item => workflowSections.ejecutar.modules.includes(item.title))}
                />
                <Separator />
                <WorkflowSection 
                    title={workflowSections.analizar.title}
                    description={workflowSections.analizar.description}
                    modules={cprNav.filter(item => workflowSections.analizar.modules.includes(item.title))}
                />
            </div>
        </main>
    );
}
