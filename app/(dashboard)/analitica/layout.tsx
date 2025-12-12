
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ChevronRight, Menu, ClipboardList, Package, TrendingUp } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

const analiticaNav = [
    { title: 'Panel de Analítica', href: '/analitica', exact: true, icon: BarChart3 },
    { title: 'Analítica de Catering', href: '/analitica/catering', exact: true, icon: ClipboardList },
    { title: 'Analítica de Entregas', href: '/analitica/entregas', exact: true, icon: Package },
    { title: 'Variación de Precios', href: '/analitica/variacion-precios', exact: true, icon: TrendingUp },
];

function NavContent({ closeSheet }: { closeSheet: () => void }) {
    const pathname = usePathname() ?? '';
    return (
        <div className="w-full">
            <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2 text-lg"><BarChart3 />Analítica</SheetTitle>
            </SheetHeader>
            <nav className="grid items-start gap-1 p-4">
                {analiticaNav.map((item, index) => {
                    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={index}
                            href={item.href}
                            onClick={closeSheet}
                        >
                            <span
                                className={cn(
                                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                    isActive ? "bg-accent" : "transparent"
                                )}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                <span>{item.title}</span>
                            </span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    );
}

export default function AnaliticaLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const currentPage = useMemo(() => {
        return analiticaNav.find(item => item.href === (pathname || '/analitica'));
    }, [pathname]);

    return (
        <>
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-2 py-2 text-sm font-semibold">
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="mr-2">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[280px] p-0">
                                <NavContent closeSheet={() => setIsSheetOpen(false)} />
                            </SheetContent>
                        </Sheet>
                        <Link href="/analitica" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <BarChart3 className="h-5 w-5" />
                            <span>Analítica</span>
                        </Link>
                        {currentPage && currentPage.href !== '/analitica' && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                <currentPage.icon className="h-5 w-5 text-muted-foreground" />
                                <span>{currentPage.title}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="py-8">
                {children}
            </div>
        </>
    );
}
