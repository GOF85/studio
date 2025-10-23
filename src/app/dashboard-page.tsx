
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ClipboardList, BookHeart, Factory, Settings, Package, Warehouse, Users, Truck, LifeBuoy, BarChart3, Calendar } from 'lucide-react';
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
    }
];

const externalItems: MenuItem[] = [
    { 
        title: 'Portales Externos', 
        href: '/portal', 
        icon: Users, 
    },
];

const adminItems: MenuItem[] = [
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
    return (
        <section>
            <h2 className="text-2xl font-headline font-semibold tracking-tight mb-4">{title}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map(item => (
                    <Link href={item.href} key={item.href}>
                        <Card className={`hover:border-primary/80 hover:shadow-lg transition-all h-full ${item.className || ''}`}>
                            <CardHeader className="flex-row items-center gap-4">
                                <item.icon className="w-8 h-8 text-primary flex-shrink-0" />
                                <CardTitle>{item.title}</CardTitle>
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
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-headline font-bold tracking-tight">MICE Catering</h1>
            <p className="text-lg text-muted-foreground mt-2">Plataforma de gestión integral para catering.</p>
          </div>

          <div className="space-y-12">
            <Section title="Planificación" items={planningItems} />
            <Section title="Operaciones Centrales" items={coreOpsItems} />
            <Section title="Análisis y Reportes" items={reportingItems} />
            <Section title="Colaboradores" items={externalItems} />
            <Section title="Administración" items={adminItems} />
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
