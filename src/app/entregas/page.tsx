
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Calendar, Settings, Package, Percent, BookOpen, ChevronRight, BarChart3, Truck, LifeBuoy, Factory, ListChecks } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

export default function EntregasDashboardPage() {
  return (
    <TooltipProvider>
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-10">
            <h1 className="text-4xl font-headline font-bold tracking-tight">Entregas MICE</h1>
        </div>

        <section className="mb-12 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>
            
            <Separator />
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/cpr">
                    <Card className="hover:border-primary/80 hover:shadow-lg transition-all h-full">
                        <CardHeader className="flex-row items-center gap-4">
                            <Factory className="w-10 h-10 text-primary flex-shrink-0" />
                            <div>
                                <CardTitle className="text-2xl">Producción CPR</CardTitle>
                                <p className="text-muted-foreground text-sm mt-1">Planifica y gestiona la producción en cocina.</p>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
                 <Link href="/entregas/picking">
                    <Card className="hover:border-primary/80 hover:shadow-lg transition-all h-full">
                        <CardHeader className="flex-row items-center gap-4">
                            <ListChecks className="w-10 h-10 text-primary flex-shrink-0" />
                            <div>
                                <CardTitle className="text-2xl">Picking de Almacén</CardTitle>
                                <p className="text-muted-foreground text-sm mt-1">Prepara y consolida los artículos de los pedidos.</p>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
            </div>

            <Separator />
            
            <Link href="/entregas/analitica">
                <Card className="hover:border-primary/80 hover:shadow-lg transition-all h-full">
                        <CardHeader className="flex-row items-center gap-4">
                        <BarChart3 className="w-10 h-10 text-primary flex-shrink-0" />
                        <div>
                            <CardTitle className="text-2xl">Analítica</CardTitle>
                            <p className="text-muted-foreground text-sm mt-1">Analiza costes y márgenes de tus entregas.</p>
                        </div>
                    </CardHeader>
                </Card>
            </Link>
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
                 <Link href="/docs/entregas-manual">
                    <Card className="h-full hover:border-primary/50 hover:shadow-lg transition-all">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><LifeBuoy />Documentación</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Manual de usuario para la vertical de Entregas MICE.</p>
                        </CardContent>
                    </Card>
                </Link>
             </div>
        </section>
      </main>
    </TooltipProvider>
  );
}
