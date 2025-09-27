'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Calendar, Settings, Package, Percent, BookOpen, ChevronRight, BarChart3, Truck, LifeBuoy, Factory, ListChecks } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export default function EntregasDashboardPage() {
  return (
    <TooltipProvider>
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-10">
            <h1 className="text-4xl font-headline font-bold tracking-tight">Dashboard de Entregas MICE</h1>
        </div>

        <section className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                <Link href="/entregas/pes">
                    <Card className="hover:border-primary/80 hover:shadow-lg transition-all h-full">
                        <CardHeader className="flex-row items-center gap-4">
                            <ClipboardList className="w-10 h-10 text-primary flex-shrink-0" />
                            <div>
                                <CardTitle className="text-2xl">Previsión de Entregas</CardTitle>
                                <p className="text-muted-foreground text-sm mt-1">Consulta y busca todos los pedidos de entrega.</p>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/entregas/calendario">
                    <Card className="hover:border-primary/80 hover:shadow-lg transition-all h-full">
                        <CardHeader className="flex-row items-center gap-4">
                            <Calendar className="w-10 h-10 text-primary flex-shrink-0" />
                            <div>
                                <CardTitle className="text-2xl">Calendario de Entregas</CardTitle>
                                <p className="text-muted-foreground text-sm mt-1">Visualiza las entregas en una vista mensual.</p>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
                 <Link href="/entregas/picking">
                    <Card className="hover:border-primary/80 hover:shadow-lg transition-all h-full">
                        <CardHeader className="flex-row items-center gap-4">
                            <ListChecks className="w-10 h-10 text-primary flex-shrink-0" />
                            <div>
                                <CardTitle className="text-2xl">Picking y Logística</CardTitle>
                                <p className="text-muted-foreground text-sm mt-1">Prepara y consolida los pedidos para su envío.</p>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </section>
        
        <section>
             <h2 className="text-2xl font-headline font-semibold tracking-tight mb-4 text-center">Configuración, Portales y Ayuda</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                <Link href="/entregas/productos-venta">
                    <Card className="h-full hover:border-primary/50 hover:shadow-lg transition-all">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><Package />Productos de Venta</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Gestiona los productos, packs y sus componentes.</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/portal/partner">
                    <Card className="h-full hover:border-primary/50 hover:shadow-lg transition-all">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><Factory />Portal del Partner</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Vista de producción para partners de gastronomía.</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/portal/transporte">
                    <Card className="h-full hover:border-primary/50 hover:shadow-lg transition-all">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><Truck />Portal de Transporte</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Consulta tus rutas de entrega y gestiona albaranes.</p>
                        </CardContent>
                    </Card>
                </Link>
                 <Link href="/entregas/analitica">
                    <Card className="h-full hover:border-primary/50 hover:shadow-lg transition-all">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><BarChart3 />Analítica</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Analiza costes y márgenes de tus entregas.</p>
                        </CardContent>
                    </Card>
                </Link>
             </div>
        </section>
      </main>
    </TooltipProvider>
  );
}
