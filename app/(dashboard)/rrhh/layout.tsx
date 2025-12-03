
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { Users, Menu, ChevronRight, BarChart3, UserPlus } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { rrhhNav } from '@/lib/rrhh-nav';

function NavContent({ closeSheet }: { closeSheet: () => void }) {
    const pathname = usePathname();
    return (
        <div className="w-full">
             <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2 text-lg"><Users/>Recursos Humanos</SheetTitle>
            </SheetHeader>
            <nav className="grid items-start gap-1 p-4">
                {rrhhNav.map((item, index) => {
                    const isActive = pathname.startsWith(item.href);
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
                )})}
            </nav>
        </div>
    );
}

export default function RrhhLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    
    const { currentPage, subPage } = useMemo(() => {
        const pathSegments = pathname.split('/').filter(Boolean);
        const mainPage = rrhhNav.find(item => pathSegments[1] === item.href.split('/')[2]);
        
        if (pathSegments[2] === 'analitica' && pathSegments[3] === 'externos') {
            return {
                currentPage: mainPage,
                subPage: { title: 'Personal Externo', icon: UserPlus }
            }
        }
        
        return { currentPage: mainPage, subPage: null };
    }, [pathname]);

    return (
        <>
            <div className="sticky top-12 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-2 py-2 text-sm font-semibold">
                         <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="mr-2">
                                    <Menu className="h-5 w-5"/>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[280px] p-0">
                                <NavContent closeSheet={() => setIsSheetOpen(false)} />
                            </SheetContent>
                        </Sheet>
                        <Link href="/rrhh" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <Users className="h-5 w-5"/>
                            <span>Recursos Humanos</span>
                        </Link>
                        {currentPage && currentPage.href !== '/rrhh' && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                 <Link href={currentPage.href} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                                    <currentPage.icon className="h-5 w-5"/>
                                    <span>{currentPage.title}</span>
                                </Link>
                            </>
                        )}
                        {subPage && (
                             <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                 <span className="flex items-center gap-2 font-bold text-primary">
                                    <subPage.icon className="h-5 w-5"/>
                                    <span>{subPage.title}</span>
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
             <div className="py-8 container mx-auto">
                {children}
            </div>
        </>
    );
}
