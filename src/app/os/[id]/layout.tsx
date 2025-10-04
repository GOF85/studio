
'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Briefcase, Utensils, Wine, Leaf, Warehouse, Archive, Truck, Snowflake, DollarSign, FilePlus, Users, UserPlus, Flower2, ClipboardCheck, PanelLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSidebarStore } from '@/hooks/use-sidebar-store';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
    const { isCollapsed, toggleSidebar } = useSidebarStore();

    return (
        <div className="container mx-auto">
            <div className={cn("grid gap-2 transition-all duration-300", isCollapsed ? "lg:grid-cols-[60px_1fr] lg:gap-2" : "lg:grid-cols-[220px_1fr]")}>
                <aside className="lg:sticky top-20 self-start h-[calc(100vh-5rem)] hidden lg:block">
                     <div className="w-full">
                        <div className={cn("pb-2 flex items-center", isCollapsed ? 'justify-center' : 'justify-between')}>
                             <div className={cn(isCollapsed && 'hidden')}>
                                <h2 className="text-lg font-semibold tracking-tight">Módulos</h2>
                                <p className="text-sm text-muted-foreground">
                                    Gestión de la OS
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                                <PanelLeft className="h-5 w-5" />
                            </Button>
                        </div>
                        <nav className="grid items-start gap-1">
                            {navLinks.map((item, index) => {
                                const href = `/os/${osId}/${item.path}`;
                                return (
                                <Tooltip key={index} delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Link href={href}>
                                            <span
                                                className={cn(
                                                    "group flex items-center rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                                    pathname === href ? "bg-accent" : "transparent",
                                                    isCollapsed && "justify-center"
                                                )}
                                            >
                                                <item.icon className={cn("mr-1 transition-all", isCollapsed ? 'h-6 w-6' : 'h-4 w-4')} />
                                                <span className={cn(isCollapsed && 'hidden')}>{item.title}</span>
                                            </span>
                                        </Link>
                                    </TooltipTrigger>
                                    {isCollapsed && (
                                        <TooltipContent side="right">
                                            <p>{item.title}</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
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
