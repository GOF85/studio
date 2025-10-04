
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Briefcase, Utensils, Wine, Leaf, Warehouse, Archive, Truck, Snowflake, Flower2, FilePlus, Users, UserPlus, DollarSign, ClipboardCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type NavLink = {
    href: string;
    title: string;
    icon: LucideIcon;
}

const navLinks: NavLink[] = [
    { href: 'comercial', title: 'Comercial', icon: Briefcase },
    { href: 'gastronomia', title: 'Gastronomía', icon: Utensils },
    { href: 'bodega', title: 'Bodega', icon: Wine },
    { href: 'hielo', title: 'Hielo', icon: Snowflake },
    { href: 'bio', title: 'Bio (Consumibles)', icon: Leaf },
    { href: 'almacen', title: 'Almacén', icon: Warehouse },
    { href: 'alquiler', title: 'Alquiler', icon: Archive },
    { href: 'decoracion', title: 'Decoración', icon: Flower2 },
    { href: 'atipicos', title: 'Atípicos', icon: FilePlus },
    { href: 'personal-mice', title: 'Personal MICE', icon: Users },
    { href: 'personal-externo', title: 'Personal Externo', icon: UserPlus },
    { href: 'transporte', title: 'Transporte', icon: Truck },
    { href: 'prueba-menu', title: 'Prueba de Menu', icon: ClipboardCheck },
    { href: 'cta-explotacion', title: 'Cta. Explotación', icon: DollarSign },
];

export default function OSLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const osId = searchParams.get('osId');

    const getHref = (baseHref: string) => {
        if (!osId) return '/pes'; // Fallback a la lista de OS si no hay ID
        if (baseHref === 'personal-mice') return `/personal-mice/${osId}`;
        return `/${baseHref}?osId=${osId}`;
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
                                            pathname.startsWith(`/${item.href}`) || (item.href === 'personal-mice' && pathname.startsWith('/personal-mice')) ? "bg-accent" : "transparent"
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
