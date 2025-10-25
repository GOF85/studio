
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { cprNav } from '@/lib/cpr-nav';
import { Factory, Menu, ChevronRight } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

function NavContent({ closeSheet }: { closeSheet: () => void }) {
    const pathname = usePathname();
    return (
        <div className="w-full">
            <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2 text-lg"><Factory/>Panel de Producción</SheetTitle>
            </SheetHeader>
            <nav className="grid items-start gap-1 p-4">
                {cprNav.map((item, index) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;
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
                            <Icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
                        </span>
                    </Link>
                )})}
            </nav>
        </div>
    );
}

export default function CprLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    
    const { currentPage, isDetailPage, detailId } = useMemo(() => {
        const pathSegments = pathname.split('/').filter(Boolean);
        const isOfDetail = pathSegments[1] === 'cpr' && pathSegments[2] === 'of' && pathSegments.length > 3;

        if (isOfDetail) {
            return {
                currentPage: cprNav.find(link => link.href.includes('/cpr/of')),
                isDetailPage: true,
                detailId: pathSegments[3]
            };
        }

        const currentPath = pathSegments[2];
        if (!currentPath || pathSegments[1] !== 'cpr') {
            return {
                currentPage: cprNav.find(link => link.href === '/cpr/dashboard'),
                isDetailPage: false,
                detailId: null,
            };
        }
        return {
            currentPage: cprNav.find(link => link.href.includes(currentPath)),
            isDetailPage: false,
            detailId: null,
        };
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
                        <Link href="/cpr" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                            <Factory className="h-5 w-5"/>
                            <span>Panel de Producción</span>
                        </Link>
                        {currentPage && currentPage.icon && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <Link href={currentPage.href} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                                    <currentPage.icon className="h-5 w-5"/>
                                    <span>{currentPage.title}</span>
                                </Link>
                            </>
                        )}
                         {isDetailPage && detailId && (
                            <>
                                <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                <span className="flex items-center gap-2 text-primary">
                                    <Factory className="h-5 w-5"/>
                                    <span>{detailId}</span>
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
             <div className="container mx-auto">
                <div className="py-8">
                    {children}
                </div>
            </div>
        </>
    );
}
