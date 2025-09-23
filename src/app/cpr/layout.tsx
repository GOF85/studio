'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Factory, ClipboardList, Package, ListChecks, History, CheckCircle, AlertTriangle, PackagePlus, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';

const cprNav = [
    { title: 'Planificación', href: '/cpr/planificacion', icon: ClipboardList, description: 'Agrega necesidades y genera O.F.' },
    { title: 'Órdenes de Fabricación', href: '/cpr/of', icon: Factory, description: 'Gestiona la producción en cocina.' },
    { title: 'Picking y Logística', href: '/cpr/picking', icon: Package, description: 'Prepara los pedidos para eventos.' },
    { title: 'Excedentes', href: '/cpr/excedentes', icon: PackagePlus, description: 'Gestiona el sobrante de producción.' },
    { title: 'Control de Calidad', href: '/cpr/calidad', icon: CheckCircle, description: 'Valida las elaboraciones.' },
    { title: 'Informe de Productividad', href: '/cpr/productividad', icon: BarChart3, description: 'Analiza los tiempos de producción.' },
    { title: 'Trazabilidad', href: '/cpr/trazabilidad', icon: History, description: 'Consulta lotes y su histórico.' },
    { title: 'Informe de Incidencias', href: '/cpr/incidencias', icon: AlertTriangle, description: 'Revisa las incidencias de producción.' },
];

export default function CprLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <>
        <Header />
        <div className="container mx-auto">
            <div className="grid lg:grid-cols-[250px_1fr] gap-12">
                <aside className="lg:sticky top-20 self-start h-[calc(100vh-5rem)] hidden lg:block">
                     <div className="w-full">
                        <div className="pb-4">
                            <h2 className="text-xl font-headline font-bold flex items-center gap-3"><Factory size={24}/>Panel de Producción</h2>
                            <p className="text-sm text-muted-foreground">
                                Gestión de Cocina y Logística
                            </p>
                        </div>
                        <nav className="grid items-start gap-1">
                            {cprNav.map((item, index) => (
                                <Link
                                    key={index}
                                    href={item.href}
                                >
                                    <span
                                        className={cn(
                                            "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                            pathname.startsWith(item.href) ? "bg-accent" : "transparent"
                                        )}
                                    >
                                        <item.icon className="mr-2 h-4 w-4" />
                                        <span>{item.title}</span>
                                    </span>
                                </Link>
                            ))}
                        </nav>
                    </div>
                </aside>
                <main className="py-8">
                    {children}
                </main>
            </div>
        </div>
        </>
    );
}
