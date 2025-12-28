
"use client";
import { supabase } from '@/lib/supabase';
import { useEvento } from '@/hooks/use-data-queries';

import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectiveDisplay } from '@/components/os/objective-display';
import { Briefcase, Utensils, Wine, Leaf, Warehouse, Archive, Truck, Snowflake, Euro, FilePlus, Users, UserPlus, Flower2, ClipboardCheck, PanelLeft, Building, FileText, Star, Menu, ClipboardList, Calendar, LayoutDashboard, Phone, ChevronRight, FilePenLine } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';


type NavLink = {
    path: string;
    title: string;
    icon: LucideIcon;
    moduleName?: Parameters<typeof ObjectiveDisplay>[0]['moduleName'];
}


// Nueva estructura de navegación agrupada en 4 contenedores
const navGroups = [
    {
        label: 'OS',
        items: [
            { path: 'info', title: 'Información OS', icon: FileText },
            { path: 'comercial', title: 'Comercial', icon: Briefcase },
            { path: 'cta-explotacion', title: 'Cta. Explotación', icon: Euro },
        ],
    },
    {
        label: 'Pedidos',
        items: [
            { path: 'gastronomia', title: 'Gastronomía', icon: Utensils, moduleName: 'gastronomia' },
            { path: 'bodega', title: 'Bebida', icon: Wine, moduleName: 'bodega' },
            { path: 'hielo', title: 'Hielo', icon: Snowflake },
            { path: 'bio', title: 'Bio (Consumibles)', icon: Leaf, moduleName: 'bio' },
            { path: 'almacen', title: 'Almacén', icon: Warehouse, moduleName: 'almacen' },
            { path: 'alquiler', title: 'Alquiler', icon: Archive, moduleName: 'alquiler' },
            { path: 'decoracion', title: 'Decoración', icon: Flower2, moduleName: 'decoracion' },
            { path: 'transporte', title: 'Transporte', icon: Truck, moduleName: 'transporte' },
            { path: 'logistica', title: 'Logística', icon: ClipboardList },
            { path: 'atipicos', title: 'Atípicos', icon: FilePlus, moduleName: 'atipicos' },
        ],
    },
    {
        label: 'Equipo',
        items: [
            { path: 'personal-mice', title: 'Personal MICE', icon: Users, moduleName: 'personalMice' },
            { path: 'personal-externo', title: 'Personal Externo', icon: UserPlus, moduleName: 'personalExterno' },
        ],
    },
    {
        label: 'Prueba de menú',
        items: [
            { path: 'prueba-menu', title: 'Prueba de Menú', icon: ClipboardCheck, moduleName: 'costePruebaMenu' },
        ],
    },
];

// Para compatibilidad con la lógica actual de OsHeaderContent
const navLinks = navGroups.flatMap(g => g.items) as NavLink[];

const getInitials = (name: string) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}


