
'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Briefcase, Utensils, Wine, Leaf, Warehouse, Archive, Truck, Snowflake, DollarSign, FilePlus, Users, UserPlus, Flower2, ClipboardCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type NavLink = {
    path: string;
    title: string;
    icon: LucideIcon;
}

const navLinks: NavLink[] = [
    { path: 'comercial', title: 'Comercial', icon: Briefcase },
    { path: 'gastronomia', title: 'Gastronomía', icon: Utensils },
    { path: 'bodega', title: 'Bodega', icon: Wine },
    { path: 'hielo', title: 'Hielo', icon: Snowflake },
    { path: 'bio', title: 'Bio (Consumibles)', icon: Leaf },
    { path: 'almacen', title: 'Almacén', icon: Warehouse },
    { path: 'alquiler', title: 'Alquiler', icon: Archive },
    { path: 'decoracion', title: 'Decoración', icon: Flower2 },
    { path: 'atipicos', title: 'Atípicos', icon: FilePlus },
    { path: 'personal-mice', title: 'Personal MICE', icon: Users },
    { path: 'personal-externo', title: 'Personal Externo', icon: UserPlus },
    { path: 'transporte', title: 'Transporte', icon: Truck },
    { path: 'prueba-menu', title: 'Prueba de Menu', icon: ClipboardCheck },
    { path: 'cta-explotacion', title: 'Cta. Explotación', icon: DollarSign },
];

export default function OSDetailsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const params = useParams();
    const osId = params.id as string;

    return (
        <div className="container mx-auto">
            <div className="grid lg:grid-cols-[220px_1fr] gap-8">
                <aside className="lg:sticky top-20 self-start h-[calc(100vh-5rem)] hidden lg:block">
                     <div className="w-full">
                        <div className="pb-4">
                            <h2 className="text-lg font-semibold tracking-tight">Módulos del Servicio</h2>
                            <p className="text-sm text-muted-foreground">
                                Gestión de la Orden de Servicio
                            </p>
                        </div>
                        <nav className="grid items-start gap-1">
                            {navLinks.map((item, index) => {
                                const href = `/os/${osId}/${item.path}`;
                                return (
                                <Link
                                    key={index}
                                    href={href}
                                >
                                    <span
                                        className={cn(
                                            "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                            pathname === href ? "bg-accent" : "transparent"
                                        )}
                                    >
                                        <item.icon className="mr-2 h-4 w-4" />
                                        <span>{item.title}</span>
                                    </span>
                                </Link>
                            )})}
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
