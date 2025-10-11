'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Briefcase, Utensils, Wine, Leaf, Warehouse, Archive, Truck, Snowflake, Euro, FilePlus, Users, UserPlus, Flower2, ClipboardCheck, ArrowRight, Star } from 'lucide-react';

import type { ServiceOrder, MaterialOrder, GastronomyOrder, TransporteOrder, HieloOrder, DecoracionOrder, AtipicoOrder, PersonalMiceOrder, PersonalExternoOrder, PickingSheet } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { GASTO_LABELS } from '@/lib/constants';

type DashboardCardProps = {
    title: string;
    href: string;
    icon: LucideIcon;
    value: string;
    description?: string;
    isAlert?: boolean;
}

const DashboardCard = ({ title, href, icon: Icon, value, description, isAlert }: DashboardCardProps) => (
    <Link href={href}>
        <Card className="hover:border-primary hover:shadow-lg transition-all h-full">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground"/>{title}</CardTitle>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{value}</p>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    </Link>
)

const calculatePersonalTotal = (orders: {precioHora?: number; horaEntrada: string; horaSalida: string; cantidad?: number}[]) => {
    return orders.reduce((sum, order) => {
        const hours = calculateHours(order.horaEntrada, order.horaSalida);
        const quantity = order.cantidad || 1;
        const price = order.precioHora || 0;
        return sum + (hours * price * quantity);
    }, 0);
};

const calculateHours = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    try {
        const startTime = new Date(`1970-01-01T${start}:00`);
        const endTime = new Date(`1970-01-01T${end}:00`);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return 0;
        const diff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        return diff > 0 ? diff : 0;
    } catch (e) {
        return 0;
    }
}