function OsHeaderContent({ osId }: { osId: string }) {
    const pathname = usePathname();
    // Si osId es un número de expediente, buscar el id real
    const [realId, setRealId] = useState<string>(osId);
    useEffect(() => {
        if (osId && osId.match(/^[0-9]{4,}-[0-9]+$/)) {
            (async () => {
                const { data, error } = await supabase
                    .from('eventos')
                    .select('id')
                    .eq('numero_expediente', osId)
                    .single();
                if (!error && data?.id) setRealId(data.id);
            })();
        } else {
            setRealId(osId);
        }
    }, [osId]);
    const { data: serviceOrder, isLoading } = useEvento(realId);

    const { currentModule, isSubPage } = useMemo(() => {
        const pathSegments = (pathname ?? '').split('/').filter(Boolean);
        const osIndex = pathSegments.indexOf('os');
        const moduleSegment = pathSegments[osIndex + 2];
        const subPageSegment = pathSegments[osIndex + 3];
        const module = navLinks.find(link => link.path === moduleSegment);
        if (module) {
            return { currentModule: module, isSubPage: !!subPageSegment };
        }
        if (moduleSegment === 'info' || !moduleSegment) {
            return { currentModule: { title: 'Información OS', icon: FileText, path: 'info' }, isSubPage: false };
        }
        return { currentModule: { title: 'Panel de Control', icon: LayoutDashboard, path: '' }, isSubPage: false };
    }, [pathname]);

    if (isLoading || !serviceOrder) {
        return (
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-32" />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Skeleton className="h-6 w-36" />
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-md h-9">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-5 w-1/4" />
                </div>
            </div>
        );
    }

    const durationDays = serviceOrder.startDate && serviceOrder.endDate ? differenceInDays(new Date(serviceOrder.endDate), new Date(serviceOrder.startDate)) + 1 : 0;
    const responsables = [
        { label: 'Comercial', name: serviceOrder.comercial },
        { label: 'Metre', name: serviceOrder.respMetre },
        { label: 'PM', name: serviceOrder.respProjectManager },
        { label: 'Pase', name: serviceOrder.respPase },
    ].filter(r => r.name);

    // Responsive: Desktop (3 columns) y Mobile (acordeón)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    // Link a Google Maps si hay dirección
    const mapsUrl = serviceOrder.spaceAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(serviceOrder.spaceAddress)}` : null;

    // Desglose de pax si existe
    const paxLabel = serviceOrder.asistentes ? `${serviceOrder.asistentes} pax` : '';

    return (
        <TooltipProvider>
            {!isMobile ? (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        {/* Columna 1: Identidad */}
                        <div className="flex items-center gap-3">
                            <Link href={`/os/${serviceOrder.serviceNumber || osId}`} className="flex items-center gap-2 group">
                                <div className={cn(
                                    "p-2 rounded-xl transition-all duration-300 shadow-inner",
                                    serviceOrder.isVip
                                        ? "bg-black/20 text-black group-hover:bg-black group-hover:text-amber-400"
                                        : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
                                )}>
                                    <ClipboardList className="h-4 w-4" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {serviceOrder.isVip && <Star className="h-4 w-4 fill-black text-black" />}
                                    <span className={cn(
                                        "font-black tracking-tighter text-lg transition-colors",
                                        serviceOrder.isVip ? "text-black" : "text-foreground group-hover:text-primary"
                                    )}>
                                        {serviceOrder.serviceNumber}
                                    </span>
                                </div>
                            </Link>
                            <div className={cn("h-4 w-[1px] mx-1", serviceOrder.isVip ? "bg-black/20" : "bg-border/40")} />
                            <span className={cn(
                                "text-sm font-bold",
                                serviceOrder.isVip ? "text-black/70" : "text-muted-foreground/80"
                            )}>{serviceOrder.client}</span>
                        </div>
                        {/* Columna 2: Logística */}
                        <div className="flex items-center gap-4">
                            {serviceOrder.startDate && serviceOrder.endDate && (
                                <div className={cn(
                                    "inline-flex items-center gap-2 px-3 py-1 rounded-full",
                                    serviceOrder.isVip ? "bg-black/10 border-black/10 text-black" : "bg-blue-500/5 border border-blue-500/10 text-blue-700"
                                )}>
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span className="text-xs font-bold">{format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')} - {format(new Date(serviceOrder.endDate), 'dd/MM/yyyy')}</span>
                                    {durationDays > 0 && <Badge variant="secondary" className={cn("h-4 px-1.5 text-[9px] font-black border-none", serviceOrder.isVip ? "bg-black/20 text-black" : "bg-blue-500/10 text-blue-700")}>{durationDays}D</Badge>}
                                </div>
                            )}
                            {serviceOrder.space && (
                                <div className={cn(
                                    "inline-flex items-center gap-2 px-3 py-1 rounded-full border",
                                    serviceOrder.isVip ? "bg-black/10 border-black/10 text-black" : "bg-muted/50 border-border/40 text-muted-foreground"
                                )}>
                                    <Building className="h-3.5 w-3.5" />
                                    {mapsUrl ? (
                                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={cn("text-xs font-bold transition-colors", serviceOrder.isVip ? "hover:text-white" : "hover:text-primary")}>{serviceOrder.space}</a>
                                    ) : (
                                        <span className="text-xs font-bold">{serviceOrder.space}</span>
                                    )}
                                </div>
                            )}
                            {serviceOrder.asistentes && (
                                <div className={cn(
                                    "inline-flex items-center gap-2 px-3 py-1 rounded-full",
                                    serviceOrder.isVip ? "bg-black/10 border-black/10 text-black" : "bg-blue-500/5 border border-blue-500/10 text-blue-700"
                                )}>
                                    <Users className="h-3.5 w-3.5" />
                                    <span className="text-xs font-black tracking-tight">{paxLabel}</span>
                                </div>
                            )}
                        </div>
                        {/* Columna 3: Equipo */}
                        <div className="flex items-center gap-2">
                            {responsables.map(resp => (
                                <Tooltip key={resp.label}>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1.5 cursor-help group">
                                            <Avatar className={cn(
                                                "h-7 w-7 border-2 border-background shadow-sm transition-all",
                                                serviceOrder.isVip ? "border-black/20 group-hover:border-black" : "group-hover:border-primary/30"
                                            )}>
                                                <AvatarFallback className={cn(
                                                    "text-[10px] font-black",
                                                    serviceOrder.isVip ? "bg-black text-amber-400" : "bg-primary/5 text-primary"
                                                )}>{getInitials(resp.name || '')}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="rounded-xl border-border/40 shadow-2xl p-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">{resp.label}</p>
                                        <p className="text-xs font-bold">{resp.name}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                // Mobile: acordeón colapsable
                <details className={cn(
                    "w-full rounded-xl overflow-hidden px-3 py-1 transition-all",
                    serviceOrder.isVip ? "bg-black/5" : ""
                )}>
                    <summary className="flex items-center justify-between py-2 cursor-pointer font-semibold outline-none group">
                        <div className="flex items-center gap-2">
                            {serviceOrder.isVip && <Star className="h-4 w-4 fill-black text-black" />}
                            <span className={cn("text-sm font-black tracking-tight", serviceOrder.isVip ? "text-black" : "")}>{serviceOrder.serviceNumber}</span>
                            <span className={cn("text-xs opacity-60", serviceOrder.isVip ? "text-black" : "")}>•</span>
                            <span className={cn("text-xs font-bold", serviceOrder.isVip ? "text-black/80" : "text-muted-foreground")}>{serviceOrder.client}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="flex flex-col gap-3 pb-3 pt-1 text-sm border-t border-black/5 mt-1">
                        <div className="grid grid-cols-2 gap-2">
                            {serviceOrder.startDate && (
                                <div className="flex items-center gap-2 text-[11px] font-medium opacity-70">
                                    <Calendar className="h-3 w-3" />
                                    <span>{format(new Date(serviceOrder.startDate), 'dd/MM/yyyy')}</span>
                                </div>
                            )}
                            {serviceOrder.asistentes && (
                                <div className="flex items-center gap-2 text-[11px] font-medium opacity-70">
                                    <Users className="h-3 w-3" />
                                    <span>{paxLabel}</span>
                                </div>
                            )}
                        </div>
                        {serviceOrder.space && (
                            <div className="flex items-center gap-2 text-xs font-bold">
                                <Building className="h-3.5 w-3.5" />
                                {mapsUrl ? (
                                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{serviceOrder.space}</a>
                                ) : (
                                    <span>{serviceOrder.space}</span>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                            {responsables.map(resp => (
                                <Tooltip key={resp.label}>
                                    <TooltipTrigger asChild>
                                        <Avatar className="h-6 w-6 border border-background shadow-sm">
                                            <AvatarFallback className="text-[9px] font-black">{getInitials(resp.name || '')}</AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-[10px]">{resp.label}: {resp.name}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                </details>
            )}
        </TooltipProvider>
    );
}

export default function OSDetailsLayout({ children }: { children: React.ReactNode }) {
    const params = useParams() ?? {};
    const pathname = usePathname() ?? '';
    const osId = (params.numero_expediente as string) || '';
    const { data: serviceOrder } = useEvento(osId);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const router = useRouter();

    const serviceNumber = serviceOrder?.serviceNumber || null;

    // Ensure the visible URL uses the numero_expediente when possible.
    useEffect(() => {
        if (!osId || !serviceNumber) return;

        const safePath = pathname ?? '';
        if (safePath.includes(`/os/${osId}`) && osId !== serviceNumber) {
            const newPath = safePath.replace(`/os/${osId}`, `/os/${serviceNumber}`);
            if (newPath !== safePath) {
                router.replace(newPath);
            }
        }
    }, [osId, serviceNumber, pathname, router]);

    const dashboardHref = `/os/${serviceNumber || osId}`;

    // Detectar mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    return (
        <div className="container mx-auto">
            <div className={cn(
                "sticky top-12 z-30 py-2 border-b transition-all duration-300",
                serviceOrder?.isVip
                    ? "bg-amber-400 border-amber-500/30 text-black shadow-lg shadow-amber-400/20"
                    : "bg-background/60 backdrop-blur-md border-border/40"
            )}>
                <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
                    {!isMobile && (
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <SheetTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className={cn(
                                                    "rounded-xl transition-all h-10 w-10",
                                                    serviceOrder?.isVip
                                                        ? "bg-black/10 border-black/10 text-black hover:bg-black hover:text-amber-400"
                                                        : "bg-background/40 border-border/40 hover:bg-primary/5"
                                                )}
                                            >
                                                <Menu className="h-5 w-5" />
                                            </Button>
                                        </SheetTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">Módulos</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <SheetContent side="left" className="w-[250px] sm:w-[280px] p-0 rounded-r-[2rem] border-r-border/40 shadow-2xl">
                                <SheetHeader className="p-6 border-b border-border/40">
                                    <SheetTitle className="text-xl font-black tracking-tighter">Módulos de la OS</SheetTitle>
                                    <SheetDescription className="sr-only">
                                        Navega por los diferentes módulos de la orden de servicio.
                                    </SheetDescription>
                                </SheetHeader>
                                <ScrollArea className="h-full p-4 pb-16">
                                    <nav className="grid items-start gap-2 pb-4">
                                        <Link href={dashboardHref} onClick={() => setIsSheetOpen(false)}>
                                            <span className={cn(
                                                "group flex items-center rounded-xl px-4 py-3 text-sm font-bold transition-all",
                                                pathname === `/os/${serviceNumber || osId}`
                                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                                    : "hover:bg-primary/5 text-muted-foreground hover:text-primary"
                                            )}>
                                                <LayoutDashboard className="mr-3 h-5 w-5" />
                                                <span>Panel de Control</span>
                                            </span>
                                        </Link>
                                        {navGroups.map((group) => (
                                            <div key={group.label} className="mt-4">
                                                <div className="px-4 py-2 text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">{group.label}</div>
                                                {group.items.map((item) => {
                                                    const href = `/os/${serviceNumber || osId}/${item.path}`;
                                                    const safePath = pathname ?? '';
                                                    const isActive = safePath.startsWith(href);
                                                    return (
                                                        <Link key={item.path} href={href} onClick={() => setIsSheetOpen(false)}>
                                                            <span className={cn(
                                                                "group flex items-center rounded-xl px-4 py-2.5 text-sm font-bold transition-all mt-1",
                                                                isActive
                                                                    ? "bg-primary/10 text-primary border border-primary/20"
                                                                    : "hover:bg-primary/5 text-muted-foreground hover:text-primary"
                                                            )}>
                                                                <item.icon className={cn("mr-3 h-5 w-5 transition-transform group-hover:scale-110", isActive ? "text-primary" : "text-muted-foreground/60")} />
                                                                <span>{item.title}</span>
                                                            </span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </nav>
                                </ScrollArea>
                            </SheetContent>
                        </Sheet>
                    )}
                    <div className="flex-grow">
                        <OsHeaderContent osId={osId} />
                    </div>
                </div>
            </div>
            <main className="pt-6 pb-8">
                {children}
            </main>
            {/* Barra de navegación inferior solo en mobile */}
            {isMobile && (
                <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t flex justify-around items-center py-2 shadow-lg">
                    {navGroups.map((group) => {
                        const Icon = group.items[0].icon;
                        return (
                            <Link key={group.label} href={group.items.length > 0 ? `/os/${serviceNumber || osId}/${group.items[0].path}` : dashboardHref} className="flex flex-col items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary">
                                <Icon className="h-6 w-6" />
                                <span>{group.label}</span>
                            </Link>
                        );
                    })}
                    {/* Botón para abrir el Hub de módulos (Sheet) */}
                    <button onClick={() => setIsSheetOpen(true)} className="flex flex-col items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary">
                        <Menu className="h-6 w-6" />
                        <span>Todos</span>
                    </button>
                </nav>
            )}
        </div>
    );
}
