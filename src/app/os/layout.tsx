
'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Briefcase, Utensils, Wine, Leaf, Warehouse, Archive, Truck, Snowflake, DollarSign, FilePlus, Users, UserPlus, Flower2, ClipboardCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type NavLink = {
    href: string;
    title: string;
    icon: LucideIcon;
}

const navLinks: NavLink[] = [
    { href: '/os/comercial', title: 'Comercial', icon: Briefcase },
    { href: '/os/gastronomia', title: 'Gastronomía', icon: Utensils },
    { href: '/os/bodega', title: 'Bodega', icon: Wine },
    { href: '/os/hielo', title: 'Hielo', icon: Snowflake },
    { href: '/os/bio', title: 'Bio (Consumibles)', icon: Leaf },
    { href: '/os/almacen', title: 'Almacén', icon: Warehouse },
    { href: '/os/alquiler', title: 'Alquiler', icon: Archive },
    { href: '/os/decoracion', title: 'Decoración', icon: Flower2 },
    { href: '/os/atipicos', title: 'Atípicos', icon: FilePlus },
    { href: '/os/personal-mice', title: 'Personal MICE', icon: Users },
    { href: '/os/personal-externo', title: 'Personal Externo', icon: UserPlus },
    { href: '/os/transporte', title: 'Transporte', icon: Truck },
    { href: '/os/prueba-menu', title: 'Prueba de Menu', icon: ClipboardCheck },
    { href: '/os/cta-explotacion', title: 'Cta. Explotación', icon: DollarSign },
];

export default function OSLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const params = useParams();
    const osId = params.id as string;

    const getHref = (baseHref: string) => {
        if (!osId) return '/pes'; 
        return `${baseHref}/${osId}`;
    }

    return (
        <>
        <Header />
        <div className="container mx-auto">
            <div className="grid lg:grid-cols-[250px_1fr] gap-12">
                <aside className="lg:sticky top-20 self-start h-[calc(100vh-5rem)] hidden lg:block">
                     <div className="w-full">
                        <div className="pb-4">
                            <h2 className="text-xl font-headline font-bold">Módulos del Servicio</h2>
                            <p className="text-sm text-muted-foreground">
                                Gestión de la Orden de Servicio
                            </p>
                        </div>
                        <nav className="grid items-start gap-1">
                            {navLinks.map((item, index) => (
                                <Link
                                    key={index}
                                    href={getHref(item.href)}
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
