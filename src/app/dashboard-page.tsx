
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ClipboardList, BookHeart, Factory, Settings, Package, Warehouse, Users, Truck, LifeBuoy, BarChart3, Calendar, AreaChart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type MenuItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    className?: string;
}

const planningItems: MenuItem[] = [
    { 
        title: 'Previsión de Servicios', 
        href: '/pes', 
        icon: ClipboardList, 
    },
    {
        title: 'Calendario de Servicios',
        href: '/calendario',
        icon: Calendar,
    },
    {
        title: 'Entregas MICE',
        href: '/entregas',
        icon: Truck,
        className: "theme-orange"
    },
];

const coreOpsItems: MenuItem[] = [
    { 
        title: 'Book Gastronómico', 
        href: '/book', 
        icon: BookHeart, 
    },
    { 
        title: 'Producción (CPR)', 
        href: '/cpr', 
        icon: Factory, 
    },
    { 
        title: 'Almacén', 
        href: '/almacen', 
        icon: Warehouse, 
    },
];

const reportingItems: MenuItem[] = [
    {
        title: 'Analítica',
        href: '/analitica',
        icon: BarChart3,
    },
     { 
        title: 'Control de Explotación', 
        href: '/control-explotacion', 
        icon: AreaChart, 
    },
];

const adminItems: MenuItem[] = [
     { 
        title: 'Recursos Humanos', 
        href: '/rrhh', 
        icon: Users, 
    },
    { 
        title: 'Portales Externos', 
        href: '/portal', 
        icon: Users, 
    },
    { 
        title: 'Bases de Datos', 
        href: '/bd', 
        icon: Package, 
    },
     { 
        title: 'Configuración', 
        href: '/configuracion', 
        icon: Settings, 
    },
];

export function Section({ title, items }: { title: string, items: MenuItem[] }) {
    if (items.length === 0) return null;
    return (
        <section>
            <h2 className="text-xl font-headline font-semibold tracking-tight mb-3">{title}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(item => (
                    <Link href={item.href} key={item.href}>
                        <Card className={`hover:border-primary/80 hover:shadow-md transition-all h-full ${item.className || ''}`}>
                            <CardHeader className="flex-row items-center gap-3 p-4">
                                <item.icon className="w-6 h-6 text-primary flex-shrink-0" />
                                <CardTitle className="text-base">{item.title}</CardTitle>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </section>
    )
}

export function DashboardPage() {
  return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow container mx-auto px-4 py-6">
          <div className="space-y-8">
            <Section title="Planificación" items={planningItems} />
            <Section title="Operaciones Centrales" items={coreOpsItems} />
            <Section title="Análisis y Reportes" items={reportingItems} />
            <Section title="Administración y Colaboradores" items={adminItems} />
          </div>
        </main>
        <footer className="py-4 border-t mt-auto">
          <div className="container mx-auto text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} MICE Catering. Todos los derechos reservados.
          </div>
        </footer>
      </div>
  );
}
