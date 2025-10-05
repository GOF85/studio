
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Warehouse, ClipboardList, ListChecks, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

const almacenNav = [
    { title: 'Planificación', href: '/almacen/planificacion', icon: ClipboardList },
    { title: 'Gestión de Picking', href: '/almacen/picking', icon: ListChecks },
    { title: 'Gestión de Retornos', href: '/almacen/retornos', icon: History },
];

export default function AlmacenLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    return (
        <div className="container mx-auto">
            <div className="grid lg:grid-cols-[250px_1fr] gap-12">
                <aside className="lg:sticky top-20 self-start h-[calc(100vh-5rem)] hidden lg:block">
                     <div className="w-full">
                        <div className="pb-4 mb-4 border-b">
                            <h2 className="text-xl font-headline font-bold flex items-center gap-3"><Warehouse size={24}/>Panel de Almacén</h2>
                            <p className="text-sm text-muted-foreground">
                                Logística de material y expediciones.
                            </p>
                        </div>
                        <nav className="grid items-start gap-1">
                            {almacenNav.map((item, index) => (
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
    );
}
