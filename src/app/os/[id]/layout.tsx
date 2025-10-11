

'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectiveDisplay } from '@/components/os/objective-display';
import { Briefcase, Utensils, Wine, Leaf, Warehouse, Archive, Truck, Snowflake, Euro, FilePlus, Users, UserPlus, Flower2, ClipboardCheck, PanelLeft, Building, FileText, Star, Menu, ClipboardList, Calendar, LayoutDashboard } from 'lucide-react';


type NavLink = {
    path: string;
    title: string;
    icon: LucideIcon;
    moduleName?: Parameters<typeof ObjectiveDisplay>[0]['moduleName'];
}

const navLinks: NavLink[] = [
    { path: 'info', title: 'Información OS', icon: FileText },
    { path: 'comercial', title: 'Comercial', icon: Briefcase },
    { path: 'gastronomia', title: 'Gastronomía', icon: Utensils, moduleName: 'gastronomia' },
    { path: 'bodega', title: 'Bebida', icon: Wine, moduleName: 'bodega' },
    { path: 'hielo', title: 'Hielo', icon: Snowflake, moduleName: 'hielo' },
    { path: 'bio', title: 'Bio (Consumibles)', icon: Leaf, moduleName: 'consumibles' },
    { path: 'almacen', title: 'Almacén', icon: Warehouse, moduleName: 'almacen' },
    { path: 'alquiler', title: 'Alquiler', icon: Archive, moduleName: 'alquiler' },
    { path: 'decoracion', title: 'Decoración', icon: Flower2, moduleName: 'decoracion' },
    { path: 'atipicos', title: 'Atípicos', icon: FilePlus, moduleName: 'atipicos' },
    { path: 'personal-mice', title: 'Personal MICE', icon: Users, moduleName: 'personalMice' },
    { path: 'personal-externo', title: 'Personal Externo', icon: UserPlus, moduleName: 'personalExterno' },
    { path: 'transporte', title: 'Transporte', icon: Truck, moduleName: 'transporte' },
    { path: 'prueba-menu', title: 'Prueba de Menu', icon: ClipboardCheck, moduleName: 'costePruebaMenu' },
    { path: 'cta-explotacion', title: 'Cta. Explotación', icon: Euro },
];

function OSSidebarNav({ className, onLinkClick }: { className?: string; onLinkClick?: () => void; }) {
    const pathname = usePathname();
    const params = useParams();
    const osId = params.id as string;
    const dashboardHref = `/os/${osId}`;

    return (
        <nav className={cn("grid items-start gap-1 pb-4", className)}>
            <Link href={dashboardHref} onClick={onLinkClick}>
                 <span
                    className={cn(
                        "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                        pathname === `/os/${osId}` ? "bg-accent" : "transparent"
                    )}
                >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Panel de Control</span>
                </span>
            </Link>
          {navLinks.map((item, index) => {
              const href = `/os/${osId}/${item.path}`;
              return (
              <Link
                  key={index}
                  href={href}
                  onClick={onLinkClick}
              >
                  <span
                      className={cn(
                          "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                          pathname.startsWith(href) ? "bg-accent" : "transparent"
                      )}
                  >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                  </span>
              </Link>
          )})}
      </nav>
    );
}

export default function OSDetailsLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const osId = params.id as string;
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [updateKey, setUpdateKey] = useState(Date.now());


    const currentModule = useMemo(() => {
        const pathSegment = pathname.split('/').pop();
        if (pathname === `/os/${osId}`) {
            return { title: 'Panel de Control', icon: LayoutDashboard };
        }
        return navLinks.find(link => link.path === pathSegment);
    }, [pathname, osId]);

    useEffect(() => {
        if (osId) {
        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const currentOS = allServiceOrders.find(os => os.id === osId);
        setServiceOrder(currentOS || null);
        }
        const handleStorageChange = () => {
            setUpdateKey(Date.now());
        };
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };

    }, [osId]);

    if (!serviceOrder || !currentModule) return null;

    return (
      <div className="container mx-auto">
          <div className="sticky top-[56px] z-30 bg-background py-2 border-b mb-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                      <SheetTrigger asChild>
                        <Button variant="outline">
                          <Menu className="h-5 w-5 mr-2" />
                          Módulos
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-[250px] sm:w-[280px] p-0">
                        <SheetHeader className="p-4 border-b">
                          <SheetTitle>Módulos de la OS</SheetTitle>
                        </SheetHeader>
                        <ScrollArea className="h-full p-4">
                          <OSSidebarNav onLinkClick={() => setIsSheetOpen(false)} />
                        </ScrollArea>
                      </SheetContent>
                    </Sheet>
                  </div>
                  <div className="flex items-center gap-3">
                    <currentModule.icon className="h-7 w-7 text-primary" />
                    <h1 className="text-2xl font-headline font-bold">{currentModule.title}</h1>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {('moduleName' in currentModule) && currentModule.moduleName && <ObjectiveDisplay osId={osId} moduleName={currentModule.moduleName} updateKey={updateKey} />}
                  <div className="flex items-center gap-2 font-semibold">
                    <FileText className="h-4 w-4" />
                    <span>{serviceOrder.serviceNumber}</span>
                  </div>
                  {serviceOrder.isVip && <Badge variant="default" className="bg-amber-400 text-black hover:bg-amber-500"><Star className="h-4 w-4 mr-1"/> VIP</Badge>}
                  {serviceOrder.space && (
                    <div className="hidden sm:flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span className="font-semibold">{serviceOrder.space}</span>
                    </div>
                  )}
                </div>
              </div>
          </div>
          </div>
          <main>
              {children}
          </main>
      </div>
    );
}