export default function OsDashboardPage() {
    const router = useRouter();
    const params = useParams();
    const osId = params.id as string;
    
    const [isMounted, setIsMounted] = useState(false);
    const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
    const [summaryData, setSummaryData] = useState<Record<string, { value: string | number, description?: string }>>({});

    useEffect(() => {
        if (!osId) {
            router.push('/pes');
            return;
        }

        const allServiceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]') as ServiceOrder[];
        const currentOS = allServiceOrders.find(os => os.id === osId);
        setServiceOrder(currentOS || null);

        // Calculate all summaries
        const allMaterialOrders = JSON.parse(localStorage.getItem('materialOrders') || '[]') as MaterialOrder[];
        const relatedMaterialOrders = allMaterialOrders.filter(o => o.osId === osId);
        
        const allGastroOrders = (JSON.parse(localStorage.getItem('gastronomyOrders') || '[]') as GastronomyOrder[]).filter(o => o.osId === osId);
        
        const allTransporteOrders = (JSON.parse(localStorage.getItem('transporteOrders') || '[]') as TransporteOrder[]).filter(o => o.osId === osId);
        const allHieloOrders = (JSON.parse(localStorage.getItem('hieloOrders') || '[]') as HieloOrder[]).filter(o => o.osId === osId);
        const allDecoracionOrders = (JSON.parse(localStorage.getItem('decoracionOrders') || '[]') as DecoracionOrder[]).filter(o => o.osId === osId);
        const allAtipicoOrders = (JSON.parse(localStorage.getItem('atipicosOrders') || '[]') as AtipicoOrder[]).filter(o => o.osId === osId);
        const allPersonalMiceOrders = (JSON.parse(localStorage.getItem('personalMiceOrders') || '[]') as PersonalMiceOrder[]).filter(o => o.osId === osId);
        const allPersonalExternoOrders = (JSON.parse(localStorage.getItem('personalExternoOrders') || '[]') as PersonalExternoOrder[]).filter(o => o.osId === osId);
        const allPruebasMenu = (JSON.parse(localStorage.getItem('pruebasMenu') || '[]') as any[]).filter(o => o.osId === osId);

        const allPickingSheets = Object.values(JSON.parse(localStorage.getItem('pickingSheets') || '{}')) as PickingSheet[];
        const relatedPickingSheets = allPickingSheets.filter(sheet => sheet.osId === osId);
        
        const getMaterialSummary = (type: 'Almacen' | 'Bodega' | 'Bio' | 'Alquiler') => {
            const orders = relatedMaterialOrders.filter(o => o.type === type);
            const totalItems = orders.reduce((sum, o) => sum + o.items.length, 0);
            const itemsListos = relatedPickingSheets.flatMap(ps => ps.items).filter(item => item.type === type).length;
            return { value: `${itemsListos} / ${totalItems}`, description: 'listos' };
        };

        const totalCostePersonalMice = calculatePersonalTotal(allPersonalMiceOrders);
        const totalCostePersonalExterno = calculatePersonalTotal(allPersonalExternoOrders);

        const summaries = {
            comercial: { value: formatCurrency(currentOS?.facturacion || 0), description: 'Facturación' },
            gastronomia: { value: allGastroOrders.length, description: 'pedidos de cocina' },
            almacen: getMaterialSummary('Almacen'),
            bodega: getMaterialSummary('Bodega'),
            bio: getMaterialSummary('Bio'),
            alquiler: getMaterialSummary('Alquiler'),
            hielo: { value: allHieloOrders.length, description: 'pedidos' },
            transporte: { value: allTransporteOrders.length, description: 'servicios' },
            decoracion: { value: allDecoracionOrders.length, description: 'pedidos' },
            atipicos: { value: allAtipicoOrders.length, description: 'pedidos' },
            'personal-mice': { value: formatCurrency(totalCostePersonalMice), description: `${allPersonalMiceOrders.length} turnos` },
            'personal-externo': { value: formatCurrency(totalCostePersonalExterno), description: `${allPersonalExternoOrders.length} turnos` },
            'prueba-menu': { value: allPruebasMenu.length > 0 ? 'Sí' : 'No', description: allPruebasMenu.length > 0 ? `Coste: ${formatCurrency(allPruebasMenu[0].costePruebaMenu || 0)}` : ''},
        };
        setSummaryData(summaries);

        setIsMounted(true);
    }, [osId, router]);


    if (!isMounted || !serviceOrder) {
        return <LoadingSkeleton title="Cargando Panel de Control..." />;
    }
    
    const navLinks: {path: string, title: string, icon: LucideIcon}[] = [
        { path: 'comercial', title: 'Comercial', icon: Briefcase },
        { path: 'gastronomia', title: 'Gastronomía', icon: Utensils },
        { path: 'bodega', title: 'Bebida', icon: Wine },
        { path: 'bio', title: 'Bio (Consumibles)', icon: Leaf },
        { path: 'almacen', title: 'Almacén', icon: Warehouse },
        { path: 'alquiler', title: 'Alquiler', icon: Archive },
        { path: 'decoracion', title: 'Decoración', icon: Flower2 },
        { path: 'atipicos', title: 'Atípicos', icon: FilePlus },
        { path: 'personal-mice', title: 'Personal MICE', icon: Users },
        { path: 'personal-externo', title: 'Personal Externo', icon: UserPlus },
        { path: 'transporte', title: 'Transporte', icon: Truck },
        { path: 'hielo', title: 'Hielo', icon: Snowflake },
        { path: 'prueba-menu', title: 'Prueba de Menu', icon: ClipboardCheck },
        { path: 'cta-explotacion', title: 'Cta. Explotación', icon: Euro },
    ];

    return (
        <main>
             <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-headline font-bold flex items-center gap-2">
                        {serviceOrder.isVip && <Star className="h-7 w-7 text-amber-500 fill-amber-500" />}
                        {serviceOrder.serviceNumber}
                    </h1>
                    <CardDescription className="text-base">{serviceOrder.client}</CardDescription>
                </div>
                <Badge variant={serviceOrder.status === 'Confirmado' ? 'default' : 'secondary'} className="text-lg">
                    {serviceOrder.status}
                </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {navLinks.map(link => (
                    <DashboardCard 
                        key={link.path}
                        title={link.title}
                        href={`/os/${osId}/${link.path}`}
                        icon={link.icon}
                        value={String(summaryData[link.path]?.value ?? '-')}
                        description={summaryData[link.path]?.description}
                    />
                ))}
            </div>
        </main>
    );
}
```,
  <change>
    <file>/src/app/os/[id]/layout.tsx</file>
    <content><![CDATA[

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

    return (
        <nav className={cn("grid items-start gap-1 pb-4", className)}>
            <Link href={`/os/${osId}`} onClick={onLinkClick}>
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

function OSSubHeader() {
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
  );
}


export default function OSDetailsLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="container mx-auto">
          <div className="sticky top-[56px] z-30 bg-background py-2 border-b mb-4">
            <OSSubHeader />
          </div>
          <main>
              {children}
          </main>
      </div>
    );
}
