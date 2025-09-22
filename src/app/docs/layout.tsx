'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LifeBuoy, Users, Code, BookOpen, Workflow, Database, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const DOC_VERSION = "0.1.0";
const LAST_UPDATED = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

const userManualNav = [
    { title: 'Primeros Pasos', path: '#c1', icon: BookOpen },
    { title: 'Flujo Comercial y de Servicios', path: '#c2', icon: Workflow },
    { title: 'El Book Gastronómico', path: '#c3', icon: BookHeart },
    { title: 'Planificación CPR y Producción', path: '#c4', icon: Factory },
];

const techDocsNav = [
    { title: 'Arquitectura General', path: '#c1-tech', icon: Code },
    { title: 'Modelo de Datos', path: '#c2-tech', icon: Database },
    { title: 'Flujos de IA', path: '#c3-tech', icon: Bot },
];


export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isUserManual = pathname.includes('/user-manual');
    const isTechDocs = pathname.includes('/tech-docs');

    const activeNav = isUserManual ? userManualNav : isTechDocs ? techDocsNav : [];

    return (
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
                                    <h3 className="text-sm font-semibold text-primary mb-2">Guías</h3>
                                     <nav className="space-y-1">
                                        <Link href="/docs/user-manual" className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname === '/docs/user-manual' && "bg-accent")}>
                                            <Users /> Manual de Usuario
                                        </Link>
                                         <Link href="/docs/tech-docs" className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground", pathname === '/docs/tech-docs' && "bg-accent")}>
                                            <Code /> Documentación Técnica
                                        </Link>
                                    </nav>
                                </div>
                               {activeNav.length > 0 && (
                                 <div>
                                    <h3 className="text-sm font-semibold text-primary mb-2 mt-6">Capítulos</h3>
                                     <nav className="space-y-1">
                                        {activeNav.map(item => (
                                            <Link key={item.title} href={item.path} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                                {item.icon && <item.icon />}
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
    );
}
