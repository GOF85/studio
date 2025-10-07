
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LifeBuoy, Users, Code, BookOpen, Workflow, Database, Bot, Factory, BarChart3, ShieldCheck, Package, Award, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const DOC_VERSION = "1.0.0";
const LAST_UPDATED = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

const cateringManualNav = [
    { title: 'Primeros Pasos', path: '/docs/user-manual#c1', icon: BookOpen },
    { title: 'Flujo Comercial y de Servicios', path: '/docs/user-manual#c2', icon: Workflow },
    { title: 'El Book Gastronómico', path: '/docs/user-manual#c3', icon: BookOpen },
    { title: 'Planificación y Producción (CPR)', path: '/docs/user-manual#c4', icon: Factory },
    { title: 'Gestión de Almacén', path: '/docs/user-manual#c5', icon: ShieldCheck },
    { title: 'Informes y Análisis', path: '/docs/user-manual#c6', icon: BarChart3 },
];

const entregasManualNav = [
    { title: 'Concepto General', path: '/docs/entregas-manual#c1', icon: BookOpen },
    { title: 'Creación de un Pedido de Entrega', path: '/docs/entregas-manual#c2', icon: Workflow },
    { title: 'Gestión de "Packs de Venta"', path: '/docs/entregas-manual#c3', icon: Package },
    { title: 'Producción y Portal del Partner', path: '/docs/entregas-manual#c4', icon: Factory },
    { title: 'Logística, Albaranes y Firma', path: '/docs/entregas-manual#c5', icon: ShieldCheck },
    { title: 'Análisis Financiero', path: '/docs/entregas-manual#c6', icon: BarChart3 },
];

const techDocsNav = [
    { title: 'Módulos Principales', path: '/docs/tech-docs#c1-tech', icon: Code },
    { title: 'Book Gastronómico', path: '/docs/tech-docs#c2-tech', icon: BookOpen },
    { title: 'Módulo de Producción (CPR)', path: '/docs/tech-docs#c3-tech', icon: Factory },
    { title: 'Módulo de Almacén', path: '/docs/tech-docs#c4-tech', icon: ShieldCheck },
    { title: 'Vertical de Entregas', path: '/docs/tech-docs#c5-tech', icon: Package },
    { title: 'Portales Externos', path: '/docs/tech-docs#c6-tech', icon: Users },
    { title: 'Funcionalidades Transversales', path: '/docs/tech-docs#c7-tech', icon: GitBranch },
];


export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isCateringManual = pathname.includes('/user-manual');
    const isEntregasManual = pathname.includes('/entregas-manual');
    const isTechDocs = pathname.includes('/tech-docs');

    let activeNav: { title: string; path: string; icon: React.ElementType; }[] = [];
    if (isCateringManual) activeNav = cateringManualNav;
    else if (isEntregasManual) activeNav = entregasManualNav;
    else if (isTechDocs) activeNav = techDocsNav;

    return (
        <>
            <div className="container mx-auto">
                <div className="grid lg:grid-cols-[280px_1fr] gap-12">
                    <aside className="lg:sticky top-20 self-start h-[calc(100vh-5rem)] hidden lg:block">
                        <ScrollArea className="h-full pr-6">
                            <div className="w-full">
                                <div className="pb-4">
                                    <h2 className="text-lg font-semibold tracking-tight mb-1">Documentación</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Versión: {DOC_VERSION} <br/>
                                        Última actualización: {LAST_UPDATED}
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-semibold text-primary mb-2">Guías Principales</h3>
                                        <nav className="space-y-1">
                                            <Link href="/docs/features" className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname === '/docs/features' && "bg-accent")}>
                                                <Award /> Propuesta de Valor
                                            </Link>
                                            <Link href="/docs/user-manual" className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname === '/docs/user-manual' && "bg-accent")}>
                                                <Users /> Manual de Catering
                                            </Link>
                                            <Link href="/docs/entregas-manual" className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname === '/docs/entregas-manual' && "bg-accent")}>
                                                <Package /> Manual de Entregas
                                            </Link>
                                            <Link href="/docs/tech-docs" className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname === '/docs/tech-docs' && "bg-accent")}>
                                                <Code /> Checklist de Funcionalidades
                                            </Link>
                                        </nav>
                                    </div>
                                {activeNav.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-primary mb-2 mt-6">Capítulos</h3>
                                        <nav className="space-y-1">
                                            {activeNav.map(item => (
                                                <Link key={item.title} href={item.path} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                                    <item.icon className="h-4 w-4" />
                                                    {item.title}
                                                </Link>
                                            ))}
                                        </nav>
                                    </div>
                                )}
                                </div>
                            </div>
                        </ScrollArea>
                    </aside>
                    <main className="py-8 prose prose-lg max-w-none">
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}
