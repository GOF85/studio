'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Calendar, BookHeart, Factory, LifeBuoy, Settings, ChefHat, Component, Package, GlassWater, ChevronRight, ClipboardCheck, ListChecks, History, AlertTriangle, PackagePlus, BarChart3, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type SubLink = {
    title: string;
    href: string;
    icon: LucideIcon;
}

type MenuItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    description: string;
    sublinks?: SubLink[];
}

const menuItems: MenuItem[] = [
    { 
        title: 'Previsión de Servicios', 
        href: '/pes', 
        icon: ClipboardList, 
        description: 'Gestiona órdenes de servicio, clientes y eventos.' 
    },
    { 
        title: 'Calendario', 
        href: '/calendario', 
        icon: Calendar, 
        description: 'Visualiza todos tus servicios en una vista mensual.' 
    },
    { 
        title: 'Book Gastronómico', 
        href: '/book', 
        icon: BookHeart, 
        description: 'Define recetas, elaboraciones e ingredientes.',
        sublinks: [
            { title: 'Recetas', href: '/book/recetas', icon: BookHeart },
            { title: 'Elaboraciones', href: '/book/elaboraciones', icon: Component },
            { title: 'Ingredientes', href: '/book/ingredientes', icon: ChefHat },
            { title: 'Materia Prima (ERP)', href: '/book/ingredientes-erp', icon: Package },
            { title: 'Menaje', href: '/menaje-db', icon: GlassWater },
        ]
    },
    { 
        title: 'Producción (CPR)', 
        href: '/cpr', 
        icon: Factory, 
        description: 'Planifica, produce y controla la logística de cocina.',
        sublinks: [
            { title: 'Planificación', href: '/cpr/planificacion', icon: ClipboardCheck },
            { title: 'Órdenes de Fabricación', href: '/cpr/of', icon: Factory },
            { title: 'Picking y Logística', href: '/cpr/picking', icon: ListChecks },
            { title: 'Excedentes', href: '/cpr/excedentes', icon: PackagePlus },
            { title: 'Control de Calidad', href: '/cpr/calidad', icon: ShieldCheck },
            { title: 'Productividad', href: '/cpr/productividad', icon: BarChart3 },
            { title: 'Trazabilidad', href: '/cpr/trazabilidad', icon: History },
            { title: 'Incidencias', href: '/cpr/incidencias', icon: AlertTriangle },
        ]
    },
    { 
        title: 'Documentación', 
        href: '/docs', 
        icon: LifeBuoy, 
        description: 'Guías y manuales de uso de la aplicación.' 
    },
    { 
        title: 'Configuración', 
        href: '/configuracion', 
        icon: Settings, 
        description: 'Administra las bases de datos y plantillas del sistema.',
        sublinks: [
            { title: 'Bases de Datos', href: '/bd', icon: Package },
            { title: 'Objetivos de Gasto', href: '/objetivos-gasto', icon: Package },
            { title: 'Plantillas de Pedidos', href: '/plantillas-pedidos', icon: Package },
        ]
    },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-headline font-bold tracking-tight">Bienvenido a CateringStock</h1>
            <p className="text-lg text-muted-foreground mt-2">Gestiona tu operativa de catering de forma centralizada.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map(item => (
                <Card key={item.href} className="flex flex-col hover:border-primary/50 hover:shadow-lg transition-all">
                    <Link href={item.href} className="flex-grow">
                        <CardHeader className="flex-row items-start gap-4 space-y-0">
                            <item.icon className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                            <div>
                                <CardTitle>{item.title}</CardTitle>
                                <CardDescription className="mt-1">{item.description}</CardDescription>
                            </div>
                        </CardHeader>
                    </Link>
                    {item.sublinks && (
                        <>
                            <CardContent className="flex-grow pb-2">
                                <div className="border-t pt-2 mt-2">
                                    {item.sublinks.map(sublink => (
                                        <Button key={sublink.href} asChild variant="ghost" className="w-full justify-start text-muted-foreground">
                                            <Link href={sublink.href}>
                                                <sublink.icon className="w-4 h-4 mr-2" />
                                                {sublink.title}
                                                <ChevronRight className="w-4 h-4 ml-auto" />
                                            </Link>
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </>
                    )}
                </Card>
            ))}
        </div>
      </main>
      <footer className="py-4 border-t mt-auto">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CateringStock. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
